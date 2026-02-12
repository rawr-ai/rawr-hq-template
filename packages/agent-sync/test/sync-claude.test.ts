import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanSourcePlugin } from "../src/lib/scan-source-plugin";
import { runSync } from "../src/lib/sync-engine";
import type { SourcePlugin } from "../src/lib/types";

const tempDirs: string[] = [];

async function makeSourcePlugin(): Promise<SourcePlugin> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-claude-src-"));
  tempDirs.push(root);

  await fs.mkdir(path.join(root, "workflows"), { recursive: true });
  await fs.writeFile(path.join(root, "workflows", "beta.md"), "# beta", "utf8");

  await fs.mkdir(path.join(root, "skills", "skill-b"), { recursive: true });
  await fs.writeFile(path.join(root, "skills", "skill-b", "SKILL.md"), "# skill-b", "utf8");

  await fs.mkdir(path.join(root, "scripts"), { recursive: true });
  await fs.writeFile(path.join(root, "scripts", "helper.py"), "print('x')", "utf8");

  await fs.mkdir(path.join(root, "agents"), { recursive: true });
  await fs.writeFile(path.join(root, "agents", "assistant.md"), "# assistant", "utf8");

  return {
    ref: "demo",
    absPath: root,
    dirName: "demo-plugin",
    packageName: "@rawr/plugin-demo",
    version: "0.2.0",
    description: "Demo plugin",
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("runSync claude", () => {
  it("syncs commands/skills/scripts/agents and metadata", async () => {
    const source = await makeSourcePlugin();
    const content = await scanSourcePlugin(source);
    const claudeHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-claude-home-"));
    tempDirs.push(claudeHome);

    const result = await runSync({
      sourcePlugin: source,
      content,
      options: { dryRun: false, force: false, gc: false },
      codexHomes: [],
      claudeHomes: [claudeHome],
      includeCodex: false,
      includeClaude: true,
    });

    expect(result.ok).toBe(true);

    const pluginRoot = path.join(claudeHome, "plugins", "demo-plugin");
    await expect(fs.readFile(path.join(pluginRoot, "commands", "beta.md"), "utf8")).resolves.toContain("beta");
    await expect(fs.readFile(path.join(pluginRoot, "skills", "skill-b", "SKILL.md"), "utf8")).resolves.toContain("skill-b");
    await expect(fs.readFile(path.join(pluginRoot, "scripts", "helper.py"), "utf8")).resolves.toContain("print");
    await expect(fs.readFile(path.join(pluginRoot, "agents", "assistant.md"), "utf8")).resolves.toContain("assistant");

    const pluginJson = JSON.parse(await fs.readFile(path.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
    expect(pluginJson.name).toBe("demo-plugin");

    const marketplace = JSON.parse(await fs.readFile(path.join(claudeHome, ".claude-plugin", "marketplace.json"), "utf8"));
    const entry = marketplace.plugins.find((p: any) => p.name === "demo-plugin");
    expect(entry?.source).toBe("./plugins/demo-plugin");

    const manifest = JSON.parse(await fs.readFile(path.join(pluginRoot, ".rawr-sync-manifest.json"), "utf8"));
    expect(manifest.workflows).toContain("beta");
    expect(manifest.skills).toContain("skill-b");
    expect(manifest.scripts).toContain("helper.py");
    expect(manifest.agents).toContain("assistant");
  });

  it("supports gc from previous manifest", async () => {
    const source = await makeSourcePlugin();
    const content = await scanSourcePlugin(source);
    const claudeHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-claude-home-"));
    tempDirs.push(claudeHome);

    const pluginRoot = path.join(claudeHome, "plugins", "demo-plugin");
    await fs.mkdir(path.join(pluginRoot, "commands"), { recursive: true });
    await fs.mkdir(path.join(pluginRoot, "skills", "old-skill"), { recursive: true });
    await fs.mkdir(path.join(pluginRoot, "scripts"), { recursive: true });
    await fs.mkdir(path.join(pluginRoot, "agents"), { recursive: true });
    await fs.writeFile(path.join(pluginRoot, "commands", "old.md"), "old", "utf8");
    await fs.writeFile(path.join(pluginRoot, "commands", "unmanaged.md"), "unmanaged", "utf8");
    await fs.writeFile(path.join(pluginRoot, "scripts", "old.sh"), "old", "utf8");
    await fs.writeFile(path.join(pluginRoot, "scripts", "unmanaged.sh"), "unmanaged", "utf8");
    await fs.writeFile(path.join(pluginRoot, "agents", "old-agent.md"), "old", "utf8");
    await fs.writeFile(path.join(pluginRoot, "agents", "unmanaged.md"), "unmanaged", "utf8");
    await fs.mkdir(path.join(pluginRoot, "skills", "unmanaged-skill"), { recursive: true });
    await fs.writeFile(path.join(pluginRoot, "skills", "unmanaged-skill", "SKILL.md"), "# unmanaged", "utf8");
    await fs.writeFile(
      path.join(pluginRoot, ".rawr-sync-manifest.json"),
      JSON.stringify(
        {
          plugin: "demo-plugin",
          sourcePluginPath: "/old",
          workflows: ["old"],
          skills: ["old-skill"],
          scripts: ["old.sh"],
          agents: ["old-agent"],
          syncedAt: new Date().toISOString(),
          managedBy: "@rawr/plugin-plugins",
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runSync({
      sourcePlugin: source,
      content,
      options: { dryRun: false, force: true, gc: true },
      codexHomes: [],
      claudeHomes: [claudeHome],
      includeCodex: false,
      includeClaude: true,
    });

    expect(result.ok).toBe(true);
    await expect(fs.stat(path.join(pluginRoot, "commands", "old.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(pluginRoot, "skills", "old-skill"))).rejects.toThrow();
    await expect(fs.stat(path.join(pluginRoot, "scripts", "old.sh"))).rejects.toThrow();
    await expect(fs.stat(path.join(pluginRoot, "agents", "old-agent.md"))).rejects.toThrow();

    // GC must not delete unmanaged extras.
    await expect(fs.readFile(path.join(pluginRoot, "commands", "unmanaged.md"), "utf8")).resolves.toContain("unmanaged");
    await expect(fs.stat(path.join(pluginRoot, "skills", "unmanaged-skill"))).resolves.toBeTruthy();
    await expect(fs.readFile(path.join(pluginRoot, "scripts", "unmanaged.sh"), "utf8")).resolves.toContain("unmanaged");
    await expect(fs.readFile(path.join(pluginRoot, "agents", "unmanaged.md"), "utf8")).resolves.toContain("unmanaged");
  });
});
