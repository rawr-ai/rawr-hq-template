import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

async function exists(p: string): Promise<boolean> {
  try {
    const st = await stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

describe("workflow harden (e2e)", () => {
  it("runs end-to-end and emits machine-readable output", async () => {
    const proc = runRawr(["workflow", "harden", "--json", "--mode", "repo"]);
    expect(proc.status).not.toBeNull();
    expect([0, 1]).toContain(proc.status as number);

    expect(proc.stdout).toBeTruthy();
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeTruthy();
    expect(typeof parsed.data.ok).toBe("boolean");
    expect(typeof parsed.data.snapshotOutDir).toBe("string");
    expect(typeof parsed.data.postureOutDir).toBe("string");
    expect(Array.isArray(parsed.data.steps)).toBe(true);

    const snapshotJson = path.join(parsed.data.snapshotOutDir, "snapshot.json");
    expect(await exists(snapshotJson)).toBe(true);

    const postureStep = parsed.data.steps.find((s: any) => s.name === "posture");
    if (postureStep?.status === "ok") {
      const postureJson = path.join(parsed.data.postureOutDir, "latest.json");
      expect(await exists(postureJson)).toBe(true);
    }
  }, 30_000);
});

