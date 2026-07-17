import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { resolve } from "node:path";

export interface GitCommandResult {
  readonly exitCode: number;
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
}

export interface GitCommandRunner {
  run(cwd: string, args: readonly string[], limits?: GitCommandLimits): Promise<GitCommandResult>;
}

export interface GitCommandLimits {
  readonly stdoutBytes?: number;
  readonly stderrBytes?: number;
  readonly durationMs?: number;
}

export async function createGitCommandRunner(options: {
  readonly gitExecutable: string;
  readonly pathEnvironment?: string;
  readonly defaultStdoutBytes?: number;
  readonly defaultStderrBytes?: number;
  readonly defaultDurationMs?: number;
}): Promise<GitCommandRunner> {
  await verifyExecutable(options.gitExecutable);
  const defaults = {
    stdoutBytes: options.defaultStdoutBytes ?? 100 * 1024 * 1024,
    stderrBytes: options.defaultStderrBytes ?? 1024 * 1024,
    durationMs: options.defaultDurationMs ?? 30_000,
  };
  const runner: GitCommandRunner = {
    run(cwd, args, limits = {}) {
      return runCommand(options.gitExecutable, cwd, args, {
        stdoutBytes: limits.stdoutBytes ?? defaults.stdoutBytes,
        stderrBytes: limits.stderrBytes ?? defaults.stderrBytes,
        durationMs: limits.durationMs ?? defaults.durationMs,
      }, options.pathEnvironment);
    },
  };
  return Object.freeze(runner);
}

async function verifyExecutable(path: string): Promise<void> {
  const normalized = resolve(path);
  if (path !== normalized) throw new Error("Git executable must be an absolute normalized path");
  const before = await lstat(normalized, { bigint: true });
  const canonical = await realpath(normalized);
  if (
    !before.isFile()
    || before.isSymbolicLink()
    || canonical !== normalized
    || (Number(before.mode) & 0o111) === 0
  ) {
    throw new Error("Git executable must be a canonical non-symlink executable file");
  }
  const handle = await open(normalized, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat({ bigint: true });
    if (
      !opened.isFile()
      || opened.dev !== before.dev
      || opened.ino !== before.ino
      || (Number(opened.mode) & 0o111) === 0
    ) {
      throw new Error("Git executable changed while being verified");
    }
  } finally {
    await handle.close();
  }
}

async function runCommand(
  executable: string,
  cwd: string,
  args: readonly string[],
  limits: Required<GitCommandLimits>,
  pathEnvironment: string | undefined,
): Promise<GitCommandResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, [
      "--no-optional-locks",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.untrackedCache=false",
      ...args,
    ], {
      cwd,
      env: gitEnvironment(pathEnvironment),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    const timeout = setTimeout(() => {
      fail(new Error(`git command exceeded ${limits.durationMs}ms`));
    }, limits.durationMs);

    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.kill("SIGKILL");
      reject(error);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > limits.stdoutBytes) {
        fail(new Error(`git stdout exceeded ${limits.stdoutBytes} bytes`));
        return;
      }
      stdout.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > limits.stderrBytes) {
        fail(new Error(`git stderr exceeded ${limits.stderrBytes} bytes`));
        return;
      }
      stderr.push(Buffer.from(chunk));
    });
    child.once("error", (error) => fail(error));
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (exitCode === null) {
        reject(new Error(`git command ended without an exit status (${signal ?? "unknown signal"})`));
        return;
      }
      resolve(Object.freeze({
        exitCode,
        stdout: new Uint8Array(Buffer.concat(stdout)),
        stderr: new Uint8Array(Buffer.concat(stderr)),
      }));
    });
  });
}

function gitEnvironment(pathEnvironment: string | undefined): NodeJS.ProcessEnv {
  return {
    ...(pathEnvironment === undefined ? {} : { PATH: pathEnvironment }),
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}
