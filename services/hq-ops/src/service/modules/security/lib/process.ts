import type { HqOpsResources } from "../../../shared/ports/resources";

export function bytesToText(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8");
}

export async function git(
  resources: HqOpsResources,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ ok: boolean; stdout: Uint8Array; stderr: Uint8Array; exitCode: number | null }> {
  const result = await resources.process.exec("git", args, { cwd: opts.cwd, timeoutMs: opts.timeoutMs });
  return {
    ok: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

export async function getRepoRoot(resources: HqOpsResources, cwd: string): Promise<string | null> {
  const result = await git(resources, ["rev-parse", "--show-toplevel"], { cwd, timeoutMs: 5_000 });
  if (!result.ok) return null;
  return bytesToText(result.stdout).trim();
}

export async function listStagedPaths(resources: HqOpsResources, repoRoot: string): Promise<string[]> {
  const result = await git(resources, ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: repoRoot,
    timeoutMs: 10_000,
  });
  if (!result.ok) return [];
  return bytesToText(result.stdout).split("\n").map((value) => value.trim()).filter(Boolean);
}

export async function readStagedBlob(resources: HqOpsResources, repoRoot: string, filePath: string): Promise<Uint8Array | null> {
  const result = await git(resources, ["show", `:${filePath}`], { cwd: repoRoot, timeoutMs: 10_000 });
  if (!result.ok) return null;
  return result.stdout;
}

export async function listRepoFiles(resources: HqOpsResources, repoRoot: string): Promise<string[]> {
  const result = await git(resources, ["ls-files"], { cwd: repoRoot, timeoutMs: 10_000 });
  if (!result.ok) return [];
  return bytesToText(result.stdout).split("\n").map((value) => value.trim()).filter(Boolean);
}
