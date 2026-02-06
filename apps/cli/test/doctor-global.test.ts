import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("rawr doctor global", () => {
  it("returns machine-readable diagnostics", () => {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const proc = spawnSync("bun", ["src/index.ts", "doctor", "global", "--json"], {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env },
    });

    expect(proc.status).not.toBeNull();
    expect([0, 1]).toContain(proc.status as number);
    expect(proc.stdout).toBeTruthy();

    const parsed = JSON.parse(proc.stdout) as any;
    expect(typeof parsed.ok).toBe("boolean");

    if (parsed.ok) {
      expect(parsed.data.recommendedMode).toBe("bun-symlink");
      expect(typeof parsed.data.bunGlobalRawrPath).toBe("string");
    } else {
      expect(parsed.error.code).toBe("GLOBAL_RAWR_MISCONFIGURED");
    }
  });
});
