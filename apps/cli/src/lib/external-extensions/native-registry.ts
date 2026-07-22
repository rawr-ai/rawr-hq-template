import path from "node:path";

import type {
  CandidateInspection,
  NativeExternalEntry,
  NativeRegistryEntry,
  NativeRegistryProjection,
  QuarantineReason,
  QuarantinedExternalExtension,
  ReservedControllerSurface,
} from "./model";
import { parseNativeInstallProvenance } from "./install-provenance";
import { isCanonicalPackageId } from "./package-id";
import { inspectStaticExternalExtension } from "./static-manifest";
import type { StaticEvidencePort } from "./static-evidence";

export interface ExternalExtensionStatePort {
  inspectRoot(root: string, expectedPackageId?: string): Promise<CandidateInspection>;
  read(): Promise<NativeRegistryProjection>;
}

export class NativeRegistryState implements ExternalExtensionStatePort {
  readonly dataDir: string;
  readonly registryPath: string;

  constructor(
    dataDir: string,
    private readonly reserved: ReservedControllerSurface,
    private readonly evidence: StaticEvidencePort
  ) {
    this.dataDir = path.resolve(dataDir);
    this.registryPath = path.join(this.dataDir, "package.json");
  }

  inspectRoot(root: string, expectedPackageId?: string): Promise<CandidateInspection> {
    return inspectStaticExternalExtension({
      root,
      expectedPackageId,
      reserved: this.reserved,
      evidence: this.evidence,
    });
  }

  async read(): Promise<NativeRegistryProjection> {
    const packageArtifacts = await observeNativePackageArtifacts(this.dataDir, this.evidence);
    const registryEvidence = await this.evidence.readText(this.registryPath);
    if (!registryEvidence.ok) {
      if (registryEvidence.error.kind === "missing") {
        const packageResidue = nativePackageResidue([], [], packageArtifacts);
        return {
          registryPath: this.registryPath,
          status: "missing",
          hasResidue: packageResidue !== undefined,
          active: [],
          quarantined: packageResidue ? [packageResidue] : [],
        };
      }
      return malformedRegistry(this.registryPath, registryEvidence.error.message);
    }

    const parsed = parseNativeRegistry(registryEvidence.value);
    if (!parsed.ok) return malformedRegistry(this.registryPath, parsed.reason);

    const duplicateNames = findDuplicates(parsed.entries.map((entry) => entry.name));
    const active: NativeRegistryProjection["active"][number][] = [];
    const quarantined: QuarantinedExternalExtension[] = [...parsed.quarantined];
    const packageResidue = nativePackageResidue(
      [...parsed.dependencies.keys()],
      parsed.entries,
      packageArtifacts
    );
    if (packageResidue) quarantined.push(packageResidue);

    for (const registryEntry of parsed.entries) {
      const binding = bindNativeDependency(registryEntry, parsed.dependencies);
      const observedEntry = binding.entry;
      if (duplicateNames.has(observedEntry.name)) {
        quarantined.push({
          identity: observedEntry.name,
          entry: observedEntry,
          root: entryRoot(this.dataDir, observedEntry),
          reason: {
            code: "entry-duplicate",
            message: `Native registry contains duplicate identity ${observedEntry.name}`,
          },
        });
        continue;
      }

      if (!binding.ok) {
        quarantined.push({
          identity: observedEntry.name,
          entry: observedEntry,
          root: entryRoot(this.dataDir, observedEntry),
          reason: binding.reason,
        });
        continue;
      }

      const entry = binding.entry;
      const root = entryRoot(this.dataDir, entry);
      const inspection = await this.inspectRoot(root, entry.name);
      if (!inspection.accepted) {
        quarantined.push({ ...inspection.quarantine, entry, root });
        continue;
      }
      active.push({ entry, extension: inspection.extension });
    }

    active.sort((left, right) => left.extension.packageId.localeCompare(right.extension.packageId));
    quarantined.sort(compareQuarantine);
    return {
      registryPath: this.registryPath,
      status: "valid",
      hasResidue:
        parsed.entries.length > 0 || parsed.quarantined.length > 0 || packageResidue !== undefined,
      active,
      quarantined,
    };
  }
}

