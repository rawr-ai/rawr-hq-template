# Agent A Scratch - Upstream Sync Runbook Hardening

Date: 2026-02-06

## Working Notes

- Required skills loaded:
  - `skill-creator`
  - `docs-architecture`
  - `graphite`
  - `fork-rebase-maintenance`
  - `fork-rebase-maintenance/references/rebase-workflow.md`
- Repo routers loaded:
  - template root `AGENTS.md`
  - template `docs/AGENTS.md`
  - personal `docs/AGENTS.md`
- Dependency input loaded:
  - `docs/projects/agent-readiness/AGENTS_COVERAGE_MATRIX.md`

## Facts Verified In-Repo

- `rawr-hq` remotes:
  - `origin=https://github.com/rawr-ai/rawr-hq.git`
  - `upstream=https://github.com/rawr-ai/rawr-hq-template.git`
- `rawr-hq-template` remotes:
  - `origin=https://github.com/rawr-ai/rawr-hq-template.git`
- Current branch in both repos: `main`
- Graphite trunk in both repos: `main`

## Decisions

1. Create `docs/process/UPSTREAM_SYNC_RUNBOOK.md` net-new (missing in both repos).
2. Default sync path is merge-based for `RAWR HQ` to keep high-divergence updates safer.
3. Include explicit rebase variant for low-divergence maintenance branches.
4. Include Graphite safety guidance (`gt sync --no-restack`, `gt restack --upstack`) to avoid cross-stack churn.
5. Include gotchas for branch protection and command-channel drift.

## Verification Log

- `cmp -s` confirmed both runbook copies are identical.
- Section-presence grep confirmed required content:
  - remote setup commands
  - merge + rebase paths
  - conflict handling
  - rollback/recovery
  - verification gates (`bun run build`, `bun run test`, trunk/remotes)
  - Graphite safe-sync/restack guidance
  - command-channel policy and protected-branch gotchas
