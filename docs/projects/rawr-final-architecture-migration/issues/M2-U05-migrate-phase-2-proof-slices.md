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
- Prove the new runtime shell through canonical server and async slices instead of transitional execution paths and proof oracles.

## Deliverables
- Migrate `example-todo` server proofs onto the canonical runtime shell.
- Migrate the earned HQ Ops proof slices onto the canonical runtime shell.
- Introduce the dedicated async exemplar called for by the Phase 2 plan.
- Rebuild runtime verification around canonical app/runtime APIs instead of host-composition seams.

## Acceptance Criteria
- [ ] At least one canonical server slice passes end to end through the new runtime shell.
- [ ] At least one canonical async slice passes end to end through the new runtime shell.
- [ ] HQ Ops runtime/service wiring is proven through canonical seams for the earned modules.
- [ ] Transitional runtime proofs are retired or quarantined.

## Testing / Verification
- targeted example-todo, HQ Ops, and async exemplar checks
- `bun scripts/phase-2/verify-runtime-proof-slices.mjs`
- managed HQ runtime validation with observability

## Dependencies / Notes
- Blocked by: [M2-U04](./M2-U04-replace-transitional-plugin-builders-with-canonical-builders.md).
- Blocks: [M2-U06](./M2-U06-ratchet-phase-2-proofs-and-close-the-plateau.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- proof slices named in the Phase 2 plan
- runtime and verification translation to canonical seams

Out of scope:
- forcing projections for modules that have not earned them
