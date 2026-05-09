import type {
  DevCommandStep,
  DevIssue,
  DevPreflight,
} from "./entities";
import type { DevResources } from "./resources";

const textDecoder = new TextDecoder();

export type GitWorktreeEntry = {
  path: string;
  branch: string | null;
  detached: boolean;
};

export function commandText(command: string, args: string[]): string {
  return [command, ...args].join(" ");
}

export function planned(command: string, args: string[]): DevCommandStep {
  return { command, args, status: "planned" };
}

export function skipped(command: string, args: string[], stderr?: string): DevCommandStep {
  return { command, args, status: "skipped", stderr };
}

export function issue(code: string, message: string, details?: Record<string, unknown>): DevIssue {
  return { code, message, severity: "error", details };
}

export function warning(code: string, message: string, details?: Record<string, unknown>): DevIssue {
  return { code, message, severity: "warning", details };
}

export function preflight(issues: DevIssue[]): DevPreflight {
  return { ok: !issues.some((item) => item.severity === "error"), issues };
}

export function execution(issues: DevIssue[] = []): DevPreflight {
  return preflight(issues);
}

export function executionIssueFromStep(step: DevCommandStep, code: string, message: string): DevIssue | null {
  if (step.status !== "failed") return null;
  return issue(code, message, {
    command: commandText(step.command, step.args),
    exitCode: step.exitCode ?? null,
    stderr: step.stderr ?? "",
  });
}

export async function execStep(
  resources: DevResources,
  workspaceRoot: string,
  command: string,
  args: string[],
  timeoutMs?: number,
): Promise<DevCommandStep> {
  let result;
  try {
    result = await resources.process.exec(command, args, { cwd: workspaceRoot, timeoutMs });
  } catch (error) {
    return {
      command,
      args,
      status: "failed",
      exitCode: null,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    command,
    args,
    status: result.exitCode === 0 ? "succeeded" : "failed",
    exitCode: result.exitCode,
    stdout: textDecoder.decode(result.stdout),
    stderr: textDecoder.decode(result.stderr),
  };
}

export async function execText(
  resources: DevResources,
  workspaceRoot: string,
  command: string,
  args: string[],
  timeoutMs?: number,
): Promise<DevCommandStep> {
  return execStep(resources, workspaceRoot, command, args, timeoutMs);
}

export function parseGitStatus(output: string): { branch: string | null; detached: boolean; dirty: boolean } {
  const lines = output.split(/\r?\n/).filter(Boolean);
  const header = lines[0] ?? "";
  const dirty = lines.slice(1).some((line) => line.trim().length > 0);
  if (header.includes("HEAD (no branch)") || header.includes("detached") || header === "## HEAD") {
    return { branch: null, detached: true, dirty };
  }
  const branch = header.match(/^## ([^. ]+)/)?.[1] ?? null;
  return { branch, detached: false, dirty };
}

export function parseWorktrees(output: string): GitWorktreeEntry[] {
  const entries: GitWorktreeEntry[] = [];
  let current: GitWorktreeEntry | null = null;
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = { path: line.slice("worktree ".length), branch: null, detached: false };
      continue;
    }
    if (!current) continue;
    if (line.startsWith("branch ")) current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    else if (line === "detached") current.detached = true;
  }
  if (current) entries.push(current);
  return entries;
}

export function stackLooksConverged(gtLsOutput: string): boolean {
  const branchLines = gtLsOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("◯") || line.includes("◉"));
  return branchLines.length <= 1;
}

export function timestampForBranch(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}${ss}`;
}
