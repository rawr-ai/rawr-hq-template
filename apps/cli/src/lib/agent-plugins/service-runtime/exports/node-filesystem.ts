import { Buffer } from "node:buffer";
import { constants, type BigIntStats, type Dir } from "node:fs";
import {
  type FileHandle,
  link,
  lstat,
  mkdir,
  open,
  opendir,
  realpath,
  rename,
  rmdir,
  unlink,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  posix,
  relative,
  resolve,
  sep,
} from "node:path";

import {
  compareCanonicalText,
  contentDigest,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  ExportFilesystemError,
  bytesEqual,
  failure,
  toFilesystemError,
  visibleDirectoryMode,
  visibleFileMode,
  type ExportFailureCode,
  type ExportFailure,
  type CapturedDirectory,
  type CapturedDirectoryComponent,
  type CapturedParentChain,
  type CapturedPath,
  type CapturedRegularFile,
  type DestinationIdentity,
  type EntryIdentity,
} from "@rawr/agent-plugin-lifecycle/ports/exports";

export {
  ExportFilesystemError,
  failure,
  toFilesystemError,
  visibleDirectoryMode,
  visibleFileMode,
};
export type {
  CapturedDirectory,
  CapturedDirectoryComponent,
  CapturedParentChain,
  CapturedPath,
  CapturedRegularFile,
  DestinationIdentity,
  EntryIdentity,
};

export const PAYLOAD_TEMP_PREFIX = ".rawr-export-payload-tmp-v1-";
export const LEDGER_TEMP_PREFIX = ".rawr-export-ledger-tmp-v1-";
export const MAX_CAPTURED_PAYLOAD_BYTES = 64 * 1024 * 1024;
export const MAX_EXPORT_LEDGER_BYTES = 32 * 1024 * 1024;

const FILE_TYPE_MASK = 0o170000n;
const REGULAR_FILE_TYPE = 0o100000n;
const OPERATION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{7,95}$/u;

export interface OpenedTemporary {
  readonly path: string;
  readonly parentPath: string;
  readonly prefix: string;
  readonly handle: FileHandle;
  readonly parentChain: CapturedParentChain;
}

export interface OwnedTemporary extends EntryIdentity {
  readonly path: string;
  readonly parentPath: string;
  readonly prefix: string;
  readonly mode: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
  readonly parentChain: CapturedParentChain;
}

export interface PublishedFileIdentity extends EntryIdentity {
  readonly path: string;
  readonly mode: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
  readonly parentChain: CapturedParentChain;
}

export type CommitMutationPhase = "TargetPublication" | "TemporaryFinalization";
export type BeforeFinalMutation = () => Promise<void>;

export async function captureDestination(input: string): Promise<DestinationIdentity> {
  if (!isCanonicalAbsolutePath(input)) {
    throw operationFailure("DestinationUnsafe", "destination", "Destination must be an absolute canonical path", input);
  }
  const stats = await safePhase("DestinationUnsafe", "destination-lstat", input, () => lstat(input, { bigint: true }));
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw operationFailure("DestinationUnsafe", "destination-lstat", "Destination must be a non-symlink directory", input);
  }
  const resolved = await safePhase("DestinationUnsafe", "destination-realpath", input, () => realpath(input));
  if (resolved !== input) throw operationFailure("DestinationUnsafe", "destination-realpath", "Destination resolves through an alias", input);
  return Object.freeze({ path: input, dev: stats.dev, ino: stats.ino });
}

export async function revalidateDestination(destination: DestinationIdentity): Promise<void> {
  const stats = await safePhase("DestinationUnsafe", "destination-revalidate", destination.path, () => lstat(destination.path, { bigint: true }));
  if (!stats.isDirectory() || stats.isSymbolicLink() || !sameIdentity(destination, stats)) {
    throw operationFailure("DestinationUnsafe", "destination-revalidate", "Destination identity changed", destination.path);
  }
  const resolved = await safePhase("DestinationUnsafe", "destination-revalidate-realpath", destination.path, () => realpath(destination.path));
  if (resolved !== destination.path) throw operationFailure("DestinationUnsafe", "destination-revalidate-realpath", "Destination became aliased", destination.path);
}

export async function capturePath(
  destination: DestinationIdentity,
  relativePath: string,
  maximumReadableBytes = MAX_CAPTURED_PAYLOAD_BYTES,
): Promise<CapturedPath> {
  const absolute = containedPath(destination.path, relativePath);
  const parentRelative = posix.dirname(relativePath);
  const inspection = await inspectDirectoryChain(destination, parentRelative === "." ? [] : parentRelative.split("/"));
  if (inspection.missingDirectories.length > 0) return Object.freeze({
    kind: "Absent",
    path: absolute,
    missingDirectories: inspection.missingDirectories,
    parentChain: inspection.parentChain,
  });
  const stats = await lstatIfPresent(absolute);
  if (stats === undefined) return Object.freeze({
    kind: "Absent",
    path: absolute,
    missingDirectories: Object.freeze([]),
    parentChain: inspection.parentChain,
  });
  return Object.freeze({
    kind: "Present",
    file: await captureRegularFile(destination, absolute, stats, maximumReadableBytes, inspection.parentChain),
    missingDirectories: Object.freeze([]),
    parentChain: inspection.parentChain,
  });
}

export async function captureDirectFile(
  destination: DestinationIdentity,
  filename: string,
  maximumReadableBytes = MAX_EXPORT_LEDGER_BYTES,
): Promise<CapturedPath> {
  if (basename(filename) !== filename || filename.length === 0) {
    throw operationFailure("PathUnsafe", "direct-file", "Direct file name is unsafe", filename);
  }
  return capturePath(destination, filename, maximumReadableBytes);
}

