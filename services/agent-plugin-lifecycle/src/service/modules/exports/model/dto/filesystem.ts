import type { ContentDigest } from "../../../../shared/release/index";

import type { ExportFailure, ExportFailureCode } from "./export-lifecycle";

export interface EntryIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

export interface DestinationIdentity extends EntryIdentity {
  readonly path: string;
}

export interface CapturedDirectoryComponent extends EntryIdentity {
  readonly path: string;
  readonly mode: bigint;
  readonly nlink: bigint;
  readonly birthtimeNs: bigint;
}

export type CapturedParentChain = readonly CapturedDirectoryComponent[];

export interface CapturedDirectory extends EntryIdentity {
  readonly path: string;
  readonly relativePath: string;
  readonly mode: bigint;
  readonly birthtimeNs: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
  readonly parentChain: CapturedParentChain;
}

export interface CapturedRegularFile extends EntryIdentity {
  readonly path: string;
  readonly size: bigint;
  readonly mode: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
  readonly bytes: Uint8Array;
  readonly contentDigest: ContentDigest;
  readonly parentChain: CapturedParentChain;
}

export type CapturedPath =
  | Readonly<{
    kind: "Absent";
    path: string;
    missingDirectories: readonly string[];
    parentChain: CapturedParentChain;
  }>
  | Readonly<{
    kind: "Present";
    file: CapturedRegularFile;
    missingDirectories: readonly string[];
    parentChain: CapturedParentChain;
  }>;

export class ExportFilesystemError extends Error {
  constructor(
    readonly failure: ExportFailure,
    readonly cleanupFailure?: ExportFailure,
  ) {
    super(failure.message);
  }
}

export function visibleFileMode(file: Pick<CapturedRegularFile, "mode">): number {
  return Number(file.mode & 0o777n);
}

export function visibleDirectoryMode(directory: Pick<CapturedDirectory, "mode">): number {
  return Number(directory.mode & 0o777n);
}

export function failure(
  code: ExportFailureCode,
  phase: string,
  message: string,
  path?: string,
): ExportFailure {
  return Object.freeze({ code, phase, message, ...(path === undefined ? {} : { path }) });
}

export function toFilesystemError(error: unknown): ExportFilesystemError {
  return error instanceof ExportFilesystemError
    ? error
    : new ExportFilesystemError(failure(
      "MutationFailed",
      "filesystem",
      error instanceof Error ? error.message : String(error),
    ));
}
