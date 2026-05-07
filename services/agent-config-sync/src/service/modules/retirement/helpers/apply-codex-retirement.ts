import type { RetireAction, RetiredPluginRef } from "../entities";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "#common/resources";
import type { CodexRegistryFile } from "#repositories/codex-registry-repository";
import { buildCodexManagedConfig } from "#repositories/codex-config-repository";
import { pruneCodexHooksForPlugin } from "#repositories/codex-hooks-repository";
import {
  getCodexManagedMcpDir,
  getCodexRetiredRootSkillsDir,
  getCodexRuntimeSkillsDir,
} from "#repositories/codex-runtime-paths";
import { deletePathIfPresent, writeJsonWithUndoCapture, writeTextWithUndoCapture } from "./filesystem-actions";

type CodexStalePlugin = {
  pluginName: string;
  prompts: string[];
  skills: string[];
  scripts: string[];
  agents: string[];
  hookScripts: string[];
  hookConfigs: string[];
  mcpServers: string[];
  sourcePluginPath?: string;
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
      const target = input.resources.path.join(getCodexRetiredRootSkillsDir(input.codexHome, input.resources.path), skill);
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
        message: "retire stale root skill",
      });

      const runtimeTarget = input.resources.path.join(getCodexRuntimeSkillsDir(input.codexHome, input.resources.path), skill);
      const runtimeAction = await deletePathIfPresent({
        dryRun: input.dryRun,
        target: runtimeTarget,
        recursive: true,
        undoCapture: input.undoCapture,
        resources: input.resources,
      });
      actions.push({
        agent: "codex",
        home: input.codexHome,
        plugin: entry.pluginName,
        target: runtimeTarget,
        action: runtimeAction,
        message: "retire stale runtime skill",
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

    for (const agent of entry.agents) {
      const target = input.resources.path.join(input.codexHome, "agents", `${agent}.toml`);
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
        message: "retire stale agent",
      });
    }

    for (const hook of entry.hookScripts) {
      const target = input.resources.path.join(input.codexHome, "hooks", "rawr", entry.pluginName, hook);
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
        message: "retire stale hook",
      });
    }

    if (entry.hookConfigs.length > 0) {
      const hooksJsonPath = input.resources.path.join(input.codexHome, "hooks.json");
      const existingHooks = await input.resources.files.readJsonFile<unknown>(hooksJsonPath);
      if (existingHooks) {
        const action = await writeJsonWithUndoCapture({
          dryRun: input.dryRun,
          target: hooksJsonPath,
          data: pruneCodexHooksForPlugin({
            pluginName: entry.pluginName,
            existing: existingHooks,
          }),
          undoCapture: input.undoCapture,
          resources: input.resources,
        });
        actions.push({
          agent: "codex",
          home: input.codexHome,
          plugin: entry.pluginName,
          target: hooksJsonPath,
          action,
          message: "remove stale hook lifecycle entries",
        });
      }
    }

    const mcpDir = getCodexManagedMcpDir(input.codexHome, entry.pluginName, input.resources.path);
    for (const mcpServer of entry.mcpServers) {
      if (mcpServer.endsWith(".json") || mcpServer.endsWith(".toml")) continue;
      const target = input.resources.path.join(mcpDir, mcpServer);
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
        message: "retire stale MCP runtime file",
      });
    }

    if (entry.mcpServers.length > 0) {
      const config = await buildCodexManagedConfig({
        codexHome: input.codexHome,
        sourcePlugin: {
          ref: entry.pluginName,
          absPath: entry.sourcePluginPath ?? input.codexHome,
          dirName: entry.pluginName,
        },
        content: {
          workflowFiles: [],
          skills: [],
          scripts: [],
          agentFiles: [],
          hooks: [],
          hookConfigs: [],
          mcpServers: [],
          settings: [],
          assets: [],
          orchestration: [],
        },
        force: true,
        pruneMcpServerNames: entry.mcpServers,
        resources: input.resources,
      });
      if (config.content) {
        const action = await writeTextWithUndoCapture({
          dryRun: input.dryRun,
          target: config.configPath,
          content: config.content,
          undoCapture: input.undoCapture,
          resources: input.resources,
        });
        actions.push({
          agent: "codex",
          home: input.codexHome,
          plugin: entry.pluginName,
          target: config.configPath,
          action,
          message: "remove stale MCP config entries",
        });
      }
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
