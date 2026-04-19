import { runUndoForWorkspace } from "../../shared/internal/sync-undo";
import type { AgentConfigSyncResources } from "../../shared/resources";
import type { UndoRunResult } from "./schemas";

export function createRepository(resources: AgentConfigSyncResources) {
  return {
    async runUndo(input: { workspaceRoot: string; dryRun: boolean }): Promise<UndoRunResult> {
      return runUndoForWorkspace({ ...input, resources });
    },
  };
}
