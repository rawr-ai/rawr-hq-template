import fs from "node:fs/promises";
import path from "node:path";

import {
  copyDirTree,
  dirsIdentical,
  ensureDir,
  filesIdentical,
  pathExists,
  readJsonFile,
} from "./fs-utils";
import { effectiveContentForProvider } from "./effective-content";
import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
} from "./marketplace-claude";
import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
} from "./registry-codex";
import type {
  SourceContent,
  SourcePlugin,
  SyncAgent,
  SyncItemResult,
  SyncOptions,
  SyncRunResult,
  SyncTargetResult,
} from "./types";

type ClaimedOthers = {
  prompts: Set<string>;
  skills: Set<string>;
  scripts: Set<string>;
};

function pushItem(
  bucket: SyncTargetResult,
  item: Omit<SyncItemResult, "action"> & { action: SyncItemResult["action"] },
): void {
  const full: SyncItemResult = { ...item };
  bucket.items.push(full);
  if (full.action === "conflict") bucket.conflicts.push(full);
}

async function syncFileWithConflictPolicy(input: {
  src: string;
  dest: string;
  kind: SyncItemResult["kind"];
  dryRun: boolean;
  force: boolean;
  result: SyncTargetResult;
  claimedByOtherPlugin?: boolean;
  undoCapture?: SyncOptions["undoCapture"];
}): Promise<boolean> {
  const { src, dest, kind, dryRun, force, result, claimedByOtherPlugin, undoCapture } = input;
  const exists = await pathExists(dest);

  if (exists) {
    const same = await filesIdentical(src, dest);
    if (same) {
      pushItem(result, { action: "skipped", kind, source: src, target: dest, message: "identical" });
      return true;
    }

    if (!force) {
      pushItem(result, {
        action: "conflict",
        kind,
        source: src,
        target: dest,
        message: claimedByOtherPlugin ? "owned by another plugin" : "destination differs; use --force",
      });
      return false;
    }

    if (!dryRun) {
      await undoCapture?.captureWriteTarget(dest);
      await ensureDir(path.dirname(dest));
      await fs.copyFile(src, dest);
    }
    pushItem(result, { action: dryRun ? "planned" : "updated", kind, source: src, target: dest, message: "overwrote" });
    return true;
  }

  if (claimedByOtherPlugin && !force) {
    pushItem(result, {
      action: "conflict",
      kind,
      source: src,
      target: dest,
      message: "name claimed by another plugin",
    });
    return false;
  }

  if (!dryRun) {
    await undoCapture?.captureWriteTarget(dest);
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
  }
  pushItem(result, { action: dryRun ? "planned" : "copied", kind, source: src, target: dest });
  return true;
}

async function syncSkillDirWithConflictPolicy(input: {
  srcDir: string;
  destDir: string;
  skillName: string;
  dryRun: boolean;
  force: boolean;
  result: SyncTargetResult;
  claimedByOtherPlugin?: boolean;
  undoCapture?: SyncOptions["undoCapture"];
}): Promise<boolean> {
  const { srcDir, destDir, skillName, dryRun, force, result, claimedByOtherPlugin, undoCapture } = input;
  const exists = await pathExists(destDir);

  if (exists) {
    const same = await dirsIdentical(srcDir, destDir);
    if (same) {
      pushItem(result, { action: "skipped", kind: "skill", source: srcDir, target: destDir, message: "identical" });
      return true;
    }

    if (!force) {
      pushItem(result, {
        action: "conflict",
        kind: "skill",
        source: srcDir,
        target: destDir,
        message: claimedByOtherPlugin
          ? `skill '${skillName}' is owned by another plugin`
          : "skill directory differs; use --force",
      });
      return false;
    }

    if (!dryRun) {
      await undoCapture?.captureWriteTarget(destDir);
      await ensureDir(destDir);
      await copyDirTree(srcDir, destDir);
    }
    pushItem(result, {
      action: dryRun ? "planned" : "updated",
      kind: "skill",
      source: srcDir,
      target: destDir,
      message: "copied with force",
    });
    return true;
  }

  if (claimedByOtherPlugin && !force) {
    pushItem(result, {
      action: "conflict",
      kind: "skill",
      source: srcDir,
      target: destDir,
      message: `skill '${skillName}' is claimed by another plugin`,
    });
    return false;
  }

  if (!dryRun) {
    await undoCapture?.captureWriteTarget(destDir);
    await ensureDir(destDir);
    await copyDirTree(srcDir, destDir);
  }
  pushItem(result, { action: dryRun ? "planned" : "copied", kind: "skill", source: srcDir, target: destDir });
  return true;
}

