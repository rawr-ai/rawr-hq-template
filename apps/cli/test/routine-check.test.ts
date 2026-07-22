import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runRawr(args: string[]) {
  return spawnSync("bun", ["test/command-fixture/command-test-cli.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("routine check", () => {
  it("supports --json --dry-run with planned steps", () => {
    const proc = runRawr(["routine", "check", "--json", "--dry-run"]);
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.steps.map((s: any) => s.name)).toEqual(["doctor", "security", "tests"]);
    expect(path.isAbsolute(parsed.data.steps[0].cmd)).toBe(true);
    expect(path.basename(parsed.data.steps[0].cmd)).toContain("bun");
    expect(parsed.data.steps[0].args[0]).toBe(
      path.join(projectRoot, "test", "command-fixture", "command-test-cli.ts")
    );
    expect(parsed.data.steps[0].cwd).toBe(projectRoot);
    expect(parsed.data.steps[2].args).toEqual(["run", "test"]);
  });
});
