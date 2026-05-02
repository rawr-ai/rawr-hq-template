import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  installCodexMarketplacePlugins,
  resolveCodexBin,
  type CodexAppServerSession,
} from "../src/codex-cli";
import type { ExecFn } from "../src/claude-cli";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("@rawr/agent-config-sync-node Codex CLI install adapter", () => {
  it("resolves the RAWR Codex binary before falling back to PATH", async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-codex-bin-"));
    tempDirs.push(home);

    expect(resolveCodexBin({ codexBin: "~/bin/codex-custom", homeDir: home, env: {} })).toBe(path.join(home, "bin", "codex-custom"));
    expect(resolveCodexBin({ env: { RAWR_CODEX_BIN: "~/rawr/codex" }, homeDir: home })).toBe(path.join(home, "rawr", "codex"));
    expect(resolveCodexBin({ env: {}, homeDir: home })).toBe("codex");

    const rawrBin = path.join(home, ".local", "bin", "codex");
    await fs.mkdir(path.dirname(rawrBin), { recursive: true });
    await fs.writeFile(rawrBin, "#!/bin/sh\n", "utf8");
    expect(resolveCodexBin({ env: {}, homeDir: home })).toBe(rawrBin);
  });

  it("plans marketplace registration and plugin installation during dry-run", async () => {
    const result = await installCodexMarketplacePlugins({
      codexBin: "/tmp/codex",
      codexHome: "/tmp/codex-home",
      marketplaceRoot: "/tmp/dist/codex",
      marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
      plugins: ["plugin-b", "plugin-a", "plugin-a"],
      dryRun: true,
    });

    expect(result.ok).toBe(true);
    expect(result.actions).toEqual([
      {
        action: "planned",
        codexBin: "/tmp/codex",
        codexHome: "/tmp/codex-home",
        installScope: "user",
        marketplaceRoot: "/tmp/dist/codex",
        marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
        plugin: "plugin-a",
      },
      {
        action: "planned",
        codexBin: "/tmp/codex",
        codexHome: "/tmp/codex-home",
        installScope: "user",
        marketplaceRoot: "/tmp/dist/codex",
        marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
        plugin: "plugin-b",
      },
    ]);
  });

  it("registers a marketplace and installs plugins through Codex app-server", async () => {
    const calls: Array<{ cmd: string; args: string[]; env?: NodeJS.ProcessEnv }> = [];
    const exec: ExecFn = async (input) => {
      calls.push({ cmd: input.cmd, args: input.args, env: input.env });
      if (input.args.join(" ") === "--version") return { code: 0, stdout: "codex-cli 0.126.0-alpha.3\n", stderr: "" };
      return { code: 0, stdout: "ok\n", stderr: "" };
    };
    const appServerCalls: string[] = [];
    const appServer: CodexAppServerSession = {
      async initialize() {
        appServerCalls.push("initialize");
      },
      async pluginList(params) {
        appServerCalls.push(`plugin/list:${JSON.stringify(params)}`);
        return {
          marketplaces: [{
            path: "/some/copied/marketplace.json",
            plugins: [{
              name: "plugin-demo",
              installed: true,
              enabled: true,
            }],
          }],
          marketplaceLoadErrors: [],
        };
      },
      async pluginRead(params) {
        appServerCalls.push(`plugin/read:${params.pluginName}`);
        return {
          plugin: {
            name: params.pluginName,
            skills: [{ name: "demo-skill" }],
            mcpServers: [{ name: "demo-server" }],
          },
        };
      },
      async pluginInstall(params) {
        appServerCalls.push(`plugin/install:${params.pluginName}`);
        return {
          authPolicy: "on-install",
          appsNeedingAuth: [],
        };
      },
      async skillsList(params) {
        appServerCalls.push(`skills/list:${JSON.stringify(params)}`);
        return { data: [{ cwd: "/tmp/dist/codex", skills: [{ name: "demo-skill" }], errors: [] }] };
      },
      async close() {
        appServerCalls.push("close");
      },
    };

    const result = await installCodexMarketplacePlugins({
      codexBin: "/Users/mateicanavra/.local/bin/codex",
      codexHome: "/tmp/codex-home",
      marketplaceRoot: "/tmp/dist/codex",
      marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
      plugins: ["plugin-demo"],
      dryRun: false,
      exec,
      appServer,
    });

    expect(result.ok).toBe(true);
    expect(calls.map((call) => call.args)).toEqual([
      ["--version"],
      ["plugin", "marketplace", "--help"],
      ["app-server", "--help"],
      ["plugin", "marketplace", "add", "/tmp/dist/codex"],
    ]);
    expect(calls.every((call) => call.env?.CODEX_HOME === "/tmp/codex-home")).toBe(true);
    expect(appServerCalls).toEqual([
      "initialize",
      "plugin/list:{\"cwds\":[\"/tmp/dist/codex\"]}",
      "plugin/read:plugin-demo",
      "plugin/install:plugin-demo",
      "plugin/list:{\"cwds\":[\"/tmp/dist/codex\"]}",
      "plugin/read:plugin-demo",
      "skills/list:{\"cwds\":[\"/tmp/dist/codex\"],\"forceReload\":true}",
      "close",
    ]);
    expect(result.actions).toContainEqual({
      action: "installed",
      codexBin: "/Users/mateicanavra/.local/bin/codex",
      codexHome: "/tmp/codex-home",
      installScope: "user",
      marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
      plugin: "plugin-demo",
      authPolicy: "on-install",
      appsNeedingAuth: 0,
    });
    expect(result.actions).toContainEqual({
      action: "verified",
      codexBin: "/Users/mateicanavra/.local/bin/codex",
      codexHome: "/tmp/codex-home",
      installScope: "user",
      marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
      plugin: "plugin-demo",
      installed: true,
      enabled: true,
      skillCount: 1,
      visibleSkillCount: 1,
      mcpServerCount: 1,
    });
  });

  it("reports preflight failures without claiming install success", async () => {
    const exec: ExecFn = async () => ({ code: 1, stdout: "", stderr: "missing command" });

    const result = await installCodexMarketplacePlugins({
      codexBin: "/tmp/not-codex",
      marketplaceRoot: "/tmp/dist/codex",
      marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
      plugins: ["plugin-demo"],
      dryRun: false,
      exec,
    });

    expect(result.ok).toBe(false);
    expect(result.actions).toEqual([{
      action: "failed",
      codexBin: "/tmp/not-codex",
      codexHome: undefined,
      installScope: "user",
      marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
      error: "codex --version failed (code=1): missing command",
    }]);
  });

  it("rejects unsupported install scopes instead of passing unsupported Codex args", async () => {
    await expect(installCodexMarketplacePlugins({
      codexBin: "/tmp/codex",
      marketplaceRoot: "/tmp/dist/codex",
      marketplacePath: "/tmp/dist/codex/.agents/plugins/marketplace.json",
      plugins: ["plugin-demo"],
      dryRun: true,
      installScope: "project",
    })).rejects.toThrow("Unsupported install scope 'project'");
  });
});
