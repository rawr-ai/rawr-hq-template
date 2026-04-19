import path from "node:path";

import { resolveSourceScopeForPath, scopeAllows } from "../../shared/internal/source-scope";
import type { AgentConfigSyncResources } from "../../shared/resources";
import type { SyncScope } from "../../shared/schemas";
import type { RetireAction, RetireStaleManagedResult } from "./schemas";

const MANAGED_BY = "@rawr/plugin-plugins";

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

type ClaudeMarketplacePlugin = {
  name?: unknown;
  [key: string]: unknown;
};

type ClaudeMarketplaceFile = {
  plugins?: ClaudeMarketplacePlugin[];
  [key: string]: unknown;
};

function toStringSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0));
}

type ClaudeManagedPluginManifest = {
  plugin: string;
  sourcePluginPath: string;
  managedBy: string;
};

async function readClaudeSyncManifest(
  claudeLocalHome: string,
  pluginName: string,
  resources: AgentConfigSyncResources,
): Promise<ClaudeManagedPluginManifest | null> {
  const filePath = path.join(
    claudeLocalHome,
    "plugins",
    pluginName,
    ".rawr-sync-manifest.json",
  );
  const parsed = await resources.files.readJsonFile<ClaudeManagedPluginManifest>(filePath);
  if (!parsed || parsed.managedBy !== MANAGED_BY) return null;
  return parsed;
}

async function deletePathIfPresent(input: {
  dryRun: boolean;
  target: string;
  recursive?: boolean;
  undoCapture?: {
    captureDeleteTarget(target: string): Promise<void>;
  };
  resources: AgentConfigSyncResources;
}): Promise<"planned" | "deleted" | "skipped"> {
  const kind = await input.resources.files.statPathKind(input.target);
  if (!kind) return "skipped";
  if (input.dryRun) return "planned";

  await input.undoCapture?.captureDeleteTarget(input.target);
  await input.resources.files.removePath(input.target, { recursive: input.recursive ?? kind === "dir" });
  return "deleted";
}

function pluginMatchesScope(
  sourcePluginPath: unknown,
  workspaceRoot: string,
  scope: SyncScope,
): boolean {
  if (scope === "all") return true;
  if (typeof sourcePluginPath !== "string" || sourcePluginPath.length === 0) return false;
  const resolved = resolveSourceScopeForPath(sourcePluginPath, workspaceRoot);
  return scopeAllows(scope, resolved);
}

/**
 * Retires Codex entries only when the registry proves RAWR managed them and the
 * source plugin is no longer active in the requested scope. The registry claims
 * provide the exact prompt, skill, and script names to delete, avoiding a broad
 * filesystem sweep across the user's Codex home.
 */
async function retireCodexHome(input: {
  codexHome: string;
  workspaceRoot: string;
  scope: SyncScope;
  activePluginNames: Set<string>;
  dryRun: boolean;
  undoCapture?: {
    captureDeleteTarget(target: string): Promise<void>;
    captureWriteTarget(target: string): Promise<void>;
  };
  resources: AgentConfigSyncResources;
}): Promise<RetireStaleManagedResult> {
  const actions: RetireAction[] = [];
  const stalePlugins: RetireStaleManagedResult["stalePlugins"] = [];
  const registryPath = path.join(input.codexHome, "plugins", "registry.json");
  const registry = await input.resources.files.readJsonFile<CodexRegistryFile>(registryPath);
  if (!registry || !Array.isArray(registry.plugins)) {
    return { ok: true, stalePlugins, actions };
  }

  const stale = registry.plugins.filter((plugin) => {
    if (plugin.managed_by !== MANAGED_BY) return false;
    if (typeof plugin.name !== "string" || plugin.name.length === 0) return false;
    if (input.activePluginNames.has(plugin.name)) return false;
    return pluginMatchesScope(plugin.source_plugin_path, input.workspaceRoot, input.scope);
  });

  const staleNames = new Set(stale.map((p) => String(p.name)));
  if (staleNames.size === 0) return { ok: true, stalePlugins, actions };

  for (const plugin of stale) {
    const pluginName = String(plugin.name);
    stalePlugins.push({ agent: "codex", home: input.codexHome, plugin: pluginName });

    for (const prompt of toStringSet(plugin.prompts)) {
      const target = path.join(input.codexHome, "prompts", `${prompt}.md`);
      const action = await deletePathIfPresent({ dryRun: input.dryRun, target, undoCapture: input.undoCapture, resources: input.resources });
      actions.push({ agent: "codex", home: input.codexHome, plugin: pluginName, target, action, message: "retire stale prompt" });
    }

    for (const skill of toStringSet(plugin.skills)) {
      const target = path.join(input.codexHome, "skills", skill);
      const action = await deletePathIfPresent({ dryRun: input.dryRun, target, recursive: true, undoCapture: input.undoCapture, resources: input.resources });
      actions.push({ agent: "codex", home: input.codexHome, plugin: pluginName, target, action, message: "retire stale skill" });
    }

    for (const script of toStringSet(plugin.scripts)) {
      const target = path.join(input.codexHome, "scripts", script);
      const action = await deletePathIfPresent({ dryRun: input.dryRun, target, undoCapture: input.undoCapture, resources: input.resources });
      actions.push({ agent: "codex", home: input.codexHome, plugin: pluginName, target, action, message: "retire stale script" });
    }
  }

  const nextPlugins = registry.plugins.filter((plugin) => !(typeof plugin.name === "string" && staleNames.has(plugin.name)));
  const nextRegistry: CodexRegistryFile = {
    ...registry,
    plugins: nextPlugins,
    last_synced: new Date().toISOString(),
  };

  if (!input.dryRun) {
    await input.undoCapture?.captureWriteTarget(registryPath);
    await input.resources.files.writeJsonFile(registryPath, nextRegistry);
  }

  actions.push({
    agent: "codex",
    home: input.codexHome,
    plugin: "*",
    target: registryPath,
    action: input.dryRun ? "planned" : "updated",
    message: `removed stale managed plugin entries: ${[...staleNames].join(", ")}`,
  });

  return { ok: true, stalePlugins, actions };
}

