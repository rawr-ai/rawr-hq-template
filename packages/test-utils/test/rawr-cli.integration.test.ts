import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "../src";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");

describe("rawr CLI (integration)", () => {
  it("prints help", async () => {
    const proc = await runCommand("bun", ["run", "rawr", "--", "--help"], { cwd: repoRoot });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout).toMatch(/USAGE/);
    expect(proc.stdout).toMatch(/\bdoctor\b/);
  });

  it("returns non-zero exit code on unknown command", async () => {
    const proc = await runCommand("bun", ["run", "rawr", "--", "not-a-command"], { cwd: repoRoot });
    expect(proc.exitCode).not.toBe(0);
    expect(`${proc.stdout}\n${proc.stderr}`).toMatch(/not-a-command/);
  });
});

