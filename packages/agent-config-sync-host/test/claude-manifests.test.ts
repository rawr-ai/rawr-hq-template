import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  readClaudeSyncManifest,
  upsertClaudeMarketplace,
  upsertClaudePluginManifest,
  writeClaudeSyncManifest,
} from "../src/marketplace-claude";
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
    version: "0.2.0",
    description: "Demo plugin",
  };
}

function makeContent(root: string): HostSourceContent {
  return {
    workflowFiles: [{ name: "beta", absPath: path.join(root, "workflows", "beta.md") }],
    skills: [{ name: "skill-b", absPath: path.join(root, "skills", "skill-b") }],
    scripts: [{ name: "helper.py", absPath: path.join(root, "scripts", "helper.py") }],
    agentFiles: [{ name: "assistant", absPath: path.join(root, "agents", "assistant.md") }],
  };
}

describe("claude manifest adapters", () => {
  it("writes plugin metadata, marketplace, and sync manifest", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-source-"));
    const claudeHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-"));
    tempDirs.push(sourceRoot, claudeHome);

    const sourcePlugin = makeSourcePlugin(sourceRoot);
    const content = makeContent(sourceRoot);

    const pluginResult = await upsertClaudePluginManifest({
      claudeLocalHome: claudeHome,
      sourcePlugin,
      dryRun: false,
    });
    const marketplaceResult = await upsertClaudeMarketplace({
      claudeLocalHome: claudeHome,
      sourcePlugin,
      dryRun: false,
    });
    const manifestResult = await writeClaudeSyncManifest({
      claudeLocalHome: claudeHome,
      sourcePlugin,
      content,
      dryRun: false,
    });

    expect(pluginResult.changed).toBe(true);
    expect(marketplaceResult.changed).toBe(true);
    expect(manifestResult.changed).toBe(true);

    const pluginJson = JSON.parse(await fs.readFile(pluginResult.filePath, "utf8"));
    expect(pluginJson.name).toBe("demo-plugin");

    const marketplace = JSON.parse(await fs.readFile(marketplaceResult.filePath, "utf8"));
    expect(
      marketplace.plugins.find((plugin: { name: string }) => plugin.name === "demo-plugin")?.source,
    ).toBe("./plugins/demo-plugin");

    const manifest = await readClaudeSyncManifest(claudeHome, "demo-plugin");
    expect(manifest?.workflows).toEqual(["beta"]);
    expect(manifest?.skills).toEqual(["skill-b"]);
    expect(manifest?.scripts).toEqual(["helper.py"]);
    expect(manifest?.agents).toEqual(["assistant"]);
  });
});
