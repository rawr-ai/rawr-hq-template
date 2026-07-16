# Stack Drain Loop (Graphite)

Use this runbook when a Graphite stack has multiple branches/PRs that must be published, merged, and pruned in a repeatable loop.

## When to use

- You have an active stack with mergeable branches.
- You want Graphite-managed prune behavior (not manual branch deletes).
- You need deterministic failure/recovery handling.

## Preconditions

1. Start on the stack you intend to drain:
```bash
git status --short
git branch --show-current
gt ls
gt log --all
```
2. Sync safely for parallel worktrees:
```bash
gt sync --no-restack
```
3. Apply repository boundary policy from `docs/process/HQ_OPERATIONS.md`:
- Do not run controller or content lifecycle mutation as part of stack mechanics.
- Keep stack mutation Graphite-first (`gt`), not ad-hoc `git rebase`.
- Promote Template and personal independently; never merge one repository into the other.

## Canonical drain loop

Run this cycle until `gt ls` stabilizes and merged branches are pruned:

```bash
gt ss --publish --ai --stack --no-interactive
gt merge --no-interactive
gt sync --no-restack --no-interactive
gt ls
```

## Failure and recovery

1. Merge blocked (checks/review/conflict):
- Fix the blocking condition, then rerun the canonical loop.

2. Transient test failure while validating drain:
- Re-run only the failing test once in isolation.
- Re-run the full suite once.
- Patch code/tests only if failure reproduces.
- If failure remains non-deterministic after these retries, log it as a blocker before merge.

3. Branches merged but not pruned:
```bash
git worktree list
```
- Remove disposable worktrees pinning merged branches, then rerun:
```bash
gt sync --no-restack --no-interactive
```

4. Stack ordering/drift looks wrong:
```bash
gt restack --upstack
gt sync --no-restack
gt ls
```

## Prohibited cleanup path

Do not use manual branch deletion as the normal drain cleanup path:
- `git branch -d <branch>`
- `git branch -D <branch>`

Use Graphite publish/merge/sync/prune behavior as canonical.

## Exit criteria

- Intended stack branches are merged.
- Merged branches are pruned by Graphite.
- `gt ls` reflects the expected stable stack state.
- `git status --short` is clean.
- Each repository independently satisfies `docs/process/HQ_OPERATIONS.md` final acceptance checklist.
