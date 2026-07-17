import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  opendir,
  realpath,
  rmdir,
  unlink,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const STAGING_PARENT_NAME = ".staging";
const STAGING_PREFIX = ".agent-plugin-release-lifecycle-";
const ownedEntriesSymbol: unique symbol = Symbol("ownedPrivateStagingEntries");

interface OwnedStagingEntry {
  readonly path: string;
  readonly kind: "file" | "directory";
  readonly dev: bigint;
  readonly ino: bigint;
}

export type OwnedPrivateStagingRoot = Readonly<{
  path: string;
  parent: string;
  basename: string;
  parentDev: bigint;
  parentIno: bigint;
  dev: bigint;
  ino: bigint;
  [ownedEntriesSymbol]: Map<string, OwnedStagingEntry>;
}>;

export async function createPrivateStagingRoot(artifactStoreRoot: string): Promise<OwnedPrivateStagingRoot> {
  const canonicalStoreRoot = await requireCanonicalDirectory(artifactStoreRoot, "artifact store root");
  const stagingParent = join(canonicalStoreRoot, STAGING_PARENT_NAME);
  await ensureDirectChildDirectory(canonicalStoreRoot, stagingParent);
  const stagingParentStatus = await lstat(stagingParent, { bigint: true });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidateBasename = `${STAGING_PREFIX}${randomUUID()}`;
    const candidate = join(stagingParent, candidateBasename);
    try {
      await mkdir(candidate, { mode: 0o700 });
    } catch (error) {
      if (isErrno(error, "EEXIST")) continue;
      throw error;
    }
    const status = await lstat(candidate, { bigint: true });
    const canonicalCandidate = await realpath(candidate);
    if (
      !status.isDirectory()
      || status.isSymbolicLink()
      || canonicalCandidate !== candidate
      || dirname(candidate) !== stagingParent
      || basename(candidate) !== candidateBasename
      || !candidateBasename.startsWith(STAGING_PREFIX)
    ) {
      throw new Error(`private staging root failed its creation proof: ${candidate}`);
    }
    return Object.freeze({
      path: candidate,
      parent: stagingParent,
      basename: candidateBasename,
      parentDev: stagingParentStatus.dev,
      parentIno: stagingParentStatus.ino,
      dev: status.dev,
      ino: status.ino,
      [ownedEntriesSymbol]: new Map<string, OwnedStagingEntry>(),
    });
  }
  throw new Error("unable to allocate an exclusive private staging root");
}

export async function registerPrivateStagingEntry(
  staging: OwnedPrivateStagingRoot,
  path: string,
  kind: OwnedStagingEntry["kind"],
  createdByOperation: boolean,
): Promise<void> {
  const canonicalPath = requireContainedEntryPath(staging, path);
  const status = await lstat(canonicalPath, { bigint: true });
  const resolved = await realpath(canonicalPath);
  if (
    status.isSymbolicLink()
    || resolved !== canonicalPath
    || (kind === "file" && (!status.isFile() || status.nlink !== 1n))
    || (kind === "directory" && !status.isDirectory())
  ) {
    throw new Error(`private staging entry failed ownership proof: ${canonicalPath}`);
  }
  const existing = staging[ownedEntriesSymbol].get(canonicalPath);
  if (!createdByOperation && existing === undefined) {
    throw new Error(`unregistered entry appeared in private staging: ${canonicalPath}`);
  }
  if (existing !== undefined) {
    if (existing.kind !== kind || existing.dev !== status.dev || existing.ino !== status.ino) {
      throw new Error(`registered private staging entry changed identity: ${canonicalPath}`);
    }
    return;
  }
  staging[ownedEntriesSymbol].set(canonicalPath, Object.freeze({
    path: canonicalPath,
    kind,
    dev: status.dev,
    ino: status.ino,
  }));
}

export async function removePrivateStagingRoot(staging: OwnedPrivateStagingRoot): Promise<void> {
  await verifyRootAdmission(staging);
  const observed: OwnedStagingEntry[] = [];
  await inspectOwnedTree(staging, staging.path, observed);
  if (observed.length !== staging[ownedEntriesSymbol].size) {
    throw new Error("private staging ownership ledger differs from its visible tree");
  }

  const files = observed.filter((entry) => entry.kind === "file");
  for (const file of files) await unlinkOwnedFile(file);

  const directories = observed
    .filter((entry) => entry.kind === "directory")
    .sort((left, right) => right.path.split(sep).length - left.path.split(sep).length);
  for (const directory of directories) await removeOwnedDirectory(directory);

  await verifyRootAdmission(staging);
  const remaining = await opendir(staging.path);
  let hasRemainingEntry = false;
  for await (const _entry of remaining) {
    hasRemainingEntry = true;
    break;
  }
  if (hasRemainingEntry) throw new Error("private staging root is not empty after owned cleanup");
  await rmdir(staging.path);
}

