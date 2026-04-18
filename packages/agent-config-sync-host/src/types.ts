export type AgentConfigSyncProvider = "codex" | "claude";
export type RawrPluginKind = "toolkit" | "agent" | "web";

export type AgentConfigSyncDestinationConfig = {
  enabled?: boolean;
  rootPath?: string | null;
};

export type AgentConfigSyncProviderConfig = {
  includeAgents?: boolean;
  destinations?: AgentConfigSyncDestinationConfig[];
};

export type AgentConfigSyncHostResolvedConfig = {
  sync?: {
    providers?: Partial<Record<AgentConfigSyncProvider, AgentConfigSyncProviderConfig>>;
  };
};

export type HostSourcePlugin = {
  ref: string;
  absPath: string;
  dirName: string;
  packageName?: string;
  description?: string;
  version?: string;
  rawrKind?: RawrPluginKind;
};

export type HostNamedFile = {
  name: string;
  absPath: string;
};

export type HostSourceContent = {
  workflowFiles: HostNamedFile[];
  skills: HostNamedFile[];
  scripts: HostNamedFile[];
  agentFiles: HostNamedFile[];
};

export type CodexRegistryClaims = {
  promptsByPlugin: Record<string, Set<string>>;
  skillsByPlugin: Record<string, Set<string>>;
  scriptsByPlugin: Record<string, Set<string>>;
};
