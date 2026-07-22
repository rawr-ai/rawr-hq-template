import path from "node:path";

import type {
  ActiveExternalExtension,
  CandidateInspection,
  ExternalExtensionInspection,
  ExternalExtensionOperationResult,
  NativeRegistryEntry,
  NativeRegistryUserEntry,
  NativeRegistryProjection,
  NativeUserEntry,
  StaticExternalExtension,
} from "./model";
import type { ExternalExtensionStatePort } from "./native-registry";
import { parseNativeInstallProvenance } from "./install-provenance";
import {
  GUARDED_NATIVE_MANAGER_CONTRACT,
  NativeMutationDispatchError,
  type NativeMutationPort,
  type NativeMutationRequest,
} from "./native-mutation";
import { isCanonicalPackageId } from "./package-id";

export type InspectedInstallArtifact = {
  sourcePath: string;
  artifactSha256: string;
  candidate: CandidateInspection;
};

export type PreparedInstallArtifact = {
  artifactPath: string;
  artifactSha256: string;
  cleanup(): Promise<void>;
};

export type PreparedUpdateEntry =
  | Readonly<{
      kind: "proven-local";
      entry: NativeUserEntry;
      extension: StaticExternalExtension;
    }>
  | Readonly<{
      kind: "delegate-native";
      entry: NativeUserEntry;
    }>
  | Readonly<{
      kind: "reject";
      entry: NativeRegistryUserEntry;
      reason: string;
    }>;

export type PreparedUpdate = {
  entries: readonly PreparedUpdateEntry[];
};

export interface ExternalExtensionPreparationPort {
  inspectInstall(artifactPath: string): Promise<InspectedInstallArtifact>;
  stageInstall(artifact: InspectedInstallArtifact): Promise<PreparedInstallArtifact>;
  prepareUpdate(state: NativeRegistryProjection): Promise<PreparedUpdate>;
}

export interface ExternalExtensionCommandRuntime {
  inspect(identity: string): Promise<ExternalExtensionInspection>;
  install(artifactPath: string): Promise<ExternalExtensionOperationResult>;
  link(root: string): Promise<ExternalExtensionOperationResult>;
  list(): Promise<NativeRegistryProjection>;
  reset(options: { hard: boolean; reinstall: boolean }): Promise<ExternalExtensionOperationResult>;
  uninstall(identity: string): Promise<ExternalExtensionOperationResult>;
  update(): Promise<ExternalExtensionOperationResult>;
}

export class ExternalExtensionService implements ExternalExtensionCommandRuntime {
  constructor(
    private readonly state: ExternalExtensionStatePort,
    private readonly preparation: ExternalExtensionPreparationPort,
    private readonly nativeMutation: NativeMutationPort
  ) {}

  list(): Promise<NativeRegistryProjection> {
    return this.state.read();
  }

  async inspect(identity: string): Promise<ExternalExtensionInspection> {
    const state = await this.state.read();
    const parsedIdentity = parseExternalExtensionIdentity(identity);
    const active = state.active.find((entry) => activeMatchesIdentity(entry, parsedIdentity));
    if (active) return { found: true, state: "active", value: active };
    const quarantined = state.quarantined.find(
      (entry) =>
        (parsedIdentity.kind === "package" && entry.identity === parsedIdentity.value) ||
        (entry.entry !== undefined && matchesIdentity(entry.entry, parsedIdentity))
    );
    if (quarantined) return { found: true, state: "quarantined", value: quarantined };
    return { found: false, identity };
  }

