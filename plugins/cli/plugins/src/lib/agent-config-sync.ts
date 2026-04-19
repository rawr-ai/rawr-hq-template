import {
  beginPluginsSyncUndoCapture as beginServicePluginsSyncUndoCapture,
  createClient,
  PLUGINS_SYNC_UNDO_PROVIDER,
  type AgentConfigSyncUndoCapture,
  type UndoRunResult,
} from "@rawr/agent-config-sync";
import type { CreateClientOptions } from "@rawr/agent-config-sync/client";
import type { SyncItemResult, SyncRunResult, SyncScope } from "@rawr/agent-config-sync/schemas";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
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
} from "./agent-config-sync-resources";
import { createNodeAgentConfigSyncResources } from "./agent-config-sync-resources/resources";
import { findWorkspaceRoot } from "./workspace-plugins";

type UndoCaptureLike = AgentConfigSyncUndoCapture;

export async function beginPluginsSyncUndoCapture(input: {
  workspaceRoot: string;
  commandId: string;
  argv: string[];
}) {
  return beginServicePluginsSyncUndoCapture({
    ...input,
    resources: createNodeAgentConfigSyncResources(),
  });
}

function createInvocation(traceId: string) {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

function createBoundary(repoRoot: string, undoCapture?: UndoCaptureLike): CreateClientOptions {
  return {
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
      resources: createNodeAgentConfigSyncResources(),
      undoCapture,
    },
    scope: { repoRoot },
    config: {},
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
