import type {
  ArtifactRef,
  VerifiedArtifactSnapshotV1,
} from "../../../../shared/release/index";

import type {
  ExportAppliedObservationV1,
  ExportInverseActionDigest,
  ExportInverseActionV1,
} from "../policy/inverse-action";
import type { ExportLedgerDigest } from "../policy/ledger";

export const CODEX_EXPORT_LAYOUT_V1 = "codex-v1" as const;
export const CLAUDE_EXPORT_LAYOUT_V1 = "claude-v1" as const;
export const KNOWN_NATIVE_HOMES_PROTOCOL_VERSION = 1 as const;
export const EXPORT_APPLICATION_PROTOCOL_VERSION = 1 as const;

export type ExportLayoutV1 = typeof CODEX_EXPORT_LAYOUT_V1 | typeof CLAUDE_EXPORT_LAYOUT_V1;
export type ExportModeV1 = "targeted-release" | "complete-set";
export type ExportOverwritePolicyV1 = "managed-only" | "replace-planned";
export type KnownNativeHomesSnapshotDigest = `nh1_${string}`;

export interface ExportAgentPluginsRequest {
  readonly protocolVersion: typeof EXPORT_APPLICATION_PROTOCOL_VERSION;
  readonly artifactRef: ArtifactRef;
  readonly mode: ExportModeV1;
  readonly layout: ExportLayoutV1;
  readonly destinations: readonly string[];
  readonly overwritePolicy: ExportOverwritePolicyV1;
}

export interface KnownNativeHomeV1 {
  readonly provider: "codex" | "claude";
  readonly canonicalPath: string;
}

export interface KnownNativeHomesSnapshotV1 {
  readonly protocolVersion: typeof KNOWN_NATIVE_HOMES_PROTOCOL_VERSION;
  readonly completeness: "complete";
  readonly homes: readonly KnownNativeHomeV1[];
  readonly snapshotDigest: KnownNativeHomesSnapshotDigest;
}

export type KnownNativeHomesReadResult =
  | Readonly<{ kind: "Verified"; snapshot: KnownNativeHomesSnapshotV1 }>
  | Readonly<{ kind: "Unavailable"; failure: ExportFailure }>;

export interface KnownNativeHomesReader {
  readCompleteSnapshot(): Promise<KnownNativeHomesReadResult>;
}

export interface ArtifactReadIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
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

export interface UndoFailure {
  readonly code: string;
  readonly phase: string;
  readonly message: string;
  readonly path?: string;
  readonly cleanup?: Readonly<{
    code: string;
    message: string;
    path: string;
  }>;
}

export type UndoBeginResult =
  | Readonly<{
    kind: "Accepted";
    generation: string;
    admittedActions: readonly Readonly<{
      actionHandle: string;
    }>[];
    session: UndoApplyingSession;
  }>
  | Readonly<{
    kind: "Unsettled";
    generation: string;
    failure: UndoFailure;
    recoveryRequired: true;
    synchronization: UndoReleaseResult;
  }>
  | Readonly<{
    kind: "Rejected";
    failure: UndoFailure;
    synchronization: UndoSynchronizationResult;
  }>;

export type UndoWriteResult =
  | Readonly<{ kind: "Accepted"; generation: string }>
  | Readonly<{
    kind: "Unsettled";
    generation: string;
    failure: UndoFailure;
    recoveryRequired: true;
    synchronization: UndoReleaseResult;
  }>
  | Readonly<{ kind: "Rejected"; failure: UndoFailure }>;

export type UndoPreflightResult =
  | Readonly<{ kind: "Accepted" }>
  | Readonly<{ kind: "Rejected"; failure: UndoFailure }>;

export type UndoSuspendResult =
  | Readonly<{ kind: "Released" }>
  | Readonly<{ kind: "Rejected"; failure: UndoFailure }>;

export type UndoReleaseResult =
  | Readonly<{ kind: "Released" }>
  | Readonly<{ kind: "ReleaseFailed"; failure: UndoFailure }>;

export type UndoSynchronizationResult =
  | UndoReleaseResult
  | Readonly<{ kind: "NotAcquired" }>;

export type UndoTerminalWriteResult = UndoWriteResult & Readonly<{
  synchronization: UndoReleaseResult;
}>;

export interface UndoCandidateInput {
  readonly owner: "agent-plugin-export";
  readonly ownerProtocolVersion: 1;
  readonly contentAuthority: string;
  readonly targets: readonly Readonly<{
    canonicalTarget: string;
    authorityGeneration: string;
    authorityDigest: ExportLedgerDigest;
  }>[];
  readonly actions: readonly Readonly<{
    action: ExportInverseActionV1;
  }>[];
}

export interface UndoWriter {
  preflight(input: UndoCandidateInput): Promise<UndoPreflightResult>;
  begin(input: UndoCandidateInput): Promise<UndoBeginResult>;
}

export interface UndoApplyingSession {
  stage(input: Readonly<{
    actionHandle: string;
  }>): Promise<UndoWriteResult>;
  discardStaged(input: Readonly<{ actionHandle: string }>): Promise<UndoWriteResult>;
  markApplied(input: Readonly<{
    actionHandle: string;
    observedPost: ExportAppliedObservationV1;
  }>): Promise<UndoWriteResult>;
  settle(): Promise<UndoTerminalWriteResult>;
  abort(): Promise<UndoTerminalWriteResult>;
  suspend(): Promise<UndoSuspendResult>;
}

