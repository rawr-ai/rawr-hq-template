import { execCmd } from "./exec.js";

export async function git(
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ ok: boolean; stdout: Buffer; stderr: Buffer; exitCode: number | null }> {
  const r = await execCmd("git", args, { cwd: opts.cwd, timeoutMs: opts.timeoutMs });
  return { ok: r.exitCode === 0, stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode };
}

export async function getRepoRoot(cwd: string): Promise<string | null> {
  const r = await git(["rev-parse", "--show-toplevel"], { cwd, timeoutMs: 5000 });
  if (!r.ok) return null;
  return r.stdout.toString("utf8").trim();
}

export async function listStagedPaths(repoRoot: string): Promise<string[]> {
  const r = await git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: repoRoot,
    timeoutMs: 10_000,
  });
  if (!r.ok) return [];
  return r.stdout
    .toString("utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function readStagedBlob(repoRoot: string, path: string): Promise<Buffer | null> {
  const r = await git(["show", `:${path}`], { cwd: repoRoot, timeoutMs: 10_000 });
  if (!r.ok) return null;
  return r.stdout;
}

export async function listRepoFiles(repoRoot: string): Promise<string[]> {
  const r = await git(["ls-files"], { cwd: repoRoot, timeoutMs: 10_000 });
  if (!r.ok) return [];
  return r.stdout
    .toString("utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