type ParsedNativeRegistry =
  | {
      ok: true;
      dependencies: ReadonlyMap<string, string>;
      entries: readonly NativeRegistryEntry[];
      quarantined: readonly QuarantinedExternalExtension[];
    }
  | { ok: false; reason: string };

export function parseNativeRegistry(text: string): ParsedNativeRegistry {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, reason: `Native registry is not valid JSON: ${errorMessage(error)}` };
  }
  if (!isRecord(value) || !isRecord(value.oclif) || !Array.isArray(value.oclif.plugins)) {
    return { ok: false, reason: "Native registry requires an oclif.plugins array" };
  }
  if (value.dependencies !== undefined && !isRecord(value.dependencies)) {
    return { ok: false, reason: "Native registry dependencies must be an object" };
  }

  const dependencies = new Map<string, string>();
  for (const [name, version] of Object.entries(value.dependencies ?? {})) {
    const dependencySpec = nonEmptyString(version);
    if (!isCanonicalPackageId(name) || dependencySpec === null) {
      return { ok: false, reason: `Native registry contains invalid dependency ${name}` };
    }
    dependencies.set(name, dependencySpec);
  }

  const entries: NativeRegistryEntry[] = [];
  const quarantined: QuarantinedExternalExtension[] = [];
  for (const [index, rawEntry] of value.oclif.plugins.entries()) {
    const entry = parseNativeEntry(rawEntry);
    if (!entry.ok) {
      quarantined.push({
        identity: `registry-entry-${index}`,
        reason: { code: "entry-malformed", message: entry.reason },
      });
      continue;
    }
    entries.push(entry.value);
  }
  return {
    ok: true,
    dependencies: new Map([...dependencies].sort(([left], [right]) => left.localeCompare(right))),
    entries,
    quarantined,
  };
}

type NativePackageArtifactObservation = {
  description: string;
};

async function observeNativePackageArtifacts(
  dataDir: string,
  evidence: StaticEvidencePort
): Promise<readonly NativePackageArtifactObservation[]> {
  const checks = await Promise.all([
    observeArtifact(path.join(dataDir, "node_modules"), "installed tree", "directory", evidence),
    observeArtifact(path.join(dataDir, "package-lock.json"), "package lock", "file", evidence),
    observeArtifact(path.join(dataDir, "yarn.lock"), "Yarn lock", "file", evidence),
  ]);
  return checks.filter((check): check is NativePackageArtifactObservation => check !== undefined);
}

async function observeArtifact(
  artifactPath: string,
  label: string,
  expectedKind: "directory" | "file",
  evidence: StaticEvidencePort
): Promise<NativePackageArtifactObservation | undefined> {
  const observation =
    expectedKind === "directory"
      ? await evidence.isDirectory(artifactPath)
      : await evidence.isFile(artifactPath);
  if (!observation.ok) {
    return observation.error.kind === "missing"
      ? undefined
      : { description: `${label} at ${artifactPath} is unreadable` };
  }
  return observation.value
    ? { description: `${label} at ${artifactPath}` }
    : { description: `${label} at ${artifactPath} has an invalid filesystem type` };
}

function nativePackageResidue(
  dependencies: readonly string[],
  entries: readonly NativeRegistryEntry[],
  artifacts: readonly NativePackageArtifactObservation[]
): QuarantinedExternalExtension | undefined {
  const userEntries = new Set(
    entries.filter((entry) => entry.type === "user").map((entry) => entry.name)
  );
  const orphanDependencies = dependencies.filter((dependency) => !userEntries.has(dependency));
  const orphanArtifacts = userEntries.size === 0 ? artifacts : [];
  if (orphanDependencies.length === 0 && orphanArtifacts.length === 0) return undefined;

  const evidence = [
    ...orphanDependencies.map((dependency) => `dependency ${dependency}`),
    ...orphanArtifacts.map((artifact) => artifact.description),
  ];
  return {
    identity: "native-package-state",
    reason: {
      code: "native-package-residue",
      message: `Native package state has no corresponding user plugin entry: ${evidence.join(", ")}`,
    },
  };
}

