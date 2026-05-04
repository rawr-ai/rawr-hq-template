import { resolveProviderContent } from "../../../shared/source-content/helpers/provider-content";
import {
  deleteIfExists,
  syncFileWithConflictPolicy,
  syncSkillDirWithConflictPolicy,
  syncTextWithConflictPolicy,
} from "../../../shared/repositories/destination-sync-repository";
import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
} from "../../../shared/repositories/codex-registry-repository";
import { buildCodexManagedConfig } from "../../../shared/repositories/codex-config-repository";
import {
  buildCodexHooksFile,
  pruneCodexHooksForPlugin,
} from "../../../shared/repositories/codex-hooks-repository";
import {
  getCodexManagedMcpDir,
  getCodexRetiredRootSkillsDir,
  getCodexRuntimeSkillsDir,
} from "../../../shared/repositories/codex-runtime-paths";
import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
} from "../../../shared/repositories/claude-marketplace-repository";
import { pushItem, summarizeScannedContent } from "../../../shared/helpers/sync-results";
import type { SyncRunResult, SyncTargetResult } from "../../../shared/entities/sync-results";
import type { SourceContent, SourcePlugin } from "../../../shared/entities";
import type { AgentConfigSyncResources } from "../../../shared/resources";
import { buildProviderProjections } from "../../../shared/helpers/projections";
import { buildCodexAgentProjection } from "../../../shared/source-content/helpers/codex-agent";

