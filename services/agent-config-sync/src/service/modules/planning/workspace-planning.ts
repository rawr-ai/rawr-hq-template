import path from "node:path";
import { parse as parseYaml } from "yaml";
import { runSync as runServiceSync } from "../execution/sync-engine";
import { resolveSourceScopeForPath, scopeAllows } from "../../shared/internal/source-scope";
import type { AgentConfigSyncResources } from "../../shared/resources";
import type {
  RawrPluginKind,
  SourceContent,
  SourcePlugin,
  SyncRunResult,
  SyncScope,
} from "../../shared/schemas";
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

type Include = {
  workflows: boolean;
  skills: boolean;
  scripts: boolean;
  agents: boolean;
};

type PluginContentLayout = {
  baseRootAbs: string;
  baseInclude: Include;
  overlayRootAbs: Record<"codex" | "claude", string>;
  includeByProvider: Record<"codex" | "claude", Include>;
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
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
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

function normalizeInclude(input: unknown): Include {
  const record = asRecord(input) ?? {};
  return {
    workflows: typeof record.workflows === "boolean" ? record.workflows : true,
    skills: typeof record.skills === "boolean" ? record.skills : true,
    scripts: typeof record.scripts === "boolean" ? record.scripts : true,
    agents: typeof record.agents === "boolean" ? record.agents : true,
  };
}

function resolveRelativePath(pluginAbsPath: string, relOrAbsPath: string): string {
  return path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.resolve(pluginAbsPath, relOrAbsPath);
}

async function resolvePluginContentLayout(
  sourcePlugin: SourcePlugin,
  resources: AgentConfigSyncResources,
): Promise<PluginContentLayout> {
  const packageJson = await resources.files.readJsonFile<PackageJson>(path.join(sourcePlugin.absPath, "package.json"));
  const rawr = asRecord(packageJson?.rawr);
  const manifest = asRecord(rawr?.pluginContent);
  const providers = asRecord(manifest?.providers);
  const codexProvider = asRecord(providers?.codex);
  const claudeProvider = asRecord(providers?.claude);
  const baseRoot =
    typeof manifest?.contentRoot === "string" && manifest.contentRoot.length > 0
      ? manifest.contentRoot
      : ".";
  const baseInclude = normalizeInclude(manifest?.include);

  return {
    baseRootAbs: resolveRelativePath(sourcePlugin.absPath, baseRoot),
    baseInclude,
    overlayRootAbs: {
      codex: resolveRelativePath(
        sourcePlugin.absPath,
        typeof codexProvider?.overlayRoot === "string" ? codexProvider.overlayRoot : path.join("providers", "codex"),
      ),
      claude: resolveRelativePath(
        sourcePlugin.absPath,
        typeof claudeProvider?.overlayRoot === "string" ? claudeProvider.overlayRoot : path.join("providers", "claude"),
      ),
    },
    includeByProvider: {
      codex: { ...baseInclude, ...normalizeInclude(codexProvider?.include) },
      claude: { ...baseInclude, ...normalizeInclude(claudeProvider?.include) },
    },
  };
}

async function scanCanonicalContentAtRoot(input: {
  rootAbsPath: string;
  include: Include;
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  const workflowsDir = path.join(input.rootAbsPath, "workflows");
  const skillsDir = path.join(input.rootAbsPath, "skills");
  const scriptsDir = path.join(input.rootAbsPath, "scripts");
  const agentsDir = path.join(input.rootAbsPath, "agents");

  const content: SourceContent = {
    workflowFiles: [],
    skills: [],
    scripts: [],
    agentFiles: [],
  };

  if (input.include.workflows && (await input.resources.files.pathExists(workflowsDir))) {
    for (const dirent of await input.resources.files.readDir(workflowsDir)) {
      if (dirent.isDirectory || !dirent.name.endsWith(".md")) continue;
      content.workflowFiles.push({
        name: dirent.name.slice(0, -3),
        absPath: path.join(workflowsDir, dirent.name),
      });
    }
  }

  if (input.include.skills && (await input.resources.files.pathExists(skillsDir))) {
    for (const dirent of await input.resources.files.readDir(skillsDir)) {
      if (!dirent.isDirectory) continue;
      const skillDir = path.join(skillsDir, dirent.name);
      if (!(await input.resources.files.pathExists(path.join(skillDir, "SKILL.md")))) continue;
      content.skills.push({ name: dirent.name, absPath: skillDir });
    }
  }

  if (input.include.scripts && (await input.resources.files.pathExists(scriptsDir))) {
    for (const dirent of await input.resources.files.readDir(scriptsDir)) {
      if (dirent.isDirectory) continue;
      content.scripts.push({
        name: dirent.name,
        absPath: path.join(scriptsDir, dirent.name),
      });
    }
  }

  if (input.include.agents && (await input.resources.files.pathExists(agentsDir))) {
    for (const dirent of await input.resources.files.readDir(agentsDir)) {
      if (dirent.isDirectory || !dirent.name.endsWith(".md")) continue;
      content.agentFiles.push({
        name: dirent.name.slice(0, -3),
        absPath: path.join(agentsDir, dirent.name),
      });
    }
  }

  content.workflowFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.skills.sort((a, b) => a.name.localeCompare(b.name));
  content.scripts.sort((a, b) => a.name.localeCompare(b.name));
  content.agentFiles.sort((a, b) => a.name.localeCompare(b.name));

  return content;
}

async function readPluginYamlToolkits(input: {
  pluginAbsPath: string;
  resources: AgentConfigSyncResources;
}): Promise<"all" | string[] | undefined> {
  const filePath = path.join(input.pluginAbsPath, "plugin.yaml");
  const raw = await input.resources.files.readTextFile(filePath);
  if (raw === null) return undefined;
  const parsed = parseYaml(raw);
  const config = asRecord(parsed);
  if (config?.version !== 1) {
    throw new Error(`Invalid plugin.yaml in ${filePath}: expected version: 1`);
  }
  const imports = asRecord(config.imports);
  const toolkits = imports?.toolkits;
  if (toolkits === "all") return "all";
  if (Array.isArray(toolkits) && toolkits.every((item) => typeof item === "string" && item.length > 0)) {
    return [...toolkits];
  }
  if (toolkits === undefined) return undefined;
  throw new Error(`Invalid plugin.yaml imports.toolkits in ${filePath}`);
}

function assertUnique(kind: string, names: string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) throw new Error(`tools composition produced duplicate ${kind}: ${name}`);
    seen.add(name);
  }
}

