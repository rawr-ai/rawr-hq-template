import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import DevRepoSyncUpstream from "../src/commands/dev/repo/sync-upstream";
import DevStackDoctor from "../src/commands/dev/stack/doctor";
import DevStackDrain from "../src/commands/dev/stack/drain";
import DevWorktreeCleanup from "../src/commands/dev/worktree/cleanup";

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMAND_TEST_CLI = path.join(PLUGIN_ROOT, "test", "command-fixture", "devops-command-test-cli.ts");
const TEMP_DIR_PREFIX = "rawr-plugin-devops-cli-";
const BUN_EXECUTABLE = resolveBunExecutable();
const tempDirs: string[] = [];

type CommandProcess = ReturnType<typeof runDevops>;

type LoggedCall = {
  command: string;
  args: string[];
  cwd: string;
};

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(requireOwnedTempDir(dir), { recursive: true, force: true });
  }
});

async function makeFixture(): Promise<{ fixturePath: string; logPath: string; home: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), TEMP_DIR_PREFIX));
  tempDirs.push(dir);
  const home = path.join(dir, "home");
  await fs.mkdir(home, { recursive: true });
  const fixturePath = path.join(dir, "fixture.json");
  const logPath = path.join(dir, "calls.jsonl");
  await fs.writeFile(
    fixturePath,
    JSON.stringify({
      logPath,
      default: { exitCode: 127, stderr: "forbidden command" },
      commands: [
        { command: "git", args: ["status", "--short", "--branch"], stdout: "## agent/devops...origin/agent/devops\n" },
        { command: "gt", args: ["ls"], stdout: "◉ agent/devops\n" },
        {
          command: "git",
          args: ["worktree", "list", "--porcelain"],
          stdout: [
            "worktree /repo/rawr",
            "HEAD abc",
            "branch refs/heads/main",
            "",
            "worktree /repo/wt-agent-devops-old",
            "HEAD def",
            "branch refs/heads/agent/devops-old",
          ].join("\n"),
        },
        { command: "git", args: ["config", "--get", "rawr.upstreamRef"], exitCode: 1 },
        { command: "git", args: ["rev-parse", "--verify", "origin/main"], stdout: "abc\n" },
        { command: "git", args: ["branch", "--merged", "main", "--list", "agent/devops-old"], stdout: "agent/devops-old\n" },
        { command: "pwd", args: ["-P"], stdout: "/repo/rawr\n" },
        { command: "git", exitCode: 1 },
      ],
    }),
    "utf8",
  );
  return { fixturePath, logPath, home };
}

function runDevops(args: readonly string[], env: Readonly<Record<string, string>>) {
  return spawnSync(BUN_EXECUTABLE, ["--config=/dev/null", "--no-env-file", "--no-install", COMMAND_TEST_CLI, ...args], {
    cwd: PLUGIN_ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      ...env,
    },
  });
}

function resolveBunExecutable(): string {
  if ("bun" in process.versions) return process.execPath;
  const candidates = [
    process.env.BUN_INSTALL ? path.join(process.env.BUN_INSTALL, "bin", "bun") : undefined,
    ...String(process.env.PATH ?? "")
      .split(path.delimiter)
      .filter(Boolean)
      .map((directory) => path.join(directory, "bun")),
  ];
  const executable = candidates.find(
    (candidate): candidate is string => typeof candidate === "string" && existsSync(candidate),
  );
  if (!executable) throw new Error("The @rawr/plugin-devops command test requires an absolute Bun executable");
  return path.resolve(executable);
}

function commandEnvironment(input: { home: string; fixturePath: string }): Record<string, string> {
  return {
    HOME: input.home,
    NODE_ENV: "test",
    XDG_CONFIG_HOME: path.join(input.home, ".config"),
    XDG_DATA_HOME: path.join(input.home, ".local", "share"),
    XDG_STATE_HOME: path.join(input.home, ".local", "state"),
    RAWR_DEV_COMMAND_FIXTURE: input.fixturePath,
  };
}

function parseSuccessEnvelope(proc: CommandProcess): { ok: true; data: Record<string, unknown> } {
  expect(proc.stdout).toBeTruthy();
  const parsed: unknown = JSON.parse(proc.stdout);
  if (!isRecord(parsed) || parsed.ok !== true || !isRecord(parsed.data)) {
    throw new Error("Expected a successful RAWR JSON envelope");
  }
  expect(Object.keys(parsed).sort()).toEqual(["data", "ok"]);
  return { ok: true, data: parsed.data };
}

