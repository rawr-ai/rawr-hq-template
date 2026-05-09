import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createNodeDevResources } from "../src/resources";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-dev-node-"));
  tempDirs.push(dir);
  return dir;
}

describe("@rawr/dev-node resources", () => {
  const decoder = new TextDecoder();

  it("uses the test command fixture instead of spawning real commands when enabled", async () => {
    const dir = await makeTempDir();
    const fixturePath = path.join(dir, "fixture.json");
    const logPath = path.join(dir, "calls.jsonl");
    await fs.writeFile(
      fixturePath,
      JSON.stringify({
        logPath,
        default: { exitCode: 127, stderr: "forbidden" },
        commands: [
          { command: "git", args: ["status", "--short", "--branch"], exitCode: 0, stdout: "## main\n" },
        ],
      }),
      "utf8",
    );

    const resources = createNodeDevResources({
      ...process.env,
      NODE_ENV: "test",
      RAWR_DEV_COMMAND_FIXTURE: fixturePath,
    });

    const result = await resources.process.exec("git", ["status", "--short", "--branch"], { cwd: dir });

    expect(result.exitCode).toBe(0);
    expect(decoder.decode(result.stdout)).toBe("## main\n");
    const calls = (await fs.readFile(logPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    expect(calls).toEqual([{ command: "git", args: ["status", "--short", "--branch"], cwd: dir }]);
  });

  it("returns structured failed output when a command cannot start", async () => {
    const dir = await makeTempDir();
    const resources = createNodeDevResources({ ...process.env, NODE_ENV: "test" });

    const result = await resources.process.exec("__rawr_missing_command__", [], { cwd: dir });

    expect(result.exitCode).toBe(127);
    expect(decoder.decode(result.stderr)).toContain("Failed to start command: __rawr_missing_command__");
  });

  it("returns structured failed output when a command times out", async () => {
    const dir = await makeTempDir();
    const resources = createNodeDevResources({ ...process.env, NODE_ENV: "test" });

    const result = await resources.process.exec(
      process.execPath,
      ["-e", "setTimeout(() => {}, 1000)"],
      { cwd: dir, timeoutMs: 20 },
    );

    expect(result.exitCode).not.toBe(0);
    expect(decoder.decode(result.stderr)).toContain("Command timed out after 20ms");
  });
});
