import type { SourceContent, SourcePlugin, SyncAgent } from "../entities";
import type { ProviderProjection } from "../entities/sync-results";
import type { AgentConfigSyncResources } from "../resources";
import { buildCodexAgentProjection } from "../source-content/helpers/codex-agent";
import { buildCodexScriptName } from "../repositories/codex-registry-repository";

export async function buildProviderProjections(input: {
  provider: SyncAgent;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  homes: string[];
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  resources: AgentConfigSyncResources;
}): Promise<ProviderProjection[]> {
  if (input.provider === "codex") return buildCodexProjections({ ...input, provider: "codex" });
  return buildClaudeProjections({ ...input, provider: "claude" });
}

async function buildCodexProjections(input: {
  provider: "codex";
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  homes: string[];
  includeAgentsInCodex?: boolean;
  resources: AgentConfigSyncResources;
}): Promise<ProviderProjection[]> {
  const pathOps = input.resources.path;
  const projections: ProviderProjection[] = [];

  for (const workflow of input.content.workflowFiles) {
    projections.push({
      provider: "codex",
      materialKind: "workflow",
      source: workflow.name,
      sourcePath: workflow.absPath,
      targetPaths: input.homes.map((home) => pathOps.join(home, "prompts", `${workflow.name}.md`)),
      distributionMode: "direct_mirror",
      supportStatus: "legacy_or_deprecated",
      evidenceLevel: "source_code",
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Legacy workflow prompt mirror kept for compatibility"],
    });
  }

  for (const skill of input.content.skills) {
    projections.push({
      provider: "codex",
      materialKind: "skill",
      source: skill.name,
      sourcePath: skill.absPath,
      targetPaths: input.homes.map((home) => pathOps.join(home, "skills", skill.name)),
      distributionMode: "direct_mirror",
      supportStatus: "native",
      evidenceLevel: "official",
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Mirrored to Codex skills directory"],
    });
  }

  for (const script of input.content.scripts) {
    const scriptName = buildCodexScriptName(input.sourcePlugin.dirName, script.name);
    projections.push({
      provider: "codex",
      materialKind: "script",
      source: script.name,
      sourcePath: script.absPath,
      targetPaths: input.homes.map((home) => pathOps.join(home, "scripts", scriptName)),
      distributionMode: "direct_mirror",
      supportStatus: "adapter_required",
      evidenceLevel: "source_code",
      droppedSemantics: [],
      adapterRequiredSemantics: ["scripts are exposed as prefixed utility cache files, not provider-native plugin commands"],
      validationNotes: ["Codex scripts share one destination directory and are plugin-prefixed"],
    });
  }

  if (input.includeAgentsInCodex) {
    for (const agent of input.content.agentFiles) {
      const rendered = await buildCodexAgentProjection({
        agent,
        sourcePlugin: input.sourcePlugin,
        resources: input.resources,
      });
      projections.push({
        provider: "codex",
        materialKind: "agent",
        source: agent.name,
        sourcePath: agent.absPath,
        targetPaths: input.homes.map((home) => pathOps.join(home, "agents", rendered.targetName)),
        distributionMode: "direct_mirror",
        supportStatus: rendered.adapterRequiredSemantics.length > 0 ? "adapter_required" : "native",
        evidenceLevel: "official",
        droppedSemantics: rendered.droppedSemantics,
        adapterRequiredSemantics: rendered.adapterRequiredSemantics,
        validationNotes: rendered.validationNotes,
      });
    }
  } else if (input.content.agentFiles.length > 0) {
    projections.push({
      provider: "codex",
      materialKind: "agent",
      source: `${input.content.agentFiles.length} agent(s)`,
      targetPaths: [],
      distributionMode: "operator_only",
      supportStatus: "unsupported",
      evidenceLevel: "source_code",
      droppedSemantics: ["agents omitted because sync.providers.codex.includeAgents is false"],
      adapterRequiredSemantics: [],
      validationNotes: ["Codex agent projection is opt-in"],
    });
  }

  projections.push({
    provider: "codex",
    materialKind: "plugin_metadata",
    source: input.sourcePlugin.dirName,
    sourcePath: input.sourcePlugin.absPath,
    targetPaths: input.homes.map((home) => pathOps.join(home, "plugins", "registry.json")),
    distributionMode: "direct_mirror",
    supportStatus: "adapter_required",
    evidenceLevel: "source_code",
    droppedSemantics: [],
    adapterRequiredSemantics: ["registry records RAWR ownership and drift metadata outside Codex official plugin install"],
    validationNotes: ["RAWR owns direct mirror conflict detection, GC, and stale retirement metadata"],
  });

  return projections;
}

function buildClaudeProjections(input: {
  provider: "claude";
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  homes: string[];
  includeAgentsInClaude?: boolean;
  resources: AgentConfigSyncResources;
}): ProviderProjection[] {
  const pathOps = input.resources.path;
  const pluginDirs = input.homes.map((home) => pathOps.join(home, "plugins", input.sourcePlugin.dirName));
  const projections: ProviderProjection[] = [];

  for (const workflow of input.content.workflowFiles) {
    projections.push({
      provider: "claude",
      materialKind: "workflow",
      source: workflow.name,
      sourcePath: workflow.absPath,
      targetPaths: pluginDirs.map((dir) => pathOps.join(dir, "commands", `${workflow.name}.md`)),
      distributionMode: "local_plugin_install",
      supportStatus: "native",
      evidenceLevel: "official",
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Mapped to Claude plugin commands"],
    });
  }

  for (const skill of input.content.skills) {
    projections.push({
      provider: "claude",
      materialKind: "skill",
      source: skill.name,
      sourcePath: skill.absPath,
      targetPaths: pluginDirs.map((dir) => pathOps.join(dir, "skills", skill.name)),
      distributionMode: "local_plugin_install",
      supportStatus: "native",
      evidenceLevel: "official",
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Mapped to Claude plugin skills"],
    });
  }

  for (const script of input.content.scripts) {
    projections.push({
      provider: "claude",
      materialKind: "script",
      source: script.name,
      sourcePath: script.absPath,
      targetPaths: pluginDirs.map((dir) => pathOps.join(dir, "scripts", script.name)),
      distributionMode: "local_plugin_install",
      supportStatus: "native",
      evidenceLevel: "official",
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Mapped to Claude plugin scripts"],
    });
  }

  if (input.includeAgentsInClaude ?? true) {
    for (const agent of input.content.agentFiles) {
      projections.push({
        provider: "claude",
        materialKind: "agent",
        source: agent.name,
        sourcePath: agent.absPath,
        targetPaths: pluginDirs.map((dir) => pathOps.join(dir, "agents", `${agent.name}.md`)),
        distributionMode: "local_plugin_install",
        supportStatus: "native",
        evidenceLevel: "official",
        droppedSemantics: [],
        adapterRequiredSemantics: [],
        validationNotes: ["Mapped to Claude plugin agents"],
      });
    }
  }

  projections.push({
    provider: "claude",
    materialKind: "plugin_metadata",
    source: input.sourcePlugin.dirName,
    sourcePath: input.sourcePlugin.absPath,
    targetPaths: pluginDirs.flatMap((dir) => [
      pathOps.join(dir, ".claude-plugin", "plugin.json"),
      pathOps.join(dir, ".rawr-sync-manifest.json"),
    ]),
    distributionMode: "local_plugin_install",
    supportStatus: "native",
    evidenceLevel: "official",
    droppedSemantics: [],
    adapterRequiredSemantics: [],
    validationNotes: ["Claude local plugin metadata and RAWR sync manifest are managed together"],
  });

  return projections;
}
