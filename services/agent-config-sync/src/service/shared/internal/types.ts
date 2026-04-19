import type {
  RawrPluginKind,
  SourceContent,
  SourcePlugin,
  SyncAction,
  SyncAgent,
  SyncItemResult,
  SyncRunResult,
  SyncScope,
  SyncTargetResult,
} from "../schemas";
import type {
  AgentConfigSyncResources,
  AgentConfigSyncUndoCapture,
} from "../resources";

export type {
  RawrPluginKind,
  SourceContent,
  SourcePlugin,
  SyncAction,
  SyncAgent,
  SyncItemResult,
  SyncRunResult,
  SyncScope,
  SyncTargetResult,
};

export type HostSourcePlugin = SourcePlugin;
export type HostSourceContent = SourceContent;

export type SyncOptions = {
  dryRun: boolean;
  force: boolean;
  gc: boolean;
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  undoCapture?: AgentConfigSyncUndoCapture;
  resources: AgentConfigSyncResources;
};

export type CodexRegistryClaims = {
  promptsByPlugin: Record<string, Set<string>>;
  skillsByPlugin: Record<string, Set<string>>;
  scriptsByPlugin: Record<string, Set<string>>;
};
