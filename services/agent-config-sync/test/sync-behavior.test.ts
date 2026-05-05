import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { getCodexRuntimeSkillsDir } from "../src/service/shared/repositories/codex-runtime-paths";
import {
  createClientOptions,
  createNodeTestResources,
  makeParityWorkspace,
  makeHyperresearchLikeWorkspace,
  makeProviderHomes,
  snapshotProviderState,
} from "./helpers";

const tempDirs: string[] = [];

async function runNodeWithInput(scriptPath: string, input: string): Promise<string> {
  return runCommandWithInput(`node ${JSON.stringify(scriptPath)}`, input);
}

async function runCommandWithInput(command: string, input: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn("zsh", ["-lc", command], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `command exited with ${code}: ${command}`));
    });
    child.stdin.end(input);
  });
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeSourcePlugin() {
  const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-service-source-"));
  tempDirs.push(sourceRoot);
  await fs.mkdir(path.join(sourceRoot, "workflows"), { recursive: true });
  await fs.writeFile(path.join(sourceRoot, "workflows", "hello.md"), "# hello\n", "utf8");

  return {
    sourceRoot,
    sourcePlugin: {
      ref: "demo",
      absPath: sourceRoot,
      dirName: "demo",
      packageName: "@rawr/plugin-demo",
    },
    content: {
      workflowFiles: [{ name: "hello", absPath: path.join(sourceRoot, "workflows", "hello.md") }],
      skills: [],
      scripts: [],
      agentFiles: [],
    },
  };
}