  async install(artifactPath: string): Promise<ExternalExtensionOperationResult> {
    const before = await this.state.read();
    const inspected = await this.preparation.inspectInstall(artifactPath);
    if (
      !path.isAbsolute(inspected.sourcePath) ||
      !/^[a-f0-9]{64}$/u.test(inspected.artifactSha256)
    ) {
      return rejected(
        "install",
        before,
        "Install inspection did not bind an absolute SHA-256 artifact"
      );
    }
    if (!inspected.candidate.accepted) {
      return rejected("install", before, inspected.candidate.quarantine.reason.message);
    }
    const expected = inspected.candidate.extension;
    if (
      hasMatchingImmutableInstall(
        before,
        expected.packageId,
        expected.fingerprint,
        inspected.artifactSha256
      )
    ) {
      return converged("install", before);
    }

    const prepared = await this.preparation.stageInstall(inspected);
    let result: ExternalExtensionOperationResult;
    try {
      if (
        !path.isAbsolute(prepared.artifactPath) ||
        prepared.artifactSha256 !== inspected.artifactSha256
      ) {
        result = rejected(
          "install",
          before,
          "Install staging did not preserve the inspected artifact binding"
        );
      } else {
        result = await this.dispatchAndRead(
          "install",
          before,
          {
            commandExport: "plugins:install",
            argv: [`file:${prepared.artifactPath}`, "--silent"],
            contract: GUARDED_NATIVE_MANAGER_CONTRACT,
            inspectedArtifact: {
              path: prepared.artifactPath,
              sha256: inspected.artifactSha256,
            },
          },
          {
            kind: "install",
            extension: expected,
            artifactSha256: inspected.artifactSha256,
          }
        );
      }
    } catch (error) {
      try {
        await prepared.cleanup();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "external install and staging cleanup both failed"
        );
      }
      throw error;
    }

