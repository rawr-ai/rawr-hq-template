import type { AgentConfigSyncResources } from "../resources";
import type { SourceContent, SourcePlugin } from "../entities";
import { stableJsonEqual } from "../helpers/stable-json";
import type { ProviderContentVersion } from "../source-content/helpers/provider-version";

/**
 * agent-config-sync: Claude marketplace repository.
 *
 * @remarks
 * Claude local homes store:
 * - `.claude-plugin/marketplace.json` for installed local plugins, and
 * - per-plugin `.rawr-sync-manifest.json` files that record what RAWR managed.
 *
 * This repository owns the read/derive/write mechanics for those files so
 * routers can focus on capability flow and policy decisions (force/gc).
 */

export type ClaudePluginManifest = {
  name?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
};

export type ClaudeMarketplacePlugin = {
  name: string;
  description?: string;
  source: string;
  category?: string;
  [key: string]: unknown;
};

export type ClaudeMarketplaceFile = {
  $schema?: string;
  name?: string;
  version?: string;
  description?: string;
  owner?: Record<string, unknown>;
  plugins?: ClaudeMarketplacePlugin[];
  [key: string]: unknown;
};

export type ClaudeManagedPluginManifest = {
  plugin: string;
  sourcePluginPath: string;
  contentHash: string;
  providerVersion: string;
  workflows: string[];
  skills: string[];
  scripts: string[];
  agents: string[];
  hooks?: string[];
  hookConfigs?: string[];
  mcpServers?: string[];
  settings?: string[];
  assets?: string[];
  syncedAt: string;
  managedBy: string;
};

export async function upsertClaudePluginManifest(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  providerVersion: ProviderContentVersion;
  dryRun: boolean;
  resources: AgentConfigSyncResources;
}): Promise<{ filePath: string; changed: boolean }> {
  const pluginDir = input.resources.path.join(input.claudeLocalHome, "plugins", input.sourcePlugin.dirName);
  const filePath = input.resources.path.join(pluginDir, ".claude-plugin", "plugin.json");
  const existing = (await input.resources.files.readJsonFile<ClaudePluginManifest>(filePath)) ?? {};

  const next: ClaudePluginManifest = {
    name: input.sourcePlugin.dirName,
    version: input.providerVersion.providerVersion,
    description: input.sourcePlugin.description ?? existing.description ?? "Synced from RAWR HQ plugin",
  };
  const changed = !stableJsonEqual(existing, next);

  if (!input.dryRun && changed) {
    await input.resources.files.writeJsonFile(filePath, next);
  }

  return { filePath, changed };
}

export async function upsertClaudeMarketplace(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  dryRun: boolean;
  resources: AgentConfigSyncResources;
}): Promise<{ filePath: string; changed: boolean }> {
  const filePath = input.resources.path.join(input.claudeLocalHome, ".claude-plugin", "marketplace.json");
  const existing =
    (await input.resources.files.readJsonFile<ClaudeMarketplaceFile>(filePath)) ??
    {
      $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
      name: "local",
      version: "1.0.0",
      description: "Local RAWR-managed Claude Code plugins",
      owner: { name: "RAWR HQ" },
      plugins: [],
    };

  const plugins = [...(existing.plugins ?? [])];
  const nextPlugin: ClaudeMarketplacePlugin = {
    ...(plugins.find((plugin) => plugin.name === input.sourcePlugin.dirName) ?? {}),
    name: input.sourcePlugin.dirName,
    description: input.sourcePlugin.description ?? "Synced from RAWR HQ",
    source: `./plugins/${input.sourcePlugin.dirName}`,
    category: "development",
  };

  const existingIndex = plugins.findIndex((plugin) => plugin.name === input.sourcePlugin.dirName);
  if (existingIndex >= 0) plugins[existingIndex] = nextPlugin;
  else plugins.push(nextPlugin);

  const next: ClaudeMarketplaceFile = {
    ...existing,
    description: existing.description ?? "Local RAWR-managed Claude Code plugins",
    owner: existing.owner ?? { name: "RAWR HQ" },
    plugins: [...plugins].sort((a, b) => a.name.localeCompare(b.name)),
  };
  const changed = !stableJsonEqual(existing, next);

  if (!input.dryRun && changed) {
    await input.resources.files.writeJsonFile(filePath, next);
  }

  return { filePath, changed };
}

