import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveTargets } from "../src/targets";
import type { AgentConfigSyncHostResolvedConfig } from "../src/types";

const ENV_KEYS = [
  "RAWR_AGENT_SYNC_CODEX_HOMES",
  "RAWR_AGENT_SYNC_CLAUDE_HOMES",
  "CODEX_HOME",
  "CODEX_MIRROR_HOME",
  "CLAUDE_PLUGINS_LOCAL",
  "HOME",
];

const savedEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<string, string | undefined>;

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("resolveTargets", () => {
  it("defaults to two codex homes and one claude home when unset", () => {
    delete process.env.RAWR_AGENT_SYNC_CODEX_HOMES;
    delete process.env.RAWR_AGENT_SYNC_CLAUDE_HOMES;
    delete process.env.CODEX_HOME;
    delete process.env.CODEX_MIRROR_HOME;
    delete process.env.CLAUDE_PLUGINS_LOCAL;

    const fakeHome = path.join(os.tmpdir(), "agent-config-sync-home");
    process.env.HOME = fakeHome;

    const resolved = resolveTargets("all", [], [], undefined);
    expect(resolved.homes.codexHomes).toEqual([
      path.resolve(path.join(fakeHome, ".codex-rawr")),
      path.resolve(path.join(fakeHome, ".codex")),
    ]);
    expect(resolved.homes.claudeHomes).toEqual([
      path.resolve(path.join(fakeHome, ".claude", "plugins", "local")),
    ]);
  });

  it("falls back to sync config destinations when flags and env are unset", () => {
    delete process.env.RAWR_AGENT_SYNC_CODEX_HOMES;
    delete process.env.RAWR_AGENT_SYNC_CLAUDE_HOMES;
    delete process.env.CODEX_HOME;
    delete process.env.CODEX_MIRROR_HOME;
    delete process.env.CLAUDE_PLUGINS_LOCAL;

    const fakeHome = path.join(os.tmpdir(), "agent-config-sync-home-2");
    process.env.HOME = fakeHome;

    const config: AgentConfigSyncHostResolvedConfig = {
      sync: {
        providers: {
          codex: { destinations: [{ rootPath: "~/codex-a" }] },
          claude: { destinations: [{ rootPath: "/tmp/claude-a" }] },
        },
      },
    };

    const resolved = resolveTargets("all", [], [], config);
    expect(resolved.homes.codexHomes).toEqual([path.resolve(path.join(fakeHome, "codex-a"))]);
    expect(resolved.homes.claudeHomes).toEqual([path.resolve("/tmp/claude-a")]);
  });

  it("prefers env homes over defaults and flags over env", () => {
    process.env.HOME = path.join(os.tmpdir(), "agent-config-sync-home-3");
    process.env.RAWR_AGENT_SYNC_CODEX_HOMES = "~/one, /tmp/two";
    process.env.RAWR_AGENT_SYNC_CLAUDE_HOMES = "/tmp/claude";

    const fromEnv = resolveTargets("all", [], [], undefined);
    expect(fromEnv.homes.codexHomes).toEqual([
      path.resolve(path.join(process.env.HOME!, "one")),
      path.resolve("/tmp/two"),
    ]);
    expect(fromEnv.homes.claudeHomes).toEqual([path.resolve("/tmp/claude")]);

    const fromFlags = resolveTargets("all", ["/x"], ["/y"], undefined);
    expect(fromFlags.homes.codexHomes).toEqual([path.resolve("/x")]);
    expect(fromFlags.homes.claudeHomes).toEqual([path.resolve("/y")]);
  });
});
