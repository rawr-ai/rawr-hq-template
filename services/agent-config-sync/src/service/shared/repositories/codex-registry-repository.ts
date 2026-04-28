import type { AgentConfigSyncResources } from "../resources";
import type { SourceContent, SourcePlugin } from "../entities";
import { stableJsonEqual } from "../helpers/stable-json";

/**
 * agent-config-sync: Codex registry repository.
 *
 * @remarks
 * Codex stores synced plugin ownership claims in `plugins/registry.json`.
 * This repository owns the read/derive/write mechanics for that file so routers
 * can focus on capability flow (what to sync, to which homes) without becoming
 * a dumping ground for JSON normalization and drift rules.
 */

export type CodexRegistryClaims = {
  promptsByPlugin: Record<string, Set<string>>;
  skillsByPlugin: Record<string, Set<string>>;
  scriptsByPlugin: Record<string, Set<string>>;
};

export type CodexRegistryPlugin = {
  name: string;
  description?: string;
  version?: string;
  prompts?: string[];
  skills?: string[];
  scripts?: string[];
  source_plugin_path?: string;
  managed_by?: string;
  synced_at?: string;
  [key: string]: unknown;
};

export type CodexRegistryFile = {
  $schema?: string;
  description?: string;
  canonical_source?: string;
  sync_direction?: string;
  last_synced?: string;
  plugins?: CodexRegistryPlugin[];
  [key: string]: unknown;
};

export type CodexRegistryContext = {
  filePath: string;
  data: CodexRegistryFile;
  claimedSets: CodexRegistryClaims;
};

export async function loadCodexRegistry(
  codexHome: string,
  resources: AgentConfigSyncResources,
): Promise<CodexRegistryContext> {
  const filePath = resources.path.join(codexHome, "plugins", "registry.json");
  const data =
    (await resources.files.readJsonFile<CodexRegistryFile>(filePath)) ??
    {
      $schema: "https://claude.ai/schemas/codex-plugin-registry.json",
      description: "Declarative registry of plugins synced to Codex",
      plugins: [],
    };

  const claimedSets: CodexRegistryClaims = {
    promptsByPlugin: {},
    skillsByPlugin: {},
    scriptsByPlugin: {},
  };

  for (const plugin of data.plugins ?? []) {
    claimedSets.promptsByPlugin[plugin.name] = new Set(plugin.prompts ?? []);
    claimedSets.skillsByPlugin[plugin.name] = new Set(plugin.skills ?? []);
    claimedSets.scriptsByPlugin[plugin.name] = new Set(plugin.scripts ?? []);
  }

  return { filePath, data, claimedSets };
}

export function getClaimsFromOtherPlugins(
  pluginName: string,
  claimed: Record<string, Set<string>>,
): Set<string> {
  const names = new Set<string>();
  for (const [owner, values] of Object.entries(claimed)) {
    if (owner === pluginName) continue;
    for (const value of values) names.add(value);
  }
  return names;
}

/**
 * Names Codex scripts with a plugin prefix because Codex scripts share one
 * destination directory across all synced plugins.
 */
export function buildCodexScriptName(
  pluginName: string,
  sourceScriptName: string,
): string {
  return `${pluginName}--${sourceScriptName}`;
}

export async function upsertCodexRegistry(input: {
  codexHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  dryRun: boolean;
  existingData: CodexRegistryFile;
  resources: AgentConfigSyncResources;
}): Promise<{ nextData: CodexRegistryFile; filePath: string; changed: boolean }> {
  const filePath = input.resources.path.join(input.codexHome, "plugins", "registry.json");
  const pluginName = input.sourcePlugin.dirName;
  const nowIso = new Date().toISOString();

  const nextPluginEntry: CodexRegistryPlugin = {
    name: pluginName,
    prompts: input.content.workflowFiles.map((workflow) => workflow.name),
    skills: input.content.skills.map((skill) => skill.name),
    scripts: input.content.scripts.map((script) => buildCodexScriptName(pluginName, script.name)),
    source_plugin_path: input.sourcePlugin.absPath,
    managed_by: "@rawr/plugin-plugins",
  };
  if (input.sourcePlugin.description) nextPluginEntry.description = input.sourcePlugin.description;
  if (input.sourcePlugin.version) nextPluginEntry.version = input.sourcePlugin.version;

  const plugins = [...(input.existingData.plugins ?? [])];
  const existingIndex = plugins.findIndex((plugin) => plugin.name === pluginName);
  const priorPlugin = existingIndex >= 0 ? plugins[existingIndex] : undefined;
  const priorStable = normalizeRegistryPluginForDrift(priorPlugin);
  const nextStable = normalizeRegistryPluginForDrift({
    ...(priorPlugin ?? {}),
    ...nextPluginEntry,
  });
  const pluginStableChanged = !stableJsonEqual(priorStable, nextStable);

  if (existingIndex >= 0) {
    plugins[existingIndex] = {
      ...priorPlugin,
      ...nextPluginEntry,
      synced_at: pluginStableChanged ? nowIso : priorPlugin?.synced_at ?? nowIso,
    };
  } else {
    plugins.push({
      ...nextPluginEntry,
      synced_at: nowIso,
    });
  }

  const nextData: CodexRegistryFile = {
    ...input.existingData,
    canonical_source: input.existingData.canonical_source ?? input.sourcePlugin.absPath,
    sync_direction: input.existingData.sync_direction ?? "rawr-hq plugin → codex/claude",
    plugins: [...plugins].sort((a, b) => a.name.localeCompare(b.name)),
  };
  const changed = !stableJsonEqual(
    normalizeRegistryForDrift(input.existingData),
    normalizeRegistryForDrift(nextData),
  );
  nextData.last_synced = changed ? nowIso : input.existingData.last_synced ?? nowIso;

  if (!input.dryRun && changed) {
    await input.resources.files.writeJsonFile(filePath, nextData);
  }

  return { nextData, filePath, changed };
}

function normalizeRegistryPluginForDrift(plugin: CodexRegistryPlugin | undefined): CodexRegistryPlugin | null {
  if (!plugin) return null;
  const normalized: CodexRegistryPlugin = { ...plugin };
  delete normalized.synced_at;
  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined) delete normalized[key];
  }
  return normalized;
}

function normalizeRegistryForDrift(data: CodexRegistryFile): CodexRegistryFile {
  const normalized: CodexRegistryFile = {
    ...data,
    plugins: [...(data.plugins ?? [])]
      .map((plugin) => normalizeRegistryPluginForDrift(plugin) as CodexRegistryPlugin)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
  delete normalized.last_synced;
  return normalized;
}
