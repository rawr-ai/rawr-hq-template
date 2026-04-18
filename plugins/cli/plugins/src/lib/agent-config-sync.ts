import { createClient } from "@rawr/agent-config-sync";
import type { CreateClientOptions } from "@rawr/agent-config-sync/client";
import type { SyncItemResult, SyncRunResult, SyncScope } from "@rawr/agent-config-sync/schemas";
import {
  type UndoRunResult,
  PLUGINS_SYNC_UNDO_PROVIDER,
  type UndoRuntime,
} from "@rawr/agent-config-sync/ports/undo-runtime";
import {
  beginPluginsSyncUndoCapture,
  createNodeAgentConfigSyncBoundary,
  createNodeExecutionRuntime,
  createNodeRetirementRuntime,
  effectiveContentForProvider,
  installAndEnableClaudePlugin,
  packageCoworkPlugin,
  planSyncAll,
  resolveDefaultCoworkOutDir,
  resolveSourcePlugin,
  resolveSourceScopeForPath,
  resolveTargets,
  scopeAllows,
  scanSourcePlugin,
  type HostSourceContent as SourceContent,
  type HostSourcePlugin as SourcePlugin,
  type TargetHomes,
} from "@rawr/agent-config-sync-host";
import { findWorkspaceRoot } from "./workspace-plugins";

type UndoCaptureLike = {
  captureWriteTarget(target: string): Promise<void>;
  captureDeleteTarget(target: string): Promise<void>;
};

function createInvocation(traceId: string) {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

function createUndoCaptureRuntime(undoCapture: UndoCaptureLike | undefined): UndoRuntime {
  return {
    beginSession: async () => {},
    finalizeSession: async () => null,
    loadActiveCapsule: async () => null,
    clearActiveCapsule: async () => {},
    captureWriteTarget: async (target) => {
      await undoCapture?.captureWriteTarget(target);
    },
    captureDeleteTarget: async (target) => {
      await undoCapture?.captureDeleteTarget(target);
    },
    runUndo: async (): Promise<UndoRunResult> => ({
      ok: false,
      code: "UNDO_PROVIDER_UNSUPPORTED",
      message: "Undo application remains host-owned for this cutover seam.",
    }),
  };
}

function createBoundary(repoRoot: string, undoCapture?: UndoCaptureLike): CreateClientOptions {
  if (!undoCapture) {
    return createNodeAgentConfigSyncBoundary({ repoRoot });
  }

  const base = createNodeAgentConfigSyncBoundary({ repoRoot });
  const undoRuntime = createUndoCaptureRuntime(undoCapture);

  return {
    ...base,
    deps: {
      ...base.deps,
      undoRuntime,
      executionRuntime: createNodeExecutionRuntime(repoRoot, undoRuntime),
      retirementRuntime: createNodeRetirementRuntime(repoRoot, undoRuntime),
    },
  };
}

async function repoRootForCall(sourcePlugin?: SourcePlugin): Promise<string> {
  const cwdRoot = await findWorkspaceRoot(process.cwd());
  if (cwdRoot) return cwdRoot;
  if (sourcePlugin?.absPath) return sourcePlugin.absPath;
  return process.cwd();
}

export async function runSync(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  options: {
    dryRun: boolean;
    force: boolean;
    gc: boolean;
    includeAgentsInCodex?: boolean;
    includeAgentsInClaude?: boolean;
    undoCapture?: UndoCaptureLike;
  };
  codexHomes: string[];
  claudeHomes: string[];
  includeCodex: boolean;
  includeClaude: boolean;
}): Promise<SyncRunResult> {
  const repoRoot = await repoRootForCall(input.sourcePlugin);
  const client = createClient(createBoundary(repoRoot, input.options.undoCapture));

  if (input.options.dryRun) {
    return client.planning.previewSync(
      {
        sourcePlugin: input.sourcePlugin as any,
        content: input.content as any,
        codexHomes: input.codexHomes,
        claudeHomes: input.claudeHomes,
        includeCodex: input.includeCodex,
        includeClaude: input.includeClaude,
        includeAgentsInCodex: input.options.includeAgentsInCodex,
        includeAgentsInClaude: input.options.includeAgentsInClaude,
        force: input.options.force,
        gc: input.options.gc,
      },
      createInvocation("plugin-plugins.agent-config-sync.preview"),
    ) as Promise<SyncRunResult>;
  }

  return client.execution.runSync(
    {
      sourcePlugin: input.sourcePlugin as any,
      content: input.content as any,
      codexHomes: input.codexHomes,
      claudeHomes: input.claudeHomes,
      includeCodex: input.includeCodex,
      includeClaude: input.includeClaude,
      includeAgentsInCodex: input.options.includeAgentsInCodex,
      includeAgentsInClaude: input.options.includeAgentsInClaude,
      force: input.options.force,
      gc: input.options.gc,
      dryRun: input.options.dryRun,
    },
    createInvocation("plugin-plugins.agent-config-sync.apply"),
  ) as Promise<SyncRunResult>;
}

export async function retireStaleManagedPlugins(input: {
  workspaceRoot: string;
  scope: SyncScope;
  codexHomes: string[];
  claudeHomes: string[];
  activePluginNames: Set<string>;
  dryRun: boolean;
  undoCapture?: UndoCaptureLike;
}) {
  const client = createClient(createBoundary(input.workspaceRoot, input.undoCapture));
  return client.retirement.retireStaleManaged(
    {
      workspaceRoot: input.workspaceRoot,
      scope: input.scope as any,
      codexHomes: input.codexHomes,
      claudeHomes: input.claudeHomes,
      activePluginNames: [...input.activePluginNames],
      dryRun: input.dryRun,
    },
    createInvocation("plugin-plugins.agent-config-sync.retirement"),
  );
}

export {
  beginPluginsSyncUndoCapture,
  effectiveContentForProvider,
  installAndEnableClaudePlugin,
  packageCoworkPlugin,
  planSyncAll,
  PLUGINS_SYNC_UNDO_PROVIDER,
  resolveDefaultCoworkOutDir,
  resolveSourcePlugin,
  resolveSourceScopeForPath,
  resolveTargets,
  scopeAllows,
  scanSourcePlugin,
};

export type {
  SourceContent,
  SourcePlugin,
  SyncItemResult,
  SyncRunResult,
  SyncScope,
  TargetHomes,
};