export async function revalidateCapturedPath(captured: CapturedPath): Promise<void> {
  await revalidateParentChainStable(captured.parentChain);
  if (captured.kind === "Absent") {
    const current = await lstatIfPresent(captured.path);
    if (current !== undefined) throw operationFailure("PathChanged", "path-revalidate", "Absent path became occupied", captured.path);
    return;
  }
  await revalidateCapturedFile(captured.file);
}

export async function revalidateCapturedFile(file: CapturedRegularFile): Promise<void> {
  await revalidateParentChainStable(file.parentChain);
  const stats = await safePhase("PathChanged", "file-revalidate", file.path, () => lstat(file.path, { bigint: true }));
  assertCapturedRegular(file, stats, "PathChanged", "file-revalidate");
  const resolved = await safePhase("PathChanged", "file-revalidate-realpath", file.path, () => realpath(file.path));
  if (resolved !== file.path) throw operationFailure("PathChanged", "file-revalidate-realpath", "Captured file became aliased", file.path);
  const current = await readOwnedFile(file, file.bytes.byteLength, "PathChanged", "file-revalidate-read");
  if (!bytesEqual(current, file.bytes)) throw operationFailure("PathChanged", "file-revalidate-bytes", "Captured file bytes changed", file.path);
  const finalResolved = await safePhase("PathChanged", "file-revalidate-final-realpath", file.path, () => realpath(file.path));
  const finalStats = await safePhase("PathChanged", "file-revalidate-final-entry", file.path, () => lstat(file.path, { bigint: true }));
  if (finalResolved !== file.path) throw operationFailure("PathChanged", "file-revalidate-final-realpath", "Captured file became aliased after reading", file.path);
  assertCapturedRegular(file, finalStats, "PathChanged", "file-revalidate-final-entry");
  await revalidateParentChainStable(file.parentChain);
}

