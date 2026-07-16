import { constants, type BigIntStats } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  resolve,
} from "node:path";

import type { PackagingFailure, PackagingFailureCode } from "./contract";

export const FILE_MODE = 0o644;
const PRIVATE_TEMPORARY_PREFIX = ".rawr-package-tmp-v1-";
const OPERATION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{7,95}$/u;
const FILE_TYPE_MASK = 0o170000n;
const REGULAR_FILE_TYPE = 0o100000n;

export interface FileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

export interface CapturedParent extends FileIdentity {
  readonly path: string;
}

export interface CapturedFile extends FileIdentity {
  readonly path: string;
  readonly mode: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
}

export type CapturedOutput =
  | { readonly kind: "Absent" }
  | { readonly kind: "Present"; readonly file: CapturedFile; readonly bytes: Uint8Array };

export class PackagingOperationError extends Error {
  constructor(
    readonly primaryFailure: PackagingFailure,
    readonly cleanupFailure?: PackagingFailure,
  ) {
    super(primaryFailure.message);
  }
}

export async function captureCanonicalParent(outputPath: string): Promise<CapturedParent> {
  if (!isAbsolute(outputPath) || normalize(outputPath) !== outputPath || resolve(outputPath) !== outputPath) {
    throw operationFailure(
      "InvalidRequest",
      "output-path",
      "Output path must be absolute and lexically canonical",
    );
  }
  const parentPath = dirname(outputPath);
  if (basename(outputPath).length === 0 || join(parentPath, basename(outputPath)) !== outputPath) {
    throw operationFailure("InvalidRequest", "output-path", "Output must name one direct child file");
  }

  const stats = await phase(
    "OutputParentUnsafe",
    "output-parent",
    () => lstat(parentPath, { bigint: true }),
  );
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw operationFailure(
      "OutputParentUnsafe",
      "output-parent",
      "Output parent must be a non-symlink directory",
    );
  }
  const resolvedParent = await phase("OutputParentUnsafe", "output-parent-realpath", () => realpath(parentPath));
  if (resolvedParent !== parentPath) {
    throw operationFailure(
      "OutputParentUnsafe",
      "output-parent-realpath",
      "Output parent must not resolve through an alias",
    );
  }
  return { path: parentPath, dev: stats.dev, ino: stats.ino };
}

export async function captureOutput(
  outputPath: string,
  parent: CapturedParent,
  maximumReadableBytes: number,
): Promise<CapturedOutput> {
  const stats = await lstatIfPresent(outputPath, "OutputUnsafe", "output-capture");
  if (stats === undefined) return { kind: "Absent" };
  assertSafeRegularFile(outputPath, parent, stats, "OutputUnsafe", "output-capture");
  const file = captureFile(outputPath, stats);
  if (file.size > BigInt(maximumReadableBytes)) {
    throw operationFailure(
      "OutputUnsafe",
      "output-capture-size",
      "Prior output exceeds the bounded readable size for this package operation",
    );
  }
  const bytes = await readCapturedFile(
    file,
    maximumReadableBytes,
    "OutputUnsafe",
    "output-capture",
  );
  await revalidateCapturedFile(file, bytes, "OutputChanged", "output-capture");
  return { kind: "Present", file, bytes };
}

export async function openPrivateTemporary(
  parent: CapturedParent,
  operationId: () => string,
): Promise<{ readonly path: string; readonly handle: Awaited<ReturnType<typeof open>> }> {
  let id: string;
  try {
    id = operationId();
  } catch (error) {
    throw operationFailure("TemporaryCreateFailed", "temporary-name", errorMessage(error));
  }
  if (!OPERATION_ID_PATTERN.test(id)) {
    throw operationFailure(
      "TemporaryCreateFailed",
      "temporary-name",
      "Operation ID cannot form a private direct-child temporary name",
    );
  }
  const name = `${PRIVATE_TEMPORARY_PREFIX}${id}`;
  const temporaryPath = join(parent.path, name);
  assertPrivateDirectChild(parent.path, temporaryPath);
  const handle = await phase(
    "TemporaryCreateFailed",
    "temporary-create",
    () => open(
      temporaryPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600,
    ),
  );
  return { path: temporaryPath, handle };
}

