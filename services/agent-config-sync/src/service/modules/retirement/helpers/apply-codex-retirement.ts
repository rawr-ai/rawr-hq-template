import type { RetireAction, RetiredPluginRef } from "../entities";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../../shared/resources";
import type { CodexRegistryFile } from "../../../shared/repositories/codex-registry-repository";
import { deletePathIfPresent, writeJsonWithUndoCapture } from "./filesystem-actions";

type CodexStalePlugin = {
  pluginName: string;
  prompts: string[];
  skills: string[];
  scripts: string[];
};

export async function applyCodexRetirement(input: {
  dryRun: boolean;
  codexHome: string;
  registryPath: string;
  nextRegistry: CodexRegistryFile;
  stale: CodexStalePlugin[];
  resources: AgentConfigSyncResources;
  undoCapture?: AgentConfigSyncUndoCapture;
}): Promise<{ actions: RetireAction[]; stalePlugins: RetiredPluginRef[] }> {
  const actions: RetireAction[] = [];
  const stalePlugins: RetiredPluginRef[] = [];
  const staleNames = input.stale.map((entry) => entry.pluginName);

  for (const entry of input.stale) {
    stalePlugins.push({ agent: "codex", home: input.codexHome, plugin: entry.pluginName });

    for (const prompt of entry.prompts) {
      const target = input.resources.path.join(input.codexHome, "prompts", `${prompt}.md`);
      const action = await deletePathIfPresent({
        dryRun: input.dryRun,
        target,
        undoCapture: input.undoCapture,
        resources: input.resources,
      });
      actions.push({
        agent: "codex",
        home: input.codexHome,
        plugin: entry.pluginName,
        target,
        action,
        message: "retire stale prompt",
      });
    }

    for (const skill of entry.skills) {
      const target = input.resources.path.join(input.codexHome, "skills", skill);
      const action = await deletePathIfPresent({
        dryRun: input.dryRun,
        target,
        recursive: true,
        undoCapture: input.undoCapture,
        resources: input.resources,
      });
      actions.push({
        agent: "codex",
        home: input.codexHome,
        plugin: entry.pluginName,
        target,
        action,
        message: "retire stale skill",
      });
    }

    for (const script of entry.scripts) {
      const target = input.resources.path.join(input.codexHome, "scripts", script);
      const action = await deletePathIfPresent({
        dryRun: input.dryRun,
        target,
        undoCapture: input.undoCapture,
        resources: input.resources,
      });
      actions.push({
        agent: "codex",
        home: input.codexHome,
        plugin: entry.pluginName,
        target,
        action,
        message: "retire stale script",
      });
    }
  }

  const registryAction = await writeJsonWithUndoCapture({
    dryRun: input.dryRun,
    target: input.registryPath,
    data: input.nextRegistry,
    undoCapture: input.undoCapture,
    resources: input.resources,
  });
  actions.push({
    agent: "codex",
    home: input.codexHome,
    plugin: "*",
    target: input.registryPath,
    action: registryAction,
    message: `removed stale managed registry entries: ${staleNames.join(", ")}`,
  });

  return { actions, stalePlugins };
}
