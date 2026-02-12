import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { readJsonFile, writeJsonFile } from "./fs-utils";
import type { ClaimedSets, SourceContent, SourcePlugin } from "./types";

type RegistryPlugin = {
  name: string;
  description?: string;
  version?: string;
  prompts?: string[];
  skills?: string[];
  scripts?: string[];
  [key: string]: unknown;
};

type RegistryFile = {
  $schema?: string;
  description?: string;
  canonical_source?: string;
  sync_direction?: string;
  last_synced?: string;
  plugins?: RegistryPlugin[];
  [key: string]: unknown;
};

export type CodexRegistryContext = {
  filePath: string;
  data: RegistryFile;
  claimedSets: ClaimedSets;
};

export async function loadCodexRegistry(codexHome: string): Promise<CodexRegistryContext> {
  const filePath = path.join(codexHome, "plugins", "registry.json");
  const existing = (await readJsonFile<RegistryFile>(filePath)) ?? {
    $schema: "https://claude.ai/schemas/codex-plugin-registry.json",
    description: "Declarative registry of plugins synced to Codex",
    plugins: [],
  };

  const claimedSets: ClaimedSets = {
    promptsByPlugin: {},
    skillsByPlugin: {},
    scriptsByPlugin: {},
  };

  for (const plugin of existing.plugins ?? []) {
    claimedSets.promptsByPlugin[plugin.name] = new Set(plugin.prompts ?? []);
    claimedSets.skillsByPlugin[plugin.name] = new Set(plugin.skills ?? []);
    claimedSets.scriptsByPlugin[plugin.name] = new Set(plugin.scripts ?? []);
  }

  return { filePath, data: existing, claimedSets };
}

export function getClaimsFromOtherPlugins(
  pluginName: string,
  claimed: Record<string, Set<string>>,
): Set<string> {
  const names = new Set<string>();
  for (const [owner, set] of Object.entries(claimed)) {
    if (owner === pluginName) continue;
    for (const value of set) names.add(value);
  }
  return names;
}

export function buildCodexScriptName(pluginName: string, sourceScriptName: string): string {
  return `${pluginName}--${sourceScriptName}`;
}

export async function upsertCodexRegistry(input: {
  codexHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  dryRun: boolean;
  existingData: RegistryFile;
}): Promise<{ nextData: RegistryFile; filePath: string; changed: boolean }> {
  const { codexHome, sourcePlugin, content, dryRun, existingData } = input;
  const filePath = path.join(codexHome, "plugins", "registry.json");
  const pluginName = sourcePlugin.dirName;
  const nowIso = new Date().toISOString();

  const pluginEntry: RegistryPlugin = {
    name: pluginName,
    prompts: content.workflowFiles.map((w) => w.name),
    skills: content.skills.map((s) => s.name),
    scripts: content.scripts.map((s) => buildCodexScriptName(pluginName, s.name)),
    source_plugin_path: sourcePlugin.absPath,
    managed_by: "@rawr/plugin-plugins",
  };
  if (sourcePlugin.description) pluginEntry.description = sourcePlugin.description;
  if (sourcePlugin.version) pluginEntry.version = sourcePlugin.version;

  const plugins = [...(existingData.plugins ?? [])];
  const index = plugins.findIndex((p) => p.name === pluginName);
  const prior = index >= 0 ? plugins[index] : undefined;
  const priorStable = normalizeRegistryPluginForDrift(prior);
  const nextStable = normalizeRegistryPluginForDrift({ ...(prior ?? {}), ...pluginEntry });
  const pluginStableChanged = !isDeepStrictEqual(priorStable, nextStable);

  if (index >= 0) {
    plugins[index] = {
      ...prior,
      ...pluginEntry,
      synced_at: pluginStableChanged ? nowIso : (prior?.synced_at as string | undefined) ?? nowIso,
    };
  } else {
    plugins.push({
      ...pluginEntry,
      synced_at: nowIso,
    });
  }

  const mergedPlugins = [...plugins].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const nextData: RegistryFile = {
    ...existingData,
    canonical_source: existingData.canonical_source ?? sourcePlugin.absPath,
    sync_direction: existingData.sync_direction ?? "rawr-hq plugin → codex/claude",
    plugins: mergedPlugins,
  };
  const changed = !isDeepStrictEqual(
    normalizeRegistryForDrift(existingData),
    normalizeRegistryForDrift(nextData),
  );
  nextData.last_synced = changed ? nowIso : existingData.last_synced ?? nowIso;

  if (!dryRun && changed) {
    await writeJsonFile(filePath, nextData);
  }

  return { nextData, filePath, changed };
}

function normalizeRegistryPluginForDrift(plugin: RegistryPlugin | undefined): RegistryPlugin | null {
  if (!plugin) return null;
  const normalized = { ...plugin };
  delete (normalized as any).synced_at;
  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined) delete (normalized as any)[key];
  }
  return normalized;
}

function normalizeRegistryForDrift(data: RegistryFile): RegistryFile {
  const plugins = [...(data.plugins ?? [])]
    .map((p) => normalizeRegistryPluginForDrift(p) as RegistryPlugin)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const normalized = {
    ...data,
    plugins,
  };
  delete (normalized as any).last_synced;
  return normalized;
}