export async function revalidateCapturedOutput(
  outputPath: string,
  captured: CapturedOutput,
  afterRead?: () => Promise<void>,
): Promise<void> {
  if (captured.kind === "Absent") {
    await afterRead?.();
    const current = await lstatIfPresent(outputPath, "OutputChanged", "output-precommit");
    if (current !== undefined) {
      throw operationFailure(
        "OutputChanged",
        "output-precommit",
        "Absent output path became occupied before no-replace publication",
      );
    }
    return;
  }
  await revalidateCapturedFile(
    captured.file,
    captured.bytes,
    "OutputChanged",
    "output-precommit",
    afterRead,
  );
}

export async function revalidateCapturedFile(
  captured: CapturedFile,
  expectedBytes: Uint8Array,
  code: PackagingFailureCode,
  phaseName: string,
  afterRead?: () => Promise<void>,
): Promise<void> {
  const stats = await phase(code, phaseName, () => lstat(captured.path, { bigint: true }));
  if (
    !stats.isFile()
    || stats.isSymbolicLink()
    || stats.nlink !== 1n
    || !sameCapturedFile(captured, stats)
  ) {
    throw operationFailure(code, phaseName, "Captured regular-file identity changed");
  }
  const resolved = await phase(code, `${phaseName}-realpath`, () => realpath(captured.path));
  if (resolved !== captured.path) {
    throw operationFailure(code, `${phaseName}-realpath`, "Captured file resolves through an alias");
  }
  if (captured.size !== BigInt(expectedBytes.byteLength)) {
    throw operationFailure(code, phaseName, "Captured file size differs from the expected bytes");
  }
  const currentBytes = await readCapturedFile(
    captured,
    expectedBytes.byteLength,
    code,
    phaseName,
  );
  if (!bytesEqual(currentBytes, expectedBytes)) {
    throw operationFailure(code, phaseName, "Captured file bytes changed");
  }
  await afterRead?.();
  const finalResolved = await phase(code, `${phaseName}-final-realpath`, () => realpath(captured.path));
  if (finalResolved !== captured.path) {
    throw operationFailure(code, `${phaseName}-final-realpath`, "Captured file became aliased");
  }
  const finalStats = await phase(
    code,
    `${phaseName}-final-entry`,
    () => lstat(captured.path, { bigint: true }),
  );
  if (
    !finalStats.isFile()
    || finalStats.isSymbolicLink()
    || finalStats.nlink !== 1n
    || !sameCapturedFile(captured, finalStats)
  ) {
    throw operationFailure(code, `${phaseName}-final-entry`, "Captured path entry changed after reading");
  }
}

export async function readCapturedFile(
  captured: CapturedFile,
  maximumReadableBytes: number,
  code: PackagingFailureCode,
  phaseName: string,
): Promise<Uint8Array> {
  if (captured.size > BigInt(maximumReadableBytes)) {
    throw operationFailure(code, `${phaseName}-size`, "Captured file exceeds its bounded read limit");
  }
  const handle = await phase(
    code,
    `${phaseName}-open`,
    () => open(captured.path, constants.O_RDONLY | constants.O_NOFOLLOW),
  );
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || !sameCapturedFile(captured, before)) {
      throw operationFailure(code, phaseName, "Opened file differs from the captured path entry");
    }
    const size = Number(captured.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const { bytesRead } = await handle.read(bytes, offset, size - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== size) {
      throw operationFailure(code, phaseName, "Opened file became shorter while being verified");
    }
    const extra = Buffer.alloc(1);
    const { bytesRead: extraBytesRead } = await handle.read(extra, 0, 1, size);
    if (extraBytesRead !== 0) {
      throw operationFailure(code, phaseName, "Opened file exceeded its captured bounded size");
    }
    const after = await handle.stat({ bigint: true });
    if (!sameCapturedFile(captured, after) || after.nlink !== 1n) {
      throw operationFailure(code, phaseName, "Opened file changed while being verified");
    }
    return new Uint8Array(bytes);
  } finally {
    await handle.close();
  }
}

