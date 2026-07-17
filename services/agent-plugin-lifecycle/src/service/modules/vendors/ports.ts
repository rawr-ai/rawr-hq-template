import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorRecordBinding,
  type VendorSourceDeclaration,
  type VendorSourceIdentity,
} from "./model/dto/vendor-records";

export {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorRecordBinding,
  type VendorSourceDeclaration,
  type VendorSourceIdentity,
} from "./model/dto/vendor-records";

export interface VendorContentWorkspaceRef {
  readonly locator: string;
  readonly repositoryIdentity: string;
  readonly contentAuthority: string;
  readonly refName: string;
  readonly sourceCommit: string;
  readonly sourceTree: string;
  readonly releaseInputPath: string;
}

export interface VendorStatusRequest {
  readonly contentWorkspace: VendorContentWorkspaceRef;
}

export interface VendorUpdateRequest extends VendorStatusRequest {
  readonly sourceIds: readonly string[];
}

export interface VendorSourceStatus {
  readonly sourceId: string;
  readonly classification:
    | "Current"
    | "UpdateAvailable"
    | "Held"
    | "Diverged"
    | "Invalid"
    | "Unavailable";
  readonly admitted: VendorSourceIdentity | null;
  readonly observed: VendorSourceIdentity | null;
  readonly detail?: string;
}

export interface VendorUpdateIssue {
  readonly code:
    | "UndeclaredSource"
    | "HeldSource"
    | "WrongRepository"
    | "WrongRef"
    | "NonFastForward"
    | "UnsupportedLayout"
    | "PayloadMismatch"
    | "LocalDrift"
    | "AuthoringFailed"
    | "RestorationFailed"
    | "CleanupFailed"
    | "RuntimeFailure";
  readonly detail: string;
  readonly sourceId?: string;
}

export type VendorStatusResult =
  | Readonly<{
    kind: "VendorStatus";
    sources: readonly VendorSourceStatus[];
  }>
  | Readonly<{
    kind: "Rejected";
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
  }>;

export type VendorUpdateResult =
  | Readonly<{
    kind: "ReadOnlyConverged";
    sourceIds: readonly string[];
  }>
  | Readonly<{
    kind: "AuthoredReviewableChanges";
    sourceIds: readonly string[];
    changedPaths: readonly string[];
  }>
  | Readonly<{
    kind: "Rejected";
    sourceIds: readonly string[];
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
  }>
  | Readonly<{
    kind: "FailedRestored";
    sourceIds: readonly string[];
    restoredPaths: readonly string[];
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
  }>
  | Readonly<{
    kind: "RestorationFailed";
    sourceIds: readonly string[];
    unsettledPaths: readonly string[];
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
  }>;

export type VendorDestinationObservation =
  | Readonly<{ kind: "Present"; payloadDigest: string }>
  | Readonly<{ kind: "Missing" }>
  | Readonly<{ kind: "Invalid"; detail: string }>;

export interface VendorDeclaredSourceObservation {
  /** The release-input member that owns both vendor bindings. */
  readonly memberPluginId: string;
  readonly declarationBinding: VendorRecordBinding;
  /** Digest of the exact canonical declaration bytes read by the controller adapter. */
  readonly declarationContentDigest: string;
  readonly declaration: VendorSourceDeclaration;
  readonly provenanceBinding: VendorRecordBinding | null;
  /** Digest of the exact canonical provenance bytes read by the controller adapter. */
  readonly provenanceContentDigest: string | null;
  readonly provenance: VendorProvenanceRecord | null;
  readonly lockBinding: VendorRecordBinding | null;
  /** Digest of the exact canonical lock bytes read by the controller adapter. */
  readonly lockContentDigest: string | null;
  readonly lock: VendorLockRecord | null;
  readonly destination: VendorDestinationObservation;
}

export interface VendorWorkspaceObservation {
  readonly contentWorkspace: Omit<VendorContentWorkspaceRef, "locator">;
  /** Digest of every versioned record and selected destination byte read. */
  readonly snapshotDigest: string;
  readonly sources: readonly VendorDeclaredSourceObservation[];
}

export type VendorWorkspaceReadResult =
  | Readonly<{ kind: "Observed"; observation: VendorWorkspaceObservation }>
  | Readonly<{ kind: "Invalid"; issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] }>
  | Readonly<{ kind: "Unavailable"; detail: string }>;

export interface VendorRepositoryObserver {
  /** Reads exact versioned records and selected destination bytes without writing. */
  observe(contentWorkspace: VendorContentWorkspaceRef): Promise<VendorWorkspaceReadResult>;
}

export interface VendorPayloadEntry {
  readonly path: string;
  readonly mode: "100644" | "100755";
  readonly blob: string;
}

export interface VendorUpstreamQuery {
  readonly sourceId: string;
  readonly repositoryIdentity: string;
  readonly refName: string;
  readonly sourcePath: string;
  readonly admitted: VendorSourceIdentity;
}

