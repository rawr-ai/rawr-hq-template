import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

const MAX_PROCESS_OUTPUT_BYTES = 4 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 30_000;

export type NodeProviderProcessKind = "claude" | "codex";

export interface NodeProviderCommandRunner {
  run(home: string, args: readonly string[]): Promise<Readonly<{
    stdout: string;
    stderr: string;
  }>>;
}

export interface NodeProviderProcessContext {
  readonly executablePath: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}

export function createNodeProviderCommandRunner(input: Readonly<{
  executablePath: string;
  provider: NodeProviderProcessKind;
}>): NodeProviderCommandRunner {
  const executable = resolveNativeExecutable(input.executablePath);

  return Object.freeze({
    async run(home: string, args: readonly string[]) {
      const context = await prepareNodeProviderProcess(input.provider, executable, home);
      return await runProcess(
        context.executablePath,
        args,
        context.cwd,
        context.env,
      );
    },
  });
}

export async function prepareNodeProviderProcess(
  provider: NodeProviderProcessKind,
  executable: Promise<string>,
  home: string,
): Promise<NodeProviderProcessContext> {
  const [executablePath, cwd] = await Promise.all([executable, requireCanonicalHome(home)]);
  return Object.freeze({
    executablePath,
    cwd,
    env: providerEnvironment(provider, cwd),
  });
}

export function resolveNodeProviderExecutable(executablePath: string): Promise<string> {
  return resolveNativeExecutable(executablePath);
}

export function parseProviderJson(stdout: string, label: string): unknown {
  try {
    return JSON.parse(stdout) as unknown;
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

export function parseProviderHelpCommands(stdout: string): ReadonlySet<string> {
  const commands = new Set<string>();
  for (const line of stdout.split(/\r?\n/u)) {
    const match = /^ {2,4}([a-z][a-z0-9-]*(?:\|[a-z][a-z0-9-]*)*)(?=\s|\[|<|$)/u.exec(line);
    if (match?.[1] === undefined) continue;
    for (const command of match[1].split("|")) commands.add(command);
  }
  return commands;
}

export async function requireContainedProviderPath(
  home: string,
  candidate: string,
  label: string,
): Promise<string> {
  if (!path.isAbsolute(candidate) || path.normalize(candidate) !== candidate) {
    throw new Error(`${label} must be an absolute normalized path`);
  }
  const [root, resolved] = await Promise.all([realpath(home), realpath(candidate)]);
  const relative = path.relative(root, resolved);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error(`${label} escaped the explicit provider home`);
  }
  return resolved;
}

async function resolveNativeExecutable(executablePath: string): Promise<string> {
  if (
    !path.isAbsolute(executablePath)
    || path.normalize(executablePath) !== executablePath
    || executablePath === path.parse(executablePath).root
  ) {
    throw new Error("Provider executable must be an explicit canonical absolute path");
  }
  const resolved = await realpath(executablePath);
  const status = await lstat(resolved, { bigint: true });
  if (!status.isFile() || status.isSymbolicLink() || (status.mode & 0o111n) === 0n) {
    throw new Error("Provider executable must resolve to one executable regular file");
  }
  const handle = await open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const header = Buffer.alloc(2);
    await handle.read(header, 0, header.byteLength, 0);
    if (header.toString("utf8") === "#!") {
      throw new Error("Provider executable cannot be a selector or script wrapper");
    }
  } finally {
    await handle.close();
  }
  return resolved;
}

async function requireCanonicalHome(home: string): Promise<string> {
  if (!path.isAbsolute(home) || path.normalize(home) !== home || home === path.parse(home).root) {
    throw new Error("Provider process home must be an explicit canonical non-root absolute path");
  }
  const resolved = await realpath(home);
  const status = await lstat(resolved);
  if (resolved !== home || !status.isDirectory() || status.isSymbolicLink()) {
    throw new Error("Provider process home must be an existing canonical non-symlink directory");
  }
  return resolved;
}

function providerEnvironment(provider: NodeProviderProcessKind, home: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, HOME: home };
  delete environment.CODEX_FORK_HOME;
  delete environment.CODEX_SWITCHBOARD_HOME;
  delete environment.CODEX_SWITCHBOARD_TARGET;
  delete environment.CLAUDE_CONFIG_DIR;
  delete environment.CODEX_HOME;
  if (provider === "codex") environment.CODEX_HOME = home;
  else environment.CLAUDE_CONFIG_DIR = home;
  return environment;
}

async function runProcess(
  executablePath: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<Readonly<{ stdout: string; stderr: string }>> {
  return await new Promise((resolve, reject) => {
    const child = spawn(executablePath, args, {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("Provider command exceeded its bounded execution timeout"));
    }, PROCESS_TIMEOUT_MS);

    const collect = (chunks: Buffer[], chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > MAX_PROCESS_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(new Error("Provider command exceeded its bounded output limit"));
        return;
      }
      chunks.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
    child.on("error", (error) => finish(error));
    child.on("close", (code, signal) => {
      const out = Buffer.concat(stdout).toString("utf8");
      const errorOutput = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        finish(new Error(
          `Provider command failed (${signal ?? String(code)}): ${errorOutput.trim() || out.trim()}`,
        ));
        return;
      }
      finish(null, Object.freeze({ stdout: out, stderr: errorOutput }));
    });

    function finish(
      error: Error | null,
      value?: Readonly<{ stdout: string; stderr: string }>,
    ): void {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error !== null) reject(error);
      else if (value !== undefined) resolve(value);
      else reject(new Error("Provider command ended without a result"));
    }
  });
}
