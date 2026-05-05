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
import {
  createNodeAgentConfigSyncResources,
  installCodexMarketplacePlugins,
  installAndEnableClaudePlugin,
  packageCodexPlugin,
  packageCoworkPlugin,
  resolveCodexBin,
} from "@rawr/agent-config-sync-node";
import { createAgentConfigSyncClient } from "./agent-config-sync-binding";
import type { HostSourceContent as SourceContent, HostSourcePlugin as SourcePlugin } from "@rawr/agent-config-sync-node/types";
import { findWorkspaceRoot } from "@rawr/core";

export type UndoCaptureLike = AgentConfigSyncUndoCapture;
type RunSyncInput = Parameters<Client["execution"]["runSync"]>[0];
type RunSyncOptions = NonNullable<Parameters<Client["execution"]["runSync"]>[1]>;
type ResolveProviderContentInput = Parameters<Client["execution"]["resolveProviderContent"]>[0];
type ResolveProviderContentOptions = NonNullable<Parameters<Client["execution"]["resolveProviderContent"]>[1]>;
type RetireStaleManagedInput = Parameters<Client["retirement"]["retireStaleManaged"]>[0];
type RetireStaleManagedOptions = NonNullable<Parameters<Client["retirement"]["retireStaleManaged"]>[1]>;
type CleanupBehindProviderSyncInput = Parameters<Client["retirement"]["cleanupBehindProviderSync"]>[0];
type CleanupBehindProviderSyncOptions = NonNullable<Parameters<Client["retirement"]["cleanupBehindProviderSync"]>[1]>;
type PlanWorkspaceSyncOptions = NonNullable<Parameters<Client["planning"]["planWorkspaceSync"]>[1]>;
type AssessWorkspaceSyncOptions = NonNullable<Parameters<Client["planning"]["assessWorkspaceSync"]>[1]>;

type SyncDestinationConfig = {
  rootPath?: string;
  enabled?: boolean;
};