async function readCalls(logPath: string): Promise<LoggedCall[]> {
  const raw = await fs.readFile(logPath, "utf8");
  return raw.trim().split("\n").filter(Boolean).map((line) => {
    const parsed: unknown = JSON.parse(line);
    if (
      !isRecord(parsed)
      || typeof parsed.command !== "string"
      || !Array.isArray(parsed.args)
      || !parsed.args.every((arg) => typeof arg === "string")
      || typeof parsed.cwd !== "string"
    ) {
      throw new Error("Invalid RAWR dev command fixture log entry");
    }
    return { command: parsed.command, args: parsed.args, cwd: parsed.cwd };
  });
}

function requireOwnedTempDir(candidate: string): string {
  const resolved = path.resolve(candidate);
  const tempRoot = path.resolve(os.tmpdir());
  if (
    path.dirname(resolved) !== tempRoot
    || !path.basename(resolved).startsWith(TEMP_DIR_PREFIX)
    || resolved === path.parse(resolved).root
  ) {
    throw new Error(`Refusing to remove unowned test directory: ${candidate}`);
  }
  return resolved;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("@rawr/plugin-devops command surface", () => {
  it("keeps each devops projection discoverable with its owner-qualified flags", () => {
    expect(DevStackDoctor.description).toContain("Inspect");
    expect(DevStackDrain.flags).toHaveProperty("apply");
    expect(DevRepoSyncUpstream.flags).toHaveProperty("upstream-ref");
    expect(DevWorktreeCleanup.flags).toHaveProperty("prefix");
  });

  it("discovers the owner-local dev topics through Oclif", async () => {
    const fixture = await makeFixture();
    const proc = runDevops(["dev", "--help"], commandEnvironment(fixture));

    expect(proc.status).toBe(0);
    const output = `${proc.stdout}\n${proc.stderr}`;
    expect(output).toContain("dev stack");
    expect(output).toContain("dev repo");
    expect(output).toContain("dev worktree");
  });

  it("returns strict planning envelopes without running mutating commands by default", { timeout: 20_000 }, async () => {
    const fixture = await makeFixture();
    const env = commandEnvironment(fixture);
    const commands = [
      ["dev", "stack", "drain", "--json"],
      ["dev", "repo", "sync-upstream", "--json"],
      ["dev", "worktree", "cleanup", "--json", "--prefix", "wt-agent"],
    ] as const;

    for (const command of commands) {
      const proc = runDevops(command, env);
      expect(proc.status).toBe(0);
      const envelope = parseSuccessEnvelope(proc);
      expect(envelope.data.action).toBe("planned");
      const execution = envelope.data.execution;
      expect(isRecord(execution) && execution.ok).toBe(true);
    }

    const rendered = (await readCalls(fixture.logPath)).map((call) => `${call.command} ${call.args.join(" ")}`);
    const mutatingPrefixes = [
      "git fetch ",
      "git merge ",
      "git switch ",
      "git worktree prune",
      "git worktree remove ",
      "gt merge ",
      "gt restack ",
      "gt ss ",
      "gt sync ",
    ];
    expect(rendered.filter((call) => mutatingPrefixes.some((prefix) => call.startsWith(prefix)))).toEqual([]);
  });

  it("returns nonzero and stops sequencing when an applied stack command fails", async () => {
    const fixture = await makeFixture();
    const proc = runDevops(
      ["dev", "stack", "drain", "--json", "--apply"],
      commandEnvironment(fixture),
    );

    expect(proc.status).toBe(1);
    const envelope = parseSuccessEnvelope(proc);
    const execution = envelope.data.execution;
    if (!isRecord(execution) || !Array.isArray(execution.issues) || !isRecord(execution.issues[0])) {
      throw new Error("Expected a failed execution issue in the RAWR JSON envelope");
    }
    expect(execution.ok).toBe(false);
    expect(execution.issues[0].code).toBe("STACK_DRAIN_COMMAND_FAILED");

    const rendered = (await readCalls(fixture.logPath)).map((call) => `${call.command} ${call.args.join(" ")}`);
    expect(rendered.some((call) => call.startsWith("gt ss --publish"))).toBe(true);
    expect(rendered).not.toContain("gt merge --no-interactive");
    expect(rendered).not.toContain("gt sync --no-restack --no-interactive");
  });
});
