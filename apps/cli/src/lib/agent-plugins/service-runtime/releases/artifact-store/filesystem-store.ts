import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  opendir,
  realpath,
} from "node:fs/promises";
import { dirname, join, posix, resolve } from "node:path";

import {
  canonicalSerializeAgentPluginRelease,
  canonicalSerializeAgentPluginReleaseSet,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type AgentPluginReleaseSet,
  type ArtifactRef,
} from "@rawr/agent-plugin-lifecycle/release";
import type {
  ArtifactPublicationOptions,
  ArtifactPublicationResult,
  ArtifactReadResult,
  ArtifactStore,
  ArtifactStoreFailpoint,
  ArtifactStoreFailpointEvent,
  PublicationGuardResult,
} from "@rawr/agent-plugin-lifecycle/ports/releases";

import {
  PAYLOAD_DIRECTORY,
  RELEASE_ENVELOPE_FILE,
  RELEASE_SET_ENVELOPE_FILE,
  createFilesystemArtifactReader,
  releaseArtifactPath,
  releaseSetPath,
  verifyReleaseDirectory,
  verifySetDirectory,
  type ArtifactStoreRoot,
} from "./artifact-reader";
import {
  createBunFfiNoReplacePublisher,
  type NoReplacePublisher,
} from "./no-replace-publisher";
import {
  createPrivateStagingRoot,
  registerPrivateStagingEntry,
  removePrivateStagingRoot,
  type OwnedPrivateStagingRoot,
} from "./private-staging";

export function createFilesystemArtifactStore(options: {
  readonly artifactStoreRoot: ArtifactStoreRoot;
  readonly noReplacePublisher?: NoReplacePublisher;
}): ArtifactStore {
  const publisher = options.noReplacePublisher ?? createBunFfiNoReplacePublisher();
  const reader = createFilesystemArtifactReader(options.artifactStoreRoot);
  const store: ArtifactStore = {
    async read(ref) {
      return await reader.read(ref);
    },
    async publishRelease(release, publicationOptions = {}) {
      const ref = createReleaseArtifactRef(release.releaseDigest, release.artifactDigest);
      const prior = await reader.read(ref);
      if (prior.kind === "Verified") return { kind: "ReadOnlyConverged", ref };
      if (prior.kind === "Mismatch" && prior.issues[0]?.code !== "InvalidStoreRoot") {
        return { kind: "Rejected", ref, failure: prior.issues.map((issue) => issue.detail).join("; ") };
      }
      try {
        await ensureArtifactStoreLayout(options.artifactStoreRoot);
      } catch (error) {
        return { kind: "Rejected", ref, failure: errorMessage(error) };
      }
      return await publishCandidate({
        artifactStoreRoot: options.artifactStoreRoot,
        destinationPath: releaseArtifactPath(options.artifactStoreRoot, release.artifactDigest),
        ref,
        publisher,
        failpoint: publicationOptions.failpoint,
        beforePublication: publicationOptions.beforePublication,
        stage: async (staging) => await stageRelease(staging, release, publicationOptions.failpoint),
        verifyStaging: async (staging) => await verifyReleaseDirectory(options.artifactStoreRoot, staging.path, ref),
        verifyFinal: async () => await reader.read(ref),
      });
    },
    async publishReleaseSet(releaseSet, publicationOptions = {}) {
      const ref = createCompleteSetArtifactRef(releaseSet.releaseSetDigest);
      const prior = await reader.read(ref);
      if (prior.kind === "Verified") return { kind: "ReadOnlyConverged", ref };
      if (prior.kind === "Mismatch" && prior.issues[0]?.code !== "InvalidStoreRoot") {
        return { kind: "Rejected", ref, failure: prior.issues.map((issue) => issue.detail).join("; ") };
      }
      try {
        await ensureArtifactStoreLayout(options.artifactStoreRoot);
      } catch (error) {
        return { kind: "Rejected", ref, failure: errorMessage(error) };
      }
      return await publishCandidate({
        artifactStoreRoot: options.artifactStoreRoot,
        destinationPath: releaseSetPath(options.artifactStoreRoot, releaseSet.releaseSetDigest),
        ref,
        publisher,
        failpoint: publicationOptions.failpoint,
        beforePublication: publicationOptions.beforePublication,
        stage: async (staging) => await stageReleaseSet(staging, releaseSet, publicationOptions.failpoint),
        verifyStaging: async (staging) => await verifySetDirectory(
          options.artifactStoreRoot,
          staging.path,
          releaseSet.releaseSetDigest,
        ),
        verifyFinal: async () => await reader.read(ref),
      });
    },
  };
  return Object.freeze(store);
}