/**
 * Retires Claude plugins by trusting the per-plugin sync manifest rather than
 * the marketplace alone. Marketplace entries are cleaned afterward only for
 * stale plugin directories that were proven to be RAWR-managed.
 */
async function retireClaudeHome(input: {
  claudeHome: string;
  workspaceRoot: string;
  scope: SyncScope;
  activePluginNames: Set<string>;
  dryRun: boolean;
  undoCapture?: {
    captureDeleteTarget(target: string): Promise<void>;
    captureWriteTarget(target: string): Promise<void>;
  };
  resources: AgentConfigSyncResources;
}): Promise<RetireStaleManagedResult> {
  const actions: RetireAction[] = [];
  const stalePlugins: RetireStaleManagedResult["stalePlugins"] = [];
  const pluginsRoot = path.join(input.claudeHome, "plugins");

  const pluginDirents = await input.resources.files.readDir(pluginsRoot);

  const staleNames = new Set<string>();

  for (const dirent of pluginDirents) {
    if (!dirent.isDirectory) continue;
    const manifest = await readClaudeSyncManifest(input.claudeHome, dirent.name, input.resources);
    if (!manifest) continue;
    if (manifest.managedBy !== MANAGED_BY) continue;

    const pluginName = typeof manifest.plugin === "string" && manifest.plugin.length > 0 ? manifest.plugin : dirent.name;
    if (input.activePluginNames.has(pluginName)) continue;
    if (!pluginMatchesScope(manifest.sourcePluginPath, input.workspaceRoot, input.scope)) continue;

    staleNames.add(pluginName);
    stalePlugins.push({ agent: "claude", home: input.claudeHome, plugin: pluginName });

    const target = path.join(pluginsRoot, dirent.name);
    const action = await deletePathIfPresent({ dryRun: input.dryRun, target, recursive: true, undoCapture: input.undoCapture, resources: input.resources });
    actions.push({
      agent: "claude",
      home: input.claudeHome,
      plugin: pluginName,
      target,
      action,
      message: "retire stale plugin directory",
    });
  }

  if (staleNames.size === 0) return { ok: true, stalePlugins, actions };

  const marketplacePath = path.join(input.claudeHome, ".claude-plugin", "marketplace.json");
  const marketplace = await input.resources.files.readJsonFile<ClaudeMarketplaceFile>(marketplacePath);
  if (marketplace && Array.isArray(marketplace.plugins)) {
    const nextPlugins = marketplace.plugins.filter(
      (plugin) => !(typeof plugin.name === "string" && staleNames.has(plugin.name)),
    );
    if (nextPlugins.length !== marketplace.plugins.length) {
      if (!input.dryRun) {
        await input.undoCapture?.captureWriteTarget(marketplacePath);
        await input.resources.files.writeJsonFile(marketplacePath, { ...marketplace, plugins: nextPlugins });
      }
      actions.push({
        agent: "claude",
        home: input.claudeHome,
        plugin: "*",
        target: marketplacePath,
        action: input.dryRun ? "planned" : "updated",
        message: `removed stale managed marketplace entries: ${[...staleNames].join(", ")}`,
      });
    }
  }

  return { ok: true, stalePlugins, actions };
}

/**
 * Aggregates retirement across homes without failing the whole run on one bad
 * target. A failed home is reported as an action while other homes still produce
 * stale-plugin evidence and reversible delete/update operations.
 */
export async function retireStaleManagedPlugins(input: {
  workspaceRoot: string;
  scope: SyncScope;
  codexHomes: string[];
  claudeHomes: string[];
  activePluginNames: Set<string>;
  dryRun: boolean;
  undoCapture?: {
    captureDeleteTarget(target: string): Promise<void>;
    captureWriteTarget(target: string): Promise<void>;
  };
  resources: AgentConfigSyncResources;
}): Promise<RetireStaleManagedResult> {
  const actions: RetireAction[] = [];
  const stalePlugins: RetireStaleManagedResult["stalePlugins"] = [];
  let ok = true;

  for (const codexHome of input.codexHomes) {
    try {
      const result = await retireCodexHome({
        codexHome,
        workspaceRoot: input.workspaceRoot,
        scope: input.scope,
        activePluginNames: input.activePluginNames,
        dryRun: input.dryRun,
        undoCapture: input.undoCapture,
        resources: input.resources,
      });
      actions.push(...result.actions);
      stalePlugins.push(...result.stalePlugins);
      if (!result.ok) ok = false;
    } catch (err) {
      ok = false;
      actions.push({
        agent: "codex",
        home: codexHome,
        plugin: "*",
        target: path.join(codexHome, "plugins", "registry.json"),
        action: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const claudeHome of input.claudeHomes) {
    try {
      const result = await retireClaudeHome({
        claudeHome,
        workspaceRoot: input.workspaceRoot,
        scope: input.scope,
        activePluginNames: input.activePluginNames,
        dryRun: input.dryRun,
        undoCapture: input.undoCapture,
        resources: input.resources,
      });
      actions.push(...result.actions);
      stalePlugins.push(...result.stalePlugins);
      if (!result.ok) ok = false;
    } catch (err) {
      ok = false;
      actions.push({
        agent: "claude",
        home: claudeHome,
        plugin: "*",
        target: path.join(claudeHome, ".claude-plugin", "marketplace.json"),
        action: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ok, stalePlugins, actions };
}
