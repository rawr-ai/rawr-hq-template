---
id: M1-U08
title: "[M1] Ratchet Phase 1 proofs, land durable docs, and readjust the migration"
state: done
priority: 1
estimate: 4
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U07]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Ratchet the full Phase 1 proof band, land only the docs that are settled by the plateau, freeze the parked lanes, and run the end-of-milestone review before Phase 2 begins.

## Deliverables
- Promote the Phase 1 checks into the normal migration gate set and retire stale tranche or prototype-shaped checks.
- Freeze parked-lane edits and verify the freeze rule.
- Land only the durable docs that describe settled Phase 1 reality or archive evidence.
- Run the structured end-of-milestone review and record the downstream readjustment point without reopening Phase 1.

## Acceptance Criteria
- [x] All Phase 1 structural checks pass together.
- [x] Targeted typechecks pass for every changed live project carried across `M1-U03` through `M1-U07`.
- [x] Targeted tests pass for every changed live project carried across `M1-U03` through `M1-U07`.
- [x] Parked-lane freeze rules are verifiable.
- [x] The preserved `plugins/agents/hq` marketplace compatibility lane still resolves through the current sync surface.
- [x] Docs describe only settled post-Phase-1 reality and archived evidence.
- [x] The end-of-milestone review explicitly confirms Phase 2 entry conditions and records any Phase 2/3 readjustments without changing the Phase 1 plateau.
- [x] The end-of-milestone review explicitly carries forward the deferred redesign of the Cloud Code/Codex marketplace plugin lane, while confirming that `plugins/agents/hq` remains frozen in place for continuity.

## Testing / Verification
- `bun run sync:check`
- `bun run lint:boundaries`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/cli run typecheck`
- `bun --cwd plugins/cli/plugins run typecheck`
- `bun --cwd packages/agent-sync run typecheck`
- `bun --cwd services/hq-ops run typecheck`
- `bun --cwd packages/plugin-workspace run typecheck`
- `bun --cwd apps/server run test`
- `bun --cwd apps/hq run test`
- `bun --cwd apps/cli run test`
- `bun --cwd plugins/cli/plugins run test`
- `bun scripts/phase-1/verify-phase1-ledger.mjs`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs`
- `bun run rawr plugins sync @rawr/plugin-hq --dry-run`
- `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`
- `bun scripts/phase-1/verify-no-old-operational-packages.mjs`
- `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `bun scripts/phase-1/verify-canonical-plugin-topology.mjs`
- `bun scripts/phase-1/verify-manifest-purity.mjs`
- `bun scripts/phase-1/verify-entrypoint-thinness.mjs`
- `bun scripts/phase-1/verify-no-legacy-composition-authority.mjs`
- `bun scripts/phase-1/verify-parked-lane-frozen.mjs`

## Dependencies / Notes
- Blocked by: [M1-U07](./M1-U07-neutralize-legacy-composition-authority.md).
- Blocks: none.
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- This is the closure slice, not a license to defer cleanup from earlier slices.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
Proof ratchets, durable docs, and migration readjustment only make sense once the Phase 1 plateau is real. The point here is to freeze the plateau truthfully, not to reopen the milestone or sweep earlier misses under a final cleanup bucket.

### Scope Boundaries
In scope:
- Promote the Phase 1 checks into the normal migration gate set.
- Retire stale tranche or prototype-shaped checks.
- Freeze parked lanes.
- Land only the docs that are now settled:
  - `docs/migration/phase-1-ledger.md`
  - `docs/archive/coordination/lessons.md`
  - `docs/archive/support-example/lessons.md`
  - `docs/migration/phase-1-current-state.md`
  - `docs/migration/phase-2-entry-conditions.md`
- Run the end-of-milestone migration review and readjustment.

Out of scope:
- Treating this slice as the first time legacy cleanup happens.
- Churning docs for runtime substrate, harnesses, generators, or later-phase surfaces that are still unsettled.
- Reopening Phase 1 structural decisions during the review.

### Implementation Guidance
This is where the repo stops being “in motion” and becomes a stable plateau. The docs that land here need to be durably true, not speculative or ahead of the migration.

### Files
- `docs/migration/phase-1-ledger.md`
- `docs/archive/coordination/lessons.md`
- `docs/archive/support-example/lessons.md`
- `docs/migration/phase-1-current-state.md`
- `docs/migration/phase-2-entry-conditions.md`
- `scripts/phase-1/`

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)
- [Workflow scaffold](../.context/workflow.md)

### Prework Results (Resolved)

### 1) Phase 1 close-out review checklist
The close-out review should explicitly confirm:
- the full Phase 1 proof band passes together
- parked-lane freeze rules are in force
- the executable bridge outcome is explicit: either no executable bridge survives, or the only surviving executable cross-phase seam is `apps/hq/legacy-cutover.ts`
- the only surviving non-executable compatibility carryover is the frozen `plugins/agents/hq` marketplace lane
- the durable docs landed here describe settled Phase 1 reality only
- the deferred marketplace-plugin redesign is captured as next-stage work without reopening the Phase 1 plateau
- Phase 2 entry conditions are explicit and no Phase 1 architectural decision is being reopened during the handoff

### 2) Docs outside the migration project that will become stale
These current-state docs already describe the old plugin roots or old runtime topology and should be audited once the plateau lands:
- `docs/SYSTEM.md`
- `docs/system/PLUGINS.md`
- `docs/process/HQ_OPERATIONS.md`
- `docs/system/TELEMETRY.md`
- `docs/system/telemetry/orpc.md`

Those should only be updated if they are meant to describe live current state. If they are historical or explanatory in a broader sense, preserve them and add narrower current-state docs instead.

### 3) Docs that should be left untouched
These are not part of the close-out update set and should stay untouched unless the user explicitly reopens them:
- `docs/projects/orpc-ingest-workflows-spec/**`
- `docs/projects/_archive/**`
- `docs/projects/rawr-final-architecture-migration/resources/_archive/**`
- the Phase 1 and larger migration source plans themselves, except for downstream readjustment notes that belong outside the frozen source packet

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
