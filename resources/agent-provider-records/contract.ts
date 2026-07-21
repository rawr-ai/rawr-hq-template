import type { Effect } from "effect";

/** Closed mechanical locations below the controller-owned projection root. */
export type ProviderProjectionRecordKind = "Manifest" | "Member";

/** Closed mechanical locations below the controller-owned provider-target record root. */
export type ProviderTargetRecordKind = "Identity" | "Receipt";

export interface ProviderProjectionRecordAddress {
  readonly scope: "Projection";
  readonly kind: ProviderProjectionRecordKind;
  readonly key: string;
}

export interface ProviderTargetRecordAddress {
  readonly scope: "Target";
  readonly kind: ProviderTargetRecordKind;
  readonly targetKey: string;
}

export type ProviderRecordAddress =
  | ProviderProjectionRecordAddress
  | ProviderTargetRecordAddress;

export interface ProviderRecordIdentity {
  readonly dev: number;
  readonly ino: number | null;
  readonly mode: number;
  readonly size: number;
  readonly mtimeMillis: number | null;
}

export type ProviderRecordObservation<A extends ProviderRecordAddress = ProviderRecordAddress> =
  | Readonly<{ kind: "Absent"; address: A }>
  | Readonly<{
    kind: "Present";
    address: A;
    identity: ProviderRecordIdentity;
    bytes: Uint8Array;
  }>;

export interface ProviderTargetRecordCapture {
  /** Provider-owned, process-local restore authority. */
  readonly handle: string;
  readonly readToken: string;
  readonly observation: ProviderRecordObservation<ProviderTargetRecordAddress>;
}

export type ProviderTargetRecordMutation =
  | Readonly<{ kind: "Put"; bytes: Uint8Array }>
  | Readonly<{ kind: "Remove" }>;

export interface ProviderRecordPublicationReceipt {
  readonly outcome: "Published" | "ReadOnlyConverged";
  readonly address: ProviderProjectionRecordAddress;
}

export interface ProviderTargetRecordWriteReceipt {
  readonly planDigest: string;
  readonly readToken: string;
  readonly outcome: "Applied" | "ReadOnlyConverged";
  readonly address: ProviderTargetRecordAddress;
}

export interface ProviderTargetRecordRestoreReceipt {
  readonly planDigest: string;
  readonly readToken: string;
  readonly outcome: "Restored";
  readonly address: ProviderTargetRecordAddress;
  readonly changed: boolean;
}

/** Receipt for discarding an unmutated capture without admitting a semantic plan. */
export interface ProviderTargetRecordReleaseReceipt {
  readonly readToken: string;
  readonly outcome: "Released";
  readonly handle: string;
}

export interface ProviderTargetRecordSettleReceipt {
  readonly planDigest: string;
  readonly readToken: string;
  readonly outcome: "Settled";
  readonly handle: string;
}

export type AgentProviderRecordsFailureReason =
  | "InvalidInput"
  | "MissingControllerRoot"
  | "Aliased"
  | "UnsupportedEntry"
  | "LimitExceeded"
  | "IdentityChanged"
  | "Occupied"
  | "FilesystemFailed"
  | "CleanupFailed"
  | "InvalidHandle"
  | "HandleConsumed"
  | "HandleState"
  | "WrongAddress"
  | "WrongToken"
  | "WrongPlan";

export interface AgentProviderRecordsFailure {
  readonly _tag: "AgentProviderRecordsFailure";
  readonly operation:
    | "read-projection"
    | "publish-projection"
    | "read-target"
    | "capture-target"
    | "release-target"
    | "write-target"
    | "restore-target"
    | "settle-target"
    | "cleanup";
  readonly reason: AgentProviderRecordsFailureReason;
  readonly phase: string;
  readonly path?: string;
  readonly detail: string;
}

/**
 * Mechanical record storage only. Callers own record codecs, semantic validity,
 * evidence, transition policy, and provider ownership.
 */
