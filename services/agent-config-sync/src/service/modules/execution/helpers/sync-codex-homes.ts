import type { SourceContent, SourcePlugin } from "../../../shared/entities";
import type { SyncTargetResult } from "../../../shared/entities/sync-results";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../../shared/resources";
import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
} from "../../../shared/repositories/codex-registry-repository";
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
    const skillsDir = pathOps.join(codexHome, "skills");
    const scriptsDir = pathOps.join(codexHome, "scripts");

    if (!input.options.dryRun) {
      await Promise.all([
        input.options.resources.files.ensureDir(promptsDir),
        input.options.resources.files.ensureDir(skillsDir),
        input.options.resources.files.ensureDir(scriptsDir),
        input.options.resources.files.ensureDir(pathOps.join(codexHome, "plugins")),
      ]);
    }

    const registry = await loadCodexRegistry(codexHome, input.options.resources);
    const claimedOthers = {
      prompts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.promptsByPlugin),
      skills: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.skillsByPlugin),
      scripts: getClaimsFromOtherPlugins(input.sourcePlugin.dirName, registry.claimedSets.scriptsByPlugin),
    };

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
        destDir: pathOps.join(skillsDir, skill.name),
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

    if (input.options.gc) {
      const newPrompts = new Set(input.content.workflowFiles.map((workflow) => workflow.name));
      const newSkills = new Set(input.content.skills.map((skill) => skill.name));
      const newScripts = new Set(
        input.content.scripts.map((script) => buildCodexScriptName(input.sourcePlugin.dirName, script.name)),
      );

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
        if (newSkills.has(oldSkill) || claimedOthers.skills.has(oldSkill)) continue;
        await deleteIfExists({ target: pathOps.join(skillsDir, oldSkill), kind: "skill", options: input.options, result });
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
    }

    if (!input.options.dryRun) {
      await input.options.undoCapture?.captureWriteTarget(registry.filePath);
    }
    const codexRegistry = await upsertCodexRegistry({
      codexHome,
      sourcePlugin: input.sourcePlugin,
      content: input.content,
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
