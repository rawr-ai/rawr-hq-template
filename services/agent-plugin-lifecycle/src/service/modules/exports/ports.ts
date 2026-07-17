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

export {
  CLAUDE_EXPORT_LAYOUT_V1,
  CODEX_EXPORT_LAYOUT_V1,
  EXPORT_APPLICATION_PROTOCOL_VERSION,
  KNOWN_NATIVE_HOMES_PROTOCOL_VERSION,
} from "./internal/contract";
export * from "./internal/canonical";
export * from "./internal/destination-owner";
export * from "./internal/filesystem-model";
export * from "./internal/inverse-action";
export * from "./internal/inverse-executor";
export * from "./internal/layout";
export * from "./internal/ledger";
export * from "./internal/native-homes";
export * from "./internal/owner-protocol";
export * from "./internal/owner-sequence";
export * from "./internal/plan";
export * from "./internal/transaction";