async function scanComposedToolsContent(input: {
  toolsPlugin: SourcePlugin;
  workspaceRoot: string;
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  const yamlImports = await readPluginYamlToolkits({
    pluginAbsPath: input.toolsPlugin.absPath,
    resources: input.resources,
  });
  const pluginDirs = await listWorkspacePluginDirs(input.workspaceRoot, input.resources);
  const toolkits: SourcePlugin[] = [];

  for (const pluginDir of pluginDirs) {
    const dirName = path.basename(pluginDir);
    const sourcePlugin = await loadSourcePluginFromPath({
      ref: dirName,
      absPath: pluginDir,
      resources: input.resources,
    });
    if (sourcePlugin.rawrKind !== "toolkit") continue;
    toolkits.push(sourcePlugin);
  }

  toolkits.sort((a, b) => a.dirName.localeCompare(b.dirName));

  const selectedToolkits =
    yamlImports === undefined || yamlImports === "all"
      ? toolkits
      : toolkits.filter((toolkit) =>
          yamlImports.includes(toolkit.dirName) ||
          (toolkit.packageName ? yamlImports.includes(toolkit.packageName) : false),
        );

  const content: SourceContent = {
    workflowFiles: [],
    skills: [],
    scripts: [],
    agentFiles: [],
  };
  const includeAll: Include = { workflows: true, skills: true, scripts: true, agents: true };

  for (const toolkit of selectedToolkits) {
    const toolkitContent = await scanCanonicalContentAtRoot({
      rootAbsPath: path.join(toolkit.absPath, "agent-pack"),
      include: includeAll,
      resources: input.resources,
    });

    for (const workflow of toolkitContent.workflowFiles) {
      content.workflowFiles.push({ name: `${toolkit.dirName}--${workflow.name}`, absPath: workflow.absPath });
    }
    for (const skill of toolkitContent.skills) {
      content.skills.push({ name: `toolkit-${toolkit.dirName}-${skill.name}`, absPath: skill.absPath });
    }
    for (const agent of toolkitContent.agentFiles) {
      content.agentFiles.push({ name: `${toolkit.dirName}--${agent.name}`, absPath: agent.absPath });
    }
    for (const script of toolkitContent.scripts) {
      content.scripts.push({ name: `${toolkit.dirName}--${script.name}`, absPath: script.absPath });
    }
  }

  content.workflowFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.skills.sort((a, b) => a.name.localeCompare(b.name));
  content.agentFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.scripts.sort((a, b) => a.name.localeCompare(b.name));

  assertUnique("workflow", content.workflowFiles.map((workflow) => workflow.name));
  assertUnique("skill", content.skills.map((skill) => skill.name));
  assertUnique("agent", content.agentFiles.map((agent) => agent.name));
  assertUnique("script", content.scripts.map((script) => script.name));

  return content;
}

export async function scanSourcePlugin(input: {
  sourcePlugin: SourcePlugin;
  workspaceRoot: string;
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  if (
    input.sourcePlugin.dirName === "plugins" ||
    input.sourcePlugin.dirName === "tools" ||
    input.sourcePlugin.packageName === "@rawr/plugin-plugins" ||
    input.sourcePlugin.packageName === "@rawr/plugin-tools" ||
    input.sourcePlugin.packageName === "@rawr/plugin-agent-sync"
  ) {
    return scanComposedToolsContent({
      toolsPlugin: input.sourcePlugin,
      workspaceRoot: input.workspaceRoot,
      resources: input.resources,
    });
  }

  const layout = await resolvePluginContentLayout(input.sourcePlugin, input.resources);
  return scanCanonicalContentAtRoot({
    rootAbsPath: layout.baseRootAbs,
    include: layout.baseInclude,
    resources: input.resources,
  });
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
  const content = await scanSourcePlugin({
    sourcePlugin,
    workspaceRoot: input.workspaceRoot,
    resources: input.resources,
  });
  return { sourcePlugin, content };
}

async function discoverWorkspaceSources(input: {
  cwd: string;
  workspaceRoot?: string;
  sourcePaths: string[];
  resources: AgentConfigSyncResources;
}): Promise<{ workspaceRoot: string; syncable: WorkspaceSyncable[]; skipped: WorkspaceSkip[] }> {
  const workspaceRoot = await findWorkspaceRoot(input);
  const pluginDirs = await listWorkspacePluginDirs(workspaceRoot, input.resources);
  const syncable: WorkspaceSyncable[] = [];
  const skipped: WorkspaceSkip[] = [];

  for (const absPath of pluginDirs) {
    const dirName = path.basename(absPath);
    try {
      const sourcePlugin = await loadSourcePluginFromPath({ ref: dirName, absPath, resources: input.resources });
      const content = await scanSourcePlugin({ sourcePlugin, workspaceRoot, resources: input.resources });
      if (!hasAnyContent(content)) {
        skipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      syncable.push({ sourcePlugin, content });
    } catch (error) {
      skipped.push({
        dirName,
        absPath,
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
      const content = await scanSourcePlugin({ sourcePlugin, workspaceRoot, resources: input.resources });
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
