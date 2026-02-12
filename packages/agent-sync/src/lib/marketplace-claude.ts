import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { readJsonFile, writeJsonFile } from "./fs-utils";
import type { SourceContent, SourcePlugin } from "./types";

type ClaudePluginManifest = {
  name?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
};

type MarketplacePlugin = {
  name: string;
  description?: string;
  source: string;
  category?: string;
  [key: string]: unknown;
};

type MarketplaceFile = {
  $schema?: string;
  name?: string;
  version?: string;
  description?: string;
  owner?: Record<string, unknown>;
  plugins?: MarketplacePlugin[];
  [key: string]: unknown;
};

export type ClaudeSyncManifest = {
  plugin: string;
  sourcePluginPath: string;
  workflows: string[];
  skills: string[];
  scripts: string[];
  agents: string[];
  syncedAt: string;
  managedBy: string;
};

export async function upsertClaudePluginManifest(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  dryRun: boolean;
}): Promise<{ filePath: string; changed: boolean }> {
  const pluginDir = path.join(input.claudeLocalHome, "plugins", input.sourcePlugin.dirName);
  const filePath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  const existing = (await readJsonFile<ClaudePluginManifest>(filePath)) ?? {};

  const next: ClaudePluginManifest = {
    ...existing,
    name: input.sourcePlugin.dirName,
    version: input.sourcePlugin.version ?? existing.version ?? "1.0.0",
    description: input.sourcePlugin.description ?? existing.description ?? "Synced from RAWR HQ plugin",
  };
  const changed = !isDeepStrictEqual(existing, next);

  if (!input.dryRun && changed) {
    await writeJsonFile(filePath, next);
  }

  return { filePath, changed };
}

export async function upsertClaudeMarketplace(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  dryRun: boolean;
}): Promise<{ filePath: string; changed: boolean }> {
  const filePath = path.join(input.claudeLocalHome, ".claude-plugin", "marketplace.json");
  const existing = (await readJsonFile<MarketplaceFile>(filePath)) ?? {
    $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
    name: "local",
    version: "1.0.0",
    plugins: [],
  };

  const plugins = [...(existing.plugins ?? [])];
  const nextPlugin: MarketplacePlugin = {
    ...(plugins.find((p) => p.name === input.sourcePlugin.dirName) ?? {}),
    name: input.sourcePlugin.dirName,
    description: input.sourcePlugin.description ?? "Synced from RAWR HQ",
    source: `./plugins/${input.sourcePlugin.dirName}`,
    category: "development",
  };

  const index = plugins.findIndex((p) => p.name === input.sourcePlugin.dirName);
  if (index >= 0) plugins[index] = nextPlugin;
  else plugins.push(nextPlugin);

  const next: MarketplaceFile = {
    ...existing,
    plugins: [...plugins].sort((a, b) => a.name.localeCompare(b.name)),
  };
  const changed = !isDeepStrictEqual(existing, next);

  if (!input.dryRun && changed) {
    await writeJsonFile(filePath, next);
  }

  return { filePath, changed };
}

export async function writeClaudeSyncManifest(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  dryRun: boolean;
}): Promise<{ filePath: string; manifest: ClaudeSyncManifest; changed: boolean }> {
  const filePath = path.join(
    input.claudeLocalHome,
    "plugins",
    input.sourcePlugin.dirName,
    ".rawr-sync-manifest.json",
  );
  const existing = await readJsonFile<ClaudeSyncManifest>(filePath);
  const nowIso = new Date().toISOString();

  const stableManifest: ClaudeSyncManifest = {
    plugin: input.sourcePlugin.dirName,
    sourcePluginPath: input.sourcePlugin.absPath,
    workflows: input.content.workflowFiles.map((w) => w.name),
    skills: input.content.skills.map((s) => s.name),
    scripts: input.content.scripts.map((s) => s.name),
    agents: input.content.agentFiles.map((a) => a.name),
    managedBy: "@rawr/plugin-plugins",
    syncedAt: nowIso,
  };
  const changed = !isDeepStrictEqual(normalizeSyncManifest(existing), normalizeSyncManifest(stableManifest));
  const manifest: ClaudeSyncManifest = {
    ...stableManifest,
    syncedAt: changed ? nowIso : existing?.syncedAt ?? nowIso,
  };

  if (!input.dryRun && changed) {
    await writeJsonFile(filePath, manifest);
  }

  return { filePath, manifest, changed };
}

export async function readClaudeSyncManifest(
  claudeLocalHome: string,
  pluginName: string,
): Promise<ClaudeSyncManifest | null> {
  const filePath = path.join(claudeLocalHome, "plugins", pluginName, ".rawr-sync-manifest.json");
  return readJsonFile<ClaudeSyncManifest>(filePath);
}

function normalizeSyncManifest(manifest: ClaudeSyncManifest | null | undefined): Omit<ClaudeSyncManifest, "syncedAt"> | null {
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
