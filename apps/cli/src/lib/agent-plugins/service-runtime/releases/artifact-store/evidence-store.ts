import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  opendir,
  readFile,
  realpath,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  MAX_MECHANICAL_EVIDENCE_BYTES,
  createMechanicalEvidenceHandle,
  mechanicalEvidenceDigest,
  parseMechanicalEvidenceHandle,
  type MechanicalEvidenceDigest,
  type MechanicalEvidenceHandleV1,
  type MechanicalEvidenceIssue,
  type MechanicalEvidencePublicationResult,
  type MechanicalEvidenceReadResult,
  type MechanicalEvidenceReader,
  type MechanicalEvidenceStore,
  type MechanicalEvidenceStoreFailpointEvent,
} from "@rawr/agent-plugin-lifecycle/release";

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
import type { ArtifactStoreRoot } from "./artifact-reader";

const EVIDENCE_DIRECTORY = "mechanical-evidence";
const DIGEST_DIRECTORY = "sha256";
const EVIDENCE_FILE = "evidence.json";
export function createFilesystemMechanicalEvidenceStore(options: {
  readonly artifactStoreRoot: ArtifactStoreRoot;
  readonly noReplacePublisher?: NoReplacePublisher;
}): MechanicalEvidenceStore {
  const publisher = options.noReplacePublisher ?? createBunFfiNoReplacePublisher();
  const reader = createFilesystemMechanicalEvidenceReader(options.artifactStoreRoot);
  const store: MechanicalEvidenceStore = {
    read: reader.read,
    async publish(
      handle: MechanicalEvidenceHandleV1,
      bytes: Uint8Array,
      publicationOptions: Readonly<{
        failpoint?: (event: MechanicalEvidenceStoreFailpointEvent) => void | Promise<void>;
      }> = {},
    ): Promise<MechanicalEvidencePublicationResult> {
      const parsed = parseMechanicalEvidenceHandle(handle);
      const stableHandle = parsed.ok ? parsed.value : createMechanicalEvidenceHandle(bytes);
      if (!parsed.ok) {
        return { kind: "Rejected", handle: stableHandle, failure: parsed.issue.detail };
      }
      if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_MECHANICAL_EVIDENCE_BYTES) {
        return {
          kind: "Rejected",
          handle: stableHandle,
          failure: "Mechanical evidence bytes exceed the bounded opaque payload contract",
        };
      }
      if (mechanicalEvidenceDigest(bytes) !== stableHandle.digest) {
        return {
          kind: "Rejected",
          handle: stableHandle,
          failure: "Mechanical evidence bytes do not match the requested digest",
        };
      }
      const prior = await reader.read(stableHandle);
      if (prior.kind === "Verified") return { kind: "ReadOnlyConverged", handle: stableHandle };
      if (prior.kind === "Mismatch") {
        return {
          kind: "Rejected",
          handle: stableHandle,
          failure: prior.issues.map((issue) => issue.detail).join("; "),
        };
      }

      try {
        await ensureEvidenceLayout(options.artifactStoreRoot);
      } catch (error) {
        return { kind: "Rejected", handle: stableHandle, failure: errorMessage(error) };
      }

      let staging: OwnedPrivateStagingRoot | undefined;
      let publicationMayHaveCommitted = false;
      try {
        staging = await createPrivateStagingRoot(options.artifactStoreRoot);
        await writeEvidence(staging, bytes);
        await publicationOptions.failpoint?.({ kind: "AfterStagingWrite" });
        const staged = await verifyEvidenceDirectory(
          options.artifactStoreRoot,
          staging.path,
          stableHandle,
        );
        if (staged.kind !== "Verified") {
          return await cleanupRejected(
            staging,
            stableHandle,
            describeEvidenceRead(staged),
          );
        }

        await publicationOptions.failpoint?.({ kind: "BeforeNoReplacePublication" });
        publicationMayHaveCommitted = true;
        const publication = await publisher.publish({
          sourcePath: staging.path,
          destinationPath: evidencePath(options.artifactStoreRoot, stableHandle.digest),
          expectedSource: { dev: staging.dev, ino: staging.ino },
        });
        if (publication.kind === "Published") {
          staging = undefined;
          await publicationOptions.failpoint?.({ kind: "AfterNoReplacePublication" });
          await fsyncDirectory(evidenceDigestRoot(options.artifactStoreRoot));
          const final = await reader.read(stableHandle);
          if (final.kind !== "Verified") {
            return {
              kind: "Unsettled",
              handle: stableHandle,
              failure: "Published evidence did not verify",
              observation: final.kind,
            };
          }
          await publicationOptions.failpoint?.({ kind: "AfterFinalVerification" });
          return { kind: "Published", handle: stableHandle };
        }

        publicationMayHaveCommitted = false;
        if (publication.kind === "Occupied") {
          const winner = await reader.read(stableHandle);
          if (winner.kind === "Verified") {
            return await cleanupConverged(staging, stableHandle);
          }
          return await cleanupRejected(
            staging,
            stableHandle,
            `Conflicting digest-path winner: ${describeEvidenceRead(winner)}`,
          );
        }
        if (publication.kind === "Unsupported") {
          return await cleanupRejected(staging, stableHandle, publication.reason);
        }
        return await unsettled(
          reader,
          stableHandle,
          publication.reason,
          staging,
        );
      } catch (error) {
        if (publicationMayHaveCommitted) {
          return await unsettled(reader, stableHandle, errorMessage(error), staging);
        }
        if (staging === undefined) {
          return { kind: "Rejected", handle: stableHandle, failure: errorMessage(error) };
        }
        return await cleanupRejected(staging, stableHandle, errorMessage(error));
      }
    },
  };
  return Object.freeze(store);
}

