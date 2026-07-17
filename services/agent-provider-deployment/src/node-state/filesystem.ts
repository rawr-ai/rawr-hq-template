import { constants } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { equalBytes } from "../domain/canonical";

export interface NodeRuntimeLayout {
  readonly projection: NodeProjectionLayout;
  readonly targetState: NodeTargetStateLayout;
}

export interface NodeProjectionLayout {
  readonly root: string;
  readonly sources: string;
  readonly marketplaces: string;
  readonly members: string;
  readonly manifests: string;
  readonly temporary: string;
  readonly locks: string;
}

export interface NodeTargetStateLayout {
  readonly root: string;
  readonly receipts: string;
  readonly identities: string;
  readonly temporary: string;
  readonly locks: string;
}

export interface NodeRuntimeRoots {
  readonly providerProjectionRoot: string;
  readonly providerTargetStateRoot: string;
}

export interface ImmutablePublication {
  readonly kind: "existing" | "published";
  readonly path: string;
}

export async function openNodeRuntimeLayout(roots: NodeRuntimeRoots): Promise<NodeRuntimeLayout> {
  const projectionRoot = requireExplicitRoot(roots.providerProjectionRoot, "provider projection root");
  const targetStateRoot = requireExplicitRoot(roots.providerTargetStateRoot, "provider target-state root");
  if (projectionRoot === targetStateRoot || contains(projectionRoot, targetStateRoot) || contains(targetStateRoot, projectionRoot)) {
    throw new Error("Provider projection and target-state roots must be disjoint");
  }

  const projection = Object.freeze({
    root: projectionRoot,
    sources: path.join(projectionRoot, "sources"),
    marketplaces: path.join(projectionRoot, "marketplaces"),
    members: path.join(projectionRoot, "members"),
    manifests: path.join(projectionRoot, "manifests"),
    temporary: path.join(projectionRoot, "temporary"),
    locks: path.join(projectionRoot, "locks"),
  });
  const targetState = Object.freeze({
    root: targetStateRoot,
    receipts: path.join(targetStateRoot, "receipts"),
    identities: path.join(targetStateRoot, "identities"),
    temporary: path.join(targetStateRoot, "temporary"),
    locks: path.join(targetStateRoot, "locks"),
  });
  for (const directory of [...Object.values(projection), ...Object.values(targetState)]) {
    await requireOptionalCanonicalDirectory(directory, "provider runtime directory");
  }
  return Object.freeze({ projection, targetState });
}

export async function publishImmutableFile(
  layout: Pick<NodeProjectionLayout | NodeTargetStateLayout, "temporary">,
  destination: string,
  bytes: Uint8Array,
): Promise<ImmutablePublication> {
  await ensureCanonicalDirectory(path.dirname(destination), "provider state destination");
  await ensureCanonicalDirectory(layout.temporary, "provider state temporary directory");
  const existing = await readOptionalRegularFile(destination);
  if (existing !== null) {
    if (!equalBytes(existing, bytes)) throw new Error("Immutable provider state exists with different bytes");
    return Object.freeze({ kind: "existing", path: destination });
  }

  const temporary = await writeTemporary(layout, bytes);
  try {
    try {
      await link(temporary, destination);
      return Object.freeze({ kind: "published", path: destination });
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
      const winner = await readRequiredRegularFile(destination);
      if (!equalBytes(winner, bytes)) throw new Error("Concurrent provider state publication used different bytes");
      return Object.freeze({ kind: "existing", path: destination });
    }
  } finally {
    await unlinkIfPresent(temporary);
  }
}

export async function replaceFileWhileLocked(
  layout: Pick<NodeProjectionLayout | NodeTargetStateLayout, "temporary">,
  destination: string,
  bytes: Uint8Array,
): Promise<void> {
  await ensureCanonicalDirectory(path.dirname(destination), "provider state destination");
  await ensureCanonicalDirectory(layout.temporary, "provider state temporary directory");
  const temporary = await writeTemporary(layout, bytes);
  try {
    await rename(temporary, destination);
  } finally {
    await unlinkIfPresent(temporary);
  }
}

export async function withExactLock<T>(
  layout: Pick<NodeProjectionLayout | NodeTargetStateLayout, "locks">,
  lockName: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!/^[a-z0-9][a-z0-9._-]{0,191}$/u.test(lockName)) {
    throw new Error("Provider state lock name is invalid");
  }
  await ensureCanonicalDirectory(layout.locks, "provider state lock directory");
  const lockPath = path.join(layout.locks, lockName);
  const handle = await acquireRecoverableLock(lockPath);
  try {
    return await operation();
  } finally {
    await handle.close();
    await unlinkIfPresent(lockPath);
  }
}

