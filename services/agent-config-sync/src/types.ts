/**
 * @fileoverview Public DTO aliases for the agent-config-sync service package.
 */
export type {
  RawrPluginKind,
  ContentFile,
  DistributionMode,
  EvidenceLevel,
  MaterialKind,
  OrchestrationSpec,
  ProjectionSupportStatus,
  ProviderKey,
  SemanticCapabilityKind,
  SourceContent,
  SourcePlugin,
  SupportStatus,
  SyncAgent,
  SyncScope,
} from "./service/shared/entities";
export type {
  ProjectionSupport,
  ProviderProjection,
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
