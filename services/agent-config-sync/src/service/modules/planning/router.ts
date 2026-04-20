import path from "node:path";

import { module } from "./module";
import { resolveProviderContent } from "../source-content/helpers/provider-content";
import { deleteIfExists, syncFileWithConflictPolicy, syncSkillDirWithConflictPolicy } from "../execution/helpers/destination-files";
import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
} from "../execution/helpers/registry-codex";
import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
} from "../execution/helpers/marketplace-claude";
import { pushItem, summarizeScannedContent } from "../execution/helpers/sync-results";
import type { SyncRunResult, SyncTargetResult } from "../execution/contract";
import type { SourceContent, SourcePlugin } from "../../shared/entities";
import type { AgentConfigSyncResources } from "../../shared/resources";
import { summarizeWorkspaceRun } from "./helpers/assessment-summary";
import { evaluateFullSyncPolicy as evaluatePolicy } from "./helpers/full-sync-policy";
import { resolveTargetHomes } from "./helpers/target-homes";
import { discoverWorkspaceSources, filterByScope } from "./helpers/workspace-discovery";
import { resolveWorkspaceRoot } from "./helpers/workspace-roots";

async function previewSyncRun(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  agents: Array<"codex" | "claude">;
  codexHomes: string[];
  claudeHomes: string[];
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  resources: AgentConfigSyncResources;
}): Promise<SyncRunResult> {
  const targets: SyncTargetResult[] = [];
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

    for (const codexHome of input.codexHomes) {
      const result: SyncTargetResult = { agent: "codex", home: codexHome, items: [], conflicts: [] };
      const promptsDir = path.join(codexHome, "prompts");
      const skillsDir = path.join(codexHome, "skills");
      const scriptsDir = path.join(codexHome, "scripts");
      const registry = await loadCodexRegistry(codexHome, input.resources);
      const claimedOthers = {
        prompts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.promptsByPlugin),
        skills: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.skillsByPlugin),
        scripts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.scriptsByPlugin),
      };

      for (const workflow of codexContent.workflowFiles) {
        await syncFileWithConflictPolicy({
          src: workflow.absPath,
          dest: path.join(promptsDir, `${workflow.name}.md`),
          kind: "workflow",
          options,
          result,
          claimedByOtherPlugin: claimedOthers.prompts.has(workflow.name),
        });
      }

      for (const skill of codexContent.skills) {
        await syncSkillDirWithConflictPolicy({
          srcDir: skill.absPath,
          destDir: path.join(skillsDir, skill.name),
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
          dest: path.join(scriptsDir, scriptName),
          kind: "script",
          options,
          result,
          claimedByOtherPlugin: claimedOthers.scripts.has(scriptName),
        });
      }

      const newPrompts = new Set(codexContent.workflowFiles.map((workflow) => workflow.name));
      const newSkills = new Set(codexContent.skills.map((skill) => skill.name));
      const newScripts = new Set(codexContent.scripts.map((script) => buildCodexScriptName(input.sourcePlugin.dirName, script.name)));

      for (const oldPrompt of registry.claimedSets.promptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newPrompts.has(oldPrompt) || claimedOthers.prompts.has(oldPrompt)) continue;
        await deleteIfExists({ target: path.join(promptsDir, `${oldPrompt}.md`), kind: "workflow", options, result });
      }

      for (const oldSkill of registry.claimedSets.skillsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newSkills.has(oldSkill) || claimedOthers.skills.has(oldSkill)) continue;
        await deleteIfExists({ target: path.join(skillsDir, oldSkill), kind: "skill", options, result });
      }

      for (const oldScript of registry.claimedSets.scriptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (newScripts.has(oldScript) || claimedOthers.scripts.has(oldScript)) continue;
        await deleteIfExists({ target: path.join(scriptsDir, oldScript), kind: "script", options, result });
      }

      const codexRegistry = await upsertCodexRegistry({
        codexHome,
        sourcePlugin: input.sourcePlugin,
        content: codexContent,
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

    for (const claudeHome of input.claudeHomes) {
      const result: SyncTargetResult = { agent: "claude", home: claudeHome, items: [], conflicts: [] };
      const pluginDir = path.join(claudeHome, "plugins", input.sourcePlugin.dirName);
      const commandsDir = path.join(pluginDir, "commands");
      const skillsDir = path.join(pluginDir, "skills");
      const scriptsDir = path.join(pluginDir, "scripts");
      const agentsDir = path.join(pluginDir, "agents");

      for (const workflow of claudeContent.workflowFiles) {
        await syncFileWithConflictPolicy({
          src: workflow.absPath,
          dest: path.join(commandsDir, `${workflow.name}.md`),
          kind: "workflow",
          options,
          result,
        });
      }

      for (const skill of claudeContent.skills) {
        await syncSkillDirWithConflictPolicy({
          srcDir: skill.absPath,
          destDir: path.join(skillsDir, skill.name),
          skillName: skill.name,
          options,
          result,
        });
      }

      for (const script of claudeContent.scripts) {
        await syncFileWithConflictPolicy({
          src: script.absPath,
          dest: path.join(scriptsDir, script.name),
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
            dest: path.join(agentsDir, `${agent.name}.md`),
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
          await deleteIfExists({ target: path.join(commandsDir, `${oldWorkflow}.md`), kind: "workflow", options, result });
        }

        for (const oldSkill of previous.skills) {
          if (currentSkills.has(oldSkill)) continue;
          await deleteIfExists({ target: path.join(skillsDir, oldSkill), kind: "skill", options, result });
        }

        for (const oldScript of previous.scripts) {
          if (currentScripts.has(oldScript)) continue;
          await deleteIfExists({ target: path.join(scriptsDir, oldScript), kind: "script", options, result });
        }

        if (includeAgentsInClaude) {
          for (const oldAgent of previous.agents ?? []) {
            if (currentAgents.has(oldAgent)) continue;
            await deleteIfExists({ target: path.join(agentsDir, `${oldAgent}.md`), kind: "agent", options, result });
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
  };
}

const planWorkspaceSync = module.planWorkspaceSync.handler(async ({ context, input, errors }) => {
  const workspaceRoot = await resolveWorkspaceRoot({
    cwd: input.cwd,
    workspaceRoot: input.workspaceRoot,
    resources: context.resources,
  });
  if (!workspaceRoot.ok) {
    if (workspaceRoot.code === "INVALID_WORKSPACE_ROOT") {
      throw errors.INVALID_WORKSPACE_ROOT({
        message: `Configured workspace root is not a RAWR workspace: ${workspaceRoot.resolvedPath}`,
        data: {
          cwd: workspaceRoot.cwd,
          workspaceRoot: workspaceRoot.workspaceRoot,
          resolvedPath: workspaceRoot.resolvedPath,
        },
      });
    }

    throw errors.WORKSPACE_ROOT_NOT_FOUND({
      message: "Unable to locate workspace root (expected a ./plugins directory)",
      data: {
        cwd: workspaceRoot.cwd,
        workspaceRoot: workspaceRoot.workspaceRoot,
      },
    });
  }

  const discovered = await discoverWorkspaceSources({
    cwd: input.cwd,
    workspaceRoot: workspaceRoot.workspaceRoot,
    sourcePaths: input.sourcePaths,
    resources: context.resources,
  });
  const scoped = filterByScope({
    workspaceRoot: discovered.workspaceRoot,
    syncable: discovered.syncable,
    skipped: discovered.skipped,
    scope: input.scope,
  });
  const targetSelection = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
  });
  const runs: SyncRunResult[] = [];
  for (const syncable of scoped.syncable) {
    runs.push(await previewSyncRun({
      sourcePlugin: syncable.sourcePlugin,
      content: syncable.content,
      agents: targetSelection.agents,
      codexHomes: targetSelection.homes.codexHomes,
      claudeHomes: targetSelection.homes.claudeHomes,
      includeAgentsInCodex: input.includeAgentsInCodex,
      includeAgentsInClaude: input.includeAgentsInClaude,
      resources: context.resources,
    }));
  }
  const assessment = summarizeWorkspaceRun({
    runs,
    skipped: scoped.skipped,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
  });

  return {
    workspaceRoot: discovered.workspaceRoot,
    syncable: scoped.syncable,
    skipped: scoped.skipped,
    agents: targetSelection.agents,
    targetHomes: targetSelection.homes,
    includeAgentsInCodex: input.includeAgentsInCodex ?? false,
    includeAgentsInClaude: input.includeAgentsInClaude ?? true,
    activePluginNames: scoped.syncable.map((item) => item.sourcePlugin.dirName).sort((a, b) => a.localeCompare(b)),
    fullSyncPolicy: evaluatePolicy(input.fullSyncPolicy),
    assessment,
  };
});

const assessWorkspaceSync = module.assessWorkspaceSync.handler(async ({ context, input, errors }) => {
  const workspaceRoot = await resolveWorkspaceRoot({
    cwd: input.cwd,
    workspaceRoot: input.workspaceRoot,
    resources: context.resources,
  });
  if (!workspaceRoot.ok) {
    if (workspaceRoot.code === "INVALID_WORKSPACE_ROOT") {
      throw errors.INVALID_WORKSPACE_ROOT({
        message: `Configured workspace root is not a RAWR workspace: ${workspaceRoot.resolvedPath}`,
        data: {
          cwd: workspaceRoot.cwd,
          workspaceRoot: workspaceRoot.workspaceRoot,
          resolvedPath: workspaceRoot.resolvedPath,
        },
      });
    }

    throw errors.WORKSPACE_ROOT_NOT_FOUND({
      message: "Unable to locate workspace root (expected a ./plugins directory)",
      data: {
        cwd: workspaceRoot.cwd,
        workspaceRoot: workspaceRoot.workspaceRoot,
      },
    });
  }

  const discovered = await discoverWorkspaceSources({
    cwd: input.cwd,
    workspaceRoot: workspaceRoot.workspaceRoot,
    sourcePaths: input.sourcePaths,
    resources: context.resources,
  });
  const scoped = filterByScope({
    workspaceRoot: discovered.workspaceRoot,
    syncable: discovered.syncable,
    skipped: discovered.skipped,
    scope: input.scope,
  });
  const targetSelection = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
  });
  const runs: SyncRunResult[] = [];
  for (const syncable of scoped.syncable) {
    runs.push(await previewSyncRun({
      sourcePlugin: syncable.sourcePlugin,
      content: syncable.content,
      agents: targetSelection.agents,
      codexHomes: targetSelection.homes.codexHomes,
      claudeHomes: targetSelection.homes.claudeHomes,
      includeAgentsInCodex: input.includeAgentsInCodex,
      includeAgentsInClaude: input.includeAgentsInClaude,
      resources: context.resources,
    }));
  }

  const assessment = summarizeWorkspaceRun({
    runs,
    skipped: scoped.skipped,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
  });
  return assessment;
});

const evaluateFullSyncPolicy = module.evaluateFullSyncPolicy.handler(async ({ context, input }) => {
  return evaluatePolicy(input);
});

export const router = module.router({
  planWorkspaceSync,
  assessWorkspaceSync,
  evaluateFullSyncPolicy,
});
