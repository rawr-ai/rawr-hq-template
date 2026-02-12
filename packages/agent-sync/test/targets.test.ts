import os from "node:os";
import path from "node:path";

import { afterEach,describe, expect, it } from "vitest";

import { resolveTargets } from "../src/lib/targets";

const ENV_KEYS = [
  "RAWR_AGENT_SYNC_CODEX_HOMES",
  "RAWR_AGENT_SYNC_CLAUDE_HOMES",
  "CODEX_HOME",
  "CODEX_MIRROR_HOME",
  "CLAUDE_PLUGINS_LOCAL",
  "HOME",
];

const savedEnv: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) savedEnv[k] = process.env[k];

afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("resolveTargets", () => {
  it("defaults to two codex homes + one claude home when unset", () => {
    delete process.env.RAWR_AGENT_SYNC_CODEX_HOMES;
    delete process.env.RAWR_AGENT_SYNC_CLAUDE_HOMES;
    delete process.env.CODEX_HOME;
    delete process.env.CODEX_MIRROR_HOME;
    delete process.env.CLAUDE_PLUGINS_LOCAL;

    // Make expectations stable across machines.
    const fakeHome = path.join(os.tmpdir(), "agent-sync-home");
    process.env.HOME = fakeHome;

    const r = resolveTargets("all", [], [], null);
    expect(r.homes.codexHomes).toEqual([
      path.resolve(path.join(fakeHome, ".codex-rawr")),
      path.resolve(path.join(fakeHome, ".codex")),
    ]);
    expect(r.homes.claudeHomes).toEqual([
      path.resolve(path.join(fakeHome, ".claude", "plugins", "local")),
    ]);
  });


  it("falls back to sync config destinations when flags/env are unset", () => {
    delete process.env.RAWR_AGENT_SYNC_CODEX_HOMES;
    delete process.env.RAWR_AGENT_SYNC_CLAUDE_HOMES;
    delete process.env.CODEX_HOME;
    delete process.env.CODEX_MIRROR_HOME;
    delete process.env.CLAUDE_PLUGINS_LOCAL;

    // Make expectations stable across machines.
    const fakeHome = path.join(os.tmpdir(), "agent-sync-home3");
    process.env.HOME = fakeHome;

    const cfg: any = {
      version: 1,
      sync: {
        providers: {
          codex: { destinations: [{ id: "c1", rootPath: "~/codex-a" }] },
          claude: { destinations: [{ id: "cl1", rootPath: "/tmp/claude-a" }] },
        },
      },
    };

    const r = resolveTargets("all", [], [], cfg);
    expect(r.homes.codexHomes).toEqual([path.resolve(path.join(fakeHome, "codex-a"))]);
    expect(r.homes.claudeHomes).toEqual([path.resolve("/tmp/claude-a")]);
  });

  it("env homes override defaults and flags override env", () => {
    process.env.HOME = path.join(os.tmpdir(), "agent-sync-home2");
    process.env.RAWR_AGENT_SYNC_CODEX_HOMES = "~/one, /tmp/two";
    process.env.RAWR_AGENT_SYNC_CLAUDE_HOMES = "/tmp/claude";

    const envResolved = resolveTargets("all", [], [], null);
    expect(envResolved.homes.codexHomes).toEqual([
      path.resolve(path.join(process.env.HOME!, "one")),
      path.resolve("/tmp/two"),
    ]);
    expect(envResolved.homes.claudeHomes).toEqual([path.resolve("/tmp/claude")]);

    const flagsResolved = resolveTargets("all", ["/x"], ["/y"], null);
    expect(flagsResolved.homes.codexHomes).toEqual([path.resolve("/x")]);
    expect(flagsResolved.homes.claudeHomes).toEqual([path.resolve("/y")]);
  });
});
