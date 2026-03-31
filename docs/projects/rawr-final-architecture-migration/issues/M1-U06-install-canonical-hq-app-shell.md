---
id: M1-U06
title: "[M1] Install the canonical HQ app shell"
state: planned
priority: 1
estimate: 4
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U05]
blocked: [M1-U07]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Install the canonical HQ app front door so manifest membership and thin entrypoints become the only live composition authority before legacy host authority is dismantled.

## Deliverables
- Create the canonical app shell files at `apps/hq/rawr.hq.ts`, `apps/hq/server.ts`, `apps/hq/async.ts`, and `apps/hq/dev.ts`.
- Make manifest membership the only composition authority.
- Keep entrypoints thin so they own process shape instead of semantic truth.
- Reserve the later seams that Phase 2 will realize without smuggling in Phase 2 substrate work.

## Acceptance Criteria
- [ ] The canonical HQ app shell files exist and are authoritative.
- [ ] Manifest-purity and entrypoint-thinness proof passes.
- [ ] The Phase 1 app shell only needs `server`, `async`, and `dev`.
- [ ] App-shell smoke tests prove the new front door is real before old host authority is dismantled.

## Testing / Verification
- `bun run sync:check`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/hq run test`
- `bun scripts/phase-1/verify-manifest-purity.mjs`
- `bun scripts/phase-1/verify-entrypoint-thinness.mjs`
- `rg -n 'manifest\\.ts|rawr\\.hq\\.ts|server\\.ts|async\\.ts|dev\\.ts' apps/hq apps/server -g '!**/dist/**' -g '!**/node_modules/**'`

## Dependencies / Notes
- Blocked by: [M1-U05](./M1-U05-cut-canonical-plugin-topology.md).
- Blocks: [M1-U07](./M1-U07-neutralize-legacy-composition-authority.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- The app shell becomes real authority in this slice; it should not be a decorative wrapper around the existing `apps/server` boot path.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
App-shell authority should move only after service truth and plugin topology are stable enough that the new front door can point at canonical seams instead of transition seams.

### Scope Boundaries
In scope:
- Create the canonical app shell files:
  - `apps/hq/rawr.hq.ts`
  - `apps/hq/server.ts`
  - `apps/hq/async.ts`
  - `apps/hq/dev.ts`
- Make manifest membership the only composition authority.
- Keep entrypoints thin so they own process shape, not semantic truth.
- Reserve the later seams that Phase 2 will realize.

Out of scope:
- Implementing bootgraph.
- Implementing the runtime compiler or harnesses.
- Making `web`, `cli`, or `agent` part of the live Phase 1 shell.
- Neutralizing old executable authority before the new front door is proven.

### Implementation Guidance
The new app shell has to become real authority here, not a decorative wrapper around the current `apps/server` path.

### Files
- `apps/hq/rawr.hq.ts`
- `apps/hq/server.ts`
- `apps/hq/async.ts`
- `apps/hq/dev.ts`
- `apps/hq/src/manifest.ts`
- `apps/hq/package.json`
- `apps/hq/src/runtime-router.ts`
- `apps/server/src/host-composition.ts`
- `apps/server/src/rawr.ts`
- `apps/hq/test/runtime-router.test.ts`
- `apps/server/test/rawr.test.ts`

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
