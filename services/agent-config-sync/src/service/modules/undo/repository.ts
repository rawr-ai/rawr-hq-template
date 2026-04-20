import { runUndoForWorkspace } from "./sync-undo";
import type { AgentConfigSyncResources } from "../../shared/resources";
import type { UndoRunResult } from "./contract";

export function createRepository(resources: AgentConfigSyncResources) {
  return {
    /**
     * Undo keeps the filesystem dependency injectable while sync-undo owns the
     * capsule rules. The router supplies the active module workspace root rather
     * than letting callers choose an arbitrary undo target.
     */
    async runUndo(input: { workspaceRoot: string; dryRun: boolean }): Promise<UndoRunResult> {
      return runUndoForWorkspace({ ...input, resources });
    },
  };
}
