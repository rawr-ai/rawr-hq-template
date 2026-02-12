export type SyncAgent = "codex" | "claude";
export type SyncScope = "all" | "agents" | "cli" | "web";

export type RawrPluginKind = "toolkit" | "agent" | "web";

export type SourcePlugin = {
  ref: string;
  absPath: string;
  dirName: string;
  packageName?: string;
  description?: string;
  version?: string;
  rawrKind?: RawrPluginKind;
};

export type SourceContent = {
  workflowFiles: Array<{ name: string; absPath: string }>;
  skills: Array<{ name: string; absPath: string }>;
  scripts: Array<{ name: string; absPath: string }>;
  agentFiles: Array<{ name: string; absPath: string }>;
};

export type SyncAction = "copied" | "updated" | "skipped" | "deleted" | "conflict" | "planned";

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

export type ClaimedSets = {
  promptsByPlugin: Record<string, Set<string>>;
  skillsByPlugin: Record<string, Set<string>>;
  scriptsByPlugin: Record<string, Set<string>>;
};
