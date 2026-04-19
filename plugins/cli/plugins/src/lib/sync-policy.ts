type LayeredSyncConfig = {
  sync?: {
    providers?: {
      codex?: {
        includeAgents?: boolean;
      };
      claude?: {
        includeAgents?: boolean;
      };
    };
  };
};

export type SyncPolicy = {
  includeAgentsInCodex: boolean;
  includeAgentsInClaude: boolean;
};

export function deriveSyncPolicy(cfg?: LayeredSyncConfig): SyncPolicy {
  return {
    includeAgentsInCodex: cfg?.sync?.providers?.codex?.includeAgents ?? false,
    includeAgentsInClaude: cfg?.sync?.providers?.claude?.includeAgents ?? true,
  };
}
