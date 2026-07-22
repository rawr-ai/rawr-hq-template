import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const TEST_HOME = mkdtempSync(path.join(os.tmpdir(), "rawr-test-stubs-"));
const CLI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMAND_TEST_CLI = path.join(CLI_ROOT, "test", "command-fixture", "command-test-cli.ts");

function runRawr(args: string[]) {
  const cwd = CLI_ROOT;
  return spawnSync("bun", [COMMAND_TEST_CLI, ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      RAWR_WORKSPACE_ROOT: cwd,
      HOME: TEST_HOME,
      XDG_CONFIG_HOME: path.join(TEST_HOME, ".config"),
      XDG_DATA_HOME: path.join(TEST_HOME, ".local", "share"),
      XDG_STATE_HOME: path.join(TEST_HOME, ".local", "state"),
    },
  });
}

function expectExit(proc: ReturnType<typeof runRawr>, allowed: number[]) {
  expect(proc.status).not.toBeNull();
  expect(allowed).toContain(proc.status as number);
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

describe("rawr command surfaces", () => {
  it("tools export supports --json", { timeout: 30000 }, () => {
    const proc = runRawr(["tools", "export", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    const commands = parsed.data.tools.map((tool: { command: string }) => tool.command);

    expect(commands).toContain("doctor");
    expect(commands.filter((command: string) => command.includes(" create"))).toEqual([
      "cli command create <topic> <name>",
      "cli extension create <id> --destination <path>",
      "agent plugins create <id> --content-workspace <path>",
    ]);
    expect(commands.some((command: string) => command.startsWith("plugins web"))).toBe(false);
    expect(commands.some((command: string) => command.startsWith("plugins scaffold"))).toBe(false);
    expect(commands).not.toContain("agent plugins retire");
    expect(commands.some((command: string) => command.startsWith("workflow forge-command"))).toBe(
      false
    );
  });

  it("security check returns a machine-readable report", { timeout: 30000 }, () => {
    const proc = runRawr(["security", "check", "--json"]);
    expectExit(proc, [0, 1]);

    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);

    const report = parsed.data.report;
    expect(report).toBeTruthy();
    expect(typeof report.ok).toBe("boolean");
    expect(Array.isArray(report.findings)).toBe(true);
    expect(typeof report.summary).toBe("string");
    expect(typeof report.timestamp).toBe("string");

    if (proc.status === 1) expect(report.ok).toBe(false);
    if (proc.status === 0) expect(report.ok).not.toBe(false);
  });

  it("security report reads the last report from disk", { timeout: 30000 }, () => {
    runRawr(["security", "check", "--json"]);
    const proc = runRawr(["security", "report", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeTruthy();
    expect(parsed.data.report).toBeTruthy();
    expect(typeof parsed.data.report.timestamp).toBe("string");
  });
});