async function publishCandidate(options: {
  readonly artifactStoreRoot: ArtifactStoreRoot;
  readonly destinationPath: string;
  readonly ref: ArtifactRef;
  readonly publisher: NoReplacePublisher;
  readonly failpoint?: ArtifactStoreFailpoint;
  readonly beforePublication?: () => Promise<PublicationGuardResult>;
  readonly stage: (staging: OwnedPrivateStagingRoot) => Promise<void>;
  readonly verifyStaging: (staging: OwnedPrivateStagingRoot) => Promise<ArtifactReadResult>;
  readonly verifyFinal: () => Promise<ArtifactReadResult>;
}): Promise<ArtifactPublicationResult> {
  let staging: OwnedPrivateStagingRoot | undefined;
  let publicationMayHaveCommitted = false;
  let result: ArtifactPublicationResult;
  try {
    staging = await createPrivateStagingRoot(options.artifactStoreRoot);
    await options.stage(staging);
    const staged = await options.verifyStaging(staging);
    if (staged.kind !== "Verified") {
      result = { kind: "Rejected", ref: options.ref, failure: describeReadFailure(staged) };
      return await cleanupResult(staging, result);
    }
    await hit(options.failpoint, { kind: "AfterStagingVerification" });
    const guard = await options.beforePublication?.();
    if (guard?.kind === "Rejected") {
      result = { kind: "Rejected", ref: options.ref, failure: guard.failure };
      return await cleanupResult(staging, result);
    }
    await hit(options.failpoint, { kind: "BeforeNoReplacePublication" });
    publicationMayHaveCommitted = true;
    const publication = await options.publisher.publish({
      sourcePath: staging.path,
      destinationPath: options.destinationPath,
      expectedSource: { dev: staging.dev, ino: staging.ino },
    });
    if (publication.kind === "Published") {
      await hit(options.failpoint, { kind: "AfterNoReplacePublication" });
      try {
        await Promise.all([
          fsyncDirectory(dirname(options.destinationPath)),
          fsyncDirectory(staging.parent),
        ]);
      } catch (error) {
        return await unsettledAfterObservation(options, errorMessage(error), undefined);
      }
      const verified = await options.verifyFinal();
      if (verified.kind !== "Verified") {
        return {
          kind: "Unsettled",
          ref: options.ref,
          failure: "published path did not verify",
          observation: observationOf(verified),
        };
      }
      await hit(options.failpoint, { kind: "AfterFinalVerification" });
      return { kind: "Published", ref: options.ref };
    }

    if (publication.kind === "Occupied") {
      publicationMayHaveCommitted = false;
      const winner = await options.verifyFinal();
      result = winner.kind === "Verified"
        ? { kind: "ReadOnlyConverged", ref: options.ref }
        : { kind: "Rejected", ref: options.ref, failure: `conflicting digest-path winner: ${describeReadFailure(winner)}` };
      return await cleanupResult(staging, result);
    }
    if (publication.kind === "Unsupported") {
      publicationMayHaveCommitted = false;
      result = { kind: "Rejected", ref: options.ref, failure: publication.reason };
      return await cleanupResult(staging, result);
    }
    return await unsettledAfterObservation(options, publication.reason, staging);
  } catch (error) {
    if (publicationMayHaveCommitted) {
      return await unsettledAfterObservation(options, errorMessage(error), staging);
    }
    result = { kind: "Rejected", ref: options.ref, failure: errorMessage(error) };
    return staging === undefined ? result : await cleanupResult(staging, result);
  }
}

