---
id: M2-U04
title: "[M2] Replace transitional plugin builders with canonical role and surface builders"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U03]
blocked: [M2-U05]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace transitional public builder grammar with the canonical role and surface builders that match the runtime shell now in place.

## Deliverables
- Install canonical builders such as:
  - `defineServerApiPlugin(...)`
  - `defineAsyncWorkflowPlugin(...)`
  - `defineAsyncSchedulePlugin(...)`
- Quarantine or delete transitional builder grammar from the active lane.
- Keep compatibility-only carryover out of the canonical authoring surface.

## Acceptance Criteria
- [ ] Active plugin authoring uses canonical role and surface builders.
- [ ] Transitional public builder grammar is no longer live in the active lane.
- [ ] Existing active plugins can compile through the canonical runtime shell.

## Testing / Verification
- `bun run sync:check`
- affected plugin typechecks/tests
- `bun scripts/phase-2/verify-canonical-plugin-builders.mjs`

## Dependencies / Notes
- Blocked by: [M2-U03](./M2-U03-install-canonical-async-runtime-path.md).
- Blocks: [M2-U05](./M2-U05-migrate-phase-2-proof-slices.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- canonical builder surface for active runtime roles

Out of scope:
- marketplace-lane redesign
- optional role families not used in the active lane
