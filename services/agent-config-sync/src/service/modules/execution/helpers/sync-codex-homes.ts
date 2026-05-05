import type { SourceContent, SourcePlugin } from "#shared/entities";
import type { SyncTargetResult } from "#shared/entities/sync-results";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "#shared/resources";
import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
} from "#repositories/codex-registry-repository";
import { buildCodexManagedConfig } from "#repositories/codex-config-repository";
import {
  buildCodexHooksFile,
  pruneCodexHooksForPlugin,
} from "#repositories/codex-hooks-repository";
import {
  getCodexManagedMcpDir,
  getCodexRetiredRootSkillsDir,
  getCodexRuntimeSkillsDir,
} from "#repositories/codex-runtime-paths";
import {
  deleteIfExists,
  syncFileWithConflictPolicy,
  syncSkillDirWithConflictPolicy,
  syncTextWithConflictPolicy,
} from "#repositories/destination-sync-repository";
import { pushItem } from "#shared/helpers/sync-results";
import { buildCodexAgentProjection } from "#source-content/helpers/codex-agent";

type DestinationSyncOptions = {
  dryRun: boolean;
  force: boolean;
  gc: boolean;
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  undoCapture?: AgentConfigSyncUndoCapture;
  resources: AgentConfigSyncResources;
};

