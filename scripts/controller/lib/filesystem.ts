import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolveStream, rejectStream) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", rejectStream);
    stream.on("end", resolveStream);
  });
  return hash.digest("hex");
}

export function assertAbsolutePath(path: string, label: string): void {
  if (!isAbsolute(path)) {
    throw new Error(`${label} must be absolute: ${path}`);
  }
}

export function assertContainedPath(root: string, candidate: string, label: string): void {
  const offset = relative(root, candidate);
  if (offset === "" || offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`${label} must be strictly inside ${root}: ${candidate}`);
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

async function assertCanonicalDirectory(path: string, label: string): Promise<void> {
  const status = await lstat(path);
  if (!status.isDirectory() || status.isSymbolicLink()) {
    throw new Error(`${label} must be a canonical directory: ${path}`);
  }
  const canonical = await realpath(path);
  if (canonical !== path) {
    throw new Error(`${label} must not traverse an aliased parent: ${path} -> ${canonical}`);
  }
}

function containedParentSegments(
  root: string,
  candidate: string,
  label: string
): readonly string[] {
  assertAbsolutePath(root, `${label} root`);
  assertAbsolutePath(candidate, label);
  const normalizedRoot = resolve(root);
  const normalizedCandidate = resolve(candidate);
  assertContainedPath(normalizedRoot, normalizedCandidate, label);
  const parentOffset = relative(normalizedRoot, dirname(normalizedCandidate));
  if (parentOffset === "") return Object.freeze([]);
  if (parentOffset === ".." || parentOffset.startsWith(`..${sep}`) || isAbsolute(parentOffset)) {
    throw new Error(`${label} parent must remain inside ${normalizedRoot}: ${candidate}`);
  }
  return Object.freeze(parentOffset.split(sep));
}

export async function assertCanonicalContainedParent(
  root: string,
  candidate: string,
  label: string
): Promise<void> {
  const normalizedRoot = resolve(root);
  await assertCanonicalDirectory(normalizedRoot, `${label} root`);
  const segments = containedParentSegments(normalizedRoot, candidate, label);
  let cursor = normalizedRoot;
  for (const segment of segments) {
    cursor = join(cursor, segment);
    try {
      await assertCanonicalDirectory(cursor, `${label} parent`);
    } catch (error) {
      if (errorCode(error) === "ENOENT") return;
      throw error;
    }
  }
}

export async function ensureCanonicalContainedDirectory(
  root: string,
  directory: string,
  label: string
): Promise<void> {
  const normalizedRoot = resolve(root);
  const normalizedDirectory = resolve(directory);
  await assertCanonicalDirectory(normalizedRoot, `${label} root`);
  assertContainedPath(normalizedRoot, normalizedDirectory, label);
  const offset = relative(normalizedRoot, normalizedDirectory);
  let cursor = normalizedRoot;
  for (const segment of offset.split(sep)) {
    cursor = join(cursor, segment);
    try {
      await mkdir(cursor);
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
    }
    await assertCanonicalDirectory(cursor, `${label} directory`);
  }
}

export async function removeCanonicalDirectChildDirectory(
  parent: string,
  candidate: string,
  expectedName: string,
  label: string
): Promise<void> {
  const normalizedParent = resolve(parent);
  const normalizedCandidate = resolve(candidate);
  await assertCanonicalDirectory(normalizedParent, `${label} parent`);
  if (
    dirname(normalizedCandidate) !== normalizedParent ||
    basename(normalizedCandidate) !== expectedName
  ) {
    throw new Error(`${label} must be the expected direct child of ${normalizedParent}`);
  }
  assertContainedPath(normalizedParent, normalizedCandidate, label);
  try {
    const status = await lstat(normalizedCandidate);
    if (!status.isDirectory() || status.isSymbolicLink()) {
      throw new Error(`${label} must be a non-aliased directory: ${normalizedCandidate}`);
    }
    const canonical = await realpath(normalizedCandidate);
    if (canonical !== normalizedCandidate) {
      throw new Error(`${label} must be canonical: ${normalizedCandidate} -> ${canonical}`);
    }
  } catch (error) {
    if (errorCode(error) === "ENOENT") return;
    throw error;
  }
  await rm(normalizedCandidate, { recursive: true });
}

export async function resolveContainedFile(
  root: string,
  releaseRelativePath: string,
  label: string
): Promise<string> {
  assertAbsolutePath(root, "containment root");
  const rootRealpath = await realpath(root);
  const candidate = resolve(rootRealpath, releaseRelativePath);
  assertContainedPath(rootRealpath, candidate, label);
  const candidateRealpath = await realpath(candidate);
  assertContainedPath(rootRealpath, candidateRealpath, label);
  const status = await lstat(candidateRealpath);
  if (!status.isFile()) {
    throw new Error(`${label} must resolve to a regular file: ${candidateRealpath}`);
  }
  return candidateRealpath;
}

export async function fsyncDirectory(path: string): Promise<void> {
  const handle = await open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export type AtomicWritePhase =
  | "temporary-created"
  | "temporary-written"
  | "temporary-flushed"
  | "before-replace"
  | "after-replace";

export type AtomicWriteObserver = (phase: AtomicWritePhase) => void | Promise<void>;

export type AtomicWriteResult =
  | Readonly<{ durability: "confirmed" }>
  | Readonly<{ durability: "unconfirmed"; postCommitError: unknown }>;

export async function atomicWriteFile(
  containmentRoot: string,
  destination: string,
  bytes: Uint8Array,
  mode = 0o600,
  observe?: AtomicWriteObserver
): Promise<AtomicWriteResult> {
  const parent = dirname(destination);
  await ensureCanonicalContainedDirectory(containmentRoot, parent, "atomic write destination");
  const temporary = `${destination}.tmp-${process.pid}-${randomUUID()}`;
  let temporaryExists = false;
  let result: AtomicWriteResult | undefined;
  let primaryError: unknown;
  try {
    const handle = await open(temporary, "wx", mode);
    temporaryExists = true;
    let handlePrimaryError: unknown;
    try {
      await observe?.("temporary-created");
      await handle.writeFile(bytes);
      await observe?.("temporary-written");
      await handle.chmod(mode);
      await handle.sync();
      await observe?.("temporary-flushed");
    } catch (error) {
      handlePrimaryError = error;
    }
    let handleCloseError: unknown;
    try {
      await handle.close();
    } catch (error) {
      handleCloseError = error;
    }
    if (handlePrimaryError !== undefined && handleCloseError !== undefined) {
      throw new AggregateError(
        [handlePrimaryError, handleCloseError],
        "atomic write failed and temporary handle close also failed"
      );
    }
    if (handlePrimaryError !== undefined) throw handlePrimaryError;
    if (handleCloseError !== undefined) throw handleCloseError;
    await observe?.("before-replace");
    await rename(temporary, destination);
    temporaryExists = false;
    try {
      await observe?.("after-replace");
      await fsyncDirectory(parent);
      result = Object.freeze({ durability: "confirmed" });
    } catch (postCommitError) {
      result = Object.freeze({ durability: "unconfirmed", postCommitError });
    }
  } catch (error) {
    primaryError = error;
  }
  let cleanupError: unknown;
  if (temporaryExists) {
    try {
      await rm(temporary, { force: true });
    } catch (error) {
      cleanupError = error;
    }
  }
  if (primaryError !== undefined && cleanupError !== undefined) {
    throw new AggregateError(
      [primaryError, cleanupError],
      "atomic write failed and temporary cleanup also failed"
    );
  }
  if (primaryError !== undefined) throw primaryError;
  if (cleanupError !== undefined) throw cleanupError;
  if (result === undefined) throw new Error("atomic write completed without a settlement");
  return result;
}

export async function makeExecutable(path: string): Promise<void> {
  await chmod(path, 0o755);
}