export async function ensureDirectories(
  destination: DestinationIdentity,
  relativeDirectories: readonly string[],
  mode = 0o755,
): Promise<readonly CapturedDirectory[]> {
  const created: CapturedDirectory[] = [];
  const sorted = [...new Set(relativeDirectories)].sort((left, right) => depth(left) - depth(right) || compareCanonicalText(left, right));
  for (const relativeDirectory of sorted) {
    const absolute = containedPath(destination.path, relativeDirectory);
    const existing = await lstatIfPresent(absolute);
    if (existing !== undefined) {
      throw operationFailure("PathChanged", "directory-create", "Planned-absent directory became occupied", absolute);
    }
    const parent = dirname(absolute);
    const parentChain = await captureParentChain(destination, parent);
    const mutationParent = await prepareMutationParent(destination, parentChain, parent);
    if (await lstatIfPresent(absolute) !== undefined) {
      throw operationFailure("PathChanged", "directory-create", "Planned-absent directory became occupied at final admission", absolute);
    }
    await safePhase("MutationFailed", "directory-create", absolute, () => mkdir(absolute, { mode: 0o755 }));
    const initial = await safePhase("VerificationFailed", "directory-create-verify", absolute, () => lstat(absolute, { bigint: true }));
    await assertDirectory(destination, absolute, initial);
    const handle = await safePhase("VerificationFailed", "directory-create-open", absolute, () => open(
      absolute,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    ));
    try {
      const opened = await handle.stat({ bigint: true });
      if (!opened.isDirectory() || !sameIdentity({ dev: initial.dev, ino: initial.ino }, opened)) {
        throw operationFailure("PathChanged", "directory-create-open", "Created directory changed before mode normalization", absolute);
      }
      await handle.chmod(mode);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const stats = await safePhase("VerificationFailed", "directory-create-final", absolute, () => lstat(absolute, { bigint: true }));
    await assertDirectory(destination, absolute, stats);
    if (!sameIdentity({ dev: initial.dev, ino: initial.ino }, stats) || (stats.mode & 0o777n) !== BigInt(mode)) {
      throw operationFailure("VerificationFailed", "directory-create-final", "Created directory identity or mode changed", absolute);
    }
    const captured = captureDirectory(destination.path, relativeDirectory, stats, parentChain);
    await revalidateCapturedDirectory(destination, captured);
    const parentIdentity = mutationParent[mutationParent.length - 1]!;
    await flushDirectory(parent, { dev: parentIdentity.dev, ino: parentIdentity.ino });
    created.push(captured);
  }
  return Object.freeze(created);
}

export async function revalidateCapturedDirectory(
  destination: DestinationIdentity,
  directory: CapturedDirectory,
): Promise<void> {
  await revalidateParentChainStable(directory.parentChain);
  const stats = await safePhase("PathChanged", "directory-revalidate", directory.path, () => lstat(directory.path, { bigint: true }));
  await assertDirectory(destination, directory.path, stats);
  if (!sameCapturedDirectory(directory, stats)) {
    throw operationFailure("PathChanged", "directory-revalidate", "Captured directory identity or metadata changed", directory.path);
  }
}

export async function captureExistingDirectory(
  destination: DestinationIdentity,
  relativePath: string,
): Promise<CapturedDirectory> {
  const path = containedPath(destination.path, relativePath);
  const parentChain = await captureParentChain(destination, dirname(path));
  const stats = await safePhase("PathUnsafe", "directory-capture", path, () => lstat(path, { bigint: true }));
  await assertDirectory(destination, path, stats);
  const captured = captureDirectory(destination.path, relativePath, stats, parentChain);
  await revalidateCapturedDirectory(destination, captured);
  return captured;
}

export async function captureEmptyDirectory(
  destination: DestinationIdentity,
  relativePath: string,
): Promise<CapturedDirectory | undefined> {
  const path = containedPath(destination.path, relativePath);
  const stats = await lstatIfPresent(path);
  if (stats === undefined) return undefined;
  const parentChain = await captureParentChain(destination, dirname(path));
  await assertDirectory(destination, path, stats);
  const directory = captureDirectory(destination.path, relativePath, stats, parentChain);
  const stream = await opendir(directory.path);
  let nonempty = false;
  try {
    nonempty = (await stream.read()) !== null;
  } finally {
    await closeDirectory(stream);
  }
  if (nonempty) return undefined;
  await revalidateCapturedDirectory(destination, directory);
  return directory;
}

export async function listCapturedDirectoryEntries(
  destination: DestinationIdentity,
  directory: CapturedDirectory,
  maximumEntries = 65_536,
): Promise<readonly string[]> {
  await revalidateCapturedDirectory(destination, directory);
  const stream = await opendir(directory.path);
  const names: string[] = [];
  try {
    for await (const entry of stream) {
      if (basename(entry.name) !== entry.name || entry.name === "." || entry.name === "..") {
        throw operationFailure("PathUnsafe", "directory-list", "Directory contains an unsafe entry name", directory.path);
      }
      names.push(entry.name);
      if (names.length > maximumEntries) {
        throw operationFailure("PathUnsafe", "directory-list", "Directory entry count exceeds its practical bound", directory.path);
      }
    }
  } finally {
    await closeDirectory(stream);
  }
  await revalidateCapturedDirectory(destination, directory);
  return Object.freeze(names.sort(compareCanonicalText));
}

export async function removeCapturedEmptyDirectory(
  destination: DestinationIdentity,
  directory: CapturedDirectory,
  beforeFinalMutation?: BeforeFinalMutation,
): Promise<void> {
  await revalidateCapturedDirectory(destination, directory);
  const parentPath = dirname(directory.path);
  await prepareMutationParent(destination, directory.parentChain, parentPath);
  if (beforeFinalMutation !== undefined) await beforeFinalMutation();
  const parentChain = await prepareMutationParent(destination, directory.parentChain, parentPath);
  const stream = await safePhase("PathChanged", "directory-retire-open", directory.path, () => opendir(directory.path));
  try {
    if ((await stream.read()) !== null) {
      throw operationFailure("PathChanged", "directory-retire", "Captured directory is no longer empty", directory.path);
    }
    const [immediate, resolved] = await Promise.all([
      lstat(directory.path, { bigint: true }),
      realpath(directory.path),
    ]);
    if (resolved !== directory.path || !sameCapturedDirectory(directory, immediate)) {
      throw operationFailure("PathChanged", "directory-retire", "Captured directory changed before nonrecursive removal", directory.path);
    }
    await safePhase("MutationFailed", "directory-retire", directory.path, () => rmdir(directory.path));
  } finally {
    await closeDirectory(stream);
  }
  const parentIdentity = parentChain[parentChain.length - 1]!;
  await flushDirectory(parentPath, parentIdentity);
}

export async function verifyPathAbsent(
  destination: DestinationIdentity,
  relativePath: string,
  expectedParentChain: CapturedParentChain,
): Promise<void> {
  const path = containedPath(destination.path, relativePath);
  const parentPath = dirname(path);
  await prepareMutationParent(destination, expectedParentChain, parentPath);
  const [entry, resolvedParent] = await Promise.all([
    lstatIfPresent(path),
    realpath(parentPath),
  ]);
  if (resolvedParent !== parentPath) {
    throw operationFailure("VerificationFailed", "path-absent", "Path parent became aliased while verifying absence", parentPath);
  }
  if (entry !== undefined) {
    throw operationFailure("VerificationFailed", "path-absent", "Path expected absent is occupied", path);
  }
}

export async function openPrivateTemporary(
  destination: DestinationIdentity,
  targetPath: string,
  prefix: string,
  operationId: string,
): Promise<OpenedTemporary> {
  const parentPath = dirname(targetPath);
  const parentChain = await captureParentChain(destination, parentPath);
  if (!OPERATION_ID_PATTERN.test(operationId)) {
    throw operationFailure("TemporaryCreateFailed", "temporary-name", "Operation ID is unsafe");
  }
  const temporaryPath = join(parentPath, `${prefix}${operationId}`);
  assertPrivateDirectChild(parentPath, temporaryPath, prefix);
  await prepareMutationParent(destination, parentChain, parentPath);
  const handle = await safePhase("TemporaryCreateFailed", "temporary-create", temporaryPath, () => open(
    temporaryPath,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  ));
  return Object.freeze({ path: temporaryPath, parentPath, prefix, handle, parentChain });
}

export async function captureOpenedTemporary(
  destination: DestinationIdentity,
  opened: OpenedTemporary,
  expectedIdentity?: EntryIdentity,
): Promise<OwnedTemporary> {
  const stats = await safePhase("TemporaryCreateFailed", "temporary-capture", opened.path, () => opened.handle.stat({ bigint: true }));
  if (!safeRegular(stats) || stats.dev !== destination.dev || (expectedIdentity !== undefined && !sameIdentity(expectedIdentity, stats))) {
    throw operationFailure("TemporaryCreateFailed", "temporary-capture", "Temporary is not one owned same-filesystem regular file", opened.path);
  }
  await revalidateParentChainExact(opened.parentChain);
  const visible = await safePhase("TemporaryCreateFailed", "temporary-visible-capture", opened.path, () => lstat(opened.path, { bigint: true }));
  if (!safeRegular(visible) || !sameIdentity(stats, visible) || await realpath(opened.path) !== opened.path) {
    throw operationFailure("TemporaryCreateFailed", "temporary-visible-capture", "Opened temporary is not its exact canonical visible entry", opened.path);
  }
  return captureTemporary(opened, stats);
}

export async function writeOpenedTemporary(
  destination: DestinationIdentity,
  opened: OpenedTemporary,
  initial: OwnedTemporary,
  bytes: Uint8Array,
  mode: number,
): Promise<OwnedTemporary> {
  if (bytes.byteLength > MAX_CAPTURED_PAYLOAD_BYTES && opened.prefix === PAYLOAD_TEMP_PREFIX) {
    throw operationFailure("TemporaryWriteFailed", "temporary-size", "Payload temporary exceeds its bounded file size", opened.path);
  }
  await revalidateParentChainExact(initial.parentChain);
  await safePhase("TemporaryWriteFailed", "temporary-write", opened.path, () => opened.handle.writeFile(bytes));
  await revalidateParentChainExact(initial.parentChain);
  await safePhase("TemporaryWriteFailed", "temporary-mode", opened.path, () => opened.handle.chmod(mode));
  await safePhase("TemporaryWriteFailed", "temporary-flush", opened.path, () => opened.handle.sync());
  const stats = await safePhase("TemporaryWriteFailed", "temporary-written-capture", opened.path, () => opened.handle.stat({ bigint: true }));
  if (!safeRegular(stats) || !sameIdentity(initial, stats) || stats.dev !== destination.dev || stats.size !== BigInt(bytes.byteLength)) {
    throw operationFailure("TemporaryWriteFailed", "temporary-write", "Temporary identity changed while open", opened.path);
  }
  await revalidateParentChainExact(initial.parentChain);
  return captureTemporary(opened, stats);
}

export async function closeTemporary(opened: OpenedTemporary): Promise<void> {
  await safePhase("TemporaryWriteFailed", "temporary-close", opened.path, () => opened.handle.close());
}

export async function verifyOwnedTemporary(
  temporary: OwnedTemporary,
  expectedBytes: Uint8Array,
  expectedMode: number,
): Promise<void> {
  const file = temporaryAsCapturedFile(temporary, expectedBytes);
  if ((temporary.mode & 0o777n) !== BigInt(expectedMode)) {
    throw operationFailure("TemporaryVerifyFailed", "temporary-mode", "Temporary has the wrong mode", temporary.path);
  }
  try {
    await revalidateCapturedFile(file);
  } catch (error) {
    const converted = toFilesystemError(error);
    throw operationFailure("TemporaryVerifyFailed", converted.failure.phase, converted.failure.message, temporary.path);
  }
}

export async function commitTemporary(
  destination: DestinationIdentity,
  temporary: OwnedTemporary,
  target: CapturedPath,
  beforeFinalMutation?: (phase: CommitMutationPhase) => Promise<void>,
): Promise<PublishedFileIdentity> {
  await revalidateDestination(destination);
  await revalidateCapturedPath(target);
  const targetPath = target.kind === "Absent" ? target.path : target.file.path;
  if (dirname(targetPath) !== temporary.parentPath) {
    throw operationFailure("PathUnsafe", "file-publish-parent", "Temporary and target must be direct children of the same captured parent", targetPath);
  }
  assertPrivateDirectChild(temporary.parentPath, temporary.path, temporary.prefix);
  await prepareMutationParentAgainst(
    destination,
    [target.parentChain, temporary.parentChain],
    temporary.parentPath,
  );
  if (beforeFinalMutation !== undefined) await beforeFinalMutation("TargetPublication");
  const parentChain = await prepareMutationParentAgainst(
    destination,
    [target.parentChain, temporary.parentChain],
    temporary.parentPath,
  );
  if (target.kind === "Absent") {
    const [tempStats, tempResolved, targetStats] = await Promise.all([
      lstat(temporary.path, { bigint: true }),
      realpath(temporary.path),
      lstatIfPresent(target.path),
    ]);
    assertCapturedTemporary(temporary, tempStats, "TemporaryVerifyFailed", "temporary-precommit");
    if (tempResolved !== temporary.path) {
      throw operationFailure("PathChanged", "temporary-precommit", "Temporary became aliased before publication", temporary.path);
    }
    if (targetStats !== undefined) {
      throw operationFailure("PathChanged", "file-publish-no-replace", "Absent target became occupied at final admission", target.path);
    }
    await safePhase("MutationFailed", "file-publish-no-replace", target.path, () => link(temporary.path, target.path));
    await validatePublicationLinks(destination, temporary, target.path, target.parentChain);
    const published = await finalizePublicationLinks(destination, temporary, target.path, target.parentChain, beforeFinalMutation);
    const parentIdentity = parentChain[parentChain.length - 1]!;
    await flushDirectory(temporary.parentPath, parentIdentity);
    return published;
  }
  const [tempStats, tempResolved, targetStats, targetResolved] = await Promise.all([
    lstat(temporary.path, { bigint: true }),
    realpath(temporary.path),
    lstat(target.file.path, { bigint: true }),
    realpath(target.file.path),
  ]);
  assertCapturedTemporary(temporary, tempStats, "TemporaryVerifyFailed", "temporary-precommit");
  assertCapturedRegular(target.file, targetStats, "PathChanged", "file-publish-replace");
  if (tempResolved !== temporary.path || targetResolved !== target.file.path) {
    throw operationFailure("PathChanged", "file-publish-replace", "Temporary or target became aliased before replacement", target.file.path);
  }
  await safePhase("MutationFailed", "file-publish-replace", target.file.path, () => rename(temporary.path, target.file.path));
  const published = await capturePublishedFile(destination, temporary, target.file.path, parentChain);
  const parentIdentity = parentChain[parentChain.length - 1]!;
  await flushDirectory(temporary.parentPath, parentIdentity);
  return published;
}

export async function verifyPublishedFile(
  destination: DestinationIdentity,
  relativePath: string,
  expectedBytes: Uint8Array,
  expectedMode: number,
  published: PublishedFileIdentity,
): Promise<CapturedRegularFile> {
  const maximum = Math.max(expectedBytes.byteLength, 1);
  const captured = await capturePath(destination, relativePath, maximum);
  if (
    captured.kind !== "Present"
    || (captured.file.mode & 0o777n) !== BigInt(expectedMode)
    || !bytesEqual(captured.file.bytes, expectedBytes)
    || !samePublishedIdentity(published, captured.file)
  ) throw operationFailure("VerificationFailed", "file-final-verify", "Published file differs from the planned state", relativePath);
  return captured.file;
}

export async function unlinkCapturedFile(
  destination: DestinationIdentity,
  file: CapturedRegularFile,
  beforeFinalMutation?: BeforeFinalMutation,
): Promise<void> {
  await revalidateCapturedFile(file);
  const parentPath = dirname(file.path);
  await prepareMutationParent(destination, file.parentChain, parentPath);
  if (beforeFinalMutation !== undefined) await beforeFinalMutation();
  const parentChain = await prepareMutationParent(destination, file.parentChain, parentPath);
  const [immediate, immediateResolved] = await Promise.all([
    lstat(file.path, { bigint: true }),
    realpath(file.path),
  ]);
  if (immediateResolved !== file.path) throw operationFailure("PathChanged", "file-unlink", "File became aliased before one-file unlink", file.path);
  assertCapturedRegular(file, immediate, "PathChanged", "file-unlink");
  await safePhase("MutationFailed", "file-unlink", file.path, () => unlink(file.path));
  const parentIdentity = parentChain[parentChain.length - 1]!;
  await flushDirectory(parentPath, parentIdentity);
}

export async function cleanupOwnedTemporary(
  destination: DestinationIdentity,
  temporary: OwnedTemporary,
  beforeFinalMutation?: BeforeFinalMutation,
): Promise<ExportFailure | undefined> {
  try {
    assertPrivateDirectChild(temporary.parentPath, temporary.path, temporary.prefix);
    await revalidateDestination(destination);
    await prepareMutationParent(destination, temporary.parentChain, temporary.parentPath);
    if (beforeFinalMutation !== undefined) await beforeFinalMutation();
    const parentChain = await prepareMutationParent(destination, temporary.parentChain, temporary.parentPath);
    const parentIdentity = parentChain[parentChain.length - 1]!;
    const [immediate, immediateResolved] = await Promise.all([
      lstatIfPresent(temporary.path),
      realpathIfPresent(temporary.path),
    ]);
    if (immediate === undefined && immediateResolved === undefined) return undefined;
    if (immediate === undefined || immediateResolved !== temporary.path) {
      return failure("TemporaryCleanupBlocked", "temporary-cleanup", "Temporary became absent or aliased before exact one-file unlink", temporary.path);
    }
    assertCapturedTemporary(temporary, immediate, "TemporaryCleanupBlocked", "temporary-cleanup-immediate");
    await safePhase("TemporaryCleanupFailed", "temporary-cleanup", temporary.path, () => unlink(temporary.path));
    await flushDirectory(temporary.parentPath, { dev: parentIdentity.dev, ino: parentIdentity.ino });
    return undefined;
  } catch (error) {
    const converted = toFilesystemError(error);
    return failure(
      converted.failure.code === "TemporaryCleanupBlocked" ? "TemporaryCleanupBlocked" : "TemporaryCleanupFailed",
      "temporary-cleanup",
      converted.failure.message,
      temporary.path,
    );
  }
}

export async function flushDirectory(path: string, expected?: EntryIdentity): Promise<void> {
  const handle = await safePhase("VerificationFailed", "directory-flush-open", path, () => open(
    path,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  ));
  try {
    const stats = await handle.stat({ bigint: true });
    if (!stats.isDirectory() || stats.isSymbolicLink() || (expected !== undefined && !sameIdentity(expected, stats))) {
      throw operationFailure("VerificationFailed", "directory-flush", "Opened directory differs from its captured entry", path);
    }
    await safePhase("VerificationFailed", "directory-flush", path, () => handle.sync());
  } finally {
    await handle.close();
  }
}

export function containedPath(destination: string, relativePath: string): string {
  if (relativePath.length === 0 || relativePath.startsWith("/") || relativePath.includes("\\")) {
    throw operationFailure("PathUnsafe", "path-containment", "Relative path is unsafe", relativePath);
  }
  const nativeRelative = relativePath.split("/").join(sep);
  const absolute = resolve(destination, nativeRelative);
  const relation = relative(destination, absolute);
  if (relation.length === 0 || relation.startsWith("..") || isAbsolute(relation)) {
    throw operationFailure("PathUnsafe", "path-containment", "Path escapes or aliases the destination root", relativePath);
  }
  return absolute;
}

export function operationFailure(code: ExportFailureCode, phase: string, message: string, path?: string): ExportFilesystemError {
  return new ExportFilesystemError(failure(code, phase, message, path));
}

function isCanonicalAbsolutePath(value: string): boolean {
  return isAbsolute(value) && value === normalize(value) && value === resolve(value) && value !== "/";
}

interface DirectoryChainInspection {
  readonly missingDirectories: readonly string[];
  readonly parentChain: CapturedParentChain;
}

async function inspectDirectoryChain(
  destination: DestinationIdentity,
  segments: readonly string[],
): Promise<DirectoryChainInspection> {
  const missing: string[] = [];
  const parentChain: CapturedDirectoryComponent[] = [];
  let current = destination.path;
  let missingSeen = false;
  const destinationStats = await safePhase("PathUnsafe", "directory-chain", current, () => lstat(current, { bigint: true }));
  await assertDirectory(destination, current, destinationStats);
  parentChain.push(captureDirectoryComponent(current, destinationStats));
  for (let index = 0; index < segments.length; index += 1) {
    current = join(current, segments[index]!);
    const relativeDirectory = segments.slice(0, index + 1).join("/");
    if (missingSeen) {
      missing.push(relativeDirectory);
      continue;
    }
    const stats = await lstatIfPresent(current);
    if (stats === undefined) {
      missingSeen = true;
      missing.push(relativeDirectory);
      continue;
    }
    await assertDirectory(destination, current, stats);
    parentChain.push(captureDirectoryComponent(current, stats));
  }
  const frozenChain = Object.freeze(parentChain);
  await revalidateParentChainStable(frozenChain);
  return Object.freeze({
    missingDirectories: Object.freeze(missing),
    parentChain: frozenChain,
  });
}

async function captureParentChain(
  destination: DestinationIdentity,
  parentPath: string,
): Promise<CapturedParentChain> {
  const relation = relative(destination.path, parentPath);
  if (relation.startsWith("..") || isAbsolute(relation)) {
    throw operationFailure("PathUnsafe", "parent-chain", "Mutation parent escapes the destination", parentPath);
  }
  const segments = relation.length === 0 ? [] : relation.split(sep);
  const inspection = await inspectDirectoryChain(destination, segments);
  if (inspection.missingDirectories.length > 0) {
    throw operationFailure("PathUnsafe", "parent-chain", "Mutation parent is not a complete existing directory chain", parentPath);
  }
  const last = inspection.parentChain[inspection.parentChain.length - 1];
  if (last?.path !== parentPath) {
    throw operationFailure("PathUnsafe", "parent-chain", "Mutation parent chain does not end at the requested path", parentPath);
  }
  return inspection.parentChain;
}

async function prepareMutationParent(
  destination: DestinationIdentity,
  expected: CapturedParentChain,
  parentPath: string,
): Promise<CapturedParentChain> {
  return prepareMutationParentAgainst(destination, [expected], parentPath);
}

async function prepareMutationParentAgainst(
  destination: DestinationIdentity,
  expectedChains: readonly CapturedParentChain[],
  parentPath: string,
): Promise<CapturedParentChain> {
  const current = await captureParentChain(destination, parentPath);
  for (const expected of expectedChains) {
    if (expected.length > current.length) {
      throw operationFailure("PathChanged", "parent-chain", "Captured parent chain is longer than the live mutation parent", parentPath);
    }
    for (let index = 0; index < expected.length; index += 1) {
      const prior = expected[index]!;
      const live = current[index]!;
      if (!sameDirectoryComponentStable(prior, live)) {
        throw operationFailure("PathChanged", "parent-chain", "Captured parent component changed before mutation", prior.path);
      }
    }
  }
  await revalidateParentChainExact(current);
  return current;
}

async function revalidateParentChainStable(chain: CapturedParentChain): Promise<void> {
  if (chain.length === 0) throw operationFailure("PathUnsafe", "parent-chain", "Captured parent chain is empty");
  const observations = await Promise.all(chain.map(async (component) => Promise.all([
    safePhase("PathChanged", "parent-chain", component.path, () => lstat(component.path, { bigint: true })),
    safePhase("PathChanged", "parent-chain-realpath", component.path, () => realpath(component.path)),
  ])));
  for (let index = 0; index < chain.length; index += 1) {
    const component = chain[index]!;
    const [stats, resolved] = observations[index]!;
    if (
      !stats.isDirectory()
      || stats.isSymbolicLink()
      || stats.dev !== component.dev
      || stats.ino !== component.ino
      || stats.mode !== component.mode
      || stats.birthtimeNs !== component.birthtimeNs
      || resolved !== component.path
    ) throw operationFailure("PathChanged", "parent-chain", "Captured parent component is no longer canonical and identical", component.path);
  }
}

async function revalidateParentChainExact(chain: CapturedParentChain): Promise<void> {
  await revalidateParentChainStable(chain);
  const observations = await Promise.all(chain.map(async (component) => Promise.all([
    safePhase("PathChanged", "parent-chain-exact", component.path, () => lstat(component.path, { bigint: true })),
    safePhase("PathChanged", "parent-chain-exact-realpath", component.path, () => realpath(component.path)),
  ])));
  for (let index = 0; index < chain.length; index += 1) {
    const component = chain[index]!;
    const [stats, resolved] = observations[index]!;
    if (!sameDirectoryComponentExact(component, stats) || resolved !== component.path) {
      throw operationFailure("PathChanged", "parent-chain-exact", "Captured parent link state changed before mutation", component.path);
    }
  }
}

async function assertDirectory(destination: DestinationIdentity, path: string, stats: BigIntStats): Promise<void> {
  if (!stats.isDirectory() || stats.isSymbolicLink() || stats.dev !== destination.dev) {
    throw operationFailure("PathUnsafe", "directory-check", "Path component is not a same-filesystem non-symlink directory", path);
  }
  const resolved = await safePhase("PathUnsafe", "directory-realpath", path, () => realpath(path));
  if (resolved !== path || (path === destination.path && !sameIdentity(destination, stats))) {
    throw operationFailure("PathUnsafe", "directory-realpath", "Path component resolves through an alias", path);
  }
}

async function captureRegularFile(
  destination: DestinationIdentity,
  path: string,
  stats: BigIntStats,
  maximumReadableBytes: number,
  parentChain: CapturedParentChain,
): Promise<CapturedRegularFile> {
  if (!safeRegular(stats) || stats.dev !== destination.dev) {
    throw operationFailure("PathUnsafe", "file-capture", "Path entry is not one same-filesystem regular file", path);
  }
  if (stats.size > BigInt(maximumReadableBytes)) {
    throw operationFailure("PathUnsafe", "file-capture-size", "Path entry exceeds its bounded readable size", path);
  }
  const resolved = await realpath(path);
  if (resolved !== path) throw operationFailure("PathUnsafe", "file-realpath", "File resolves through an alias", path);
  const skeleton = captureFileMetadata(path, stats, new Uint8Array(), parentChain);
  const bytes = await readOwnedFile(skeleton, maximumReadableBytes, "PathChanged", "file-capture-read");
  const file = captureFileMetadata(path, stats, bytes, parentChain);
  await revalidateCapturedFile(file);
  return file;
}

async function readOwnedFile(
  expected: Pick<CapturedRegularFile, "path" | "dev" | "ino" | "mode" | "size" | "mtimeNs" | "ctimeNs">,
  maximumReadableBytes: number,
  code: ExportFailureCode,
  phase: string,
): Promise<Uint8Array> {
  if (expected.size > BigInt(maximumReadableBytes) || expected.size > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw operationFailure(code, `${phase}-size`, "Captured file exceeds its bounded read limit", expected.path);
  }
  const handle = await safePhase(code, `${phase}-open`, expected.path, () => open(expected.path, constants.O_RDONLY | constants.O_NOFOLLOW));
  try {
    const before = await handle.stat({ bigint: true });
    assertCapturedRegular(expected, before, code, phase);
    const size = Number(expected.size);
    const buffer = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const { bytesRead } = await handle.read(buffer, offset, size - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== size) throw operationFailure(code, phase, "Opened file became shorter while being read", expected.path);
    const extra = Buffer.alloc(1);
    const { bytesRead: extraBytesRead } = await handle.read(extra, 0, 1, size);
    if (extraBytesRead !== 0) throw operationFailure(code, phase, "Opened file exceeded its captured size", expected.path);
    const after = await handle.stat({ bigint: true });
    assertCapturedRegular(expected, after, code, phase);
    return new Uint8Array(buffer);
  } finally {
    await handle.close();
  }
}

async function lstatIfPresent(path: string): Promise<BigIntStats | undefined> {
  try {
    return await lstat(path, { bigint: true });
  } catch (error) {
    if (nodeCode(error) === "ENOENT") return undefined;
    throw error;
  }
}

async function realpathIfPresent(path: string): Promise<string | undefined> {
  try {
    return await realpath(path);
  } catch (error) {
    if (nodeCode(error) === "ENOENT") return undefined;
    throw error;
  }
}

async function safePhase<T>(code: ExportFailureCode, phase: string, path: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ExportFilesystemError) throw error;
    throw operationFailure(code, phase, errorMessage(error), path);
  }
}

