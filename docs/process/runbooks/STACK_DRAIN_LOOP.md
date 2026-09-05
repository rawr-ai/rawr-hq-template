# Stack Drain Loop (Graphite)

Use this runbook to publish a stack, let Graphite merge it, then sweep its consumed branches in one pass. Do not orchestrate a separate drain cycle for every branch.

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
3. Apply repository boundary policy from `docs/process/CROSS_REPO_WORKFLOWS.md`:
- Do not run CLI publication, content lifecycle, or provider mutation as part of stack mechanics.
- Keep stack mutation Graphite-first (`gt`), not ad-hoc `git rebase`.
- Promote Habitat, Rawr, and Marketplace independently; never merge one repository into another.

## Publish, merge, then sweep

From the intended stack tip, publish and request the native stack merge:

```bash
gt ss --publish --ai --stack --no-interactive
gt merge --no-interactive
```

Wait for Graphite's merge to finish and confirm that the intended PRs are actually merged. A successful merge request is not itself completion. Do not repeatedly submit or merge while that request is still progressing.

Once merged, sweep the consumed branches together:

```bash
gt sync --force --no-restack --no-interactive
gt ls
```

Check the worktree and branch state before using `--force`: it suppresses overwrite/deletion confirmations, not only prompts about merged branches. Preserve unrelated local work and occupied worktrees. Required checks and exact-main verification still apply; the cleanup mechanism does not replace them.

## Failure and recovery

1. Merge blocked (checks/review/conflict):
- Fix the blocking condition and resume at the affected operation, rather than restarting a per-branch loop.

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
gt sync --force --no-restack --no-interactive
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

Use Graphite publish/merge/sync/prune behavior as canonical. Check installed command help when flags change; `gt upgrade --no-interactive` checks for and installs CLI updates.

Command authority: [Graphite command reference](https://graphite.com/docs/command-reference) and the installed CLI help.

## Exit criteria

- Intended stack branches are merged.
- Merged branches are pruned by Graphite.
- `gt ls` reflects the expected stable stack state.
- `git status --short` is clean.
- Each repository independently satisfies its required local and remote checks.
