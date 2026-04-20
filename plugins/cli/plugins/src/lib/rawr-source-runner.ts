import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * Runs the workspace source CLI for repair actions that must execute as rawr
 * commands rather than direct service calls.
 */
export function runRawrFromSource(workspaceRoot: string, args: string[]): {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const cwd = path.join(workspaceRoot, "apps", "cli");
  const proc = spawnSync("bun", ["src/index.ts", ...args], { cwd, encoding: "utf8", env: { ...process.env } });
  return {
    ok: (proc.status ?? 1) === 0,
    exitCode: proc.status ?? 1,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
}
