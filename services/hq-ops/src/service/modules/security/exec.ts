import { spawn } from "node:child_process";

export type ExecResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
  durationMs: number;
};

export async function execCmd(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<ExecResult> {
  const startedAt = Date.now();

  return await new Promise<ExecResult>((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (d) => stdoutChunks.push(Buffer.from(d)));
    child.stderr.on("data", (d) => stderrChunks.push(Buffer.from(d)));

    let killedByTimeout = false;
    const timeout =
      opts.timeoutMs && opts.timeoutMs > 0
        ? setTimeout(() => {
            killedByTimeout = true;
            child.kill("SIGKILL");
          }, opts.timeoutMs)
        : null;

    child.on("close", (exitCode, signal) => {
      if (timeout) clearTimeout(timeout);

      resolve({
        exitCode: killedByTimeout ? 124 : exitCode,
        signal,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks),
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

