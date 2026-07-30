/** Parsed identity and cleanliness from `git status --short --branch`. */
export type GitStatus = {
  branch: string | null;
  detached: boolean;
  dirty: boolean;
};

/** Parsed identity from one `git worktree list --porcelain` entry. */
export type GitWorktreeEntry = {
  path: string;
  branch: string | null;
  detached: boolean;
};

/** Parses the bounded Git status output consumed by Repo and Stack operations. */
export function parseGitStatus(output: string): GitStatus {
  const lines = output.split(/\r?\n/).filter(Boolean);
  const header = lines[0] ?? "";
  const dirty = lines.slice(1).some((line) => line.trim().length > 0);
  if (header.includes("HEAD (no branch)") || header.includes("detached") || header === "## HEAD") {
    return { branch: null, detached: true, dirty };
  }
  const branch = header.match(/^## ([^. ]+)/)?.[1] ?? null;
  return { branch, detached: false, dirty };
}

/** Parses the bounded porcelain worktree output consumed by Repo and Worktree operations. */
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
    if (line.startsWith("branch "))
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    else if (line === "detached") current.detached = true;
  }
  if (current) entries.push(current);
  return entries;
}
