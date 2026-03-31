---
id: M1-U00
title: "[M1] Establish guardrails and the Phase 1 ledger"
state: planned
priority: 1
estimate: 4
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: []
blocked: [M1-U01]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Create the checked-in Phase 1 ledger and the first proof rails so the repo explicitly enforces what is live, what is frozen, and what is forbidden before any authority moves begin.

## Deliverables
- Land `docs/migration/phase-1-ledger.md` as the Phase 1 classifier for live, archived, parked, and reclassified surfaces.
- Add the initial Phase 1 verification scripts that fail if `coordination`, `support-example`, runtime-misplaced agent content, old operational owners, or legacy HQ facades remain live.
- Wire the new checks into the normal repo verification flow so later slices inherit an enforced migration lane instead of a social contract.
- Freeze parked-lane edits to deletions, rewires, compile fixes, and explicit unblockers only.

## Acceptance Criteria
- [ ] The ledger forbids new work in `plugins/api/*`, `plugins/workflows/*`, `coordination`, `support-example`, and old HQ package imports.
- [ ] The ledger explicitly limits parked-lane edits to deletions, rewires, compile fixes, and explicit unblockers.
- [ ] The ledger classifies the minimum concrete Phase 1 surface set and that classification is proven against repo inventory.
- [ ] The initial Phase 1 structural checks exist and are wired into the repo as runnable commands/scripts.

## Testing / Verification
- `bun run sync:check`
- `bun run lint:boundaries`
- `bun scripts/phase-1/verify-phase1-ledger.mjs`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-no-runtime-agent-content-under-plugins.mjs`
- `bun scripts/phase-1/verify-no-old-operational-packages.mjs`
- `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `bunx nx show projects`

## Dependencies / Notes
- Blocked by: none.
- Blocks: [M1-U01](./M1-U01-archive-false-futures.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- This slice exists to make the repo tell the truth about the migration lane before semantic or runtime authority moves start.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
Without guardrails, every later slice competes with architectural drift and accidental reintroduction of old authority paths. The goal here is not file motion for its own sake; it is to establish an explicit, enforced contract for what Phase 1 is allowed to touch.

### Scope Boundaries
In scope:
- Create the Phase 1 ledger.
- Classify the live lane, archived lane, parked lane, and reclassified surfaces.
- Establish the initial structural checks that make forbidden directions visible.
- Freeze the migration lane so new work cannot land in the wrong places during Phase 1.

Out of scope:
- Moving semantic logic.
- Changing runtime behavior.
- Deferring slice-local cleanup under the assumption that a later closure slice will catch it.

### Implementation Guidance
The ledger should become the checked-in authority for Phase 1 surface classification. The first proof rails should make the forbidden live surfaces impossible to reintroduce quietly.

Use the current repo inventory as the evidence base:
- `bunx nx show projects`
- `find services -maxdepth 2 -type d | sort`
- `find packages -maxdepth 2 -type d | sort`
- `find plugins -maxdepth 3 -type d | sort`
- `find apps -maxdepth 3 -type d | sort`

### Files
- `docs/migration/phase-1-ledger.md`: authoritative Phase 1 slice classifier.
- `scripts/phase-1/verify-phase1-ledger.mjs`: ledger truth and inventory alignment.
- `scripts/phase-1/verify-no-live-coordination.mjs`: prevent coordination from reappearing.
- `scripts/phase-1/verify-no-live-support-example.mjs`: prevent support-example from reappearing.
- `scripts/phase-1/verify-no-runtime-agent-content-under-plugins.mjs`: prevent non-runtime agent content from living under canonical plugin roots.
- `scripts/phase-1/verify-no-old-operational-packages.mjs`: reserve the hard cut against old operational owners.
- `scripts/phase-1/verify-no-legacy-hq-imports.mjs`: reserve the hard cut against `@rawr/hq` facades.

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Results (Resolved)
The ledger should be structured around the exact Phase 1 control surface, not as a generic repo inventory. The minimum heading set that matches the current repo shape is:
- `Source-of-truth order`
- `Phase 1 lane rules`
- `Surface classification`
- `Verification map`
- `Slice closure log`
- `Parked-lane freeze`

The minimum concrete surface inventory to classify comes directly from the current workspace and Nx project set:
- Live/cutover surfaces: `apps/cli`, `apps/server`, `apps/hq`, `packages/control-plane`, `services/state`, `packages/journal`, `packages/security`, `packages/hq`, `packages/agent-sync`, `plugins/cli/plugins`, `plugins/api/example-todo`, `plugins/api/state`, `plugins/api/coordination`, `plugins/workflows/coordination`, `plugins/workflows/support-example`.
- Explicit archive/removal targets: `services/coordination`, `services/support-example`, `plugins/agents/hq`, `plugins/api/coordination`, `plugins/workflows/coordination`, `plugins/workflows/support-example`.
- Parked or later-phase-visible surfaces that need freeze treatment rather than redesign during Phase 1: `packages/bootgraph`, `packages/runtime-context`, `packages/hq-sdk`, `apps/web`, and unrelated plugin/app lanes that are not part of the authority-collapse plateau.

The current verification integration points are already centralized:
- Root `package.json` owns `sync:check` via `scripts/phase-03/verify-sync-check.mjs`.
- Root `package.json` owns `lint:boundaries` across `apps services packages plugins`.
- Existing per-project structural targets route through `scripts/phase-03/run-structural-suite.mjs` for `@rawr/server`, `@rawr/cli`, `@rawr/hq-app`, `@rawr/plugin-plugins`, `@rawr/state`, `@rawr/hq`, and `@rawr/coordination`.

The least disruptive Phase 1 fit is to add a dedicated Phase 1 verifier fan-out under `scripts/phase-1/` and invoke it from root `sync:check`, while keeping `lint:boundaries` as the repo-wide import-boundary guard and reserving per-project `structural` targets for slices that actually touch those projects.

## Prework Prompt (Agent Brief)
**Purpose:** Determine the exact ledger section structure, the minimum canonical surface set to classify, and how the new phase-1 verification scripts should hook into the existing repo verification flow.
**Expected Output:** A short implementation note naming the ledger headings, the concrete surface inventory to classify, the current structural runner integration points, and the exact package/root scripts that should invoke the new phase-1 checks.
**Sources to Check:**
- `package.json`
- `scripts/phase-03/`
- `docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md`
- current workspace inventory commands listed above
