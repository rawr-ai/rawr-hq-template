import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "@rawr/agent-config-sync/client";
import type { ExecutionRuntime } from "@rawr/agent-config-sync/ports/execution-runtime";
import type {
  PlanningRuntime,
  SyncAssessment,
} from "@rawr/agent-config-sync/ports/planning-runtime";
import type {
  RetirementRuntime,
  RetireStaleManagedResult,
} from "@rawr/agent-config-sync/ports/retirement-runtime";
import {
  PLUGINS_SYNC_UNDO_PROVIDER,
  type UndoCapsule,
  type UndoCapsuleStatus,
  type UndoRunResult,
  type UndoRuntime,
} from "@rawr/agent-config-sync/ports/undo-runtime";
import type { SyncScope, TargetHomes, WorkspaceSkip } from "@rawr/agent-config-sync/schemas";
import {
  ensureClaudeMarketplace,
  installAndEnableClaudePlugin,
  type ClaudeInstallAction,
  type ExecFn,
} from "./claude-cli";
import { packageCoworkPlugin, type CoworkPackageResult } from "./cowork-package";
import {
  copyDirTree,
  dirsIdentical,
  ensureDir,
  filesIdentical,
  listFilesRecursive,
  pathExists,
  readJsonFile,
  writeJsonFile,
} from "./fs-utils";
import {
  loadCodexRegistry,
  upsertCodexRegistry,
  type CodexRegistryContext,
  type CodexRegistryFile,
} from "./registry-codex";
import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
  type ClaudeManagedPluginManifest,
  type ClaudeMarketplaceFile,
  type ClaudePluginManifest,
} from "./marketplace-claude";
import { readPluginYaml, type PluginYamlV1 } from "./plugin-yaml";
import {
  clearPluginContentLayoutCacheForTests,
  resolvePluginContentLayout,
  type PluginContentLayout,
} from "./plugin-content";
import { resolveSourcePlugin } from "./resolve-source-plugin";
import { scanCanonicalContentAtRoot } from "./scan-canonical-content";
import { scanComposedToolsContent, type ToolsComposeConfig } from "./scan-tools-composed";
import { scanSourcePlugin } from "./scan-source-plugin";
import { retireStaleManagedPlugins } from "./lib/retire-stale-managed";
import { runSync } from "./lib/sync-engine";
import {
  beginPluginsSyncUndoCapture,
  clearActiveUndoCapsule,
  loadActiveUndoCapsule,
  runUndoForWorkspace,
} from "./lib/sync-undo";
import { resolveSourceScopeForPath, scopeAllows } from "./lib/source-scope";
import { resolveTargets, type TargetHomes as HostTargetHomes } from "./targets";
import {
  findWorkspaceRoot,
  listWorkspacePluginDirs,
  loadSourcePluginFromPath,
} from "./workspace";
import type {
  AgentConfigSyncHostResolvedConfig,
  AgentConfigSyncProvider,
  CodexRegistryClaims,
  HostSourceContent,
  HostSourcePlugin,
  RawrPluginKind,
} from "./types";

export type AgentConfigSyncHostBoundary = {
  deps: {
    fs: {
      pathExists: typeof pathExists;
      readJsonFile: typeof readJsonFile;
      writeJsonFile: typeof writeJsonFile;
      ensureDir: typeof ensureDir;
      filesIdentical: typeof filesIdentical;
      dirsIdentical: typeof dirsIdentical;
      listFilesRecursive: typeof listFilesRecursive;
      copyDirTree: typeof copyDirTree;
    };
    workspace: {
      findWorkspaceRoot: typeof findWorkspaceRoot;
      listWorkspacePluginDirs: typeof listWorkspacePluginDirs;
      loadSourcePluginFromPath: typeof loadSourcePluginFromPath;
      resolveSourcePlugin: typeof resolveSourcePlugin;
    };
    scanning: {
      readPluginYaml: typeof readPluginYaml;
      resolvePluginContentLayout: typeof resolvePluginContentLayout;
      clearPluginContentLayoutCacheForTests: typeof clearPluginContentLayoutCacheForTests;
      scanCanonicalContentAtRoot: typeof scanCanonicalContentAtRoot;
      scanComposedToolsContent: typeof scanComposedToolsContent;
      scanSourcePlugin: typeof scanSourcePlugin;
    };
    targets: {
      resolveTargets: typeof resolveTargets;
    };
    codexRegistry: {
      loadCodexRegistry: typeof loadCodexRegistry;
      upsertCodexRegistry: typeof upsertCodexRegistry;
    };
    claudeManifests: {
      upsertClaudePluginManifest: typeof upsertClaudePluginManifest;
      upsertClaudeMarketplace: typeof upsertClaudeMarketplace;
      writeClaudeSyncManifest: typeof writeClaudeSyncManifest;
      readClaudeSyncManifest: typeof readClaudeSyncManifest;
    };
    packaging: {
      packageCoworkPlugin: typeof packageCoworkPlugin;
    };
    claudeExecution: {
      ensureClaudeMarketplace: typeof ensureClaudeMarketplace;
      installAndEnableClaudePlugin: typeof installAndEnableClaudePlugin;
    };
  };
  config: {};
};

