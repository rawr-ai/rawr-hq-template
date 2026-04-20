import os from "node:os";
import path from "node:path";

import type { Client } from "@rawr/agent-config-sync";
import type { AgentConfigSyncUndoCapture } from "@rawr/agent-config-sync/resources";
import type {
  AssessWorkspaceSyncInput,
  PlanWorkspaceSyncInput,
  SyncAssessment,
  SyncItemResult,
  SyncRunResult,
  SyncScope,
  UndoRunResult,
  WorkspaceSyncPlan,
} from "@rawr/agent-config-sync/types";
import {
  beginPluginsSyncUndoCapture as beginServicePluginsSyncUndoCapture,
  PLUGINS_SYNC_UNDO_PROVIDER,
} from "@rawr/agent-config-sync/undo";
import { createAgentConfigSyncClient } from "./agent-config-sync-binding";
import { installAndEnableClaudePlugin } from "./agent-config-sync-resources/claude-cli";
import { packageCoworkPlugin } from "./agent-config-sync-resources/cowork-package";
import { createNodeAgentConfigSyncResources } from "./agent-config-sync-resources/resources";
import type { HostSourceContent as SourceContent, HostSourcePlugin as SourcePlugin } from "./agent-config-sync-resources/types";
import { findWorkspaceRoot } from "@rawr/core";

export type UndoCaptureLike = AgentConfigSyncUndoCapture;
type RunSyncInput = Parameters<Client["execution"]["runSync"]>[0];
type RunSyncOptions = NonNullable<Parameters<Client["execution"]["runSync"]>[1]>;
type ResolveProviderContentInput = Parameters<Client["execution"]["resolveProviderContent"]>[0];
type ResolveProviderContentOptions = NonNullable<Parameters<Client["execution"]["resolveProviderContent"]>[1]>;
type RetireStaleManagedInput = Parameters<Client["retirement"]["retireStaleManaged"]>[0];
type RetireStaleManagedOptions = NonNullable<Parameters<Client["retirement"]["retireStaleManaged"]>[1]>;
type PlanWorkspaceSyncOptions = NonNullable<Parameters<Client["planning"]["planWorkspaceSync"]>[1]>;
type AssessWorkspaceSyncOptions = NonNullable<Parameters<Client["planning"]["assessWorkspaceSync"]>[1]>;

type SyncDestinationConfig = {
  rootPath?: string;
  enabled?: boolean;
};

type LayeredSyncConfig = {
  sync?: {
    sources?: {
      paths?: string[];
    };
    providers?: {
      codex?: {
        includeAgents?: boolean;
        destinations?: SyncDestinationConfig[];
      };
      claude?: {
        includeAgents?: boolean;
        destinations?: SyncDestinationConfig[];
      };
    };
  };
};

/**
 * Extracts provider include-agent policy from layered RAWR config.
 */
function syncProviderPolicy(config?: LayeredSyncConfig): {
  includeAgentsInCodex: boolean;
  includeAgentsInClaude: boolean;
} {
  return {
    includeAgentsInCodex: config?.sync?.providers?.codex?.includeAgents ?? false,
    includeAgentsInClaude: config?.sync?.providers?.claude?.includeAgents ?? true,
  };
}

/**
 * Finds the user's home directory for destination defaults.
 */
function homeDir(): string {
  return process.env.HOME ? String(process.env.HOME) : os.homedir();
}

/**
 * Expands shell-style home paths before passing destinations to the service.
 */
function expandTilde(inputPath: string): string {
  if (inputPath === "~") return homeDir();
  if (inputPath.startsWith("~/")) return path.join(homeDir(), inputPath.slice(2));
  return inputPath;
}

/**
 * Reads comma-separated destination homes from environment variables.
 */
function parseEnvHomes(key: string): string[] {
  const rawValue = process.env[key];
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(expandTilde);
}

/**
 * Normalizes config destinations while preserving enabled flags for planning.
 */
function mapDestinations(destinations: SyncDestinationConfig[] | undefined): Array<{ rootPath?: string; enabled?: boolean }> {
  return (destinations ?? []).map((destination) => ({
    ...(typeof destination.rootPath === "string" && destination.rootPath.length > 0
      ? { rootPath: expandTilde(destination.rootPath) }
      : {}),
    ...(typeof destination.enabled === "boolean" ? { enabled: destination.enabled } : {}),
  }));
}

/**
 * Builds all destination-home candidates from flags, env, config, and defaults.
 */
