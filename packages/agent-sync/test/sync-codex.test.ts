import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanSourcePlugin } from "../src/lib/scan-source-plugin";
import { loadCodexRegistryForTests, runSync } from "../src/lib/sync-engine";
import type { SourcePlugin } from "../src/lib/types";

const tempDirs: string[] = [];

async function makeSourcePlugin(): Promise<SourcePlugin> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-codex-src-"));
  tempDirs.push(root);

  await fs.mkdir(path.join(root, "workflows"), { recursive: true });
  await fs.writeFile(path.join(root, "workflows", "alpha.md"), "# alpha", "utf8");

  await fs.mkdir(path.join(root, "skills", "skill-a", "references"), { recursive: true });
  await fs.writeFile(path.join(root, "skills", "skill-a", "SKILL.md"), "# skill-a", "utf8");
  await fs.writeFile(path.join(root, "skills", "skill-a", "references", "one.md"), "1", "utf8");

  await fs.mkdir(path.join(root, "scripts"), { recursive: true });
  await fs.writeFile(path.join(root, "scripts", "tool.sh"), "echo tool", "utf8");

  return {
    ref: "demo",
    absPath: root,
    dirName: "demo-plugin",
    packageName: "@rawr/plugin-demo",
    version: "0.1.0",
    description: "Demo",
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("runSync codex", () => {
  it("supports dry-run without writes", async () => {
    const source = await makeSourcePlugin();
    const content = await scanSourcePlugin(source);
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-codex-home-"));
    tempDirs.push(codexHome);

    const result = await runSync({
      sourcePlugin: source,
      content,
      options: { dryRun: true, force: false, gc: false },
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
    });

    expect(result.ok).toBe(true);
    const promptsExists = await fs
      .stat(path.join(codexHome, "prompts"))
      .then(() => true)
      .catch(() => false);
    expect(promptsExists).toBe(false);
  });

  it("copies files and updates registry", async () => {
    const source = await makeSourcePlugin();
    const content = await scanSourcePlugin(source);
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-codex-home-"));
    tempDirs.push(codexHome);

    await fs.mkdir(path.join(codexHome, "plugins"), { recursive: true });
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify({ plugins: [{ name: "other", prompts: ["z"], skills: ["s"], scripts: ["x.sh"] }] }, null, 2),
      "utf8",
    );

    const result = await runSync({
      sourcePlugin: source,
      content,
      options: { dryRun: false, force: false, gc: false },
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
    });

    expect(result.ok).toBe(true);
    await expect(fs.readFile(path.join(codexHome, "prompts", "alpha.md"), "utf8")).resolves.toContain("alpha");
    await expect(fs.readFile(path.join(codexHome, "skills", "skill-a", "SKILL.md"), "utf8")).resolves.toContain("skill-a");
    await expect(fs.readFile(path.join(codexHome, "scripts", "demo-plugin--tool.sh"), "utf8")).resolves.toContain("tool");

    const registry = (await loadCodexRegistryForTests(codexHome)) as any;
    expect(registry.plugins.find((p: any) => p.name === "other")).toBeTruthy();
    expect(registry.plugins.find((p: any) => p.name === "demo-plugin")).toBeTruthy();
  });

  it("fails on conflict without force and supports gc", async () => {
    const source = await makeSourcePlugin();
    const content = await scanSourcePlugin(source);
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-codex-home-"));
    tempDirs.push(codexHome);

    await fs.mkdir(path.join(codexHome, "prompts"), { recursive: true });
    await fs.writeFile(path.join(codexHome, "prompts", "alpha.md"), "different", "utf8");

    let result = await runSync({
      sourcePlugin: source,
      content,
      options: { dryRun: false, force: false, gc: false },
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
    });

    expect(result.ok).toBe(false);
    expect(result.targets[0].conflicts.length).toBeGreaterThan(0);

    result = await runSync({
      sourcePlugin: source,
      content,
      options: { dryRun: false, force: true, gc: false },
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
    });
    expect(result.ok).toBe(true);

    await fs.mkdir(path.join(codexHome, "plugins"), { recursive: true });
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify(
        {
          plugins: [
            {
              name: "demo-plugin",
              prompts: ["alpha", "old"],
              skills: ["skill-a", "old-skill"],
              scripts: ["demo-plugin--tool.sh", "demo-plugin--old.sh"],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fs.writeFile(path.join(codexHome, "prompts", "old.md"), "old", "utf8");
    await fs.writeFile(path.join(codexHome, "prompts", "unmanaged.md"), "unmanaged", "utf8");
    await fs.mkdir(path.join(codexHome, "skills", "old-skill"), { recursive: true });
    await fs.mkdir(path.join(codexHome, "skills", "unmanaged-skill"), { recursive: true });
    await fs.writeFile(path.join(codexHome, "skills", "unmanaged-skill", "note.txt"), "x", "utf8");
    await fs.writeFile(path.join(codexHome, "scripts", "demo-plugin--old.sh"), "old", "utf8");
    await fs.writeFile(path.join(codexHome, "scripts", "unmanaged.sh"), "unmanaged", "utf8");

    result = await runSync({
      sourcePlugin: source,
      content,
      options: { dryRun: false, force: true, gc: true },
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
    });

    expect(result.ok).toBe(true);

    await expect(fs.stat(path.join(codexHome, "prompts", "old.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(codexHome, "skills", "old-skill"))).rejects.toThrow();
    await expect(fs.stat(path.join(codexHome, "scripts", "demo-plugin--old.sh"))).rejects.toThrow();

    // Registry-managed GC must not delete unmanaged extras.
    await expect(fs.readFile(path.join(codexHome, "prompts", "unmanaged.md"), "utf8")).resolves.toContain("unmanaged");
    await expect(fs.stat(path.join(codexHome, "skills", "unmanaged-skill"))).resolves.toBeTruthy();
    await expect(fs.readFile(path.join(codexHome, "scripts", "unmanaged.sh"), "utf8")).resolves.toContain("unmanaged");
  });

  it("treats registry claims from other plugins as conflicts by default", async () => {
    const source = await makeSourcePlugin();
    const content = await scanSourcePlugin(source);
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-codex-home-"));
    tempDirs.push(codexHome);

    await fs.mkdir(path.join(codexHome, "plugins"), { recursive: true });
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify(
        {
          plugins: [
            { name: "other", prompts: ["alpha"], skills: ["skill-a"], scripts: ["demo-plugin--tool.sh"] },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runSync({
      sourcePlugin: source,
      content,
      options: { dryRun: false, force: false, gc: false },
      codexHomes: [codexHome],
      claudeHomes: [],
      includeCodex: true,
      includeClaude: false,
    });

    expect(result.ok).toBe(false);
    expect(result.targets[0].conflicts.length).toBeGreaterThanOrEqual(3);
    expect(result.targets[0].conflicts.map((c) => c.kind).sort()).toEqual(["script", "skill", "workflow"]);
  });
});
