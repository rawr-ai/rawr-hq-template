import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

describe("factory", () => {
  it("factory command new supports --json --dry-run", () => {
    const proc = runRawr([
      "factory",
      "command",
      "new",
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

  it("factory workflow new supports --json --dry-run", () => {
    const proc = runRawr([
      "factory",
      "workflow",
      "new",
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

  it("factory plugin new supports --json --dry-run", () => {
    const proc = runRawr([
      "factory",
      "plugin",
      "new",
      "factory-plugin-test",
      "--kind",
      "server",
      "--json",
      "--dry-run",
    ]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.planned.some((p: any) => String(p.path).includes("plugins/factory-plugin-test/package.json"))).toBe(true);
  });
});

