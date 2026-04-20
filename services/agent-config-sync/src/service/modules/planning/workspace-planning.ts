import path from "node:path";
import { runSync as runServiceSync } from "../execution/sync-engine";
import { scanSourcePluginContent } from "../source-content/lib/source-plugin-content";
import { resolveSourceScopeForPath, scopeAllows } from "../../shared/internal/source-scope";
import type { AgentConfigSyncResources } from "../../shared/resources";
import type {
  RawrPluginKind,
  SourceContent,
  SourcePlugin,
  SyncScope,
} from "../../shared/schemas";
import type { SyncRunResult } from "../execution/contract";
import type {
  AssessWorkspaceSyncInput,
  FullSyncPolicyInput,
  FullSyncPolicyResult,
  PlanWorkspaceSyncInput,
  SyncAgentSelection,
  SyncAssessment,
  TargetHomeCandidates,
  TargetHomes,
  WorkspaceSkip,
  WorkspaceSyncable,
  WorkspaceSyncPlan,
} from "./contract";

type PackageJson = {
  name?: unknown;
  version?: unknown;
  description?: unknown;
  rawr?: unknown;
};

const WORKSPACE_PLUGIN_ROOTS: Array<{ scope: RawrPluginKind; relPath: string[] }> = [
  { scope: "toolkit", relPath: ["plugins", "cli"] },
  { scope: "agent", relPath: ["plugins", "agents"] },
  { scope: "web", relPath: ["plugins", "web"] },
  { scope: "api", relPath: ["plugins", "server", "api"] },
  { scope: "workflows", relPath: ["plugins", "async", "workflows"] },
  { scope: "schedules", relPath: ["plugins", "async", "schedules"] },
];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function normalizeRawrKind(input: unknown): RawrPluginKind | undefined {
  if (
    input === "toolkit" ||
    input === "agent" ||
    input === "web" ||
    input === "api" ||
    input === "workflows" ||
    input === "schedules"
  ) {
    return input;
  }
  return undefined;
}

function dedupePaths(paths: string[]): string[] {
  return [...new Set(paths.map((entry) => path.resolve(entry)))];
}

function enabledDestinationRoots(destinations: TargetHomeCandidates["codexHomesFromConfig"]): string[] {
  return destinations
    .filter((destination) => destination.enabled !== false && typeof destination.rootPath === "string")
    .map((destination) => destination.rootPath)
    .filter((rootPath): rootPath is string => Boolean(rootPath));
}

export function resolveTargetHomes(input: {
  agent: SyncAgentSelection;
  candidates: TargetHomeCandidates;
}): { agents: Array<"codex" | "claude">; homes: TargetHomes } {
  const codexConfigHomes = enabledDestinationRoots(input.candidates.codexHomesFromConfig);
  const claudeConfigHomes = enabledDestinationRoots(input.candidates.claudeHomesFromConfig);

  const codexFallbackHomes =
    input.candidates.codexHomesFromEnvironment.length > 0
      ? input.candidates.codexHomesFromEnvironment
      : codexConfigHomes.length > 0
        ? codexConfigHomes
        : input.candidates.codexDefaultHomes;

  const claudeFallbackHomes =
    input.candidates.claudeHomesFromEnvironment.length > 0
      ? input.candidates.claudeHomesFromEnvironment
      : claudeConfigHomes.length > 0
        ? claudeConfigHomes
        : input.candidates.claudeDefaultHomes;

  return {
    agents: input.agent === "all" ? ["codex", "claude"] : [input.agent],
    homes: {
      codexHomes: dedupePaths(
        input.candidates.codexHomesFromFlags.length > 0
          ? input.candidates.codexHomesFromFlags
          : codexFallbackHomes,
      ),
      claudeHomes: dedupePaths(
        input.candidates.claudeHomesFromFlags.length > 0
          ? input.candidates.claudeHomesFromFlags
          : claudeFallbackHomes,
      ),
    },
  };
}