function parseNativeEntry(
  value: unknown
): { ok: true; value: NativeRegistryEntry } | { ok: false; reason: string } {
  if (typeof value === "string") {
    if (!isCanonicalPackageId(value))
      return { ok: false, reason: `Invalid package identity ${value}` };
    return { ok: true, value: { name: value, type: "user", tag: "latest" } };
  }
  if (!isRecord(value)) return { ok: false, reason: "Native registry entry is not an object" };

  const name = nonEmptyString(value.name);
  const type = value.type;
  if (!name || !isCanonicalPackageId(name) || (type !== "link" && type !== "user")) {
    return { ok: false, reason: "Native registry entry has an invalid name or type" };
  }
  if (type === "link") {
    const root = nonEmptyString(value.root);
    if (!root || !path.isAbsolute(root)) {
      return { ok: false, reason: `Linked entry ${name} has no absolute static root` };
    }
    return { ok: true, value: { name, type, root } };
  }

  const tag = value.tag === undefined ? undefined : nonEmptyString(value.tag);
  const url = value.url === undefined ? undefined : nonEmptyString(value.url);
  if ((value.tag !== undefined && !tag) || (value.url !== undefined && !url)) {
    return { ok: false, reason: `User entry ${name} has invalid tag or URL metadata` };
  }
  return {
    ok: true,
    value: {
      name,
      type,
      ...(tag ? { tag } : {}),
      ...(url ? { url } : {}),
    },
  };
}

function malformedRegistry(registryPath: string, message: string): NativeRegistryProjection {
  return {
    registryPath,
    status: "malformed",
    hasResidue: true,
    active: [],
    quarantined: [
      {
        identity: "native-registry",
        reason: { code: "registry-malformed", message },
      },
    ],
  };
}

function entryRoot(dataDir: string, entry: NativeRegistryEntry): string {
  return entry.type === "link" && entry.root
    ? entry.root
    : path.join(dataDir, "node_modules", ...entry.name.split("/"));
}

type NativeDependencyBinding =
  | { ok: true; entry: NativeExternalEntry }
  | { ok: false; entry: NativeRegistryEntry; reason: QuarantineReason };

function bindNativeDependency(
  entry: NativeRegistryEntry,
  dependencies: ReadonlyMap<string, string>
): NativeDependencyBinding {
  if (entry.type === "link") return { ok: true, entry };

  const dependencySpec = dependencies.get(entry.name);
  if (dependencySpec === undefined) {
    return {
      ok: false,
      entry,
      reason: {
        code: "native-dependency-missing",
        message: `Native user entry ${entry.name} has no matching package dependency`,
      },
    };
  }

  const boundEntry = { ...entry, dependencySpec };
  const entryProvenance = parseNativeInstallProvenance(entry.url);
  const dependencyProvenance = parseNativeInstallProvenance(dependencySpec);
  if (
    (entryProvenance !== null || dependencyProvenance !== null) &&
    (entryProvenance === null ||
      dependencyProvenance === null ||
      entryProvenance.artifactSha256 !== dependencyProvenance.artifactSha256 ||
      entryProvenance.staticFingerprint !== dependencyProvenance.staticFingerprint)
  ) {
    return {
      ok: false,
      entry: boundEntry,
      reason: {
        code: "native-dependency-mismatch",
        message: `Native user entry ${entry.name} does not match its content-addressed package dependency`,
      },
    };
  }

  return { ok: true, entry: boundEntry };
}

function findDuplicates(values: readonly string[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates;
}

function compareQuarantine(
  left: QuarantinedExternalExtension,
  right: QuarantinedExternalExtension
): number {
  return (
    left.identity.localeCompare(right.identity) ||
    left.reason.code.localeCompare(right.reason.code) ||
    left.reason.message.localeCompare(right.reason.message)
  );
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