type LayeredSyncConfig = {
  sync?: {
    sourceWorkspace?: {
      rootPath?: string;
    };
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

export type SourceWorkspaceSelection = {
  invocationWorkspaceRoot: string | null;
  sourceWorkspaceRoot: string;
  external: boolean;
  selectedBy: "flag" | "config" | "cwd";
};

/**
 * Extracts provider include-agent policy from layered RAWR config.
 */
function syncProviderPolicy(config?: LayeredSyncConfig): {
  includeAgentsInCodex: boolean;
  includeAgentsInClaude: boolean;
} {
  return {
    includeAgentsInCodex: config?.sync?.providers?.codex?.includeAgents ?? true,
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

function resolveWorkspaceCandidate(input: {
  rawPath: string;
  baseDir: string;
}): string {
  const expanded = expandTilde(input.rawPath);
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(input.baseDir, expanded);
}

/**
 * Resolves the RAWR workspace whose plugin content is the sync source of truth.
 */
export async function resolveSourceWorkspaceSelection(input: {
  cwd: string;
  sourceWorkspaceFlag?: string;
  config?: LayeredSyncConfig | null;
  configWorkspacePath?: string | null;
  configGlobalPath?: string | null;
}): Promise<SourceWorkspaceSelection> {
  const invocationWorkspaceRoot = await findWorkspaceRoot(input.cwd);
  const configured = input.config?.sync?.sourceWorkspace?.rootPath?.trim();
  const selectedBy = input.sourceWorkspaceFlag && input.sourceWorkspaceFlag.trim().length > 0
    ? "flag"
    : configured && configured.length > 0
      ? "config"
      : "cwd";
  const configBaseDir = input.configWorkspacePath
    ? path.dirname(input.configWorkspacePath)
    : input.configGlobalPath
      ? path.dirname(input.configGlobalPath)
      : input.cwd;
  const candidate = selectedBy === "flag"
    ? resolveWorkspaceCandidate({ rawPath: input.sourceWorkspaceFlag!.trim(), baseDir: input.cwd })
    : selectedBy === "config"
      ? resolveWorkspaceCandidate({ rawPath: configured!, baseDir: configBaseDir })
      : input.cwd;
  const sourceWorkspaceRoot = await findWorkspaceRoot(candidate);

  if (!sourceWorkspaceRoot) {
    throw new Error(`Unable to locate source workspace root for ${candidate}`);
  }

  return {
    invocationWorkspaceRoot,
    sourceWorkspaceRoot,
    external: invocationWorkspaceRoot ? path.resolve(invocationWorkspaceRoot) !== path.resolve(sourceWorkspaceRoot) : false,
    selectedBy,
  };
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

function parseEnvHome(key: string): string | null {
  const rawValue = process.env[key]?.trim();
  return rawValue ? expandTilde(rawValue) : null;
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
  const codexHomePrimary = parseEnvHome("CODEX_HOME");
  const claudeHomesFromEnvironment = parseEnvHomes("RAWR_AGENT_SYNC_CLAUDE_HOMES");
  const claudeHomeFromEnvVar = parseEnvHome("CLAUDE_PLUGINS_LOCAL");
  const userHome = process.env.HOME ? String(process.env.HOME) : os.homedir();

  return {
    codexHomesFromFlags: input.codexHomesFromFlags.map(expandTilde),
    claudeHomesFromFlags: input.claudeHomesFromFlags.map(expandTilde),
    codexHomesFromEnvironment: codexHomesFromEnvironment.length > 0
      ? codexHomesFromEnvironment
      : codexHomePrimary
        ? [codexHomePrimary]
        : [],
    claudeHomesFromEnvironment: claudeHomesFromEnvironment.length > 0
      ? claudeHomesFromEnvironment
      : claudeHomeFromEnvVar
        ? [claudeHomeFromEnvVar]
        : [],
    codexHomesFromConfig: mapDestinations(input.config?.sync?.providers?.codex?.destinations),
    claudeHomesFromConfig: mapDestinations(input.config?.sync?.providers?.claude?.destinations),
    codexDefaultHomes: [path.join(userHome, ".codex-rawr")],
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
  workspaceRoot?: string;
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
    ...(input.workspaceRoot ? { workspaceRoot: input.workspaceRoot } : {}),
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
  workspaceRoot?: string;
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
    ...(input.workspaceRoot ? { workspaceRoot: input.workspaceRoot } : {}),
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
 * Calls service cleanup-behind behavior for managed residue superseded by a
 * successful provider sync.
 */
export async function cleanupBehindProviderSync(input: {
  workspaceRoot: string;
  claimCheckCodexHomes: string[];
  candidates: CleanupBehindProviderSyncInput["candidates"];
  dryRun: boolean;
  undoCapture?: UndoCaptureLike;
}) {
  const client = createAgentConfigSyncClient({ repoRoot: input.workspaceRoot, undoCapture: input.undoCapture });
  const cleanupInput = {
    workspaceRoot: input.workspaceRoot,
    claimCheckCodexHomes: input.claimCheckCodexHomes,
    candidates: input.candidates,
    dryRun: input.dryRun,
  } satisfies CleanupBehindProviderSyncInput;
  const options = {
    context: { invocation: { traceId: "plugin-plugins.agent-config-sync.cleanup-behind" } },
  } satisfies CleanupBehindProviderSyncOptions;
  return client.retirement.cleanupBehindProviderSync(cleanupInput, options);
}

export type CleanupBehindCandidate = CleanupBehindProviderSyncInput["candidates"][number];
type CleanupBehindResultLike = Awaited<ReturnType<typeof cleanupBehindProviderSync>>;

type CleanupBehindCodexPackage = {
  plugin: string;
  action: string;
  skillCount?: number;
  hookConfigCount?: number;
  mcpServerCount?: number;
};

function asRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function packageByPlugin(packages: CleanupBehindCodexPackage[]): Map<string, CleanupBehindCodexPackage> {
  return new Map(
    packages
      .filter((pkg) => pkg.action !== "skipped")
      .map((pkg) => [pkg.plugin, pkg]),
  );
}

/**
 * Derives provider cleanup candidates from Codex install/package outcomes.
 */
export function buildCleanupBehindCodexCandidates(input: {
  enabled: boolean;
  destinationProjectionEnabled: boolean;
  codexPackageEnabled: boolean;
  codexInstallEnabled: boolean;
  dryRun: boolean;
  codexInstall: Record<string, unknown>;
  codexPackages: CleanupBehindCodexPackage[];
  sourcePluginRootsByName: ReadonlyMap<string, string>;
  fallbackCodexHome?: string;
}): CleanupBehindCandidate[] {
  if (!input.enabled || input.destinationProjectionEnabled || !input.codexPackageEnabled || !input.codexInstallEnabled) return [];
  if (!input.dryRun && input.codexInstall.ok !== true) return [];

  const packages = packageByPlugin(input.codexPackages);
  const candidates: CleanupBehindCandidate[] = [];
  for (const action of asRecords(input.codexInstall.actions)) {
    const actionKind = asString(action.action);
    const plugin = asString(action.plugin);
    if (!plugin) continue;
    const sourcePluginRoot = input.sourcePluginRootsByName.get(plugin);
    if (!sourcePluginRoot) continue;
    const home = asString(action.codexHome) ?? input.fallbackCodexHome;
    if (!home) continue;

    if (actionKind === "verified" && action.installed === true && action.enabled === true) {
      candidates.push({
        provider: "codex",
        home,
        plugin,
        sourcePluginRoot,
        reason: "codex_native_superseded_projection",
        verification: "verified",
        verifiedCapabilities: {
          skills: asNumber(action.skillCount) > 0 && asNumber(action.visiblePluginSkillCount) >= asNumber(action.skillCount),
          hooks: asNumber(action.providerHookCount) > 0,
          mcp: asNumber(action.mcpServerCount) > 0,
        },
      });
      continue;
    }

    if (input.dryRun && actionKind === "planned") {
      const pkg = packages.get(plugin);
      if (!pkg) continue;
      candidates.push({
        provider: "codex",
        home,
        plugin,
        sourcePluginRoot,
        reason: "codex_native_superseded_projection",
        verification: "dry-run-planned",
        verifiedCapabilities: {
          skills: asNumber(pkg.skillCount) > 0,
          hooks: asNumber(pkg.hookConfigCount) > 0,
          mcp: asNumber(pkg.mcpServerCount) > 0,
        },
      });
    }
  }

  return candidates;
}

/**
 * Adds well-known sibling Codex homes that share the user runtime skill root.
 */
export function buildCleanupBehindCodexClaimCheckHomes(codexHomes: string[]): string[] {
  const homes = new Set<string>();
  for (const codexHome of codexHomes) {
    homes.add(codexHome);
    const basename = path.basename(codexHome);
    if (basename !== ".codex" && basename !== ".codex-rawr") continue;
    const userRoot = path.dirname(codexHome);
    homes.add(path.join(userRoot, ".codex"));
    homes.add(path.join(userRoot, ".codex-rawr"));
  }
  return [...homes];
}

export function emptyCleanupBehindResult(reason = "not run") {
  return {
    ok: true,
    cleanedPlugins: [],
    retainedResidue: [],
    actions: reason === "not run"
      ? []
      : [{
          agent: "codex" as const,
          home: "*",
          plugin: "*",
          target: "*",
          action: "skipped" as const,
          message: reason,
        }],
  };
}

const CODEX_PROMPT_MIGRATION_WARNING =
  "Current Codex guidance favors skills for reusable workflows. Codex prompts/ output from RAWR sync is a legacy/auxiliary compatibility mirror, not native Codex workflow or plugin parity; migrate repeatable prompts/workflows into skills when possible.";
const CLAUDE_COMMAND_MIGRATION_WARNING =
  "Claude Code custom commands have been merged into skills. Claude commands/ output from RAWR sync remains a supported compatibility/direct-invocation mirror, but skills are the preferred richer structure for repeatable workflows; migrate repeatable commands/workflows into skills when possible.";

function pathHasSegment(inputPath: string, segment: string): boolean {
  const parts = inputPath.split(/[\\/]+/).filter(Boolean);
  return parts.includes(segment);
}

/**
 * Produces post-sync warnings when provider workflow mirrors are retained or
 * projected. This keeps the destructive cleanup service policy-neutral while
 * making the CLI output honest about legacy prompt/command debt.
 */
export function buildProviderWorkflowMirrorWarnings(input: {
  cleanupBehind?: CleanupBehindResultLike;
  syncTargets?: Array<{
    agent: string;
    items: Array<Pick<SyncItemResult, "action" | "kind" | "target">>;
  }>;
}): string[] {
  const retainedPromptMirror = (input.cleanupBehind?.retainedResidue ?? []).some((item) => {
    const record = item as Record<string, unknown>;
    const target = typeof record.target === "string" ? record.target : "";
    return record.agent === "codex" && record.reason === "projection-only-retained" && pathHasSegment(target, "prompts");
  });
  const retainedCommandMirror = (input.cleanupBehind?.retainedResidue ?? []).some((item) => {
    const record = item as Record<string, unknown>;
    const target = typeof record.target === "string" ? record.target : "";
    return record.agent === "claude" && record.reason === "projection-only-retained" && pathHasSegment(target, "commands");
  });
  const projectedPromptMirror = (input.syncTargets ?? []).some((target) =>
    target.agent === "codex" &&
    target.items.some((item) =>
      item.kind === "workflow" &&
      item.action !== "deleted" &&
      pathHasSegment(item.target, "prompts")
    )
  );
  const projectedCommandMirror = (input.syncTargets ?? []).some((target) =>
    target.agent === "claude" &&
    target.items.some((item) =>
      item.kind === "workflow" &&
      item.action !== "deleted" &&
      pathHasSegment(item.target, "commands")
    )
  );

  const warnings: string[] = [];
  if (retainedPromptMirror || projectedPromptMirror) warnings.push(CODEX_PROMPT_MIGRATION_WARNING);
  if (retainedCommandMirror || projectedCommandMirror) warnings.push(CLAUDE_COMMAND_MIGRATION_WARNING);

  return warnings;
}

/**
 * Default archive output directory for projection-owned Cowork packaging.
 */
export function resolveDefaultCoworkOutDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "dist", "cowork", "plugins");
}

/**
 * Default artifact output directory for official Codex plugin packages.
 */
export function resolveDefaultCodexOutDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "dist", "codex");
}

export {
  installCodexMarketplacePlugins,
  installAndEnableClaudePlugin,
  packageCodexPlugin,
  packageCoworkPlugin,
  PLUGINS_SYNC_UNDO_PROVIDER,
  resolveCodexBin,
};

export type {
  SourceContent,
  SourcePlugin,
  SyncItemResult,
  SyncRunResult,
  SyncScope,
};
