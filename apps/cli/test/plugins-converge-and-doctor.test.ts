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
  const baseHome = envOverrides?.HOME ?? mkdtempSync(path.join(os.tmpdir(), "rawr-test-plugins-converge-home-"));
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

describe("plugins doctor links and converge", () => {
  it("supports non-failing doctor links report", () => {
    const proc = runRawr(["plugins", "doctor", "links", "--json", "--no-fail"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(typeof parsed.data.status).toBe("string");
    expect(Array.isArray(parsed.data.actions)).toBe(true);
  });

  it("supports dry-run converge flow", { timeout: 60000 }, () => {
    const proc = runRawr(["plugins", "converge", "--json", "--dry-run", "--no-fail"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(Array.isArray(parsed.data.steps)).toBe(true);
    expect(parsed.data.steps.some((step: any) => step.step === "final-status")).toBe(true);
  });
});