export async function syncCodexHomes(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  codexHomes: string[];
  options: DestinationSyncOptions;
}): Promise<SyncTargetResult[]> {
  const pathOps = input.options.resources.path;
  const targets: SyncTargetResult[] = [];

  for (const codexHome of input.codexHomes) {
    const result: SyncTargetResult = { agent: "codex", home: codexHome, items: [], conflicts: [] };
    const promptsDir = pathOps.join(codexHome, "prompts");
    const retiredRootSkillsDir = getCodexRetiredRootSkillsDir(codexHome, pathOps);
    const runtimeSkillsDir = getCodexRuntimeSkillsDir(codexHome, pathOps);
    const scriptsDir = pathOps.join(codexHome, "scripts");
    const agentsDir = pathOps.join(codexHome, "agents");
    const hooksDir = pathOps.join(codexHome, "hooks", "rawr", input.sourcePlugin.dirName);
    const mcpDir = getCodexManagedMcpDir(codexHome, input.sourcePlugin.dirName, pathOps);

    if (!input.options.dryRun) {
      await Promise.all([
        input.options.resources.files.ensureDir(promptsDir),
        input.options.resources.files.ensureDir(runtimeSkillsDir),
        input.options.resources.files.ensureDir(scriptsDir),
        input.options.resources.files.ensureDir(agentsDir),
        input.options.resources.files.ensureDir(pathOps.join(codexHome, "plugins")),
      ]);
    }

    const registry = await loadCodexRegistry(codexHome, input.options.resources);
    const claimedOthers = {
      prompts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.promptsByPlugin),
      skills: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.skillsByPlugin),
      scripts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.scriptsByPlugin),
      agents: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.agentsByPlugin),
      hookScripts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.hookScriptsByPlugin),
      mcpServers: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.mcpServersByPlugin),
    };
    const newMcpServers = new Set((input.content.mcpServers ?? []).map((server) => server.name));
    const staleMcpServers = [...(registry.claimedSets.mcpServersByPlugin[input.sourcePlugin.dirName] ?? new Set<string>())]
      .filter((server) => !newMcpServers.has(server) && !claimedOthers.mcpServers.has(server));

    for (const workflow of input.content.workflowFiles) {
      await syncFileWithConflictPolicy({
        src: workflow.absPath,
        dest: pathOps.join(promptsDir, `${workflow.name}.md`),
        kind: "workflow",
        options: input.options,
        result,
        claimedByOtherPlugin: claimedOthers.prompts.has(workflow.name),
      });
    }

    for (const skill of input.content.skills) {
      await syncSkillDirWithConflictPolicy({
        srcDir: skill.absPath,
        destDir: pathOps.join(runtimeSkillsDir, skill.name),
        skillName: skill.name,
        options: input.options,
        result,
        claimedByOtherPlugin: claimedOthers.skills.has(skill.name),
      });
    }

    for (const script of input.content.scripts) {
      const scriptName = buildCodexScriptName(input.sourcePlugin.dirName, script.name);
      await syncFileWithConflictPolicy({
        src: script.absPath,
        dest: pathOps.join(scriptsDir, scriptName),
        kind: "script",
        options: input.options,
        result,
        claimedByOtherPlugin: claimedOthers.scripts.has(scriptName),
      });
    }

    for (const hook of input.content.hooks ?? []) {
      await syncFileWithConflictPolicy({
        src: hook.absPath,
        dest: pathOps.join(hooksDir, hook.name),
        kind: "hook",
        options: input.options,
        result,
        claimedByOtherPlugin: claimedOthers.hookScripts.has(hook.name),
      });
    }

    for (const mcpServer of input.content.mcpServers ?? []) {
      if (mcpServer.name.endsWith(".json") || mcpServer.name.endsWith(".toml")) continue;
      await syncFileWithConflictPolicy({
        src: mcpServer.absPath,
        dest: pathOps.join(mcpDir, mcpServer.name),
        kind: "mcp",
        options: input.options,
        result,
      });
    }
    if ((input.content.hookConfigs ?? []).length > 0 || (registry.claimedSets.hookConfigsByPlugin[input.sourcePlugin.dirName]?.size ?? 0) > 0) {
      const hooksJsonPath = pathOps.join(codexHome, "hooks.json");
      const existingHooks = await input.options.resources.files.readJsonFile<unknown>(hooksJsonPath);
      const hooksFile = await buildCodexHooksFile({
        pluginName: input.sourcePlugin.dirName,
        hookConfigs: input.content.hookConfigs ?? [],
        hookScripts: input.content.hooks ?? [],
        hooksDir,
        existing: existingHooks,
        resources: input.options.resources,
      }) ?? pruneCodexHooksForPlugin({
        pluginName: input.sourcePlugin.dirName,
        existing: existingHooks,
      });
      await syncTextWithConflictPolicy({
        content: `${JSON.stringify(hooksFile, null, 2)}\n`,
        source: input.sourcePlugin.absPath,
        dest: hooksJsonPath,
        kind: "hook",
        options: input.options,
        result,
      });
    }

    await syncCodexConfigToml({
      codexHome,
      sourcePlugin: input.sourcePlugin,
      content: input.content,
      mcpRuntimeDir: mcpDir,
      pruneMcpServerNames: staleMcpServers,
      options: input.options,
      result,
    });

    const includeAgentsInCodex = input.options.includeAgentsInCodex ?? true;
    if (includeAgentsInCodex) {
      for (const agent of input.content.agentFiles) {
        const rendered = await buildCodexAgentProjection({
          agent,
          sourcePlugin: input.sourcePlugin,
          resources: input.options.resources,
        });
        await syncTextWithConflictPolicy({
          content: rendered.toml,
          source: agent.absPath,
          dest: pathOps.join(agentsDir, rendered.targetName),
          kind: "agent",
          options: input.options,
          result,
          claimedByOtherPlugin: claimedOthers.agents.has(agent.name),
        });
      }
    }

    if (input.options.gc) {
      const newPrompts = new Set(input.content.workflowFiles.map((workflow) => workflow.name));
      const newSkills = new Set(input.content.skills.map((skill) => skill.name));
      const newScripts = new Set(
        input.content.scripts.map((script) => buildCodexScriptName(input.sourcePlugin.dirName, script.name)),
      );
      const newAgents = new Set(includeAgentsInCodex ? input.content.agentFiles.map((agent) => agent.name) : []);
      const newHooks = new Set([
        ...(input.content.hookConfigs ?? []).map((hook) => hook.name),
      ]);
      const newHookScripts = new Set((input.content.hooks ?? []).map((hook) => hook.name));
      for (const oldPrompt of registry.claimedSets.promptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newPrompts.has(oldPrompt) || claimedOthers.prompts.has(oldPrompt)) continue;
        await deleteIfExists({
          target: pathOps.join(promptsDir, `${oldPrompt}.md`),
          kind: "workflow",
          options: input.options,
          result,
        });
      }

      for (const oldSkill of registry.claimedSets.skillsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        await deleteIfExists({ target: pathOps.join(retiredRootSkillsDir, oldSkill), kind: "skill", options: input.options, result });
        if (newSkills.has(oldSkill) || claimedOthers.skills.has(oldSkill)) continue;
        await deleteIfExists({ target: pathOps.join(runtimeSkillsDir, oldSkill), kind: "skill", options: input.options, result });
      }

      for (const oldScript of registry.claimedSets.scriptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newScripts.has(oldScript) || claimedOthers.scripts.has(oldScript)) continue;
        await deleteIfExists({
          target: pathOps.join(scriptsDir, oldScript),
          kind: "script",
          options: input.options,
          result,
        });
      }

      for (const oldAgent of registry.claimedSets.agentsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newAgents.has(oldAgent) || claimedOthers.agents.has(oldAgent)) continue;
        await deleteIfExists({
          target: pathOps.join(agentsDir, `${oldAgent}.toml`),
          kind: "agent",
          options: input.options,
          result,
        });
      }

      for (const oldHook of registry.claimedSets.hookScriptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newHookScripts.has(oldHook) || claimedOthers.hookScripts.has(oldHook)) continue;
        await deleteIfExists({
          target: pathOps.join(hooksDir, oldHook),
          kind: "hook",
          options: input.options,
          result,
        });
      }

      if (
        (registry.claimedSets.hookConfigsByPlugin[input.sourcePlugin.dirName]?.size ?? 0) > 0 &&
        newHooks.size === 0
      ) {
        const hooksJsonPath = pathOps.join(codexHome, "hooks.json");
        const existingHooks = await input.options.resources.files.readJsonFile<unknown>(hooksJsonPath);
        if (existingHooks) {
          await syncTextWithConflictPolicy({
            content: `${JSON.stringify(pruneCodexHooksForPlugin({
              pluginName: input.sourcePlugin.dirName,
              existing: existingHooks,
            }), null, 2)}\n`,
            source: input.sourcePlugin.absPath,
            dest: hooksJsonPath,
            kind: "hook",
            options: input.options,
            result,
          });
        }
      }

      for (const oldMcpServer of registry.claimedSets.mcpServersByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newMcpServers.has(oldMcpServer) || claimedOthers.mcpServers.has(oldMcpServer)) continue;
        await deleteIfExists({
          target: pathOps.join(mcpDir, oldMcpServer),
          kind: "mcp",
          options: input.options,
          result,
        });
      }
    }

    if (!input.options.dryRun) {
      await input.options.undoCapture?.captureWriteTarget(registry.filePath);
    }
    const codexRegistry = await upsertCodexRegistry({
      codexHome,
      sourcePlugin: input.sourcePlugin,
      content: input.content,
      includeAgents: input.options.includeAgentsInCodex ?? true,
      dryRun: input.options.dryRun,
      existingData: registry.data,
      resources: input.options.resources,
    });
    if (codexRegistry.changed) {
      pushItem(result, {
        action: input.options.dryRun ? "planned" : "updated",
        kind: "metadata",
        target: codexRegistry.filePath,
        message: "registry upsert",
      });
    }

    targets.push(result);
  }

  return targets;
}

