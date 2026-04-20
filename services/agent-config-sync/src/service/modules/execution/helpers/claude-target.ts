import path from "node:path";

import type { SourceContent, SourcePlugin } from "../../../shared/schemas";
import type { SyncTargetResult } from "../contract";
import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
} from "../marketplace-claude";
import { deleteIfExists, type SyncFileOptions, syncFileWithConflictPolicy, syncSkillDirWithConflictPolicy } from "./destination-files";
import { pushItem } from "./sync-results";

export async function syncClaudeTarget(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  options: SyncFileOptions & {
    gc: boolean;
    includeAgentsInClaude?: boolean;
  };
}): Promise<SyncTargetResult> {
  const { claudeLocalHome, sourcePlugin, content, options } = input;
  const result: SyncTargetResult = {
    agent: "claude",
    home: claudeLocalHome,
    items: [],
    conflicts: [],
  };

  const pluginDir = path.join(claudeLocalHome, "plugins", sourcePlugin.dirName);
  const commandsDir = path.join(pluginDir, "commands");
  const skillsDir = path.join(pluginDir, "skills");
  const scriptsDir = path.join(pluginDir, "scripts");
  const agentsDir = path.join(pluginDir, "agents");

  if (!options.dryRun) {
    await Promise.all([
      options.resources.files.ensureDir(commandsDir),
      options.resources.files.ensureDir(skillsDir),
      options.resources.files.ensureDir(scriptsDir),
      options.resources.files.ensureDir(agentsDir),
    ]);
  }

  for (const workflow of content.workflowFiles) {
    await syncFileWithConflictPolicy({
      src: workflow.absPath,
      dest: path.join(commandsDir, `${workflow.name}.md`),
      kind: "workflow",
      options,
      result,
    });
  }

  for (const skill of content.skills) {
    await syncSkillDirWithConflictPolicy({
      srcDir: skill.absPath,
      destDir: path.join(skillsDir, skill.name),
      skillName: skill.name,
      options,
      result,
    });
  }

  for (const script of content.scripts) {
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
    for (const agent of content.agentFiles) {
      await syncFileWithConflictPolicy({
        src: agent.absPath,
        dest: path.join(agentsDir, `${agent.name}.md`),
        kind: "agent",
        options,
        result,
      });
    }
  }

  if (options.gc) {
    const previous = await readClaudeSyncManifest(claudeLocalHome, sourcePlugin.dirName, options.resources);
    if (previous) {
      const currentWorkflow = new Set(content.workflowFiles.map((workflow) => workflow.name));
      const currentSkills = new Set(content.skills.map((skill) => skill.name));
      const currentScripts = new Set(content.scripts.map((script) => script.name));
      const currentAgents = new Set(content.agentFiles.map((agent) => agent.name));

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
  }

  const pluginManifestPath = path.join(claudeLocalHome, "plugins", sourcePlugin.dirName, ".claude-plugin", "plugin.json");
  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(pluginManifestPath);
  }
  const pluginManifest = await upsertClaudePluginManifest({
    claudeLocalHome,
    sourcePlugin,
    dryRun: options.dryRun,
    resources: options.resources,
  });
  if (pluginManifest.changed) {
    pushItem(result, {
      action: options.dryRun ? "planned" : "updated",
      kind: "metadata",
      target: pluginManifest.filePath,
      message: "plugin.json upsert",
    });
  }

  const marketplacePath = path.join(claudeLocalHome, ".claude-plugin", "marketplace.json");
  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(marketplacePath);
  }
  const marketplace = await upsertClaudeMarketplace({
    claudeLocalHome,
    sourcePlugin,
    dryRun: options.dryRun,
    resources: options.resources,
  });
  if (marketplace.changed) {
    pushItem(result, {
      action: options.dryRun ? "planned" : "updated",
      kind: "metadata",
      target: marketplace.filePath,
      message: "marketplace upsert",
    });
  }

  const syncManifestPath = path.join(claudeLocalHome, "plugins", sourcePlugin.dirName, ".rawr-sync-manifest.json");
  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(syncManifestPath);
  }
  const syncManifest = await writeClaudeSyncManifest({
    claudeLocalHome,
    sourcePlugin,
    content,
    dryRun: options.dryRun,
    resources: options.resources,
  });
  if (syncManifest.changed) {
    pushItem(result, {
      action: options.dryRun ? "planned" : "updated",
      kind: "metadata",
      target: syncManifest.filePath,
      message: "sync manifest upsert",
    });
  }

  return result;
}
