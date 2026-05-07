import type { CleanupBehindCandidate, RetainedResidue, RetireAction, RetiredPluginRef } from "../entities";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../../common/resources";
import {
  loadCodexRegistry,
  type CodexRegistryFile,
  type CodexRegistryPlugin,
} from "../../../common/repositories/codex-registry-repository";
import { pruneCodexHooksForPlugin } from "../../../common/repositories/codex-hooks-repository";
import {
  getCodexManagedMcpDir,
  getCodexRetiredRootSkillsDir,
  getCodexRuntimeSkillsDir,
} from "../../../common/repositories/codex-runtime-paths";
import { deletePathIfPresent, writeJsonWithUndoCapture } from "./filesystem-actions-repository";
import { MANAGED_BY } from "./managed-source-repository";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalizePath(resources: AgentConfigSyncResources, value: string): string {
  return resources.path.resolve(value);
}

function samePath(resources: AgentConfigSyncResources, left: string, right: string): boolean {
  return normalizePath(resources, left) === normalizePath(resources, right);
}

function targetUnderRoot(resources: AgentConfigSyncResources, root: string, relativeTarget: string): string | null {
  if (resources.path.isAbsolute(relativeTarget)) return null;
  const parts = relativeTarget.split(/[\\/]+/).filter((part) => part.length > 0);
  if (parts.length === 0 || parts.some((part) => part === "." || part === "..")) return null;
  const resolvedRoot = resources.path.resolve(root);
  const target = resources.path.resolve(resolvedRoot, ...parts);
  const relative = resources.path.relative(resolvedRoot, target);
  if (relative === "" || (!relative.startsWith("..") && !resources.path.isAbsolute(relative))) return target;
  return null;
}

function unsafeTargetLabel(resources: AgentConfigSyncResources, root: string, relativeTarget: string): string {
  return `${resources.path.resolve(root)}${resources.path.sep}${relativeTarget}`;
}

async function sourceMatchesCandidate(input: {
  resources: AgentConfigSyncResources;
  candidate: CleanupBehindCandidate;
  sourcePluginPath: unknown;
}): Promise<"match" | "old-missing-source" | "collision"> {
  if (typeof input.sourcePluginPath !== "string" || input.sourcePluginPath.length === 0) return "match";
  if (samePath(input.resources, input.sourcePluginPath, input.candidate.sourcePluginRoot)) return "match";
  return await input.resources.files.pathExists(input.sourcePluginPath)
    ? "collision"
    : "old-missing-source";
}

function claimsSkill(plugin: CodexRegistryPlugin, skill: string): boolean {
  return toStringArray(plugin.skills).includes(skill);
}

function withoutValues(values: string[] | undefined, remove: Set<string>): string[] {
  return toStringArray(values).filter((value) => !remove.has(value));
}

function withoutPluginHookAliases(plugin: CodexRegistryPlugin, removeScripts: Set<string>, removeConfigs: Set<string>): CodexRegistryPlugin {
  const hookScripts = withoutValues(plugin.hookScripts ?? plugin.hooks, removeScripts);
  const hookConfigs = withoutValues(plugin.hookConfigs, removeConfigs);
  const hooks = [...hookScripts, ...hookConfigs];
  return {
    ...plugin,
    hookScripts,
    hookConfigs,
    hooks,
  };
}

function hasManagedClaims(plugin: CodexRegistryPlugin): boolean {
  return [
    plugin.prompts,
    plugin.skills,
    plugin.scripts,
    plugin.agents,
    plugin.hookScripts,
    plugin.hookConfigs,
    plugin.hooks,
    plugin.mcpServers,
  ].some((value) => toStringArray(value).length > 0);
}

function action(input: {
  candidate: CleanupBehindCandidate;
  target: string;
  action: RetireAction["action"];
  message: string;
}): RetireAction {
  return {
    agent: input.candidate.provider,
    home: input.candidate.home,
    plugin: input.candidate.plugin,
    target: input.target,
    action: input.action,
    message: input.message,
  };
}

