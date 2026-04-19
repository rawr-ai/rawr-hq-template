import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildCodexScriptName,
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistry,
} from "../src/registry-codex";
import type { HostSourceContent, HostSourcePlugin } from "../src/types";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

function makeSourcePlugin(root: string): HostSourcePlugin {
  return {
    ref: "demo",
    absPath: root,
    dirName: "demo-plugin",
    packageName: "@rawr/plugin-demo",
    version: "0.1.0",
    description: "Demo",
  };
}

function makeContent(root: string): HostSourceContent {
  return {
    workflowFiles: [{ name: "alpha", absPath: path.join(root, "workflows", "alpha.md") }],
    skills: [{ name: "skill-a", absPath: path.join(root, "skills", "skill-a") }],
    scripts: [{ name: "tool.sh", absPath: path.join(root, "scripts", "tool.sh") }],
    agentFiles: [],
  };
}

describe("registry-codex", () => {
  it("loads claims and upserts plugin registry entries", async () => {
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-codex-"));
    tempDirs.push(codexHome);

    await fs.mkdir(path.join(codexHome, "plugins"), { recursive: true });
    await fs.writeFile(
      path.join(codexHome, "plugins", "registry.json"),
      JSON.stringify(
        {
          plugins: [
            { name: "other", prompts: ["z"], skills: ["s"], scripts: ["other--x.sh"] },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const existing = await loadCodexRegistry(codexHome);
    expect(existing.claimedSets.promptsByPlugin.other.has("z")).toBe(true);
    expect(buildCodexScriptName("demo-plugin", "tool.sh")).toBe("demo-plugin--tool.sh");

    const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-source-"));
    tempDirs.push(sourceRoot);
    const result = await upsertCodexRegistry({
      codexHome,
      sourcePlugin: makeSourcePlugin(sourceRoot),
      content: makeContent(sourceRoot),
      dryRun: false,
      existingData: existing.data,
    });

    expect(result.changed).toBe(true);

    const registry = JSON.parse(
      await fs.readFile(path.join(codexHome, "plugins", "registry.json"), "utf8"),
    );
    expect(registry.plugins.map((plugin: { name: string }) => plugin.name)).toEqual([
      "demo-plugin",
      "other",
    ]);
  });

  it("collects claims from other plugins", () => {
    const claims = getClaimsFromOtherPlugins("demo-plugin", {
      "demo-plugin": new Set(["alpha"]),
      other: new Set(["beta", "gamma"]),
    });

    expect([...claims].sort()).toEqual(["beta", "gamma"]);
  });
});
