import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { DevExecResult, DevResources } from "@rawr/dev/resources";

type FixtureResult = {
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
};

type FixtureCommand = FixtureResult & {
  command: string;
  args?: string[];
  cwd?: string;
};

type CommandFixture = {
  logPath?: string;
  default?: FixtureResult;
  commands?: FixtureCommand[];
};

const textEncoder = new TextEncoder();

function fixtureEnabled(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.RAWR_DEV_COMMAND_FIXTURE) && env.NODE_ENV === "test";
}

function resultFromText(input: {
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
}): DevExecResult {
  return {
    exitCode: input.exitCode ?? 0,
    signal: null,
    stdout: textEncoder.encode(input.stdout ?? ""),
    stderr: textEncoder.encode(input.stderr ?? ""),
    durationMs: input.durationMs ?? 0,
  };
}

function matches(candidate: FixtureCommand, command: string, args: string[], cwd: string): boolean {
  if (candidate.command !== command) return false;
  if (candidate.cwd && candidate.cwd !== cwd) return false;
  if (!candidate.args) return true;
  if (candidate.args.length !== args.length) return false;
  return candidate.args.every((arg, index) => arg === args[index]);
}

async function runFixtureCommand(
  fixturePath: string,
  command: string,
  args: string[],
  cwd: string
): Promise<DevExecResult> {
  const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8")) as CommandFixture;
  if (fixture.logPath) {
    await fs.mkdir(path.dirname(fixture.logPath), { recursive: true });
    await fs.appendFile(fixture.logPath, `${JSON.stringify({ command, args, cwd })}\n`, "utf8");
  }
  const found = fixture.commands?.find((candidate) => matches(candidate, command, args, cwd));
  return resultFromText(
    found ??
      fixture.default ?? {
        exitCode: 127,
        stderr: `No fixture entry for ${command} ${args.join(" ")}`,
      }
  );
}

async function runNodeCommand(
  command: string,
  args: string[],
  opts: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs?: number }
): Promise<DevExecResult> {
  const startedAt = Date.now();
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const renderedCommand = `${command} ${args.join(" ")}`.trim();
  return new Promise<DevExecResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: DevExecResult) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };

    const finishFailure = (input: {
      exitCode: number | null;
      signal: string | null;
      message: string;
    }) => {
      const stderr = Buffer.concat([
        ...stderrChunks,
        Buffer.from(textEncoder.encode(input.message)),
      ]);
      finish({
        exitCode: input.exitCode,
        signal: input.signal,
        stdout: Buffer.concat(stdoutChunks),
        stderr,
        durationMs: Date.now() - startedAt,
      });
    };

    timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      finishFailure({
        exitCode: 127,
        signal: null,
        message: `Failed to start command: ${renderedCommand}\n${error.message}`,
      });
    });
    child.on("close", (code, signal) => {
      if (timedOut) {
        finishFailure({
          exitCode: code ?? 124,
          signal,
          message: `Command timed out after ${timeoutMs}ms: ${renderedCommand}`,
        });
        return;
      }
      finish({
        exitCode: code,
        signal,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks),
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

export function createNodeDevResources(env: NodeJS.ProcessEnv = process.env): DevResources {
  return {
    fs: {
      stat: async (filePath) => {
        try {
          const stat = await fs.stat(filePath);
          return { isFile: stat.isFile(), isDirectory: stat.isDirectory() };
        } catch {
          return null;
        }
      },
      readDir: async (dirPath) => {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          return entries.map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory() }));
        } catch {
          return null;
        }
      },
    },
    path: {
      join: path.join,
      resolve: path.resolve,
      relative: path.relative,
      basename: path.basename,
    },
    process: {
      exec: async (command, args, opts = {}) => {
        const cwd = opts.cwd ?? process.cwd();
        const fixturePath = env.RAWR_DEV_COMMAND_FIXTURE;
        if (fixturePath && fixtureEnabled(env)) {
          return runFixtureCommand(fixturePath, command, args, cwd);
        }
        return runNodeCommand(command, args, opts);
      },
      sleep: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
      },
    },
    clock: {
      now: () => new Date(),
    },
  };
}
