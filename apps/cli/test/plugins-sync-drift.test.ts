import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function runRawr(args: string[], envOverrides?: Record<string, string>) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const testHome = mkdtempSync(path.join(os.tmpdir(), "rawr-test-sync-drift-home-"));
  tempDirs.push(testHome);

  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      HOME: testHome,
      XDG_CONFIG_HOME: path.join(testHome, ".config"),
      XDG_DATA_HOME: path.join(testHome, ".local", "share"),
      XDG_STATE_HOME: path.join(testHome, ".local", "state"),
      ...(envOverrides ?? {}),
    },
  });
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

describe("plugins sync drift", () => {
  it("detects material drift before sync and reports in-sync after apply", { timeout: 60000 }, () => {
    const sharedHome = mkdtempSync(path.join(os.tmpdir(), "rawr-test-sync-drift-shared-home-"));
    const codexHome = path.join(sharedHome, "codex-home");
    tempDirs.push(sharedHome);

    const env = {
      HOME: sharedHome,
      XDG_CONFIG_HOME: path.join(sharedHome, ".config"),
      XDG_DATA_HOME: path.join(sharedHome, ".local", "share"),
      XDG_STATE_HOME: path.join(sharedHome, ".local", "state"),
    };

    const before = runRawr(
      ["plugins", "sync", "drift", "--json", "--agent", "codex", "--codex-home", codexHome],
      env,
    );
    expect(before.status).toBe(1);
    const beforeJson = parseJson(before);
    expect(beforeJson.ok).toBe(true);
    expect(beforeJson.data.summary.inSync).toBe(false);
    expect(beforeJson.data.summary.totalMaterialChanges).toBeGreaterThan(0);

    const apply = runRawr(
      [
        "plugins",
        "sync",
        "all",
        "--json",
        "--agent",
        "codex",
        "--allow-partial",
        "--no-cowork",
        "--no-claude-install",
        "--codex-home",
        codexHome,
      ],
      env,
    );
    expect(apply.status).toBe(0);
    const applyJson = parseJson(apply);
    expect(applyJson.ok).toBe(true);

    const after = runRawr(
      ["plugins", "sync", "drift", "--json", "--agent", "codex", "--codex-home", codexHome],
      env,
    );
    expect(after.status).toBe(0);
    const afterJson = parseJson(after);
    expect(afterJson.ok).toBe(true);
    expect(afterJson.data.summary.inSync).toBe(true);
    expect(afterJson.data.summary.totalMaterialChanges).toBe(0);
  });
});
