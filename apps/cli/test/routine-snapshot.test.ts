import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("routine snapshot", () => {
  it("writes snapshot.json and snapshot.md to --out", async () => {
    const outDir = await mkdtemp(path.join(tmpdir(), "rawr-snapshot-"));
    const proc = runRawr(["routine", "snapshot", "--json", "--out", outDir]);
    expect(proc.status).toBe(0);

    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.outDir).toBe(outDir);

    const jsonRaw = await readFile(path.join(outDir, "snapshot.json"), "utf8");
    const mdRaw = await readFile(path.join(outDir, "snapshot.md"), "utf8");

    const snapshot = JSON.parse(jsonRaw) as any;
    expect(typeof snapshot.timestamp).toBe("string");
    expect(typeof snapshot.workspaceRoot).toBe("string");
    expect(typeof snapshot.rawrVersion).toBe("string");
    expect(typeof snapshot.bunVersion).toBe("string");
    expect(mdRaw).toContain("RAWR routine snapshot");
  });
});

