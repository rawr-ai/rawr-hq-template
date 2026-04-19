import type {
  RawrPluginKind,
  SourceContent as ServiceSourceContent,
  SourcePlugin as ServiceSourcePlugin,
  SyncAgent,
  SyncScope,
} from "@rawr/agent-config-sync/types";

export type AgentConfigSyncProvider = SyncAgent;
export type {
  RawrPluginKind,
  SyncAgent,
  SyncScope,
};

export type HostSourcePlugin = ServiceSourcePlugin;
export type HostSourceContent = ServiceSourceContent;
export type SourcePlugin = HostSourcePlugin;
export type SourceContent = HostSourceContent;

export type AgentConfigSyncDestinationConfig = {
  rootPath?: string;
  enabled?: boolean;
};

export type AgentConfigSyncProviderConfig = {
  destinations?: AgentConfigSyncDestinationConfig[];
};

export type AgentConfigSyncHostResolvedConfig = {
  sync?: {
    providers?: Partial<Record<AgentConfigSyncProvider, AgentConfigSyncProviderConfig>>;
  };
};
