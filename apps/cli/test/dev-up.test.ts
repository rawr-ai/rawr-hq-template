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

describe("dev up", () => {
  it("supports --json (non-spawning plan output)", () => {
    const proc = runRawr(["dev", "up", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.cmd).toBe("bun");
    expect(parsed.data.args).toEqual(["run", "dev"]);

    const expectedCwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    expect(parsed.data.cwd).toBe(expectedCwd);
  });
});
