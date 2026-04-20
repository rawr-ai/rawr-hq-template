import path from "node:path";

import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { SyncScope } from "../../../shared/schemas";
import { MANAGED_BY, pluginMatchesScope } from "./managed-source";

type ClaudeMarketplacePlugin = {
  name?: unknown;
  [key: string]: unknown;
};

type ClaudeMarketplaceFile = {
  plugins?: ClaudeMarketplacePlugin[];
  [key: string]: unknown;
};

type ClaudeManagedPluginManifest = {
  plugin: string;
  sourcePluginPath: string;
  managedBy: string;
};

type ClaudeStalePluginPlan = {
  pluginName: string;
  target: string;
};

type ClaudeMarketplaceUpdatePlan = {
  marketplacePath: string;
  staleNames: string[];
  nextMarketplace: ClaudeMarketplaceFile;
};

type ClaudeHomeRetirementPlan = {
  stalePlugins: ClaudeStalePluginPlan[];
  marketplaceUpdate?: ClaudeMarketplaceUpdatePlan;
};

export function claudeMarketplacePath(claudeHome: string): string {
  return path.join(claudeHome, ".claude-plugin", "marketplace.json");
}

async function readClaudeSyncManifest(input: {
  claudeHome: string;
  pluginName: string;
  resources: AgentConfigSyncResources;
}): Promise<ClaudeManagedPluginManifest | null> {
  const filePath = path.join(
    input.claudeHome,
    "plugins",
    input.pluginName,
    ".rawr-sync-manifest.json",
  );
  const parsed = await input.resources.files.readJsonFile<ClaudeManagedPluginManifest>(filePath);
  if (!parsed || parsed.managedBy !== MANAGED_BY) return null;
  return parsed;
}

export async function planClaudeHomeRetirement(input: {
  claudeHome: string;
  workspaceRoot: string;
  scope: SyncScope;
  activePluginNames: Set<string>;
  resources: AgentConfigSyncResources;
}): Promise<ClaudeHomeRetirementPlan> {
  const pluginsRoot = path.join(input.claudeHome, "plugins");
  const pluginDirents = await input.resources.files.readDir(pluginsRoot);
  const stalePlugins: ClaudeStalePluginPlan[] = [];
  const staleNames = new Set<string>();

  for (const dirent of pluginDirents) {
    if (!dirent.isDirectory) continue;
    const manifest = await readClaudeSyncManifest({
      claudeHome: input.claudeHome,
      pluginName: dirent.name,
      resources: input.resources,
    });
    if (!manifest) continue;
    if (manifest.managedBy !== MANAGED_BY) continue;

    const pluginName = typeof manifest.plugin === "string" && manifest.plugin.length > 0 ? manifest.plugin : dirent.name;
    if (input.activePluginNames.has(pluginName)) continue;
    if (!pluginMatchesScope({
      sourcePluginPath: manifest.sourcePluginPath,
      workspaceRoot: input.workspaceRoot,
      scope: input.scope,
    })) continue;

    staleNames.add(pluginName);
    stalePlugins.push({
      pluginName,
      target: path.join(pluginsRoot, dirent.name),
    });
  }

  if (staleNames.size === 0) return { stalePlugins };

  const marketplacePath = claudeMarketplacePath(input.claudeHome);
  const marketplace = await input.resources.files.readJsonFile<ClaudeMarketplaceFile>(marketplacePath);
  if (!marketplace || !Array.isArray(marketplace.plugins)) return { stalePlugins };

  const nextPlugins = marketplace.plugins.filter(
    (plugin) => !(typeof plugin.name === "string" && staleNames.has(plugin.name)),
  );
  if (nextPlugins.length === marketplace.plugins.length) return { stalePlugins };

  return {
    stalePlugins,
    marketplaceUpdate: {
      marketplacePath,
      staleNames: [...staleNames],
      nextMarketplace: { ...marketplace, plugins: nextPlugins },
    },
  };
}