describe("agent-config-sync service behavior", () => {
  it("maps RAWR Codex homes to the sibling Codex runtime user skill root", () => {
    const fakeHome = path.join(os.tmpdir(), "agent-config-sync-runtime-home");

    expect(getCodexRuntimeSkillsDir(path.join(fakeHome, ".codex-rawr"), path)).toBe(
      path.join(fakeHome, ".agents", "skills"),
    );
    expect(getCodexRuntimeSkillsDir(path.join(fakeHome, ".codex"), path)).toBe(
      path.join(fakeHome, ".agents", "skills"),
    );
    expect(getCodexRuntimeSkillsDir(path.join(fakeHome, "custom-codex"), path)).toBe(
      path.join(fakeHome, "custom-codex", ".agents", "skills"),
    );
  });

  it("plans and applies Codex sync through service-owned execution behavior", async () => {
    const { sourcePlugin, content } = await makeSourcePlugin();
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-service-codex-"));
    tempDirs.push(codexHome);

    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const preview = await client.execution.runSync({
      sourcePlugin,
      content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
      dryRun: true,
    }, { context: { invocation: { traceId: "test-preview" } } });

    expect(preview.targets[0]?.items.map((item) => item.action)).toContain("planned");
    await expect(fs.readFile(path.join(codexHome, "prompts", "hello.md"), "utf8")).rejects.toThrow();

    const applied = await client.execution.runSync({
      sourcePlugin,
      content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-apply" } } });

    expect(applied.ok).toBe(true);
    await expect(fs.readFile(path.join(codexHome, "prompts", "hello.md"), "utf8")).resolves.toBe("# hello\n");
    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins[0]).toMatchObject({ name: "demo", prompts: ["hello"], managed_by: "@rawr/plugin-plugins" });
  });

  it("projects RAWR markdown agents into standalone Codex TOML with dropped Claude-only semantics", async () => {
    const workspace = await makeParityWorkspace({
      agentFrontmatter: {
        description: "Research helper",
        tools: ["Read", "Write"],
        hooks: ["PreToolUse"],
        mcpServers: { research: {} },
        permissionMode: "acceptEdits",
        skills: ["deep-search"],
        model: "claude-opus-4-1",
      },
    });
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const dryRunBefore = await snapshotProviderState(codexHome);
    const preview = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      includeAgentsInCodex: true,
      force: true,
      gc: true,
      dryRun: true,
    }, { context: { invocation: { traceId: "test-codex-agent-preview" } } });

    expect(await snapshotProviderState(codexHome)).toEqual(dryRunBefore);
    expect(preview.projections).toContainEqual(expect.objectContaining({
      provider: "codex",
      materialKind: "agent",
      source: "researcher",
      supportStatus: "legacy_or_deprecated",
      droppedSemantics: ["tools", "hooks", "mcpServers", "permissionMode", "skills", "model"],
    }));
    const previewAgentProjection = preview.projections.find((projection) =>
      projection.provider === "codex" &&
      projection.materialKind === "agent" &&
      projection.source === "researcher"
    );
    expect(previewAgentProjection?.semanticSupport).toEqual(expect.arrayContaining([
      expect.objectContaining({ semanticKind: "agent_role", supportStatus: "legacy_or_deprecated" }),
      expect.objectContaining({ semanticKind: "tool_lock", supportStatus: "unsupported" }),
      expect.objectContaining({ semanticKind: "model_selection", supportStatus: "adapter_required" }),
      expect.objectContaining({ semanticKind: "mcp_server", supportStatus: "unsupported" }),
    ]));

    const applied = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      includeAgentsInCodex: true,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-agent-apply" } } });

    expect(applied.ok).toBe(true);
    const tomlPath = path.join(codexHome, "agents", "researcher.toml");
    const toml = parseToml(await fs.readFile(tomlPath, "utf8")) as Record<string, unknown>;
    expect(toml).toMatchObject({
      name: "researcher",
      description: "Research helper",
      developer_instructions: "Follow the evidence.",
    });
    expect(toml).not.toHaveProperty("tools");
    expect(toml).not.toHaveProperty("model");

    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins[0]).toMatchObject({ name: "plugin-demo", agents: ["researcher"] });
  });

  it("keeps material sync IN_SYNC while reporting Codex semantic support residuals", async () => {
    const workspace = await makeParityWorkspace({
      agentFrontmatter: {
        description: "Research helper",
        tools: ["Read", "Task"],
        mcpServers: { research: {} },
        model: "claude-opus-4-1",
      },
    });
    await fs.writeFile(
      workspace.content.agentFiles[0]!.absPath,
      "---\ndescription: \"Research helper\"\ntools: [\"Read\", \"Task\"]\nmcpServers:\n  research: {}\nmodel: \"claude-opus-4-1\"\n---\nTask(subagent_type: \"researcher\", prompt: \"map evidence\")\n",
      "utf8",
    );
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const client = createClient(createClientOptions({
      repoRoot: workspace.workspaceRoot,
      resources: createNodeTestResources(),
    }));

    await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      includeAgentsInCodex: true,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-semantic-residual-apply" } } });

    const plan = await client.planning.planWorkspaceSync({
      cwd: workspace.workspaceRoot,
      sourcePaths: [],
      includeMetadata: true,
      scope: "toolkit",
      agent: "codex",
      targetHomeCandidates: {
        codexHomesFromFlags: [codexHome],
        claudeHomesFromFlags: [],
        codexHomesFromEnvironment: [],
        claudeHomesFromEnvironment: [],
        codexHomesFromConfig: [],
        claudeHomesFromConfig: [],
        codexDefaultHomes: [],
        claudeDefaultHomes: [],
      },
      includeAgentsInCodex: true,
      includeAgentsInClaude: true,
      fullSyncPolicy: {
        agent: "codex",
        scope: "toolkit",
        coworkEnabled: true,
        claudeInstallEnabled: true,
        claudeEnableEnabled: true,
        installReconcileEnabled: true,
        retireOrphansEnabled: true,
        force: true,
        gc: true,
        allowPartial: true,
      },
    }, { context: { invocation: { traceId: "test-codex-semantic-residual-plan" } } });

    expect(plan.assessment.status).toBe("IN_SYNC");
    expect(plan.assessment.summary.totalSemanticSupportResiduals).toBeGreaterThan(0);
    expect(plan.assessment.plugins[0]?.semanticSupportResiduals).toEqual(expect.arrayContaining([
      expect.objectContaining({ materialKind: "agent", semanticKind: "tool_lock", supportStatus: "unsupported" }),
      expect.objectContaining({ materialKind: "agent", semanticKind: "model_selection", supportStatus: "adapter_required" }),
      expect.objectContaining({ materialKind: "agent", semanticKind: "task_spawn", supportStatus: "adapter_required" }),
    ]));
  });

  it("does not abort Codex projection when Claude agent frontmatter is malformed", async () => {
    const workspace = await makeParityWorkspace();
    await fs.writeFile(
      workspace.content.agentFiles[0]!.absPath,
      "---\ndescription: Use this agent when you need key: value\n---\nKeep going.\n",
      "utf8",
    );
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      includeAgentsInCodex: true,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-agent-malformed-frontmatter" } } });

    expect(result.ok).toBe(true);
    expect(result.projections).toContainEqual(expect.objectContaining({
      provider: "codex",
      materialKind: "agent",
      source: "researcher",
      supportStatus: "legacy_or_deprecated",
      droppedSemantics: ["unparseable_frontmatter"],
    }));
    expect(result.projections).toContainEqual(expect.objectContaining({
      provider: "codex",
      materialKind: "agent",
      source: "researcher",
      semanticSupport: expect.arrayContaining([
        expect.objectContaining({ semanticKind: "settings", supportStatus: "unknown" }),
      ]),
    }));
    const toml = parseToml(await fs.readFile(path.join(codexHome, "agents", "researcher.toml"), "utf8")) as Record<string, unknown>;
    expect(toml).toMatchObject({
      name: "researcher",
      description: "Demo plugin",
      developer_instructions: "Keep going.",
    });
  });

  it("projects Codex generic destination material without provider-deployment claims", async () => {
    const workspace = await makeParityWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      includeAgentsInCodex: true,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-direct-supported-material" } } });

    expect(result.ok).toBe(true);
    await expect(fs.readFile(path.join(codexHome, "prompts", "hello.md"), "utf8")).resolves.toBe("# hello\n");
    await expect(fs.stat(path.join(codexHome, "skills", "demo-skill"))).rejects.toThrow();
    await expect(fs.readFile(path.join(codexHome, ".agents", "skills", "demo-skill", "SKILL.md"), "utf8")).resolves.toBe("# Demo Skill\n");
    await expect(fs.readFile(path.join(codexHome, "scripts", "plugin-demo--demo.sh"), "utf8")).resolves.toBe("echo demo\n");
    await expect(fs.readFile(path.join(codexHome, "agents", "researcher.toml"), "utf8")).resolves.toContain("developer_instructions");
    await expect(fs.stat(path.join(codexHome, "hooks"))).rejects.toThrow();
    expect(result.projections.map((projection) => projection.materialKind)).toEqual(expect.arrayContaining([
      "workflow",
      "skill",
      "script",
      "agent",
      "plugin_metadata",
    ]));
    expect(result.projections.some((projection) => projection.materialKind === "hook")).toBe(false);
    expect(result.projections.some((projection) => (projection.distributionMode as string) === "direct_mirror")).toBe(false);
    for (const projection of result.projections.filter((entry) => entry.distributionMode === "destination_projection")) {
      expect(projection.supportStatus).not.toBe("native");
    }
    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins[0]).toMatchObject({
      name: "plugin-demo",
      prompts: ["hello"],
      skills: ["demo-skill"],
      scripts: ["plugin-demo--demo.sh"],
      agents: ["researcher"],
    });
  });

  it("records explicit Codex agent disablement as unsupported projection metadata", async () => {
    const workspace = await makeParityWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      includeAgentsInCodex: false,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-agent-opt-in" } } });

    expect(result.ok).toBe(true);
    await expect(fs.readFile(path.join(codexHome, "agents", "researcher.toml"), "utf8")).rejects.toThrow();
    expect(result.projections).toContainEqual(expect.objectContaining({
      provider: "codex",
      materialKind: "agent",
      source: "1 agent(s)",
      supportStatus: "unsupported",
      distributionMode: "operator_only",
    }));
    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins[0]).toMatchObject({ name: "plugin-demo", agents: [] });
  });

  it("includes Codex agents by default for parity runs", async () => {
    const workspace = await makeParityWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-agent-default-enabled" } } });

    expect(result.ok).toBe(true);
    await expect(fs.readFile(path.join(codexHome, "agents", "researcher.toml"), "utf8")).resolves.toContain("Research helper");
    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins[0]).toMatchObject({ name: "plugin-demo", agents: ["researcher"] });
  });

  it("scans Hyperresearch-like hooks, MCP, settings, assets, and orchestration as explicit material", async () => {
    const workspace = await makeHyperresearchLikeWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const client = createClient(createClientOptions({
      repoRoot: workspace.workspaceRoot,
      resources: createNodeTestResources(),
    }));

    const plan = await client.planning.planWorkspaceSync({
      cwd: workspace.workspaceRoot,
      sourcePaths: [],
      includeMetadata: true,
      scope: "toolkit",
      agent: "codex",
      targetHomeCandidates: {
        codexHomesFromFlags: [codexHome],
        claudeHomesFromFlags: [],
        codexHomesFromEnvironment: [],
        claudeHomesFromEnvironment: [],
        codexHomesFromConfig: [],
        claudeHomesFromConfig: [],
        codexDefaultHomes: [],
        claudeDefaultHomes: [],
      },
      includeAgentsInClaude: true,
      fullSyncPolicy: {
        agent: "codex",
        scope: "toolkit",
        coworkEnabled: true,
        claudeInstallEnabled: true,
        claudeEnableEnabled: true,
        installReconcileEnabled: true,
        retireOrphansEnabled: true,
        force: true,
        gc: true,
        allowPartial: true,
      },
    }, { context: { invocation: { traceId: "test-hyperresearch-like-scan" } } });

    const content = plan.syncable[0]?.content;
    expect(content?.hooks?.map((item) => item.name)).toContain("pre-tool-use.mjs");
    expect(content?.hooks?.map((item) => item.name)).not.toContain("README.md");
    expect(content?.hookConfigs?.map((item) => item.name)).toContain("hooks.json");
    expect(content?.mcpServers?.map((item) => item.name)).toContain("synthetic-research.mjs");
    expect(content?.settings?.map((item) => item.name)).toContain("codex/config.toml");
    expect(content?.assets?.map((item) => item.name)).toContain("icon.txt");
    expect(content?.orchestration?.map((item) => item.name)).toEqual(expect.arrayContaining([
      "skill:synthetic-hyperresearch",
      "skill:synthetic-hyperresearch-1-decompose",
    ]));
    expect(plan.assessment.summary.totalProjectionResiduals).toBeGreaterThan(0);
    expect(plan.assessment.summary.totalSemanticSupportResiduals).toBeGreaterThan(0);
    const residualKinds = plan.assessment.plugins[0]?.materialProjectionResiduals.map((item) => item.materialKind) ?? [];
    expect(residualKinds).toEqual(expect.arrayContaining([
      "asset",
      "orchestration",
    ]));
    const semanticKinds = plan.assessment.plugins[0]?.semanticSupportResiduals.map((item) => item.semanticKind) ?? [];
    expect(semanticKinds).toEqual(expect.arrayContaining([
      "skill_invocation",
      "parallel_task_join",
      "todo_state",
      "tool_lock",
      "model_selection",
      "mcp_server",
    ]));
    expect(residualKinds).not.toContain("hook");
    expect(residualKinds).not.toContain("mcp");
    expect(residualKinds).not.toContain("settings");
  });

  it("copies hook scripts and preserves modeled Codex hook lifecycle semantics", async () => {
    const workspace = await makeHyperresearchLikeWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));
    await fs.writeFile(path.join(codexHome, "hooks.json"), JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: "Read",
            hooks: [{ type: "command", command: "echo manual", statusMessage: "manual hook" }],
          },
        ],
      },
    }, null, 2), "utf8");

    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-hook-material" } } });

    expect(result.projections).toContainEqual(expect.objectContaining({
      provider: "codex",
      materialKind: "hook",
      supportStatus: "legacy_or_deprecated",
      source: "pre-tool-use.mjs",
    }));
    const hookPath = path.join(codexHome, "hooks", "rawr", "synthetic-hyperresearch", "pre-tool-use.mjs");
    const mcpPath = path.join(codexHome, "mcp", "rawr", "synthetic-hyperresearch", "synthetic-research.mjs");
    await expect(fs.readFile(hookPath, "utf8")).resolves.toContain("hook_event_name");
    await expect(fs.readFile(mcpPath, "utf8")).resolves.toContain("synthetic_search");
    const hooksJson = JSON.parse(await fs.readFile(path.join(codexHome, "hooks.json"), "utf8"));
    expect(hooksJson.hooks.PreToolUse).toEqual(expect.arrayContaining([
      expect.objectContaining({
        matcher: "Read",
        hooks: [expect.objectContaining({ statusMessage: "manual hook" })],
      }),
    ]));
    const managedHookGroup = hooksJson.hooks.PreToolUse.find((group: any) => group.matcher === "Bash");
    expect(managedHookGroup).toBeDefined();
    expect(managedHookGroup.hooks[0]).toMatchObject({
      type: "command",
      statusMessage: "RAWR synthetic-hyperresearch: hooks.json#1",
    });
    expect(managedHookGroup.hooks[0].command).toContain(JSON.stringify(hookPath));

    const stdout = await runCommandWithInput(
      managedHookGroup.hooks[0].command,
      JSON.stringify({ hook_event_name: "PreToolUse" }),
    );
    expect(JSON.parse(stdout)).toEqual({ ok: true, received: "PreToolUse" });

    const configToml = await fs.readFile(path.join(codexHome, "config.toml"), "utf8");
    expect(configToml).toContain("[features]");
    expect(configToml).toContain("codex_hooks = true");
    expect(configToml).toContain("synthetic_hyperresearch_synthetic_research");
    expect(configToml).toContain(mcpPath);
    expect(configToml).not.toContain(workspace.pluginRoot);

    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins[0]).toMatchObject({
      name: "synthetic-hyperresearch",
      hookScripts: ["pre-tool-use.mjs"],
      hookConfigs: ["hooks.json"],
      mcpServers: ["synthetic-research.mjs"],
    });

    await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: { ...workspace.content, mcpServers: [] },
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-mcp-gc" } } });

    await expect(fs.stat(mcpPath)).rejects.toThrow();
    const prunedConfigToml = await fs.readFile(path.join(codexHome, "config.toml"), "utf8");
    expect(prunedConfigToml).not.toContain("synthetic_hyperresearch_synthetic_research");
    const prunedRegistry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(prunedRegistry.plugins[0]).toMatchObject({ name: "synthetic-hyperresearch", mcpServers: [] });
  });

  it("garbage-collects stale managed Codex agents while preserving unmanaged neighbors", async () => {
    const workspace = await makeParityWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    await fs.mkdir(path.join(codexHome, "agents"), { recursive: true });
    await fs.mkdir(path.join(codexHome, "plugins"), { recursive: true });
    await fs.writeFile(path.join(codexHome, "agents", "old-agent.toml"), "name = \"old-agent\"\n", "utf8");
    await fs.writeFile(path.join(codexHome, "agents", "unmanaged.toml"), "name = \"unmanaged\"\n", "utf8");
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify({
        plugins: [{
          name: "plugin-demo",
          prompts: [],
          skills: [],
          scripts: [],
          agents: ["old-agent"],
          managed_by: "@rawr/plugin-plugins",
          source_plugin_path: workspace.pluginRoot,
        }],
      }, null, 2),
      "utf8",
    );

    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));
    const content = { ...workspace.content, agentFiles: [] };
    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      includeAgentsInCodex: true,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-codex-agent-gc" } } });

    expect(result.ok).toBe(true);
    await expect(fs.readFile(path.join(codexHome, "agents", "old-agent.toml"), "utf8")).rejects.toThrow();
    await expect(fs.readFile(path.join(codexHome, "agents", "unmanaged.toml"), "utf8")).resolves.toBe("name = \"unmanaged\"\n");
  });

  it("replaces managed skill directories so removed files do not survive convergence", async () => {
    const workspace = await makeParityWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const skillDir = path.join(codexHome, ".agents", "skills", "demo-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), "# stale\n", "utf8");
    await fs.writeFile(path.join(skillDir, "removed.md"), "stale\n", "utf8");

    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));
    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-skill-dir-replacement" } } });

    expect(result.ok).toBe(true);
    await expect(fs.readFile(path.join(skillDir, "SKILL.md"), "utf8")).resolves.toBe("# Demo Skill\n");
    await expect(fs.stat(path.join(skillDir, "removed.md"))).rejects.toThrow();
  });

  it("reports and removes registry-managed retired Codex root skill copies while preserving runtime and unclaimed root skills", async () => {
    const workspace = await makeParityWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    const retiredRootSkill = path.join(codexHome, "skills", "demo-skill");
    const unclaimedRootSkill = path.join(codexHome, "skills", "unclaimed-skill");
    const runtimeSkill = path.join(codexHome, ".agents", "skills", "demo-skill");
    await Promise.all([
      fs.mkdir(retiredRootSkill, { recursive: true }),
      fs.mkdir(unclaimedRootSkill, { recursive: true }),
      fs.mkdir(path.join(codexHome, "plugins"), { recursive: true }),
    ]);
    await fs.writeFile(path.join(retiredRootSkill, "SKILL.md"), "# stale root\n", "utf8");
    await fs.writeFile(path.join(unclaimedRootSkill, "SKILL.md"), "# keep\n", "utf8");
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify({
        plugins: [
          {
            name: "plugin-demo",
            prompts: [],
            skills: ["demo-skill"],
            scripts: [],
            agents: [],
            managed_by: "@rawr/plugin-plugins",
            source_plugin_path: workspace.pluginRoot,
          },
          {
            name: "other-plugin",
            prompts: [],
            skills: ["demo-skill"],
            scripts: [],
            agents: [],
            managed_by: "@rawr/plugin-plugins",
            source_plugin_path: path.join(workspace.workspaceRoot, "plugins", "cli", "other-plugin"),
          },
        ],
      }, null, 2),
      "utf8",
    );

    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));
    const preview = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
      dryRun: true,
    }, { context: { invocation: { traceId: "test-retired-root-skill-preview" } } });

    expect(preview.targets[0]?.items).toContainEqual(expect.objectContaining({
      action: "planned",
      kind: "skill",
      target: retiredRootSkill,
      message: "gc orphan",
    }));
    await expect(fs.readFile(path.join(retiredRootSkill, "SKILL.md"), "utf8")).resolves.toBe("# stale root\n");

    const applied = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-retired-root-skill-apply" } } });

    expect(applied.ok).toBe(true);
    await expect(fs.stat(retiredRootSkill)).rejects.toThrow();
    await expect(fs.readFile(path.join(runtimeSkill, "SKILL.md"), "utf8")).resolves.toBe("# Demo Skill\n");
    await expect(fs.readFile(path.join(unclaimedRootSkill, "SKILL.md"), "utf8")).resolves.toBe("# keep\n");
  });

  it("resolves provider overlay content through the service with primitive file resources", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-provider-content-"));
    tempDirs.push(sourceRoot);
    await fs.mkdir(path.join(sourceRoot, "base", "workflows"), { recursive: true });
    await fs.mkdir(path.join(sourceRoot, "providers", "claude", "workflows"), { recursive: true });
    await fs.mkdir(path.join(sourceRoot, "providers", "claude", "scripts"), { recursive: true });
    await fs.writeFile(
      path.join(sourceRoot, "package.json"),
      JSON.stringify({
        name: "@rawr/plugin-provider-content",
        rawr: {
          pluginContent: {
            version: 1,
            contentRoot: "base",
            providers: {
              claude: {
                overlayRoot: "providers/claude",
              },
            },
          },
        },
      }),
      "utf8",
    );
    await fs.writeFile(path.join(sourceRoot, "base", "workflows", "shared.md"), "# base\n", "utf8");
    await fs.writeFile(path.join(sourceRoot, "providers", "claude", "workflows", "shared.md"), "# claude\n", "utf8");
    await fs.writeFile(path.join(sourceRoot, "providers", "claude", "scripts", "claude.sh"), "echo claude\n", "utf8");

    const resources = createNodeTestResources();
    expect("sources" in resources).toBe(false);
    const client = createClient(createClientOptions({ resources }));
    const sourcePlugin = {
      ref: "provider-content",
      absPath: sourceRoot,
      dirName: "provider-content",
      packageName: "@rawr/plugin-provider-content",
    };

    const resolved = await client.execution.resolveProviderContent({
      agent: "claude",
      sourcePlugin,
      base: {
        workflowFiles: [{ name: "shared", absPath: path.join(sourceRoot, "base", "workflows", "shared.md") }],
        skills: [],
        scripts: [],
        agentFiles: [],
      },
    }, { context: { invocation: { traceId: "test-provider-content" } } });

    expect(resolved.workflowFiles).toEqual([
      { name: "shared", absPath: path.join(sourceRoot, "providers", "claude", "workflows", "shared.md") },
    ]);
    expect(resolved.scripts).toEqual([
      { name: "claude.sh", absPath: path.join(sourceRoot, "providers", "claude", "scripts", "claude.sh") },
    ]);
  });

  it("preserves base-disabled material when provider overlay omits an include mask", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-provider-include-"));
    tempDirs.push(sourceRoot);
    await fs.mkdir(path.join(sourceRoot, "base", "workflows"), { recursive: true });
    await fs.mkdir(path.join(sourceRoot, "providers", "codex", "workflows"), { recursive: true });
    await fs.writeFile(
      path.join(sourceRoot, "package.json"),
      JSON.stringify({
        name: "@rawr/plugin-provider-include",
        rawr: {
          pluginContent: {
            version: 1,
            contentRoot: "base",
            include: { workflows: false, skills: true, scripts: true, agents: true },
            providers: {
              codex: {
                overlayRoot: "providers/codex",
              },
            },
          },
        },
      }),
      "utf8",
    );
    await fs.writeFile(path.join(sourceRoot, "base", "workflows", "base.md"), "# base\n", "utf8");
    await fs.writeFile(path.join(sourceRoot, "providers", "codex", "workflows", "codex.md"), "# codex\n", "utf8");

    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));
    const resolved = await client.execution.resolveProviderContent({
      agent: "codex",
      sourcePlugin: {
        ref: "provider-include",
        absPath: sourceRoot,
        dirName: "provider-include",
        packageName: "@rawr/plugin-provider-include",
      },
      base: {
        workflowFiles: [],
        skills: [],
        scripts: [],
        agentFiles: [],
      },
    }, { context: { invocation: { traceId: "test-provider-include-mask" } } });

    expect(resolved.workflowFiles).toEqual([]);
  });

  it("writes and reports Claude metadata at provider-native plugin paths", async () => {
    const workspace = await makeParityWorkspace();
    const { claudeHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, claudeHome);
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [],
      claudeHomes: [claudeHome],
      includeCodex: false,
      includeClaude: true,
      includeAgentsInClaude: true,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-claude-metadata-paths" } } });

    const pluginDir = path.join(claudeHome, "plugins", "plugin-demo");
    await expect(fs.readFile(path.join(pluginDir, ".claude-plugin", "plugin.json"), "utf8")).resolves.toContain("plugin-demo");
    await expect(fs.readFile(path.join(pluginDir, ".rawr-sync-manifest.json"), "utf8")).resolves.toContain("plugin-demo");
    expect(result.projections).toContainEqual(expect.objectContaining({
      provider: "claude",
      materialKind: "plugin_metadata",
      targetPaths: [
        path.join(pluginDir, ".claude-plugin", "plugin.json"),
        path.join(pluginDir, ".rawr-sync-manifest.json"),
      ],
    }));
  });

  it("stages Claude native plugin hooks, MCP, settings, and assets", async () => {
    const workspace = await makeHyperresearchLikeWorkspace();
    const { claudeHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, claudeHome);
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: workspace.content,
      codexHomes: [],
      claudeHomes: [claudeHome],
      includeCodex: false,
      includeClaude: true,
      includeAgentsInClaude: true,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-claude-native-hook-mcp-settings" } } });

    expect(result.ok).toBe(true);
    const pluginDir = path.join(claudeHome, "plugins", "synthetic-hyperresearch");
    await expect(fs.readFile(path.join(pluginDir, "hooks", "pre-tool-use.mjs"), "utf8")).resolves.toContain("hook_event_name");
    const hooksJson = JSON.parse(await fs.readFile(path.join(pluginDir, "hooks", "hooks.json"), "utf8"));
    expect(hooksJson.hooks.PreToolUse[0].hooks[0].command).toContain("${CLAUDE_PLUGIN_ROOT}/hooks/pre-tool-use.mjs");
    const mcpJson = JSON.parse(await fs.readFile(path.join(pluginDir, ".mcp.json"), "utf8"));
    expect(mcpJson.mcpServers.synthetic_research ?? mcpJson.mcpServers["synthetic-research"]).toBeDefined();
    await expect(fs.readFile(path.join(pluginDir, "settings", "codex", "config.toml"), "utf8")).resolves.toContain("codex_hooks");
    await expect(fs.readFile(path.join(pluginDir, "assets", "icon.txt"), "utf8")).resolves.toBe("synthetic asset\n");
    const pluginJson = JSON.parse(await fs.readFile(path.join(pluginDir, ".claude-plugin", "plugin.json"), "utf8"));
    expect(pluginJson).toMatchObject({
      hooks: "./hooks/hooks.json",
      mcpServers: "./.mcp.json",
    });
  });

  it("reports Claude GC item kinds for stale workflows and stale agents accurately", async () => {
    const workspace = await makeParityWorkspace();
    const { claudeHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, claudeHome);
    const pluginDir = path.join(claudeHome, "plugins", "plugin-demo");
    await fs.mkdir(path.join(pluginDir, "commands"), { recursive: true });
    await fs.mkdir(path.join(pluginDir, "agents"), { recursive: true });
    await fs.writeFile(path.join(pluginDir, "commands", "old-workflow.md"), "# old\n", "utf8");
    await fs.writeFile(path.join(pluginDir, "agents", "old-agent.md"), "# old\n", "utf8");
    await fs.writeFile(
      path.join(pluginDir, ".rawr-sync-manifest.json"),
      JSON.stringify({
        plugin: "plugin-demo",
        sourcePluginPath: workspace.pluginRoot,
        workflows: ["old-workflow"],
        skills: [],
        scripts: [],
        agents: ["old-agent"],
        syncedAt: "2026-01-01T00:00:00.000Z",
        managedBy: "@rawr/plugin-plugins",
      }, null, 2),
      "utf8",
    );

    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));
    const result = await client.execution.runSync({
      sourcePlugin: workspace.sourcePlugin,
      content: { workflowFiles: [], skills: [], scripts: [], agentFiles: [] },
      codexHomes: [],
      claudeHomes: [claudeHome],
      includeCodex: false,
      includeClaude: true,
      includeAgentsInClaude: true,
      force: true,
      gc: true,
      dryRun: false,
    }, { context: { invocation: { traceId: "test-claude-gc-kind-metadata" } } });

    expect(result.ok).toBe(true);
    await expect(fs.stat(path.join(pluginDir, "commands", "old-workflow.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(pluginDir, "agents", "old-agent.md"))).rejects.toThrow();
    expect(result.targets[0]?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "deleted", kind: "workflow", target: path.join(pluginDir, "commands", "old-workflow.md") }),
      expect.objectContaining({ action: "deleted", kind: "agent", target: path.join(pluginDir, "agents", "old-agent.md") }),
    ]));
  });

  it("retires stale managed Codex entries through service-owned retirement behavior", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-service-ws-"));
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-service-codex-"));
    tempDirs.push(workspaceRoot, codexHome);
    await fs.mkdir(path.join(codexHome, "prompts"), { recursive: true });
    await fs.mkdir(path.join(codexHome, "plugins"), { recursive: true });
    await fs.writeFile(path.join(codexHome, "prompts", "stale.md"), "# stale\n", "utf8");
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify({
        plugins: [{
          name: "stale",
          prompts: ["stale"],
          skills: [],
          scripts: [],
          managed_by: "@rawr/plugin-plugins",
          source_plugin_path: path.join(workspaceRoot, "plugins", "cli", "stale"),
        }],
      }, null, 2),
      "utf8",
    );

    const client = createClient(createClientOptions({
      repoRoot: workspaceRoot,
      resources: createNodeTestResources(),
    }));

    const result = await client.retirement.retireStaleManaged({
      workspaceRoot,
      scope: "all",
      codexHomes: [codexHome],
      claudeHomes: [],
      activePluginNames: [],
      dryRun: false,
    }, { context: { invocation: { traceId: "test-retire" } } });

    expect(result.ok).toBe(true);
    expect(result.stalePlugins).toEqual([{ agent: "codex", home: codexHome, plugin: "stale" }]);
    await expect(fs.readFile(path.join(codexHome, "prompts", "stale.md"), "utf8")).rejects.toThrow();
  });

  it("retires stale managed Codex hook, MCP, and runtime skill claims without deleting manual config", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-service-ws-"));
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-service-codex-"));
    tempDirs.push(workspaceRoot, codexHome);
    const retiredRootSkill = path.join(codexHome, "skills", "stale-skill");
    const runtimeSkill = path.join(codexHome, ".agents", "skills", "stale-skill");
    const hookScript = path.join(codexHome, "hooks", "rawr", "stale", "pre.mjs");
    const mcpServer = path.join(codexHome, "mcp", "rawr", "stale", "server.mjs");
    await Promise.all([
      fs.mkdir(retiredRootSkill, { recursive: true }),
      fs.mkdir(runtimeSkill, { recursive: true }),
      fs.mkdir(path.dirname(hookScript), { recursive: true }),
      fs.mkdir(path.dirname(mcpServer), { recursive: true }),
      fs.mkdir(path.join(codexHome, "plugins"), { recursive: true }),
    ]);
    await fs.writeFile(path.join(retiredRootSkill, "SKILL.md"), "# stale\n", "utf8");
    await fs.writeFile(path.join(runtimeSkill, "SKILL.md"), "# stale\n", "utf8");
    await fs.writeFile(hookScript, "console.log('stale')\n", "utf8");
    await fs.writeFile(mcpServer, "console.log('stale mcp')\n", "utf8");
    await fs.writeFile(path.join(codexHome, "config.toml"), [
      "[mcp_servers.stale_server]",
      "command = \"node\"",
      "args = [\"./mcp/rawr/stale/server.mjs\"]",
      "",
      "[mcp_servers.manual]",
      "command = \"manual\"",
      "",
    ].join("\n"), "utf8");
    await fs.writeFile(path.join(codexHome, "hooks.json"), JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: "Read",
            hooks: [{ type: "command", command: "echo manual", statusMessage: "manual hook" }],
          },
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: "node ./hooks/rawr/stale/pre.mjs", statusMessage: "RAWR stale: hooks.json#1" }],
          },
        ],
      },
    }, null, 2), "utf8");
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify({
        plugins: [{
          name: "stale",
          prompts: [],
          skills: ["stale-skill"],
          scripts: [],
          agents: [],
          hookScripts: ["pre.mjs"],
          hookConfigs: ["hooks.json"],
          mcpServers: ["server.mjs"],
          managed_by: "@rawr/plugin-plugins",
          source_plugin_path: path.join(workspaceRoot, "plugins", "cli", "stale"),
        }],
      }, null, 2),
      "utf8",
    );

    const client = createClient(createClientOptions({
      repoRoot: workspaceRoot,
      resources: createNodeTestResources(),
    }));
    const result = await client.retirement.retireStaleManaged({
      workspaceRoot,
      scope: "all",
      codexHomes: [codexHome],
      claudeHomes: [],
      activePluginNames: [],
      dryRun: false,
    }, { context: { invocation: { traceId: "test-retire-codex-runtime-material" } } });

    expect(result.ok).toBe(true);
    await expect(fs.stat(retiredRootSkill)).rejects.toThrow();
    await expect(fs.stat(runtimeSkill)).rejects.toThrow();
    await expect(fs.stat(hookScript)).rejects.toThrow();
    await expect(fs.stat(mcpServer)).rejects.toThrow();
    const hooksJson = JSON.parse(await fs.readFile(path.join(codexHome, "hooks.json"), "utf8"));
    expect(JSON.stringify(hooksJson)).toContain("manual hook");
    expect(JSON.stringify(hooksJson)).not.toContain("RAWR stale:");
    const configToml = await fs.readFile(path.join(codexHome, "config.toml"), "utf8");
    expect(configToml).not.toContain("stale_server");
    expect(configToml).toContain("[mcp_servers.manual]");
    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins).toEqual([]);
  });

  it("retires stale managed Claude entries through service-owned retirement behavior", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-service-ws-"));
    const claudeHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-service-claude-"));
    tempDirs.push(workspaceRoot, claudeHome);

    const pluginDir = path.join(claudeHome, "plugins", "stale");
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(path.join(pluginDir, "plugin.json"), JSON.stringify({ name: "stale" }), "utf8");
    await fs.writeFile(
      path.join(pluginDir, ".rawr-sync-manifest.json"),
      JSON.stringify({
        plugin: "stale",
        sourcePluginPath: path.join(workspaceRoot, "plugins", "agents", "stale"),
        managedBy: "@rawr/plugin-plugins",
      }, null, 2),
      "utf8",
    );
    await fs.mkdir(path.join(claudeHome, ".claude-plugin"), { recursive: true });
    await fs.writeFile(
      path.join(claudeHome, ".claude-plugin", "marketplace.json"),
      JSON.stringify({
        plugins: [
          { name: "stale" },
          { name: "active" },
        ],
      }, null, 2),
      "utf8",
    );

    const client = createClient(createClientOptions({
      repoRoot: workspaceRoot,
      resources: createNodeTestResources(),
    }));

    const result = await client.retirement.retireStaleManaged({
      workspaceRoot,
      scope: "all",
      codexHomes: [],
      claudeHomes: [claudeHome],
      activePluginNames: ["active"],
      dryRun: false,
    }, { context: { invocation: { traceId: "test-retire-claude" } } });

    expect(result.ok).toBe(true);
    expect(result.stalePlugins).toEqual([{ agent: "claude", home: claudeHome, plugin: "stale" }]);
    await expect(fs.stat(pluginDir)).rejects.toThrow();
    const marketplace = JSON.parse(
      await fs.readFile(path.join(claudeHome, ".claude-plugin", "marketplace.json"), "utf8"),
    ) as { plugins: Array<{ name: string }> };
    expect(marketplace.plugins).toEqual([{ name: "active" }]);
  });
});
