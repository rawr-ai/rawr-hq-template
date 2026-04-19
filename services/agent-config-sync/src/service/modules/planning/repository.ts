import { runSync as runServiceSync } from "../execution/sync-engine";
import { resolveSourceScopeForPath, scopeAllows } from "../../shared/internal/source-scope";
import type { AgentConfigSyncResources } from "../../shared/resources";
import type { SyncScope } from "../../shared/schemas";
import type { SyncAssessment, SyncPreviewInput, TargetHomes, WorkspaceSkip, WorkspaceSyncable } from "./schemas";

function summarizeWorkspaceRun(input: {
  runs: Awaited<ReturnType<typeof runServiceSync>>[];
  skipped: WorkspaceSkip[];
  includeMetadata: boolean;
  scope: SyncScope;
}): SyncAssessment {
  let totalTargets = 0;
  let totalConflicts = 0;
  let totalMaterialChanges = 0;
  let totalMetadataChanges = 0;
  let totalDriftItems = 0;

  const plugins = input.runs.map((run) => {
    let conflicts = 0;
    let materialChanges = 0;
    let metadataChanges = 0;
    const driftItems: SyncAssessment["plugins"][number]["driftItems"] = [];

    for (const target of run.targets) {
      totalTargets += 1;
      conflicts += target.conflicts.length;
      totalConflicts += target.conflicts.length;

      const nonSkipped = target.items.filter((item) => item.action !== "skipped");
      const metadata = nonSkipped.filter((item) => item.kind === "metadata");
      const material = nonSkipped.filter((item) => item.kind !== "metadata");
      const drift = nonSkipped.filter((item) => input.includeMetadata || item.kind !== "metadata");

      metadataChanges += metadata.length;
      materialChanges += material.length;
      totalMetadataChanges += metadata.length;
      totalMaterialChanges += material.length;
      totalDriftItems += drift.length;

      driftItems.push(
        ...drift.map((item) => ({
          action: item.action,
          kind: item.kind,
          target: item.target,
          message: item.message,
        })),
      );
    }

    return {
      dirName: run.sourcePlugin.dirName,
      absPath: run.sourcePlugin.absPath,
      conflicts,
      materialChanges,
      metadataChanges,
      driftItems,
    };
  });

  return {
    status: totalConflicts > 0 ? "CONFLICTS" : totalDriftItems > 0 ? "DRIFT_DETECTED" : "IN_SYNC",
    includeMetadata: input.includeMetadata,
    scope: input.scope,
    summary: {
      totalPlugins: plugins.length,
      totalTargets,
      totalConflicts,
      totalMaterialChanges,
      totalMetadataChanges,
      totalDriftItems,
    },
    skipped: input.skipped,
    plugins,
  };
}

export function createRepository(resources: AgentConfigSyncResources) {
  return {
    async preview(input: SyncPreviewInput) {
      return runServiceSync({
        sourcePlugin: input.sourcePlugin,
        content: input.content,
        codexHomes: input.codexHomes,
        claudeHomes: input.claudeHomes,
        includeCodex: input.includeCodex,
        includeClaude: input.includeClaude,
        options: {
          dryRun: true,
          force: input.force,
          gc: input.gc,
          includeAgentsInCodex: input.includeAgentsInCodex,
          includeAgentsInClaude: input.includeAgentsInClaude,
          resources,
        },
      });
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
      const filteredSyncable = input.syncable.filter(({ sourcePlugin }) =>
        scopeAllows(input.scope, resolveSourceScopeForPath(sourcePlugin.absPath, input.workspaceRoot)),
      );
      const skipped = [...input.skipped];

      for (const item of input.syncable) {
        if (filteredSyncable.includes(item)) continue;
        skipped.push({
          dirName: item.sourcePlugin.dirName,
          absPath: item.sourcePlugin.absPath,
          reason: `out of scope (${input.scope})`,
        });
      }

      const runs = [];
      for (const { sourcePlugin, content } of filteredSyncable) {
        runs.push(await runServiceSync({
          sourcePlugin,
          content,
          options: {
            dryRun: true,
            force: true,
            gc: true,
            includeAgentsInCodex: input.includeAgentsInCodex,
            includeAgentsInClaude: input.includeAgentsInClaude,
            resources,
          },
          codexHomes: input.targetHomes.codexHomes,
          claudeHomes: input.targetHomes.claudeHomes,
          includeCodex: input.agent === "all" || input.agent === "codex",
          includeClaude: input.agent === "all" || input.agent === "claude",
        }));
      }

      return summarizeWorkspaceRun({
        runs,
        skipped,
        includeMetadata: input.includeMetadata,
        scope: input.scope,
      });
    },
  };
}
