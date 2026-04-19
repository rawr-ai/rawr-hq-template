import {
  beginPluginsSyncUndoCapture as beginServicePluginsSyncUndoCapture,
  type Client,
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
type PreviewSyncInput = Parameters<Client["planning"]["previewSync"]>[0];
type PreviewSyncOptions = NonNullable<Parameters<Client["planning"]["previewSync"]>[1]>;
type RunSyncInput = Parameters<Client["execution"]["runSync"]>[0];
type RunSyncOptions = NonNullable<Parameters<Client["execution"]["runSync"]>[1]>;
type RetireStaleManagedInput = Parameters<Client["retirement"]["retireStaleManaged"]>[0];
type RetireStaleManagedOptions = NonNullable<Parameters<Client["retirement"]["retireStaleManaged"]>[1]>;

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
    const previewInput = {
      sourcePlugin: input.sourcePlugin,
      content: input.content,
      codexHomes: input.codexHomes,
      claudeHomes: input.claudeHomes,
      includeCodex: input.includeCodex,
      includeClaude: input.includeClaude,
      includeAgentsInCodex: input.options.includeAgentsInCodex,
      includeAgentsInClaude: input.options.includeAgentsInClaude,
      force: input.options.force,
      gc: input.options.gc,
    } satisfies PreviewSyncInput;
    const options = {
      context: { invocation: { traceId: "plugin-plugins.agent-config-sync.preview" } },
    } satisfies PreviewSyncOptions;
    return client.planning.previewSync(previewInput, options);
  }

  const runInput = {
    sourcePlugin: input.sourcePlugin,
    content: input.content,
    codexHomes: input.codexHomes,
    claudeHomes: input.claudeHomes,
    includeCodex: input.includeCodex,
    includeClaude: input.includeClaude,
    includeAgentsInCodex: input.options.includeAgentsInCodex,
    includeAgentsInClaude: input.options.includeAgentsInClaude,
    force: input.options.force,
    gc: input.options.gc,
    dryRun: input.options.dryRun,
  } satisfies RunSyncInput;
  const options = {
    context: { invocation: { traceId: "plugin-plugins.agent-config-sync.apply" } },
  } satisfies RunSyncOptions;
  return client.execution.runSync(runInput, options);
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
  const retireInput = {
    workspaceRoot: input.workspaceRoot,
    scope: input.scope,
    codexHomes: input.codexHomes,
    claudeHomes: input.claudeHomes,
    activePluginNames: [...input.activePluginNames],
    dryRun: input.dryRun,
  } satisfies RetireStaleManagedInput;
  const options = {
    context: { invocation: { traceId: "plugin-plugins.agent-config-sync.retirement" } },
  } satisfies RetireStaleManagedOptions;
  return client.retirement.retireStaleManaged(retireInput, options);
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
