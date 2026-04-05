# Current Phase Context

## Current State

- Phase: `P2` — `Minimal Canonical Runtime Shell`
- Current status:
  - Phase 1 is closed, review-closed, and frozen.
  - The repo is starting from the explicit Phase 2 entry conditions in `docs/migration/phase-2-entry-conditions.md`.
  - Phase 2 has been **regrounded** against two new canonical specs: the integrated architecture/runtime spec and the dedicated Effect runtime subsystem spec.
  - The M2 milestone and all M2-U00 through M2-U06 issue docs have been rewritten to reflect the new runtime substrate package topology (`packages/runtime/*`).
  - **No prior grounding findings remain valid.** The existing `agent-FARGO-M2-U00-replace-legacy-cutover-with-canonical-server-runtime` branch must be regrounded against the updated issue docs.
  - The next live implementation slice is `M2-U00`.

## What This Packet Is For

This packet exists to keep Phase 2 work from accreting into the frozen M1 packet.

The next live move is the first implementation cut:

- replace and delete `apps/hq/legacy-cutover.ts`
- create `packages/runtime/substrate` with the minimum viable Effect-backed kernel
- create `packages/runtime/bootgraph` with real implementation and `lowerModule()` bridge
- create `packages/runtime/harnesses/elysia` as the server harness adapter
- cut the first canonical server runtime path through app/runtime APIs
- this is the moment Effect enters the repo as a real dependency
- keep the first cut narrow instead of widening immediately into full async or full-platform generalization

## Canonical References

Use these as the Phase 2 first-hop packet:

1. [README.md](README.md)
2. [grounding.md](grounding.md) **(needs regrounding against new spec)**
3. [workflow.md](workflow.md)
4. [frame.md](frame.md)
5. [M2-minimal-canonical-runtime-shell.md](../../milestones/M2-minimal-canonical-runtime-shell.md)
6. [M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md](../../issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md)
7. [phase-2-entry-conditions.md](../../../migration/phase-2-entry-conditions.md)
8. [phase-1-closeout-review.md](../../phase-1-closeout-review.md)
9. [RAWR_Architecture_Migration_Plan.md](../../resources/RAWR_Architecture_Migration_Plan.md)
10. [RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md](../../resources/RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md) **(NEW)**
11. [RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md](../../resources/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md) **(NEW)**

## Phase Invariants

- Do not reopen settled Phase 1 authority decisions.
- Treat `apps/hq/legacy-cutover.ts` as the one sanctioned executable bridge that should die first.
- Keep the active runtime lane narrow:
  - `server.api`
  - `async.workflows`
  - `async.schedules`
- Keep `plugins/agents/hq` frozen as compatibility-only carryover, not runtime precedent.
- Treat `packages/runtime/*` as hidden realization seams, not new semantic homes.
- Raw Effect vocabulary (`Layer`, `Context.Tag`, `ManagedRuntime`, `Effect.Service`) stays quarantined inside `packages/runtime/*`.
- The canonical stance is: RAWR owns semantic meaning. Effect owns execution mechanics. Boundary frameworks keep their jobs.

## Phase 2 Package Topology

```text
packages/
  runtime/
    bootgraph/       PUBLIC - RAWR-shaped lifecycle shell
    compiler/        HIDDEN - manifest -> compiled process plan
    substrate/       HIDDEN - Effect-backed kernel
    harnesses/
      elysia/        Server harness adapter
      inngest/       Async harness adapter
    topology/        Topology export shapes (if earned)

  hq-sdk/            PUBLIC - authoring APIs (defineApp, startAppRole, define*Plugin, bindService)
```

Superseded packages:
- `packages/bootgraph` → `packages/runtime/bootgraph`
- `packages/runtime-context` → absorbed into `packages/runtime/substrate`

## Carry-Forward Risk

Before blaming Phase 2 runtime substrate for HQ Ops confusion, re-check:

- `services/hq-ops/src/service/modules/*`
- `services/example-todo/src/service/modules/*`
- [carry-forward-risks.md](notes/carry-forward-risks.md)
- [HQ-OPS-service-shape-followup.md](../M1-execution/notes/HQ-OPS-service-shape-followup.md)
- `docs/projects/orpc-ingest-domain-packages/guidance.md`