export function createFilesystemMechanicalEvidenceReader(
  artifactStoreRoot: ArtifactStoreRoot,
): MechanicalEvidenceReader {
  const reader: MechanicalEvidenceReader = {
    async read(handle: MechanicalEvidenceHandleV1): Promise<MechanicalEvidenceReadResult> {
      const parsed = parseMechanicalEvidenceHandle(handle);
      const stableHandle = parsed.ok ? parsed.value : createMechanicalEvidenceHandle(new Uint8Array());
      if (!parsed.ok) return mismatch(stableHandle, parsed.issue);
      let root: string;
      try {
        root = await requireCanonicalDirectory(artifactStoreRoot);
      } catch (error) {
        if (isErrno(error, "ENOENT")) return { kind: "Missing", handle: stableHandle };
        return mismatch(stableHandle, issue("InvalidStoreRoot", errorMessage(error)));
      }
      const path = evidencePath(root, stableHandle.digest);
      try {
        await lstat(path);
      } catch (error) {
        if (isErrno(error, "ENOENT")) return { kind: "Missing", handle: stableHandle };
        return mismatch(stableHandle, issue("ReadFailure", errorMessage(error)));
      }
      return await verifyEvidenceDirectory(root, path, stableHandle, true);
    },
  };
  return Object.freeze(reader);
}

