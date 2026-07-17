import type {
  ArtifactReadIssue,
  ArtifactReadResult,
  ArtifactReader,
  ExportAgentPluginsRequest,
  ExportAgentPluginsResult,
  ExportAppliedEvent,
  ExportDestinationResult,
  ExportFailpoints,
  ExportFailpoint,
  ExportFailure,
  ExportFailureCode,
  ExportFailureSet,
  ExportLayoutV1,
  ExportModeV1,
  ExportOverwritePolicyV1,
  ExportReleaseResult,
  ExportSynchronizationResult,
  KnownNativeHomeV1,
  KnownNativeHomesReader,
  KnownNativeHomesSnapshotV1,
  UndoApplyingSession,
  UndoBeginResult,
  UndoCandidateInput,
  UndoFailure,
  UndoPreflightResult,
  UndoReleaseResult,
  UndoSuspendResult,
  UndoSynchronizationResult,
  UndoTerminalWriteResult,
  UndoWriteResult,
  UndoWriter,
} from "./internal/contract";
import type {
  ExportDestinationApplyReceipt,
  ExportDestinationAsyncPort,
  ExportDestinationCapture,
  ExportDestinationDirectoryChild,
  ExportDestinationDirectoryStat,
  ExportDestinationEntryIdentity,
  ExportDestinationEntryObservation,
  ExportDestinationFailure as ExportDestinationResourceFailure,
  ExportDestinationFailureReason,
  ExportDestinationFileStat,
  ExportDestinationMutation,
  ExportDestinationReleaseReceipt,
  ExportDestinationRestoreReceipt,
  ExportDestinationSettleReceipt,
  ExportDestinationSnapshot,
} from "@rawr/resource-agent-plugin-export-destination";

export type ExportDestinationRuntime = ExportDestinationAsyncPort;

/**
 * Construction-time capabilities used by the export state machine.
 *
 * Undo is intentionally write-only: this port cannot inspect, clear, replay,
 * or otherwise own the controller capsule.
 */
export interface ExportLifecycleRuntime {
  readonly artifactReader: ArtifactReader;
  readonly knownNativeHomesReader: KnownNativeHomesReader;
  readonly undoWriter: UndoWriter;
  readonly destinationRuntime: ExportDestinationRuntime;
  readonly failpoints?: ExportFailpoints;
  readonly operationId?: () => string;
}

export type {
  ArtifactReadIssue,
  ArtifactReadResult,
  ArtifactReader,
  ExportAgentPluginsRequest,
  ExportAgentPluginsResult,
  ExportAppliedEvent,
  ExportDestinationResult,
  ExportFailpoints,
  ExportFailpoint,
  ExportFailure,
  ExportFailureCode,
  ExportFailureSet,
  ExportLayoutV1,
  ExportModeV1,
  ExportOverwritePolicyV1,
  ExportReleaseResult,
  ExportSynchronizationResult,
  KnownNativeHomeV1,
  KnownNativeHomesReader,
  KnownNativeHomesSnapshotV1,
  UndoApplyingSession,
  UndoBeginResult,
  UndoCandidateInput,
  UndoFailure,
  UndoPreflightResult,
  UndoReleaseResult,
  UndoSuspendResult,
  UndoSynchronizationResult,
  UndoTerminalWriteResult,
  UndoWriteResult,
  UndoWriter,
  ExportDestinationApplyReceipt,
  ExportDestinationAsyncPort,
  ExportDestinationCapture,
  ExportDestinationDirectoryChild,
  ExportDestinationDirectoryStat,
  ExportDestinationEntryIdentity,
  ExportDestinationEntryObservation,
  ExportDestinationResourceFailure,
  ExportDestinationFailureReason,
  ExportDestinationFileStat,
  ExportDestinationMutation,
  ExportDestinationReleaseReceipt,
  ExportDestinationRestoreReceipt,
  ExportDestinationSettleReceipt,
  ExportDestinationSnapshot,
};

export type * from "./internal/canonical";
export type * from "./internal/destination-owner";
export type * from "./internal/filesystem-model";
export type * from "./internal/inverse-action";
export type * from "./internal/inverse-executor";
export type * from "./internal/layout";
export type * from "./internal/ledger";
export type * from "./internal/native-homes";
export type * from "./internal/owner-protocol";
export type * from "./internal/owner-sequence";
export type * from "./internal/plan";
export type * from "./internal/transaction";
