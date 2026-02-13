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

describe("workflow forge-command", () => {
  it("supports --json --dry-run with planned steps", () => {
    const proc = runRawr(["workflow", "forge-command", "--json", "--dry-run"]);
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(Array.isArray(parsed.data.steps)).toBe(true);
    expect(parsed.data.steps.map((s: any) => s.name)).toEqual(["scaffold", "tests"]);
  });
});
