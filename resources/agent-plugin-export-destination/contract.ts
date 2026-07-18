import type { Effect } from "effect";

/** Mechanical identity for one exact filesystem entry. */
export interface ExportDestinationEntryIdentity {
  readonly dev: number;
  readonly ino: number | null;
}

/** Raw stat fields retained as decimal strings so the service can bind durable evidence losslessly. */
export interface ExportDestinationFileStat {
  readonly dev: string;
  readonly ino: string;
  readonly nlink: string;
  readonly size: string;
  readonly mtimeNs: string;
  readonly ctimeNs: string;
}

export interface ExportDestinationDirectoryStat {
  readonly dev: string;
  readonly ino: string;
  readonly birthtimeNs: string;
  readonly mtimeNs: string;
  readonly ctimeNs: string;
}

export type ExportDestinationEntryKind = "File" | "Directory";

export interface ExportDestinationDirectoryChild extends ExportDestinationEntryIdentity {
  readonly name: string;
  readonly kind: ExportDestinationEntryKind;
  readonly mode: number;
}

export type ExportDestinationEntryObservation =
  | Readonly<{
    kind: "Absent";
    path: string;
  }>
  | Readonly<{
    kind: "File";
    path: string;
    identity: ExportDestinationEntryIdentity;
    stat: ExportDestinationFileStat;
    mode: number;
    bytes: Uint8Array;
  }>
  | Readonly<{
    kind: "Directory";
    path: string;
    identity: ExportDestinationEntryIdentity;
    stat: ExportDestinationDirectoryStat;
    mode: number;
    children: readonly ExportDestinationDirectoryChild[];
  }>;

export interface ExportDestinationSnapshot {
  readonly canonicalDestination: string;
  readonly destinationStat: ExportDestinationDirectoryStat;
  readonly readToken: string;
  readonly entries: readonly ExportDestinationEntryObservation[];
}

export interface ExportDestinationCapture extends ExportDestinationSnapshot {
  /** Provider-owned opaque capability. Callers cannot construct restore authority. */
  readonly handle: string;
}

/** Exact service-authored filesystem mutations; no layout or ledger meaning is carried here. */
export type ExportDestinationMutation =
  | Readonly<{
    kind: "EnsureDirectory";
    path: string;
    mode: number;
  }>
  | Readonly<{
    kind: "WriteFile";
    path: string;
    mode: number;
    bytes: Uint8Array;
  }>
  | Readonly<{
    kind: "RemoveFile";
    path: string;
  }>
  | Readonly<{
    kind: "RemoveEmptyDirectory";
    path: string;
  }>;

export interface ExportDestinationApplyReceipt {
  readonly planDigest: string;
  readonly readToken: string;
  readonly outcome: "Applied" | "Converged";
  readonly changedPaths: readonly string[];
  /** Exact post-plan observations in the same order as the captured paths. */
  readonly entries: readonly ExportDestinationEntryObservation[];
}

export interface ExportDestinationRestoreReceipt {
  readonly planDigest: string;
  readonly readToken: string;
  readonly outcome: "Restored";
  readonly changedPaths: readonly string[];
  /** Exact restored observations in the same order as the captured paths. */
  readonly entries: readonly ExportDestinationEntryObservation[];
}

/** Receipt for discarding an unmutated capture without admitting a semantic plan. */
export interface ExportDestinationReleaseReceipt {
  readonly readToken: string;
  readonly outcome: "Released";
  readonly handle: string;
}

export interface ExportDestinationSettleReceipt {
  readonly planDigest: string;
  readonly readToken: string;
  readonly outcome: "Settled";
  readonly handle: string;
}

export type ExportDestinationFailureReason =
  | "InvalidInput"
  | "Missing"
  | "Aliased"
  | "UnsupportedEntry"
  | "LimitExceeded"
  | "IdentityChanged"
  | "FilesystemFailed"
  | "CleanupFailed"
  | "InvalidHandle"
  | "HandleConsumed"
  | "HandleState"
  | "WrongDestination"
  | "WrongToken"
  | "WrongPlan";

export interface ExportDestinationFailure {
  readonly _tag: "ExportDestinationFailure";
  readonly operation: "inspect" | "capture" | "release" | "apply" | "restore" | "settle" | "cleanup";
  readonly reason: ExportDestinationFailureReason;
  readonly path?: string;
  readonly detail: string;
}

export interface ExportDestinationResource<R = never> {
  readonly inspect: (input: Readonly<{
    destination: string;
    readToken: string;
    paths: readonly string[];
    maxEntries: number;
    maxBytes: number;
  }>) => Effect.Effect<ExportDestinationSnapshot, ExportDestinationFailure, R>;

  readonly capture: (input: Readonly<{
    destination: string;
    readToken: string;
    paths: readonly string[];
    maxEntries: number;
    maxBytes: number;
  }>) => Effect.Effect<ExportDestinationCapture, ExportDestinationFailure, R>;

  /** Consumes only a still-unmutated capture. Applied or partial authority must be restored instead. */
  readonly release: (input: Readonly<{
    destination: string;
    readToken: string;
    captureHandle: string;
  }>) => Effect.Effect<ExportDestinationReleaseReceipt, ExportDestinationFailure, R>;

  readonly apply: (input: Readonly<{
    destination: string;
    planDigest: string;
    readToken: string;
    captureHandle: string;
    mutations: readonly ExportDestinationMutation[];
  }>) => Effect.Effect<ExportDestinationApplyReceipt, ExportDestinationFailure, R>;

  readonly restore: (input: Readonly<{
    destination: string;
    planDigest: string;
    readToken: string;
    captureHandle: string;
  }>) => Effect.Effect<ExportDestinationRestoreReceipt, ExportDestinationFailure, R>;

  readonly settle: (input: Readonly<{
    destination: string;
    planDigest: string;
    readToken: string;
    captureHandle: string;
  }>) => Effect.Effect<ExportDestinationSettleReceipt, ExportDestinationFailure, R>;
}

/** Promise projection for non-Effect callers; provider requirements bind at the edge. */
export interface ExportDestinationAsyncPort {
  readonly inspect: (
    input: Parameters<ExportDestinationResource["inspect"]>[0],
  ) => Promise<ExportDestinationSnapshot>;
  readonly capture: (
    input: Parameters<ExportDestinationResource["capture"]>[0],
  ) => Promise<ExportDestinationCapture>;
  readonly release: (
    input: Parameters<ExportDestinationResource["release"]>[0],
  ) => Promise<ExportDestinationReleaseReceipt>;
  readonly apply: (
    input: Parameters<ExportDestinationResource["apply"]>[0],
  ) => Promise<ExportDestinationApplyReceipt>;
  readonly restore: (
    input: Parameters<ExportDestinationResource["restore"]>[0],
  ) => Promise<ExportDestinationRestoreReceipt>;
  readonly settle: (
    input: Parameters<ExportDestinationResource["settle"]>[0],
  ) => Promise<ExportDestinationSettleReceipt>;
}
