import { module } from "./module";
import { resolveProviderContent } from "../source-content/helpers/provider-content";
import { syncClaudeTarget } from "../execution/helpers/claude-target";
import { syncCodexTarget } from "../execution/helpers/codex-target";
import { summarizeScannedContent } from "../execution/helpers/sync-results";
import type { SyncRunResult, SyncTargetResult } from "../execution/contract";
import { summarizeWorkspaceRun } from "./helpers/assessment-summary";
import { evaluateFullSyncPolicy as evaluatePolicy } from "./helpers/full-sync-policy";
import { resolveTargetHomes } from "./helpers/target-homes";
import { discoverWorkspaceSources, filterByScope } from "./helpers/workspace-discovery";
import { resolveWorkspaceRoot } from "./helpers/workspace-roots";

const planWorkspaceSync = module.planWorkspaceSync.handler(async ({ context, input, errors }) => {
  const workspaceRoot = await resolveWorkspaceRoot({
    cwd: input.cwd,
    workspaceRoot: input.workspaceRoot,
    resources: context.resources,
  });
  if (!workspaceRoot.ok) {
    if (workspaceRoot.code === "INVALID_WORKSPACE_ROOT") {
      throw errors.INVALID_WORKSPACE_ROOT({
        message: `Configured workspace root is not a RAWR workspace: ${workspaceRoot.resolvedPath}`,
        data: {
          cwd: workspaceRoot.cwd,
          workspaceRoot: workspaceRoot.workspaceRoot,
          resolvedPath: workspaceRoot.resolvedPath,
        },
      });
    }

    throw errors.WORKSPACE_ROOT_NOT_FOUND({
      message: "Unable to locate workspace root (expected a ./plugins directory)",
      data: {
        cwd: workspaceRoot.cwd,
        workspaceRoot: workspaceRoot.workspaceRoot,
      },
    });
  }

  const discovered = await discoverWorkspaceSources({
    cwd: input.cwd,
    workspaceRoot: workspaceRoot.workspaceRoot,
    sourcePaths: input.sourcePaths,
    resources: context.resources,
  });
  const scoped = filterByScope({
    workspaceRoot: discovered.workspaceRoot,
    syncable: discovered.syncable,
    skipped: discovered.skipped,
    scope: input.scope,
  });
  const targetSelection = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
  });
  const runs: SyncRunResult[] = [];
  for (const syncable of scoped.syncable) {
    const targets: SyncTargetResult[] = [];
    const options = {
      dryRun: true,
      force: true,
      gc: true,
      includeAgentsInCodex: input.includeAgentsInCodex,
      includeAgentsInClaude: input.includeAgentsInClaude,
      resources: context.resources,
    };

    if (targetSelection.agents.includes("codex")) {
      const codexContent = await resolveProviderContent({
        agent: "codex",
        sourcePlugin: syncable.sourcePlugin,
        base: syncable.content,
        resources: context.resources,
      });
      for (const codexHome of targetSelection.homes.codexHomes) {
        targets.push(await syncCodexTarget({
          codexHome,
          sourcePlugin: syncable.sourcePlugin,
          content: codexContent,
          options,
        }));
      }
    }

    if (targetSelection.agents.includes("claude")) {
      const claudeContent = await resolveProviderContent({
        agent: "claude",
        sourcePlugin: syncable.sourcePlugin,
        base: syncable.content,
        resources: context.resources,
      });
      for (const claudeHome of targetSelection.homes.claudeHomes) {
        targets.push(await syncClaudeTarget({
          claudeLocalHome: claudeHome,
          sourcePlugin: syncable.sourcePlugin,
          content: claudeContent,
          options,
        }));
      }
    }

    runs.push({
      ok: targets.every((target) => target.conflicts.length === 0),
      sourcePlugin: syncable.sourcePlugin,
      scanned: summarizeScannedContent(syncable.content),
      targets,
    });
  }
  const assessment = summarizeWorkspaceRun({
    runs,
    skipped: scoped.skipped,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
  });

  return {
    workspaceRoot: discovered.workspaceRoot,
    syncable: scoped.syncable,
    skipped: scoped.skipped,
    agents: targetSelection.agents,
    targetHomes: targetSelection.homes,
    includeAgentsInCodex: input.includeAgentsInCodex ?? false,
    includeAgentsInClaude: input.includeAgentsInClaude ?? true,
    activePluginNames: scoped.syncable.map((item) => item.sourcePlugin.dirName).sort((a, b) => a.localeCompare(b)),
    fullSyncPolicy: evaluatePolicy(input.fullSyncPolicy),
    assessment,
  };
});

