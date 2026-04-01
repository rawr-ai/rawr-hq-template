---
id: M2-U01
title: "[M2] Harden bootgraph lifetimes and failure semantics"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U00]
blocked: [M2-U02]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Turn the first server-runtime cut into a real bootgraph with dependency ordering, dedupe, rollback, and shutdown guarantees.

## Deliverables
- Make `packages/bootgraph` real instead of server-cut scaffolding.
- Prove module identity dedupe, dependency-first startup, rollback on failure, and reverse shutdown ordering.
- Keep bootgraph process-local and role-aware without turning it into a second semantic plane.

## Acceptance Criteria
- [ ] Bootgraph startup and shutdown ordering are deterministic and tested.
- [ ] Failure during startup triggers rollback semantics.
- [ ] Identity dedupe is enforced.
- [ ] Process and role lifetime behavior is explicit and tested.

## Testing / Verification
- `bun --cwd packages/bootgraph run typecheck`
- `bun --cwd packages/bootgraph run test`
- `bun scripts/phase-2/verify-bootgraph-public-api.mjs`

## Dependencies / Notes
- Blocked by: [M2-U00](./M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md).
- Blocks: [M2-U02](./M2-U02-generalize-runtime-compiler-and-process-runtime.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- bootgraph behavior guarantees
- typed boot context assembly

Out of scope:
- widening runtime scope beyond the active lane
- authoring-surface cleanup outside what bootgraph requires
