import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "../src";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");

describe("rawr CLI (integration)", () => {
  it.each([
    ["help", ["--help"]],
    ["command dispatch", ["not-a-command"]],
  ] as const)("requires an immutable controller before source-local %s", async (_label, args) => {
    const proc = await runCommand("bun", ["run", "rawr", "--", ...args], { cwd: repoRoot });
    expect(proc.exitCode).toBe(78);
    expect(`${proc.stdout}\n${proc.stderr}`).toContain(
      "CONTROLLER_RELEASE_REQUIRED:RAWR_CONTROLLER_DIGEST"
    );
  });
});
