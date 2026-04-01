# Phase 2 Architecture Migration Grounding

This is the canonical entry point for Phase 2 work. Use it to keep runtime-substrate work anchored to the architecture instead of drifting back into transitional shapes.

## Source-of-Truth Order

1. [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)
   Target-state ontology and invariant source of truth.
2. [Larger migration plan](../resources/RAWR_Architecture_Migration_Plan.md)
   Canonical source for Phase 2 purpose, sequence, and exit gate.
3. [Phase 2 entry conditions](../../../migration/phase-2-entry-conditions.md)
   The actual handoff contract from the frozen Phase 1 plateau into Phase 2.
4. [Phase 1 closeout review](../phase-1-closeout-review.md)
   Evidence for the entry condition and the limits of what Phase 1 already settled.

Current repo code and docs are context only unless they align with the sources above.

## Overall Phase Problem

Phase 1 collapsed authority onto one coherent lane. Phase 2 has a different job:

- turn the canonical shell into a canonically booted runtime
- replace transitional execution seams with the real runtime path
- keep runtime realization narrow enough that semantics stay upstream and visible

The repo should leave Phase 2 with one real runtime story:

- app identity and role selection live in `apps/`
- services remain the semantic source of truth
- plugins remain runtime projections
- boot/runtime internals stay hidden implementation seams

## What Phase 2 Must Deliver

At Phase 2 exit, the repo should have:

- a real public bootgraph shell in `packages/bootgraph`
- a thin runtime compiler in `packages/runtime-compiler`
- a thin process runtime for compiled process plans
- real harness adapters for the active lane:
  - Elysia
  - Inngest
- canonical app/runtime authoring surfaces, including:
  - `defineApp(...)`
  - `startAppRole(...)`
  - `startAppRoles(...)`
- at least one canonical server proof slice and one canonical async proof slice
- no live runtime dependency on the legacy host-composition chain

## What Phase 2 Must Not Deliver

Do not let Phase 3 or speculative platform work leak into this phase. Phase 2 does not need:

- generator or codemod infrastructure
- rich topology catalogs
- optional runtimes that the active lane has not earned
- a second business plane inside boot/runtime packages
- revived archived lanes or transitional grammars as public authoring truth

## Non-Negotiable Phase Rules

- Build only what Phases 2 and 3 need.
- `server` and `async` are mandatory; `web`, `cli`, and `agent` remain optional or reserved.
- Bootgraph stays narrow and process-local.
- Process runtime remains a hidden realization seam, not a second semantic plane.
- Harnesses stay downstream of service and plugin semantics.
- Delete the Phase 1 cutover seam before claiming the Phase 2 plateau.
- Not every service needs a new projection in Phase 2. Only the slices needed to prove the runtime shell should move.

## Immediate Starting Constraint

Phase 2 starts from one explicit cleanup item and no hidden semantic debt:

- replace and delete `apps/hq/legacy-cutover.ts`

Do not reopen settled Phase 1 decisions while doing that work.

## Carry-Forward Risk

One known risk crosses the boundary intentionally:

- `services/hq-ops` is in the right external Phase 1 shape, but its internal module structure still diverges from the cleaner `services/example-todo` pattern
- if Phase 2 runtime or verification work gets confusing around HQ Ops, treat that divergence as a primary suspect early

The retained carry-forward note lives at:

- [notes/carry-forward-risks.md](./notes/carry-forward-risks.md)

## Relevant Grounding Documents

- [RAWR_Canonical_Architecture_Spec.md](../resources/RAWR_Canonical_Architecture_Spec.md)
- [RAWR_Architecture_Migration_Plan.md](../resources/RAWR_Architecture_Migration_Plan.md)
- [phase-2-entry-conditions.md](../../../migration/phase-2-entry-conditions.md)
- [phase-1-closeout-review.md](../phase-1-closeout-review.md)
- [phase-1-current-state.md](../../../migration/phase-1-current-state.md)

## Working Reminder

The Phase 2 question is:

How do we replace the one remaining transitional runtime seam with the canonical runtime shell, while keeping semantics upstream and without recreating dual authority?
