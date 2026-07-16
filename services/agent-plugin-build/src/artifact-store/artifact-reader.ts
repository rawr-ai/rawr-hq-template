import { constants } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { isAbsolute, join, posix, relative, resolve, sep } from "node:path";

import {
  canonicalSerializeAgentPluginRelease,
  canonicalSerializeAgentPluginReleaseSet,
  compareCanonicalText,
  contentDigest,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  decodeAgentPluginRelease,
  decodeAgentPluginReleaseSet,
  MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES,
  MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  payloadEntryBytes,
  verifyCompleteReleaseSetGraph,
  type AgentPluginRelease,
  type AgentPluginReleaseSet,
  type ArtifactDigest,
  type ArtifactRef,
  type ReleaseArtifactRef,
  type ReleaseSetDigest,
  type VerifiedArtifactSnapshotV1,
  type VerifiedPayloadFileV1,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-release";

import { addReleaseSetPayloadBytes } from "../payload-bounds";

export const RELEASE_ENVELOPE_FILE = "release.json";
export const RELEASE_SET_ENVELOPE_FILE = "release-set.json";
export const PAYLOAD_DIRECTORY = "payload";
const MAX_ARTIFACT_TREE_ENTRIES = 200_000;

export type ArtifactStoreRoot = string & {
  readonly __artifactStoreRoot: "ArtifactStoreRootV1";
};

export interface ArtifactReadIssue {
  readonly code:
    | "InvalidStoreRoot"
    | "MissingEntry"
    | "UnexpectedEntry"
    | "InvalidEntryType"
    | "SharedInode"
    | "ModeMismatch"
    | "DigestMismatch"
    | "MalformedEnvelope"
    | "ReferenceMismatch"
    | "ReadFailure";
  readonly detail: string;
}

export type ArtifactReadResult =
  | Readonly<{ kind: "Verified"; snapshot: VerifiedArtifactSnapshotV1 }>
  | Readonly<{ kind: "Missing"; ref: ArtifactRef }>
  | Readonly<{
    kind: "Mismatch";
    ref: ArtifactRef;
    issues: readonly [ArtifactReadIssue, ...ArtifactReadIssue[]];
  }>;

export interface ArtifactReader {
  read(ref: ArtifactRef): Promise<ArtifactReadResult>;
}

export function createFilesystemArtifactReader(artifactStoreRoot: ArtifactStoreRoot): ArtifactReader {
  const reader: ArtifactReader = {
    async read(ref): Promise<ArtifactReadResult> {
      let root: string;
      try {
        await lstat(artifactStoreRoot);
      } catch (error) {
        if (isErrno(error, "ENOENT")) return { kind: "Missing", ref };
        return mismatch(ref, "InvalidStoreRoot", errorMessage(error));
      }
      try {
        root = await requireCanonicalDirectory(artifactStoreRoot);
      } catch (error) {
        return mismatch(ref, "InvalidStoreRoot", errorMessage(error));
      }
      if (ref.kind === "release") {
        return await readRelease(root, ref);
      }
      return await readCompleteSet(root, ref.releaseSetDigest);
    },
  };
  return Object.freeze(reader);
}

export async function verifyReleaseDirectory(
  artifactStoreRoot: ArtifactStoreRoot,
  directory: string,
  expected: ReleaseArtifactRef,
): Promise<ArtifactReadResult> {
  const root = await requireCanonicalDirectory(artifactStoreRoot);
  return await readReleaseDirectory(root, directory, expected);
}

export async function verifySetDirectory(
  artifactStoreRoot: ArtifactStoreRoot,
  directory: string,
  expectedDigest: ReleaseSetDigest,
): Promise<ArtifactReadResult> {
  const root = await requireCanonicalDirectory(artifactStoreRoot);
  return await readSetDirectory(root, directory, expectedDigest);
}

async function readRelease(root: string, ref: ReleaseArtifactRef): Promise<ArtifactReadResult> {
  const directory = releaseArtifactPath(root, ref.artifactDigest);
  if (!await pathExists(directory)) return { kind: "Missing", ref };
  return await readReleaseDirectory(root, directory, ref);
}

async function readReleaseDirectory(
  root: string,
  directory: string,
  ref: ReleaseArtifactRef,
): Promise<ArtifactReadResult> {
  try {
    await requireContainedCanonicalDirectory(root, directory);
    const release = await readVerifiedReleaseEnvelope(directory, ref);

    const expectedFiles = new Set<string>([RELEASE_ENVELOPE_FILE]);
    const expectedDirectories = new Set<string>([PAYLOAD_DIRECTORY]);
    const files: VerifiedPayloadFileV1[] = [];
    for (const entry of release.artifactBody.payloadEntries) {
      const relativePayloadPath = posix.join(PAYLOAD_DIRECTORY, entry.path);
      expectedFiles.add(relativePayloadPath);
      addParentDirectories(relativePayloadPath, expectedDirectories);
      const filePath = join(directory, ...relativePayloadPath.split("/"));
      const bytes = await readOwnedRegularFile(filePath, entry.mode, entry.byteLength);
      const expectedBytes = payloadEntryBytes(entry);
      if (!equalBytes(bytes, expectedBytes) || contentDigest(bytes) !== entry.contentDigest) {
        return mismatch(ref, "DigestMismatch", `payload differs at ${entry.path}`);
      }
      files.push(Object.freeze({
        path: entry.path,
        mode: entry.mode,
        contentDigest: entry.contentDigest,
        bytes: new Uint8Array(bytes),
      }));
    }
    const entries = await listDirectoryTree(directory);
    for (const entry of entries) {
      if (entry.kind === "file" && !expectedFiles.has(entry.path)) {
        return mismatch(ref, "UnexpectedEntry", `unexpected artifact file ${entry.path}`);
      }
      if (entry.kind === "directory" && !expectedDirectories.has(entry.path)) {
        return mismatch(ref, "UnexpectedEntry", `unexpected artifact directory ${entry.path}`);
      }
    }
    for (const expectedFile of expectedFiles) {
      if (!entries.some((entry) => entry.kind === "file" && entry.path === expectedFile)) {
        return mismatch(ref, "MissingEntry", `missing artifact file ${expectedFile}`);
      }
    }
    return {
      kind: "Verified",
      snapshot: Object.freeze({
        kind: "release",
        ref,
        release,
        files: Object.freeze(files.map(copyPayloadFile)),
      }) satisfies VerifiedReleaseArtifactV1,
    };
  } catch (error) {
    return mismatch(ref, issueCode(error), errorMessage(error));
  }
}

async function readCompleteSet(root: string, digest: ReleaseSetDigest): Promise<ArtifactReadResult> {
  const ref = createCompleteSetArtifactRef(digest);
  const directory = releaseSetPath(root, digest);
  if (!await pathExists(directory)) return { kind: "Missing", ref };
  return await readSetDirectory(root, directory, digest);
}

async function readSetDirectory(
  root: string,
  directory: string,
  digest: ReleaseSetDigest,
): Promise<ArtifactReadResult> {
  const ref = createCompleteSetArtifactRef(digest);
  try {
    await requireContainedCanonicalDirectory(root, directory);
    const envelopeBytes = await readOwnedRegularFile(
      join(directory, RELEASE_SET_ENVELOPE_FILE),
      0o444,
      MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES,
    );
    const decoded = decodeAgentPluginReleaseSet(envelopeBytes);
    if (!decoded.ok) return mismatch(ref, "MalformedEnvelope", decoded.issues.map((issue) => issue.code).join(","));
    const releaseSet = decoded.value;
    if (releaseSet.releaseSetDigest !== digest) {
      return mismatch(ref, "ReferenceMismatch", "release-set envelope does not match requested digest");
    }
    if (!equalBytes(envelopeBytes, canonicalSerializeAgentPluginReleaseSet(releaseSet))) {
      return mismatch(ref, "MalformedEnvelope", "release-set envelope is not canonical");
    }
    const entries = await listDirectoryTree(directory);
    if (entries.length !== 1 || entries[0]?.kind !== "file" || entries[0].path !== RELEASE_SET_ENVELOPE_FILE) {
      return mismatch(ref, "UnexpectedEntry", "release-set marker directory contains unexpected entries");
    }

    await preflightCompleteSetPayloadBytes(root, releaseSet);
    const members: VerifiedReleaseArtifactV1[] = [];
    for (const member of releaseSet.body.members) {
      const memberRef = createReleaseArtifactRef(member.releaseDigest, member.artifactDigest);
      const memberResult = await readRelease(root, memberRef);
      if (memberResult.kind !== "Verified" || memberResult.snapshot.kind !== "release") {
        return mismatch(ref, "ReferenceMismatch", `complete-set member is not verified: ${member.pluginId}`);
      }
      members.push(copyReleaseSnapshot(memberResult.snapshot));
    }
    const graph = verifyCompleteReleaseSetGraph(releaseSet, members.map((member) => member.release));
    if (!graph.ok) {
      return mismatch(ref, "ReferenceMismatch", graph.issues.map((issue) => issue.code).join(","));
    }
    return {
      kind: "Verified",
      snapshot: Object.freeze({
        kind: "complete-set",
        ref,
        releaseSet,
        members: Object.freeze(members.map(copyReleaseSnapshot)),
      }),
    };
  } catch (error) {
    return mismatch(ref, issueCode(error), errorMessage(error));
  }
}

async function readVerifiedReleaseEnvelope(
  directory: string,
  ref: ReleaseArtifactRef,
): Promise<AgentPluginRelease> {
  const envelopeBytes = await readOwnedRegularFile(
    join(directory, RELEASE_ENVELOPE_FILE),
    0o444,
    MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES,
  );
  const decoded = decodeAgentPluginRelease(envelopeBytes);
  if (!decoded.ok) {
    throw taggedError("MalformedEnvelope", decoded.issues.map((issue) => issue.code).join(","));
  }
  const release = decoded.value;
  if (release.releaseDigest !== ref.releaseDigest || release.artifactDigest !== ref.artifactDigest) {
    throw taggedError("ReferenceMismatch", "release envelope does not match requested release/artifact digests");
  }
  if (!equalBytes(envelopeBytes, canonicalSerializeAgentPluginRelease(release))) {
    throw taggedError("MalformedEnvelope", "release envelope is not canonical");
  }
  return release;
}

async function preflightCompleteSetPayloadBytes(
  root: string,
  releaseSet: AgentPluginReleaseSet,
): Promise<void> {
  let aggregateBytes = 0;
  for (const member of releaseSet.body.members) {
    const ref = createReleaseArtifactRef(member.releaseDigest, member.artifactDigest);
    const directory = releaseArtifactPath(root, member.artifactDigest);
    if (!await pathExists(directory)) {
      throw taggedError("ReferenceMismatch", `complete-set member is missing: ${member.pluginId}`);
    }
    await requireContainedCanonicalDirectory(root, directory);
    const release = await readVerifiedReleaseEnvelope(directory, ref);
    for (const entry of release.artifactBody.payloadEntries) {
      const next = addReleaseSetPayloadBytes(aggregateBytes, entry.byteLength);
      if (!next.ok) {
        throw taggedError(
          "ReferenceMismatch",
          `complete-set payloads exceed ${MAX_RELEASE_SET_PAYLOAD_BYTES} decoded bytes`,
        );
      }
      aggregateBytes = next.value;
    }
  }
}

export function releaseArtifactPath(root: string, digest: ArtifactDigest): string {
  return join(root, "releases", "sha256", digest);
}

export function releaseSetPath(root: string, digest: ReleaseSetDigest): string {
  return join(root, "sets", "sha256", digest);
}

async function readOwnedRegularFile(path: string, mode: number, maximumBytes: number): Promise<Uint8Array> {
  const before = await lstat(path, { bigint: true });
  const canonical = await realpath(path);
  if (!before.isFile() || before.isSymbolicLink()) throw taggedError("InvalidEntryType", `not a regular file: ${path}`);
  if (before.nlink !== 1n) throw taggedError("SharedInode", `file has ${before.nlink} links: ${path}`);
  if (canonical !== resolve(path)) throw taggedError("InvalidEntryType", `file resolves outside its exact path: ${path}`);
  if ((Number(before.mode) & 0o777) !== mode) throw taggedError("ModeMismatch", `file mode differs at ${path}`);
  if (before.size > BigInt(maximumBytes)) throw taggedError("ReadFailure", `file exceeds ${maximumBytes} bytes: ${path}`);

  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat({ bigint: true });
    if (
      opened.dev !== before.dev
      || opened.ino !== before.ino
      || opened.nlink !== 1n
      || !opened.isFile()
      || opened.size !== before.size
      || (Number(opened.mode) & 0o777) !== mode
    ) {
      throw taggedError("InvalidEntryType", `file changed while opening: ${path}`);
    }
    const bytes = await readExactBoundedFile(handle, Number(before.size), path);
    const after = await handle.stat({ bigint: true });
    if (
      after.dev !== opened.dev
      || after.ino !== opened.ino
      || after.nlink !== 1n
      || !after.isFile()
      || after.size !== BigInt(bytes.byteLength)
      || (Number(after.mode) & 0o777) !== mode
    ) {
      throw taggedError("ReadFailure", `file changed while reading: ${path}`);
    }
    const visible = await lstat(path, { bigint: true });
    if (
      visible.dev !== after.dev
      || visible.ino !== after.ino
      || visible.nlink !== 1n
      || !visible.isFile()
      || visible.isSymbolicLink()
      || visible.size !== after.size
      || (Number(visible.mode) & 0o777) !== mode
    ) {
      throw taggedError("ReadFailure", `visible file changed after reading: ${path}`);
    }
    return new Uint8Array(bytes);
  } finally {
    await handle.close();
  }
}