function captureFileMetadata(
  path: string,
  stats: BigIntStats,
  bytes: Uint8Array,
  parentChain: CapturedParentChain,
): CapturedRegularFile {
  return Object.freeze({
    path,
    dev: stats.dev,
    ino: stats.ino,
    size: stats.size,
    mode: stats.mode,
    birthtimeNs: stats.birthtimeNs,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs,
    bytes: new Uint8Array(bytes),
    contentDigest: contentDigest(bytes),
    parentChain,
  });
}

function captureDirectoryComponent(path: string, stats: BigIntStats): CapturedDirectoryComponent {
  return Object.freeze({
    path,
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    nlink: stats.nlink,
    birthtimeNs: stats.birthtimeNs,
  });
}

function captureDirectory(
  destinationPath: string,
  relativePath: string,
  stats: BigIntStats,
  parentChain: CapturedParentChain,
): CapturedDirectory {
  return Object.freeze({
    path: containedPath(destinationPath, relativePath),
    relativePath,
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    birthtimeNs: stats.birthtimeNs,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs,
    parentChain,
  });
}

function captureTemporary(opened: OpenedTemporary, stats: BigIntStats): OwnedTemporary {
  return Object.freeze({
    path: opened.path,
    parentPath: opened.parentPath,
    prefix: opened.prefix,
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    size: stats.size,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs,
    parentChain: opened.parentChain,
  });
}

