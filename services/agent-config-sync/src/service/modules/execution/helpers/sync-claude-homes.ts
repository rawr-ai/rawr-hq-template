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
  syncTextWithConflictPolicy,
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
    const hooksDir = pathOps.join(pluginDir, "hooks");
    const mcpDir = pathOps.join(pluginDir, "mcp");
    const settingsDir = pathOps.join(pluginDir, "settings");
    const assetsDir = pathOps.join(pluginDir, "assets");

    if (!input.options.dryRun) {
      await Promise.all([
        input.options.resources.files.ensureDir(commandsDir),
        input.options.resources.files.ensureDir(skillsDir),
        input.options.resources.files.ensureDir(scriptsDir),
        input.options.resources.files.ensureDir(agentsDir),
        input.options.resources.files.ensureDir(hooksDir),
        input.options.resources.files.ensureDir(mcpDir),
        input.options.resources.files.ensureDir(settingsDir),
        input.options.resources.files.ensureDir(assetsDir),
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

    for (const hook of input.content.hooks ?? []) {
      await syncFileWithConflictPolicy({
        src: hook.absPath,
        dest: pathOps.join(hooksDir, hook.name),
        kind: "hook",
        options: input.options,
        result,
      });
    }

    const hookConfig = await buildClaudeHooksConfig({
      content: input.content,
      resources: input.options.resources,
    });
    if (hookConfig) {
      await syncTextWithConflictPolicy({
        content: hookConfig.content,
        source: hookConfig.source,
        dest: pathOps.join(hooksDir, "hooks.json"),
        kind: "hook",
        options: input.options,
        result,
      });
    }

    const mcpConfig = await buildClaudeMcpConfig({
      mcpDir,
      mcpServers: input.content.mcpServers ?? [],
      resources: input.options.resources,
    });
    if (mcpConfig) {
      await syncTextWithConflictPolicy({
        content: mcpConfig.content,
        source: mcpConfig.source,
        dest: pathOps.join(pluginDir, ".mcp.json"),
        kind: "mcp",
        options: input.options,
        result,
      });
    }

    for (const mcpServer of (input.content.mcpServers ?? []).filter((server) => pathOps.basename(server.name) !== ".mcp.json")) {
      await syncFileWithConflictPolicy({
        src: mcpServer.absPath,
        dest: pathOps.join(mcpDir, mcpServer.name),
        kind: "mcp",
        options: input.options,
        result,
      });
    }

    for (const setting of input.content.settings ?? []) {
      const dest = pathOps.basename(setting.name) === "settings.json"
        ? pathOps.join(pluginDir, "settings.json")
        : pathOps.join(settingsDir, setting.name);
      await syncFileWithConflictPolicy({
        src: setting.absPath,
        dest,
        kind: "settings",
        options: input.options,
        result,
      });
    }

    for (const asset of input.content.assets ?? []) {
      await syncFileWithConflictPolicy({
        src: asset.absPath,
        dest: pathOps.join(assetsDir, asset.name),
        kind: "asset",
        options: input.options,
        result,
      });
    }

    if (input.options.gc) {
      const previous = await readClaudeSyncManifest(claudeHome, input.sourcePlugin.dirName, input.options.resources);
      if (previous) {
        const currentWorkflow = new Set(input.content.workflowFiles.map((workflow) => workflow.name));
        const currentSkills = new Set(input.content.skills.map((skill) => skill.name));
        const currentScripts = new Set(input.content.scripts.map((script) => script.name));
        const currentAgents = new Set(input.content.agentFiles.map((agent) => agent.name));
        const currentHooks = new Set((input.content.hooks ?? []).map((hook) => hook.name));
        const currentMcpServers = new Set((input.content.mcpServers ?? []).map((server) => server.name));
        const currentSettings = new Set((input.content.settings ?? []).map((setting) => setting.name));
        const currentAssets = new Set((input.content.assets ?? []).map((asset) => asset.name));

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
              kind: "agent",
              options: input.options,
              result,
            });
          }
        }

        for (const oldHook of previous.hooks ?? []) {
          if (currentHooks.has(oldHook)) continue;
          await deleteIfExists({
            target: pathOps.join(hooksDir, oldHook),
            kind: "hook",
            options: input.options,
            result,
          });
        }

        if ((previous.hookConfigs ?? []).length > 0 && (input.content.hookConfigs ?? []).length === 0) {
          await deleteIfExists({
            target: pathOps.join(hooksDir, "hooks.json"),
            kind: "hook",
            options: input.options,
            result,
          });
        }

        for (const oldMcpServer of previous.mcpServers ?? []) {
          if (currentMcpServers.has(oldMcpServer)) continue;
          if (oldMcpServer === ".mcp.json") {
            await deleteIfExists({
              target: pathOps.join(pluginDir, ".mcp.json"),
              kind: "mcp",
              options: input.options,
              result,
            });
            continue;
          }
          await deleteIfExists({
            target: pathOps.join(mcpDir, oldMcpServer),
            kind: "mcp",
            options: input.options,
            result,
          });
        }

        if ((previous.mcpServers ?? []).length > 0 && (input.content.mcpServers ?? []).length === 0) {
          await deleteIfExists({
            target: pathOps.join(pluginDir, ".mcp.json"),
            kind: "mcp",
            options: input.options,
            result,
          });
        }

        for (const oldSetting of previous.settings ?? []) {
          if (currentSettings.has(oldSetting)) continue;
          await deleteIfExists({
            target: pathOps.basename(oldSetting) === "settings.json"
              ? pathOps.join(pluginDir, "settings.json")
              : pathOps.join(settingsDir, oldSetting),
            kind: "settings",
            options: input.options,
            result,
          });
        }

        for (const oldAsset of previous.assets ?? []) {
          if (currentAssets.has(oldAsset)) continue;
          await deleteIfExists({
            target: pathOps.join(assetsDir, oldAsset),
            kind: "asset",
            options: input.options,
            result,
          });
        }
      }
    }

    if (!input.options.dryRun) {
      const pluginManifestTarget = pathOps.join(
        claudeHome,
        "plugins",
        input.sourcePlugin.dirName,
        ".claude-plugin",
        "plugin.json",
      );
      const marketplaceTarget = pathOps.join(claudeHome, ".claude-plugin", "marketplace.json");
      const syncManifestTarget = pathOps.join(
        claudeHome,
        "plugins",
        input.sourcePlugin.dirName,
        ".rawr-sync-manifest.json",
      );

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
      content: input.content,
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

async function buildClaudeHooksConfig(input: {
  content: SourceContent;
  resources: AgentConfigSyncResources;
}): Promise<{ content: string; source: string } | null> {
  const firstConfig = input.content.hookConfigs?.[0];
  if (!firstConfig) return null;
  const parsed = await input.resources.files.readJsonFile<Record<string, unknown>>(firstConfig.absPath);
  if (!parsed) return null;
  const hookNames = new Set((input.content.hooks ?? []).map((hook) => hook.name));
  const rewritten = rewriteJsonStrings(parsed, (value) => rewriteClaudePluginRootHookCommand(value, hookNames));
  return {
    source: firstConfig.absPath,
    content: `${JSON.stringify(rewritten, null, 2)}\n`,
  };
}

async function buildClaudeMcpConfig(input: {
  mcpDir: string;
  mcpServers: Array<{ name: string; absPath: string }>;
  resources: AgentConfigSyncResources;
}): Promise<{ content: string; source: string } | null> {
  const directConfig = input.mcpServers.find((server) => input.resources.path.basename(server.name) === ".mcp.json");
  if (directConfig) {
    const raw = await input.resources.files.readTextFile(directConfig.absPath);
    return raw === null ? null : { source: directConfig.absPath, content: raw.endsWith("\n") ? raw : `${raw}\n` };
  }

  const servers = input.mcpServers.filter((server) => input.resources.path.basename(server.name) !== ".mcp.json");
  if (servers.length === 0) return null;

  const mcpServers: Record<string, { command: string; args: string[] }> = {};
  for (const server of servers) {
    mcpServers[normalizeComponentName(server.name)] = {
      command: commandForExecutable(server.name),
      args: [`\${CLAUDE_PLUGIN_ROOT}/mcp/${server.name}`],
    };
  }
  return {
    source: input.mcpDir,
    content: `${JSON.stringify({ mcpServers }, null, 2)}\n`,
  };
}

function rewriteClaudePluginRootHookCommand(value: string, hookNames: Set<string>): string {
  for (const hookName of hookNames) {
    const escaped = escapeRegExp(hookName);
    const patterns = [
      new RegExp(`(^|\\s)\\.\\/hooks\\/${escaped}(?=$|\\s)`, "g"),
      new RegExp(`(^|\\s)hooks\\/${escaped}(?=$|\\s)`, "g"),
      new RegExp(`(^|\\s)\\.\\/${escaped}(?=$|\\s)`, "g"),
    ];
    let next = value;
    for (const pattern of patterns) {
      next = next.replace(pattern, (_match, prefix: string) => `${prefix}\${CLAUDE_PLUGIN_ROOT}/hooks/${hookName}`);
    }
    value = next;
  }
  return value;
}

function rewriteJsonStrings(value: unknown, rewrite: (value: string) => string): unknown {
  if (typeof value === "string") return rewrite(value);
  if (Array.isArray(value)) return value.map((item) => rewriteJsonStrings(item, rewrite));
  if (!value || typeof value !== "object") return value;

  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    next[key] = rewriteJsonStrings(child, rewrite);
  }
  return next;
}

function normalizeComponentName(name: string): string {
  return name.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-") || "server";
}

function commandForExecutable(name: string): string {
  const ext = name.slice(name.lastIndexOf("."));
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return "node";
  if (ext === ".py") return "python3";
  if (ext === ".sh") return "bash";
  return "sh";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
