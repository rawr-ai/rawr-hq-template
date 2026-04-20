import path from "node:path";

import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { SyncScope } from "../../../shared/schemas";
import { MANAGED_BY, pluginMatchesScope } from "./managed-source";

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

type CodexStalePluginPlan = {
  pluginName: string;
  prompts: string[];
  skills: string[];
  scripts: string[];
};

type CodexHomeRetirementPlan = {
  registryPath: string;
  staleNames: string[];
  stalePlugins: CodexStalePluginPlan[];
  nextRegistry: CodexRegistryFile;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function codexRegistryPath(codexHome: string): string {
  return path.join(codexHome, "plugins", "registry.json");
}

export function codexPromptTarget(codexHome: string, prompt: string): string {
  return path.join(codexHome, "prompts", `${prompt}.md`);
}

export function codexSkillTarget(codexHome: string, skill: string): string {
  return path.join(codexHome, "skills", skill);
}

export function codexScriptTarget(codexHome: string, script: string): string {
  return path.join(codexHome, "scripts", script);
}

export async function planCodexHomeRetirement(input: {
  codexHome: string;
  workspaceRoot: string;
  scope: SyncScope;
  activePluginNames: Set<string>;
  resources: AgentConfigSyncResources;
}): Promise<CodexHomeRetirementPlan | null> {
  const registryPath = codexRegistryPath(input.codexHome);
  const registry = await input.resources.files.readJsonFile<CodexRegistryFile>(registryPath);
  if (!registry || !Array.isArray(registry.plugins)) return null;

  const stale = registry.plugins.filter((plugin) => {
    if (plugin.managed_by !== MANAGED_BY) return false;
    if (typeof plugin.name !== "string" || plugin.name.length === 0) return false;
    if (input.activePluginNames.has(plugin.name)) return false;
    return pluginMatchesScope({
      sourcePluginPath: plugin.source_plugin_path,
      workspaceRoot: input.workspaceRoot,
      scope: input.scope,
    });
  });
  if (stale.length === 0) return null;

  const staleNames = stale.map((plugin) => String(plugin.name));
  const staleNameSet = new Set(staleNames);
  const nextRegistry: CodexRegistryFile = {
    ...registry,
    plugins: registry.plugins.filter(
      (plugin) => !(typeof plugin.name === "string" && staleNameSet.has(plugin.name)),
    ),
    last_synced: new Date().toISOString(),
  };

  return {
    registryPath,
    staleNames,
    nextRegistry,
    stalePlugins: stale.map((plugin) => ({
      pluginName: String(plugin.name),
      prompts: toStringArray(plugin.prompts),
      skills: toStringArray(plugin.skills),
      scripts: toStringArray(plugin.scripts),
    })),
  };
}