export function evaluateFullSyncPolicy(input: FullSyncPolicyInput): FullSyncPolicyResult {
  const partialReasons: string[] = [];
  if (input.agent !== "all") partialReasons.push(`agent=${input.agent}`);
  if (input.scope !== "all") partialReasons.push(`scope=${input.scope}`);
  if (!input.coworkEnabled) partialReasons.push("cowork disabled");
  if (!input.claudeInstallEnabled) partialReasons.push("claude install disabled");
  if (input.claudeInstallEnabled && !input.claudeEnableEnabled) {
    partialReasons.push("claude enable disabled");
  }
  if (!input.installReconcileEnabled) partialReasons.push("install reconcile disabled");
  if (!input.retireOrphansEnabled) partialReasons.push("stale managed plugin retirement disabled");
  if (!input.force) partialReasons.push("force disabled");
  if (!input.gc) partialReasons.push("gc disabled");

  const allowed = partialReasons.length === 0 || input.allowPartial;
  return {
    allowed,
    partialReasons,
    canonical: "rawr plugins sync all",
    failure: allowed
      ? undefined
      : {
          code: "PARTIAL_MODE_REQUIRES_ALLOW_PARTIAL",
          message: "Partial sync mode is blocked by default; re-run with --allow-partial for advanced exceptions",
        },
  };
}

async function isWorkspaceRoot(candidateDir: string, resources: AgentConfigSyncResources): Promise<boolean> {
  const packageJsonPath = path.join(candidateDir, "package.json");
  const pluginsDir = path.join(candidateDir, "plugins");
  return (await resources.files.pathExists(packageJsonPath)) && (await resources.files.pathExists(pluginsDir));
}

