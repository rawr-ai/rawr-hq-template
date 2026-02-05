import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("rawr doctor", () => {
  it("prints ok", () => {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const proc = spawnSync("bun", ["src/index.ts", "doctor"], {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env },
    });
    expect(proc.status).toBe(0);
    expect(proc.stdout).toMatch(/ok/);
  });
});
