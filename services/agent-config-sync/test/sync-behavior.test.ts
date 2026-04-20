import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { createClientOptions, createNodeTestResources } from "./helpers";

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
