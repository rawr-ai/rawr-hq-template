import type { SourceContent, SourcePlugin } from "../../../shared/entities";
import type { SyncTargetResult } from "../../../shared/entities/sync-results";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../../shared/resources";
import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
} from "../../../shared/repositories/claude-marketplace-repository";
import {
  deleteIfExists,
  syncFileWithConflictPolicy,
  syncSkillDirWithConflictPolicy,
} from "../../../shared/repositories/destination-sync-repository";
import { pushItem } from "../../../shared/helpers/sync-results";

type DestinationSyncOptions = {
  dryRun: boolean;
  force: boolean;
  gc: boolean;
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  undoCapture?: AgentConfigSyncUndoCapture;
  resources: AgentConfigSyncResources;
};

export async function syncClaudeHomes(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  claudeHomes: string[];
  options: DestinationSyncOptions;
}): Promise<SyncTargetResult[]> {
  const pathOps = input.options.resources.path;
  const targets: SyncTargetResult[] = [];

  for (const claudeHome of input.claudeHomes) {
    const result: SyncTargetResult = { agent: "claude", home: claudeHome, items: [], conflicts: [] };
    const pluginDir = pathOps.join(claudeHome, "plugins", input.sourcePlugin.dirName);
    const commandsDir = pathOps.join(pluginDir, "commands");
    const skillsDir = pathOps.join(pluginDir, "skills");
    const scriptsDir = pathOps.join(pluginDir, "scripts");
    const agentsDir = pathOps.join(pluginDir, "agents");

    if (!input.options.dryRun) {
      await Promise.all([
        input.options.resources.files.ensureDir(commandsDir),
        input.options.resources.files.ensureDir(skillsDir),
        input.options.resources.files.ensureDir(scriptsDir),
        input.options.resources.files.ensureDir(agentsDir),
      ]);
    }

    for (const workflow of input.content.workflowFiles) {
      await syncFileWithConflictPolicy({
        src: workflow.absPath,
        dest: pathOps.join(commandsDir, `${workflow.name}.md`),
        kind: "workflow",
        options: input.options,
        result,
      });
    }

    for (const skill of input.content.skills) {
      await syncSkillDirWithConflictPolicy({
        srcDir: skill.absPath,
        destDir: pathOps.join(skillsDir, skill.name),
        skillName: skill.name,
        options: input.options,
        result,
      });
    }

    for (const script of input.content.scripts) {
      await syncFileWithConflictPolicy({
        src: script.absPath,
        dest: pathOps.join(scriptsDir, script.name),
        kind: "script",
        options: input.options,
        result,
      });
    }

    const includeAgentsInClaude = input.options.includeAgentsInClaude ?? true;
    if (includeAgentsInClaude) {
      for (const agent of input.content.agentFiles) {
        await syncFileWithConflictPolicy({
          src: agent.absPath,
          dest: pathOps.join(agentsDir, `${agent.name}.md`),
          kind: "agent",
          options: input.options,
          result,
        });
      }
    }

    if (input.options.gc) {
      const previous = await readClaudeSyncManifest(claudeHome, input.sourcePlugin.dirName, input.options.resources);
      if (previous) {
        const currentWorkflow = new Set(input.content.workflowFiles.map((workflow) => workflow.name));
        const currentSkills = new Set(input.content.skills.map((skill) => skill.name));
        const currentScripts = new Set(input.content.scripts.map((script) => script.name));
        const currentAgents = new Set(input.content.agentFiles.map((agent) => agent.name));

        for (const oldWorkflow of previous.workflows) {
          if (currentWorkflow.has(oldWorkflow)) continue;
          await deleteIfExists({
            target: pathOps.join(commandsDir, `${oldWorkflow}.md`),
            kind: "workflow",
            options: input.options,
            result,
          });
        }

        for (const oldSkill of previous.skills) {
          if (currentSkills.has(oldSkill)) continue;
          await deleteIfExists({ target: pathOps.join(skillsDir, oldSkill), kind: "skill", options: input.options, result });
        }

        for (const oldScript of previous.scripts) {
          if (currentScripts.has(oldScript)) continue;
          await deleteIfExists({
            target: pathOps.join(scriptsDir, oldScript),
            kind: "script",
            options: input.options,
            result,
          });
        }

        if (includeAgentsInClaude) {
          for (const oldAgent of previous.agents ?? []) {
            if (currentAgents.has(oldAgent)) continue;
            await deleteIfExists({
              target: pathOps.join(agentsDir, `${oldAgent}.md`),
              kind: "workflow",
              options: input.options,
              result,
            });
          }
        }
      }
    }

    if (!input.options.dryRun) {
      const pluginManifestTarget = pathOps.join(claudeHome, "plugins", input.sourcePlugin.dirName, "plugin.json");
      const marketplaceTarget = pathOps.join(claudeHome, ".claude-plugin", "marketplace.json");
      const syncManifestTarget = pathOps.join(claudeHome, "plugins", input.sourcePlugin.dirName, "sync-manifest.json");

      await Promise.all([
        input.options.undoCapture?.captureWriteTarget(marketplaceTarget),
        input.options.undoCapture?.captureWriteTarget(pluginManifestTarget),
        input.options.undoCapture?.captureWriteTarget(syncManifestTarget),
      ]);
    }

    const pluginManifest = await upsertClaudePluginManifest({
      claudeLocalHome: claudeHome,
      sourcePlugin: input.sourcePlugin,
      dryRun: input.options.dryRun,
      resources: input.options.resources,
    });
    if (pluginManifest.changed) {
      pushItem(result, {
        action: input.options.dryRun ? "planned" : "updated",
        kind: "metadata",
        target: pluginManifest.filePath,
        message: "plugin.json upsert",
      });
    }

    const marketplace = await upsertClaudeMarketplace({
      claudeLocalHome: claudeHome,
      sourcePlugin: input.sourcePlugin,
      dryRun: input.options.dryRun,
      resources: input.options.resources,
    });
    if (marketplace.changed) {
      pushItem(result, {
        action: input.options.dryRun ? "planned" : "updated",
        kind: "metadata",
        target: marketplace.filePath,
        message: "marketplace upsert",
      });
    }

    const syncManifest = await writeClaudeSyncManifest({
      claudeLocalHome: claudeHome,
      sourcePlugin: input.sourcePlugin,
      content: input.content,
      dryRun: input.options.dryRun,
      resources: input.options.resources,
    });
    if (syncManifest.changed) {
      pushItem(result, {
        action: input.options.dryRun ? "planned" : "updated",
        kind: "metadata",
        target: syncManifest.filePath,
        message: "sync manifest upsert",
      });
    }

    targets.push(result);
  }

  return targets;
}
