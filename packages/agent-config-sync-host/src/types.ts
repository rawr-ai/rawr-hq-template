export type AgentConfigSyncProvider = "codex" | "claude";
export type RawrPluginKind = "toolkit" | "agent" | "web";
export type SyncAgent = AgentConfigSyncProvider;
export type SyncScope = "all" | "agents" | "cli" | "web";
export type SyncAction = "copied" | "updated" | "skipped" | "deleted" | "conflict" | "planned";

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

export type SourcePlugin = HostSourcePlugin;
export type SourceContent = HostSourceContent;

export type SyncPolicy = {
  includeAgentsInCodex: boolean;
  includeAgentsInClaude: boolean;
};

export type SyncItemResult = {
  action: SyncAction;
  kind: "workflow" | "skill" | "script" | "agent" | "metadata";
  source?: string;
  target: string;
  message?: string;
};

export type SyncTargetResult = {
  agent: SyncAgent;
  home: string;
  items: SyncItemResult[];
  conflicts: SyncItemResult[];
};

export type SyncRunResult = {
  ok: boolean;
  sourcePlugin: SourcePlugin;
  scanned: {
    workflows: string[];
    skills: string[];
    scripts: string[];
    agents: string[];
  };
  targets: SyncTargetResult[];
};

export type SyncOptions = {
  dryRun: boolean;
  force: boolean;
  gc: boolean;
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  undoCapture?: {
    captureWriteTarget(target: string): Promise<void>;
    captureDeleteTarget(target: string): Promise<void>;
  };
};

export type CodexRegistryClaims = {
  promptsByPlugin: Record<string, Set<string>>;
  skillsByPlugin: Record<string, Set<string>>;
  scriptsByPlugin: Record<string, Set<string>>;
};