export async function previewSyncRun(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  agents: Array<"codex" | "claude">;
  codexHomes: string[];
  claudeHomes: string[];
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  resources: AgentConfigSyncResources;
}): Promise<SyncRunResult> {
  const pathOps = input.resources.path;
  const targets: SyncTargetResult[] = [];
  const projections: SyncRunResult["projections"] = [];
  const options = {
    dryRun: true,
    force: true,
    gc: true,
    includeAgentsInCodex: input.includeAgentsInCodex,
    includeAgentsInClaude: input.includeAgentsInClaude,
    resources: input.resources,
  };

  if (input.agents.includes("codex")) {
    const codexContent = await resolveProviderContent({
      agent: "codex",
      sourcePlugin: input.sourcePlugin,
      base: input.content,
      resources: input.resources,
    });
    projections.push(...await buildProviderProjections({
      provider: "codex",
      sourcePlugin: input.sourcePlugin,
      content: codexContent,
      homes: input.codexHomes,
      includeAgentsInCodex: input.includeAgentsInCodex,
      resources: input.resources,
    }));

    for (const codexHome of input.codexHomes) {
      const result: SyncTargetResult = { agent: "codex", home: codexHome, items: [], conflicts: [] };
      const promptsDir = pathOps.join(codexHome, "prompts");
      const retiredRootSkillsDir = getCodexRetiredRootSkillsDir(codexHome, pathOps);
      const runtimeSkillsDir = getCodexRuntimeSkillsDir(codexHome, pathOps);
      const scriptsDir = pathOps.join(codexHome, "scripts");
      const agentsDir = pathOps.join(codexHome, "agents");
      const hooksDir = pathOps.join(codexHome, "hooks", "rawr", input.sourcePlugin.dirName);
      const mcpDir = getCodexManagedMcpDir(codexHome, input.sourcePlugin.dirName, pathOps);
      const registry = await loadCodexRegistry(codexHome, input.resources);
      const claimedOthers = {
        prompts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.promptsByPlugin),
        skills: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.skillsByPlugin),
        scripts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.scriptsByPlugin),
        agents: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.agentsByPlugin),
        hookScripts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.hookScriptsByPlugin),
        mcpServers: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.mcpServersByPlugin),
      };
      const newMcpServers = new Set((codexContent.mcpServers ?? []).map((server) => server.name));
      const staleMcpServers = [...(registry.claimedSets.mcpServersByPlugin[input.sourcePlugin.dirName] ?? new Set<string>())]
        .filter((server) => !newMcpServers.has(server) && !claimedOthers.mcpServers.has(server));

      for (const workflow of codexContent.workflowFiles) {
        await syncFileWithConflictPolicy({
          src: workflow.absPath,
          dest: pathOps.join(promptsDir, `${workflow.name}.md`),
          kind: "workflow",
          options,
          result,
          claimedByOtherPlugin: claimedOthers.prompts.has(workflow.name),
        });
      }

      for (const skill of codexContent.skills) {
        await syncSkillDirWithConflictPolicy({
          srcDir: skill.absPath,
          destDir: pathOps.join(runtimeSkillsDir, skill.name),
          skillName: skill.name,
          options,
          result,
          claimedByOtherPlugin: claimedOthers.skills.has(skill.name),
        });
      }

      for (const script of codexContent.scripts) {
        const scriptName = buildCodexScriptName(input.sourcePlugin.dirName, script.name);
        await syncFileWithConflictPolicy({
          src: script.absPath,
          dest: pathOps.join(scriptsDir, scriptName),
          kind: "script",
          options,
          result,
          claimedByOtherPlugin: claimedOthers.scripts.has(scriptName),
        });
      }

      for (const hook of codexContent.hooks ?? []) {
        await syncFileWithConflictPolicy({
          src: hook.absPath,
          dest: pathOps.join(hooksDir, hook.name),
          kind: "hook",
          options,
          result,
          claimedByOtherPlugin: claimedOthers.hookScripts.has(hook.name),
        });
      }

      for (const mcpServer of codexContent.mcpServers ?? []) {
        if (mcpServer.name.endsWith(".json") || mcpServer.name.endsWith(".toml")) continue;
        await syncFileWithConflictPolicy({
          src: mcpServer.absPath,
          dest: pathOps.join(mcpDir, mcpServer.name),
          kind: "mcp",
          options,
          result,
        });
      }

      if ((codexContent.hookConfigs ?? []).length > 0 || (registry.claimedSets.hookConfigsByPlugin[input.sourcePlugin.dirName]?.size ?? 0) > 0) {
        const hooksJsonPath = pathOps.join(codexHome, "hooks.json");
        const existingHooks = await input.resources.files.readJsonFile<unknown>(hooksJsonPath);
        const hooksFile = await buildCodexHooksFile({
          pluginName: input.sourcePlugin.dirName,
          hookConfigs: codexContent.hookConfigs ?? [],
          hookScripts: codexContent.hooks ?? [],
          hooksDir,
          existing: existingHooks,
          resources: input.resources,
        }) ?? pruneCodexHooksForPlugin({
          pluginName: input.sourcePlugin.dirName,
          existing: existingHooks,
        });
        await syncTextWithConflictPolicy({
          content: `${JSON.stringify(hooksFile, null, 2)}\n`,
          source: input.sourcePlugin.absPath,
          dest: hooksJsonPath,
          kind: "hook",
          options,
          result,
        });
      }

      await previewCodexConfigToml({
        codexHome,
        sourcePlugin: input.sourcePlugin,
        content: codexContent,
        mcpRuntimeDir: mcpDir,
        pruneMcpServerNames: staleMcpServers,
        options,
        result,
      });

      const includeAgentsInCodex = options.includeAgentsInCodex ?? true;
      if (includeAgentsInCodex) {
        for (const agent of codexContent.agentFiles) {
          const rendered = await buildCodexAgentProjection({
            agent,
            sourcePlugin: input.sourcePlugin,
            resources: input.resources,
          });
          await syncTextWithConflictPolicy({
            content: rendered.toml,
            source: agent.absPath,
            dest: pathOps.join(agentsDir, rendered.targetName),
            kind: "agent",
            options,
            result,
            claimedByOtherPlugin: claimedOthers.agents.has(agent.name),
          });
        }
      }

      const newPrompts = new Set(codexContent.workflowFiles.map((workflow) => workflow.name));
      const newSkills = new Set(codexContent.skills.map((skill) => skill.name));
      const newScripts = new Set(
        codexContent.scripts.map((script) => buildCodexScriptName(input.sourcePlugin.dirName, script.name)),
      );
      const newAgents = new Set(includeAgentsInCodex ? codexContent.agentFiles.map((agent) => agent.name) : []);
      const newHooks = new Set([
        ...(codexContent.hookConfigs ?? []).map((hook) => hook.name),
      ]);
      const newHookScripts = new Set((codexContent.hooks ?? []).map((hook) => hook.name));
      for (const oldPrompt of registry.claimedSets.promptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newPrompts.has(oldPrompt) || claimedOthers.prompts.has(oldPrompt)) continue;
        await deleteIfExists({ target: pathOps.join(promptsDir, `${oldPrompt}.md`), kind: "workflow", options, result });
      }

      for (const oldSkill of registry.claimedSets.skillsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        await deleteIfExists({ target: pathOps.join(retiredRootSkillsDir, oldSkill), kind: "skill", options, result });
        if (newSkills.has(oldSkill) || claimedOthers.skills.has(oldSkill)) continue;
        await deleteIfExists({ target: pathOps.join(runtimeSkillsDir, oldSkill), kind: "skill", options, result });
      }

      for (const oldScript of registry.claimedSets.scriptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newScripts.has(oldScript) || claimedOthers.scripts.has(oldScript)) continue;
        await deleteIfExists({ target: pathOps.join(scriptsDir, oldScript), kind: "script", options, result });
      }

      for (const oldAgent of registry.claimedSets.agentsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newAgents.has(oldAgent) || claimedOthers.agents.has(oldAgent)) continue;
        await deleteIfExists({ target: pathOps.join(agentsDir, `${oldAgent}.toml`), kind: "agent", options, result });
      }

      for (const oldHook of registry.claimedSets.hookScriptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newHookScripts.has(oldHook) || claimedOthers.hookScripts.has(oldHook)) continue;
        await deleteIfExists({ target: pathOps.join(hooksDir, oldHook), kind: "hook", options, result });
      }

      if (
        (registry.claimedSets.hookConfigsByPlugin[input.sourcePlugin.dirName]?.size ?? 0) > 0 &&
        newHooks.size === 0
      ) {
        const hooksJsonPath = pathOps.join(codexHome, "hooks.json");
        const existingHooks = await input.resources.files.readJsonFile<unknown>(hooksJsonPath);
        if (existingHooks) {
          await syncTextWithConflictPolicy({
            content: `${JSON.stringify(pruneCodexHooksForPlugin({
              pluginName: input.sourcePlugin.dirName,
              existing: existingHooks,
            }), null, 2)}\n`,
            source: input.sourcePlugin.absPath,
            dest: hooksJsonPath,
            kind: "hook",
            options,
            result,
          });
        }
      }

      for (const oldMcpServer of registry.claimedSets.mcpServersByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newMcpServers.has(oldMcpServer) || claimedOthers.mcpServers.has(oldMcpServer)) continue;
        await deleteIfExists({ target: pathOps.join(mcpDir, oldMcpServer), kind: "mcp", options, result });
      }

      const codexRegistry = await upsertCodexRegistry({
        codexHome,
        sourcePlugin: input.sourcePlugin,
        content: codexContent,
        includeAgents: includeAgentsInCodex,
        dryRun: true,
        existingData: registry.data,
        resources: input.resources,
      });
      if (codexRegistry.changed) {
        pushItem(result, {
          action: "planned",
          kind: "metadata",
          target: codexRegistry.filePath,
          message: "registry upsert",
        });
      }

      targets.push(result);
    }
  }

  if (input.agents.includes("claude")) {
    const claudeContent = await resolveProviderContent({
      agent: "claude",
      sourcePlugin: input.sourcePlugin,
      base: input.content,
      resources: input.resources,
    });
    projections.push(...await buildProviderProjections({
      provider: "claude",
      sourcePlugin: input.sourcePlugin,
      content: claudeContent,
      homes: input.claudeHomes,
      includeAgentsInClaude: input.includeAgentsInClaude,
      resources: input.resources,
    }));

    for (const claudeHome of input.claudeHomes) {
      const result: SyncTargetResult = { agent: "claude", home: claudeHome, items: [], conflicts: [] };
      const pluginDir = pathOps.join(claudeHome, "plugins", input.sourcePlugin.dirName);
      const commandsDir = pathOps.join(pluginDir, "commands");
      const skillsDir = pathOps.join(pluginDir, "skills");
      const scriptsDir = pathOps.join(pluginDir, "scripts");
      const agentsDir = pathOps.join(pluginDir, "agents");

      for (const workflow of claudeContent.workflowFiles) {
        await syncFileWithConflictPolicy({
          src: workflow.absPath,
          dest: pathOps.join(commandsDir, `${workflow.name}.md`),
          kind: "workflow",
          options,
          result,
        });
      }

      for (const skill of claudeContent.skills) {
        await syncSkillDirWithConflictPolicy({
          srcDir: skill.absPath,
          destDir: pathOps.join(skillsDir, skill.name),
          skillName: skill.name,
          options,
          result,
        });
      }

      for (const script of claudeContent.scripts) {
        await syncFileWithConflictPolicy({
          src: script.absPath,
          dest: pathOps.join(scriptsDir, script.name),
          kind: "script",
          options,
          result,
        });
      }

      const includeAgentsInClaude = options.includeAgentsInClaude ?? true;
      if (includeAgentsInClaude) {
        for (const agent of claudeContent.agentFiles) {
          await syncFileWithConflictPolicy({
            src: agent.absPath,
            dest: pathOps.join(agentsDir, `${agent.name}.md`),
            kind: "agent",
            options,
            result,
          });
        }
      }

      const previous = await readClaudeSyncManifest(claudeHome, input.sourcePlugin.dirName, input.resources);
      if (previous) {
        const currentWorkflow = new Set(claudeContent.workflowFiles.map((workflow) => workflow.name));
        const currentSkills = new Set(claudeContent.skills.map((skill) => skill.name));
        const currentScripts = new Set(claudeContent.scripts.map((script) => script.name));
        const currentAgents = new Set(claudeContent.agentFiles.map((agent) => agent.name));

        for (const oldWorkflow of previous.workflows) {
          if (currentWorkflow.has(oldWorkflow)) continue;
          await deleteIfExists({
            target: pathOps.join(commandsDir, `${oldWorkflow}.md`),
            kind: "workflow",
            options,
            result,
          });
        }

        for (const oldSkill of previous.skills) {
          if (currentSkills.has(oldSkill)) continue;
          await deleteIfExists({ target: pathOps.join(skillsDir, oldSkill), kind: "skill", options, result });
        }

        for (const oldScript of previous.scripts) {
          if (currentScripts.has(oldScript)) continue;
          await deleteIfExists({ target: pathOps.join(scriptsDir, oldScript), kind: "script", options, result });
        }

        if (includeAgentsInClaude) {
          for (const oldAgent of previous.agents ?? []) {
            if (currentAgents.has(oldAgent)) continue;
            await deleteIfExists({
              target: pathOps.join(agentsDir, `${oldAgent}.md`),
              kind: "workflow",
              options,
              result,
            });
          }
        }
      }

      const pluginManifest = await upsertClaudePluginManifest({
        claudeLocalHome: claudeHome,
        sourcePlugin: input.sourcePlugin,
        dryRun: true,
        resources: input.resources,
      });
      if (pluginManifest.changed) {
        pushItem(result, {
          action: "planned",
          kind: "metadata",
          target: pluginManifest.filePath,
          message: "plugin.json upsert",
        });
      }

      const marketplace = await upsertClaudeMarketplace({
        claudeLocalHome: claudeHome,
        sourcePlugin: input.sourcePlugin,
        dryRun: true,
        resources: input.resources,
      });
      if (marketplace.changed) {
        pushItem(result, {
          action: "planned",
          kind: "metadata",
          target: marketplace.filePath,
          message: "marketplace upsert",
        });
      }

      const syncManifest = await writeClaudeSyncManifest({
        claudeLocalHome: claudeHome,
        sourcePlugin: input.sourcePlugin,
        content: claudeContent,
        dryRun: true,
        resources: input.resources,
      });
      if (syncManifest.changed) {
        pushItem(result, {
          action: "planned",
          kind: "metadata",
          target: syncManifest.filePath,
          message: "sync manifest upsert",
        });
      }

      targets.push(result);
    }
  }

  return {
    ok: targets.every((target) => target.conflicts.length === 0),
    sourcePlugin: input.sourcePlugin,
    scanned: summarizeScannedContent(input.content),
    targets,
    projections,
  };
}

async function previewCodexConfigToml(input: {
  codexHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  mcpRuntimeDir: string;
  pruneMcpServerNames: string[];
  options: {
    dryRun: boolean;
    force: boolean;
    resources: AgentConfigSyncResources;
  };
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
  pushItem(input.result, {
    action: existing === config.content ? "skipped" : "planned",
    kind: "settings",
    source: config.sourcePaths[0] ?? input.sourcePlugin.absPath,
    target: config.configPath,
    message: existing === config.content
      ? "identical managed Codex config"
      : "merge managed Codex hooks/MCP/settings config",
  });
}
