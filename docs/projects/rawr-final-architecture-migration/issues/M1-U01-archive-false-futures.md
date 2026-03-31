---
id: M1-U01
title: "[M1] Archive false futures and remove them from the live lane"
state: planned
priority: 1
estimate: 4
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U00]
blocked: [M1-U02]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Archive `coordination`, `support-example`, and runtime-misplaced agent content so they stop acting like live architectural options before the canonical seams are installed.

## Deliverables
- Remove live `coordination` surfaces from build, test, runtime, and inventory participation.
- Remove live `support-example` surfaces from build, test, runtime, manifest/host registration, and test inventory participation.
- Preserve durable archive evidence for both removed lanes, including the useful support-example fixtures and lessons.
- Move `plugins/agents/hq` to `packages/agent-pack-hq` and reclassify it out of runtime plugin roots.

## Acceptance Criteria
- [ ] `coordination` is absent from live build, test, runtime, and inventory surfaces.
- [ ] `support-example` is absent from live build, test, runtime, manifest/host registration, and live test inventory.
- [ ] The preserved support-example evidence includes lifecycle fixtures, a representative trigger payload, and translation of the best tests into later async acceptance language.
- [ ] Non-runtime agent content has moved out of runtime plugin roots and `plugins/agents/hq` now lives under `packages/agent-pack-hq`.
- [ ] Static scans prove there are no live imports or registrations pointing at archived coordination/support-example surfaces.

## Testing / Verification
- `bun run sync:check`
- `bun --cwd packages/agent-pack-hq run typecheck`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-no-runtime-agent-content-under-plugins.mjs`
- `rg -n 'coordination|support-example' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- `test -d packages/agent-pack-hq`
- `test ! -d plugins/agents/hq`

## Dependencies / Notes
- Blocked by: [M1-U00](./M1-U00-guardrails-and-phase-1-ledger.md).
- Blocks: [M1-U02](./M1-U02-reserve-hq-ops-seam.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- This slice is subtraction with evidence retention; the archive artifacts are the only sanctioned memory of the removed lanes after this cut lands.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
False futures must leave the live lane before canonical seams are installed, or they will keep exerting pressure as plausible authorities during the rest of Phase 1.

### Scope Boundaries
In scope:
- Archive and remove live `coordination` surfaces.
- Archive and remove live `support-example` surfaces.
- Preserve useful evidence from those archived lanes.
- Move runtime-misplaced agent content out of `plugins/`.
- Move `plugins/agents/hq` into `packages/agent-pack-hq`.
- Update workspace and inventory surfaces so archived lanes stop participating in live build, typecheck, test, and runtime paths.

Out of scope:
- Normalizing `coordination`.
- Keeping `support-example` alive as live Phase 1 architecture.
- Creating the later async replacement slice.

### Implementation Guidance
This slice is about subtraction with evidence retention. The archive artifacts matter because they are the only sanctioned memory of the removed lanes after the live roots are cut. The non-runtime agent content destination is not open-ended in Phase 1: `plugins/agents/hq` moves to `packages/agent-pack-hq`.

### Files
- `services/coordination`
- `plugins/api/coordination`
- `plugins/workflows/coordination`
- `services/support-example`
- `plugins/workflows/support-example`
- `plugins/agents/hq`
- `packages/agent-pack-hq`
- `docs/archive/coordination/lessons.md`
- `docs/archive/support-example/lessons.md`

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
