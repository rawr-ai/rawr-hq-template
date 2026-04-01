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
- Ratchet the full Phase 2 proof band, delete any remaining transitional runtime seams, land durable docs, and freeze Plateau 2 truthfully.

## Deliverables
- Promote the Phase 2 proof band into the normal migration gates.
- Delete or quarantine any remaining transitional runtime seams.
- Land only durable Plateau 2 docs.
- Run the structured closeout review that hands the repo into Phase 3 without reopening runtime basics.

## Acceptance Criteria
- [ ] Phase 2 structural, proof, and runtime checks pass together.
- [ ] No live runtime seam depends on transitional host-composition architecture.
- [ ] Docs describe only settled Plateau 2 reality.
- [ ] The end-of-milestone review produces explicit Phase 3 entry conditions.

## Testing / Verification
- `bun run sync:check`
- `bun run lint:boundaries`
- targeted runtime, harness, and proof-slice checks
- `bun scripts/phase-2/verify-phase2-plateau.mjs`

## Dependencies / Notes
- Blocked by: [M2-U05](./M2-U05-migrate-phase-2-proof-slices.md).
- Blocks: none.
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- proof ratchets
- durable docs
- structured plateau review

Out of scope:
- generator/foundry work that belongs to Phase 3
