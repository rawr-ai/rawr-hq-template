import { spawn } from "node:child_process";

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

export async function runCommand(
  command: string,
  args: string[],
  { cwd, env, timeoutMs = 10_000 }: RunCommandOptions = {},
): Promise<CommandResult> {
  const bun = (globalThis as any).Bun;
  if (bun?.spawn) {
    const proc = bun.spawn([command, ...args], {
      cwd,
      env: env ?? process.env,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exited = Promise.race([
      proc.exited,
      new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error(`Command timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      exited,
    ]);

    return { exitCode, stdout, stderr };
  }

  const child = spawn(command, args, {
    cwd,
    env: env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout?.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  child.stderr?.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

  const exitCode = await new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve(code ?? 1);
    });
  });

  return {
    exitCode,
    stdout: Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
  };
}

