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

describe("security posture", () => {
  it("writes latest.json and latest.md to --out", async () => {
    runRawr(["security", "check", "--json"]);

    const outDir = await mkdtemp(path.join(tmpdir(), "rawr-posture-"));
    const proc = runRawr(["security", "posture", "--json", "--out", outDir]);
    expect(proc.status).toBe(0);

    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.outDir).toBe(outDir);

    const jsonRaw = await readFile(path.join(outDir, "latest.json"), "utf8");
    const mdRaw = await readFile(path.join(outDir, "latest.md"), "utf8");

    const posturePacket = JSON.parse(jsonRaw) as any;
    expect(posturePacket.posture).toBeTruthy();
    expect(typeof posturePacket.posture.ok).toBe("boolean");
    expect(typeof posturePacket.posture.timestamp).toBe("string");
    expect(posturePacket.report).toBeTruthy();
    expect(mdRaw).toContain("RAWR security posture");
  });
});

