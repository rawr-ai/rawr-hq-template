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

### Prework Results (Resolved)

### 1) Ledger section structure
Use a fixed ledger shape that matches the Phase 1 stop-gates instead of a narrative migration note:
- Live lane
- Archived lane
- Parked lane
- Reclassified / target homes
- Prohibited directions
- Verification map

That keeps the ledger usable both as a human classifier and as the input contract for `verify-phase1-ledger`.

### 2) Minimum concrete surface inventory to classify
The minimum inventory should match the Phase 1 plan plus the repo’s current roots:
- Apps: `apps/hq`, `apps/server`, `apps/cli`, `apps/web`
- Services: `services/state`, `services/example-todo`, `services/support-example`, `services/coordination`
- Packages: `packages/control-plane`, `packages/journal`, `packages/security`, `packages/hq`, `packages/agent-sync`
- Plugins: `plugins/api/{coordination,example-todo,state}`, `plugins/workflows/{coordination,support-example}`, `plugins/agents/hq`, `plugins/web/*`, `plugins/cli/*`

The current inventory is enforced from `tools/architecture-inventory/*.json`, with `tools/architecture-inventory/slice-0-first-cohort.json` already carrying the `plugin-api-*` entries that Phase 1 will eventually replace.

### 3) Current verification integration points
The existing repo truth is:
- root `sync:check` -> `scripts/phase-03/verify-sync-check.mjs`
- root `lint:boundaries` -> `eslint apps services packages plugins`
- project-level `structural` targets already exist for `@rawr/server`, `@rawr/cli`, `@rawr/hq-app`, `@rawr/plugin-plugins`, `@rawr/state`, `@rawr/coordination`, `@rawr/hq`, `@rawr/runtime-context`, `@rawr/bootgraph`, and plugin API projects

Phase 1 verification scripts should therefore live under `scripts/phase-1/` and be wired in two places:
- as explicit root scripts / gate aggregators in `package.json`
- as follow-on structural or exit-gate inputs once the live project inventory changes

Do not hide the Phase 1 proof band inside a single project target. The migration lane is root-owned.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
