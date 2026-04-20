import type {
  RawrPluginKind,
  SourceContent as ServiceSourceContent,
  SourcePlugin as ServiceSourcePlugin,
  SyncAgent,
  SyncScope,
} from "@rawr/agent-config-sync/types";

/**
 * Host-facing aliases for service-owned sync types.
 *
 * The projection reuses service contract types for calls and rendering, but it
 * does not define independent source-content or planning models.
 */
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

/**
 * Shape of destination config read by the CLI before service planning.
 */
export type AgentConfigSyncDestinationConfig = {
  rootPath?: string;
  enabled?: boolean;
};

/**
 * Provider config shape used only to normalize local config into service input.
 */
export type AgentConfigSyncProviderConfig = {
  destinations?: AgentConfigSyncDestinationConfig[];
};

/**
 * Minimal host config view needed to build sync planning requests.
 */
export type AgentConfigSyncHostResolvedConfig = {
  sync?: {
    providers?: Partial<Record<AgentConfigSyncProvider, AgentConfigSyncProviderConfig>>;
  };
};
