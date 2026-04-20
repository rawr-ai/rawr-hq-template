import path from "node:path";

import { module } from "./module";
import type { RetireAction, RetireStaleManagedResult } from "./contract";
import type { AgentConfigSyncResources } from "../../shared/resources";
import { deletePathIfPresent } from "./helpers/filesystem-actions";
import { MANAGED_BY, pluginMatchesScope } from "./helpers/managed-source";

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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function codexRegistryPath(codexHome: string): string {
  return path.join(codexHome, "plugins", "registry.json");
}

function claudeMarketplacePath(claudeHome: string): string {
  return path.join(claudeHome, ".claude-plugin", "marketplace.json");
}

function codexPromptTarget(codexHome: string, prompt: string): string {
  return path.join(codexHome, "prompts", `${prompt}.md`);
}

function codexSkillTarget(codexHome: string, skill: string): string {
  return path.join(codexHome, "skills", skill);
}

function codexScriptTarget(codexHome: string, script: string): string {
  return path.join(codexHome, "scripts", script);
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

const retireStaleManaged = module.retireStaleManaged.handler(async ({ context, input }) => {
  const activePluginNames = new Set(input.activePluginNames);
  const undoCapture = input.dryRun ? undefined : context.undoCapture;
  const actions: RetireAction[] = [];
  const stalePlugins: RetireStaleManagedResult["stalePlugins"] = [];
  let ok = true;

  for (const codexHome of input.codexHomes) {
    const registryPath = codexRegistryPath(codexHome);
    try {
      const registry = await context.resources.files.readJsonFile<CodexRegistryFile>(registryPath);
      if (!registry || !Array.isArray(registry.plugins)) continue;

      const stale = registry.plugins.filter((plugin) => {
        if (plugin.managed_by !== MANAGED_BY) return false;
        if (typeof plugin.name !== "string" || plugin.name.length === 0) return false;
        if (activePluginNames.has(plugin.name)) return false;
        return pluginMatchesScope({
          sourcePluginPath: plugin.source_plugin_path,
          workspaceRoot: input.workspaceRoot,
          scope: input.scope,
        });
      });
      if (stale.length === 0) continue;

      const staleNames = stale.map((plugin) => String(plugin.name));
      const staleNameSet = new Set(staleNames);
      const nextRegistry: CodexRegistryFile = {
        ...registry,
        plugins: registry.plugins.filter(
          (plugin) => !(typeof plugin.name === "string" && staleNameSet.has(plugin.name)),
        ),
        last_synced: new Date().toISOString(),
      };

      for (const plugin of stale) {
        const pluginName = String(plugin.name);
        stalePlugins.push({ agent: "codex", home: codexHome, plugin: pluginName });

        for (const prompt of toStringArray(plugin.prompts)) {
          const target = codexPromptTarget(codexHome, prompt);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            undoCapture,
            resources: context.resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: pluginName,
            target,
            action,
            message: "retire stale prompt",
          });
        }

        for (const skill of toStringArray(plugin.skills)) {
          const target = codexSkillTarget(codexHome, skill);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            recursive: true,
            undoCapture,
            resources: context.resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: pluginName,
            target,
            action,
            message: "retire stale skill",
          });
        }

        for (const script of toStringArray(plugin.scripts)) {
          const target = codexScriptTarget(codexHome, script);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            undoCapture,
            resources: context.resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: pluginName,
            target,
            action,
            message: "retire stale script",
          });
        }
      }

      if (!input.dryRun) {
        await undoCapture?.captureWriteTarget(registryPath);
        await context.resources.files.writeJsonFile(registryPath, nextRegistry);
      }

      actions.push({
        agent: "codex",
        home: codexHome,
        plugin: "*",
        target: registryPath,
        action: input.dryRun ? "planned" : "updated",
        message: `removed stale managed plugin entries: ${staleNames.join(", ")}`,
      });
    } catch (err) {
      ok = false;
      actions.push({
        agent: "codex",
        home: codexHome,
        plugin: "*",
        target: registryPath,
        action: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const claudeHome of input.claudeHomes) {
    const marketplacePath = claudeMarketplacePath(claudeHome);
    try {
      const pluginsRoot = path.join(claudeHome, "plugins");
      const pluginDirents = await context.resources.files.readDir(pluginsRoot);
      const staleNames = new Set<string>();
      const staleTargets: Array<{ pluginName: string; target: string }> = [];

      for (const dirent of pluginDirents) {
        if (!dirent.isDirectory) continue;
        const manifest = await readClaudeSyncManifest({
          claudeHome,
          pluginName: dirent.name,
          resources: context.resources,
        });
        if (!manifest) continue;

        const pluginName = typeof manifest.plugin === "string" && manifest.plugin.length > 0 ? manifest.plugin : dirent.name;
        if (activePluginNames.has(pluginName)) continue;
        if (!pluginMatchesScope({
          sourcePluginPath: manifest.sourcePluginPath,
          workspaceRoot: input.workspaceRoot,
          scope: input.scope,
        })) continue;

        staleNames.add(pluginName);
        staleTargets.push({
          pluginName,
          target: path.join(pluginsRoot, dirent.name),
        });
      }

      for (const plugin of staleTargets) {
        stalePlugins.push({ agent: "claude", home: claudeHome, plugin: plugin.pluginName });
        const action = await deletePathIfPresent({
          dryRun: input.dryRun,
          target: plugin.target,
          recursive: true,
          undoCapture,
          resources: context.resources,
        });
        actions.push({
          agent: "claude",
          home: claudeHome,
          plugin: plugin.pluginName,
          target: plugin.target,
          action,
          message: "retire stale plugin directory",
        });
      }

      if (staleNames.size === 0) continue;
      const marketplace = await context.resources.files.readJsonFile<ClaudeMarketplaceFile>(marketplacePath);
      if (!marketplace || !Array.isArray(marketplace.plugins)) continue;

      const nextPlugins = marketplace.plugins.filter(
        (plugin) => !(typeof plugin.name === "string" && staleNames.has(plugin.name)),
      );
      if (nextPlugins.length === marketplace.plugins.length) continue;

      const nextMarketplace = { ...marketplace, plugins: nextPlugins };
      if (!input.dryRun) {
        await undoCapture?.captureWriteTarget(marketplacePath);
        await context.resources.files.writeJsonFile(marketplacePath, nextMarketplace);
      }
      actions.push({
        agent: "claude",
        home: claudeHome,
        plugin: "*",
        target: marketplacePath,
        action: input.dryRun ? "planned" : "updated",
        message: `removed stale managed marketplace entries: ${[...staleNames].join(", ")}`,
      });
    } catch (err) {
      ok = false;
      actions.push({
        agent: "claude",
        home: claudeHome,
        plugin: "*",
        target: marketplacePath,
        action: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ok, stalePlugins, actions };
});

export const router = module.router({
  retireStaleManaged,
});
