import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  installAndEnableClaudePlugin,
  type ExecFn,
  writeKnownMarketplacesForTests,
} from "../src/claude-cli";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("claude-cli helpers", () => {
  it("adds the marketplace when missing, then installs and enables", async () => {
    const pluginsDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-"));
    tempDirs.push(pluginsDir);

    const claudeHome = path.join(pluginsDir, "local");
    await fs.mkdir(claudeHome, { recursive: true });
    await writeKnownMarketplacesForTests(pluginsDir, {});

    const calls: Array<{ cmd: string; args: string[] }> = [];
    const exec: ExecFn = async ({ cmd, args }) => {
      calls.push({ cmd, args });

      if (args[0] === "plugin" && args[1] === "marketplace" && args[2] === "add") {
        await writeKnownMarketplacesForTests(pluginsDir, {
          local: {
            installLocation: path.resolve(claudeHome),
            source: { source: "directory", path: path.resolve(claudeHome) },
            lastUpdated: new Date().toISOString(),
          },
        });
      }

      return { code: 0, stdout: "", stderr: "" };
    };

    const actions = await installAndEnableClaudePlugin({
      claudeLocalHome: claudeHome,
      pluginName: "dev",
      dryRun: false,
      enable: true,
      claudePluginsDir: pluginsDir,
      exec,
    });

    expect(actions.map((action) => action.action)).toEqual(["installed", "enabled"]);
    expect(calls.map((call) => call.args.slice(0, 3).join(" "))).toEqual([
      "plugin marketplace add",
      "plugin install dev@local",
      "plugin enable dev@local",
    ]);
  });

  it("returns planned during dry-run without executing", async () => {
    const pluginsDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-"));
    tempDirs.push(pluginsDir);

    const claudeHome = path.join(pluginsDir, "local");
    await fs.mkdir(claudeHome, { recursive: true });
    await writeKnownMarketplacesForTests(pluginsDir, {});

    let called = 0;
    const exec: ExecFn = async () => {
      called += 1;
      return { code: 0, stdout: "", stderr: "" };
    };

    const actions = await installAndEnableClaudePlugin({
      claudeLocalHome: claudeHome,
      pluginName: "docs",
      dryRun: true,
      enable: true,
      claudePluginsDir: pluginsDir,
      exec,
    });

    expect(actions.map((action) => action.action)).toEqual(["planned"]);
    expect(called).toBe(0);
  });

  it("treats already-enabled responses as skipped", async () => {
    const pluginsDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-"));
    tempDirs.push(pluginsDir);

    const claudeHome = path.join(pluginsDir, "local");
    await fs.mkdir(claudeHome, { recursive: true });
    await writeKnownMarketplacesForTests(pluginsDir, {
      local: { installLocation: path.resolve(claudeHome) },
    });

    const exec: ExecFn = async ({ args }) => {
      if (args[1] === "enable") {
        return {
          code: 1,
          stdout: "",
          stderr:
            '✘ Failed to enable plugin "docs@local": Plugin "docs@local" is already enabled',
        };
      }
      return { code: 0, stdout: "", stderr: "" };
    };

    const actions = await installAndEnableClaudePlugin({
      claudeLocalHome: claudeHome,
      pluginName: "docs",
      dryRun: false,
      enable: true,
      claudePluginsDir: pluginsDir,
      exec,
    });

    expect(actions.map((action) => action.action)).toEqual(["installed", "skipped"]);
    expect(actions[1]).toMatchObject({ reason: "already enabled" });
  });
});
