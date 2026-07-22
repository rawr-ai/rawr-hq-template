import { spawn } from "node:child_process";

export type CommandResult = Readonly<{
  stdout: string;
  stderr: string;
}>;

export type CommandRunner = (
  executable: string,
  args: readonly string[],
  options: Readonly<{
    cwd: string;
    env?: NodeJS.ProcessEnv;
    stdout?: "capture" | "inherit";
  }>
) => Promise<CommandResult>;

export const runCommand: CommandRunner = async (executable, args, options) => {
  return await new Promise<CommandResult>((resolve, reject) => {
    const captureStdout = options.stdout !== "inherit";
    const child = spawn(executable, [...args], {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", captureStdout ? "pipe" : "inherit", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
      if (!captureStdout) process.stderr.write(chunk);
    });
    let spawnError: Error | undefined;
    child.once("error", (error) => {
      spawnError = error;
    });
    child.once("close", (code, signal) => {
      if (spawnError !== undefined) {
        reject(spawnError);
        return;
      }
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) {
        resolve(result);
        return;
      }
      reject(
        new Error(
          `${executable} ${args.join(" ")} failed (${signal === null ? `exit ${String(code)}` : `signal ${signal}`}): ${result.stderr.trim()}`
        )
      );
    });
  });
};

export function scrubbedBunEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const environment = { ...process.env, ...overrides };
  for (const name of [
    "BUN_CONFIG",
    "BUN_INSTALL",
    "BUN_INSTALL_CACHE_DIR",
    "BUN_OPTIONS",
    "BUN_PRELOAD",
    "BUN_WORKSPACE",
    "NODE_OPTIONS",
    "NODE_PATH",
  ]) {
    delete environment[name];
  }
  return environment;
}

export function scrubbedGitEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const environment = { ...process.env, ...overrides };
  for (const name of Object.keys(environment)) {
    if (name.startsWith("GIT_")) delete environment[name];
  }
  environment.GIT_CONFIG_GLOBAL = "/dev/null";
  environment.GIT_CONFIG_SYSTEM = "/dev/null";
  environment.GIT_CONFIG_NOSYSTEM = "1";
  return environment;
}