async function unsettledAfterObservation(
  options: {
    readonly ref: ArtifactRef;
    readonly verifyFinal: () => Promise<ArtifactReadResult>;
  },
  failure: string,
  staging: OwnedPrivateStagingRoot | undefined,
): Promise<ArtifactPublicationResult> {
  let observation: ArtifactReadResult | undefined;
  try {
    observation = await options.verifyFinal();
  } catch {
    observation = undefined;
  }
  let cleanupFailure: string | undefined;
  if (staging !== undefined) {
    let stagingExists = false;
    try {
      stagingExists = await pathExists(staging.path);
    } catch (error) {
      cleanupFailure = `unable to inspect private staging cleanup target: ${errorMessage(error)}`;
    }
    if (stagingExists) {
      try {
        await removePrivateStagingRoot(staging);
      } catch (error) {
        cleanupFailure = errorMessage(error);
      }
    }
  }
  return {
    kind: "Unsettled",
    ref: options.ref,
    failure,
    observation: observation === undefined ? "Unknown" : observationOf(observation),
    ...(cleanupFailure === undefined ? {} : { cleanupFailure }),
  };
}

async function cleanupResult(
  staging: OwnedPrivateStagingRoot,
  result: Exclude<ArtifactPublicationResult, { kind: "Unsettled" }>,
): Promise<ArtifactPublicationResult> {
  try {
    await removePrivateStagingRoot(staging);
    return result;
  } catch (error) {
    if (result.kind === "Published") {
      return result;
    }
    if (result.kind === "ReadOnlyConverged") {
      return {
        kind: "Unsettled",
        ref: result.ref,
        failure: "verified winner converged but private staging cleanup failed",
        observation: "Verified",
        cleanupFailure: errorMessage(error),
      };
    }
    return { ...result, cleanupFailure: errorMessage(error) };
  }
}

async function stageRelease(
  staging: OwnedPrivateStagingRoot,
  release: AgentPluginRelease,
  failpoint: ArtifactStoreFailpoint | undefined,
): Promise<void> {
  await writeOwnedFile(
    staging,
    RELEASE_ENVELOPE_FILE,
    canonicalSerializeAgentPluginRelease(release),
    0o444,
  );
  await hit(failpoint, { kind: "AfterStagingFile", path: RELEASE_ENVELOPE_FILE });
  await ensureRelativeDirectory(staging, PAYLOAD_DIRECTORY);
  for (const entry of release.artifactBody.payloadEntries) {
    const path = posix.join(PAYLOAD_DIRECTORY, entry.path);
    await writeOwnedFile(staging, path, payloadEntryBytes(entry), entry.mode);
    await hit(failpoint, { kind: "AfterStagingFile", path });
  }
  await flushDirectoryTree(staging.path);
  await hit(failpoint, { kind: "AfterStagingFlush" });
}

async function stageReleaseSet(
  staging: OwnedPrivateStagingRoot,
  releaseSet: AgentPluginReleaseSet,
  failpoint: ArtifactStoreFailpoint | undefined,
): Promise<void> {
  await writeOwnedFile(
    staging,
    RELEASE_SET_ENVELOPE_FILE,
    canonicalSerializeAgentPluginReleaseSet(releaseSet),
    0o444,
  );
  await hit(failpoint, { kind: "AfterStagingFile", path: RELEASE_SET_ENVELOPE_FILE });
  await flushDirectoryTree(staging.path);
  await hit(failpoint, { kind: "AfterStagingFlush" });
}

async function writeOwnedFile(
  staging: OwnedPrivateStagingRoot,
  relativePath: string,
  bytes: Uint8Array,
  mode: number,
): Promise<void> {
  const parts = relativePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`invalid artifact relative path: ${relativePath}`);
  }
  if (parts.length > 1) await ensureRelativeDirectory(staging, parts.slice(0, -1).join("/"));
  const destination = join(staging.path, ...parts);
  const handle = await open(
    destination,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    mode,
  );
  try {
    await handle.writeFile(new Uint8Array(bytes));
    await handle.chmod(mode);
    await handle.sync();
    const status = await handle.stat({ bigint: true });
    if (!status.isFile() || status.nlink !== 1n || (Number(status.mode) & 0o777) !== mode) {
      throw new Error(`staged artifact file failed ownership verification: ${relativePath}`);
    }
  } finally {
    await handle.close();
  }
  await registerPrivateStagingEntry(staging, destination, "file", true);
}

async function ensureRelativeDirectory(staging: OwnedPrivateStagingRoot, relativePath: string): Promise<void> {
  let current = staging.path;
  for (const part of relativePath.split("/")) {
    if (part === "" || part === "." || part === "..") throw new Error(`invalid artifact directory: ${relativePath}`);
    const next = join(current, part);
    let created = false;
    try {
      await mkdir(next, { mode: 0o700 });
      created = true;
    } catch (error) {
      if (!isErrno(error, "EEXIST")) throw error;
    }
    await requireDirectCanonicalDirectory(current, next);
    await registerPrivateStagingEntry(staging, next, "directory", created);
    current = next;
  }
}

