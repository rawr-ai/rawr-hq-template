import { retireStaleManagedPlugins } from "../../shared/internal/retire-stale-managed";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../shared/resources";
import type { SyncScope } from "../../shared/schemas";
import type { RetireStaleManagedResult } from "./schemas";

export function createRepository(deps: {
  resources: AgentConfigSyncResources;
  undoCapture?: AgentConfigSyncUndoCapture;
}) {
  return {
    async retireStaleManaged(input: {
      workspaceRoot: string;
      scope: SyncScope;
      codexHomes: string[];
      claudeHomes: string[];
      activePluginNames: string[];
      dryRun: boolean;
    }): Promise<RetireStaleManagedResult> {
      return retireStaleManagedPlugins({
        ...input,
        activePluginNames: new Set(input.activePluginNames),
        undoCapture: input.dryRun ? undefined : deps.undoCapture,
        resources: deps.resources,
      });
    },
  };
}
