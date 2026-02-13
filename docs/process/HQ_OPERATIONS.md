# RAWR HQ Operations Playbook

This file is the canonical operations policy for repo boundary, validation retries, and cross-repo acceptance checks.

## Repo Boundary Guard (Template vs Personal)

Run these actions only in personal `RAWR HQ`:
- `rawr plugins sync all`
- `rawr plugins sync all --dry-run`
- global runtime convergence commands (`rawr doctor global`, `rawr plugins converge`, `rawr plugins status --checks all`)

Run these actions in either repo when relevant:
- `bun run build`
- `bun run test`
- Graphite stack operations (`gt ls`, `gt sync --no-restack`, `gt merge --no-interactive`)

Never run full plugin sync from template during stack drains. Template is upstream baseline; personal is runtime owner.

## Fixed vs Customizable Zones

Treat these as upstream-governed (fixed by default):
- `apps/cli`
- shared `packages/*` core contracts
- canonical docs and governance files

Treat these as customization zones:
- `plugins/api/*`, `plugins/workflows/*`, `plugins/web/*`, `plugins/cli/*`, `plugins/agents/*`, `plugins/mcp/*` (unless promoted to template scaffold)
- personal workflow docs in downstream repos

Manifest-first runtime composition contract:
- cross-surface composition is authored in `rawr.hq.ts`,
- `apps/*` host fixtures mount manifest outputs and do not author per-capability composition logic,
- see `docs/process/runbooks/RAWR_HQ_MANIFEST_COMPOSITION.md`.

## Pre-Change Impact Checklist

- Is this a core-for-everyone change?
- Does it alter a command contract?
- Does it alter plugin runtime behavior?
- Does it require migration guidance in `UPDATING.md`?

## Upstream Sync Conflict Policy

- Prefer upstream decisions in shared core areas.
- Preserve local behavior in downstream-specific plugin areas.
- Record intentional forks in downstream docs.

## Safety and Verification

After significant merges or updates:
- `bun run build`
- `bun run test`
- `bun run test:heavy` (CLI-heavy + Playwright visual)

## Transient Test Failure Policy

Use this policy before patching code for a red test during drain/integration:
1. Re-run the failing test once in isolation.
2. Re-run the full suite once.
3. Treat it as transient only if both reruns pass.
4. If reproducible, fix the root cause and re-run the full suite.
5. If still non-deterministic, stop merge progression and log a blocker with command/output summary.

## Final Acceptance Checklist (Template + Personal)

For template `RAWR HQ-Template`:
1. `git status --short` is clean.
2. `git branch --show-current` is `main`.
3. `bun run build` passes.
4. `bun run test` passes.
5. `gt ls` is stable for intended drain state.

For personal `RAWR HQ`:
1. `git status --short` is clean.
2. `git branch --show-current` is `main`.
3. `bun run build` passes.
4. `bun run test` passes.
5. `rawr plugins sync all --dry-run` passes.
6. `rawr plugins sync all` passes.
7. `rawr plugins status --checks all --json` reports healthy/in-sync.
