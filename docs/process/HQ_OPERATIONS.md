# RAWR HQ Operations Playbook

## Fixed vs Customizable Zones

Treat these as upstream-governed (fixed by default):
- `apps/cli`
- shared `packages/*` core contracts
- canonical docs and governance files

Treat these as customization zones:
- `plugins/cli/*`, `plugins/web/*`, `plugins/agents/*` (unless promoted to template scaffold)
- personal workflow docs in downstream repos

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
