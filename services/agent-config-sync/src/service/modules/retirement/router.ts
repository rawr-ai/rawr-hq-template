/**
 * agent-config-sync: retirement module.
 *
 * @remarks
 * This router owns the destructive capability of retiring stale *managed*
 * artifacts from destination homes (Codex + Claude). "Managed" is proven by
 * explicit markers (Codex registry entries, Claude per-plugin sync manifests);
 * we do not infer ownership from generic filesystem state.
 *
 * Domain meaning lives in the procedure handler:
 * - what qualifies as stale,
 * - how scope is applied,
 * - which artifacts are safe to delete,
 * - and which files are updated as part of the retirement operation.
 *
 * Helpers remain mechanical (delete-if-present, write-json-with-undo).
 */
import { module } from "./module";
import type { RetireAction, RetiredPluginRef } from "./entities";
import type { SyncScope } from "../../shared/entities";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../shared/resources";
import { loadCodexRegistry, type CodexRegistryFile } from "../../shared/repositories/codex-registry-repository";
import {
  readClaudeSyncManifest,
  type ClaudeMarketplaceFile,
  type ClaudeManagedPluginManifest,
} from "../../shared/repositories/claude-marketplace-repository";
import { deletePathIfPresent, writeJsonWithUndoCapture } from "./helpers/filesystem-actions";
import { MANAGED_BY, pluginMatchesScope } from "./helpers/managed-source";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

const retireStaleManaged = module.retireStaleManaged.handler(async ({ context, input }) => {
  const resources = context.resources;
  const workspaceRoot = input.workspaceRoot;
  const scope = input.scope;
  const activePluginNames = new Set(input.activePluginNames);
  const undoCapture = input.dryRun ? undefined : context.undoCapture;

  const actions: RetireAction[] = [];
  const stalePlugins: RetiredPluginRef[] = [];
  let ok = true;

  for (const codexHome of input.codexHomes) {
    const registryPath = resources.path.join(codexHome, "plugins", "registry.json");

    try {
      const registry = await loadCodexRegistry(codexHome, resources);
      if (!Array.isArray(registry.data.plugins)) continue;

      const stale: Array<{
        pluginName: string;
        prompts: string[];
        skills: string[];
        scripts: string[];
        sourcePluginPath?: string;
      }> = [];

      for (const plugin of registry.data.plugins) {
        if (!plugin || plugin.managed_by !== MANAGED_BY) continue;
        if (typeof plugin.name !== "string" || plugin.name.length === 0) continue;
        if (activePluginNames.has(plugin.name)) continue;

        if (!pluginMatchesScope({
          pathOps: resources.path,
          sourcePluginPath: plugin.source_plugin_path,
          workspaceRoot,
          scope,
        })) continue;

        stale.push({
          pluginName: plugin.name,
          prompts: toStringArray(plugin.prompts),
          skills: toStringArray(plugin.skills),
          scripts: toStringArray(plugin.scripts),
          sourcePluginPath: typeof plugin.source_plugin_path === "string" ? plugin.source_plugin_path : undefined,
        });
      }

      if (stale.length === 0) continue;

      const staleNames = stale.map((entry) => entry.pluginName);
      const staleSet = new Set(staleNames);
      const nextRegistry: CodexRegistryFile = {
        ...registry.data,
        plugins: registry.data.plugins.filter(
          (plugin) => !(typeof plugin?.name === "string" && staleSet.has(plugin.name)),
        ),
        last_synced: new Date().toISOString(),
      };

      for (const entry of stale) {
        stalePlugins.push({ agent: "codex", home: codexHome, plugin: entry.pluginName });

        for (const prompt of entry.prompts) {
          const target = resources.path.join(codexHome, "prompts", `${prompt}.md`);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            undoCapture,
            resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: entry.pluginName,
            target,
            action,
            message: "retire stale prompt",
          });
        }

        for (const skill of entry.skills) {
          const target = resources.path.join(codexHome, "skills", skill);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            recursive: true,
            undoCapture,
            resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: entry.pluginName,
            target,
            action,
            message: "retire stale skill",
          });
        }

        for (const script of entry.scripts) {
          const target = resources.path.join(codexHome, "scripts", script);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            undoCapture,
            resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: entry.pluginName,
            target,
            action,
            message: "retire stale script",
          });
        }
      }

      const registryAction = await writeJsonWithUndoCapture({
        dryRun: input.dryRun,
        target: registryPath,
        data: nextRegistry,
        undoCapture,
        resources,
      });
      actions.push({
        agent: "codex",
        home: codexHome,
        plugin: "*",
        target: registryPath,
        action: registryAction,
        message: `removed stale managed registry entries: ${staleNames.join(", ")}`,
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
    const pluginsRoot = resources.path.join(claudeHome, "plugins");
    const marketplacePath = resources.path.join(claudeHome, ".claude-plugin", "marketplace.json");

    try {
      const dirents = await resources.files.readDir(pluginsRoot);
      const staleNames = new Set<string>();
      const stale: Array<{ pluginName: string; dirName: string; target: string }> = [];

      for (const dirent of dirents) {
        if (!dirent.isDirectory) continue;

        const manifest = await readClaudeSyncManifest(claudeHome, dirent.name, resources);
        if (!manifest || manifest.managedBy !== MANAGED_BY) continue;
        if (typeof manifest.sourcePluginPath !== "string" || manifest.sourcePluginPath.length === 0) continue;
        const pluginName =
          typeof manifest.plugin === "string" && manifest.plugin.length > 0 ? manifest.plugin : dirent.name;
        if (activePluginNames.has(pluginName)) continue;

        if (!pluginMatchesScope({
          pathOps: resources.path,
          sourcePluginPath: manifest.sourcePluginPath,
          workspaceRoot,
          scope,
        })) continue;

        staleNames.add(pluginName);
        stale.push({
          pluginName,
          dirName: dirent.name,
          target: resources.path.join(pluginsRoot, dirent.name),
        });
      }

      for (const entry of stale) {
        stalePlugins.push({ agent: "claude", home: claudeHome, plugin: entry.pluginName });
        const action = await deletePathIfPresent({
          dryRun: input.dryRun,
          target: entry.target,
          recursive: true,
          undoCapture,
          resources,
        });
        actions.push({
          agent: "claude",
          home: claudeHome,
          plugin: entry.pluginName,
          target: entry.target,
          action,
          message: "retire stale plugin directory",
        });
      }

      if (staleNames.size === 0) continue;

      const marketplace = await resources.files.readJsonFile<ClaudeMarketplaceFile>(marketplacePath);
      if (!marketplace || !Array.isArray(marketplace.plugins)) continue;

      const nextPlugins = marketplace.plugins.filter(
        (plugin) => !(typeof plugin?.name === "string" && staleNames.has(plugin.name)),
      );
      if (nextPlugins.length === marketplace.plugins.length) continue;

      const marketplaceAction = await writeJsonWithUndoCapture({
        dryRun: input.dryRun,
        target: marketplacePath,
        data: { ...marketplace, plugins: nextPlugins },
        undoCapture,
        resources,
      });
      actions.push({
        agent: "claude",
        home: claudeHome,
        plugin: "*",
        target: marketplacePath,
        action: marketplaceAction,
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

export const router = module.router({ retireStaleManaged });