async function verifyEvidenceDirectory(
  artifactStoreRoot: string,
  directory: string,
  handle: MechanicalEvidenceHandleV1,
  requireFinalPath = false,
): Promise<MechanicalEvidenceReadResult> {
  try {
    const root = await requireCanonicalDirectory(artifactStoreRoot);
    const canonicalDirectory = await requireCanonicalDirectory(directory);
    if (!isContained(root, canonicalDirectory)) {
      return mismatch(handle, issue("InvalidEntryType", "Evidence directory escapes the artifact root"));
    }
    if (requireFinalPath && canonicalDirectory !== evidencePath(root, handle.digest)) {
      return mismatch(handle, issue("InvalidEntryType", "Evidence path does not match its digest handle"));
    }
    const entries: string[] = [];
    const opened = await opendir(canonicalDirectory);
    for await (const entry of opened) {
      entries.push(entry.name);
      if (entry.name !== EVIDENCE_FILE || !entry.isFile() || entry.isSymbolicLink()) {
        return mismatch(handle, issue("UnexpectedEntry", `Unexpected evidence entry: ${entry.name}`));
      }
    }
    if (entries.length !== 1 || entries[0] !== EVIDENCE_FILE) {
      return mismatch(handle, issue("MissingEntry", "Evidence directory must contain exactly evidence.json"));
    }
    const filePath = join(canonicalDirectory, EVIDENCE_FILE);
    const status = await lstat(filePath, { bigint: true });
    if (!status.isFile() || status.isSymbolicLink() || status.nlink !== 1n) {
      return mismatch(handle, issue("InvalidEntryType", "Evidence payload is not one owned regular file"));
    }
    if ((Number(status.mode) & 0o777) !== 0o444) {
      return mismatch(handle, issue("ModeMismatch", "Evidence payload mode must be 0444"));
    }
    if (status.size > BigInt(MAX_MECHANICAL_EVIDENCE_BYTES)) {
      return mismatch(handle, issue("EvidenceTooLarge", "Evidence payload exceeds its byte bound"));
    }
    const bytes = new Uint8Array(await readFile(filePath));
    if (mechanicalEvidenceDigest(bytes) !== handle.digest) {
      return mismatch(handle, issue("DigestMismatch", "Evidence payload does not match its handle"));
    }
    return { kind: "Verified", handle, bytes };
  } catch (error) {
    return mismatch(handle, issue("ReadFailure", errorMessage(error)));
  }
}

async function writeEvidence(staging: OwnedPrivateStagingRoot, bytes: Uint8Array): Promise<void> {
  const destination = join(staging.path, EVIDENCE_FILE);
  const handle = await open(
    destination,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o444,
  );
  try {
    await handle.writeFile(new Uint8Array(bytes));
    await handle.chmod(0o444);
    await handle.sync();
    const status = await handle.stat({ bigint: true });
    if (!status.isFile() || status.nlink !== 1n || (Number(status.mode) & 0o777) !== 0o444) {
      throw new Error("Staged evidence failed its owned-file verification");
    }
  } finally {
    await handle.close();
  }
  await registerPrivateStagingEntry(staging, destination, "file", true);
  await fsyncDirectory(staging.path);
}

async function ensureEvidenceLayout(root: string): Promise<void> {
  const canonicalRoot = await ensureCanonicalDirectoryChain(root);
  await ensureDirectDirectory(canonicalRoot, EVIDENCE_DIRECTORY);
  await ensureDirectDirectory(join(canonicalRoot, EVIDENCE_DIRECTORY), DIGEST_DIRECTORY);
}

async function ensureCanonicalDirectoryChain(path: string): Promise<string> {
  const normalized = resolve(path);
  if (path !== normalized) throw new Error(`Artifact store root is not absolute and normalized: ${path}`);
  try {
    return await requireCanonicalDirectory(normalized);
  } catch (error) {
    if (!isErrno(error, "ENOENT")) throw error;
  }
  const parent = dirname(normalized);
  if (parent === normalized) throw new Error(`Artifact store root has no creatable parent: ${path}`);
  const canonicalParent = await ensureCanonicalDirectoryChain(parent);
  try {
    await mkdir(normalized, { mode: 0o700 });
  } catch (error) {
    if (!isErrno(error, "EEXIST")) throw error;
  }
  const canonicalChild = await requireCanonicalDirectory(normalized);
  if (dirname(canonicalChild) !== canonicalParent) {
    throw new Error(`Artifact directory is not a direct child: ${normalized}`);
  }
  return canonicalChild;
}