function buildTargetHomeCandidates(input: {
  codexHomesFromFlags: string[];
  claudeHomesFromFlags: string[];
  config?: LayeredSyncConfig;
}): PlanWorkspaceSyncInput["targetHomeCandidates"] {
  const codexHomesFromEnvironment = parseEnvHomes("RAWR_AGENT_SYNC_CODEX_HOMES");
  const codeHomePrimary = process.env.CODEX_HOME ? expandTilde(process.env.CODEX_HOME) : null;
  const codeHomeMirror = process.env.CODEX_MIRROR_HOME ? expandTilde(process.env.CODEX_MIRROR_HOME) : null;
  const claudeHomesFromEnvironment = parseEnvHomes("RAWR_AGENT_SYNC_CLAUDE_HOMES");
  const claudeHomeFromEnvVar = process.env.CLAUDE_PLUGINS_LOCAL ? expandTilde(process.env.CLAUDE_PLUGINS_LOCAL) : null;
  const userHome = process.env.HOME ? String(process.env.HOME) : os.homedir();

  return {
    codexHomesFromFlags: input.codexHomesFromFlags.map(expandTilde),
    claudeHomesFromFlags: input.claudeHomesFromFlags.map(expandTilde),
    codexHomesFromEnvironment: codexHomesFromEnvironment.length > 0
      ? codexHomesFromEnvironment
      : [codeHomePrimary, codeHomeMirror].filter((home): home is string => Boolean(home)),
    claudeHomesFromEnvironment: claudeHomesFromEnvironment.length > 0
      ? claudeHomesFromEnvironment
      : claudeHomeFromEnvVar
        ? [claudeHomeFromEnvVar]
        : [],
    codexHomesFromConfig: mapDestinations(input.config?.sync?.providers?.codex?.destinations),
    claudeHomesFromConfig: mapDestinations(input.config?.sync?.providers?.claude?.destinations),
    codexDefaultHomes: [path.join(userHome, ".codex-rawr"), path.join(userHome, ".codex")],
    claudeDefaultHomes: [path.join(userHome, ".claude", "plugins", "local")],
  };
}

type OclifRuntimePlugin = {
  root?: unknown;
};

function isOclifRuntimePlugin(value: unknown): value is OclifRuntimePlugin {
  return Boolean(value) && typeof value === "object";
}

/**
 * Observes source plugin roots from oclif runtime plugin state.
 */
function collectOclifSourceRoots(configPlugins: unknown): string[] {
  const runtimePluginValues: unknown[] = configPlugins instanceof Map
    ? [...configPlugins.values()]
    : Array.isArray(configPlugins)
      ? configPlugins
      : [];

  return runtimePluginValues
    .map((plugin) => (isOclifRuntimePlugin(plugin) && typeof plugin.root === "string" ? plugin.root : ""))
    .filter((root) => root.length > 0)
    .map((root: string) => (root.endsWith("package.json") ? path.dirname(root) : root));
}

/**
 * Collects source plugin paths from config, oclif runtime, and explicit flags.
 */
export function collectWorkspaceSourcePaths(input: {
  config?: LayeredSyncConfig;
  includeOclif: boolean;
  configPlugins: unknown;
  extraSourcePaths?: string[];
}): string[] {
  const paths: string[] = [];
  for (const p of input.config?.sync?.sources?.paths ?? []) paths.push(String(p));
  if (input.includeOclif) paths.push(...collectOclifSourceRoots(input.configPlugins));
  paths.push(...(input.extraSourcePaths ?? []));
  return [...new Set(paths)];
}

/**
 * Builds the service planning request from CLI flags and local config.
 */
export function createWorkspaceSyncPlanInput(input: {
  cwd: string;
  sourcePaths: string[];
  includeMetadata: boolean;
  scope: SyncScope;
  agent: "codex" | "claude" | "all";
  codexHomes: string[];
  claudeHomes: string[];
  config?: LayeredSyncConfig;
  fullSyncPolicy: PlanWorkspaceSyncInput["fullSyncPolicy"];
}): PlanWorkspaceSyncInput {
  const syncPolicy = syncProviderPolicy(input.config);
  return {
    cwd: input.cwd,
    sourcePaths: input.sourcePaths,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
    agent: input.agent,
    targetHomeCandidates: buildTargetHomeCandidates({
      codexHomesFromFlags: input.codexHomes,
      claudeHomesFromFlags: input.claudeHomes,
      config: input.config,
    }),
    includeAgentsInCodex: syncPolicy.includeAgentsInCodex,
    includeAgentsInClaude: syncPolicy.includeAgentsInClaude,
    fullSyncPolicy: input.fullSyncPolicy,
  };
}

/**
 * Builds the service assessment request from CLI flags and local config.
 */
export function createWorkspaceSyncAssessInput(input: {
  cwd: string;
  sourcePaths: string[];
  includeMetadata: boolean;
  scope: SyncScope;
  agent: "codex" | "claude" | "all";
  codexHomes: string[];
  claudeHomes: string[];
  config?: LayeredSyncConfig;
}): AssessWorkspaceSyncInput {
  const syncPolicy = syncProviderPolicy(input.config);
  return {
    cwd: input.cwd,
    sourcePaths: input.sourcePaths,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
    agent: input.agent,
    targetHomeCandidates: buildTargetHomeCandidates({
      codexHomesFromFlags: input.codexHomes,
      claudeHomesFromFlags: input.claudeHomes,
      config: input.config,
    }),
    includeAgentsInCodex: syncPolicy.includeAgentsInCodex,
    includeAgentsInClaude: syncPolicy.includeAgentsInClaude,
  };
}

