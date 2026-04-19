import { runSync as runServiceSync } from "./sync-engine";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../shared/resources";
import type { SyncExecutionInput } from "./schemas";

export function createRepository(deps: {
  resources: AgentConfigSyncResources;
  undoCapture?: AgentConfigSyncUndoCapture;
}) {
  return {
    /**
     * The execution repository is the apply boundary for plugin sync. Dry runs
     * intentionally discard undo capture so preview requests cannot create or
     * refresh capsules while still exercising the same conflict policy.
     */
    async runSync(input: SyncExecutionInput) {
      return runServiceSync({
        sourcePlugin: input.sourcePlugin,
        content: input.content,
        codexHomes: input.codexHomes,
        claudeHomes: input.claudeHomes,
        includeCodex: input.includeCodex,
        includeClaude: input.includeClaude,
        options: {
          dryRun: input.dryRun,
          force: input.force,
          gc: input.gc,
          includeAgentsInCodex: input.includeAgentsInCodex,
          includeAgentsInClaude: input.includeAgentsInClaude,
          undoCapture: input.dryRun ? undefined : deps.undoCapture,
          resources: deps.resources,
        },
      });
    },
  };
}
