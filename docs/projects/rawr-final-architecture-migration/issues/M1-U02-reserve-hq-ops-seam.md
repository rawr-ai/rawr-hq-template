---
id: M1-U02
title: "[M1] Reserve the canonical HQ Ops seam"
state: done
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
- [x] `services/hq-ops` exists with the canonical Phase 1 service shell.
- [x] Placeholder seams exist for `config`, `repo-state`, `journal`, and `security`.
- [x] The seam-reservation slice does not move logic or rewire consumers.
- [x] Service-shape proof exists for the reserved seam.

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

## Implementation Decisions
- `services/example-todo` is the exact package-shell and internal-anchor reference for U02. `services/state` is only secondary prior art for workspace-target conventions like `sync` / `structural` scripts and inventory tagging.
- U02 will keep the public package boundary aligned with `example-todo`: exports stay limited to `.`, `./router`, and `./service/contract`. Reserved HQ Ops modules remain internal in this slice.
- Exact shell fidelity includes internal shared and module anchors, so U02 will reserve `src/service/shared/{README,errors,internal-errors}.ts` and per-module `repository.ts` / `schemas.ts` alongside `contract.ts` / `middleware.ts` / `module.ts` / `router.ts`.
- U02 will add a dedicated `hq-ops` Vitest project in `vitest.config.ts` and use `vitest run --project hq-ops` from `services/hq-ops/package.json` to match the `example-todo` package model.
- Each reserved module will expose one structural reservation procedure so the package can keep the canonical `example-todo` contract/module/router assembly seam and the direct `defineServicePackage(router)` client boundary without casts.
- `@rawr/hq-ops` is now registered in `scripts/phase-03/run-structural-suite.mjs`, and its `structural` target delegates to the U02 service-shape verifier so the advertised target surface is executable, not aspirational.

### Files
- `services/hq-ops/package.json`
- `services/hq-ops/src/service/base.ts`
- `services/hq-ops/src/service/contract.ts`
- `services/hq-ops/src/service/impl.ts`
- `services/hq-ops/src/service/router.ts`
- `services/hq-ops/src/service/modules/config/`
- `services/hq-ops/src/service/modules/repo-state/`
- `services/hq-ops/src/service/modules/journal/`
- `services/hq-ops/src/service/modules/security/`
- `services/state/src` as structural prior art only

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec_V1.md)

### Traceability
- Branch: `agent-FARGO-M1-U02-reserve-hq-ops-seam`
- Checks passed:
  - `bun run --cwd services/hq-ops typecheck`
  - `bun run --cwd services/hq-ops test`
  - `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`
  - `bun run sync:check --project @rawr/hq-ops`
  - `bun run --cwd services/hq-ops structural`
  - `bun run --cwd services/hq-ops build`
  - HQ runtime validation via managed stack (`rawr hq up --observability required --open none`, status/log/route probes)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
- [Implementation Details (Local Only)](#implementation-details-local-only)
  - [Why This Slice Exists](#why-this-slice-exists)
  - [Scope Boundaries](#scope-boundaries)
  - [Implementation Guidance](#implementation-guidance)
- [Implementation Decisions](#implementation-decisions)
  - [Files](#files)
  - [Paper Trail](#paper-trail)
  - [Traceability](#traceability)
  - [Quick Navigation](#quick-navigation)
