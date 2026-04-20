import { retireStaleManagedPlugins } from "./retire-stale-managed";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../shared/resources";
import type { RetireStaleManagedInput, RetireStaleManagedResult } from "./contract";

export function createRepository(deps: {
  resources: AgentConfigSyncResources;
  undoCapture?: AgentConfigSyncUndoCapture;
}) {
  return {
    /**
     * Retirement receives active plugin names from discovery and removes only
     * managed entries absent from that set. Dry runs drop undo capture so stale
     * cleanup can be previewed without refreshing the active capsule.
     */
    async retireStaleManaged(input: RetireStaleManagedInput): Promise<RetireStaleManagedResult> {
      return retireStaleManagedPlugins({
        ...input,
        activePluginNames: new Set(input.activePluginNames),
        undoCapture: input.dryRun ? undefined : deps.undoCapture,
        resources: deps.resources,
      });
    },
  };
}
