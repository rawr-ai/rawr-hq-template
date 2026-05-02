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

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("@rawr/agent-config-sync-node Claude CLI install adapter", () => {
  it("registers the local marketplace with explicit user install scope", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-install-"));
    tempDirs.push(root);
    const claudePluginsDir = path.join(root, "claude", "plugins");
    const claudeLocalHome = path.join(root, "claude", "plugins", "local");
    await fs.mkdir(claudeLocalHome, { recursive: true });

    const calls: Array<{ cmd: string; args: string[] }> = [];
    const exec: ExecFn = async (input) => {
      calls.push({ cmd: input.cmd, args: input.args });
      if (input.args.join(" ").startsWith("plugin marketplace add")) {
        await writeKnownMarketplacesForTests(claudePluginsDir, {
          local: { installLocation: claudeLocalHome },
        });
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
      ["plugin", "install", "plugin-demo@local"],
      ["plugin", "enable", "plugin-demo@local"],
    ]);
    expect(actions).toEqual([
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
