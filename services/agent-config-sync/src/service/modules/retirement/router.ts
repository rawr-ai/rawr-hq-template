import { module } from "./module";
import type { RetireAction, RetireStaleManagedResult } from "./contract";
import type { SyncScope } from "../../shared/entities";
import type { AgentConfigSyncPathResources, AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../shared/resources";
import { deletePathIfPresent } from "./helpers/filesystem-actions";
import { MANAGED_BY, pluginMatchesScope } from "./helpers/managed-source";

type ClaudeMarketplacePlugin = { name?: unknown; [key: string]: unknown };
type ClaudeMarketplaceFile = { plugins?: ClaudeMarketplacePlugin[]; [key: string]: unknown };

type ClaudeManagedPluginManifest = {
  plugin?: unknown;
  sourcePluginPath?: unknown;
  managedBy?: unknown;
};

type CodexRegistryPlugin = {
  name?: unknown;
  prompts?: unknown;
  skills?: unknown;
  scripts?: unknown;
  source_plugin_path?: unknown;
  managed_by?: unknown;
  [key: string]: unknown;
};

type CodexRegistryFile = {
  plugins?: CodexRegistryPlugin[];
  [key: string]: unknown;
};

type CodexStaleEntry = { pluginName: string; prompts: string[]; skills: string[]; scripts: string[] };
type CodexRetirementPlan = { registryPath: string; stale: CodexStaleEntry[]; staleNames: string[]; nextRegistry: CodexRegistryFile };

type ClaudeStaleEntry = { pluginName: string; dirName: string; target: string };
type ClaudeRetirementPlan = { stale: ClaudeStaleEntry[]; staleNames: Set<string>; marketplaceUpdate?: { marketplacePath: string; nextMarketplace: ClaudeMarketplaceFile } };

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function codexRegistryPath(codexHome: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(codexHome, "plugins", "registry.json");
}

function claudeMarketplacePath(claudeHome: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(claudeHome, ".claude-plugin", "marketplace.json");
}

function codexPromptTarget(codexHome: string, prompt: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(codexHome, "prompts", `${prompt}.md`);
}

function codexSkillTarget(codexHome: string, skill: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(codexHome, "skills", skill);
}

function codexScriptTarget(codexHome: string, script: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(codexHome, "scripts", script);
}

function pushRetireAction(bucket: RetireAction[], action: RetireAction): void {
  bucket.push(action);
}

async function readManagedClaudeSyncManifest(input: {
  claudeHome: string;
  dirName: string;
  resources: AgentConfigSyncResources;
}): Promise<{ pluginName: string; sourcePluginPath: string } | null> {
  const filePath = input.resources.path.join(input.claudeHome, "plugins", input.dirName, ".rawr-sync-manifest.json");
  const raw = await input.resources.files.readJsonFile<ClaudeManagedPluginManifest>(filePath);
  if (!raw || raw.managedBy !== MANAGED_BY) return null;
  if (typeof raw.sourcePluginPath !== "string" || raw.sourcePluginPath.length === 0) return null;
  const pluginName = typeof raw.plugin === "string" && raw.plugin.length > 0 ? raw.plugin : input.dirName;
  return { pluginName, sourcePluginPath: raw.sourcePluginPath };
}

function computeCodexRetirementPlan(input: {
  registryPath: string;
  registry: CodexRegistryFile;
  workspaceRoot: string;
  scope: SyncScope;
  resources: AgentConfigSyncResources;
  activePluginNames: Set<string>;
}): CodexRetirementPlan | null {
  if (!Array.isArray(input.registry.plugins)) return null;

  const stale: CodexStaleEntry[] = [];
  for (const plugin of input.registry.plugins) {
    if (!plugin || plugin.managed_by !== MANAGED_BY) continue;
    if (typeof plugin.name !== "string" || plugin.name.length === 0) continue;
    if (input.activePluginNames.has(plugin.name)) continue;
    if (!pluginMatchesScope({
      pathOps: input.resources.path,
      sourcePluginPath: plugin.source_plugin_path,
      workspaceRoot: input.workspaceRoot,
      scope: input.scope,
    })) continue;

    stale.push({
      pluginName: plugin.name,
      prompts: toStringArray(plugin.prompts),
      skills: toStringArray(plugin.skills),
      scripts: toStringArray(plugin.scripts),
    });
  }

  if (stale.length === 0) return null;
  const staleNames = stale.map((entry) => entry.pluginName);
  const staleSet = new Set(staleNames);
  const nextRegistry: CodexRegistryFile = {
    ...input.registry,
    plugins: input.registry.plugins.filter(
      (plugin) => !(typeof plugin?.name === "string" && staleSet.has(plugin.name)),
    ),
    last_synced: new Date().toISOString(),
  };

  return { registryPath: input.registryPath, stale, staleNames, nextRegistry };
}

async function computeClaudeRetirementPlan(input: {
  claudeHome: string;
  workspaceRoot: string;
  scope: SyncScope;
  activePluginNames: Set<string>;
  resources: AgentConfigSyncResources;
}): Promise<ClaudeRetirementPlan> {
  const pluginsRoot = input.resources.path.join(input.claudeHome, "plugins");
  const dirents = await input.resources.files.readDir(pluginsRoot);
  const stale: ClaudeStaleEntry[] = [];
  const staleNames = new Set<string>();

  for (const dirent of dirents) {
    if (!dirent.isDirectory) continue;
    const managed = await readManagedClaudeSyncManifest({
      claudeHome: input.claudeHome,
      dirName: dirent.name,
      resources: input.resources,
    });
    if (!managed) continue;
    if (input.activePluginNames.has(managed.pluginName)) continue;
    if (!pluginMatchesScope({
      pathOps: input.resources.path,
      sourcePluginPath: managed.sourcePluginPath,
      workspaceRoot: input.workspaceRoot,
      scope: input.scope,
    })) continue;

    staleNames.add(managed.pluginName);
    stale.push({
      pluginName: managed.pluginName,
      dirName: dirent.name,
      target: input.resources.path.join(pluginsRoot, dirent.name),
    });
  }

  const plan: ClaudeRetirementPlan = { stale, staleNames };
  if (staleNames.size === 0) return plan;

  const marketplacePath = claudeMarketplacePath(input.claudeHome, input.resources.path);
  const marketplace = await input.resources.files.readJsonFile<ClaudeMarketplaceFile>(marketplacePath);
  if (!marketplace || !Array.isArray(marketplace.plugins)) return plan;

  const nextPlugins = marketplace.plugins.filter(
    (plugin) => !(typeof plugin?.name === "string" && staleNames.has(plugin.name)),
  );
  if (nextPlugins.length === marketplace.plugins.length) return plan;

  plan.marketplaceUpdate = {
    marketplacePath,
    nextMarketplace: { ...marketplace, plugins: nextPlugins },
  };
  return plan;
}

async function retireStaleManagedInCodexHome(input: {
  codexHome: string;
  workspaceRoot: string;
  scope: SyncScope;
  activePluginNames: Set<string>;
  dryRun: boolean;
  undoCapture?: AgentConfigSyncUndoCapture;
  resources: AgentConfigSyncResources;
  pathOps: AgentConfigSyncPathResources;
}): Promise<{
  ok: boolean;
  actions: RetireAction[];
  stalePlugins: RetireStaleManagedResult["stalePlugins"];
}> {
  // Note: keep this as "mechanical retirement" only; scope and registry filtering
  // define the domain meaning of "stale managed".
  const actions: RetireAction[] = [];
  const stalePlugins: RetireStaleManagedResult["stalePlugins"] = [];
  const registryPath = codexRegistryPath(input.codexHome, input.pathOps);

  try {
    const registry = await input.resources.files.readJsonFile<CodexRegistryFile>(registryPath);
    if (!registry) return { ok: true, actions, stalePlugins };

    const plan = computeCodexRetirementPlan({
      registryPath,
      registry,
      workspaceRoot: input.workspaceRoot,
      scope: input.scope,
      resources: input.resources,
      activePluginNames: input.activePluginNames,
    });
    if (!plan) return { ok: true, actions, stalePlugins };

    const undoCapture = input.dryRun ? undefined : input.undoCapture;
    for (const entry of plan.stale) {
      stalePlugins.push({ agent: "codex", home: input.codexHome, plugin: entry.pluginName });

      for (const prompt of entry.prompts) {
        const target = codexPromptTarget(input.codexHome, prompt, input.pathOps);
        const action = await deletePathIfPresent({ dryRun: input.dryRun, target, undoCapture, resources: input.resources });
        pushRetireAction(actions, { agent: "codex", home: input.codexHome, plugin: entry.pluginName, target, action, message: "retire stale prompt" });
      }
      for (const skill of entry.skills) {
        const target = codexSkillTarget(input.codexHome, skill, input.pathOps);
        const action = await deletePathIfPresent({ dryRun: input.dryRun, target, recursive: true, undoCapture, resources: input.resources });
        pushRetireAction(actions, { agent: "codex", home: input.codexHome, plugin: entry.pluginName, target, action, message: "retire stale skill" });
      }
      for (const script of entry.scripts) {
        const target = codexScriptTarget(input.codexHome, script, input.pathOps);
        const action = await deletePathIfPresent({ dryRun: input.dryRun, target, undoCapture, resources: input.resources });
        pushRetireAction(actions, { agent: "codex", home: input.codexHome, plugin: entry.pluginName, target, action, message: "retire stale script" });
      }
    }

    if (!input.dryRun) {
      await undoCapture?.captureWriteTarget(plan.registryPath);
      await input.resources.files.writeJsonFile(plan.registryPath, plan.nextRegistry);
    }
    pushRetireAction(actions, {
      agent: "codex",
      home: input.codexHome,
      plugin: "*",
      target: plan.registryPath,
      action: input.dryRun ? "planned" : "updated",
      message: `removed stale managed plugin entries: ${plan.staleNames.join(", ")}`,
    });
    return { ok: true, actions, stalePlugins };
  } catch (err) {
    pushRetireAction(actions, { agent: "codex", home: input.codexHome, plugin: "*", target: registryPath, action: "failed", message: err instanceof Error ? err.message : String(err) });
    return { ok: false, actions, stalePlugins };
  }
}

async function retireStaleManagedInClaudeHome(input: {
  claudeHome: string;
  workspaceRoot: string;
  scope: SyncScope;
  activePluginNames: Set<string>;
  dryRun: boolean;
  undoCapture?: AgentConfigSyncUndoCapture;
  resources: AgentConfigSyncResources;
  pathOps: AgentConfigSyncPathResources;
}): Promise<{
  ok: boolean;
  actions: RetireAction[];
  stalePlugins: RetireStaleManagedResult["stalePlugins"];
}> {
  const actions: RetireAction[] = [];
  const stalePlugins: RetireStaleManagedResult["stalePlugins"] = [];
  const marketplacePath = claudeMarketplacePath(input.claudeHome, input.pathOps);

  try {
    const plan = await computeClaudeRetirementPlan({
      claudeHome: input.claudeHome,
      workspaceRoot: input.workspaceRoot,
      scope: input.scope,
      activePluginNames: input.activePluginNames,
      resources: input.resources,
    });

    const undoCapture = input.dryRun ? undefined : input.undoCapture;
    for (const entry of plan.stale) {
      stalePlugins.push({ agent: "claude", home: input.claudeHome, plugin: entry.pluginName });
      const action = await deletePathIfPresent({ dryRun: input.dryRun, target: entry.target, recursive: true, undoCapture, resources: input.resources });
      pushRetireAction(actions, { agent: "claude", home: input.claudeHome, plugin: entry.pluginName, target: entry.target, action, message: "retire stale plugin directory" });
    }

    if (plan.marketplaceUpdate) {
      if (!input.dryRun) {
        await undoCapture?.captureWriteTarget(plan.marketplaceUpdate.marketplacePath);
        await input.resources.files.writeJsonFile(plan.marketplaceUpdate.marketplacePath, plan.marketplaceUpdate.nextMarketplace);
      }
      pushRetireAction(actions, {
        agent: "claude",
        home: input.claudeHome,
        plugin: "*",
        target: plan.marketplaceUpdate.marketplacePath,
        action: input.dryRun ? "planned" : "updated",
        message: `removed stale managed marketplace entries: ${[...plan.staleNames].join(", ")}`,
      });
    }

    return { ok: true, actions, stalePlugins };
  } catch (err) {
    pushRetireAction(actions, { agent: "claude", home: input.claudeHome, plugin: "*", target: marketplacePath, action: "failed", message: err instanceof Error ? err.message : String(err) });
    return { ok: false, actions, stalePlugins };
  }
}

const retireStaleManaged = module.retireStaleManaged.handler(async ({ context, input }) => {
  const pathOps = context.resources.path;
  const activePluginNames = new Set(input.activePluginNames);
  const undoCapture = input.dryRun ? undefined : context.undoCapture;
  const actions: RetireAction[] = [];
  const stalePlugins: RetireStaleManagedResult["stalePlugins"] = [];
  let ok = true;

  for (const codexHome of input.codexHomes) {
    const result = await retireStaleManagedInCodexHome({
      codexHome,
      workspaceRoot: input.workspaceRoot,
      scope: input.scope,
      activePluginNames,
      dryRun: input.dryRun,
      undoCapture,
      resources: context.resources,
      pathOps,
    });
    ok = ok && result.ok;
    actions.push(...result.actions);
    stalePlugins.push(...result.stalePlugins);
  }

  for (const claudeHome of input.claudeHomes) {
    const result = await retireStaleManagedInClaudeHome({
      claudeHome,
      workspaceRoot: input.workspaceRoot,
      scope: input.scope,
      activePluginNames,
      dryRun: input.dryRun,
      undoCapture,
      resources: context.resources,
      pathOps,
    });
    ok = ok && result.ok;
    actions.push(...result.actions);
    stalePlugins.push(...result.stalePlugins);
  }

  return { ok, stalePlugins, actions };
});

export const router = module.router({ retireStaleManaged });
