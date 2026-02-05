import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runNode(args: string[], opts?: { cwd?: string }) {
  return spawnSync("node", ["bin/run.js", ...args], {
    cwd: opts?.cwd ?? cliRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("bin/run.js", () => {
  it("supports --version", () => {
    const proc = runNode(["--version"]);
    expect(proc.status).toBe(0);
    expect(proc.stdout).toContain("@rawr/cli/0.0.0");
  });

  it("runs commands via bun", () => {
    const proc = runNode(["doctor"]);
    expect(proc.status).toBe(0);
    expect(proc.stdout.trim()).toBe("ok");
  });
});

