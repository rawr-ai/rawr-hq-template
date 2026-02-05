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

describe("workflow harden", () => {
  it("supports --json --dry-run with planned steps", () => {
    const proc = runRawr(["workflow", "harden", "--json", "--dry-run"]);
    expect(proc.status).toBe(0);

    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.snapshotOutDir).toContain(".rawr");
    expect(parsed.data.postureOutDir).toContain(".rawr");

    const steps = parsed.data.steps as any[];
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.map((s) => s.name)).toEqual(["snapshot", "security", "posture", "routine-check"]);

    const snapshot = steps.find((s) => s.name === "snapshot");
    expect(snapshot.args.join(" ")).toContain("routine snapshot");
    expect(snapshot.args.join(" ")).toContain("--out");

    const security = steps.find((s) => s.name === "security");
    expect(security.args.join(" ")).toContain("security check");

    const posture = steps.find((s) => s.name === "posture");
    expect(posture.args.join(" ")).toContain("security posture");
  });
});