/**
 * Calls agent-config-sync planning from the CLI projection.
 */
export async function planWorkspaceSync(input: {
  repoRoot: string;
  request: PlanWorkspaceSyncInput;
  traceId: string;
  undoCapture?: UndoCaptureLike;
}): Promise<WorkspaceSyncPlan> {
  const client = createAgentConfigSyncClient({ repoRoot: input.repoRoot, undoCapture: input.undoCapture });
  const options = {
    context: { invocation: { traceId: input.traceId } },
  } satisfies PlanWorkspaceSyncOptions;
  return client.planning.planWorkspaceSync(input.request, options);
}

/**
 * Calls agent-config-sync assessment from the CLI projection.
 */
export async function assessWorkspaceSync(input: {
  repoRoot: string;
  request: AssessWorkspaceSyncInput;
  traceId: string;
}): Promise<SyncAssessment> {
  const client = createAgentConfigSyncClient({ repoRoot: input.repoRoot });
  const options = {
    context: { invocation: { traceId: input.traceId } },
  } satisfies AssessWorkspaceSyncOptions;
  return client.planning.assessWorkspaceSync(input.request, options);
}

/**
 * Resolves a user plugin reference against a service-produced sync plan.
 */
export function findPlannedSyncable(input: {
  plan: WorkspaceSyncPlan;
  pluginRef: string;
  cwd: string;
}): WorkspaceSyncPlan["syncable"][number] | null {
  const refAbs = path.resolve(input.cwd, input.pluginRef);
  return input.plan.syncable.find(({ sourcePlugin }) =>
    sourcePlugin.ref === input.pluginRef ||
    sourcePlugin.packageName === input.pluginRef ||
    sourcePlugin.dirName === input.pluginRef ||
    path.resolve(sourcePlugin.absPath) === refAbs
  ) ?? null;
}

/**
 * Starts undo capture for mutating sync commands using service-owned undo logic.
 */
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

/**
 * Determines the repo root used to bind agent-config-sync for a source plugin.
 */
async function repoRootForCall(sourcePlugin?: SourcePlugin): Promise<string> {
  const cwdRoot = await findWorkspaceRoot(process.cwd());
  if (cwdRoot) return cwdRoot;
  if (sourcePlugin?.absPath) return sourcePlugin.absPath;
  return process.cwd();
}

/**
 * Runs destination sync through the standalone agent-config-sync service.
 */
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
  const client = createAgentConfigSyncClient({ repoRoot, undoCapture: input.options.undoCapture });

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
    context: {
      invocation: {
        traceId: input.options.dryRun
          ? "plugin-plugins.agent-config-sync.dry-run"
          : "plugin-plugins.agent-config-sync.apply",
      },
    },
  } satisfies RunSyncOptions;
  return client.execution.runSync(runInput, options);
}

/**
 * Requests provider-effective content from the service for CLI-owned packaging.
 */
export async function resolveProviderContent(input: {
  agent: "codex" | "claude";
  sourcePlugin: SourcePlugin;
  base: SourceContent;
  repoRoot?: string;
}): Promise<SourceContent> {
  const repoRoot = input.repoRoot ?? await repoRootForCall(input.sourcePlugin);
  const client = createAgentConfigSyncClient({ repoRoot });
  const request = {
    agent: input.agent,
    sourcePlugin: input.sourcePlugin,
    base: input.base,
  } satisfies ResolveProviderContentInput;
  const options = {
    context: { invocation: { traceId: `plugin-plugins.agent-config-sync.provider-content.${input.agent}` } },
  } satisfies ResolveProviderContentOptions;
  return client.execution.resolveProviderContent(request, options);
}

/**
 * Calls service retirement for managed destination plugins no longer active.
 */
export async function retireStaleManagedPlugins(input: {
  workspaceRoot: string;
  scope: SyncScope;
  codexHomes: string[];
  claudeHomes: string[];
  activePluginNames: Set<string>;
  dryRun: boolean;
  undoCapture?: UndoCaptureLike;
}) {
  const client = createAgentConfigSyncClient({ repoRoot: input.workspaceRoot, undoCapture: input.undoCapture });
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

/**
 * Default archive output directory for projection-owned Cowork packaging.
 */
export function resolveDefaultCoworkOutDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "dist", "cowork", "plugins");
}

export {
  installAndEnableClaudePlugin,
  packageCoworkPlugin,
  PLUGINS_SYNC_UNDO_PROVIDER,
};

export type {
  SourceContent,
  SourcePlugin,
  SyncItemResult,
  SyncRunResult,
  SyncScope,
};