export type AgentConfigSyncHostBoundaryInput = {};

export type AgentConfigSyncBoundary = CreateClientOptions;

export type AgentConfigSyncBoundaryInput = {
  repoRoot: string;
  logger?: AgentConfigSyncBoundary["deps"]["logger"];
  analytics?: AgentConfigSyncBoundary["deps"]["analytics"];
};

export type AgentConfigSyncHostBoundaryTypes = {
  AgentConfigSyncHostResolvedConfig: AgentConfigSyncHostResolvedConfig;
  AgentConfigSyncProvider: AgentConfigSyncProvider;
  RawrPluginKind: RawrPluginKind;
  HostSourcePlugin: HostSourcePlugin;
  HostSourceContent: HostSourceContent;
  CodexRegistryClaims: CodexRegistryClaims;
  TargetHomes: HostTargetHomes;
  PluginYamlV1: PluginYamlV1;
  PluginContentLayout: PluginContentLayout;
  ToolsComposeConfig: ToolsComposeConfig;
  CodexRegistryContext: CodexRegistryContext;
  CodexRegistryFile: CodexRegistryFile;
  ClaudePluginManifest: ClaudePluginManifest;
  ClaudeMarketplaceFile: ClaudeMarketplaceFile;
  ClaudeManagedPluginManifest: ClaudeManagedPluginManifest;
  CoworkPackageResult: CoworkPackageResult;
  ClaudeInstallAction: ClaudeInstallAction;
  ExecFn: ExecFn;
};

type ActiveUndoCapture = Awaited<ReturnType<typeof beginPluginsSyncUndoCapture>>;

function createUndoState(repoRoot: string) {
  let activeCapture: ActiveUndoCapture | null = null;

  return {
    async beginSession(commandId: string, argv: string[]) {
      activeCapture = await beginPluginsSyncUndoCapture({
        workspaceRoot: repoRoot,
        commandId,
        argv,
      });
    },
    async finalizeSession(status: UndoCapsuleStatus) {
      const capture = activeCapture;
      activeCapture = null;
      return capture ? capture.finalize({ status }) : null;
    },
    async captureWriteTarget(target: string) {
      await activeCapture?.captureWriteTarget(target);
    },
    async captureDeleteTarget(target: string) {
      await activeCapture?.captureDeleteTarget(target);
    },
  };
}

export function createNodeUndoRuntime(repoRoot: string): UndoRuntime {
  const state = createUndoState(repoRoot);

  return {
    beginSession: async ({ commandId, argv }) => state.beginSession(commandId, argv),
    finalizeSession: async ({ status }) => state.finalizeSession(status) as Promise<UndoCapsule | null>,
    loadActiveCapsule: async () => loadActiveUndoCapsule(repoRoot) as Promise<UndoCapsule | null>,
    clearActiveCapsule: async () => clearActiveUndoCapsule(repoRoot),
    captureWriteTarget: async (target) => state.captureWriteTarget(target),
    captureDeleteTarget: async (target) => state.captureDeleteTarget(target),
    runUndo: async ({ dryRun }) => runUndoForWorkspace({ workspaceRoot: repoRoot, dryRun }) as Promise<UndoRunResult>,
  };
}

