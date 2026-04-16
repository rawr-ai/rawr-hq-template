---
id: M2-U06
title: "[M2] Ratchet Phase 2 proofs, delete transitional runtime seams, and close the plateau"
state: planned
priority: 1
estimate: 4
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U05]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Ratchet the full Phase 2 proof band, delete any remaining transitional runtime seams, verify the canonical `packages/runtime/substrate/` internal topology, absorb `packages/runtime-context`, quarantine raw Effect types, land durable docs, and freeze Plateau 2 truthfully.

## Deliverables
- Promote the Phase 2 proof band into the normal migration gates.
- Delete or quarantine any remaining transitional runtime seams.
- Verify `packages/runtime/substrate/` has canonical internal topology:
  - `services/` -- Effect.Service definitions and BoundaryCache
  - `config/` -- typed configuration layer
  - `schema/` -- runtime schema validation
  - `errors/` -- structured error types
  - `observability/` -- telemetry and tracing
  - `process-runtime/` -- ManagedRuntime ownership and lifecycle
- Verify that `packages/runtime-context` is fully absorbed into `packages/runtime/substrate/` -- no residual standalone package remains.
- Verify raw Effect types are quarantined: no `Effect`, `Layer`, `ManagedRuntime`, or `Effect.Service` references appear in public API exports outside `packages/runtime/substrate/`.
- Land only durable Plateau 2 docs.
- Run the structured closeout review that hands the repo into Phase 3 without reopening runtime basics.

## Acceptance Criteria
- [ ] Phase 2 structural, proof, and runtime checks pass together.
- [ ] No live runtime seam depends on transitional host-composition architecture.
- [ ] `packages/runtime/substrate/` internal topology matches the canonical spec (services, config, schema, errors, observability, process-runtime).
- [ ] `packages/runtime-context` is absorbed -- no standalone package, no dangling imports.
- [ ] Raw Effect types are quarantined inside `packages/runtime/substrate/` -- zero leakage into `packages/hq-sdk`, `packages/runtime/bootgraph/`, `packages/runtime/compiler/`, or `packages/runtime/harnesses/*` public APIs.
- [ ] Docs describe only settled Plateau 2 reality.
- [ ] The end-of-milestone review produces explicit Phase 3 entry conditions.

## Testing / Verification
- `bun run sync:check`
- `bun run lint:boundaries`
- targeted runtime, harness, and proof-slice checks
- `bun scripts/phase-2/verify-phase2-plateau.mjs`
- import-graph audit: confirm no module outside `packages/runtime/substrate/` imports directly from `effect` or `@effect/*`
- dead-package check: confirm `packages/runtime-context` directory is removed or empty

## Canonical References
- [RAWR Canonical Architecture and Runtime Spec (Integrated Final)](../resources/RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md)
- [RAWR Effect Runtime Subsystem Canonical Spec](../resources/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md)
- [RAWR Canonical Testing Plan](../resources/RAWR_Canonical_Testing_Plan.md)

## Dependencies / Notes
- Blocked by: [M2-U05](./M2-U05-migrate-phase-2-proof-slices.md).
- Blocks: none.
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
- proof ratchets
- durable docs
- structured plateau review
- `packages/runtime/substrate/` internal topology verification
- `packages/runtime-context` absorption verification
- Effect type quarantine enforcement audit
- canonical reference list maintenance

Out of scope:
- generator/foundry work that belongs to Phase 3
- new substrate internal modules beyond what the canonical spec requires
