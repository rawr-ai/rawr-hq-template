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
import type { DestinationIdentity } from "./internal/filesystem-model";
import type { RenderedExportSelection } from "./internal/layout";
import type {
  DestinationExportPlan,
  DestinationPlanningResult,
} from "./internal/plan";
import type {
  DestinationTransactionResult,
  ExportMutationSession,
} from "./internal/transaction";

export interface ExportDestinationRuntime {
  captureDestination(input: string): Promise<DestinationIdentity>;
  buildDestinationExportPlan(
    destination: DestinationIdentity,
    layout: ExportLayoutV1,
    selection: Exclude<RenderedExportSelection, { ok: false }>,
    overwritePolicy: ExportOverwritePolicyV1,
  ): Promise<DestinationPlanningResult>;
  executeDestinationPlan(
    plan: DestinationExportPlan,
    session: ExportMutationSession,
    expectedActionEndIndex?: number,
  ): Promise<DestinationTransactionResult>;
}

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
};

export {
  CLAUDE_EXPORT_LAYOUT_V1,
  CODEX_EXPORT_LAYOUT_V1,
  EXPORT_APPLICATION_PROTOCOL_VERSION,
  KNOWN_NATIVE_HOMES_PROTOCOL_VERSION,
} from "./internal/contract";
export * from "./internal/canonical";
export * from "./internal/filesystem-model";
export * from "./internal/inverse-action";
export * from "./internal/layout";
export * from "./internal/ledger";
export * from "./internal/native-homes";
export * from "./internal/owner-protocol";
export * from "./internal/owner-sequence";
export * from "./internal/plan";
export * from "./internal/transaction";