function cleanupMessage(candidate: CleanupBehindCandidate, message: string): string {
  return candidate.verification === "dry-run-planned"
    ? `cleanup behind dry-run provider sync (not provider-verified): ${message}`
    : `cleanup behind provider sync: ${message}`;
}

function retain(input: {
  candidate: CleanupBehindCandidate;
  target: string;
  reason: string;
  message?: string;
}): RetainedResidue {
  return {
    agent: input.candidate.provider,
    home: input.candidate.home,
    plugin: input.candidate.plugin,
    target: input.target,
    reason: input.reason,
    ...(input.message ? { message: input.message } : {}),
  };
}

async function loadRuntimeClaimRegistries(input: {
  resources: AgentConfigSyncResources;
  candidate: CleanupBehindCandidate;
  claimCheckCodexHomes: string[];
}): Promise<Array<{ codexHome: string; registry: CodexRegistryFile }>> {
  const candidateRuntimeRoot = getCodexRuntimeSkillsDir(input.candidate.home, input.resources.path);
  const homes = [...new Set([input.candidate.home, ...input.claimCheckCodexHomes])];
  const loaded: Array<{ codexHome: string; registry: CodexRegistryFile }> = [];
  for (const codexHome of homes) {
    if (getCodexRuntimeSkillsDir(codexHome, input.resources.path) !== candidateRuntimeRoot) continue;
    const registry = await loadCodexRegistry(codexHome, input.resources);
    loaded.push({ codexHome, registry: registry.data });
  }
  return loaded;
}

async function hasSurvivingRuntimeSkillClaim(input: {
  resources: AgentConfigSyncResources;
  candidate: CleanupBehindCandidate;
  claimCheckCodexHomes: string[];
  skill: string;
}): Promise<boolean> {
  const registries = await loadRuntimeClaimRegistries(input);
  for (const { codexHome, registry } of registries) {
    for (const plugin of registry.plugins ?? []) {
      if (plugin.managed_by !== MANAGED_BY) continue;
      if (!claimsSkill(plugin, input.skill)) continue;
      if (codexHome !== input.candidate.home) return true;
      if (plugin.name !== input.candidate.plugin) return true;
      if (await sourceMatchesCandidate({
        resources: input.resources,
        candidate: input.candidate,
        sourcePluginPath: plugin.source_plugin_path,
      }) === "collision") return true;
    }
  }
  return false;
}