    let stagingCleanup: NonNullable<ExternalExtensionOperationResult["cleanup"]>[number];
    try {
      await prepared.cleanup();
      stagingCleanup = Object.freeze({ owner: "install-staging", status: "completed" });
    } catch (error) {
      stagingCleanup = Object.freeze({
        owner: "install-staging",
        status: "failed",
        error: errorMessage(error),
      });
    }
    return {
      ...result,
      cleanup: Object.freeze([...(result.cleanup ?? []), stagingCleanup]),
    };
  }

  async link(root: string): Promise<ExternalExtensionOperationResult> {
    const before = await this.state.read();
    const candidate = await this.state.inspectRoot(root);
    if (!candidate.accepted) return rejected("link", before, candidate.quarantine.reason.message);

    const expected = candidate.extension;
    const existing = before.active.find(
      (entry) => entry.extension.packageId === expected.packageId
    );
    if (
      existing?.entry.type === "link" &&
      existing.extension.canonicalRoot === expected.canonicalRoot &&
      existing.extension.fingerprint === expected.fingerprint
    ) {
      return converged("link", before);
    }

    return this.dispatchAndRead(
      "link",
      before,
      {
        commandExport: "plugins:link",
        argv: [expected.canonicalRoot, "--no-install"],
        contract: GUARDED_NATIVE_MANAGER_CONTRACT,
      },
      { kind: "link", extension: expected }
    );
  }

  async uninstall(identity: string): Promise<ExternalExtensionOperationResult> {
    const before = await this.state.read();
    if (parseExternalExtensionIdentity(identity).kind === "invalid") {
      return rejected(
        "uninstall",
        before,
        "Extension identity must be a canonical package ID, an absolute normalized path, or an explicit ./ or ../ path"
      );
    }
    const entry = findNativeEntry(before, identity);
    if (!entry) {
      if (registryIdentityKnowledgeIsComplete(before)) return converged("uninstall", before);
      if (!isCanonicalPackageId(identity)) {
        return rejected(
          "uninstall",
          before,
          "Malformed native state cannot resolve a linked path to a package identity"
        );
      }
    }

    const result = await this.dispatchAndRead("uninstall", before, {
      commandExport: "plugins:uninstall",
      argv: [entry?.name ?? identity],
      contract: GUARDED_NATIVE_MANAGER_CONTRACT,
    });
    const delegatedIdentity = entry?.name ?? identity;
    return result.nativeStatus === "completed" && findNativeEntry(result.after, delegatedIdentity)
      ? {
          ...result,
          reason: `Native uninstall left ${delegatedIdentity} in guarded registry state`,
        }
      : result;
  }

  async update(): Promise<ExternalExtensionOperationResult> {
    const before = await this.state.read();
    const userEntries = nativeEntries(before).filter((entry) => entry.type === "user");
    if (userEntries.length === 0) {
      return registryIdentityKnowledgeIsComplete(before)
        ? converged("update", before)
        : rejected(
            "update",
            before,
            "Native registry identity is incomplete; use reset to recover it"
          );
    }

    const prepared = await this.preparation.prepareUpdate(before);
    const preparedIds = new Set(prepared.entries.map(({ entry }) => entry.name));
    if (
      prepared.entries.length !== userEntries.length ||
      preparedIds.size !== userEntries.length ||
      userEntries.some((entry) => !preparedIds.has(entry.name))
    ) {
      return rejected(
        "update",
        before,
        "Update preparation did not classify every native user extension exactly once"
      );
    }

    const rejectedEntry = prepared.entries.find((entry) => entry.kind === "reject");
    if (rejectedEntry?.kind === "reject") {
      return rejected("update", before, rejectedEntry.reason);
    }

    const localEntries = prepared.entries.filter(
      (entry): entry is Extract<PreparedUpdateEntry, { kind: "proven-local" }> =>
        entry.kind === "proven-local"
    );
    const delegatedEntries = prepared.entries.filter((entry) => entry.kind === "delegate-native");
    if (localEntries.length > 0 && delegatedEntries.length > 0) {
      return rejected(
        "update",
        before,
        "The native manager cannot update selected entries while immutable local installs are present. Uninstall the local extension, update the remaining entries, then reinstall the local artifact.",
        "mixed-update-no-safe-native-seam"
      );
    }

    if (localEntries.length > 0) {
      return localEntries.every(({ entry, extension }) =>
        hasMatchingImmutableInstall(
          before,
          extension.packageId,
          extension.fingerprint,
          parseNativeInstallProvenance(entry.url)?.artifactSha256
        )
      )
        ? converged("update", before)
        : rejected(
            "update",
            before,
            "Immutable local update preparation does not match guarded native state"
          );
    }

    const result = await this.dispatchAndRead("update", before, {
      commandExport: "plugins:update",
      argv: [],
      contract: GUARDED_NATIVE_MANAGER_CONTRACT,
    });
    if (result.nativeStatus !== "completed") return result;
    const inactive = userEntries
      .map((entry) => entry.name)
      .filter(
        (packageId) => !result.after.active.some((entry) => entry.extension.packageId === packageId)
      );
    return inactive.length === 0
      ? result
      : {
          ...result,
          reason: `Native update left guarded residue quarantined: ${inactive.join(", ")}`,
        };
  }

  async reset(options: {
    hard: boolean;
    reinstall: boolean;
  }): Promise<ExternalExtensionOperationResult> {
    const before = await this.state.read();
    if (options.reinstall) {
      return rejected(
        "reset",
        before,
        "reset --reinstall is not permitted by external extension policy"
      );
    }
    if (!before.hasResidue) return converged("reset", before);

    const hard =
      options.hard ||
      before.status === "malformed" ||
      before.quarantined.some((entry) => entry.reason.code === "native-package-residue");
    const result = await this.dispatchAndRead("reset", before, {
      commandExport: "plugins:reset",
      argv: hard ? ["--hard"] : [],
      contract: GUARDED_NATIVE_MANAGER_CONTRACT,
    });
    return result.nativeStatus === "completed" && result.after.hasResidue
      ? { ...result, reason: "Native reset left guarded registry residue" }
      : result;
  }

  private async dispatchAndRead(
    operation: ExternalExtensionOperationResult["operation"],
    before: NativeRegistryProjection,
    request: NativeMutationRequest,
    expected?: ExpectedActivation
  ): Promise<ExternalExtensionOperationResult> {
    let nativeResult;
    try {
      nativeResult = await this.nativeMutation.dispatch(request);
    } catch (error) {
      return {
        operation,
        disposition: "delegate-native",
        nativeStatus: "failed",
        reason: errorMessage(error),
        ...(error instanceof NativeMutationDispatchError
          ? { cleanup: Object.freeze([error.cleanup]) }
          : {}),
        before,
        after: await this.state.read(),
      };
    }
    const after = await this.state.read();
    const activated = expected === undefined || matchesExpectedActivation(after, expected);
    return {
      operation,
      disposition: "delegate-native",
      nativeStatus: "completed",
      ...(!activated
        ? {
            reason: `Native ${operation} result did not pass guarded postvalidation and remains quarantined`,
          }
        : {}),
      cleanup: Object.freeze([nativeResult.cleanup]),
      before,
      after,
    };
  }
}

function converged(
  operation: ExternalExtensionOperationResult["operation"],
  state: NativeRegistryProjection
): ExternalExtensionOperationResult {
  return { operation, disposition: "converged", before: state, after: state };
}

function rejected(
  operation: ExternalExtensionOperationResult["operation"],
  state: NativeRegistryProjection,
  reason: string,
  reasonCode?: ExternalExtensionOperationResult["reasonCode"]
): ExternalExtensionOperationResult {
  return {
    operation,
    disposition: "reject",
    reason,
    ...(reasonCode ? { reasonCode } : {}),
    before: state,
    after: state,
  };
}

