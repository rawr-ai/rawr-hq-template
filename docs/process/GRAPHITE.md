# Graphite workflow (RAWR v1)

This repo uses **Graphite** (`gt`) for stacked-PR workflows.

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

## Related workflow docs

- End-to-end agent loops: `docs/process/AGENT_LOOPS.md`
