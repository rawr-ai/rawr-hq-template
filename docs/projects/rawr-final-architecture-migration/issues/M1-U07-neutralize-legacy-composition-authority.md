---
id: M1-U07
title: "[M1] Neutralize legacy executable composition authority"
state: planned
priority: 1
estimate: 8
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U06]
blocked: [M1-U08]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Cut execution over to the new HQ app shell and remove legacy host-composition authority so there is only one live executable composition path left.

## Deliverables
- Stop the old host-composition files from acting as live authority surfaces.
- Route execution through the new app shell.
- Use `apps/hq/legacy-cutover.ts` only if absolutely necessary as the sole sanctioned Phase 1 to Phase 2 bridge.
- Prove that the legacy host authority path is no longer live.

## Acceptance Criteria
- [ ] Old host files are deleted or fully quarantined from live authority.
- [ ] `apps/hq/server.ts` is a smoke-tested boot path.
- [ ] `apps/hq/async.ts` is a smoke-tested boot path if the async role is reserved/live in Phase 1.
- [ ] If `apps/hq/legacy-cutover.ts` exists, it is the only surviving transitional seam and is explicitly recorded as a Phase 2 Slice 0 deletion.

## Testing / Verification
- `bun run sync:check`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/server run test`
- `bun scripts/phase-1/verify-no-legacy-composition-authority.mjs`
- `rg -n 'host-composition|host-seam|host-realization' apps/server/src apps/hq -g '!**/dist/**' -g '!**/node_modules/**'`

## Dependencies / Notes
- Blocked by: [M1-U06](./M1-U06-install-canonical-hq-app-shell.md).
- Blocks: [M1-U08](./M1-U08-ratchet-phase-1-proofs-and-readjust.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- No dual manifests, registries, or executable composition paths survive this slice.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
Legacy executable authority should be removed only after the new front door already exists and points at canonical service and plugin seams. This is the cut from “new path exists” to “old path is not authoritative.”

### Scope Boundaries
In scope:
- Stop the old host-composition files from being live authority surfaces.
- Route execution through the new app shell.
- Use the one allowed bridge only if necessary.

Out of scope:
- Keeping two manifests, two registries, or two executable composition paths alive.
- Letting the bridge own manifest membership, plugin discovery rules, service truth, or runtime topology.

### Implementation Guidance
The legacy authority is concentrated in `apps/server/src/host-composition.ts`, `host-seam.ts`, and `host-realization.ts`, plus the places that boot through them. This slice must prove those files are no longer the live authority path.

### Files
- `apps/server/src/host-composition.ts`
- `apps/server/src/host-seam.ts`
- `apps/server/src/host-realization.ts`
- `apps/server/src/rawr.ts`
- `apps/server/src/testing-host.ts`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/phase-a-gates.test.ts`

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)
**Purpose:** Audit every remaining live boot and testing path that still depends on `host-composition`, `host-seam`, or `host-realization`, and determine the exact proof conditions for declaring legacy executable authority neutralized.
**Expected Output:** A path inventory naming every remaining caller, whether it must be deleted, rerouted, or quarantined, and the exact smoke/proof commands needed to show the new app shell is authoritative.
**Sources to Check:**
- `apps/server/src/rawr.ts`
- `apps/server/src/testing-host.ts`
- `apps/server/src/orpc.ts`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/phase-a-gates.test.ts`
- `rg -n 'host-composition|host-seam|host-realization' apps/hq apps/server -g '!**/dist/**' -g '!**/node_modules/**'`
