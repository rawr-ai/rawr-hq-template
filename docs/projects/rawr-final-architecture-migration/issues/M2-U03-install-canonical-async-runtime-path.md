---
id: M2-U03
title: "[M2] Install the canonical async runtime path"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U02]
blocked: [M2-U04]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make `apps/hq/async.ts` a real canonical runtime path through Inngest-backed async harness seams instead of a reserved shell entrypoint.

## Deliverables
- Implement the thin Inngest harness adapter for the active async lane.
- Rewire `apps/hq/async.ts` through canonical app/runtime APIs.
- Prove workflows and schedules register from the compiled async plan instead of ad hoc host glue.

## Acceptance Criteria
- [ ] `apps/hq/async.ts` boots through canonical app/runtime APIs.
- [ ] Inngest registration derives from the compiled async plan.
- [ ] Async workflows and schedules are mounted through canonical harness seams.
- [ ] No live async path depends on the legacy host-composition chain.

## Testing / Verification
- `bun --cwd packages/runtime-harnesses/inngest run typecheck`
- `bun --cwd packages/runtime-harnesses/inngest run test`
- `bun scripts/phase-2/verify-async-role-runtime-path.mjs`
- async registration smoke validation

## Dependencies / Notes
- Blocked by: [M2-U02](./M2-U02-generalize-runtime-compiler-and-process-runtime.md).
- Blocks: [M2-U04](./M2-U04-replace-transitional-plugin-builders-with-canonical-builders.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- async role runtime path
- compiled-plan async registration

Out of scope:
- optional non-active runtime families