function temporaryAsCapturedFile(temporary: OwnedTemporary, bytes: Uint8Array): CapturedRegularFile {
  return Object.freeze({
    path: temporary.path,
    dev: temporary.dev,
    ino: temporary.ino,
    mode: temporary.mode,
    size: temporary.size,
    mtimeNs: temporary.mtimeNs,
    ctimeNs: temporary.ctimeNs,
    bytes: new Uint8Array(bytes),
    contentDigest: contentDigest(bytes),
    parentChain: temporary.parentChain,
  });
}

async function validatePublicationLinks(
  destination: DestinationIdentity,
  temporary: OwnedTemporary,
  targetPath: string,
  targetParentChain: CapturedParentChain,
): Promise<void> {
  await prepareMutationParentAgainst(
    destination,
    [targetParentChain, temporary.parentChain],
    temporary.parentPath,
  );
  const observation = await observePublicationLinks(temporary, targetPath);
  assertPublicationLinks(destination, temporary, targetPath, observation);
}

async function finalizePublicationLinks(
  destination: DestinationIdentity,
  temporary: OwnedTemporary,
  targetPath: string,
  targetParentChain: CapturedParentChain,
  beforeFinalMutation?: (phase: CommitMutationPhase) => Promise<void>,
): Promise<PublishedFileIdentity> {
  await prepareMutationParentAgainst(
    destination,
    [targetParentChain, temporary.parentChain],
    temporary.parentPath,
  );
  if (beforeFinalMutation !== undefined) await beforeFinalMutation("TemporaryFinalization");
  const parentChain = await prepareMutationParentAgainst(
    destination,
    [targetParentChain, temporary.parentChain],
    temporary.parentPath,
  );
  const observation = await observePublicationLinks(temporary, targetPath);
  assertPublicationLinks(destination, temporary, targetPath, observation);
  await safePhase("MutationFailed", "file-publish-finalize", temporary.path, () => unlink(temporary.path));
  return capturePublishedFile(destination, temporary, targetPath, parentChain);
}

