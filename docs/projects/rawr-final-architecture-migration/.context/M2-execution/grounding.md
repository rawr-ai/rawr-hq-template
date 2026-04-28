# Phase 2 Architecture Migration Grounding

This is the canonical entry point for Phase 2 work. Use it to keep runtime-substrate work anchored to the architecture instead of drifting back into transitional shapes.

**This grounding doc was regrounded** on 2026-04-04 against the updated canonical architecture and Effect runtime subsystem specs.

## Source-of-Truth Order

1. [Integrated architecture and runtime spec](../../resources/spec/RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md)
   Target-state ontology, runtime subsystem stance, and invariant source of truth.
2. [Effect runtime subsystem spec](../../resources/spec/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md)
   Detailed specification for the Effect-backed runtime kernel, package topology, runtime-owned services, config/schema/error/observability models, and bootgraph lowering.
3. [Migration plan](../../resources/RAWR_Architecture_Migration_Plan.md)
   Canonical source for Phase 2 purpose, sequence, and exit gate.
4. [Phase 2 entry conditions](./phase-2-entry-conditions.md)
   The actual handoff contract from the frozen Phase 1 plateau into Phase 2.
5. [Phase 1 closeout review](../M1-execution/phase-1-closeout-review.md)
   Evidence for the entry condition and the limits of what Phase 1 already settled.
6. [M2 guardrails and enforcement](../../resources/spec/m2-guardrails-and-enforcement.md)
   Active M2 gate classification, proof model, and ratchet rules.

Historical reference only (superseded by the integrated spec for runtime subsystem details):
- [Original architecture spec](../../resources/_archive/RAWR_Canonical_Architecture_Spec_V2.md)

Current repo code and docs are context only unless they align with the sources above.

## Overall Phase Problem

Phase 1 collapsed authority onto one coherent lane. Phase 2 has a different job:

- turn the canonical shell into a canonically booted runtime
- replace transitional execution seams with the real runtime path
- build the Effect-backed runtime substrate beneath the public shell
- keep runtime realization narrow enough that semantics stay upstream and visible

The repo should leave Phase 2 with one real runtime story:

- app identity and role selection live in `apps/`
- services remain the semantic source of truth
- plugins remain runtime projections
- the runtime subsystem (`packages/runtime/*`) realizes execution through an Effect-backed kernel without becoming a second semantic plane

## What Phase 2 Must Deliver

At Phase 2 exit, the repo should have:

- a real public bootgraph shell in `packages/runtime/bootgraph` with Effect-backed lowering (`lowerModule()`)
- a thin runtime compiler in `packages/runtime/compiler`
- a real Effect-backed runtime substrate in `packages/runtime/substrate` containing:
  - runtime-owned Effect services (RuntimeConfig, ProcessIdentity, RuntimeTelemetry, DbPool, Clock, WorkspaceRoot, BoundaryCache, etc.)
  - process-runtime (ProcessView, RoleView, SurfaceAssembler, started-process handle)
  - tagged runtime errors
  - one root `ManagedRuntime` per process
- real harness adapters for the active lane:
  - `packages/runtime/harnesses/elysia`
  - `packages/runtime/harnesses/inngest`
- canonical app/runtime authoring surfaces in `packages/hq-sdk`, including:
  - `defineApp(...)`
  - `startAppRole(...)`
  - `startAppRoles(...)`
  - `defineServerApiPlugin(...)`
  - `defineAsyncWorkflowPlugin(...)`
  - `defineAsyncSchedulePlugin(...)`
  - `bindService(...)`
- at least one canonical server proof slice and one canonical async proof slice
- no live runtime dependency on the legacy host-composition chain
- raw Effect types not exposed in any public authoring API

## What Phase 2 Must Not Deliver

Do not let Phase 3 or speculative platform work leak into this phase. Phase 2 does not need:

- generator or codemod infrastructure
- rich topology catalogs (basic topology export may land if earned)
- optional runtimes that the active lane has not earned (web, cli, agent)
- a second business plane inside `packages/runtime/*`
- revived archived lanes or transitional grammars as public authoring truth
- a public generic DI-container vocabulary as a peer architecture

## Non-Negotiable Phase Rules

- Build only what Phases 2 and 3 need.
- `server` and `async` are mandatory; `web`, `cli`, and `agent` remain optional or reserved.
- Bootgraph stays narrow and process-local.
- The runtime substrate remains a hidden realization seam, not a second semantic plane.
- Harnesses stay downstream of service and plugin semantics.
- Delete the Phase 1 cutover seam before claiming the Phase 2 plateau.
- Not every service needs a new projection in Phase 2. Only the slices needed to prove the runtime shell should move.
- Raw Effect vocabulary stays quarantined inside `packages/runtime/*`.
- The canonical stance is: RAWR owns semantic meaning. Effect owns execution mechanics. Boundary frameworks keep their jobs.

## Immediate Starting Constraint

Phase 2 starts from one explicit cleanup item and no hidden semantic debt:

- replace and delete `apps/hq/legacy-cutover.ts`
- create `packages/runtime/substrate` with minimum viable Effect-backed kernel
- create `packages/runtime/bootgraph` with real implementation and `lowerModule()` bridge
- create `packages/runtime/harnesses/elysia` as the server harness adapter

This is the moment Effect enters the repo as a real dependency.

Do not reopen settled Phase 1 decisions while doing that work.

## Carry-Forward Risk

One known risk crosses the boundary intentionally:

- `services/hq-ops` is in the right external Phase 1 shape, but its internal module structure still diverges from the cleaner `services/example-todo` pattern
- if Phase 2 runtime or verification work gets confusing around HQ Ops, treat that divergence as a primary suspect early

The retained carry-forward note lives at:

- [notes/carry-forward-risks.md](handoffs/_archive/carry-forward-risks.md)

## Relevant Grounding Documents

- [RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md](../../resources/spec/RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md)
- [RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md](../../resources/spec/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md)
- [m2-guardrails-and-enforcement.md](../../resources/spec/m2-guardrails-and-enforcement.md)
- [RAWR_Architecture_Migration_Plan.md](../../resources/RAWR_Architecture_Migration_Plan.md)
- [phase-2-entry-conditions.md](./phase-2-entry-conditions.md)
- [phase-1-closeout-review.md](../M1-execution/phase-1-closeout-review.md)
- [phase-1-current-state.md](../M1-execution/phase-1-current-state.md)

## Working Reminder

The Phase 2 question is:

How do we replace the one remaining transitional runtime seam with the canonical runtime shell, backed by an Effect-based runtime substrate, while keeping semantics upstream, raw Effect quarantined, and without recreating dual authority?