type ExpectedActivation =
  | Readonly<{
      kind: "install";
      extension: ActiveExternalExtension["extension"];
      artifactSha256: string;
    }>
  | Readonly<{
      kind: "link";
      extension: ActiveExternalExtension["extension"];
    }>;

function matchesExpectedActivation(
  state: NativeRegistryProjection,
  expected: ExpectedActivation
): boolean {
  if (expected.kind === "install") {
    return hasMatchingImmutableInstall(
      state,
      expected.extension.packageId,
      expected.extension.fingerprint,
      expected.artifactSha256
    );
  }
  return state.active.some(
    (entry) =>
      entry.entry.type === "link" &&
      entry.extension.packageId === expected.extension.packageId &&
      entry.extension.canonicalRoot === expected.extension.canonicalRoot &&
      entry.extension.fingerprint === expected.extension.fingerprint
  );
}

function hasMatchingImmutableInstall(
  state: NativeRegistryProjection,
  packageId: string,
  fingerprint: string,
  artifactSha256?: string
): boolean {
  return state.active.some((entry) => {
    if (
      entry.entry.type !== "user" ||
      entry.extension.packageId !== packageId ||
      entry.extension.fingerprint !== fingerprint
    )
      return false;
    const provenance = parseNativeInstallProvenance(entry.entry.url);
    const dependencyProvenance = parseNativeInstallProvenance(entry.entry.dependencySpec);
    return (
      provenance !== null &&
      dependencyProvenance !== null &&
      provenance.artifactSha256 === dependencyProvenance.artifactSha256 &&
      provenance.staticFingerprint === dependencyProvenance.staticFingerprint &&
      provenance.staticFingerprint === fingerprint &&
      (artifactSha256 === undefined || provenance.artifactSha256 === artifactSha256)
    );
  });
}

function findNativeEntry(
  state: NativeRegistryProjection,
  identity: string
): NativeRegistryEntry | undefined {
  const parsedIdentity = parseExternalExtensionIdentity(identity);
  const active = state.active.find((entry) => activeMatchesIdentity(entry, parsedIdentity));
  if (active !== undefined) return active.entry;
  return state.quarantined
    .flatMap((entry) => (entry.entry ? [entry.entry] : []))
    .find((entry) => matchesIdentity(entry, parsedIdentity));
}

type ParsedExternalExtensionIdentity =
  | Readonly<{ kind: "package"; value: string }>
  | Readonly<{ kind: "path"; value: string }>
  | Readonly<{ kind: "invalid" }>;

function parseExternalExtensionIdentity(identity: string): ParsedExternalExtensionIdentity {
  if (isCanonicalPackageId(identity)) return Object.freeze({ kind: "package", value: identity });
  if (path.isAbsolute(identity)) {
    const normalized = path.resolve(identity);
    return path.normalize(identity) === identity && normalized === identity
      ? Object.freeze({ kind: "path", value: normalized })
      : Object.freeze({ kind: "invalid" });
  }
  if (
    identity === "." ||
    identity === ".." ||
    identity.startsWith("./") ||
    identity.startsWith("../")
  ) {
    return Object.freeze({ kind: "path", value: path.resolve(identity) });
  }
  return Object.freeze({ kind: "invalid" });
}

function activeMatchesIdentity(
  entry: ActiveExternalExtension,
  identity: ParsedExternalExtensionIdentity
): boolean {
  if (matchesIdentity(entry.entry, identity)) return true;
  return identity.kind === "path" && entry.extension.canonicalRoot === identity.value;
}

function nativeEntries(state: NativeRegistryProjection): readonly NativeRegistryEntry[] {
  const entries = [
    ...state.active.map((entry) => entry.entry),
    ...state.quarantined.flatMap((entry) => (entry.entry ? [entry.entry] : [])),
  ];
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.type}\0${entry.name}\0${entry.type === "link" ? entry.root : ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchesIdentity(
  entry: NativeRegistryEntry,
  identity: ParsedExternalExtensionIdentity
): boolean {
  if (identity.kind === "package") return entry.name === identity.value;
  return identity.kind === "path" && entry.type === "link" && entry.root === identity.value;
}

function registryIdentityKnowledgeIsComplete(state: NativeRegistryProjection): boolean {
  return (
    state.status !== "malformed" && state.quarantined.every((entry) => entry.entry !== undefined)
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
