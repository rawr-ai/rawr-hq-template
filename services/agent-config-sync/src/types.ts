/**
 * @fileoverview Public DTO aliases for the agent-config-sync service package.
 */
export type {
  RawrPluginKind,
  SourceContent,
  SourcePlugin,
  SyncAgent,
  SyncScope,
} from "./service/shared/schemas";
export type {
  SyncItemResult,
  SyncRunResult,
} from "./service/modules/execution/contract";
export type {
  AssessWorkspaceSyncInput,
  FullSyncPolicyInput,
  FullSyncPolicyResult,
  PlanWorkspaceSyncInput,
  SyncAssessment,
  WorkspaceSyncPlan,
} from "./service/modules/planning/contract";
export type { UndoRunResult } from "./service/modules/undo/contract";
