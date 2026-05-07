/**
 * agent-config-sync: planning module.
 *
 * This router owns "decide what would happen" for sync, without mutating any
 * destination homes: it resolves the workspace root, discovers syncable source
 * plugins, computes the target homes, and produces a dry-run assessment of the
 * execution policy (conflicts, GC candidates, registry diffs).
 *
 * The intent is to keep projections (CLI/web) thin: they orchestrate inputs and
 * rendering, while the service defines the planning semantics and the exact
 * preview behavior.
 */
import { module } from "../module";
import type { SyncRunResult } from "../../../common/entities/sync-results";
import { evaluateFullSyncPolicy as evaluatePolicy } from "../repositories/full-sync-policy-repository";
import { summarizeWorkspaceRun } from "../repositories/sync-assessment-repository";
import { previewSyncRun } from "../repositories/sync-preview-repository";
import { resolveTargetHomes } from "../repositories/target-home-selection-repository";
import { discoverWorkspaceSources, filterByScope } from "../repositories/workspace-source-repository";
import { resolveWorkspaceRoot } from "../repositories/workspace-root-repository";

export const planWorkspaceSync = module.planWorkspaceSync.handler(async ({ context, input, errors }) => {
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
    resources: context.resources,
  });
  const targetSelection = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
    pathOps: context.resources.path,
  });

  const runs: SyncRunResult[] = [];
  for (const syncable of scoped.syncable) {
    runs.push(await previewSyncRun({
      sourcePlugin: syncable.sourcePlugin,
      content: syncable.content,
      agents: targetSelection.agents,
      codexHomes: targetSelection.homes.codexHomes,
      claudeHomes: targetSelection.homes.claudeHomes,
      includeAgentsInCodex: input.includeAgentsInCodex,
      includeAgentsInClaude: input.includeAgentsInClaude,
      includeCodexDestinationProjection: input.includeCodexDestinationProjection,
      resources: context.resources,
    }));
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
    includeAgentsInCodex: input.includeAgentsInCodex ?? true,
    includeAgentsInClaude: input.includeAgentsInClaude ?? true,
    activePluginNames: scoped.syncable.map((item) => item.sourcePlugin.dirName).sort((a, b) => a.localeCompare(b)),
    fullSyncPolicy: evaluatePolicy(input.fullSyncPolicy),
    assessment,
  };
});

export const assessWorkspaceSync = module.assessWorkspaceSync.handler(async ({ context, input, errors }) => {
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
    resources: context.resources,
  });
  const targetSelection = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
    pathOps: context.resources.path,
  });

  const runs: SyncRunResult[] = [];
  for (const syncable of scoped.syncable) {
    runs.push(await previewSyncRun({
      sourcePlugin: syncable.sourcePlugin,
      content: syncable.content,
      agents: targetSelection.agents,
      codexHomes: targetSelection.homes.codexHomes,
      claudeHomes: targetSelection.homes.claudeHomes,
      includeAgentsInCodex: input.includeAgentsInCodex,
      includeAgentsInClaude: input.includeAgentsInClaude,
      includeCodexDestinationProjection: input.includeCodexDestinationProjection,
      resources: context.resources,
    }));
  }

  const assessment = summarizeWorkspaceRun({
    runs,
    skipped: scoped.skipped,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
  });
  return assessment;
});
