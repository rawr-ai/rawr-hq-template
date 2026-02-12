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

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("plugin command surface cutover", () => {
  it("exposes web/cli/scaffold/sync under plugins topic", () => {
    const proc = runRawr(["plugins", "--help"]);
    expect(proc.status).toBe(0);

    const out = `${proc.stdout}\n${proc.stderr}`;
    expect(out).toContain("plugins web");
    expect(out).toContain("plugins cli");
    expect(out).toContain("plugins scaffold");
    expect(out).toContain("plugins sync");
  });

  it("removes legacy command surfaces", () => {
    const hq = runRawr(["hq", "plugins", "list", "--json"]);
    expect((hq.status ?? 1) !== 0).toBe(true);

    const factory = runRawr(["factory", "plugin", "new", "legacy-check", "--dry-run", "--json"]);
    expect((factory.status ?? 1) !== 0).toBe(true);

    const sync = runRawr(["sync", "status", "tools", "--json"]);
    expect((sync.status ?? 1) !== 0).toBe(true);
  });

  it("supports plugins sync dry-run variants", () => {
    const single = runRawr(["plugins", "sync", "plugins", "--dry-run", "--json"]);
    expect(single.status).toBe(0);
    const singleJson = parseJson(single);
    expect(singleJson.ok).toBe(true);
    expect(singleJson.data.installReconcile?.action).toBe("planned");

    const all = runRawr([
      "plugins",
      "sync",
      "all",
      "--dry-run",
      "--json",
      "--scope",
      "cli",
      "--allow-partial",
    ]);
    expect(all.status).toBe(0);
    const allJson = parseJson(all);
    expect(allJson.ok).toBe(true);
    expect(allJson.data.installReconcile?.action).toBe("planned");
  });

  it("supports plugins sync sources add/list/remove", () => {
    const tempHome = mkdtempSync(path.join(os.tmpdir(), "rawr-plugins-sources-"));
    tempDirs.push(tempHome);
    const fakeSource = path.join(tempHome, "plugin-source");

    const add = runRawr(["plugins", "sync", "sources", "add", fakeSource, "--json"], { HOME: tempHome });
    expect(add.status).toBe(0);
    const addJson = parseJson(add);
    expect(addJson.ok).toBe(true);

    const list = runRawr(["plugins", "sync", "sources", "list", "--json"], { HOME: tempHome });
    expect(list.status).toBe(0);
    const listJson = parseJson(list);
    expect(listJson.ok).toBe(true);
    expect(listJson.data.sources.length).toBe(1);

    const remove = runRawr(["plugins", "sync", "sources", "remove", fakeSource, "--json"], { HOME: tempHome });
    expect(remove.status).toBe(0);
    const removeJson = parseJson(remove);
    expect(removeJson.ok).toBe(true);

    const listAfter = runRawr(["plugins", "sync", "sources", "list", "--json"], { HOME: tempHome });
    expect(listAfter.status).toBe(0);
    const listAfterJson = parseJson(listAfter);
    expect(listAfterJson.ok).toBe(true);
    expect(listAfterJson.data.sources).toEqual([]);
  });
});
