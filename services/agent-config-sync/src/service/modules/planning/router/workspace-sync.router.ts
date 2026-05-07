/**
 * agent-config-sync: planning module.
 *
 * This router owns "decide what would happen" for sync, without mutating any
 * destination homes: it resolves the workspace root, discovers syncable source
 * plugins, computes the target homes, and produces a dry-run assessment of the
 * execution policy (conflicts, GC candidates, registry diffs).
 *
 * The intent is to keep projections (CLI/web) thin: they orchestrate inputs and
 * rendering, while the service defines the planning semantics and the exact
 * preview behavior.
 */
import { module } from "../module";
import { resolveSourceScopeForPath, scopeAllows } from "../../../common/internal/source-scope";
import { resolveProviderContent } from "../../../common/source-content/helpers/provider-content";
import {
  deleteIfExists,
  syncFileWithConflictPolicy,
  syncSkillDirWithConflictPolicy,
  syncTextWithConflictPolicy,
} from "../../../common/repositories/destination-sync-repository";
import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
  upsertCodexRegistryAgentClaims,
} from "../../../common/repositories/codex-registry-repository";
import { buildCodexManagedConfig } from "../../../common/repositories/codex-config-repository";
import { buildCodexHooksFile, pruneCodexHooksForPlugin } from "../../../common/repositories/codex-hooks-repository";
import {
  getCodexManagedMcpDir,
  getCodexRetiredRootSkillsDir,
  getCodexRuntimeSkillsDir,
} from "../../../common/repositories/codex-runtime-paths";
import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
} from "../../../common/repositories/claude-marketplace-repository";
import { pushItem, summarizeScannedContent } from "../../../common/helpers/sync-results";
import { buildProviderProjections } from "../../../common/helpers/projections";
import { buildCodexAgentProjection } from "../../../common/source-content/helpers/codex-agent";
import { resolveWorkspaceRoot } from "../repositories/workspace-root-repository";
import {
  hasAnyContent,
  loadWorkspaceSourcePlugins,
  resolveSourcePlugin,
  scanSourcePlugin,
} from "../repositories/source-plugin-repository";
import { evaluateFullSyncPolicyInput } from "./full-sync-policy.router";
import type { SyncRunResult, SyncTargetResult } from "../../../common/entities/sync-results";
import type { SourceContent, SourcePlugin, SyncScope } from "../../../common/entities";
import type { AgentConfigSyncPathResources, AgentConfigSyncResources } from "../../../common/resources";
import type {
  SyncAgentSelection,
  SyncAssessment,
  TargetHomeCandidates,
  TargetHomes,
  WorkspaceSkip,
  WorkspaceSyncable,
} from "../entities";

export const planWorkspaceSync = module.planWorkspaceSync.handler(async ({ context, input, errors }) => {
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
    resources: context.resources,
  });
  const targetSelection = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
    pathOps: context.resources.path,
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
      includeCodexDestinationProjection: input.includeCodexDestinationProjection,
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
    includeAgentsInCodex: input.includeAgentsInCodex ?? true,
    includeAgentsInClaude: input.includeAgentsInClaude ?? true,
    activePluginNames: scoped.syncable.map((item) => item.sourcePlugin.dirName).sort((a, b) => a.localeCompare(b)),
    fullSyncPolicy: evaluateFullSyncPolicyInput(input.fullSyncPolicy),
    assessment,
  };
});

