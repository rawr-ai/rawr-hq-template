import path from "node:path";

import type { SourceContent, SourcePlugin } from "../../../shared/schemas";
import type { SyncTargetResult } from "../contract";
import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
} from "../registry-codex";
import { deleteIfExists, type SyncFileOptions, syncFileWithConflictPolicy, syncSkillDirWithConflictPolicy } from "./destination-files";
import { pushItem } from "./sync-results";

export async function syncCodexTarget(input: {
  codexHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  options: SyncFileOptions & { gc: boolean };
}): Promise<SyncTargetResult> {
  const { codexHome, sourcePlugin, content, options } = input;
  const result: SyncTargetResult = {
    agent: "codex",
    home: codexHome,
    items: [],
    conflicts: [],
  };

  const promptsDir = path.join(codexHome, "prompts");
  const skillsDir = path.join(codexHome, "skills");
  const scriptsDir = path.join(codexHome, "scripts");

  if (!options.dryRun) {
    await Promise.all([
      options.resources.files.ensureDir(promptsDir),
      options.resources.files.ensureDir(skillsDir),
      options.resources.files.ensureDir(scriptsDir),
      options.resources.files.ensureDir(path.join(codexHome, "plugins")),
    ]);
  }

  const registry = await loadCodexRegistry(codexHome, options.resources);
  const claimedOthers = {
    prompts: getClaimsFromOtherPlugins(sourcePlugin.dirName, registry.claimedSets.promptsByPlugin),
    skills: getClaimsFromOtherPlugins(sourcePlugin.dirName, registry.claimedSets.skillsByPlugin),
    scripts: getClaimsFromOtherPlugins(sourcePlugin.dirName, registry.claimedSets.scriptsByPlugin),
  };

  for (const workflow of content.workflowFiles) {
    await syncFileWithConflictPolicy({
      src: workflow.absPath,
      dest: path.join(promptsDir, `${workflow.name}.md`),
      kind: "workflow",
      options,
      result,
      claimedByOtherPlugin: claimedOthers.prompts.has(workflow.name),
    });
  }

  for (const skill of content.skills) {
    await syncSkillDirWithConflictPolicy({
      srcDir: skill.absPath,
      destDir: path.join(skillsDir, skill.name),
      skillName: skill.name,
      options,
      result,
      claimedByOtherPlugin: claimedOthers.skills.has(skill.name),
    });
  }

  for (const script of content.scripts) {
    const scriptName = buildCodexScriptName(sourcePlugin.dirName, script.name);
    await syncFileWithConflictPolicy({
      src: script.absPath,
      dest: path.join(scriptsDir, scriptName),
      kind: "script",
      options,
      result,
      claimedByOtherPlugin: claimedOthers.scripts.has(scriptName),
    });
  }

  if (options.gc) {
    const newPrompts = new Set(content.workflowFiles.map((workflow) => workflow.name));
    const newSkills = new Set(content.skills.map((skill) => skill.name));
    const newScripts = new Set(content.scripts.map((script) => buildCodexScriptName(sourcePlugin.dirName, script.name)));

    for (const oldPrompt of registry.claimedSets.promptsByPlugin[sourcePlugin.dirName] ?? new Set<string>()) {
      if (newPrompts.has(oldPrompt) || claimedOthers.prompts.has(oldPrompt)) continue;
      await deleteIfExists({ target: path.join(promptsDir, `${oldPrompt}.md`), kind: "workflow", options, result });
    }

    for (const oldSkill of registry.claimedSets.skillsByPlugin[sourcePlugin.dirName] ?? new Set<string>()) {
      if (newSkills.has(oldSkill) || claimedOthers.skills.has(oldSkill)) continue;
      await deleteIfExists({ target: path.join(skillsDir, oldSkill), kind: "skill", options, result });
    }

    for (const oldScript of registry.claimedSets.scriptsByPlugin[sourcePlugin.dirName] ?? new Set<string>()) {
      if (newScripts.has(oldScript) || claimedOthers.scripts.has(oldScript)) continue;
      await deleteIfExists({ target: path.join(scriptsDir, oldScript), kind: "script", options, result });
    }
  }

  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(registry.filePath);
  }
  const codexRegistry = await upsertCodexRegistry({
    codexHome,
    sourcePlugin,
    content,
    dryRun: options.dryRun,
    existingData: registry.data,
    resources: options.resources,
  });
  if (codexRegistry.changed) {
    pushItem(result, {
      action: options.dryRun ? "planned" : "updated",
      kind: "metadata",
      target: codexRegistry.filePath,
      message: "registry upsert",
    });
  }

  return result;
}