async function syncCodexConfigToml(input: {
  codexHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  mcpRuntimeDir: string;
  pruneMcpServerNames: string[];
  options: DestinationSyncOptions;
  result: SyncTargetResult;
}): Promise<void> {
  const config = await buildCodexManagedConfig({
    codexHome: input.codexHome,
    sourcePlugin: input.sourcePlugin,
    content: input.content,
    force: input.options.force,
    mcpRuntimeDir: input.mcpRuntimeDir,
    pruneMcpServerNames: input.pruneMcpServerNames,
    resources: input.options.resources,
  });

  if (config.conflictMessages.length > 0) {
    for (const message of config.conflictMessages) {
      pushItem(input.result, {
        action: "conflict",
        kind: "settings",
        source: input.sourcePlugin.absPath,
        target: config.configPath,
        message,
      });
    }
    return;
  }

  for (const message of config.validationNotes) {
    pushItem(input.result, {
      action: "skipped",
      kind: "settings",
      source: input.sourcePlugin.absPath,
      target: config.configPath,
      message,
    });
  }

  if (!config.content) return;

  const existing = await input.options.resources.files.readTextFile(config.configPath);
  if (existing === config.content) {
    pushItem(input.result, {
      action: "skipped",
      kind: "settings",
      source: input.sourcePlugin.absPath,
      target: config.configPath,
      message: "identical managed Codex config",
    });
    return;
  }

  if (!input.options.dryRun) {
    await input.options.undoCapture?.captureWriteTarget(config.configPath);
    await input.options.resources.files.writeTextFile(config.configPath, config.content);
  }
  pushItem(input.result, {
    action: input.options.dryRun ? "planned" : existing === null ? "copied" : "updated",
    kind: "settings",
    source: config.sourcePaths[0] ?? input.sourcePlugin.absPath,
    target: config.configPath,
    message: "merged managed Codex hooks/MCP/settings config",
  });
}
