import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("rawr doctor", () => {
  it("prints ok", () => {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const proc = spawnSync("bun", ["test/command-fixture/command-test-cli.ts", "doctor"], {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env },
    });
    expect(proc.status).toBe(0);
    expect(proc.stdout).toMatch(/ok/);
  });
});
