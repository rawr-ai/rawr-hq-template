import type { RetireStaleManagedResult, RetirementRuntime } from "../../shared/ports/retirement-runtime";
import type { SyncScope } from "../../shared/schemas";

export function createRepository(runtime: RetirementRuntime | undefined) {
  return {
    async retireStaleManaged(input: {
      workspaceRoot: string;
      scope: SyncScope;
      codexHomes: string[];
      claudeHomes: string[];
      activePluginNames: string[];
      dryRun: boolean;
    }): Promise<RetireStaleManagedResult> {
      if (!runtime) {
        throw new Error("agent-config-sync retirement runtime is not configured");
      }
      return runtime.retireStaleManaged({
        ...input,
        activePluginNames: new Set(input.activePluginNames),
      });
    },
  };
}
