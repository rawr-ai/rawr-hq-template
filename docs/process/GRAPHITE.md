# Graphite workflow (RAWR HQ-Template)

This repo uses **Graphite** (`gt`) for stacked-PR workflows in `RAWR HQ-Template`.

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

For canonical merge/prune and cross-repo integration loops, use:
- `docs/process/runbooks/STACK_DRAIN_LOOP.md`
- `docs/process/runbooks/TEMPLATE_TO_PERSONAL_INTEGRATION_LOOP.md`
- `docs/process/HQ_OPERATIONS.md` (repo boundary guard + retry/acceptance policy)

## Related workflow docs

- End-to-end agent loops: `docs/process/AGENT_LOOPS.md`
