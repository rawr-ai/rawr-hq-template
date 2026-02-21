import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];
const DEFAULT_TEST_HOME = mkdtempSync(path.join(os.tmpdir(), "rawr-test-cutover-home-"));
tempDirs.push(DEFAULT_TEST_HOME);

function runRawr(args: string[], envOverrides?: Record<string, string>) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const baseHome = envOverrides?.HOME ?? DEFAULT_TEST_HOME;
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      HOME: baseHome,
      XDG_CONFIG_HOME: envOverrides?.XDG_CONFIG_HOME ?? path.join(baseHome, ".config"),
      XDG_DATA_HOME: envOverrides?.XDG_DATA_HOME ?? path.join(baseHome, ".local", "share"),
      XDG_STATE_HOME: envOverrides?.XDG_STATE_HOME ?? path.join(baseHome, ".local", "state"),
      ...(envOverrides ?? {}),
    },
  });
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

function makeIsolatedSyncEnv(home: string): Record<string, string> {
  return {
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, ".config"),
    XDG_DATA_HOME: path.join(home, ".local", "share"),
    XDG_STATE_HOME: path.join(home, ".local", "state"),
    CODEX_HOME: path.join(home, ".codex-rawr"),
    CODEX_MIRROR_HOME: path.join(home, ".codex"),
    CLAUDE_PLUGINS_LOCAL: path.join(home, ".claude", "plugins", "local"),
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("plugin command surface cutover", () => {
  it("exposes web/cli/scaffold/sync under plugins topic", { timeout: 30000 }, () => {
    const proc = runRawr(["plugins", "--help"]);
    expect(proc.status).toBe(0);

    const out = `${proc.stdout}\n${proc.stderr}`;
    expect(out).toContain("plugins web");
    expect(out).toContain("plugins cli");
    expect(out).toContain("plugins scaffold");
    expect(out).toContain("plugins sync");
    expect(out).toContain("plugins doctor");
    expect(out).toContain("plugins converge");
  });

  it("removes legacy command surfaces", { timeout: 45000 }, () => {
    const hq = runRawr(["hq", "plugins", "list", "--json"]);
    expect((hq.status ?? 1) !== 0).toBe(true);

    const factory = runRawr(["factory", "plugin", "new", "legacy-check", "--dry-run", "--json"]);
    expect((factory.status ?? 1) !== 0).toBe(true);

    const sync = runRawr(["sync", "status", "tools", "--json"]);
    expect((sync.status ?? 1) !== 0).toBe(true);
  });

  it("supports plugins sync dry-run variants", { timeout: 45000 }, () => {
    const tempHome = mkdtempSync(path.join(os.tmpdir(), "rawr-plugins-sync-dry-run-"));
    tempDirs.push(tempHome);
    const syncEnv = makeIsolatedSyncEnv(tempHome);

    const single = runRawr(
      [
        "plugins",
        "sync",
        "plugins",
        "--dry-run",
        "--json",
        "--agent",
        "codex",
        "--codex-home",
        path.join(tempHome, ".codex-rawr"),
        "--no-cowork",
        "--no-install-reconcile",
      ],
      syncEnv,
    );
    expect(single.status).toBe(0);
    const singleJson = parseJson(single);
    expect(singleJson.ok).toBe(true);
    expect(singleJson.data.targets?.[0]?.agent).toBe("codex");

    const all = runRawr(
      [
        "plugins",
        "sync",
        "all",
        "--dry-run",
        "--json",
        "--scope",
        "cli",
        "--allow-partial",
        "--agent",
        "codex",
        "--codex-home",
        path.join(tempHome, ".codex-rawr"),
      ],
      syncEnv,
    );
    expect(all.status).toBe(0);
    const allJson = parseJson(all);
    expect(allJson.ok).toBe(true);
    expect(allJson.data.installReconcile?.action).toBeTruthy();
  });

  it("supports plugins sync sources add/list/remove", { timeout: 45000 }, () => {
    const tempHome = mkdtempSync(path.join(os.tmpdir(), "rawr-plugins-sources-"));
    tempDirs.push(tempHome);
    const fakeSource = path.join(tempHome, "plugin-source");
    const syncEnv = makeIsolatedSyncEnv(tempHome);

    const add = runRawr(["plugins", "sync", "sources", "add", fakeSource, "--json"], syncEnv);
    expect(add.status).toBe(0);
    const addJson = parseJson(add);
    expect(addJson.ok).toBe(true);

    const list = runRawr(["plugins", "sync", "sources", "list", "--json"], syncEnv);
    expect(list.status).toBe(0);
    const listJson = parseJson(list);
    expect(listJson.ok).toBe(true);
    expect(listJson.data.sources.length).toBe(1);

    const remove = runRawr(["plugins", "sync", "sources", "remove", fakeSource, "--json"], syncEnv);
    expect(remove.status).toBe(0);
    const removeJson = parseJson(remove);
    expect(removeJson.ok).toBe(true);

    const listAfter = runRawr(["plugins", "sync", "sources", "list", "--json"], syncEnv);
    expect(listAfter.status).toBe(0);
    const listAfterJson = parseJson(listAfter);
    expect(listAfterJson.ok).toBe(true);
    expect(listAfterJson.data.sources).toEqual([]);
  });
});