export type VendorUpstreamReadResult =
  | Readonly<{
    kind: "Observed";
    repositoryIdentity: string;
    refName: string;
    sourcePath: string;
    identity: VendorSourceIdentity;
    /** Controller-supplied observation time; the service has no ambient clock. */
    observedAt: string;
    ancestry: "same" | "fast-forward" | "diverged";
    entries: readonly VendorPayloadEntry[];
  }>
  | Readonly<{ kind: "Unavailable"; detail: string }>
  | Readonly<{ kind: "CleanupFailed"; detail: string }>
  | Readonly<{ kind: "Invalid"; detail: string }>;

export interface VendorPreparedPayloadEntry extends VendorPayloadEntry {
  readonly bytes: Uint8Array;
}

export interface VendorPreparedPayload {
  readonly identity: VendorSourceIdentity;
  readonly entries: readonly VendorPreparedPayloadEntry[];
}

export interface VendorPayloadPreparationQuery extends VendorUpstreamQuery {
  readonly expected: VendorSourceIdentity;
  readonly expectedEntries: readonly VendorPayloadEntry[];
}

export type VendorPayloadPreparationResult =
  | Readonly<{
    kind: "Prepared";
    payload: VendorPreparedPayload;
    /** Controller-supplied observation time for the materialized candidate. */
    observedAt: string;
  }>
  | Readonly<{ kind: "Stale"; detail: string }>
  | Readonly<{ kind: "Unavailable"; detail: string }>
  | Readonly<{ kind: "CleanupFailed"; detail: string }>
  | Readonly<{ kind: "Invalid"; detail: string }>;

export interface VendorUpstreamObserver {
  /** Reads ref/tree metadata only; converged and status calls materialize no payload bytes. */
  observe(query: VendorUpstreamQuery): Promise<VendorUpstreamReadResult>;
  /**
   * Returns self-contained bytes only after an update was classified. Any
   * operation-private Git materialization is cleaned before this call returns.
   */
  prepare(query: VendorPayloadPreparationQuery): Promise<VendorPayloadPreparationResult>;
}

export interface VendorSourceChange {
  readonly sourceId: string;
  readonly prior: VendorSourceIdentity;
  readonly next: VendorSourceIdentity;
  readonly memberPluginId: string;
  readonly declarationBinding: VendorRecordBinding;
  readonly provenanceBinding: VendorRecordBinding;
  readonly lockBinding: VendorRecordBinding;
  readonly priorRecords: Readonly<{
    declaration: VendorSourceDeclaration;
    provenance: VendorProvenanceRecord;
    lock: VendorLockRecord;
  }>;
  /** Structured record truth; the controller adapter owns canonical bytes and binding-digest updates. */
  readonly nextRecords: Readonly<{
    declaration: VendorSourceDeclaration;
    provenance: VendorProvenanceRecord;
    lock: VendorLockRecord;
  }>;
  readonly payload: VendorPreparedPayload;
  readonly declarationPath: string;
  readonly destinationPath: string;
  readonly provenancePath: string;
  readonly lockPath: string;
}

export interface VendorAuthoringPlan {
  readonly contentWorkspace: VendorContentWorkspaceRef;
  readonly expectedSnapshotDigest: string;
  readonly releaseInputPath: string;
  readonly sourceChanges: readonly VendorSourceChange[];
  readonly changedPaths: readonly string[];
}

export type VendorPreimageCaptureResult =
  | Readonly<{ kind: "Captured"; preimageHandle: string }>
  | Readonly<{ kind: "Stale"; detail: string }>
  | Readonly<{ kind: "Failed"; detail: string }>;

export type VendorAuthoringApplyResult =
  | Readonly<{ kind: "Applied"; changedPaths: readonly string[] }>
  | Readonly<{ kind: "Converged" }>
  | Readonly<{ kind: "FailedBeforeMutation"; detail: string }>
  | Readonly<{
    kind: "FailedAfterMutation";
    mutatedPaths: readonly string[];
    detail: string;
  }>;

export type VendorRestorationResult =
  | Readonly<{ kind: "Restored"; restoredPaths: readonly string[] }>
  | Readonly<{ kind: "Failed"; unsettledPaths: readonly string[]; detail: string }>;

/**
 * Concrete I/O remains controller-owned. The service owns source selection,
 * classification, transition ordering, authoring plans, and public outcomes.
 */
export interface VendorRepositoryAuthor {
  /** Captures an operation-local preimage while atomically checking the snapshot. */
  capture(plan: VendorAuthoringPlan): Promise<VendorPreimageCaptureResult>;
  /** The preimage remains available until post-apply service verification finishes. */
  apply(plan: VendorAuthoringPlan, preimageHandle: string): Promise<VendorAuthoringApplyResult>;
  /** Restores only the exact plan paths; failed restoration retains its evidence. */
  restore(plan: VendorAuthoringPlan, preimageHandle: string): Promise<VendorRestorationResult>;
}

export interface VendorLifecycleRuntime {
  readonly repository: VendorRepositoryObserver;
  readonly upstream: VendorUpstreamObserver;
  readonly authoring: VendorRepositoryAuthor;
}
