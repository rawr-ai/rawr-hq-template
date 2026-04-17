import { execCmd } from "./exec";

export async function git(
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ ok: boolean; stdout: Buffer; stderr: Buffer; exitCode: number | null }> {
  const result = await execCmd("git", args, { cwd: opts.cwd, timeoutMs: opts.timeoutMs });
  return {
    ok: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

export async function getRepoRoot(cwd: string): Promise<string | null> {
  const result = await git(["rev-parse", "--show-toplevel"], { cwd, timeoutMs: 5_000 });
  if (!result.ok) return null;
  return result.stdout.toString("utf8").trim();
}

export async function listStagedPaths(repoRoot: string): Promise<string[]> {
  const result = await git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: repoRoot,
    timeoutMs: 10_000,
  });
  if (!result.ok) return [];
  return result.stdout.toString("utf8").split("\n").map((value) => value.trim()).filter(Boolean);
}

export async function readStagedBlob(repoRoot: string, filePath: string): Promise<Buffer | null> {
  const result = await git(["show", `:${filePath}`], { cwd: repoRoot, timeoutMs: 10_000 });
  if (!result.ok) return null;
  return result.stdout;
}

export async function listRepoFiles(repoRoot: string): Promise<string[]> {
  const result = await git(["ls-files"], { cwd: repoRoot, timeoutMs: 10_000 });
  if (!result.ok) return [];
  return result.stdout.toString("utf8").split("\n").map((value) => value.trim()).filter(Boolean);
}