export async function writeClaudeSyncManifest(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  providerVersion: ProviderContentVersion;
  dryRun: boolean;
  resources: AgentConfigSyncResources;
}): Promise<{ filePath: string; manifest: ClaudeManagedPluginManifest; changed: boolean }> {
  const filePath = input.resources.path.join(
    input.claudeLocalHome,
    "plugins",
    input.sourcePlugin.dirName,
    ".rawr-sync-manifest.json",
  );
  const existing = await input.resources.files.readJsonFile<ClaudeManagedPluginManifest>(filePath);
  const nowIso = new Date().toISOString();

  const stableManifest: ClaudeManagedPluginManifest = {
    plugin: input.sourcePlugin.dirName,
    sourcePluginPath: input.sourcePlugin.absPath,
    contentHash: input.providerVersion.contentHash,
    providerVersion: input.providerVersion.providerVersion,
    workflows: input.content.workflowFiles.map((workflow) => workflow.name),
    skills: input.content.skills.map((skill) => skill.name),
    scripts: input.content.scripts.map((script) => script.name),
    agents: input.content.agentFiles.map((agent) => agent.name),
    hooks: (input.content.hooks ?? []).map((hook) => hook.name),
    hookConfigs: (input.content.hookConfigs ?? []).map((hookConfig) => hookConfig.name),
    mcpServers: (input.content.mcpServers ?? []).map((server) => server.name),
    settings: (input.content.settings ?? []).map((setting) => setting.name),
    assets: (input.content.assets ?? []).map((asset) => asset.name),
    managedBy: "@rawr/plugin-plugins",
    syncedAt: nowIso,
  };
  const changed = !stableJsonEqual(normalizeSyncManifest(existing), normalizeSyncManifest(stableManifest));
  const manifest: ClaudeManagedPluginManifest = {
    ...stableManifest,
    syncedAt: changed ? nowIso : existing?.syncedAt ?? nowIso,
  };

  if (!input.dryRun && changed) {
    await input.resources.files.writeJsonFile(filePath, manifest);
  }

  return { filePath, manifest, changed };
}

export async function readClaudeSyncManifest(
  claudeLocalHome: string,
  pluginName: string,
  resources: AgentConfigSyncResources,
): Promise<ClaudeManagedPluginManifest | null> {
  const filePath = resources.path.join(
    claudeLocalHome,
    "plugins",
    pluginName,
    ".rawr-sync-manifest.json",
  );
  return resources.files.readJsonFile<ClaudeManagedPluginManifest>(filePath);
}

export function claudeInstalledCacheManifestPath(input: {
  claudeLocalHome: string;
  pluginName: string;
  providerVersion: string;
  resources: AgentConfigSyncResources;
}): string {
  const marketplaceName = input.resources.path.basename(input.resources.path.resolve(input.claudeLocalHome));
  return input.resources.path.join(
    input.resources.path.dirname(input.resources.path.resolve(input.claudeLocalHome)),
    "cache",
    marketplaceName,
    input.pluginName,
    input.providerVersion,
    ".rawr-sync-manifest.json",
  );
}

export async function readClaudeInstalledCacheSyncManifest(input: {
  claudeLocalHome: string;
  pluginName: string;
  providerVersion: string;
  resources: AgentConfigSyncResources;
}): Promise<{ filePath: string; manifest: ClaudeManagedPluginManifest | null }> {
  const filePath = claudeInstalledCacheManifestPath(input);
  return {
    filePath,
    manifest: await input.resources.files.readJsonFile<ClaudeManagedPluginManifest>(filePath),
  };
}

export function claudeSyncManifestsEqual(
  left: ClaudeManagedPluginManifest | null | undefined,
  right: ClaudeManagedPluginManifest | null | undefined,
): boolean {
  return stableJsonEqual(normalizeSyncManifest(left), normalizeSyncManifest(right));
}

function normalizeSyncManifest(
  manifest: ClaudeManagedPluginManifest | null | undefined,
): Omit<ClaudeManagedPluginManifest, "syncedAt"> | null {
  if (!manifest) return null;
  return {
    plugin: manifest.plugin,
    sourcePluginPath: manifest.sourcePluginPath,
    contentHash: manifest.contentHash,
    providerVersion: manifest.providerVersion,
    workflows: [...manifest.workflows].sort(),
    skills: [...manifest.skills].sort(),
    scripts: [...manifest.scripts].sort(),
    agents: [...manifest.agents].sort(),
    hooks: [...(manifest.hooks ?? [])].sort(),
    hookConfigs: [...(manifest.hookConfigs ?? [])].sort(),
    mcpServers: [...(manifest.mcpServers ?? [])].sort(),
    settings: [...(manifest.settings ?? [])].sort(),
    assets: [...(manifest.assets ?? [])].sort(),
    managedBy: manifest.managedBy,
  };
}