export async function revalidateParent(parent: CapturedParent): Promise<void> {
  const stats = await phase(
    "OutputParentUnsafe",
    "output-parent-revalidation",
    () => lstat(parent.path, { bigint: true }),
  );
  if (!stats.isDirectory() || stats.isSymbolicLink() || !sameIdentity(parent, stats)) {
    throw operationFailure(
      "OutputParentUnsafe",
      "output-parent-revalidation",
      "Output parent identity changed",
    );
  }
  const resolved = await phase(
    "OutputParentUnsafe",
    "output-parent-revalidation",
    () => realpath(parent.path),
  );
  if (resolved !== parent.path) {
    throw operationFailure(
      "OutputParentUnsafe",
      "output-parent-revalidation",
      "Output parent resolves through an alias",
    );
  }
}

export function assertSafeRegularFile(
  filePath: string,
  parent: CapturedParent,
  stats: BigIntStats,
  code: PackagingFailureCode,
  phaseName: string,
): void {
  if (
    dirname(filePath) !== parent.path
    || !stats.isFile()
    || stats.isSymbolicLink()
    || stats.nlink !== 1n
    || stats.dev !== parent.dev
    || (stats.mode & FILE_TYPE_MASK) !== REGULAR_FILE_TYPE
  ) {
    throw operationFailure(
      code,
      phaseName,
      "Path entry must be one non-symlink, non-hardlinked, same-parent regular file",
    );
  }
}

export function assertPrivateDirectChild(parentPath: string, temporaryPath: string): void {
  const name = basename(temporaryPath);
  if (
    dirname(temporaryPath) !== parentPath
    || !name.startsWith(PRIVATE_TEMPORARY_PREFIX)
    || join(parentPath, name) !== temporaryPath
  ) {
    throw operationFailure(
      "TemporaryCleanupBlocked",
      "temporary-path",
      "Temporary path is not the owner's private direct child",
    );
  }
}

export async function lstatIfPresent(
  filePath: string,
  code: PackagingFailureCode,
  phaseName: string,
): Promise<BigIntStats | undefined> {
  try {
    return await lstat(filePath, { bigint: true });
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return undefined;
    throw operationFailure(code, phaseName, errorMessage(error));
  }
}

export async function phase<T>(
  code: PackagingFailureCode,
  phaseName: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PackagingOperationError) throw error;
    throw operationFailure(code, phaseName, errorMessage(error));
  }
}

export function operationFailure(
  code: PackagingFailureCode,
  phaseName: string,
  message: string,
): PackagingOperationError {
  return new PackagingOperationError(packagingFailure(code, phaseName, message));
}

export function packagingFailure(
  code: PackagingFailureCode,
  phaseName: string,
  message: string,
): PackagingFailure {
  return Object.freeze({ code, phase: phaseName, message });
}

export function toOperationError(error: unknown): PackagingOperationError {
  return error instanceof PackagingOperationError
    ? error
    : operationFailure("OutputVerifyFailed", "unexpected", errorMessage(error));
}

export function captureFile(
  filePath: string,
  stats: Pick<BigIntStats, "ctimeNs" | "dev" | "ino" | "mode" | "mtimeNs" | "size">,
): CapturedFile {
  return {
    path: filePath,
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    size: stats.size,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs,
  };
}

export function sameIdentity(
  captured: FileIdentity,
  stats: Pick<BigIntStats, "dev" | "ino">,
): boolean {
  return captured.dev === stats.dev && captured.ino === stats.ino;
}

export function sameCapturedFile(
  captured: CapturedFile,
  stats: Pick<BigIntStats, "ctimeNs" | "dev" | "ino" | "mode" | "mtimeNs" | "size">,
): boolean {
  return sameIdentity(captured, stats)
    && captured.mode === stats.mode
    && captured.size === stats.size
    && captured.mtimeNs === stats.mtimeNs
    && captured.ctimeNs === stats.ctimeNs;
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && Buffer.compare(left, right) === 0;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nodeErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
