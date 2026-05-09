# Workstream Setup Discovery

## Frame

This lane prepares the container for all future Workstream B lane sessions. It
verifies repo state, records authority ordering, and creates the standard lane
packet shape.

## Current Upstream State

- Repo: `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template`
- Starting branch: `main`
- Preparation branch: `codex/workstream-b-preparation`
- Upstream `main` HEAD at discovery time:
  `d2563539 refactor(services): rename service/shared to service/common across all packages (#318)`
- `gt ls` showed `main` and frozen sibling
  `align-arch-spec-with-runtime-realization`; after branch creation it showed
  `codex/workstream-b-preparation` stacked on `main`.
- `bunx nx show projects` included the relevant upstream project surfaces:
  `@rawr/session-intelligence`, `@rawr/plugin-session-tools`,
  `@rawr/agent-config-sync`, `@rawr/agent-config-sync-node`,
  `@rawr/plugin-plugins`, `@rawr/plugin-mfe-demo`, `@rawr/server`, and
  `@rawr/cli`.

## Current Downstream State

- Repo: `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq`
- Branch: `main`
- Downstream `main` HEAD at discovery time:
  `4ab6c1f2 refactor(cognition): reshape inquiry-design into runtime-first skill surface (#151)`
- Workstream A landed downstream in:
  `408f9d69 chore(cleanup): remove retired downstream surfaces (#150)`
- Downstream status was clean before inspection.

## Evidence

Commands used:

```bash
git status --short --branch
gt status
gt ls
git worktree list --porcelain
git log --oneline -n 12 --decorate
bunx nx show projects
```

Workstream-runner conventions used:

- `workstream-runner/SKILL.md`
- `workstream-runner/references/records-and-packets.md`
- `workstream-runner/assets/workstream-record.md`
- `workstream-runner/assets/next-packet.md`
- `workstream-runner/assets/agent-packet.md`

Repo instruction files used:

- `AGENTS.md`
- `docs/AGENTS.md`
- `docs/process/GRAPHITE.md`

## Mismatches

- The user plan named top-level setup outputs for Lane 0 while also requiring
  one lane packet per lane. This lane resolves that by producing both top-level
  artifacts and `lanes/workstream-setup/*`.
- Existing docs still contain split-model and coordination-canvas claims that
  future lanes must treat as stale where they contradict the locked user
  direction.

## Risks

- Fresh sessions may over-read old docs and reopen locked decisions.
- Future implementation sessions may accidentally run global sync/link repair as
  validation. This preparation artifact forbids that unless a future DRA
  explicitly scopes it.
- Future lanes may try to execute all migrations together. This packet keeps the
  lanes separate.

## Unknowns

- The exact future lane execution order is intentionally not locked here.
- The exact implementation branch/worktree names are future-lane decisions.

## DRA Disposition

Accepted. The setup evidence is sufficient for preparation closure and for
future lane-specific sessions to begin from the top-level authority map.
