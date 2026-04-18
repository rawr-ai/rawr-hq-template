import type { PlanningRuntime, SyncAssessment, SyncPreviewInput, WorkspaceSyncable } from "../../shared/ports/planning-runtime";
import type { SyncScope, TargetHomes, WorkspaceSkip } from "../../shared/schemas";

export function createRepository(runtime: PlanningRuntime | undefined) {
  return {
    async preview(input: SyncPreviewInput) {
      if (!runtime) {
        throw new Error("agent-config-sync planning runtime is not configured");
      }
      return runtime.previewSync(input);
    },
    async assessWorkspace(input: {
      workspaceRoot: string;
      syncable: WorkspaceSyncable[];
      skipped: WorkspaceSkip[];
      includeMetadata: boolean;
      scope: SyncScope;
      agent: "codex" | "claude" | "all";
      targetHomes: TargetHomes;
      includeAgentsInCodex?: boolean;
      includeAgentsInClaude?: boolean;
    }): Promise<SyncAssessment> {
      if (!runtime) {
        throw new Error("agent-config-sync planning runtime is not configured");
      }
      return runtime.assessWorkspace(input);
    },
  };
}
