# Updating a Personal `RAWR HQ` from `RAWR HQ-Template`

This document describes the recommended upstream sync workflow.

For executable, step-by-step sync procedures (including rollback/recovery and Graphite safety gates), use `docs/process/UPSTREAM_SYNC_RUNBOOK.md`.

## Model

- Upstream template: `RAWR HQ-Template`
- Personal repo: `RAWR HQ`

Your personal repo is expected to diverge. Syncs should be deliberate and validated.

## Setup (once)

```bash
git remote add upstream <RAWR-HQ-Template-url>
git fetch upstream
```

## Recommended Sync Workflow

1. Create a sync branch from your personal `main`.
2. Fetch upstream changes.
3. Merge upstream into the sync branch (default) or rebase for low-divergence branches.
4. Resolve conflicts by ownership policy:
   - keep personal behavior in user-owned/plugin areas
   - accept upstream decisions for shared core unless intentionally overridden
5. Run full verification:
   - `bun run build`
   - `bun run test`
6. Merge sync branch into personal `main`.

## Merge vs Rebase

- Default: merge-based sync branch for clarity and safer high-divergence history.
- Rebase: acceptable for low-divergence, local linearization.

## Sync Triggers

- Regular cadence: biweekly or monthly.
- Immediate sync when upstream changes:
  - command contracts
  - plugin runtime channel behavior
  - security/state/journal core packages

## Conflict Handling Policy

- Treat `apps/cli` and shared `packages/*` as upstream-governed unless you intentionally fork behavior.
- Keep personal customizations isolated in plugins and local docs whenever possible.
- Record intentional forks in your personal repo docs.

## Command Channel Notes

- `rawr plugins web ...` is canonical for workspace runtime plugins (Channel B).
- `rawr plugins ...` is reserved for oclif plugin manager commands (Channel A).
