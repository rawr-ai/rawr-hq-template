import type { AgentSyncResolvedConfig, SyncPolicy } from "./types";

export function deriveSyncPolicy(cfg?: AgentSyncResolvedConfig): SyncPolicy {
  return {
    includeAgentsInCodex: cfg?.sync?.providers?.codex?.includeAgents ?? false,
    includeAgentsInClaude: cfg?.sync?.providers?.claude?.includeAgents ?? true,
  };
}
