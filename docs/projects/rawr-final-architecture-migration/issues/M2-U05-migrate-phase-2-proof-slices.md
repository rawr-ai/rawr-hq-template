---
id: M2-U05
title: "[M2] Migrate the Phase 2 proof slices onto the canonical runtime shell"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U04]
blocked: [M2-U06]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Prove the new runtime shell through canonical server and async slices, validating that the Effect-backed substrate, bootgraph lowering, and single-ManagedRuntime ownership work end to end without leaking raw Effect types into public APIs.

## Deliverables
- Migrate `example-todo` server proofs onto the canonical runtime shell via `packages/runtime/bootgraph/` and `packages/runtime/harnesses/elysia/`.
- Migrate the earned HQ Ops proof slices onto the canonical runtime shell, confirming service binding flows through `BoundaryCache` in `packages/runtime/substrate/`.
- Introduce the dedicated async exemplar via `packages/runtime/harnesses/inngest/`, called for by the Phase 2 plan.
- Rebuild runtime verification around canonical app/runtime APIs instead of host-composition seams.
- Validate the following structural invariants in each proof slice:
  - Service binding goes through the Effect-backed `BoundaryCache` in `packages/runtime/substrate/`.
  - Bootgraph uses Effect lowering internally (`packages/runtime/bootgraph/`).
  - One `ManagedRuntime` owns the process -- no competing runtime instances.
  - Raw Effect types (`Effect`, `Layer`, `ManagedRuntime`, `Effect.Service`) do not appear in public authoring APIs exported from `packages/hq-sdk`.

## Acceptance Criteria
- [ ] At least one canonical server slice (`example-todo`) passes end to end through `packages/runtime/bootgraph/` -> `packages/runtime/compiler/` -> `packages/runtime/substrate/` -> `packages/runtime/harnesses/elysia/`.
- [ ] At least one canonical async slice passes end to end through `packages/runtime/bootgraph/` -> `packages/runtime/compiler/` -> `packages/runtime/substrate/` -> `packages/runtime/harnesses/inngest/`.
- [ ] HQ Ops runtime/service wiring is proven through canonical seams for the earned modules, with `bindService(...)` resolving via `BoundaryCache`.
- [ ] Single `ManagedRuntime` ownership is verified -- no duplicate runtime instantiation across proof slices.
- [ ] No raw Effect types leak into plugin authoring code in proof slices (all Effect usage is quarantined inside `packages/runtime/substrate/`).
- [ ] Transitional runtime proofs are retired or quarantined.

## Testing / Verification
- targeted example-todo, HQ Ops, and async exemplar checks
- `bun scripts/phase-2/verify-runtime-proof-slices.mjs`
- managed HQ runtime validation with observability via `packages/runtime/substrate/` telemetry
- type-level audit: confirm proof-slice plugin code imports only from `packages/hq-sdk`, never directly from `packages/runtime/substrate/` or Effect

## Dependencies / Notes
- Blocked by: [M2-U04](./M2-U04-replace-transitional-plugin-builders-with-canonical-builders.md).
- Blocks: [M2-U06](./M2-U06-ratchet-phase-2-proofs-and-close-the-plateau.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).
- Package topology:
  - `packages/hq-sdk` -- canonical authoring API home
  - `packages/runtime/bootgraph/` -- PUBLIC RAWR-shaped lifecycle shell
  - `packages/runtime/compiler/` -- HIDDEN manifest to compiled process plan
  - `packages/runtime/substrate/` -- HIDDEN Effect-backed kernel (services, config, schema, errors, observability, process-runtime)
  - `packages/runtime/harnesses/elysia/` -- server harness adapter
  - `packages/runtime/harnesses/inngest/` -- async harness adapter

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- proof slices named in the Phase 2 plan (example-todo, HQ Ops earned modules, async exemplar)
- runtime and verification translation to canonical seams
- validating Effect quarantine, single-ManagedRuntime ownership, and BoundaryCache service binding
- bootgraph Effect-lowering path validation

Out of scope:
- forcing projections for modules that have not earned them
- internal substrate topology changes (M2-U06 concern)
- new proof slices beyond those specified in the Phase 2 plan
