import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { SourceContent, SourcePlugin } from "../../../shared/entities";

/**
 * Minimal Claude plugin manifest shape preserved and upserted by sync.
 */
export type ClaudePluginManifest = {
  name?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
};

/**
 * Marketplace entry registered for a synced local Claude plugin.
 */
export type ClaudeMarketplacePlugin = {
  name: string;
  description?: string;
  source: string;
  category?: string;
  [key: string]: unknown;
};

/**
 * Local Claude marketplace file owned by the destination home.
 */
export type ClaudeMarketplaceFile = {
  $schema?: string;
  name?: string;
  version?: string;
  description?: string;
  owner?: Record<string, unknown>;
  plugins?: ClaudeMarketplacePlugin[];
  [key: string]: unknown;
};

/**
 * RAWR-owned manifest that records what this service last managed for a Claude
 * plugin so GC never guesses from arbitrary filesystem contents.
 */
export type ClaudeManagedPluginManifest = {
  plugin: string;
  sourcePluginPath: string;
  workflows: string[];
  skills: string[];
  scripts: string[];
  agents: string[];
  syncedAt: string;
  managedBy: string;
};

/**
 * Creates or updates the Claude plugin.json while preserving unrelated fields.
 */
export async function upsertClaudePluginManifest(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  dryRun: boolean;
  resources: AgentConfigSyncResources;
}): Promise<{ filePath: string; changed: boolean }> {
  const pluginDir = path.join(input.claudeLocalHome, "plugins", input.sourcePlugin.dirName);
  const filePath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  const existing = (await input.resources.files.readJsonFile<ClaudePluginManifest>(filePath)) ?? {};

  const next: ClaudePluginManifest = {
    ...existing,
    name: input.sourcePlugin.dirName,
    version: input.sourcePlugin.version ?? existing.version ?? "1.0.0",
    description:
      input.sourcePlugin.description ??
      existing.description ??
      "Synced from RAWR HQ plugin",
  };
  const changed = !isDeepStrictEqual(existing, next);

  if (!input.dryRun && changed) {
    await input.resources.files.writeJsonFile(filePath, next);
  }

  return { filePath, changed };
}

/**
 * Registers the plugin in Claude's local marketplace file.
 */
export async function upsertClaudeMarketplace(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  dryRun: boolean;
  resources: AgentConfigSyncResources;
}): Promise<{ filePath: string; changed: boolean }> {
  const filePath = path.join(input.claudeLocalHome, ".claude-plugin", "marketplace.json");
  const existing =
    (await input.resources.files.readJsonFile<ClaudeMarketplaceFile>(filePath)) ??
    {
      $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
      name: "local",
      version: "1.0.0",
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

  const existingIndex = plugins.findIndex(
    (plugin) => plugin.name === input.sourcePlugin.dirName,
  );
  if (existingIndex >= 0) {
    plugins[existingIndex] = nextPlugin;
  } else {
    plugins.push(nextPlugin);
  }

  const next: ClaudeMarketplaceFile = {
    ...existing,
    plugins: [...plugins].sort((a, b) => a.name.localeCompare(b.name)),
  };
  const changed = !isDeepStrictEqual(existing, next);

  if (!input.dryRun && changed) {
    await input.resources.files.writeJsonFile(filePath, next);
  }

  return { filePath, changed };
}

/**
 * Writes the per-plugin sync manifest used for future Claude GC decisions.
 */
export async function writeClaudeSyncManifest(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  dryRun: boolean;
  resources: AgentConfigSyncResources;
}): Promise<{
  filePath: string;
  manifest: ClaudeManagedPluginManifest;
  changed: boolean;
}> {
  const filePath = path.join(
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
    workflows: input.content.workflowFiles.map((workflow) => workflow.name),
    skills: input.content.skills.map((skill) => skill.name),
    scripts: input.content.scripts.map((script) => script.name),
    agents: input.content.agentFiles.map((agent) => agent.name),
    managedBy: "@rawr/plugin-plugins",
    syncedAt: nowIso,
  };
  const changed = !isDeepStrictEqual(
    normalizeSyncManifest(existing),
    normalizeSyncManifest(stableManifest),
  );
  const manifest: ClaudeManagedPluginManifest = {
    ...stableManifest,
    syncedAt: changed ? nowIso : existing?.syncedAt ?? nowIso,
  };

  if (!input.dryRun && changed) {
    await input.resources.files.writeJsonFile(filePath, manifest);
  }

  return { filePath, manifest, changed };
}

/**
 * Reads the last RAWR-managed Claude sync manifest for a plugin.
 */
export async function readClaudeSyncManifest(
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
  return resources.files.readJsonFile<ClaudeManagedPluginManifest>(filePath);
}

/**
 * Removes timestamps before drift checks so idempotent runs do not churn files.
 */
function normalizeSyncManifest(
  manifest: ClaudeManagedPluginManifest | null | undefined,
): Omit<ClaudeManagedPluginManifest, "syncedAt"> | null {
  if (!manifest) return null;
  return {
    plugin: manifest.plugin,
    sourcePluginPath: manifest.sourcePluginPath,
    workflows: [...manifest.workflows].sort(),
    skills: [...manifest.skills].sort(),
    scripts: [...manifest.scripts].sort(),
    agents: [...manifest.agents].sort(),
    managedBy: manifest.managedBy,
  };
}
