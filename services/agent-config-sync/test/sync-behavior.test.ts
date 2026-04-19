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

    const preview = await client.planning.previewSync({
      sourcePlugin,
      content,
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
      force: true,
      gc: true,
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
});
