import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
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
  const baseHome = envOverrides?.HOME ?? mkdtempSync(path.join(os.tmpdir(), "rawr-test-plugins-status-home-"));
  if (!envOverrides?.HOME) tempDirs.push(baseHome);

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

describe("plugins status", () => {
  it("returns non-zero by default when install drift exists", () => {
    const proc = runRawr(["plugins", "status", "--json", "--checks", "install"]);
    expect(proc.status).toBe(1);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.statuses.install).toBe("DRIFT_DETECTED");
    expect(parsed.data.statuses.overall).toBe("NEEDS_CONVERGENCE");
    expect(parsed.data.actions.some((a: any) => String(a.command).includes("plugins cli install all"))).toBe(true);
  });

  it("shows sync DRIFT then IN_SYNC after apply (sync-only checks)", { timeout: 60000 }, () => {
    const sharedHome = mkdtempSync(path.join(os.tmpdir(), "rawr-test-plugins-status-sync-"));
    const codexHome = path.join(sharedHome, "codex-home");
    tempDirs.push(sharedHome);

    const env = {
      HOME: sharedHome,
      XDG_CONFIG_HOME: path.join(sharedHome, ".config"),
      XDG_DATA_HOME: path.join(sharedHome, ".local", "share"),
      XDG_STATE_HOME: path.join(sharedHome, ".local", "state"),
    };

    const before = runRawr(
      ["plugins", "status", "--json", "--checks", "sync", "--agent", "codex", "--codex-home", codexHome, "--material-only"],
      env,
    );
    expect(before.status).toBe(1);
    const beforeJson = parseJson(before);
    expect(beforeJson.ok).toBe(true);
    expect(beforeJson.data.statuses.sync).toBe("DRIFT_DETECTED");

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

    const after = runRawr(
      ["plugins", "status", "--json", "--checks", "sync", "--agent", "codex", "--codex-home", codexHome, "--material-only"],
      env,
    );
    expect(after.status).toBe(0);
    const afterJson = parseJson(after);
    expect(afterJson.ok).toBe(true);
    expect(afterJson.data.statuses.sync).toBe("IN_SYNC");
    expect(afterJson.data.statuses.overall).toBe("HEALTHY");
  });

  it("prints clear human status sections", () => {
    const proc = runRawr(["plugins", "status", "--checks", "install", "--no-fail"]);
    expect(proc.status).toBe(0);
    const out = `${proc.stdout}\n${proc.stderr}`;
    expect(out).toContain("checks: install");
    expect(out).toContain("sync: SKIPPED");
    expect(out).toContain("install: DRIFT_DETECTED");
    expect(out).toContain("overall: NEEDS_CONVERGENCE");
    expect(out).toContain("actions:");
  });

  it("applies install repair when requested", { timeout: 60000 }, () => {
    const sharedHome = mkdtempSync(path.join(os.tmpdir(), "rawr-test-plugins-status-repair-"));
    tempDirs.push(sharedHome);

    const repaired = runRawr(
      ["plugins", "status", "--json", "--checks", "install", "--repair", "--no-fail"],
      {
        HOME: sharedHome,
        XDG_CONFIG_HOME: path.join(sharedHome, ".config"),
        XDG_DATA_HOME: path.join(sharedHome, ".local", "share"),
        XDG_STATE_HOME: path.join(sharedHome, ".local", "state"),
      },
    );
    expect(repaired.status).toBe(0);
    const repairedJson = parseJson(repaired);
    expect(repairedJson.ok).toBe(true);
    expect(repairedJson.data.repair.action).toBe("applied");
    expect(repairedJson.data.statuses.install).toBe("IN_SYNC");
    expect(repairedJson.data.statuses.overall).toBe("HEALTHY");
  });
});