async function capturePublishedFile(
  destination: DestinationIdentity,
  temporary: OwnedTemporary,
  targetPath: string,
  parentChain: CapturedParentChain,
): Promise<PublishedFileIdentity> {
  const [stats, resolved] = await Promise.all([
    lstat(targetPath, { bigint: true }),
    realpath(targetPath),
  ]);
  if (
    resolved !== targetPath
    || !safeRegular(stats)
    || !sameIdentity(temporary, stats)
    || stats.dev !== destination.dev
    || stats.mode !== temporary.mode
    || stats.size !== temporary.size
    || stats.mtimeNs !== temporary.mtimeNs
  ) {
    throw operationFailure(
      "VerificationFailed",
      "file-publish-identity",
      "Published file is not the exact current-operation inode and metadata",
      targetPath,
    );
  }
  return Object.freeze({
    path: targetPath,
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    size: stats.size,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs,
    parentChain,
  });
}

interface PublicationLinkObservation {
  readonly temporaryStats: BigIntStats;
  readonly targetStats: BigIntStats;
  readonly temporaryResolved: string;
  readonly targetResolved: string;
}

async function observePublicationLinks(
  temporary: OwnedTemporary,
  targetPath: string,
): Promise<PublicationLinkObservation> {
  const [temporaryStats, targetStats, temporaryResolved, targetResolved] = await Promise.all([
    lstat(temporary.path, { bigint: true }),
    lstat(targetPath, { bigint: true }),
    realpath(temporary.path),
    realpath(targetPath),
  ]);
  return { temporaryStats, targetStats, temporaryResolved, targetResolved };
}

