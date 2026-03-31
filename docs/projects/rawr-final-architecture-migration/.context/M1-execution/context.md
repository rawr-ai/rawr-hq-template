# Current Issue Context

## Active Slice

- Issue: `M1-U00`
- Title: `Establish guardrails and the Phase 1 ledger`
- Status: ready to start implementation
- Dependency state: no upstream issue blocker
- Current role of the slice: freeze the migration lane before any authority-moving slice begins

## Why This Slice Matters

This slice makes the repo tell the truth about Phase 1 before any semantic or runtime authority changes land. If the ledger and first proof rails are weak, every later slice can drift, resurrect dead structures, or preserve ambiguity behind social convention.

This is not a cleanup slice and not a runtime slice. It is the gate that forces the rest of M1 to happen inside an explicit, mechanically enforced lane.

## Done Bar

This slice is done only when all of the following are true:

- `docs/migration/phase-1-ledger.md` exists and clearly classifies live, archived, parked, reclassified, and prohibited directions
- the ledger forbids new work in `plugins/api/*`, `plugins/workflows/*`, `coordination`, `support-example`, and legacy HQ package facades
- parked-lane edits are explicitly constrained to deletions, rewires, compile fixes, and explicit unblockers
- the first Phase 1 verification scripts exist under `scripts/phase-1/`
- those scripts are wired into normal repo verification flow and are not hidden inside one project target

## Canonical References

Read these before starting or resuming:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
4. [M1-U00-guardrails-and-phase-1-ledger.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U00-guardrails-and-phase-1-ledger.md)
5. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)

## Relevant Surfaces

Primary target files:

- `docs/migration/phase-1-ledger.md`
- `scripts/phase-1/verify-phase1-ledger.mjs`
- `scripts/phase-1/verify-no-live-coordination.mjs`
- `scripts/phase-1/verify-no-live-support-example.mjs`
- `scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs`
- `scripts/phase-1/verify-no-old-operational-packages.mjs`
- `scripts/phase-1/verify-no-legacy-hq-imports.mjs`

Primary evidence sources:

- root `package.json`
- `tools/architecture-inventory/slice-0-first-cohort.json`
- `scripts/phase-03/verify-sync-check.mjs`
- workspace inventory from `bunx nx show projects`
- repo root inventories under `apps/`, `services/`, `packages/`, and `plugins/`

## Key Insights Already Established

- The ledger should use a fixed operational shape:
  - live lane
  - archived lane
  - parked lane
  - reclassified / target homes
  - prohibited directions
  - verification map
- The minimum Phase 1 inventory that must be classified includes:
  - apps: `apps/hq`, `apps/server`, `apps/cli`, `apps/web`
  - services: `services/state`, `services/example-todo`, `services/support-example`, `services/coordination`
  - packages: `packages/control-plane`, `packages/journal`, `packages/security`, `packages/hq`, `packages/agent-sync`
  - plugins: `plugins/api/{coordination,example-todo,state}`, `plugins/workflows/{coordination,support-example}`, `plugins/agents/hq`, `plugins/web/*`, `plugins/cli/*`
- The Phase 1 proof band is root-owned. Do not hide it inside a single project target.
- This slice should reserve hard cuts against old operational owners and legacy HQ facades before those owners actually die in later slices.

## Invariants and User Constraints

- Use the single existing worktree only. Do not create more worktrees.
- Use a distinct Graphite branch for this issue inside the same worktree.
- `context.md` must be refreshed after compact and replaced when moving to a new issue.
- `context.md` is current-issue-only. Do not turn it into a running log.
- Prefer Narsil for symbol/reference/call-path work.
- After each commit that needs fresh code intel, update the primary tree at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template` so Narsil indexes the latest commit.
- Do not trust agents with semantic changes. Peer/review agents are for review and tightly scoped mechanical help only.
- For this slice specifically, do not move semantic logic or change runtime behavior.

## Verification Bar

Run at minimum:

- `bun run sync:check`
- `bun run lint:boundaries`
- `bun scripts/phase-1/verify-phase1-ledger.mjs`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs`
- `bun scripts/phase-1/verify-no-old-operational-packages.mjs`
- `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `bunx nx show projects`

## Immediate Next Actions

1. Confirm current branch/status/stack state and create the Graphite slice branch for `M1-U00`.
2. Use Nx and native inventory commands to capture the concrete Phase 1 surface set.
3. Use Narsil to map current proof/inventory integration points and legacy import surfaces.
4. Write the ledger in the fixed Phase 1 classifier shape.
5. Implement and wire the first `scripts/phase-1/*` verification band.
6. Run the full slice verification set before committing.
