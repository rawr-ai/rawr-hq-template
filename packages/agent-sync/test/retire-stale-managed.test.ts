import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { retireStaleManagedPlugins } from "../src/lib/retire-stale-managed";

const tempDirs: string[] = [];

async function makeTemp(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("retireStaleManagedPlugins", () => {
  it("retires stale managed codex and claude plugins while preserving unmanaged content", async () => {
    const workspaceRoot = await makeTemp("agent-sync-ws-");
    const codexHome = await makeTemp("agent-sync-codex-");
    const claudeHome = await makeTemp("agent-sync-claude-");

    await fs.mkdir(path.join(codexHome, "plugins"), { recursive: true });
    await fs.mkdir(path.join(codexHome, "prompts"), { recursive: true });
    await fs.mkdir(path.join(codexHome, "skills", "old-plugin-skill"), { recursive: true });
    await fs.mkdir(path.join(codexHome, "skills", "unmanaged-skill"), { recursive: true });
    await fs.mkdir(path.join(codexHome, "scripts"), { recursive: true });
    await fs.writeFile(path.join(codexHome, "prompts", "old-flow.md"), "old", "utf8");
    await fs.writeFile(path.join(codexHome, "scripts", "old-plugin--tool.sh"), "old", "utf8");
    await fs.writeFile(path.join(codexHome, "scripts", "unmanaged.sh"), "keep", "utf8");
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify(
        {
          plugins: [
            {
              name: "old-plugin",
              managed_by: "@rawr/plugin-plugins",
              source_plugin_path: path.join(workspaceRoot, "plugins", "agents", "old-plugin"),
              prompts: ["old-flow"],
              skills: ["old-plugin-skill"],
              scripts: ["old-plugin--tool.sh"],
            },
            {
              name: "unmanaged",
              prompts: ["whatever"],
              skills: ["unmanaged-skill"],
              scripts: ["unmanaged.sh"],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const oldClaudeRoot = path.join(claudeHome, "plugins", "old-plugin");
    const unmanagedClaudeRoot = path.join(claudeHome, "plugins", "unmanaged");
    await fs.mkdir(path.join(oldClaudeRoot, "commands"), { recursive: true });
    await fs.mkdir(path.join(unmanagedClaudeRoot, "commands"), { recursive: true });
    await fs.writeFile(path.join(oldClaudeRoot, "commands", "old.md"), "old", "utf8");
    await fs.writeFile(path.join(unmanagedClaudeRoot, "commands", "keep.md"), "keep", "utf8");
    await fs.writeFile(
      path.join(oldClaudeRoot, ".rawr-sync-manifest.json"),
      JSON.stringify(
        {
          plugin: "old-plugin",
          sourcePluginPath: path.join(workspaceRoot, "plugins", "agents", "old-plugin"),
          workflows: ["old"],
          skills: [],
          scripts: [],
          agents: [],
          syncedAt: new Date().toISOString(),
          managedBy: "@rawr/plugin-plugins",
        },
        null,
        2,
      ),
      "utf8",
    );
    await fs.mkdir(path.join(claudeHome, ".claude-plugin"), { recursive: true });
    await fs.writeFile(
      path.join(claudeHome, ".claude-plugin", "marketplace.json"),
      JSON.stringify(
        {
          plugins: [
            { name: "old-plugin", source: "./plugins/old-plugin" },
            { name: "unmanaged", source: "./plugins/unmanaged" },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await retireStaleManagedPlugins({
      workspaceRoot,
      scope: "all",
      codexHomes: [codexHome],
      claudeHomes: [claudeHome],
      activePluginNames: new Set(["new-plugin"]),
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    expect(result.stalePlugins.some((p) => p.plugin === "old-plugin" && p.agent === "codex")).toBe(true);
    expect(result.stalePlugins.some((p) => p.plugin === "old-plugin" && p.agent === "claude")).toBe(true);

    await expect(fs.stat(path.join(codexHome, "prompts", "old-flow.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(codexHome, "skills", "old-plugin-skill"))).rejects.toThrow();
    await expect(fs.stat(path.join(codexHome, "scripts", "old-plugin--tool.sh"))).rejects.toThrow();
    await expect(fs.readFile(path.join(codexHome, "scripts", "unmanaged.sh"), "utf8")).resolves.toContain("keep");

    await expect(fs.stat(oldClaudeRoot)).rejects.toThrow();
    await expect(fs.stat(unmanagedClaudeRoot)).resolves.toBeTruthy();

    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins.find((p: any) => p.name === "old-plugin")).toBeFalsy();
    expect(registry.plugins.find((p: any) => p.name === "unmanaged")).toBeTruthy();

    const marketplace = JSON.parse(await fs.readFile(path.join(claudeHome, ".claude-plugin", "marketplace.json"), "utf8"));
    expect(marketplace.plugins.find((p: any) => p.name === "old-plugin")).toBeFalsy();
    expect(marketplace.plugins.find((p: any) => p.name === "unmanaged")).toBeTruthy();
  });

  it("does not retire stale plugins outside scoped source area", async () => {
    const workspaceRoot = await makeTemp("agent-sync-ws-");
    const codexHome = await makeTemp("agent-sync-codex-");

    await fs.mkdir(path.join(codexHome, "plugins"), { recursive: true });
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify(
        {
          plugins: [
            {
              name: "old-cli-plugin",
              managed_by: "@rawr/plugin-plugins",
              source_plugin_path: path.join(workspaceRoot, "plugins", "cli", "old-cli-plugin"),
              prompts: [],
              skills: [],
              scripts: [],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await retireStaleManagedPlugins({
      workspaceRoot,
      scope: "agents",
      codexHomes: [codexHome],
      claudeHomes: [],
      activePluginNames: new Set(["new-agent-plugin"]),
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    expect(result.stalePlugins.length).toBe(0);

    const registry = JSON.parse(await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"));
    expect(registry.plugins.find((p: any) => p.name === "old-cli-plugin")).toBeTruthy();
  });
});
