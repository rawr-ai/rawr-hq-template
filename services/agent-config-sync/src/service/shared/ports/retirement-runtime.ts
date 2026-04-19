import type { SyncScope } from "../schemas";

export type RetireAction = {
  agent: "codex" | "claude";
  home: string;
  plugin: string;
  target: string;
  action: "planned" | "deleted" | "updated" | "skipped" | "failed";
  message?: string;
};

export type RetireStaleManagedResult = {
  ok: boolean;
  stalePlugins: Array<{ agent: "codex" | "claude"; home: string; plugin: string }>;
  actions: RetireAction[];
};

export interface RetirementRuntime {
  retireStaleManaged(input: {
    workspaceRoot: string;
    scope: SyncScope;
    codexHomes: string[];
    claudeHomes: string[];
    activePluginNames: Set<string>;
    dryRun: boolean;
  }): Promise<RetireStaleManagedResult>;
}