async function inspectOwnedTree(
  staging: OwnedPrivateStagingRoot,
  directoryPath: string,
  observed: OwnedStagingEntry[],
): Promise<void> {
  const directory = await opendir(directoryPath);
  for await (const entry of directory) {
    const path = join(directoryPath, entry.name);
    const owned = staging[ownedEntriesSymbol].get(path);
    if (owned === undefined) throw new Error(`unexpected entry in private staging: ${path}`);
    await verifyOwnedEntry(owned);
    observed.push(owned);
    if (owned.kind === "directory") await inspectOwnedTree(staging, path, observed);
  }
}

async function unlinkOwnedFile(entry: OwnedStagingEntry): Promise<void> {
  await verifyOwnedEntry(entry);
  const handle = await open(entry.path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const status = await handle.stat({ bigint: true });
    if (!status.isFile() || status.nlink !== 1n || status.dev !== entry.dev || status.ino !== entry.ino) {
      throw new Error(`private staging file changed before unlink: ${entry.path}`);
    }
  } finally {
    await handle.close();
  }
  await verifyOwnedEntry(entry);
  await unlink(entry.path);
}

async function removeOwnedDirectory(entry: OwnedStagingEntry): Promise<void> {
  await verifyOwnedEntry(entry);
  const directory = await opendir(entry.path);
  let nonempty = false;
  for await (const _child of directory) {
    nonempty = true;
    break;
  }
  if (nonempty) throw new Error(`private staging directory is not empty: ${entry.path}`);
  await verifyOwnedEntry(entry);
  await rmdir(entry.path);
}

async function verifyOwnedEntry(entry: OwnedStagingEntry): Promise<void> {
  const status = await lstat(entry.path, { bigint: true });
  const canonical = await realpath(entry.path);
  if (
    status.isSymbolicLink()
    || canonical !== entry.path
    || status.dev !== entry.dev
    || status.ino !== entry.ino
    || (entry.kind === "file" && (!status.isFile() || status.nlink !== 1n))
    || (entry.kind === "directory" && !status.isDirectory())
  ) {
    throw new Error(`private staging entry changed before cleanup: ${entry.path}`);
  }
}

async function verifyRootAdmission(staging: OwnedPrivateStagingRoot): Promise<void> {
  const canonicalParent = await requireCanonicalDirectory(staging.parent, "private staging parent");
  const parentStatus = await lstat(staging.parent, { bigint: true });
  const candidate = resolve(staging.path);
  const status = await lstat(candidate, { bigint: true });
  const canonicalCandidate = await realpath(candidate);
  if (
    canonicalParent !== staging.parent
    || !parentStatus.isDirectory()
    || parentStatus.isSymbolicLink()
    || parentStatus.dev !== staging.parentDev
    || parentStatus.ino !== staging.parentIno
    || dirname(candidate) !== canonicalParent
    || basename(candidate) !== staging.basename
    || !staging.basename.startsWith(STAGING_PREFIX)
    || !status.isDirectory()
    || status.isSymbolicLink()
    || status.dev !== staging.dev
    || status.ino !== staging.ino
    || canonicalCandidate !== candidate
  ) {
    throw new Error(`refusing to clean substituted private staging root: ${candidate}`);
  }
}

function requireContainedEntryPath(staging: OwnedPrivateStagingRoot, path: string): string {
  const normalized = resolve(path);
  const rel = relative(staging.path, normalized);
  if (path !== normalized || rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`private staging entry is outside its operation root: ${path}`);
  }
  return normalized;
}

async function ensureDirectChildDirectory(parent: string, candidate: string): Promise<void> {
  if (dirname(candidate) !== parent || basename(candidate) !== STAGING_PARENT_NAME) {
    throw new Error(`invalid private staging parent: ${candidate}`);
  }
  try {
    await mkdir(candidate, { mode: 0o700 });
  } catch (error) {
    if (!isErrno(error, "EEXIST")) throw error;
  }
  await requireCanonicalDirectory(candidate, "private staging parent");
}

async function requireCanonicalDirectory(path: string, label: string): Promise<string> {
  const normalized = resolve(path);
  const status = await lstat(normalized);
  const canonical = await realpath(normalized);
  if (!status.isDirectory() || status.isSymbolicLink() || canonical !== normalized) {
    throw new Error(`${label} must be a canonical non-symlink directory: ${path}`);
  }
  return canonical;
}

function isErrno(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
