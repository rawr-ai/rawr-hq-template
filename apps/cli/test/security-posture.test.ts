import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const TEST_HOME = mkdtempSync(path.join(tmpdir(), "rawr-test-security-posture-"));

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      HOME: TEST_HOME,
      XDG_CONFIG_HOME: path.join(TEST_HOME, ".config"),
      XDG_DATA_HOME: path.join(TEST_HOME, ".local", "share"),
      XDG_STATE_HOME: path.join(TEST_HOME, ".local", "state"),
    },
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
