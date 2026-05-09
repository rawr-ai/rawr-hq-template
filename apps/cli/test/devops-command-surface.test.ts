import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const CLI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_ENTRYPOINT = path.join(CLI_ROOT, "src", "index.ts");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeFixture(): Promise<{ fixturePath: string; logPath: string; home: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-devops-cli-"));
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

function runRawr(args: string[], env: Record<string, string>) {
  return spawnSync("bun", [CLI_ENTRYPOINT, ...args], {
    cwd: CLI_ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      ...env,
    },
  });
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

async function readCalls(logPath: string): Promise<Array<{ command: string; args: string[] }>> {
  const raw = await fs.readFile(logPath, "utf8");
  return raw.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

describe("rawr dev command surface", () => {
  it("exposes devops topics through the actual CLI entrypoint", async () => {
    const { fixturePath, home } = await makeFixture();
    const proc = runRawr(["dev", "--help"], {
      HOME: home,
      NODE_ENV: "test",
      XDG_CONFIG_HOME: path.join(home, ".config"),
      XDG_DATA_HOME: path.join(home, ".local", "share"),
      XDG_STATE_HOME: path.join(home, ".local", "state"),
      RAWR_DEV_COMMAND_FIXTURE: fixturePath,
    });

    expect(proc.status).toBe(0);
    const out = `${proc.stdout}\n${proc.stderr}`;
    expect(out).toContain("dev stack");
    expect(out).toContain("dev repo");
    expect(out).toContain("dev worktree");
  });

  it("returns planning JSON without running mutating commands by default", async () => {
    const { fixturePath, logPath, home } = await makeFixture();
    const env = {
      HOME: home,
      NODE_ENV: "test",
      XDG_CONFIG_HOME: path.join(home, ".config"),
      XDG_DATA_HOME: path.join(home, ".local", "share"),
      XDG_STATE_HOME: path.join(home, ".local", "state"),
      RAWR_DEV_COMMAND_FIXTURE: fixturePath,
    };

    const drain = runRawr(["dev", "stack", "drain", "--json"], env);
    expect(drain.status).toBe(0);
    expect(parseJson(drain).data.action).toBe("planned");

    const sync = runRawr(["dev", "repo", "sync-upstream", "--json"], env);
    expect(sync.status).toBe(0);
    expect(parseJson(sync).data.action).toBe("planned");

    const cleanup = runRawr(["dev", "worktree", "cleanup", "--json", "--prefix", "wt-agent"], env);
    expect(cleanup.status).toBe(0);
    expect(parseJson(cleanup).data.action).toBe("planned");

    const calls = await readCalls(logPath);
    const rendered = calls.map((call) => `${call.command} ${call.args.join(" ")}`);
    expect(rendered).not.toContain("gt ss --publish --stack --ai --no-interactive");
    expect(rendered.some((line) => line.startsWith("git switch -c"))).toBe(false);
    expect(rendered.some((line) => line.startsWith("git worktree remove"))).toBe(false);
    expect(rendered).not.toContain("git worktree prune");
  });

  it("returns nonzero and stops sequencing when an applied stack command fails", async () => {
    const { fixturePath, logPath, home } = await makeFixture();
    const proc = runRawr(["dev", "stack", "drain", "--json", "--apply"], {
      HOME: home,
      NODE_ENV: "test",
      XDG_CONFIG_HOME: path.join(home, ".config"),
      XDG_DATA_HOME: path.join(home, ".local", "share"),
      XDG_STATE_HOME: path.join(home, ".local", "state"),
      RAWR_DEV_COMMAND_FIXTURE: fixturePath,
    });

    expect(proc.status).toBe(1);
    const parsed = parseJson(proc);
    expect(parsed.data.execution.ok).toBe(false);
    expect(parsed.data.execution.issues[0].code).toBe("STACK_DRAIN_COMMAND_FAILED");

    const rendered = (await readCalls(logPath)).map((call) => `${call.command} ${call.args.join(" ")}`);
    expect(rendered.some((line) => line.startsWith("gt ss --publish"))).toBe(true);
    expect(rendered).not.toContain("gt merge --no-interactive");
    expect(rendered).not.toContain("gt sync --no-restack --no-interactive");
  });
});
