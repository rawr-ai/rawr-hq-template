---
id: M1-U02
title: "[M1] Reserve the canonical HQ Ops seam"
state: planned
priority: 1
estimate: 3
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U01]
blocked: [M1-U03]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Create `services/hq-ops` as the single Phase 1 service home and reserve its `config`, `repo-state`, `journal`, and `security` seams before any operational truth moves into it.

## Deliverables
- Create `services/hq-ops` with the canonical Phase 1 service shell.
- Reserve the service shell seams at `base`, `contract`, `impl`, and `router`.
- Reserve module seams for `config`, `repo-state`, `journal`, and `security`.
- Add proof that the reserved HQ Ops service shape exists without prematurely becoming the migration slice itself.

## Acceptance Criteria
- [ ] `services/hq-ops` exists with the canonical Phase 1 service shell.
- [ ] Placeholder seams exist for `config`, `repo-state`, `journal`, and `security`.
- [ ] The seam-reservation slice does not move logic or rewire consumers.
- [ ] Service-shape proof exists for the reserved seam.

## Testing / Verification
- `bun run sync:check`
- `bun --cwd services/hq-ops run typecheck`
- `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`

## Dependencies / Notes
- Blocked by: [M1-U01](./M1-U01-archive-false-futures.md).
- Blocks: [M1-U03](./M1-U03-migrate-hq-ops-and-rewire-consumers.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- P1 is explicit here: `services/hq-ops` is one service package with internal modules, not four separate services.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
Canonical space has to exist before truth can move into it. This slice should make later migration easier without prematurely moving logic or reopening Phase 1 boundaries.

### Scope Boundaries
In scope:
- Create `services/hq-ops`.
- Establish the canonical shell and reserved module layout.
- Lock the rule that Phase 1 HQ Ops authority lives here.
- Reserve the places where the four operational modules will land.

Out of scope:
- Moving production logic.
- Rewiring consumers.
- Letting seam reservation quietly become the actual migration slice.

### Implementation Guidance
Use the current `services/state` package shape as structural prior art only. Do not inherit its naming or authority model.

### Files
- `services/hq-ops/package.json`
- `services/hq-ops/src/service/base.ts`
- `services/hq-ops/src/service/contract.ts`
- `services/hq-ops/src/service/impl.ts`
- `services/hq-ops/src/service/router.ts`
- `services/hq-ops/src/modules/config/`
- `services/hq-ops/src/modules/repo-state/`
- `services/hq-ops/src/modules/journal/`
- `services/hq-ops/src/modules/security/`
- `services/state/src` as structural prior art only

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
