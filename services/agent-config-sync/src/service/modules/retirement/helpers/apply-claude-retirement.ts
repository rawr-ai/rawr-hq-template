import type { RetireAction, RetiredPluginRef } from "../entities";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../../shared/resources";
import { deletePathIfPresent, writeJsonWithUndoCapture } from "./filesystem-actions";
import type { ClaudeMarketplaceFile } from "../../../shared/repositories/claude-marketplace-repository";

type ClaudeStalePlugin = {
  pluginName: string;
  dirName: string;
  target: string;
};

export async function applyClaudeRetirement(input: {
  dryRun: boolean;
  claudeHome: string;
  stale: ClaudeStalePlugin[];
  resources: AgentConfigSyncResources;
  undoCapture?: AgentConfigSyncUndoCapture;
}): Promise<{ actions: RetireAction[]; stalePlugins: RetiredPluginRef[] }> {
  const actions: RetireAction[] = [];
  const stalePlugins: RetiredPluginRef[] = [];
  const staleNames = new Set(input.stale.map((entry) => entry.pluginName));

  for (const entry of input.stale) {
    stalePlugins.push({ agent: "claude", home: input.claudeHome, plugin: entry.pluginName });
    const action = await deletePathIfPresent({
      dryRun: input.dryRun,
      target: entry.target,
      recursive: true,
      undoCapture: input.undoCapture,
      resources: input.resources,
    });
    actions.push({
      agent: "claude",
      home: input.claudeHome,
      plugin: entry.pluginName,
      target: entry.target,
      action,
      message: "retire stale plugin directory",
    });
  }

  if (staleNames.size === 0) return { actions, stalePlugins };

  const marketplacePath = input.resources.path.join(input.claudeHome, ".claude-plugin", "marketplace.json");
  const marketplace = await input.resources.files.readJsonFile<ClaudeMarketplaceFile>(marketplacePath);
  if (!marketplace || !Array.isArray(marketplace.plugins)) return { actions, stalePlugins };

  const nextPlugins = marketplace.plugins.filter(
    (plugin) => !(typeof plugin?.name === "string" && staleNames.has(plugin.name)),
  );
  if (nextPlugins.length === marketplace.plugins.length) return { actions, stalePlugins };

  const marketplaceAction = await writeJsonWithUndoCapture({
    dryRun: input.dryRun,
    target: marketplacePath,
    data: { ...marketplace, plugins: nextPlugins },
    undoCapture: input.undoCapture,
    resources: input.resources,
  });
  actions.push({
    agent: "claude",
    home: input.claudeHome,
    plugin: "*",
    target: marketplacePath,
    action: marketplaceAction,
    message: `removed stale managed marketplace entries: ${[...staleNames].join(", ")}`,
  });

  return { actions, stalePlugins };
}
