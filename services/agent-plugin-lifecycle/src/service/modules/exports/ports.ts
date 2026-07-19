import type {
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
} from "./model/dto/export-lifecycle";
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
export interface ExportLifecycleHostRuntime {
  readonly knownNativeHomesReader: KnownNativeHomesReader;
  readonly undoWriter: UndoWriter;
  readonly destinationRuntime: ExportDestinationRuntime;
  readonly failpoints?: ExportFailpoints;
  readonly operationId?: () => string;
}

export type {
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

export type * from "./model/helpers/canonical";
export type * from "./model/dto/filesystem";
export type * from "./model/policy/inverse-action";
export type * from "./model/policy/layout";
export type * from "./model/policy/ledger";
export type * from "./model/policy/native-homes";
export type * from "./model/policy/owner-protocol";
export type * from "./model/policy/owner-sequence";
export type * from "./model/policy/plan";