async function deleteIfExists(input: {
  target: string;
  kind: SyncItemResult["kind"];
  dryRun: boolean;
  result: SyncTargetResult;
  undoCapture?: SyncOptions["undoCapture"];
}): Promise<void> {
  const { target, kind, dryRun, result, undoCapture } = input;
  if (!(await pathExists(target))) return;

  if (!dryRun) {
    await undoCapture?.captureDeleteTarget(target);
    const stat = await fs.stat(target);
    if (stat.isDirectory()) await fs.rm(target, { recursive: true, force: true });
    else await fs.rm(target, { force: true });
  }

  pushItem(result, { action: dryRun ? "planned" : "deleted", kind, target, message: "gc orphan" });
}

async function syncCodexTarget(input: {
  codexHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  options: SyncOptions;
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
    await Promise.all([ensureDir(promptsDir), ensureDir(skillsDir), ensureDir(scriptsDir), ensureDir(path.join(codexHome, "plugins"))]);
  }

  const registry = await loadCodexRegistry(codexHome);
  const claimedOthers: ClaimedOthers = {
    prompts: getClaimsFromOtherPlugins(sourcePlugin.dirName, registry.claimedSets.promptsByPlugin),
    skills: getClaimsFromOtherPlugins(sourcePlugin.dirName, registry.claimedSets.skillsByPlugin),
    scripts: getClaimsFromOtherPlugins(sourcePlugin.dirName, registry.claimedSets.scriptsByPlugin),
  };

  for (const workflow of content.workflowFiles) {
    const target = path.join(promptsDir, `${workflow.name}.md`);
    await syncFileWithConflictPolicy({
      src: workflow.absPath,
      dest: target,
      kind: "workflow",
      dryRun: options.dryRun,
      force: options.force,
      result,
      claimedByOtherPlugin: claimedOthers.prompts.has(workflow.name),
      undoCapture: options.undoCapture,
    });
  }

  for (const skill of content.skills) {
    const target = path.join(skillsDir, skill.name);
    await syncSkillDirWithConflictPolicy({
      srcDir: skill.absPath,
      destDir: target,
      skillName: skill.name,
      dryRun: options.dryRun,
      force: options.force,
      result,
      claimedByOtherPlugin: claimedOthers.skills.has(skill.name),
      undoCapture: options.undoCapture,
    });
  }

  for (const script of content.scripts) {
    const scriptName = buildCodexScriptName(sourcePlugin.dirName, script.name);
    const target = path.join(scriptsDir, scriptName);
    await syncFileWithConflictPolicy({
      src: script.absPath,
      dest: target,
      kind: "script",
      dryRun: options.dryRun,
      force: options.force,
      result,
      claimedByOtherPlugin: claimedOthers.scripts.has(scriptName),
      undoCapture: options.undoCapture,
    });
  }

  const oldOwnedPrompts = registry.claimedSets.promptsByPlugin[sourcePlugin.dirName] ?? new Set<string>();
  const oldOwnedSkills = registry.claimedSets.skillsByPlugin[sourcePlugin.dirName] ?? new Set<string>();
  const oldOwnedScripts = registry.claimedSets.scriptsByPlugin[sourcePlugin.dirName] ?? new Set<string>();

  if (options.gc) {
    const newPrompts = new Set(content.workflowFiles.map((w) => w.name));
    const newSkills = new Set(content.skills.map((s) => s.name));
    const newScripts = new Set(content.scripts.map((s) => buildCodexScriptName(sourcePlugin.dirName, s.name)));

    for (const oldPrompt of oldOwnedPrompts) {
      if (newPrompts.has(oldPrompt)) continue;
      if (claimedOthers.prompts.has(oldPrompt)) continue;
      await deleteIfExists({
        target: path.join(promptsDir, `${oldPrompt}.md`),
        kind: "workflow",
        dryRun: options.dryRun,
        result,
        undoCapture: options.undoCapture,
      });
    }

    for (const oldSkill of oldOwnedSkills) {
      if (newSkills.has(oldSkill)) continue;
      if (claimedOthers.skills.has(oldSkill)) continue;
      await deleteIfExists({
        target: path.join(skillsDir, oldSkill),
        kind: "skill",
        dryRun: options.dryRun,
        result,
        undoCapture: options.undoCapture,
      });
    }

    for (const oldScript of oldOwnedScripts) {
      if (newScripts.has(oldScript)) continue;
      if (claimedOthers.scripts.has(oldScript)) continue;
      await deleteIfExists({
        target: path.join(scriptsDir, oldScript),
        kind: "script",
        dryRun: options.dryRun,
        result,
        undoCapture: options.undoCapture,
      });
    }
  }

  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(path.join(codexHome, "plugins", "registry.json"));
  }
  const codexRegistry = await upsertCodexRegistry({
    codexHome,
    sourcePlugin,
    content,
    dryRun: options.dryRun,
    existingData: registry.data,
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

async function syncClaudeTarget(input: {
  claudeLocalHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  options: SyncOptions;
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
    await Promise.all([ensureDir(commandsDir), ensureDir(skillsDir), ensureDir(scriptsDir), ensureDir(agentsDir)]);
  }

  for (const workflow of content.workflowFiles) {
    const target = path.join(commandsDir, `${workflow.name}.md`);
    await syncFileWithConflictPolicy({
      src: workflow.absPath,
      dest: target,
      kind: "workflow",
      dryRun: options.dryRun,
      force: options.force,
      result,
      undoCapture: options.undoCapture,
    });
  }

  for (const skill of content.skills) {
    const target = path.join(skillsDir, skill.name);
    await syncSkillDirWithConflictPolicy({
      srcDir: skill.absPath,
      destDir: target,
      skillName: skill.name,
      dryRun: options.dryRun,
      force: options.force,
      result,
      undoCapture: options.undoCapture,
    });
  }

  for (const script of content.scripts) {
    const target = path.join(scriptsDir, script.name);
    await syncFileWithConflictPolicy({
      src: script.absPath,
      dest: target,
      kind: "script",
      dryRun: options.dryRun,
      force: options.force,
      result,
      undoCapture: options.undoCapture,
    });
  }

  const includeAgentsInClaude = options.includeAgentsInClaude ?? true;
  if (includeAgentsInClaude) {
    for (const agent of content.agentFiles) {
      const target = path.join(agentsDir, `${agent.name}.md`);
      await syncFileWithConflictPolicy({
        src: agent.absPath,
        dest: target,
        kind: "agent",
        dryRun: options.dryRun,
        force: options.force,
        result,
      });
    }
  }

  if (options.gc) {
    const previous = await readClaudeSyncManifest(claudeLocalHome, sourcePlugin.dirName);
    if (previous) {
      const currentWorkflow = new Set(content.workflowFiles.map((w) => w.name));
      const currentSkills = new Set(content.skills.map((s) => s.name));
      const currentScripts = new Set(content.scripts.map((s) => s.name));
      const currentAgents = new Set(content.agentFiles.map((a) => a.name));

      for (const oldWorkflow of previous.workflows) {
        if (currentWorkflow.has(oldWorkflow)) continue;
        await deleteIfExists({
          target: path.join(commandsDir, `${oldWorkflow}.md`),
        kind: "workflow",
        dryRun: options.dryRun,
        result,
        undoCapture: options.undoCapture,
      });
      }

      for (const oldSkill of previous.skills) {
        if (currentSkills.has(oldSkill)) continue;
        await deleteIfExists({
          target: path.join(skillsDir, oldSkill),
        kind: "skill",
        dryRun: options.dryRun,
        result,
        undoCapture: options.undoCapture,
      });
      }

      for (const oldScript of previous.scripts) {
        if (currentScripts.has(oldScript)) continue;
        await deleteIfExists({
          target: path.join(scriptsDir, oldScript),
        kind: "script",
        dryRun: options.dryRun,
        result,
        undoCapture: options.undoCapture,
      });
      }

      if (includeAgentsInClaude) {
        for (const oldAgent of previous.agents ?? []) {
          if (currentAgents.has(oldAgent)) continue;
          await deleteIfExists({
            target: path.join(agentsDir, `${oldAgent}.md`),
            kind: "agent",
            dryRun: options.dryRun,
            result,
            undoCapture: options.undoCapture,
          });
        }
      }
    }
  }

  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(
      path.join(claudeLocalHome, "plugins", sourcePlugin.dirName, ".claude-plugin", "plugin.json"),
    );
  }
  const pluginManifest = await upsertClaudePluginManifest({
    claudeLocalHome,
    sourcePlugin,
    dryRun: options.dryRun,
  });
  if (pluginManifest.changed) {
    pushItem(result, {
      action: options.dryRun ? "planned" : "updated",
      kind: "metadata",
      target: pluginManifest.filePath,
      message: "plugin.json upsert",
    });
  }

  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(path.join(claudeLocalHome, ".claude-plugin", "marketplace.json"));
  }
  const marketplace = await upsertClaudeMarketplace({
    claudeLocalHome,
    sourcePlugin,
    dryRun: options.dryRun,
  });
  if (marketplace.changed) {
    pushItem(result, {
      action: options.dryRun ? "planned" : "updated",
      kind: "metadata",
      target: marketplace.filePath,
      message: "marketplace upsert",
    });
  }

  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(
      path.join(claudeLocalHome, "plugins", sourcePlugin.dirName, ".rawr-sync-manifest.json"),
    );
  }
  const syncManifest = await writeClaudeSyncManifest({
    claudeLocalHome,
    sourcePlugin,
    content,
    dryRun: options.dryRun,
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

export async function runSync(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  options: SyncOptions;
  codexHomes: string[];
  claudeHomes: string[];
  includeCodex: boolean;
  includeClaude: boolean;
}): Promise<SyncRunResult> {
  const { sourcePlugin, content, options, codexHomes, claudeHomes, includeCodex, includeClaude } = input;
  const targets: SyncTargetResult[] = [];

  if (includeCodex) {
    const codexContent = await effectiveContentForProvider({ agent: "codex", sourcePlugin, base: content });
    for (const codexHome of codexHomes) {
      targets.push(await syncCodexTarget({ codexHome, sourcePlugin, content: codexContent, options }));
    }
  }

  if (includeClaude) {
    const claudeContent = await effectiveContentForProvider({ agent: "claude", sourcePlugin, base: content });
    for (const claudeHome of claudeHomes) {
      targets.push(await syncClaudeTarget({ claudeLocalHome: claudeHome, sourcePlugin, content: claudeContent, options }));
    }
  }

  const ok = targets.every((target) => target.conflicts.length === 0);

  return {
    ok,
    sourcePlugin,
    scanned: {
      workflows: content.workflowFiles.map((w) => w.name),
      skills: content.skills.map((s) => s.name),
      scripts: content.scripts.map((s) => s.name),
      agents: content.agentFiles.map((a) => a.name),
    },
    targets,
  };
}

export async function loadCodexRegistryForTests(codexHome: string): Promise<unknown> {
  return readJsonFile(path.join(codexHome, "plugins", "registry.json"));
}