async function ensureArtifactStoreLayout(root: string): Promise<void> {
  const canonicalRoot = await ensureCanonicalDirectoryChain(root);
  await ensureDirectDirectory(canonicalRoot, "releases");
  await ensureDirectDirectory(join(canonicalRoot, "releases"), "sha256");
  await ensureDirectDirectory(canonicalRoot, "sets");
  await ensureDirectDirectory(join(canonicalRoot, "sets"), "sha256");
}

async function ensureCanonicalDirectoryChain(path: string): Promise<string> {
  const normalized = resolve(path);
  if (path !== normalized) throw new Error(`artifact store root is not absolute and normalized: ${path}`);
  try {
    return await requireCanonicalDirectory(normalized);
  } catch (error) {
    if (!isErrno(error, "ENOENT")) throw error;
  }
  const parent = dirname(normalized);
  if (parent === normalized) throw new Error(`artifact store root has no creatable parent: ${path}`);
  const canonicalParent = await ensureCanonicalDirectoryChain(parent);
  try {
    await mkdir(normalized, { mode: 0o700 });
  } catch (error) {
    if (!isErrno(error, "EEXIST")) throw error;
  }
  await requireDirectCanonicalDirectory(canonicalParent, normalized);
  return normalized;
}

async function ensureDirectDirectory(parent: string, name: string): Promise<void> {
  const child = join(parent, name);
  try {
    await mkdir(child, { mode: 0o700 });
  } catch (error) {
    if (!isErrno(error, "EEXIST")) throw error;
  }
  await requireDirectCanonicalDirectory(parent, child);
}

async function requireDirectCanonicalDirectory(parent: string, child: string): Promise<void> {
  const canonicalParent = await requireCanonicalDirectory(parent);
  const canonicalChild = await requireCanonicalDirectory(child);
  if (dirname(canonicalChild) !== canonicalParent) throw new Error(`directory is not a direct child: ${child}`);
}

async function requireCanonicalDirectory(path: string): Promise<string> {
  const normalized = resolve(path);
  const status = await lstat(normalized);
  const canonical = await realpath(normalized);
  if (!status.isDirectory() || status.isSymbolicLink() || canonical !== normalized) {
    throw new Error(`directory is not canonical: ${path}`);
  }
  return canonical;
}

async function flushDirectoryTree(root: string): Promise<void> {
  const directories: string[] = [];
  await collectVerifiedDirectories(root, directories);
  const ordered = directories.sort((left, right) => {
    const depth = right.split("/").length - left.split("/").length;
    return depth !== 0 ? depth : left < right ? -1 : left > right ? 1 : 0;
  });
  for (const directory of ordered) await fsyncDirectory(directory);
}

async function collectVerifiedDirectories(root: string, directories: string[]): Promise<void> {
  const canonical = await requireCanonicalDirectory(root);
  directories.push(canonical);
  const directory = await opendir(canonical);
  for await (const entry of directory) {
    const child = join(canonical, entry.name);
    const status = await lstat(child);
    if (status.isSymbolicLink()) throw new Error(`symlink appeared in private staging: ${child}`);
    if (status.isDirectory()) await collectVerifiedDirectories(child, directories);
    else if (!status.isFile()) throw new Error(`special entry appeared in private staging: ${child}`);
  }
}

async function fsyncDirectory(path: string): Promise<void> {
  const handle = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function hit(failpoint: ArtifactStoreFailpoint | undefined, event: ArtifactStoreFailpointEvent): Promise<void> {
  await failpoint?.(event);
}

function describeReadFailure(result: ArtifactReadResult): string {
  return result.kind === "Missing"
    ? "artifact is missing"
    : result.kind === "Mismatch"
      ? result.issues.map((issue) => issue.detail).join("; ")
      : "artifact unexpectedly verified";
}

function observationOf(result: ArtifactReadResult): "Verified" | "Missing" | "Mismatch" {
  return result.kind;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isErrno(error, "ENOENT")) return false;
    throw error;
  }
}

function isErrno(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