export type ExportFailureCode =
  | "InvalidRequest"
  | "ArtifactMissing"
  | "ArtifactMismatch"
  | "ArtifactSnapshotMismatch"
  | "NativeHomesUnavailable"
  | "NativeHomesInvalid"
  | "NativeHomeOverlap"
  | "DestinationUnsafe"
  | "DuplicateDestination"
  | "LedgerInvalid"
  | "LedgerGenerationChanged"
  | "LayoutMismatch"
  | "UnmanagedCollision"
  | "ManagedStateMismatch"
  | "PathUnsafe"
  | "PathChanged"
  | "TemporaryCreateFailed"
  | "TemporaryWriteFailed"
  | "TemporaryVerifyFailed"
  | "TemporaryCleanupBlocked"
  | "TemporaryCleanupFailed"
  | "MutationFailed"
  | "VerificationFailed"
  | "LedgerCommitFailed"
  | "UndoAdmissionFailed"
  | "UndoStageFailed"
  | "UndoSettlementFailed"
  | "InverseActionInvalid"
  | "InverseAuthorityMismatch"
  | "InverseStateMismatch"
  | "FailpointFailed";

export interface ExportFailure {
  readonly code: ExportFailureCode;
  readonly phase: string;
  readonly message: string;
  readonly path?: string;
}

export type ExportFailureSet =
  | Readonly<{ kind: "PrimaryOnly"; primary: ExportFailure }>
  | Readonly<{ kind: "PrimaryAndCleanup"; primary: ExportFailure; cleanup: ExportFailure }>;

export interface ExportAppliedEvent {
  readonly mutation: "CreateDirectory" | "WritePayload" | "RetirePayload" | "RetireDirectory" | "WriteLedger";
  readonly pluginId: string | "@ledger";
  readonly relativePath: string;
  readonly actionDigest: ExportInverseActionDigest;
}

export type ExportReleaseResult =
  | Readonly<{ kind: "Released" }>
  | Readonly<{ kind: "ReleaseFailed"; failure: ExportFailure }>;

export type ExportSynchronizationResult =
  | ExportReleaseResult
  | Readonly<{ kind: "NotAcquired" }>;

interface DestinationIdentity {
  readonly destination: string;
  readonly layout: ExportLayoutV1;
}

export type ExportDestinationResult =
  | (DestinationIdentity & Readonly<{
    kind: "ReadOnlyConverged";
    ledgerGeneration: number;
  }>)
  | (DestinationIdentity & Readonly<{
    kind: "RejectedBeforeMutation";
    failures: ExportFailureSet;
  }>)
  | (DestinationIdentity & Readonly<{
    kind: "MutatedSettled";
    ledgerGeneration: number;
    applied: readonly ExportAppliedEvent[];
    verifiedPaths: readonly string[];
    retiredPaths: readonly string[];
    preservedPaths: readonly string[];
  }>)
  | (DestinationIdentity & Readonly<{
    kind: "MutatedUnsettled";
    applied: readonly ExportAppliedEvent[];
    failures: ExportFailureSet;
    pendingCapsuleGeneration: string;
    recoveryRequired: true;
  }>);

export type ExportAgentPluginsResult =
  | Readonly<{
    protocolVersion: typeof EXPORT_APPLICATION_PROTOCOL_VERSION;
    kind: "ReadOnlyConverged";
    destinations: readonly Extract<ExportDestinationResult, { kind: "ReadOnlyConverged" }>[];
  }>
  | Readonly<{
    protocolVersion: typeof EXPORT_APPLICATION_PROTOCOL_VERSION;
    kind: "RejectedBeforeMutation";
    failure: ExportFailure;
    destinations: readonly ExportDestinationResult[];
    synchronization: ExportSynchronizationResult;
  }>
  | Readonly<{
    protocolVersion: typeof EXPORT_APPLICATION_PROTOCOL_VERSION;
    kind: "MutatedSettled";
    destinations: readonly Exclude<ExportDestinationResult, { kind: "MutatedUnsettled" }>[];
    synchronization: ExportReleaseResult;
  }>
  | Readonly<{
    protocolVersion: typeof EXPORT_APPLICATION_PROTOCOL_VERSION;
    kind: "MutatedUnsettled";
    pendingCapsuleGeneration: string;
    destinations: readonly ExportDestinationResult[];
    synchronization: ExportReleaseResult;
  }>;

export type ExportFailpoint =
  | "AfterPlan"
  | "AfterInverseStaged"
  | "AfterDirectoriesCreated"
  | "AfterTemporaryCreated"
  | "AfterTemporaryWritten"
  | "BeforePayloadCommit"
  | "AfterPayloadCommit"
  | "BeforePublicationFinalize"
  | "BeforePayloadVerify"
  | "BeforeRetirement"
  | "AfterRetirement"
  | "BeforeDirectoryRetirement"
  | "BeforeLedgerCommit"
  | "AfterLedgerCommit"
  | "BeforeFinalVerify"
  | "BeforeTemporaryCleanup";

export interface ExportFailpointContext {
  readonly destination: string;
  readonly relativePath?: string;
  readonly temporaryPath?: string;
}

export interface ExportFailpoints {
  hit(point: ExportFailpoint, context: ExportFailpointContext): Promise<void>;
}