const assessWorkspaceSync = module.assessWorkspaceSync.handler(async ({ context, input, errors }) => {
  const workspaceRoot = await resolveWorkspaceRoot({
    cwd: input.cwd,
    workspaceRoot: input.workspaceRoot,
    resources: context.resources,
  });
  if (!workspaceRoot.ok) {
    if (workspaceRoot.code === "INVALID_WORKSPACE_ROOT") {
      throw errors.INVALID_WORKSPACE_ROOT({
        message: `Configured workspace root is not a RAWR workspace: ${workspaceRoot.resolvedPath}`,
        data: {
          cwd: workspaceRoot.cwd,
          workspaceRoot: workspaceRoot.workspaceRoot,
          resolvedPath: workspaceRoot.resolvedPath,
        },
      });
    }

    throw errors.WORKSPACE_ROOT_NOT_FOUND({
      message: "Unable to locate workspace root (expected a ./plugins directory)",
      data: {
        cwd: workspaceRoot.cwd,
        workspaceRoot: workspaceRoot.workspaceRoot,
      },
    });
  }

  const discovered = await discoverWorkspaceSources({
    cwd: input.cwd,
    workspaceRoot: workspaceRoot.workspaceRoot,
    sourcePaths: input.sourcePaths,
    resources: context.resources,
  });
  const scoped = filterByScope({
    workspaceRoot: discovered.workspaceRoot,
    syncable: discovered.syncable,
    skipped: discovered.skipped,
    scope: input.scope,
  });
  const targetSelection = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
  });
  const runs: SyncRunResult[] = [];
  for (const syncable of scoped.syncable) {
    const targets: SyncTargetResult[] = [];
    const options = {
      dryRun: true,
      force: true,
      gc: true,
      includeAgentsInCodex: input.includeAgentsInCodex,
      includeAgentsInClaude: input.includeAgentsInClaude,
      resources: context.resources,
    };

    if (targetSelection.agents.includes("codex")) {
      const codexContent = await resolveProviderContent({
        agent: "codex",
        sourcePlugin: syncable.sourcePlugin,
        base: syncable.content,
        resources: context.resources,
      });
      for (const codexHome of targetSelection.homes.codexHomes) {
        targets.push(await syncCodexTarget({
          codexHome,
          sourcePlugin: syncable.sourcePlugin,
          content: codexContent,
          options,
        }));
      }
    }

    if (targetSelection.agents.includes("claude")) {
      const claudeContent = await resolveProviderContent({
        agent: "claude",
        sourcePlugin: syncable.sourcePlugin,
        base: syncable.content,
        resources: context.resources,
      });
      for (const claudeHome of targetSelection.homes.claudeHomes) {
        targets.push(await syncClaudeTarget({
          claudeLocalHome: claudeHome,
          sourcePlugin: syncable.sourcePlugin,
          content: claudeContent,
          options,
        }));
      }
    }

    runs.push({
      ok: targets.every((target) => target.conflicts.length === 0),
      sourcePlugin: syncable.sourcePlugin,
      scanned: summarizeScannedContent(syncable.content),
      targets,
    });
  }

  const assessment = summarizeWorkspaceRun({
    runs,
    skipped: scoped.skipped,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
  });
  return assessment;
});

const evaluateFullSyncPolicy = module.evaluateFullSyncPolicy.handler(async ({ context, input }) => {
  return evaluatePolicy(input);
});

export const router = module.router({
  planWorkspaceSync,
  assessWorkspaceSync,
  evaluateFullSyncPolicy,
});