function assertPublicationLinks(
  destination: DestinationIdentity,
  temporary: OwnedTemporary,
  targetPath: string,
  observation: PublicationLinkObservation,
): void {
  const canonicalNames = new Set([temporary.path, targetPath]);
  if (!canonicalNames.has(observation.temporaryResolved) || !canonicalNames.has(observation.targetResolved)) {
    throw operationFailure("MutationFailed", "file-publish-finalize", "Publication links resolve outside their exact canonical names", targetPath);
  }
  const { temporaryStats, targetStats } = observation;
  for (const [path, stats] of [[temporary.path, temporaryStats], [targetPath, targetStats]] as const) {
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 2n || !sameIdentity(temporary, stats) || stats.dev !== destination.dev) {
      throw operationFailure("MutationFailed", "file-publish-finalize", "Publication links do not identify the exact current-operation file", path);
    }
    if (stats.mode !== temporary.mode || stats.size !== temporary.size || stats.mtimeNs !== temporary.mtimeNs) {
      throw operationFailure("MutationFailed", "file-publish-finalize", "Publication link metadata differs from the captured temporary", path);
    }
  }
}

function assertCapturedRegular(
  captured: Pick<CapturedRegularFile, "path" | "dev" | "ino" | "mode" | "size" | "mtimeNs" | "ctimeNs">,
  stats: BigIntStats,
  code: ExportFailureCode,
  phase: string,
): void {
  if (!safeRegular(stats) || !sameCapturedFile(captured, stats)) {
    throw operationFailure(code, phase, "Captured regular-file identity or metadata changed", captured.path);
  }
}

