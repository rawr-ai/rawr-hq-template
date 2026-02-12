import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const TEST_HOME = mkdtempSync(path.join(os.tmpdir(), "rawr-test-plugins-install-all-"));

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: TEST_HOME,
      XDG_CONFIG_HOME: path.join(TEST_HOME, ".config"),
      XDG_DATA_HOME: path.join(TEST_HOME, ".local", "share"),
      XDG_STATE_HOME: path.join(TEST_HOME, ".local", "state"),
    },
  });
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

describe("plugins cli install all", () => {
  it("supports --json --dry-run with planned links", () => {
    const proc = runRawr(["plugins", "cli", "install", "all", "--json", "--dry-run"]);
    expect(proc.status).toBe(0);

    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeTruthy();
    expect(Array.isArray(parsed.data.planned)).toBe(true);
    expect(Array.isArray(parsed.data.skipped)).toBe(true);

    const ids = (parsed.data.planned as any[]).map((p) => p.pluginId);
    // At least the shipped sample oclif plugins should be detectable.
    expect(ids).toContain("@rawr/plugin-hello");
  });
});