export async function findWorkspaceRoot(input: {
  cwd: string;
  workspaceRoot?: string;
  resources: AgentConfigSyncResources;
}): Promise<string> {
  if (input.workspaceRoot) {
    const explicit = path.resolve(input.cwd, input.workspaceRoot);
    if (await isWorkspaceRoot(explicit, input.resources)) return explicit;
    throw new Error(`Configured workspace root is not a RAWR workspace: ${explicit}`);
  }

  let currentDir = path.resolve(input.cwd);
  for (let depth = 0; depth < 20; depth += 1) {
    if (await isWorkspaceRoot(currentDir, input.resources)) return currentDir;
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  throw new Error("Unable to locate workspace root (expected a ./plugins directory)");
}

async function listLeafPluginDirsUnder(
  rootPath: string,
  resources: AgentConfigSyncResources,
): Promise<string[]> {
  const dirents = await resources.files.readDir(rootPath);
  return dirents
    .filter((dirent) => dirent.isDirectory && !dirent.name.startsWith("."))
    .map((dirent) => path.join(rootPath, dirent.name));
}

async function listWorkspacePluginDirs(
  workspaceRoot: string,
  resources: AgentConfigSyncResources,
): Promise<string[]> {
  const pluginDirs: string[] = [];
  for (const root of WORKSPACE_PLUGIN_ROOTS) {
    pluginDirs.push(...(await listLeafPluginDirsUnder(path.join(workspaceRoot, ...root.relPath), resources)));
  }
  return pluginDirs.sort((a, b) => a.localeCompare(b));
}

async function loadSourcePluginFromPath(input: {
  ref: string;
  absPath: string;
  resources: AgentConfigSyncResources;
}): Promise<SourcePlugin> {
  const absPath = path.resolve(input.absPath);
  const kind = await input.resources.files.statPathKind(absPath);
  if (kind !== "dir") {
    throw new Error(`Resolved path is not a plugin directory: ${absPath}`);
  }

  const packageJsonPath = path.join(absPath, "package.json");
  const packageJson = await input.resources.files.readJsonFile<PackageJson>(packageJsonPath);
  const rawr = asRecord(packageJson?.rawr);

  return {
    ref: input.ref,
    absPath,
    dirName: path.basename(absPath),
    packageName: typeof packageJson?.name === "string" ? packageJson.name : undefined,
    version: typeof packageJson?.version === "string" ? packageJson.version : undefined,
    description: typeof packageJson?.description === "string" ? packageJson.description : undefined,
    rawrKind: normalizeRawrKind(rawr?.kind),
  };
}

export async function resolveSourcePlugin(input: {
  pluginRef: string;
  cwd: string;
  workspaceRoot: string;
  resources: AgentConfigSyncResources;
}): Promise<SourcePlugin> {
  const pathCandidate = path.resolve(input.cwd, input.pluginRef);
  if (await input.resources.files.pathExists(pathCandidate)) {
    return loadSourcePluginFromPath({
      ref: input.pluginRef,
      absPath: pathCandidate,
      resources: input.resources,
    });
  }

  const pluginDirs = await listWorkspacePluginDirs(input.workspaceRoot, input.resources);
  let pluginDirMatch: string | null = null;

  for (const pluginDir of pluginDirs) {
    const dirName = path.basename(pluginDir);
    if (dirName === input.pluginRef) pluginDirMatch = pluginDir;

    const packageJson = await input.resources.files.readJsonFile<PackageJson>(path.join(pluginDir, "package.json"));
    if (typeof packageJson?.name === "string" && packageJson.name === input.pluginRef) {
      return loadSourcePluginFromPath({
        ref: input.pluginRef,
        absPath: pluginDir,
        resources: input.resources,
      });
    }
  }

  if (pluginDirMatch) {
    return loadSourcePluginFromPath({
      ref: input.pluginRef,
      absPath: pluginDirMatch,
      resources: input.resources,
    });
  }

  throw new Error(
    `Could not resolve plugin '${input.pluginRef}'. Use package name, canonical plugin dir, or an absolute/relative path.`,
  );
}

async function scanSourcePlugin(input: {
  sourcePlugin: SourcePlugin;
  workspacePlugins: SourcePlugin[];
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  return scanSourcePluginContent(input);
}

function hasAnyContent(content: SourceContent): boolean {
  return (
    content.workflowFiles.length > 0 ||
    content.skills.length > 0 ||
    content.scripts.length > 0 ||
    content.agentFiles.length > 0
  );
}

export async function resolveAndScanSourcePlugin(input: {
  pluginRef: string;
  cwd: string;
  workspaceRoot: string;
  resources: AgentConfigSyncResources;
}): Promise<WorkspaceSyncable> {
  const sourcePlugin = await resolveSourcePlugin(input);
  const workspacePlugins = await loadWorkspaceSourcePlugins(input.workspaceRoot, input.resources);
  const content = await scanSourcePlugin({
    sourcePlugin,
    workspacePlugins: workspacePlugins.plugins,
    resources: input.resources,
  });
  return { sourcePlugin, content };
}

async function loadWorkspaceSourcePlugins(
  workspaceRoot: string,
  resources: AgentConfigSyncResources,
): Promise<{ plugins: SourcePlugin[]; skipped: WorkspaceSkip[] }> {
  const pluginDirs = await listWorkspacePluginDirs(workspaceRoot, resources);
  const plugins: SourcePlugin[] = [];
  const skipped: WorkspaceSkip[] = [];

  for (const absPath of pluginDirs) {
    const dirName = path.basename(absPath);
    try {
      plugins.push(await loadSourcePluginFromPath({ ref: dirName, absPath, resources }));
    } catch (error) {
      skipped.push({
        dirName,
        absPath,
        reason: `scan failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return { plugins, skipped };
}

async function discoverWorkspaceSources(input: {
  cwd: string;
  workspaceRoot?: string;
  sourcePaths: string[];
  resources: AgentConfigSyncResources;
}): Promise<{ workspaceRoot: string; syncable: WorkspaceSyncable[]; skipped: WorkspaceSkip[] }> {
  const workspaceRoot = await findWorkspaceRoot(input);
  const workspacePlugins = await loadWorkspaceSourcePlugins(workspaceRoot, input.resources);
  const syncable: WorkspaceSyncable[] = [];
  const skipped: WorkspaceSkip[] = [...workspacePlugins.skipped];

  for (const sourcePlugin of workspacePlugins.plugins) {
    try {
      const content = await scanSourcePlugin({
        sourcePlugin,
        workspacePlugins: workspacePlugins.plugins,
        resources: input.resources,
      });
      if (!hasAnyContent(content)) {
        skipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      syncable.push({ sourcePlugin, content });
    } catch (error) {
      skipped.push({
        dirName: sourcePlugin.dirName,
        absPath: sourcePlugin.absPath,
        reason: `scan failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const plannedWorkspaceDirs = new Set(syncable.map((item) => path.resolve(item.sourcePlugin.absPath)));
  const seen = new Set<string>();

  for (const candidate of input.sourcePaths) {
    const absPath = path.resolve(input.cwd, candidate);
    if (plannedWorkspaceDirs.has(absPath) || seen.has(absPath)) continue;
    seen.add(absPath);

    try {
      const sourcePlugin = await resolveSourcePlugin({
        pluginRef: absPath,
        cwd: input.cwd,
        workspaceRoot,
        resources: input.resources,
      });
      const content = await scanSourcePlugin({
        sourcePlugin,
        workspacePlugins: workspacePlugins.plugins,
        resources: input.resources,
      });
      if (!hasAnyContent(content)) {
        skipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      syncable.push({ sourcePlugin, content });
    } catch (error) {
      skipped.push({
        dirName: path.basename(absPath),
        absPath,
        reason: `unresolvable: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return { workspaceRoot, syncable, skipped };
}

function filterByScope(input: {
  workspaceRoot: string;
  syncable: WorkspaceSyncable[];
  skipped: WorkspaceSkip[];
  scope: SyncScope;
}): { syncable: WorkspaceSyncable[]; skipped: WorkspaceSkip[] } {
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

  return { syncable: filteredSyncable, skipped };
}

function summarizeWorkspaceRun(input: {
  runs: SyncRunResult[];
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

async function assessDiscoveredWorkspace(input: {
  workspaceRoot: string;
  syncable: WorkspaceSyncable[];
  skipped: WorkspaceSkip[];
  includeMetadata: boolean;
  scope: SyncScope;
  agent: SyncAgentSelection;
  targetHomeCandidates: TargetHomeCandidates;
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  resources: AgentConfigSyncResources;
}): Promise<{ assessment: SyncAssessment; agents: Array<"codex" | "claude">; targetHomes: TargetHomes }> {
  const { syncable, skipped } = filterByScope({
    workspaceRoot: input.workspaceRoot,
    syncable: input.syncable,
    skipped: input.skipped,
    scope: input.scope,
  });
  const targets = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
  });
  const runs: SyncRunResult[] = [];

  for (const { sourcePlugin, content } of syncable) {
    runs.push(await runServiceSync({
      sourcePlugin,
      content,
      options: {
        dryRun: true,
        force: true,
        gc: true,
        includeAgentsInCodex: input.includeAgentsInCodex,
        includeAgentsInClaude: input.includeAgentsInClaude,
        resources: input.resources,
      },
      codexHomes: targets.homes.codexHomes,
      claudeHomes: targets.homes.claudeHomes,
      includeCodex: targets.agents.includes("codex"),
      includeClaude: targets.agents.includes("claude"),
    }));
  }

  return {
    assessment: summarizeWorkspaceRun({
      runs,
      skipped,
      includeMetadata: input.includeMetadata,
      scope: input.scope,
    }),
    agents: targets.agents,
    targetHomes: targets.homes,
  };
}

export async function assessWorkspaceSync(input: {
  request: AssessWorkspaceSyncInput;
  resources: AgentConfigSyncResources;
}): Promise<SyncAssessment> {
  const discovered = await discoverWorkspaceSources({
    cwd: input.request.cwd,
    workspaceRoot: input.request.workspaceRoot,
    sourcePaths: input.request.sourcePaths,
    resources: input.resources,
  });
  const { assessment } = await assessDiscoveredWorkspace({
    ...discovered,
    includeMetadata: input.request.includeMetadata,
    scope: input.request.scope,
    agent: input.request.agent,
    targetHomeCandidates: input.request.targetHomeCandidates,
    includeAgentsInCodex: input.request.includeAgentsInCodex,
    includeAgentsInClaude: input.request.includeAgentsInClaude,
    resources: input.resources,
  });
  return assessment;
}

export async function planWorkspaceSync(input: {
  request: PlanWorkspaceSyncInput;
  resources: AgentConfigSyncResources;
}): Promise<WorkspaceSyncPlan> {
  const discovered = await discoverWorkspaceSources({
    cwd: input.request.cwd,
    workspaceRoot: input.request.workspaceRoot,
    sourcePaths: input.request.sourcePaths,
    resources: input.resources,
  });
  const scoped = filterByScope({
    workspaceRoot: discovered.workspaceRoot,
    syncable: discovered.syncable,
    skipped: discovered.skipped,
    scope: input.request.scope,
  });
  const { assessment, agents, targetHomes } = await assessDiscoveredWorkspace({
    workspaceRoot: discovered.workspaceRoot,
    syncable: discovered.syncable,
    skipped: discovered.skipped,
    includeMetadata: input.request.includeMetadata,
    scope: input.request.scope,
    agent: input.request.agent,
    targetHomeCandidates: input.request.targetHomeCandidates,
    includeAgentsInCodex: input.request.includeAgentsInCodex,
    includeAgentsInClaude: input.request.includeAgentsInClaude,
    resources: input.resources,
  });

  return {
    workspaceRoot: discovered.workspaceRoot,
    syncable: scoped.syncable,
    skipped: scoped.skipped,
    agents,
    targetHomes,
    includeAgentsInCodex: input.request.includeAgentsInCodex ?? false,
    includeAgentsInClaude: input.request.includeAgentsInClaude ?? true,
    activePluginNames: scoped.syncable.map((item) => item.sourcePlugin.dirName).sort((a, b) => a.localeCompare(b)),
    fullSyncPolicy: evaluateFullSyncPolicy(input.request.fullSyncPolicy),
    assessment,
  };
}
