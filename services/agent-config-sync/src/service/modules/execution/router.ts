/**
 * agent-config-sync: execution module.
 *
 * This router owns the "do the sync" capability: given normalized source-content
 * (canonical + provider overlay policy) and destination homes (Codex/Claude),
 * it applies the service's conflict/GC policy and performs the filesystem writes
 * through the service ports (`context.resources` + `context.undoCapture`).
 *
 * Boundary notes:
 * - Path/FS are injected ports; this module must not import host adapters.
 * - Content layout/merge policy lives in `shared/source-content`, not in the CLI.
 * - Registry/manifest writes are treated as part of the capability, not as
 *   incidental "metadata" helpers.
 */
import { module } from "./module";
import { resolveProviderContent as resolveServiceProviderContent } from "../../shared/source-content/helpers/provider-content";
import { deleteIfExists, syncFileWithConflictPolicy, syncSkillDirWithConflictPolicy } from "./helpers/destination-files";
import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
} from "./helpers/registry-codex";
import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
} from "./helpers/marketplace-claude";
import { pushItem, summarizeScannedContent } from "./helpers/sync-results";
import type { SyncTargetResult } from "./contract";

/**
 * Execution procedure for running provider-specific effective content through
 * each selected destination home.
 */
const runSync = module.runSync.handler(async ({ context, input }) => {
  const pathOps = context.resources.path;
  const targets: SyncTargetResult[] = [];
  const options = {
    dryRun: input.dryRun,
    force: input.force,
    gc: input.gc,
    includeAgentsInCodex: input.includeAgentsInCodex,
    includeAgentsInClaude: input.includeAgentsInClaude,
    undoCapture: input.dryRun ? undefined : context.undoCapture,
    resources: context.resources,
  };

  if (input.includeCodex) {
    const codexContent = await resolveServiceProviderContent({
      agent: "codex",
      sourcePlugin: input.sourcePlugin,
      base: input.content,
      resources: context.resources,
    });

    for (const codexHome of input.codexHomes) {
      const result: SyncTargetResult = { agent: "codex", home: codexHome, items: [], conflicts: [] };
      const promptsDir = pathOps.join(codexHome, "prompts");
      const skillsDir = pathOps.join(codexHome, "skills");
      const scriptsDir = pathOps.join(codexHome, "scripts");

      if (!options.dryRun) {
        await Promise.all([
          context.resources.files.ensureDir(promptsDir),
          context.resources.files.ensureDir(skillsDir),
          context.resources.files.ensureDir(scriptsDir),
          context.resources.files.ensureDir(pathOps.join(codexHome, "plugins")),
        ]);
      }

      const registry = await loadCodexRegistry(codexHome, context.resources);
      const claimedOthers = {
        prompts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.promptsByPlugin),
        skills: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.skillsByPlugin),
        scripts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.scriptsByPlugin),
      };

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
          destDir: pathOps.join(skillsDir, skill.name),
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

      if (options.gc) {
        const newPrompts = new Set(codexContent.workflowFiles.map((workflow) => workflow.name));
        const newSkills = new Set(codexContent.skills.map((skill) => skill.name));
        const newScripts = new Set(codexContent.scripts.map((script) => buildCodexScriptName(input.sourcePlugin.dirName, script.name)));

        for (const oldPrompt of registry.claimedSets.promptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
          if (newPrompts.has(oldPrompt) || claimedOthers.prompts.has(oldPrompt)) continue;
          await deleteIfExists({ target: pathOps.join(promptsDir, `${oldPrompt}.md`), kind: "workflow", options, result });
        }

        for (const oldSkill of registry.claimedSets.skillsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
          if (newSkills.has(oldSkill) || claimedOthers.skills.has(oldSkill)) continue;
          await deleteIfExists({ target: pathOps.join(skillsDir, oldSkill), kind: "skill", options, result });
        }

        for (const oldScript of registry.claimedSets.scriptsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
          if (newScripts.has(oldScript) || claimedOthers.scripts.has(oldScript)) continue;
          await deleteIfExists({ target: pathOps.join(scriptsDir, oldScript), kind: "script", options, result });
        }
      }

      if (!options.dryRun) {
        await options.undoCapture?.captureWriteTarget(registry.filePath);
      }
      const codexRegistry = await upsertCodexRegistry({
        codexHome,
        sourcePlugin: input.sourcePlugin,
        content: codexContent,
        dryRun: options.dryRun,
        existingData: registry.data,
        resources: context.resources,
      });
      if (codexRegistry.changed) {
        pushItem(result, {
          action: options.dryRun ? "planned" : "updated",
          kind: "metadata",
          target: codexRegistry.filePath,
          message: "registry upsert",
        });
      }

      targets.push(result);
    }
  }

  if (input.includeClaude) {
    const claudeContent = await resolveServiceProviderContent({
      agent: "claude",
      sourcePlugin: input.sourcePlugin,
      base: input.content,
      resources: context.resources,
    });

    for (const claudeHome of input.claudeHomes) {
      const result: SyncTargetResult = { agent: "claude", home: claudeHome, items: [], conflicts: [] };
      const pluginDir = pathOps.join(claudeHome, "plugins", input.sourcePlugin.dirName);
      const commandsDir = pathOps.join(pluginDir, "commands");
      const skillsDir = pathOps.join(pluginDir, "skills");
      const scriptsDir = pathOps.join(pluginDir, "scripts");
      const agentsDir = pathOps.join(pluginDir, "agents");

      if (!options.dryRun) {
        await Promise.all([
          context.resources.files.ensureDir(commandsDir),
          context.resources.files.ensureDir(skillsDir),
          context.resources.files.ensureDir(scriptsDir),
          context.resources.files.ensureDir(agentsDir),
        ]);
      }

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

      if (options.gc) {
        const previous = await readClaudeSyncManifest(claudeHome, input.sourcePlugin.dirName, context.resources);
        if (previous) {
          const currentWorkflow = new Set(claudeContent.workflowFiles.map((workflow) => workflow.name));
          const currentSkills = new Set(claudeContent.skills.map((skill) => skill.name));
          const currentScripts = new Set(claudeContent.scripts.map((script) => script.name));
          const currentAgents = new Set(claudeContent.agentFiles.map((agent) => agent.name));

          for (const oldWorkflow of previous.workflows) {
            if (currentWorkflow.has(oldWorkflow)) continue;
            await deleteIfExists({ target: pathOps.join(commandsDir, `${oldWorkflow}.md`), kind: "workflow", options, result });
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
              await deleteIfExists({ target: pathOps.join(agentsDir, `${oldAgent}.md`), kind: "agent", options, result });
            }
          }
        }
      }

      const pluginManifestPath = pathOps.join(claudeHome, "plugins", input.sourcePlugin.dirName, ".claude-plugin", "plugin.json");
      if (!options.dryRun) {
        await options.undoCapture?.captureWriteTarget(pluginManifestPath);
      }
      const pluginManifest = await upsertClaudePluginManifest({
        claudeLocalHome: claudeHome,
        sourcePlugin: input.sourcePlugin,
        dryRun: options.dryRun,
        resources: context.resources,
      });
      if (pluginManifest.changed) {
        pushItem(result, {
          action: options.dryRun ? "planned" : "updated",
          kind: "metadata",
          target: pluginManifest.filePath,
          message: "plugin.json upsert",
        });
      }

      const marketplacePath = pathOps.join(claudeHome, ".claude-plugin", "marketplace.json");
      if (!options.dryRun) {
        await options.undoCapture?.captureWriteTarget(marketplacePath);
      }
      const marketplace = await upsertClaudeMarketplace({
        claudeLocalHome: claudeHome,
        sourcePlugin: input.sourcePlugin,
        dryRun: options.dryRun,
        resources: context.resources,
      });
      if (marketplace.changed) {
        pushItem(result, {
          action: options.dryRun ? "planned" : "updated",
          kind: "metadata",
          target: marketplace.filePath,
          message: "marketplace upsert",
        });
      }

      const syncManifestPath = pathOps.join(claudeHome, "plugins", input.sourcePlugin.dirName, ".rawr-sync-manifest.json");
      if (!options.dryRun) {
        await options.undoCapture?.captureWriteTarget(syncManifestPath);
      }
      const syncManifest = await writeClaudeSyncManifest({
        claudeLocalHome: claudeHome,
        sourcePlugin: input.sourcePlugin,
        content: claudeContent,
        dryRun: options.dryRun,
        resources: context.resources,
      });
      if (syncManifest.changed) {
        pushItem(result, {
          action: options.dryRun ? "planned" : "updated",
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
});

/**
 * Read-only execution procedure that exposes source-content overlay policy
 * without granting the caller direct access to service internals.
 */
const resolveProviderContent = module.resolveProviderContent.handler(async ({ context, input }) => {
  return resolveServiceProviderContent({
    agent: input.agent,
    sourcePlugin: input.sourcePlugin,
    base: input.base,
    resources: context.resources,
  });
});

/**
 * Router export for agent destination sync execution.
 */
export const router = module.router({
  runSync,
  resolveProviderContent,
});
