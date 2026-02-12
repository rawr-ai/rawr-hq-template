import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const TEST_HOME = mkdtempSync(path.join(os.tmpdir(), "rawr-test-plugins-enable-all-"));

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

describe("plugins web enable all", () => {
  it("supports --json --dry-run and plans enablement", { timeout: 20000 }, () => {
    const proc = runRawr([
      "plugins",
      "web",
      "enable",
      "all",
      "--json",
      "--dry-run",
      "--risk",
      "off",
    ]);
    expect(proc.status).toBe(0);

    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeTruthy();
    expect(typeof parsed.data.plannedCount).toBe("number");
    expect(Array.isArray(parsed.data.attempts)).toBe(true);

    // Ensure dry-run doesn't persist.
    for (const a of parsed.data.attempts as any[]) {
      expect(a.persisted).toBe(false);
    }
  });
});