export interface AgentProviderRecordsResource<R = never> {
  readonly readProjection: (input: Readonly<{
    address: ProviderProjectionRecordAddress;
    maxBytes: number;
  }>) => Effect.Effect<
    ProviderRecordObservation<ProviderProjectionRecordAddress>,
    AgentProviderRecordsFailure,
    R
  >;

  readonly publishProjection: (input: Readonly<{
    address: ProviderProjectionRecordAddress;
    bytes: Uint8Array;
    maxBytes: number;
  }>) => Effect.Effect<ProviderRecordPublicationReceipt, AgentProviderRecordsFailure, R>;

  readonly readTarget: (input: Readonly<{
    address: ProviderTargetRecordAddress;
    maxBytes: number;
  }>) => Effect.Effect<
    ProviderRecordObservation<ProviderTargetRecordAddress>,
    AgentProviderRecordsFailure,
    R
  >;

  readonly captureTarget: (input: Readonly<{
    address: ProviderTargetRecordAddress;
    readToken: string;
    maxBytes: number;
  }>) => Effect.Effect<ProviderTargetRecordCapture, AgentProviderRecordsFailure, R>;

  /** Consumes only a still-unmutated capture. Mutated authority must be restored and settled. */
  readonly releaseTarget: (input: Readonly<{
    address: ProviderTargetRecordAddress;
    readToken: string;
    captureHandle: string;
  }>) => Effect.Effect<ProviderTargetRecordReleaseReceipt, AgentProviderRecordsFailure, R>;

  readonly writeTarget: (input: Readonly<{
    address: ProviderTargetRecordAddress;
    planDigest: string;
    readToken: string;
    captureHandle: string;
    mutation: ProviderTargetRecordMutation;
  }>) => Effect.Effect<ProviderTargetRecordWriteReceipt, AgentProviderRecordsFailure, R>;

  readonly restoreTarget: (input: Readonly<{
    address: ProviderTargetRecordAddress;
    planDigest: string;
    readToken: string;
    captureHandle: string;
  }>) => Effect.Effect<ProviderTargetRecordRestoreReceipt, AgentProviderRecordsFailure, R>;

  readonly settleTarget: (input: Readonly<{
    address: ProviderTargetRecordAddress;
    planDigest: string;
    readToken: string;
    captureHandle: string;
  }>) => Effect.Effect<ProviderTargetRecordSettleReceipt, AgentProviderRecordsFailure, R>;
}

/** Promise projection for callers that bind the provider runtime at their edge. */
export interface AgentProviderRecordsAsyncPort {
  readonly readProjection: (
    input: Parameters<AgentProviderRecordsResource["readProjection"]>[0],
  ) => Promise<ProviderRecordObservation<ProviderProjectionRecordAddress>>;
  readonly publishProjection: (
    input: Parameters<AgentProviderRecordsResource["publishProjection"]>[0],
  ) => Promise<ProviderRecordPublicationReceipt>;
  readonly readTarget: (
    input: Parameters<AgentProviderRecordsResource["readTarget"]>[0],
  ) => Promise<ProviderRecordObservation<ProviderTargetRecordAddress>>;
  readonly captureTarget: (
    input: Parameters<AgentProviderRecordsResource["captureTarget"]>[0],
  ) => Promise<ProviderTargetRecordCapture>;
  readonly releaseTarget: (
    input: Parameters<AgentProviderRecordsResource["releaseTarget"]>[0],
  ) => Promise<ProviderTargetRecordReleaseReceipt>;
  readonly writeTarget: (
    input: Parameters<AgentProviderRecordsResource["writeTarget"]>[0],
  ) => Promise<ProviderTargetRecordWriteReceipt>;
  readonly restoreTarget: (
    input: Parameters<AgentProviderRecordsResource["restoreTarget"]>[0],
  ) => Promise<ProviderTargetRecordRestoreReceipt>;
  readonly settleTarget: (
    input: Parameters<AgentProviderRecordsResource["settleTarget"]>[0],
  ) => Promise<ProviderTargetRecordSettleReceipt>;
}
