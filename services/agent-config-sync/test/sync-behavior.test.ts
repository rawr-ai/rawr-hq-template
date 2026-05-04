import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import {
  createClientOptions,
  createNodeTestResources,
  makeParityWorkspace,
  makeProviderHomes,
  snapshotProviderState,
} from "./helpers";

const tempDirs: string[] = [];

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
      supportStatus: "adapter_required",
      droppedSemantics: ["tools", "hooks", "mcpServers", "permissionMode", "skills", "model"],
    }));

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

  it("projects Codex direct mirror material without claiming unsupported hook parity", async () => {
    const workspace = await makeParityWorkspace();
    const { codexHome } = await makeProviderHomes();
    tempDirs.push(workspace.workspaceRoot, codexHome);
    await fs.mkdir(path.join(workspace.pluginRoot, "hooks"), { recursive: true });
    await fs.writeFile(path.join(workspace.pluginRoot, "hooks", "pre-tool-use.json"), "{\"type\":\"PreToolUse\"}\n", "utf8");
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
    await expect(fs.readFile(path.join(codexHome, "skills", "demo-skill", "SKILL.md"), "utf8")).resolves.toBe("# Demo Skill\n");
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
    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins[0]).toMatchObject({
      name: "plugin-demo",
      prompts: ["hello"],
      skills: ["demo-skill"],
      scripts: ["plugin-demo--demo.sh"],
      agents: ["researcher"],
    });
  });

  it("keeps Codex agent projection opt-in and records unsupported projection metadata when disabled", async () => {
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
    const skillDir = path.join(codexHome, "skills", "demo-skill");
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
