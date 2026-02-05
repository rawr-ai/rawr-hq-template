import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type StepStatus = "planned" | "skipped" | "ok" | "failed";

export type StepResult = {
  name: string;
  cmd: string;
  args: string[];
  cwd: string;
  status: StepStatus;
  durationMs?: number;
  exitCode?: number;
};

const SUBPROCESS_DIR = dirname(fileURLToPath(import.meta.url));

export function resolveCliRoot(): string {
  return resolve(SUBPROCESS_DIR, "../..");
}

export function resolveCliEntrypoint(): string {
  return resolve(resolveCliRoot(), "src/index.ts");
}

export function runStep(input: {
  name: string;
  cmd: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  inheritStdio?: boolean;
}): StepResult & { proc: SpawnSyncReturns<string> } {
  const started = Date.now();
  const proc = spawnSync(input.cmd, input.args, {
    cwd: input.cwd,
    encoding: "utf8",
    stdio: input.inheritStdio ? "inherit" : "pipe",
    env: { ...process.env, ...(input.env ?? {}) },
  });
  const durationMs = Date.now() - started;
  const exitCode = proc.status ?? 1;
  const status: StepStatus = exitCode === 0 ? "ok" : "failed";
  return {
    name: input.name,
    cmd: input.cmd,
    args: input.args,
    cwd: input.cwd,
    status,
    durationMs,
    exitCode,
    proc,
  };
}
