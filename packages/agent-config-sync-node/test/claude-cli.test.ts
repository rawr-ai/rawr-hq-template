import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  installAndEnableClaudePlugin,
  writeKnownMarketplacesForTests,
  type ExecFn,
} from "../src/claude-cli";

const tempDirs: string[] = [];
const PROVIDER_VERSION = "0.0.0-rawr.123456789abc";

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function writeSourceManifest(input: {
  claudeLocalHome: string;
  pluginName: string;
  providerVersion?: string;
}): Promise<void> {
  const manifestPath = path.join(input.claudeLocalHome, "plugins", input.pluginName, ".rawr-sync-manifest.json");
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify({
    plugin: input.pluginName,
    sourcePluginPath: "/workspace/plugins/plugin-demo",
    contentHash: "123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
    providerVersion: input.providerVersion ?? PROVIDER_VERSION,
    workflows: ["hello"],
    skills: ["demo-skill"],
    scripts: [],
    agents: [],
    managedBy: "@rawr/plugin-plugins",
    syncedAt: "2026-06-23T00:00:00.000Z",
  }, null, 2)}\n`, "utf8");
}

async function copySourceManifestToCache(input: {
  claudePluginsDir: string;
  claudeLocalHome: string;
  marketplaceName?: string;
  pluginName: string;
  providerVersion?: string;
}): Promise<void> {
  const providerVersion = input.providerVersion ?? PROVIDER_VERSION;
  const sourcePath = path.join(input.claudeLocalHome, "plugins", input.pluginName, ".rawr-sync-manifest.json");
  const cachePath = path.join(
    input.claudePluginsDir,
    "cache",
    input.marketplaceName ?? "local",
    input.pluginName,
    providerVersion,
    ".rawr-sync-manifest.json",
  );
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.copyFile(sourcePath, cachePath);
}

describe("@rawr/agent-config-sync-node Claude CLI install adapter", () => {
  it("registers the local marketplace with explicit user install scope", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-install-"));
    tempDirs.push(root);
    const claudePluginsDir = path.join(root, "claude", "plugins");
    const claudeLocalHome = path.join(root, "claude", "plugins", "local");
    await fs.mkdir(claudeLocalHome, { recursive: true });
    await writeSourceManifest({ claudeLocalHome, pluginName: "plugin-demo" });

    const calls: Array<{ cmd: string; args: string[] }> = [];
    const exec: ExecFn = async (input) => {
      calls.push({ cmd: input.cmd, args: input.args });
      if (input.args.join(" ").startsWith("plugin marketplace add")) {
        await writeKnownMarketplacesForTests(claudePluginsDir, {
          local: { installLocation: claudeLocalHome },
        });
      }
      if (input.args.join(" ") === "plugin install plugin-demo@local") {
        await copySourceManifestToCache({ claudePluginsDir, claudeLocalHome, pluginName: "plugin-demo" });
      }
      return { code: 0, stdout: "ok\n", stderr: "" };
    };

    const actions = await installAndEnableClaudePlugin({
      claudeLocalHome,
      pluginName: "plugin-demo",
      installScope: "user",
      dryRun: false,
      enable: true,
      claudePluginsDir,
      exec,
    });

    expect(calls.map((call) => call.args)).toEqual([
      ["plugin", "marketplace", "add", "--scope", "user", claudeLocalHome],
      ["plugin", "validate", claudeLocalHome],
      ["plugin", "marketplace", "update", "local"],
      ["plugin", "install", "plugin-demo@local"],
      ["plugin", "enable", "plugin-demo@local"],
    ]);
    expect(actions).toEqual([
      {
        action: "validated",
        home: claudeLocalHome,
        plugin: "plugin-demo",
        installScope: "user",
        marketplace: "local",
      },
      {
        action: "marketplace-updated",
        home: claudeLocalHome,
        plugin: "plugin-demo",
        installScope: "user",
        marketplace: "local",
      },
      {
        action: "installed",
        home: claudeLocalHome,
        plugin: "plugin-demo",
        installScope: "user",
        marketplace: "local",
      },
      {
        action: "enabled",
        home: claudeLocalHome,
        plugin: "plugin-demo",
        installScope: "user",
        marketplace: "local",
      },
      {
        action: "cache-verified",
        home: claudeLocalHome,
        plugin: "plugin-demo",
        installScope: "user",
        marketplace: "local",
        cachePath: path.join(claudePluginsDir, "cache", "local", "plugin-demo", PROVIDER_VERSION, ".rawr-sync-manifest.json"),
      },
    ]);
  });

  it("updates an already-installed Claude plugin before enabling it", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-update-"));
    tempDirs.push(root);
    const claudePluginsDir = path.join(root, "claude", "plugins");
    const claudeLocalHome = path.join(root, "claude", "plugins", "local");
    await fs.mkdir(claudeLocalHome, { recursive: true });
    await writeSourceManifest({ claudeLocalHome, pluginName: "plugin-demo" });
    await writeKnownMarketplacesForTests(claudePluginsDir, {
      local: { installLocation: claudeLocalHome },
    });

    const calls: Array<{ cmd: string; args: string[] }> = [];
    const exec: ExecFn = async (input) => {
      calls.push({ cmd: input.cmd, args: input.args });
      if (input.args.join(" ") === "plugin install plugin-demo@local") {
        return { code: 1, stdout: "", stderr: "plugin-demo@local is already installed" };
      }
      if (input.args.join(" ") === "plugin update plugin-demo@local") {
        await copySourceManifestToCache({ claudePluginsDir, claudeLocalHome, pluginName: "plugin-demo" });
      }
      return { code: 0, stdout: "ok\n", stderr: "" };
    };

    const actions = await installAndEnableClaudePlugin({
      claudeLocalHome,
      pluginName: "plugin-demo",
      installScope: "user",
      dryRun: false,
      enable: true,
      claudePluginsDir,
      exec,
    });

    expect(calls.map((call) => call.args)).toEqual([
      ["plugin", "validate", claudeLocalHome],
      ["plugin", "marketplace", "update", "local"],
      ["plugin", "install", "plugin-demo@local"],
      ["plugin", "update", "plugin-demo@local"],
      ["plugin", "enable", "plugin-demo@local"],
    ]);
    expect(actions.map((action) => action.action)).toEqual([
      "validated",
      "marketplace-updated",
      "updated",
      "enabled",
      "cache-verified",
    ]);
  });

  it("repairs a stale installed cache after Claude update reports success", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-repair-"));
    tempDirs.push(root);
    const claudePluginsDir = path.join(root, "claude", "plugins");
    const claudeLocalHome = path.join(root, "claude", "plugins", "local");
    await fs.mkdir(claudeLocalHome, { recursive: true });
    await writeSourceManifest({ claudeLocalHome, pluginName: "plugin-demo" });
    await writeKnownMarketplacesForTests(claudePluginsDir, {
      local: { installLocation: claudeLocalHome },
    });
    const staleCachePath = path.join(claudePluginsDir, "cache", "local", "plugin-demo", PROVIDER_VERSION, ".rawr-sync-manifest.json");
    await fs.mkdir(path.dirname(staleCachePath), { recursive: true });
    await fs.writeFile(staleCachePath, `${JSON.stringify({ plugin: "plugin-demo", providerVersion: PROVIDER_VERSION, stale: true }, null, 2)}\n`, "utf8");

    let repaired = false;
    const calls: Array<{ cmd: string; args: string[] }> = [];
    const exec: ExecFn = async (input) => {
      calls.push({ cmd: input.cmd, args: input.args });
      if (input.args.join(" ") === "plugin install plugin-demo@local") {
        if (!repaired) return { code: 1, stdout: "", stderr: "plugin-demo@local is already installed" };
        await copySourceManifestToCache({ claudePluginsDir, claudeLocalHome, pluginName: "plugin-demo" });
      }
      if (input.args.join(" ") === "plugin uninstall plugin-demo@local --scope user --keep-data --yes") {
        repaired = true;
      }
      return { code: 0, stdout: "ok\n", stderr: "" };
    };

    const actions = await installAndEnableClaudePlugin({
      claudeLocalHome,
      pluginName: "plugin-demo",
      installScope: "user",
      dryRun: false,
      enable: true,
      claudePluginsDir,
      exec,
    });

    expect(calls.map((call) => call.args)).toEqual([
      ["plugin", "validate", claudeLocalHome],
      ["plugin", "marketplace", "update", "local"],
      ["plugin", "install", "plugin-demo@local"],
      ["plugin", "update", "plugin-demo@local"],
      ["plugin", "enable", "plugin-demo@local"],
      ["plugin", "uninstall", "plugin-demo@local", "--scope", "user", "--keep-data", "--yes"],
      ["plugin", "install", "plugin-demo@local"],
      ["plugin", "enable", "plugin-demo@local"],
    ]);
    expect(actions.map((action) => action.action)).toEqual([
      "validated",
      "marketplace-updated",
      "updated",
      "enabled",
      "cache-repaired",
    ]);
  });

  it("rejects unsupported install scopes", async () => {
    await expect(installAndEnableClaudePlugin({
      claudeLocalHome: "/tmp/claude/plugins/local",
      pluginName: "plugin-demo",
      installScope: "project",
      dryRun: true,
      enable: true,
    })).rejects.toThrow("Unsupported install scope 'project'");
  });
});
