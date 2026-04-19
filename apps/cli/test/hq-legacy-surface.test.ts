import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(cliRoot, "..", "..");

function runRawr(args: string[]) {
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("legacy managed runtime surfaces", () => {
  it("removes rawr dev up and rawr routine start from the command surface", () => {
    const devUp = runRawr(["dev", "up", "--json"]);
    expect(devUp.status).not.toBe(0);
    expect(devUp.stderr).toContain("command dev:up not found");

    const routineStart = runRawr(["routine", "start", "--json"]);
    expect(routineStart.status).not.toBe(0);
    expect(routineStart.stderr).toContain("command routine:start not found");
  });

  it("omits legacy lifecycle entries from tools export", () => {
    const proc = runRawr(["tools", "export", "--json"]);
    expect(proc.status).toBe(0);

    const parsed = JSON.parse(proc.stdout) as any;
    const commands = parsed.data.tools.map((tool: any) => tool.command);
    expect(commands).toContain("hq up");
    expect(commands).toContain("hq status");
    expect(commands).not.toContain("dev up");
    expect(commands).not.toContain("routine start");
  });

  it("removes bun run dev:up from package scripts", () => {
    const proc = spawnSync("bun", ["run", "dev:up"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env },
    });

    expect(proc.status).not.toBe(0);
    expect(`${proc.stdout}\n${proc.stderr}`).toContain("dev:up");
  });
});