function summarizeWorkspaceRun(input: {
  runs: Awaited<ReturnType<typeof runSync>>[];
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

export function createNodePlanningRuntime(repoRoot: string): PlanningRuntime {
  return {
    previewSync: async (input) => {
      return runSync({
        sourcePlugin: input.sourcePlugin as any,
        content: input.content as any,
        options: {
          dryRun: true,
          force: input.force,
          gc: input.gc,
          includeAgentsInCodex: input.includeAgentsInCodex,
          includeAgentsInClaude: input.includeAgentsInClaude,
        },
        codexHomes: input.codexHomes,
        claudeHomes: input.claudeHomes,
        includeCodex: input.includeCodex,
        includeClaude: input.includeClaude,
      });
    },
    assessWorkspace: async (input) => {
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
        runs.push(await runSync({
          sourcePlugin: sourcePlugin as any,
          content: content as any,
          options: {
            dryRun: true,
            force: true,
            gc: true,
            includeAgentsInCodex: input.includeAgentsInCodex,
            includeAgentsInClaude: input.includeAgentsInClaude,
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

export function createNodeExecutionRuntime(repoRoot: string, undoRuntime: UndoRuntime): ExecutionRuntime {
  return {
    runSync: async (input) => {
      return runSync({
        sourcePlugin: input.sourcePlugin as any,
        content: input.content as any,
        options: {
          dryRun: input.dryRun,
          force: input.force,
          gc: input.gc,
          includeAgentsInCodex: input.includeAgentsInCodex,
          includeAgentsInClaude: input.includeAgentsInClaude,
          undoCapture: {
            captureWriteTarget: (target) => undoRuntime.captureWriteTarget(target),
            captureDeleteTarget: (target) => undoRuntime.captureDeleteTarget(target),
          },
        },
        codexHomes: input.codexHomes,
        claudeHomes: input.claudeHomes,
        includeCodex: input.includeCodex,
        includeClaude: input.includeClaude,
      });
    },
  };
}

export function createNodeRetirementRuntime(repoRoot: string, undoRuntime: UndoRuntime): RetirementRuntime {
  return {
    retireStaleManaged: async (input): Promise<RetireStaleManagedResult> => {
      return retireStaleManagedPlugins({
        workspaceRoot: input.workspaceRoot,
        scope: input.scope,
        codexHomes: input.codexHomes,
        claudeHomes: input.claudeHomes,
        activePluginNames: input.activePluginNames,
        dryRun: input.dryRun,
        undoCapture: {
          captureWriteTarget: (target) => undoRuntime.captureWriteTarget(target),
          captureDeleteTarget: (target) => undoRuntime.captureDeleteTarget(target),
        },
      });
    },
  };
}

export function createNodeAgentConfigSyncHostBoundary(
  _input: AgentConfigSyncHostBoundaryInput = {},
): AgentConfigSyncHostBoundary {
  return {
    deps: {
      fs: {
        pathExists,
        readJsonFile,
        writeJsonFile,
        ensureDir,
        filesIdentical,
        dirsIdentical,
        listFilesRecursive,
        copyDirTree,
      },
      workspace: {
        findWorkspaceRoot,
        listWorkspacePluginDirs,
        loadSourcePluginFromPath,
        resolveSourcePlugin,
      },
      scanning: {
        readPluginYaml,
        resolvePluginContentLayout,
        clearPluginContentLayoutCacheForTests,
        scanCanonicalContentAtRoot,
        scanComposedToolsContent,
        scanSourcePlugin,
      },
      targets: {
        resolveTargets,
      },
      codexRegistry: {
        loadCodexRegistry,
        upsertCodexRegistry,
      },
      claudeManifests: {
        upsertClaudePluginManifest,
        upsertClaudeMarketplace,
        writeClaudeSyncManifest,
        readClaudeSyncManifest,
      },
      packaging: {
        packageCoworkPlugin,
      },
      claudeExecution: {
        ensureClaudeMarketplace,
        installAndEnableClaudePlugin,
      },
    },
    config: {},
  };
}

export function createNodeAgentConfigSyncBoundary(input: AgentConfigSyncBoundaryInput): AgentConfigSyncBoundary {
  const undoRuntime = createNodeUndoRuntime(input.repoRoot);

  return {
    deps: {
      logger: input.logger ?? createEmbeddedPlaceholderLoggerAdapter(),
      analytics: input.analytics ?? createEmbeddedPlaceholderAnalyticsAdapter(),
      planningRuntime: createNodePlanningRuntime(input.repoRoot),
      executionRuntime: createNodeExecutionRuntime(input.repoRoot, undoRuntime),
      retirementRuntime: createNodeRetirementRuntime(input.repoRoot, undoRuntime),
      undoRuntime,
    },
    scope: {
      repoRoot: input.repoRoot,
    },
    config: {},
  };
}

export { PLUGINS_SYNC_UNDO_PROVIDER };
