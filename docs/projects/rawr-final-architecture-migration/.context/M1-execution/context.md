# Current Issue Context

## Active Slice

- Issue: `M1-U01`
- Title: `Archive false futures and freeze the marketplace compatibility lane`
- Status: verification complete, paper trail updated, ready to commit
- Dependency state: `M1-U00` is complete; this slice now gates all downstream M1 authority work
- Current role of the slice: subtract dead futures from the live lane before `services/hq-ops` is reserved and before any new canonical seams are installed

## Why This Slice Matters

This slice removes the two false futures that would otherwise keep exerting architectural pressure during the rest of Phase 1:

- `coordination` as an active live service + plugin + host surface
- `support-example` as a live service/workflow demo lane

If they remain live, later Phase 1 work will still be negotiating around dead authorities. The correct move here is not normalization. It is archive-with-evidence, then hard removal from live build, runtime, manifest, host, and proof participation.

This slice also freezes `plugins/agents/hq` in place as the only allowed non-executable compatibility carryover. That lane survives for operational continuity only; it must not be treated as unresolved topology authority.

## Done Bar

This slice is done only when all of the following are true:

- `services/coordination`, `plugins/api/coordination`, and `plugins/workflows/coordination` are removed from live build, test, runtime, and inventory participation.
- `services/support-example` and `plugins/workflows/support-example` are removed from live build, test, runtime, manifest/host registration, and live test inventory participation.
- root workspace references are updated so removed surfaces no longer appear in root build/typecheck/test paths or TS path aliases.
- the HQ app manifest and server host composition no longer register archived coordination/support-example plugin families.
- static scans and Phase 1 proof scripts confirm there are no live imports or registrations pointing at archived coordination/support-example surfaces.
- `plugins/agents/hq` remains exactly the sanctioned Phase 1 compatibility lane: preserved, not renamed, not expanded, and still usable by `rawr plugins sync @rawr/plugin-hq --dry-run`.
- archive evidence exists for both removed lanes under `docs/archive/coordination/lessons.md` and `docs/archive/support-example/lessons.md`.
- the support-example archive preserves useful fixtures and translation notes instead of dragging the live implementation forward.

## Canonical References

Read these before starting or resuming:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
4. [M1-U01-archive-false-futures.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U01-archive-false-futures.md)
5. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)

## Relevant Surfaces

Archived roots removed from the live tree:

- `services/coordination`
- `plugins/api/coordination`
- `plugins/workflows/coordination`
- `services/support-example`
- `plugins/workflows/support-example`

Primary live consumers and registrations cut or rewritten in this slice:

- `tsconfig.base.json`
- root `package.json`
- `vitest.config.ts`
- `tools/architecture-inventory/node-4-extracted-seams.json`
- `tools/architecture-inventory/slice-0-first-cohort.json`
- `apps/hq/src/manifest.ts`
- `apps/server/src/host-seam.ts`
- `apps/server/src/host-satisfiers.ts`
- `apps/server/src/workflows/runtime.ts`
- `apps/server/package.json`
- `apps/web/package.json`
- `apps/cli/package.json`
- `apps/web/src/ui/lib/orpc-client.ts`
- `plugins/web/mfe-demo/src/web.ts`
- deleted coordination/support-example-specific CLI, web, server, and proof files

Archive evidence targets:

- `docs/archive/coordination/lessons.md`
- `docs/archive/support-example/lessons.md`

Protected compatibility lane:

- `plugins/agents/hq`

## Key Insights Already Established

- This slice is broader than deleting a few directories. `coordination` is currently wired into TS path aliases, root run-many scripts, the HQ manifest, server host seams/satisfiers/runtime, CLI coordination commands, web coordination clients, and multiple server/web tests.
- `support-example` is currently wired into the HQ manifest, server host satisfiers, workflow proofs, and legacy demo/test surfaces.
- The hardened packet treats both `coordination` and `support-example` as archive targets in Phase 1, not as live capabilities to be renamed or normalized forward.
- `plugins/agents/hq` is the only sanctioned non-executable compatibility carryover in M1. It is frozen, not modernized.
- Archive artifacts are the only sanctioned memory of the removed lanes after the live cut lands. They need to preserve useful wiring/integration lessons without preserving the legacy system wholesale.
- The archive proof band now enforces three things together: archived classification in the Phase 1 ledger, physical absence from the live tree, and presence of archive lesson docs.
- `rawr plugins sync @rawr/plugin-hq --dry-run` resolves the preserved marketplace lane, but plain dry-run exits non-zero on existing downstream target conflicts; `--dry-run --force` is the conflict-tolerant verification form that proves the lane still resolves cleanly without mutating anything.

## Invariants and User Constraints

- Use the single existing worktree only. Do not create more worktrees.
- Use a distinct Graphite branch for this issue inside the same worktree.
- `context.md` must be refreshed after compact and replaced when moving to a new issue.
- `context.md` is current-issue-only. Do not turn it into a running log.
- Prefer Narsil for symbol/reference/call-path work, but remember it indexes the primary tree at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`.
- After each commit that needs fresh code intel, update that primary tree to the latest commit so Narsil indexes the current slice.
- Do not trust agents with semantic changes. Review/mechanical help only.
- For archive lesson capture, spin up a grounded 3-4 agent team per archive target with one integrator, close stale agents first, and never exceed six active agents total.
- Lesson capture should preserve wiring, integrations, and technology-fit insights; it should not preserve the whole implementation or carry forward clearly legacy architecture.
- The milestone packet wins for M1 execution scope, sequencing, and stop-gates. The architecture spec remains canonical for architecture.

## Verification Bar

Run at minimum:

- `bun run sync:check`
- `bun run phase-1:gates:baseline`
- `bun run rawr plugins sync @rawr/plugin-hq --dry-run`
- `bun run rawr plugins sync @rawr/plugin-hq --dry-run --force`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs`
- `rg -n 'coordination|support-example' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- `test -d plugins/agents/hq`
- `bunx nx test @rawr/plugin-mfe-demo`
- HQ stack validation before commit:
  `bun run rawr hq up`, confirm observability, inspect logs, restart if needed

Add adjacent checks if the host/manifest/runtime cut forces them.

## Current Status

- The archived roots are deleted from the live tree and no longer appear in `apps`, `packages`, `plugins`, or `services` scans.
- The HQ manifest, server host seams, CLI/web surfaces, demo plugin, Vitest project list, architecture inventory, and Phase 1 scripts were updated to remove live coordination/support-example participation.
- `docs/archive/coordination/lessons.md` and `docs/archive/support-example/lessons.md` now exist and encode the preserved wiring/integration lessons.
- `bun run sync:check`, `bun run phase-1:gates:baseline`, `bun scripts/phase-1/verify-no-live-coordination.mjs`, `bun scripts/phase-1/verify-no-live-support-example.mjs`, `bun scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs`, `test -d plugins/agents/hq`, and `bunx nx test @rawr/plugin-mfe-demo` are green.
- Managed HQ runtime validation is complete: `rawr hq status --json` shows server/web/async plus HyperDX observability all running, the canonical state RPC returns `200` with first-party auth headers, and archived coordination/support-example workflow probes return `404`.

## Immediate Next Actions

1. Commit the stable U01 cut on `agent-FARGO-M1-U01-archive-false-futures`.
2. Move the primary Narsil tree at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template` to the new commit so indexing catches up.
3. Submit the updated stack with `gt ss --draft`, then replace `context.md` for `M1-U02`.
