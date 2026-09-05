import type { Worktree } from "../dto";

/** Parses Git's public NUL-delimited worktree records without trimming path bytes. */
export function parseWorktrees(output: string): Worktree[] | undefined {
  if (!output.endsWith("\0\0")) return undefined;
  const worktrees: Worktree[] = [];
  for (const record of output.slice(0, -2).split("\0\0")) {
    const fields = record.split("\0");
    const first = fields.shift();
    if (first === undefined || !first.startsWith("worktree ") || first.length === 9)
      return undefined;
    const branches = fields.filter((field) => field.startsWith("branch "));
    if (
      branches.length > 1 ||
      (branches[0] !== undefined && !branches[0].startsWith("branch refs/heads/"))
    )
      return undefined;
    const detached = fields.includes("detached");
    if (detached && branches.length > 0) return undefined;
    worktrees.push({
      path: first.slice(9),
      branch: branches[0]?.slice("branch refs/heads/".length) ?? null,
      detached,
      locked: fields.some((field) => field === "locked" || field.startsWith("locked ")),
    });
  }
  return worktrees;
}
