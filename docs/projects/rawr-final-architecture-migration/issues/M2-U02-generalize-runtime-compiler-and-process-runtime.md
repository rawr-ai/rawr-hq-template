---
id: M2-U02
title: "[M2] Generalize the runtime compiler and process runtime"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U01]
blocked: [M2-U03]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Expand the compiler and process runtime from the first server cut into a reusable active-lane substrate with explicit plan and stop semantics.

## Deliverables
- Make `packages/runtime-compiler` real for:
  - `server.api`
  - `async.workflows`
  - `async.schedules`
- Make the thin process runtime real with explicit `stop()` behavior and role/process resource access.
- Keep both seams hidden and subordinate to app/service/plugin semantics.

## Acceptance Criteria
- [ ] Compiler plan generation is explicit for the active lane.
- [ ] Process runtime exposes stable stop semantics.
- [ ] Resource lowering from canonical declarations is tested.
- [ ] No hidden fallback to host-composition remains in the compiler/runtime path.

## Testing / Verification
- `bun --cwd packages/runtime-compiler run typecheck`
- `bun --cwd packages/runtime-compiler run test`
- `bun scripts/phase-2/verify-runtime-plan-compilation.mjs`
- `bun scripts/phase-2/verify-process-runtime-stop.mjs`

## Dependencies / Notes
- Blocked by: [M2-U01](./M2-U01-harden-bootgraph-lifetimes-and-failure-semantics.md).
- Blocks: [M2-U03](./M2-U03-install-canonical-async-runtime-path.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- plan generation for the active runtime lane
- explicit process runtime lifecycle behavior

Out of scope:
- optional role families and rich topology catalog work