async function ensureDirectDirectory(parent: string, name: string): Promise<void> {
  const child = join(parent, name);
  try {
    await mkdir(child, { mode: 0o700 });
  } catch (error) {
    if (!isErrno(error, "EEXIST")) throw error;
  }
  const canonicalParent = await requireCanonicalDirectory(parent);
  const canonicalChild = await requireCanonicalDirectory(child);
  if (dirname(canonicalChild) !== canonicalParent) {
    throw new Error(`Artifact directory is not a direct child: ${child}`);
  }
}

async function cleanupRejected(
  staging: OwnedPrivateStagingRoot,
  handle: MechanicalEvidenceHandleV1,
  failure: string,
): Promise<MechanicalEvidencePublicationResult> {
  try {
    await removePrivateStagingRoot(staging);
    return { kind: "Rejected", handle, failure };
  } catch (error) {
    return { kind: "Rejected", handle, failure, cleanupFailure: errorMessage(error) };
  }
}

async function cleanupConverged(
  staging: OwnedPrivateStagingRoot,
  handle: MechanicalEvidenceHandleV1,
): Promise<MechanicalEvidencePublicationResult> {
  try {
    await removePrivateStagingRoot(staging);
    return { kind: "ReadOnlyConverged", handle };
  } catch (error) {
    return {
      kind: "Unsettled",
      handle,
      failure: "Verified evidence converged but private staging cleanup failed",
      observation: "Verified",
      cleanupFailure: errorMessage(error),
    };
  }
}

async function unsettled(
  reader: MechanicalEvidenceReader,
  handle: MechanicalEvidenceHandleV1,
  failure: string,
  staging: OwnedPrivateStagingRoot | undefined,
): Promise<MechanicalEvidencePublicationResult> {
  let observation: MechanicalEvidenceReadResult | undefined;
  try {
    observation = await reader.read(handle);
  } catch {
    observation = undefined;
  }
  let cleanupFailure: string | undefined;
  if (staging !== undefined && await pathExists(staging.path)) {
    try {
      await removePrivateStagingRoot(staging);
    } catch (error) {
      cleanupFailure = errorMessage(error);
    }
  }
  return {
    kind: "Unsettled",
    handle,
    failure,
    observation: observation?.kind ?? "Unknown",
    ...(cleanupFailure === undefined ? {} : { cleanupFailure }),
  };
}

function evidenceDigestRoot(root: string): string {
  return join(root, EVIDENCE_DIRECTORY, DIGEST_DIRECTORY);
}

function evidencePath(root: string, digest: MechanicalEvidenceDigest): string {
  return join(evidenceDigestRoot(root), digest);
}

async function requireCanonicalDirectory(path: string): Promise<string> {
  const normalized = resolve(path);
  if (normalized !== path) throw new Error(`Directory is not absolute and normalized: ${path}`);
  const status = await lstat(normalized);
  const canonical = await realpath(normalized);
  if (!status.isDirectory() || status.isSymbolicLink() || canonical !== normalized) {
    throw new Error(`Directory is not canonical: ${path}`);
  }
  return canonical;
}

async function fsyncDirectory(path: string): Promise<void> {
  const handle = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
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

function isContained(root: string, candidate: string): boolean {
  const offset = relative(root, candidate);
  return offset !== ""
    && offset !== ".."
    && !offset.startsWith(`..${sep}`)
    && !isAbsolute(offset);
}

function mismatch(
  handle: MechanicalEvidenceHandleV1,
  issueValue: MechanicalEvidenceIssue,
): Extract<MechanicalEvidenceReadResult, { kind: "Mismatch" }> {
  return { kind: "Mismatch", handle, issues: [issueValue] };
}

function issue(
  code: MechanicalEvidenceIssue["code"],
  detail: string,
): MechanicalEvidenceIssue {
  return Object.freeze({ code, detail });
}

function describeEvidenceRead(result: MechanicalEvidenceReadResult): string {
  return result.kind === "Missing"
    ? "Mechanical evidence is missing"
    : result.kind === "Mismatch"
      ? result.issues.map((candidate) => candidate.detail).join("; ")
      : "Mechanical evidence unexpectedly verified";
}

function isErrno(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