async function acquireRecoverableLock(lockPath: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const candidate = await writeLockCandidate(lockPath);
    try {
      await link(candidate, lockPath);
    } catch (error) {
      if (!hasCode(error, "EEXIST") || attempt > 0 || !await removeDeadOwnerLock(lockPath)) throw error;
      continue;
    } finally {
      await unlinkIfPresent(candidate);
    }
    return await open(lockPath, constants.O_RDWR | constants.O_NOFOLLOW);
  }
  throw new Error("Provider state lock could not be acquired");
}

async function writeLockCandidate(lockPath: string): Promise<string> {
  const candidate = path.join(
    path.dirname(lockPath),
    `.${path.basename(lockPath)}.${process.pid}-${randomUUID()}.tmp`,
  );
  const handle = await open(
    candidate,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(`${process.pid}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
  return candidate;
}

async function removeDeadOwnerLock(lockPath: string): Promise<boolean> {
  const handle = await open(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || (before.nlink !== 1n && before.nlink !== 2n)) {
      throw new Error("Provider state lock must be a regular lock publication");
    }
    const ownerText = (await handle.readFile({ encoding: "utf8" })).trim();
    if (ownerText === "") return await removeObservedLock(lockPath, before);
    if (!/^[1-9][0-9]{0,9}$/u.test(ownerText)) throw new Error("Provider state lock owner is invalid");
    if (processIsAlive(Number(ownerText))) return false;
    return await removeObservedLock(lockPath, before);
  } finally {
    await handle.close();
  }
}

async function removeObservedLock(
  lockPath: string,
  observed: Readonly<{ dev: bigint; ino: bigint }>,
): Promise<boolean> {
  const current = await lstat(lockPath, { bigint: true });
  if (current.dev !== observed.dev || current.ino !== observed.ino) return false;
  await unlink(lockPath);
  return true;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (hasCode(error, "ESRCH")) return false;
    if (hasCode(error, "EPERM")) return true;
    throw error;
  }
}

export async function readOptionalRegularFile(filePath: string): Promise<Uint8Array | null> {
  let status;
  try {
    status = await lstat(filePath, { bigint: true });
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    throw error;
  }
  if (!status.isFile() || status.isSymbolicLink() || status.nlink !== 1n) {
    throw new Error("Provider state path must be one non-linked regular file");
  }
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (!sameFile(before, after)) throw new Error("Provider state file changed while being read");
    return bytes;
  } finally {
    await handle.close();
  }
}

export async function readRequiredRegularFile(filePath: string): Promise<Uint8Array> {
  const bytes = await readOptionalRegularFile(filePath);
  if (bytes === null) throw new Error("Required provider state file is missing");
  return bytes;
}

export async function unlinkExactFile(filePath: string): Promise<void> {
  const status = await lstat(filePath, { bigint: true });
  if (!status.isFile() || status.isSymbolicLink() || status.nlink !== 1n) {
    throw new Error("Provider state removal requires one non-linked regular file");
  }
  await unlink(filePath);
}

export function isMissing(error: unknown): boolean {
  return hasCode(error, "ENOENT");
}

async function writeTemporary(
  layout: Pick<NodeProjectionLayout | NodeTargetStateLayout, "temporary">,
  bytes: Uint8Array,
): Promise<string> {
  const temporary = path.join(layout.temporary, `${process.pid}-${randomUUID()}.tmp`);
  const handle = await open(
    temporary,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  return temporary;
}

function requireExplicitRoot(root: string, label: string): string {
  const normalized = path.resolve(root);
  if (!path.isAbsolute(root) || normalized !== root || normalized === path.parse(normalized).root) {
    throw new Error(`${label} must be an explicit canonical non-root absolute path`);
  }
  return normalized;
}

function contains(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

async function requireCanonicalDirectory(directory: string, label: string): Promise<void> {
  const status = await lstat(directory, { bigint: true });
  if (!status.isDirectory() || status.isSymbolicLink() || await realpath(directory) !== directory) {
    throw new Error(`${label} must be a canonical non-symlink directory`);
  }
}

async function requireOptionalCanonicalDirectory(directory: string, label: string): Promise<void> {
  try {
    await requireCanonicalDirectory(directory, label);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
}

export async function ensureCanonicalDirectory(directory: string, label: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await requireCanonicalDirectory(directory, label);
}

async function unlinkIfPresent(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
  }
}

function sameFile(
  left: Readonly<{ dev: bigint; ino: bigint; size: bigint; mtimeNs: bigint }>,
  right: Readonly<{ dev: bigint; ino: bigint; size: bigint; mtimeNs: bigint }>,
): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs;
}

function hasCode(error: unknown, code: string): boolean {
  return error !== null
    && typeof error === "object"
    && "code" in error
    && error.code === code;
}