async function readExactBoundedFile(
  handle: Awaited<ReturnType<typeof open>>,
  expectedBytes: number,
  path: string,
): Promise<Uint8Array> {
  const bytes = new Uint8Array(expectedBytes);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const read = await handle.read(bytes, offset, bytes.byteLength - offset, offset);
    if (read.bytesRead === 0) throw taggedError("ReadFailure", `file shrank while reading: ${path}`);
    offset += read.bytesRead;
  }
  const overboundProbe = new Uint8Array(1);
  const probe = await handle.read(overboundProbe, 0, 1, expectedBytes);
  if (probe.bytesRead !== 0) throw taggedError("ReadFailure", `file grew while reading: ${path}`);
  return bytes;
}

async function listDirectoryTree(root: string): Promise<readonly { path: string; kind: "file" | "directory" }[]> {
  const entries: Array<{ path: string; kind: "file" | "directory" }> = [];
  await walk(root, "", entries);
  entries.sort((left, right) => compareCanonicalText(left.path, right.path));
  return entries;
}

async function walk(
  root: string,
  relativeParent: string,
  entries: Array<{ path: string; kind: "file" | "directory" }>,
): Promise<void> {
  const parent = relativeParent === "" ? root : join(root, ...relativeParent.split("/"));
  const directory = await opendir(parent);
  for await (const entry of directory) {
    if (entries.length >= MAX_ARTIFACT_TREE_ENTRIES) {
      throw taggedError("UnexpectedEntry", `artifact tree exceeds ${MAX_ARTIFACT_TREE_ENTRIES} entries`);
    }
    const relativePath = relativeParent === "" ? entry.name : posix.join(relativeParent, entry.name);
    const absolutePath = join(root, ...relativePath.split("/"));
    const status = await lstat(absolutePath);
    if (status.isSymbolicLink()) throw taggedError("InvalidEntryType", `symlink in artifact: ${relativePath}`);
    if (status.isDirectory()) {
      if (await realpath(absolutePath) !== absolutePath) throw taggedError("InvalidEntryType", `aliased directory: ${relativePath}`);
      entries.push({ path: relativePath, kind: "directory" });
      await walk(root, relativePath, entries);
    } else if (status.isFile()) {
      entries.push({ path: relativePath, kind: "file" });
    } else {
      throw taggedError("InvalidEntryType", `special artifact entry: ${relativePath}`);
    }
  }
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

async function requireContainedCanonicalDirectory(root: string, path: string): Promise<void> {
  const normalized = resolve(path);
  if (!isContained(root, normalized)) throw taggedError("InvalidEntryType", `artifact is outside store root: ${path}`);
  await requireCanonicalDirectory(normalized);
}

function isContained(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function addParentDirectories(file: string, expected: Set<string>): void {
  let current = posix.dirname(file);
  while (current !== ".") {
    expected.add(current);
    current = posix.dirname(current);
  }
}

function copyPayloadFile(file: VerifiedPayloadFileV1): VerifiedPayloadFileV1 {
  return Object.freeze({ ...file, bytes: new Uint8Array(file.bytes) });
}

function copyReleaseSnapshot(snapshot: VerifiedReleaseArtifactV1): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    ...snapshot,
    files: Object.freeze(snapshot.files.map(copyPayloadFile)),
  });
}

function mismatch(ref: ArtifactRef, code: ArtifactReadIssue["code"], detail: string): ArtifactReadResult {
  return { kind: "Mismatch", ref, issues: [Object.freeze({ code, detail })] };
}

function taggedError(code: ArtifactReadIssue["code"], message: string): Error & { issueCode: ArtifactReadIssue["code"] } {
  return Object.assign(new Error(message), { issueCode: code });
}

function issueCode(error: unknown): ArtifactReadIssue["code"] {
  return error instanceof Error && "issueCode" in error
    ? error.issueCode as ArtifactReadIssue["code"]
    : error instanceof Error && "code" in error && error.code === "ENOENT"
      ? "MissingEntry"
      : "ReadFailure";
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

function isErrno(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}


function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
