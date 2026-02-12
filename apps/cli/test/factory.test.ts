import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const TEST_HOME = mkdtempSync(path.join(os.tmpdir(), "rawr-test-factory-"));

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

describe("plugins scaffold", () => {
  it("plugins scaffold command supports --json --dry-run", () => {
    const proc = runRawr([
      "plugins",
      "scaffold",
      "command",
      "factory-test",
      "sample",
      "--description",
      "Factory test sample",
      "--json",
      "--dry-run",
      "--no-tools-export",
    ]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.planned.some((p: any) => String(p.path).includes("apps/cli/src/commands/factory-test/sample.ts"))).toBe(
      true,
    );
  });

  it("plugins scaffold workflow supports --json --dry-run", () => {
    const proc = runRawr([
      "plugins",
      "scaffold",
      "workflow",
      "factory-wf-test",
      "--description",
      "Factory workflow test",
      "--json",
      "--dry-run",
      "--no-tools-export",
    ]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.planned.some((p: any) => String(p.path).includes("apps/cli/src/commands/workflow/factory-wf-test.ts"))).toBe(
      true,
    );
  });

  it("plugins scaffold web-plugin supports --json --dry-run", () => {
    const proc = runRawr([
      "plugins",
      "scaffold",
      "web-plugin",
      "factory-plugin-test",
      "--kind",
      "server",
      "--json",
      "--dry-run",
    ]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    const pkgWrite = parsed.data.planned.find((p: any) => String(p.path).includes("plugins/web/factory-plugin-test/package.json"));
    expect(pkgWrite).toBeTruthy();
  });
});
