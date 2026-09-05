# Worktree Operations

Own strict basename-prefix cleanup with explicit local trunk, current physical
worktree identity and caller pins. Locked, detached and trunk worktrees are
protected even when merged-only is disabled. Read Git's native NUL records;
never trim or unquote paths heuristically. Mutation is ordinary Git worktree
removal only, without force, prune, branch deletion or recursive filesystem removal.
