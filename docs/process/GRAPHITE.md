# Graphite Workflow (Habitat)

The Habitat repository uses **Graphite** (`gt`) for stacked-PR workflows. The
legacy remote name does not change repository authority.

## Core invariants

- **Graphite-first:** use `gt` for branch/stack operations and restacks.
- **Parallel safety:** when multiple worktrees/agents are active, default to:
  - `gt sync --no-restack`
  - `gt restack --upstack` (only your stack)
- **Git is OK for inspection:** `git status`, `git diff`, `git log`, etc.
- Avoid ad-hoc history rewriting (`git rebase`, `git push --force`) on Graphite-tracked branches.

## Quick commands

```bash
gt ls
gt sync --no-restack
gt create -am "type(scope): summary" agent-A-rawr-slice
gt restack --upstack
```

Recommended preflight before stack mutation:
```bash
git status --short
git branch --show-current
gt ls
gt log --all
```

For canonical merge/prune and repository/interface workflows, use:
- `docs/process/runbooks/STACK_DRAIN_LOOP.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`

## Project memory snapshots

Project memory's current state, including updates and removals, is one file:
the primary checkout's `.fluree-memory/repo.ttl`, with its
`.fluree-memory/.gitignore`. The primary checkout is authoritative and `.fluree/`
is derived from the file. Memories record files (`--refs`), not branches, so a
snapshot travels whole.

- **With the PR.** A PR carries a byte-for-byte copy of the primary checkout's
  file, taken when the PR is committed. Copy it; do not regenerate it, and never
  run `fluree init` in the worktree.
- **Nothing in flight.** Memory changes with no PR to carry them go in a small
  memory-sync PR from `main`, created through Graphite like any other branch.
- **Never overwrite the primary checkout's file from a branch.** After a snapshot
  merges, move the primary file aside before pulling, then confirm the pulled
  file matches or carries forward memories added since the copy.
- Coordinate writers before staging, merging, or switching in the primary
  checkout; Fluree's lock serializes only its own CLI writes, not Git or manual
  edits.

## Related workflow docs

- Repository separation and artifact interfaces: `docs/process/CROSS_REPO_WORKFLOWS.md`