function assertCapturedTemporary(temporary: OwnedTemporary, stats: BigIntStats, code: ExportFailureCode, phase: string): void {
  if (!safeRegular(stats) || !sameCapturedFile(temporary, stats)) {
    throw operationFailure(code, phase, "Temporary identity or metadata changed", temporary.path);
  }
}

function safeRegular(stats: BigIntStats): boolean {
  return stats.isFile()
    && !stats.isSymbolicLink()
    && stats.nlink === 1n
    && (stats.mode & FILE_TYPE_MASK) === REGULAR_FILE_TYPE;
}

function sameIdentity(left: EntryIdentity, right: Pick<BigIntStats, "dev" | "ino">): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameCapturedFile(
  left: Pick<CapturedRegularFile, "dev" | "ino" | "mode" | "size" | "mtimeNs" | "ctimeNs"> | OwnedTemporary,
  right: Pick<BigIntStats, "dev" | "ino" | "mode" | "size" | "mtimeNs" | "ctimeNs">,
): boolean {
  return sameIdentity(left, right)
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function samePublishedIdentity(left: PublishedFileIdentity, right: CapturedRegularFile): boolean {
  return left.path === right.path
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.parentChain.length === right.parentChain.length
    && left.parentChain.every((component, index) => (
      sameDirectoryComponentStable(component, right.parentChain[index]!)
    ));
}

function sameCapturedDirectory(left: CapturedDirectory, right: BigIntStats): boolean {
  return right.isDirectory()
    && !right.isSymbolicLink()
    && sameIdentity(left, right)
    && left.mode === right.mode
    && left.birthtimeNs === right.birthtimeNs
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function sameDirectoryComponentStable(
  left: CapturedDirectoryComponent,
  right: CapturedDirectoryComponent,
): boolean {
  return left.path === right.path
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.birthtimeNs === right.birthtimeNs;
}

function sameDirectoryComponentExact(left: CapturedDirectoryComponent, right: BigIntStats): boolean {
  return right.isDirectory()
    && !right.isSymbolicLink()
    && right.nlink > 0n
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.birthtimeNs === right.birthtimeNs;
}

function assertPrivateDirectChild(parent: string, child: string, prefix: string): void {
  if (dirname(child) !== parent || !basename(child).startsWith(prefix) || join(parent, basename(child)) !== child) {
    throw operationFailure("TemporaryCleanupBlocked", "temporary-path", "Temporary is not the owner's private direct child", child);
  }
}

function depth(path: string): number {
  return path.split("/").length;
}

function nodeCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

async function closeDirectory(directory: Dir): Promise<void> {
  try {
    const closeResult: unknown = directory.close();
    if (isPromiseLike(closeResult)) await closeResult;
  } catch (error) {
    if (nodeCode(error) !== "ERR_DIR_CLOSED") throw error;
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === "object"
    && value !== null
    && "then" in value
    && typeof value.then === "function";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
