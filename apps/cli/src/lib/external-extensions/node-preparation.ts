import { chmod, copyFile, lstat, mkdtemp, realpath, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { nativeInstallArtifactName, parseNativeInstallProvenance } from "./install-provenance";
import type {
  CandidateInspection,
  NativeRegistryProjection,
  NativeRegistryUserEntry,
  ReservedControllerSurface,
} from "./model";
import { sha256RegularFile } from "./native-manager-protocol";
import type {
  ExternalExtensionPreparationPort,
  InspectedInstallArtifact,
  PreparedInstallArtifact,
  PreparedUpdate,
  PreparedUpdateEntry,
} from "./service";
import { inspectStaticExternalExtension } from "./static-manifest";
import { TarballStaticEvidencePort } from "./tar-static-evidence";

export class NodeExternalExtensionPreparationPort implements ExternalExtensionPreparationPort {
  constructor(private readonly reserved: ReservedControllerSurface) {}

  async inspectInstall(artifactPath: string): Promise<InspectedInstallArtifact> {
    const sourcePath = await requireCanonicalTarball(artifactPath);
    const artifactSha256 = await sha256RegularFile(sourcePath);
    const evidence = await TarballStaticEvidencePort.read(sourcePath, artifactSha256);
    return {
      sourcePath,
      artifactSha256,
      candidate: await inspectStaticExternalExtension({
        root: evidence.root,
        reserved: this.reserved,
        evidence,
      }),
    };
  }

  async stageInstall(inspected: InspectedInstallArtifact): Promise<PreparedInstallArtifact> {
    if (!inspected.candidate.accepted) {
      throw new Error("EXTERNAL_EXTENSION_REJECTED_ARTIFACT_STAGING_FORBIDDEN");
    }
    return this.stageLocalArtifact({ ...inspected, candidate: inspected.candidate });
  }

  async prepareUpdate(state: NativeRegistryProjection): Promise<PreparedUpdate> {
    const entries = nativeUserEntries(state);
    return {
      entries: Object.freeze(entries.map((entry) => classifyUpdateEntry(state, entry))),
    };
  }

  private async stageLocalArtifact(
    inspected: InspectedInstallArtifact & {
      candidate: Extract<CandidateInspection, { accepted: true }>;
    }
  ): Promise<PreparedInstallArtifact> {
    const stagingRoot = await realpath(
      await mkdtemp(path.join(os.tmpdir(), "rawr-external-artifact-"))
    );
    let artifactPath = path.join(stagingRoot, "candidate.tgz");
    try {
      await copyFile(inspected.sourcePath, artifactPath);
      await chmod(artifactPath, 0o600);
      const stagedStatus = await lstat(artifactPath);
      if (!stagedStatus.isFile() || stagedStatus.nlink !== 1) {
        throw new Error("EXTERNAL_EXTENSION_STAGED_ARTIFACT_NOT_PRIVATE");
      }
      const canonicalArtifact = await realpath(artifactPath);
      const artifactSha256 = await sha256RegularFile(canonicalArtifact);
      if (artifactSha256 !== inspected.artifactSha256) {
        throw new Error("EXTERNAL_EXTENSION_ARTIFACT_CHANGED_AFTER_INSPECTION");
      }
      const addressedPath = path.join(
        stagingRoot,
        nativeInstallArtifactName({
          artifactSha256,
          staticFingerprint: inspected.candidate.extension.fingerprint,
        })
      );
      await rename(artifactPath, addressedPath);
      artifactPath = addressedPath;
      return {
        artifactPath,
        artifactSha256,
        cleanup: idempotentCleanup(stagingRoot),
      };
    } catch (primaryError) {
      try {
        await removePrivateStagingRoot(stagingRoot);
      } catch (cleanupError) {
        throw new AggregateError(
          [primaryError, cleanupError],
          "external install staging failed and guarded cleanup also failed"
        );
      }
      throw primaryError;
    }
  }
}

async function requireCanonicalTarball(requestedPath: string): Promise<string> {
  if (!path.isAbsolute(requestedPath)) {
    throw new Error("EXTERNAL_EXTENSION_ARTIFACT_PATH_NOT_ABSOLUTE");
  }
  const requestedStatus = await lstat(requestedPath);
  if (!requestedStatus.isFile() || requestedStatus.isSymbolicLink()) {
    throw new Error("EXTERNAL_EXTENSION_ARTIFACT_NOT_PRIVATE_FILE");
  }
  const canonicalPath = await realpath(requestedPath);
  if (!canonicalPath.endsWith(".tgz") && !canonicalPath.endsWith(".tar.gz")) {
    throw new Error("EXTERNAL_EXTENSION_ARTIFACT_FORMAT_REJECTED");
  }
  const status = await lstat(canonicalPath);
  if (!status.isFile() || status.nlink !== 1) {
    throw new Error("EXTERNAL_EXTENSION_ARTIFACT_NOT_PRIVATE_FILE");
  }
  return canonicalPath;
}

function nativeUserEntries(state: NativeRegistryProjection): readonly NativeRegistryUserEntry[] {
  const entries = [
    ...state.active.map((entry) => entry.entry),
    ...state.quarantined.flatMap((entry) => (entry.entry ? [entry.entry] : [])),
  ].filter((entry): entry is NativeRegistryUserEntry => entry.type === "user");
  const unique = new Map(entries.map((entry) => [entry.name, entry]));
  if (unique.size !== entries.length) {
    throw new Error("EXTERNAL_EXTENSION_UPDATE_IDENTITY_DUPLICATE");
  }
  return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function classifyUpdateEntry(
  state: NativeRegistryProjection,
  entry: NativeRegistryUserEntry
): PreparedUpdateEntry {
  const entryProvenance = parseNativeInstallProvenance(entry.url);
  const dependencyProvenance = parseNativeInstallProvenance(entry.dependencySpec);
  if (entry.dependencySpec === undefined) {
    return {
      kind: "reject",
      entry,
      reason: `Native user entry ${entry.name} has no matching package dependency`,
    };
  }
  if (entryProvenance === null) {
    return dependencyProvenance === null
      ? {
          kind: "delegate-native",
          entry: { ...entry, dependencySpec: entry.dependencySpec },
        }
      : {
          kind: "reject",
          entry,
          reason: `Native user entry ${entry.name} does not match its content-addressed package dependency`,
        };
  }
  if (
    dependencyProvenance === null ||
    entryProvenance.artifactSha256 !== dependencyProvenance.artifactSha256 ||
    entryProvenance.staticFingerprint !== dependencyProvenance.staticFingerprint
  ) {
    return {
      kind: "reject",
      entry,
      reason: `Native user entry ${entry.name} does not match its content-addressed package dependency`,
    };
  }

  const active = state.active.find((candidate) => candidate.entry.name === entry.name);
  if (
    active === undefined ||
    active.entry.type !== "user" ||
    active.extension.fingerprint !== entryProvenance.staticFingerprint
  ) {
    return {
      kind: "reject",
      entry,
      reason: `Immutable local user entry ${entry.name} is not active with its recorded fingerprint`,
    };
  }
  return {
    kind: "proven-local",
    entry: { ...entry, dependencySpec: entry.dependencySpec },
    extension: active.extension,
  };
}

function idempotentCleanup(root: string): () => Promise<void> {
  let cleaned = false;
  return async () => {
    if (cleaned) return;
    await removePrivateStagingRoot(root);
    cleaned = true;
  };
}

async function removePrivateStagingRoot(root: string): Promise<void> {
  const canonicalTemporaryRoot = await realpath(os.tmpdir());
  const lexicalRoot = path.resolve(root);
  const offset = path.relative(canonicalTemporaryRoot, lexicalRoot);
  if (
    path.dirname(lexicalRoot) !== canonicalTemporaryRoot ||
    !path.basename(lexicalRoot).startsWith("rawr-external-artifact-") ||
    offset === "" ||
    offset === ".." ||
    offset.startsWith(`..${path.sep}`) ||
    path.isAbsolute(offset)
  ) {
    throw new Error("EXTERNAL_EXTENSION_STAGING_CLEANUP_PATH_INVALID");
  }

  let status;
  try {
    status = await lstat(lexicalRoot);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
      return;
    throw error;
  }
  if (status.isSymbolicLink()) {
    throw new Error("EXTERNAL_EXTENSION_STAGING_CLEANUP_ALIAS_REJECTED");
  }
  if (!status.isDirectory()) {
    throw new Error("EXTERNAL_EXTENSION_STAGING_CLEANUP_NOT_DIRECTORY");
  }
  try {
    const canonicalRoot = await realpath(lexicalRoot);
    if (canonicalRoot !== lexicalRoot) {
      throw new Error("EXTERNAL_EXTENSION_STAGING_CLEANUP_ALIAS_REJECTED");
    }
  } catch (error) {
    throw error;
  }
  await rm(lexicalRoot, { force: true, recursive: true });
}
