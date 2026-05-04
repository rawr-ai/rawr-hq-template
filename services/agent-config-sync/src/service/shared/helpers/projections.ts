import type { SourceContent, SourcePlugin, SyncAgent } from "../entities";
import type { ProjectionSupport, ProviderProjection } from "../entities/sync-results";
import type { AgentConfigSyncResources } from "../resources";
import { buildCodexAgentProjection } from "../source-content/helpers/codex-agent";
import {
  buildProviderSemanticSupport,
  nonNativeSemanticSupport,
  relatedSemanticSupport,
} from "../source-content/helpers/claude-semantics";
import { buildCodexScriptName } from "../repositories/codex-registry-repository";
import { getCodexManagedMcpDir, getCodexRuntimeSkillsDir } from "../repositories/codex-runtime-paths";

function materialSupport(input: {
  provider: SyncAgent;
  semanticKind: ProjectionSupport["semanticKind"];
  source: string;
  supportStatus: ProjectionSupport["supportStatus"];
  evidenceLevel?: ProjectionSupport["evidenceLevel"];
  notes: string[];
}): ProjectionSupport[] {
  return [{
    provider: input.provider,
    semanticKind: input.semanticKind,
    source: input.source,
    supportStatus: input.supportStatus,
    evidenceLevel: input.evidenceLevel ?? "source_code",
    notes: input.notes,
  }];
}

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
  const semanticSupport = await buildProviderSemanticSupport({
    provider: "codex",
    content: input.content,
    resources: input.resources,
  });

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
      semanticSupport: materialSupport({
        provider: "codex",
        semanticKind: "artifact_state",
        source: workflow.name,
        supportStatus: "adapter_required",
        notes: ["Legacy workflow prompt mirror is material convergence, not native command runtime parity"],
      }),
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
      targetPaths: input.homes.map((home) => pathOps.join(getCodexRuntimeSkillsDir(home, pathOps), skill.name)),
      distributionMode: "direct_mirror",
      supportStatus: "native",
      evidenceLevel: "official",
      semanticSupport: [
        ...materialSupport({
          provider: "codex",
          semanticKind: "skill_step",
          source: skill.name,
          supportStatus: "native",
          evidenceLevel: "local_verified",
          notes: ["Codex skill directory is mirrored to the runtime user skill root"],
        }),
        ...relatedSemanticSupport({ source: skill.name, semanticSupport }),
      ],
      droppedSemantics: [],
      adapterRequiredSemantics: nonNativeSemanticSupport(relatedSemanticSupport({ source: skill.name, semanticSupport }))
        .map((support) => support.source),
      validationNotes: ["Mirrored to Codex runtime user skills"],
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
      semanticSupport: materialSupport({
        provider: "codex",
        semanticKind: "bootstrap",
        source: script.name,
        supportStatus: "adapter_required",
        notes: ["Codex script sync is a managed utility-file cache, not a provider-native command install"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: ["scripts are exposed as prefixed utility cache files, not provider-native plugin commands"],
      validationNotes: ["Codex scripts share one destination directory and are plugin-prefixed"],
    });
  }

  for (const hook of input.content.hooks ?? []) {
    projections.push({
      provider: "codex",
      materialKind: "hook",
      source: hook.name,
      sourcePath: hook.absPath,
      targetPaths: input.homes.flatMap((home) => [
        pathOps.join(home, "hooks", "rawr", input.sourcePlugin.dirName, hook.name),
      ]),
      distributionMode: "direct_mirror",
      supportStatus: "native",
      evidenceLevel: "official",
      semanticSupport: materialSupport({
        provider: "codex",
        semanticKind: "hook",
        source: hook.name,
        supportStatus: "native",
        evidenceLevel: "official",
        notes: ["Direct Codex hook executable material is copied to a managed runtime path"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Hook executable is copied only as managed support material for modeled Codex lifecycle config"],
    });
  }

  for (const hookConfig of input.content.hookConfigs ?? []) {
    projections.push({
      provider: "codex",
      materialKind: "hook",
      source: hookConfig.name,
      sourcePath: hookConfig.absPath,
      targetPaths: input.homes.flatMap((home) => [
        pathOps.join(home, "hooks.json"),
        pathOps.join(home, "config.toml"),
      ]),
      distributionMode: "direct_mirror",
      supportStatus: "native",
      evidenceLevel: "official",
      semanticSupport: materialSupport({
        provider: "codex",
        semanticKind: "hook",
        source: hookConfig.name,
        supportStatus: "native",
        evidenceLevel: "official",
        notes: ["Direct Codex hook config is preserved through managed hooks.json merge"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Codex hook event/matcher config is preserved through managed hooks.json merge"],
    });
  }

  for (const mcpServer of input.content.mcpServers ?? []) {
    projections.push({
      provider: "codex",
      materialKind: "mcp",
      source: mcpServer.name,
      sourcePath: mcpServer.absPath,
      targetPaths: input.homes.flatMap((home) => [
        pathOps.join(home, "config.toml"),
        ...(mcpServer.name.endsWith(".json") || mcpServer.name.endsWith(".toml")
          ? []
          : [pathOps.join(getCodexManagedMcpDir(home, input.sourcePlugin.dirName, pathOps), mcpServer.name)]),
      ]),
      distributionMode: "direct_mirror",
      supportStatus: "native",
      evidenceLevel: "official",
      semanticSupport: materialSupport({
        provider: "codex",
        semanticKind: "mcp_server",
        source: mcpServer.name,
        supportStatus: "native",
        evidenceLevel: "official",
        notes: ["Direct Codex MCP material is projected into managed runtime config"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Codex MCP servers are copied to a managed runtime path and projected into [mcp_servers.*] config"],
    });
  }

  for (const setting of input.content.settings ?? []) {
    projections.push({
      provider: "codex",
      materialKind: "settings",
      source: setting.name,
      sourcePath: setting.absPath,
      targetPaths: input.homes.map((home) => pathOps.join(home, "config.toml")),
      distributionMode: "direct_mirror",
      supportStatus: "native",
      evidenceLevel: "official",
      semanticSupport: materialSupport({
        provider: "codex",
        semanticKind: "settings",
        source: setting.name,
        supportStatus: "native",
        evidenceLevel: "official",
        notes: ["Direct Codex settings material is merged as a managed TOML fragment"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Codex settings are merged as managed TOML fragments without overwriting unrelated config"],
    });
  }

  for (const asset of input.content.assets ?? []) {
    projections.push({
      provider: "codex",
      materialKind: "asset",
      source: asset.name,
      sourcePath: asset.absPath,
      targetPaths: input.homes.map((home) => pathOps.join(home, "plugins", "rawr-managed", input.sourcePlugin.dirName, "assets", asset.name)),
      distributionMode: "package_artifact",
      supportStatus: "unknown",
      evidenceLevel: "inferred",
      semanticSupport: materialSupport({
        provider: "codex",
        semanticKind: "asset",
        source: asset.name,
        supportStatus: "unknown",
        evidenceLevel: "inferred",
        notes: ["Asset runtime semantics depend on the consumer surface"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Assets are meaningful for plugin package surfaces, not legacy direct mirror runtime"],
    });
  }

  for (const spec of input.content.orchestration ?? []) {
    projections.push({
      provider: "codex",
      materialKind: "orchestration",
      source: spec.name,
      sourcePath: spec.absPath,
      targetPaths: [],
      distributionMode: "operator_only",
      supportStatus: "adapter_required",
      evidenceLevel: "source_code",
      semanticSupport: relatedSemanticSupport({
        source: spec.name.includes(":") ? spec.name.slice(spec.name.indexOf(":") + 1) : spec.name,
        semanticSupport,
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [
        ...spec.skillInvocations.map((skill) => `Claude Skill invocation requires Codex orchestration adapter: ${skill}`),
        ...spec.taskSpawns.map((task) => `Claude Task/subagent invocation requires Codex spawn-agent adapter: ${task}`),
        ...(spec.todoState ? ["Claude TodoWrite state requires Codex checklist/artifact adapter"] : []),
      ],
      validationNotes: ["Claude-shaped orchestration references are detected but not native Codex runtime parity"],
    });
  }

  if (input.includeAgentsInCodex ?? true) {
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
        supportStatus: "native",
        evidenceLevel: "official",
        semanticSupport: [
          ...rendered.semanticSupport,
          ...relatedSemanticSupport({ source: agent.name, semanticSupport }),
        ],
        droppedSemantics: rendered.droppedSemantics,
        adapterRequiredSemantics: [
          ...rendered.adapterRequiredSemantics,
          ...nonNativeSemanticSupport(relatedSemanticSupport({ source: agent.name, semanticSupport }))
            .map((support) => support.source),
        ],
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
      semanticSupport: input.content.agentFiles.flatMap((agent) => materialSupport({
        provider: "codex",
        semanticKind: "agent_role",
        source: agent.name,
        supportStatus: "unsupported",
        notes: ["Codex agent role material projection was explicitly disabled"],
      })),
      droppedSemantics: ["agents omitted because sync.providers.codex.includeAgents is false"],
      adapterRequiredSemantics: [],
      validationNotes: ["Codex agent projection was explicitly disabled"],
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
    semanticSupport: materialSupport({
      provider: "codex",
      semanticKind: "settings",
      source: input.sourcePlugin.dirName,
      supportStatus: "adapter_required",
      notes: ["RAWR registry metadata is direct-sync ownership material, not official Codex plugin install parity"],
    }),
    droppedSemantics: [],
    adapterRequiredSemantics: ["registry records RAWR ownership and drift metadata outside Codex official plugin install"],
    validationNotes: ["RAWR owns direct mirror conflict detection, GC, and stale retirement metadata"],
  });

  return projections;
}

async function buildClaudeProjections(input: {
  provider: "claude";
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  homes: string[];
  includeAgentsInClaude?: boolean;
  resources: AgentConfigSyncResources;
}): Promise<ProviderProjection[]> {
  const pathOps = input.resources.path;
  const pluginDirs = input.homes.map((home) => pathOps.join(home, "plugins", input.sourcePlugin.dirName));
  const projections: ProviderProjection[] = [];
  const semanticSupport = await buildProviderSemanticSupport({
    provider: "claude",
    content: input.content,
    resources: input.resources,
  });

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
      semanticSupport: materialSupport({
        provider: "claude",
        semanticKind: "artifact_state",
        source: workflow.name,
        supportStatus: "native",
        evidenceLevel: "official",
        notes: ["Mapped to Claude plugin commands"],
      }),
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
      semanticSupport: [
        ...materialSupport({
          provider: "claude",
          semanticKind: "skill_step",
          source: skill.name,
          supportStatus: "native",
          evidenceLevel: "official",
          notes: ["Mapped to Claude plugin skills"],
        }),
        ...relatedSemanticSupport({ source: skill.name, semanticSupport }),
      ],
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
      semanticSupport: materialSupport({
        provider: "claude",
        semanticKind: "bootstrap",
        source: script.name,
        supportStatus: "native",
        evidenceLevel: "official",
        notes: ["Mapped to Claude plugin scripts"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Mapped to Claude plugin scripts"],
    });
  }

  for (const hook of input.content.hooks ?? []) {
    projections.push({
      provider: "claude",
      materialKind: "hook",
      source: hook.name,
      sourcePath: hook.absPath,
      targetPaths: pluginDirs.map((dir) => pathOps.join(dir, "hooks", hook.name)),
      distributionMode: "local_plugin_install",
      supportStatus: "adapter_required",
      evidenceLevel: "official",
      semanticSupport: materialSupport({
        provider: "claude",
        semanticKind: "hook",
        source: hook.name,
        supportStatus: "adapter_required",
        evidenceLevel: "official",
        notes: ["Claude hook settings require explicit settings merge/install behavior"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: ["Claude hook settings require explicit settings merge/install behavior"],
      validationNotes: ["Hook material is detected and reported instead of being silently ignored"],
    });
  }

  for (const mcpServer of input.content.mcpServers ?? []) {
    projections.push({
      provider: "claude",
      materialKind: "mcp",
      source: mcpServer.name,
      sourcePath: mcpServer.absPath,
      targetPaths: pluginDirs.map((dir) => pathOps.join(dir, "mcp", mcpServer.name)),
      distributionMode: "local_plugin_install",
      supportStatus: "adapter_required",
      evidenceLevel: "official",
      semanticSupport: materialSupport({
        provider: "claude",
        semanticKind: "mcp_server",
        source: mcpServer.name,
        supportStatus: "adapter_required",
        evidenceLevel: "official",
        notes: ["Claude MCP/settings wiring is provider-specific and must be installed explicitly"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: ["Claude MCP/settings wiring is provider-specific and must be installed explicitly"],
      validationNotes: ["MCP material is detected and reported instead of being silently ignored"],
    });
  }

  for (const setting of input.content.settings ?? []) {
    projections.push({
      provider: "claude",
      materialKind: "settings",
      source: setting.name,
      sourcePath: setting.absPath,
      targetPaths: pluginDirs.map((dir) => pathOps.join(dir, "settings", setting.name)),
      distributionMode: "local_plugin_install",
      supportStatus: "adapter_required",
      evidenceLevel: "official",
      semanticSupport: materialSupport({
        provider: "claude",
        semanticKind: "settings",
        source: setting.name,
        supportStatus: "adapter_required",
        evidenceLevel: "official",
        notes: ["Claude settings must merge as managed fragments without overwriting unmanaged settings"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: ["Claude settings must merge as managed fragments without overwriting unmanaged settings"],
      validationNotes: ["Settings are modeled so status can distinguish sync from runtime install"],
    });
  }

  for (const asset of input.content.assets ?? []) {
    projections.push({
      provider: "claude",
      materialKind: "asset",
      source: asset.name,
      sourcePath: asset.absPath,
      targetPaths: pluginDirs.map((dir) => pathOps.join(dir, "assets", asset.name)),
      distributionMode: "local_plugin_install",
      supportStatus: "unknown",
      evidenceLevel: "inferred",
      semanticSupport: materialSupport({
        provider: "claude",
        semanticKind: "asset",
        source: asset.name,
        supportStatus: "unknown",
        evidenceLevel: "inferred",
        notes: ["Asset runtime semantics depend on the consumer surface"],
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Assets are package/install surface material"],
    });
  }

  for (const spec of input.content.orchestration ?? []) {
    projections.push({
      provider: "claude",
      materialKind: "orchestration",
      source: spec.name,
      sourcePath: spec.absPath,
      targetPaths: [],
      distributionMode: "local_plugin_install",
      supportStatus: "native",
      evidenceLevel: "source_code",
      semanticSupport: relatedSemanticSupport({
        source: spec.name.includes(":") ? spec.name.slice(spec.name.indexOf(":") + 1) : spec.name,
        semanticSupport,
      }),
      droppedSemantics: [],
      adapterRequiredSemantics: [],
      validationNotes: ["Claude skill/task orchestration references are preserved in source Markdown"],
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
        semanticSupport: [
          ...materialSupport({
            provider: "claude",
            semanticKind: "agent_role",
            source: agent.name,
            supportStatus: "native",
            evidenceLevel: "official",
            notes: ["Mapped to Claude plugin agents"],
          }),
          ...relatedSemanticSupport({ source: agent.name, semanticSupport }),
        ],
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
    semanticSupport: materialSupport({
      provider: "claude",
      semanticKind: "settings",
      source: input.sourcePlugin.dirName,
      supportStatus: "native",
      evidenceLevel: "official",
      notes: ["Claude local plugin metadata and RAWR sync manifest are managed together"],
    }),
    droppedSemantics: [],
    adapterRequiredSemantics: [],
    validationNotes: ["Claude local plugin metadata and RAWR sync manifest are managed together"],
  });

  return projections;
}