export const assessWorkspaceSync = module.assessWorkspaceSync.handler(async ({ context, input, errors }) => {
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
    resources: context.resources,
  });
  const targetSelection = resolveTargetHomes({
    agent: input.agent,
    candidates: input.targetHomeCandidates,
    pathOps: context.resources.path,
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
      includeCodexDestinationProjection: input.includeCodexDestinationProjection,
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

const RESIDUAL_MATERIAL_KINDS = new Set(["agent", "hook", "mcp", "settings", "asset", "orchestration"]);

function summarizeWorkspaceRun(input: {
  runs: SyncRunResult[];
  skipped: WorkspaceSkip[];
  includeMetadata: boolean;
  scope: SyncScope;
}): SyncAssessment {
  let totalTargets = 0;
  let totalConflicts = 0;
  let totalMaterialChanges = 0;
  let totalMetadataChanges = 0;
  let totalDriftItems = 0;
  let totalProjectionResiduals = 0;
  let totalMaterialProjectionResiduals = 0;
  let totalSemanticSupportResiduals = 0;

  const plugins = input.runs.map((run) => {
    let conflicts = 0;
    let materialChanges = 0;
    let metadataChanges = 0;
    const driftItems: SyncAssessment["plugins"][number]["driftItems"] = [];
    const projectionResiduals: SyncAssessment["plugins"][number]["projectionResiduals"] = [];
    const materialProjectionResiduals: SyncAssessment["plugins"][number]["materialProjectionResiduals"] = [];
    const semanticSupportResiduals: SyncAssessment["plugins"][number]["semanticSupportResiduals"] = [];

    for (const target of run.targets) {
      totalTargets += 1;
      conflicts += target.conflicts.length;
      totalConflicts += target.conflicts.length;

      const nonSkipped = target.items.filter((item) => item.action !== "skipped");
      const metadata = nonSkipped.filter((item) => item.kind === "metadata");
      const material = nonSkipped.filter((item) => item.kind !== "metadata");
      const drift = nonSkipped.filter((item) => input.includeMetadata || item.kind !== "metadata");

      metadataChanges += metadata.length;
      materialChanges += material.length;
      totalMetadataChanges += metadata.length;
      totalMaterialChanges += material.length;
      totalDriftItems += drift.length;

      driftItems.push(
        ...drift.map((item) => ({
          action: item.action,
          kind: item.kind,
          target: item.target,
          message: item.message,
        })),
      );
    }

    const materialResiduals = run.projections.filter((projection) =>
      RESIDUAL_MATERIAL_KINDS.has(projection.materialKind) &&
      projection.supportStatus !== "native" &&
      projection.supportStatus !== "legacy_or_deprecated"
    );
    totalMaterialProjectionResiduals += materialResiduals.length;
    materialProjectionResiduals.push(
      ...materialResiduals.map((projection) => ({
        provider: projection.provider,
        materialKind: projection.materialKind,
        source: projection.source,
        supportStatus: projection.supportStatus,
        message: [
          ...projection.adapterRequiredSemantics,
          ...projection.droppedSemantics.map((item) => `dropped: ${item}`),
          ...projection.validationNotes,
        ].join("; ") || `${projection.materialKind} is ${projection.supportStatus}`,
      })),
    );
    const semanticResiduals = run.projections.flatMap((projection) =>
      projection.semanticSupport
        .filter((support) => support.supportStatus !== "native")
        .map((support) => ({
          provider: support.provider,
          materialKind: projection.materialKind,
          semanticKind: support.semanticKind,
          source: support.source,
          supportStatus: support.supportStatus,
          message: support.notes.join("; ") || `${support.semanticKind} is ${support.supportStatus}`,
        }))
    );
    totalSemanticSupportResiduals += semanticResiduals.length;
    semanticSupportResiduals.push(...semanticResiduals);
    projectionResiduals.push(...materialProjectionResiduals);
    totalProjectionResiduals = totalMaterialProjectionResiduals + totalSemanticSupportResiduals;

    return {
      dirName: run.sourcePlugin.dirName,
      absPath: run.sourcePlugin.absPath,
      conflicts,
      materialChanges,
      metadataChanges,
      driftItems,
      projectionResiduals,
      materialProjectionResiduals,
      semanticSupportResiduals,
    };
  });

  const status = totalConflicts > 0
    ? "CONFLICTS"
    : totalDriftItems > 0
      ? "DRIFT_DETECTED"
      : "IN_SYNC";

  return {
    status,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
    summary: {
      totalPlugins: plugins.length,
      totalTargets,
      totalConflicts,
      totalMaterialChanges,
      totalMetadataChanges,
      totalDriftItems,
      totalProjectionResiduals,
      totalMaterialProjectionResiduals,
      totalSemanticSupportResiduals,
    },
    skipped: input.skipped,
    plugins,
  };
}

function dedupePaths(paths: string[], pathOps: AgentConfigSyncPathResources): string[] {
  return [...new Set(paths.map((entry) => pathOps.resolve(entry)))];
}

function enabledDestinationRoots(destinations: TargetHomeCandidates["codexHomesFromConfig"]): string[] {
  return destinations
    .filter((destination) => destination.enabled !== false && typeof destination.rootPath === "string")
    .map((destination) => destination.rootPath)
    .filter((rootPath): rootPath is string => Boolean(rootPath));
}

function resolveTargetHomes(input: {
  agent: SyncAgentSelection;
  candidates: TargetHomeCandidates;
  pathOps: AgentConfigSyncPathResources;
}): { agents: Array<"codex" | "claude">; homes: TargetHomes } {
  const codexConfigHomes = enabledDestinationRoots(input.candidates.codexHomesFromConfig);
  const claudeConfigHomes = enabledDestinationRoots(input.candidates.claudeHomesFromConfig);

  const codexFallbackHomes =
    input.candidates.codexHomesFromEnvironment.length > 0
      ? input.candidates.codexHomesFromEnvironment
      : codexConfigHomes.length > 0
        ? codexConfigHomes
        : input.candidates.codexDefaultHomes;

  const claudeFallbackHomes =
    input.candidates.claudeHomesFromEnvironment.length > 0
      ? input.candidates.claudeHomesFromEnvironment
      : claudeConfigHomes.length > 0
        ? claudeConfigHomes
        : input.candidates.claudeDefaultHomes;

  return {
    agents: input.agent === "all" ? ["codex", "claude"] : [input.agent],
    homes: {
      codexHomes: dedupePaths(
        input.candidates.codexHomesFromFlags.length > 0
          ? input.candidates.codexHomesFromFlags
          : codexFallbackHomes,
        input.pathOps,
      ),
      claudeHomes: dedupePaths(
        input.candidates.claudeHomesFromFlags.length > 0
          ? input.candidates.claudeHomesFromFlags
          : claudeFallbackHomes,
        input.pathOps,
      ),
    },
  };
}



async function discoverWorkspaceSources(input: {
  cwd: string;
  workspaceRoot: string;
  sourcePaths: string[];
  resources: AgentConfigSyncResources;
}): Promise<{ workspaceRoot: string; syncable: WorkspaceSyncable[]; skipped: WorkspaceSkip[] }> {
  const workspaceRoot = input.workspaceRoot;
  const workspacePlugins = await loadWorkspaceSourcePlugins(workspaceRoot, input.resources);
  const syncable: WorkspaceSyncable[] = [];
  const skipped: WorkspaceSkip[] = [...workspacePlugins.skipped];

  for (const sourcePlugin of workspacePlugins.plugins) {
    try {
      const content = await scanSourcePlugin({
        sourcePlugin,
        workspacePlugins: workspacePlugins.plugins,
        resources: input.resources,
      });
      if (!hasAnyContent(content)) {
        skipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      syncable.push({ sourcePlugin, content });
    } catch (error) {
      skipped.push({
        dirName: sourcePlugin.dirName,
        absPath: sourcePlugin.absPath,
        reason: `scan failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const plannedWorkspaceDirs = new Set(syncable.map((item) => input.resources.path.resolve(item.sourcePlugin.absPath)));
  const seen = new Set<string>();

  for (const candidate of input.sourcePaths) {
    const absPath = input.resources.path.resolve(input.cwd, candidate);
    if (plannedWorkspaceDirs.has(absPath) || seen.has(absPath)) continue;
    seen.add(absPath);

    try {
      const sourcePlugin = await resolveSourcePlugin({
        pluginRef: absPath,
        cwd: input.cwd,
        workspaceRoot,
        resources: input.resources,
      });
      const content = await scanSourcePlugin({
        sourcePlugin,
        workspacePlugins: workspacePlugins.plugins,
        resources: input.resources,
      });
      if (!hasAnyContent(content)) {
        skipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      syncable.push({ sourcePlugin, content });
    } catch (error) {
      skipped.push({
        dirName: input.resources.path.basename(absPath),
        absPath,
        reason: `unresolvable: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return { workspaceRoot, syncable, skipped };
}

function filterByScope(input: {
  workspaceRoot: string;
  syncable: WorkspaceSyncable[];
  skipped: WorkspaceSkip[];
  scope: SyncScope;
  resources: AgentConfigSyncResources;
}): { syncable: WorkspaceSyncable[]; skipped: WorkspaceSkip[] } {
  const filteredSyncable = input.syncable.filter(({ sourcePlugin }) =>
    scopeAllows(input.scope, resolveSourceScopeForPath(input.resources.path, sourcePlugin.absPath, input.workspaceRoot)),
  );
  const skipped = [...input.skipped];

  for (const item of input.syncable) {
    if (filteredSyncable.includes(item)) continue;
    skipped.push({
      dirName: item.sourcePlugin.dirName,
      absPath: item.sourcePlugin.absPath,
      reason: `out of scope (${input.scope})`,
    });
  }

  return { syncable: filteredSyncable, skipped };
}



async function previewSyncRun(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  agents: Array<"codex" | "claude">;
  codexHomes: string[];
  claudeHomes: string[];
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  includeCodexDestinationProjection?: boolean;
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
    const includeCodexDestinationProjection = input.includeCodexDestinationProjection ?? true;
    const codexProjectionContent = includeCodexDestinationProjection
      ? codexContent
      : {
          ...codexContent,
          workflowFiles: [],
          skills: [],
          scripts: [],
          hooks: [],
          hookConfigs: [],
          mcpServers: [],
          settings: [],
          assets: [],
          orchestration: [],
        };
    projections.push(...await buildProviderProjections({
      provider: "codex",
      sourcePlugin: input.sourcePlugin,
      content: codexProjectionContent,
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
      const includeAgentsInCodex = options.includeAgentsInCodex ?? true;

      if (!includeCodexDestinationProjection) {
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

        const newAgents = new Set(includeAgentsInCodex ? codexContent.agentFiles.map((agent) => agent.name) : []);
        for (const oldAgent of registry.claimedSets.agentsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
          if (newAgents.has(oldAgent) || claimedOthers.agents.has(oldAgent)) continue;
          await deleteIfExists({ target: pathOps.join(agentsDir, `${oldAgent}.toml`), kind: "agent", options, result });
        }

        const codexRegistry = await upsertCodexRegistryAgentClaims({
          codexHome,
          sourcePlugin: input.sourcePlugin,
          agentNames: [...newAgents],
          dryRun: true,
          existingData: registry.data,
          resources: input.resources,
        });
        if (codexRegistry.changed) {
          pushItem(result, {
            action: "planned",
            kind: "metadata",
            target: codexRegistry.filePath,
            message: "registry agent claim upsert",
          });
        }

        targets.push(result);
        continue;
      }

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
