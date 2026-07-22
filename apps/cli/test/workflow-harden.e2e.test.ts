import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outputDir = mkdtempSync(path.join(tmpdir(), "rawr-workflow-harden-"));
  const stdoutPath = path.join(outputDir, "stdout.json");
  const proc = spawnSync(
    "bash",
    ["-lc", 'bun test/command-fixture/command-test-cli.ts "$@" > "$RAWR_STDOUT"', "rawr", ...args],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env, RAWR_STDOUT: stdoutPath },
    }
  );

  const stdout = readFileSync(stdoutPath, "utf8");
  rmSync(outputDir, { recursive: true, force: true });

  return { ...proc, stdout };
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