export async function applyCleanupBehindCodex(input: {
  dryRun: boolean;
  candidate: CleanupBehindCandidate;
  claimCheckCodexHomes: string[];
  resources: AgentConfigSyncResources;
  undoCapture?: AgentConfigSyncUndoCapture;
}): Promise<{
  ok: boolean;
  cleanedPlugins: RetiredPluginRef[];
  retainedResidue: RetainedResidue[];
  actions: RetireAction[];
}> {
  const actions: RetireAction[] = [];
  const retainedResidue: RetainedResidue[] = [];
  const cleanedPlugins: RetiredPluginRef[] = [];
  const registry = await loadCodexRegistry(input.candidate.home, input.resources);
  const registryPath = registry.filePath;
  const plugins = registry.data.plugins ?? [];
  let registryChanged = false;
  let cleanedAny = false;

  const nextPlugins: CodexRegistryPlugin[] = [];

  for (const plugin of plugins) {
    if (plugin.managed_by !== MANAGED_BY || plugin.name !== input.candidate.plugin) {
      nextPlugins.push(plugin);
      continue;
    }

    const sourceMatch = await sourceMatchesCandidate({
      resources: input.resources,
      candidate: input.candidate,
      sourcePluginPath: plugin.source_plugin_path,
    });
    if (sourceMatch === "collision") {
      const target = registryPath;
      retainedResidue.push(retain({
        candidate: input.candidate,
        target,
        reason: "source-collision",
        message: `managed entry points at different existing source root: ${String(plugin.source_plugin_path)}`,
      }));
      actions.push(action({
        candidate: input.candidate,
        target,
        action: "skipped",
        message: "retained managed entry due to source collision",
      }));
      nextPlugins.push(plugin);
      continue;
    }

    let nextPlugin: CodexRegistryPlugin = { ...plugin };

    for (const prompt of toStringArray(plugin.prompts)) {
      retainedResidue.push(retain({
        candidate: input.candidate,
        target: input.resources.path.join(input.candidate.home, "prompts", `${prompt}.md`),
        reason: "projection-only-retained",
        message: "workflow prompt retained as a legacy/auxiliary compatibility mirror; migrate repeatable workflows into skills",
      }));
    }

    if (input.candidate.verifiedCapabilities.scripts) {
      const retainedScripts: string[] = [];
      const originalScripts = toStringArray(plugin.scripts);
      const scriptsRoot = input.resources.path.join(input.candidate.home, "scripts");
      for (const script of originalScripts) {
        const target = targetUnderRoot(input.resources, scriptsRoot, script);
        if (!target) {
          const unsafeTarget = unsafeTargetLabel(input.resources, scriptsRoot, script);
          retainedScripts.push(script);
          retainedResidue.push(retain({
            candidate: input.candidate,
            target: unsafeTarget,
            reason: "unsafe-registry-claim-retained",
            message: "managed registry script claim resolves outside the bounded cleanup root",
          }));
          actions.push(action({
            candidate: input.candidate,
            target: unsafeTarget,
            action: "skipped",
            message: "retained managed script claim because it resolves outside the bounded cleanup root",
          }));
          continue;
        }

        const deleteAction = await deletePathIfPresent({
          dryRun: input.dryRun,
          target,
          undoCapture: input.undoCapture,
          resources: input.resources,
        });
        actions.push(action({
          candidate: input.candidate,
          target,
          action: deleteAction,
          message: cleanupMessage(input.candidate, "retired managed script residue"),
        }));
      }
      nextPlugin = { ...nextPlugin, scripts: retainedScripts };
      if (retainedScripts.length !== originalScripts.length) {
        cleanedAny = true;
        registryChanged = true;
      }
    } else {
      for (const script of toStringArray(plugin.scripts)) {
        retainedResidue.push(retain({
          candidate: input.candidate,
          target: input.resources.path.join(input.candidate.home, "scripts", script),
          reason: "projection-only-retained",
          message: "script retained as legacy/auxiliary compatibility support for prompt/skill material",
        }));
      }
    }

    if (input.candidate.verifiedCapabilities.skills) {
      const originalSkills = toStringArray(plugin.skills);
      const removedSkills = new Set(originalSkills);
      const retainedSkills: string[] = [];
      const otherHomeClaims = new Set<string>();
      for (const other of plugins) {
        if (other === plugin || other.managed_by !== MANAGED_BY) continue;
        for (const skill of toStringArray(other.skills)) otherHomeClaims.add(skill);
      }

      for (const skill of removedSkills) {
        const rootSkillsDir = getCodexRetiredRootSkillsDir(input.candidate.home, input.resources.path);
        const runtimeSkillsDir = getCodexRuntimeSkillsDir(input.candidate.home, input.resources.path);
        const rootTarget = targetUnderRoot(input.resources, rootSkillsDir, skill);
        const runtimeTarget = targetUnderRoot(input.resources, runtimeSkillsDir, skill);
        if (!rootTarget || !runtimeTarget) {
          retainedSkills.push(skill);
          const target = unsafeTargetLabel(input.resources, rootSkillsDir, skill);
          retainedResidue.push(retain({
            candidate: input.candidate,
            target,
            reason: "unsafe-registry-claim-retained",
            message: "managed registry skill claim resolves outside the bounded cleanup root",
          }));
          actions.push(action({
            candidate: input.candidate,
            target,
            action: "skipped",
            message: "retained managed skill claim because it resolves outside the bounded cleanup root",
          }));
          continue;
        }
        if (otherHomeClaims.has(skill)) {
          retainedResidue.push(retain({
            candidate: input.candidate,
            target: rootTarget,
            reason: "shared-claim-retained",
            message: "another managed registry entry still claims this root skill",
          }));
          actions.push(action({
            candidate: input.candidate,
            target: rootTarget,
            action: "skipped",
            message: "retained root skill because another managed entry claims it",
          }));
        } else {
          const deleteAction = await deletePathIfPresent({
            dryRun: input.dryRun,
            target: rootTarget,
            recursive: true,
            undoCapture: input.undoCapture,
            resources: input.resources,
          });
          actions.push(action({
            candidate: input.candidate,
            target: rootTarget,
            action: deleteAction,
            message: cleanupMessage(input.candidate, "retired managed root skill residue"),
          }));
        }

        if (await hasSurvivingRuntimeSkillClaim({
          resources: input.resources,
          candidate: input.candidate,
          claimCheckCodexHomes: input.claimCheckCodexHomes,
          skill,
        })) {
          retainedResidue.push(retain({
            candidate: input.candidate,
            target: runtimeTarget,
            reason: "shared-runtime-claim-retained",
            message: "another managed Codex home still claims this shared runtime skill",
          }));
          actions.push(action({
            candidate: input.candidate,
            target: runtimeTarget,
            action: "skipped",
            message: "retained runtime skill because another managed registry still claims it",
          }));
        } else {
          const deleteAction = await deletePathIfPresent({
            dryRun: input.dryRun,
            target: runtimeTarget,
            recursive: true,
            undoCapture: input.undoCapture,
            resources: input.resources,
          });
          actions.push(action({
            candidate: input.candidate,
            target: runtimeTarget,
            action: deleteAction,
            message: cleanupMessage(input.candidate, "retired managed runtime skill residue"),
          }));
        }
      }

      nextPlugin = { ...nextPlugin, skills: retainedSkills };
      if (retainedSkills.length !== originalSkills.length) {
        cleanedAny = true;
        registryChanged = true;
      }
    }

    if (input.candidate.verifiedCapabilities.hooks) {
      const hookScripts = new Set(toStringArray(plugin.hookScripts ?? plugin.hooks));
      const hookConfigs = new Set(toStringArray(plugin.hookConfigs));
      const safeHookScripts = new Set<string>();
      const hookRoot = input.resources.path.join(input.candidate.home, "hooks", "rawr", input.candidate.plugin);
      for (const hook of hookScripts) {
        const target = targetUnderRoot(input.resources, hookRoot, hook);
        if (!target) {
          const unsafeTarget = unsafeTargetLabel(input.resources, hookRoot, hook);
          retainedResidue.push(retain({
            candidate: input.candidate,
            target: unsafeTarget,
            reason: "unsafe-registry-claim-retained",
            message: "managed registry hook claim resolves outside the bounded cleanup root",
          }));
          actions.push(action({
            candidate: input.candidate,
            target: unsafeTarget,
            action: "skipped",
            message: "retained managed hook claim because it resolves outside the bounded cleanup root",
          }));
          continue;
        }
        safeHookScripts.add(hook);
        const deleteAction = await deletePathIfPresent({
          dryRun: input.dryRun,
          target,
          undoCapture: input.undoCapture,
          resources: input.resources,
        });
        actions.push(action({
          candidate: input.candidate,
          target,
          action: deleteAction,
          message: cleanupMessage(input.candidate, "retired managed hook script residue"),
        }));
      }
      if (hookConfigs.size > 0) {
        const hooksJsonPath = input.resources.path.join(input.candidate.home, "hooks.json");
        const existingHooks = await input.resources.files.readJsonFile<unknown>(hooksJsonPath);
        if (existingHooks) {
          const writeAction = await writeJsonWithUndoCapture({
            dryRun: input.dryRun,
            target: hooksJsonPath,
            data: pruneCodexHooksForPlugin({
              pluginName: input.candidate.plugin,
              existing: existingHooks,
            }),
            undoCapture: input.undoCapture,
            resources: input.resources,
          });
          actions.push(action({
            candidate: input.candidate,
            target: hooksJsonPath,
            action: writeAction,
            message: cleanupMessage(input.candidate, "removed managed hook lifecycle residue"),
          }));
        }
      }
      nextPlugin = withoutPluginHookAliases(nextPlugin, safeHookScripts, hookConfigs);
      if (safeHookScripts.size > 0 || hookConfigs.size > 0) {
        cleanedAny = true;
        registryChanged = true;
      }
    }

    if (input.candidate.verifiedCapabilities.mcp) {
      const retainedMcpServers: string[] = [];
      const mcpRoot = getCodexManagedMcpDir(input.candidate.home, input.candidate.plugin, input.resources.path);
      for (const mcpServer of toStringArray(plugin.mcpServers)) {
        const target = targetUnderRoot(input.resources, mcpRoot, mcpServer);
        if (!target) {
          const unsafeTarget = unsafeTargetLabel(input.resources, mcpRoot, mcpServer);
          retainedMcpServers.push(mcpServer);
          retainedResidue.push(retain({
            candidate: input.candidate,
            target: unsafeTarget,
            reason: "unsafe-registry-claim-retained",
            message: "managed registry MCP claim resolves outside the bounded cleanup root",
          }));
          actions.push(action({
            candidate: input.candidate,
            target: unsafeTarget,
            action: "skipped",
            message: "retained managed MCP claim because it resolves outside the bounded cleanup root",
          }));
          continue;
        }
        if (mcpServer.endsWith(".json") || mcpServer.endsWith(".toml")) {
          retainedMcpServers.push(mcpServer);
          retainedResidue.push(retain({
            candidate: input.candidate,
            target,
            reason: "under-specified-config-retained",
            message: "MCP config fragments require exact key ownership before cleanup",
          }));
          continue;
        }
        const deleteAction = await deletePathIfPresent({
          dryRun: input.dryRun,
          target,
          undoCapture: input.undoCapture,
          resources: input.resources,
        });
        actions.push(action({
          candidate: input.candidate,
          target,
          action: deleteAction,
          message: cleanupMessage(input.candidate, "retired managed MCP runtime residue"),
        }));
        cleanedAny = true;
      }
      nextPlugin = { ...nextPlugin, mcpServers: retainedMcpServers };
      if (toStringArray(plugin.mcpServers).length !== retainedMcpServers.length) registryChanged = true;
    }

    if (hasManagedClaims(nextPlugin)) {
      nextPlugins.push(nextPlugin);
    } else {
      registryChanged = true;
    }
  }

  if (!registryChanged) {
    if (!cleanedAny && actions.length === 0 && retainedResidue.length === 0) {
      actions.push(action({
        candidate: input.candidate,
        target: registryPath,
        action: "skipped",
        message: "no cleanup-behind managed residue matched this provider sync",
      }));
    }
    return { ok: true, cleanedPlugins, retainedResidue, actions };
  }

  const nextRegistry: CodexRegistryFile = {
    ...registry.data,
    plugins: nextPlugins,
    last_synced: new Date().toISOString(),
  };
  const registryAction = await writeJsonWithUndoCapture({
    dryRun: input.dryRun,
    target: registryPath,
    data: nextRegistry,
    undoCapture: input.undoCapture,
    resources: input.resources,
  });
  actions.push(action({
    candidate: input.candidate,
    target: registryPath,
    action: registryAction,
    message: cleanupMessage(input.candidate, "updated managed residue registry claims"),
  }));

  if (cleanedAny && !input.dryRun) {
    cleanedPlugins.push({
      agent: input.candidate.provider,
      home: input.candidate.home,
      plugin: input.candidate.plugin,
    });
  }

  return { ok: true, cleanedPlugins, retainedResidue, actions };
}
