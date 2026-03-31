---
id: M1-U05
title: "[M1] Cut the canonical plugin topology"
state: planned
priority: 1
estimate: 4
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U04]
blocked: [M1-U06]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Move the live runtime-projection tree onto the canonical role-first topology so the old plugin roots stop being a viable authority path.

## Deliverables
- Install the canonical plugin roots at `plugins/server/api/*`, `plugins/async/workflows/*`, and `plugins/async/schedules/*`.
- Move live server projections from the old plugin tree into the canonical server root.
- Update workspace, Nx inventory, tags, and imports so the new topology becomes authoritative.
- Prove that the old plugin roots are gone from the live lane.

## Acceptance Criteria
- [ ] Old plugin roots are gone from the live lane.
- [ ] Canonical plugin topology proof passes.
- [ ] Workspace/project inventory, tags, and imports align with the new topology.
- [ ] There is no second live plugin tree left for implementers to treat as authoritative.

## Testing / Verification
- `bun run sync:check`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/server run test`
- `bun scripts/phase-1/verify-canonical-plugin-topology.mjs`
- `rg -n 'plugins/(api|workflows)/' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- `test ! -d plugins/api && test ! -d plugins/workflows`

## Dependencies / Notes
- Blocked by: [M1-U04](./M1-U04-dissolve-legacy-hq-package.md).
- Blocks: [M1-U06](./M1-U06-install-canonical-hq-app-shell.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- This slice moves inventory, tags, imports, and filesystem truth together; filesystem motion alone is not enough.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
Plugin topology should only move once semantic owners are stable and ambiguous support layers are already gone. The intent is to leave one live runtime-projection tree behind, not two equivalent-looking trees.

### Scope Boundaries
In scope:
- Install the canonical plugin roots:
  - `plugins/server/api/*`
  - `plugins/async/workflows/*`
  - `plugins/async/schedules/*`
- Move live server projections to the canonical server root.
- Update root workspaces, project inventory, tags, and imports so the new topology is authoritative.

Out of scope:
- Building new plugin builders or later-phase substrate.
- Creating extra plugin-root categories unless Phase 1 truly needs them.
- Treating empty async roots as a failure if the live async lane is intentionally empty after archiving.

### Implementation Guidance
This slice is not just filesystem motion. Inventory, tags, and import truth need to move together so the old topology stops being a viable path.

### Files
- `plugins/api/example-todo`
- `plugins/api/state`
- `plugins/api/coordination`
- `plugins/workflows/coordination`
- `plugins/workflows/support-example`
- `package.json`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/phase-a-gates.test.ts`

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)
**Purpose:** Determine the exact workspace, Nx inventory, tag, and import updates required when `plugins/api/*` becomes `plugins/server/api/*` and async roots become `plugins/async/*`.
**Expected Output:** A short migration checklist naming every workspace/project/tag/config file that must change, plus the existing proof tests that need updates.
**Sources to Check:**
- `package.json`
- `bunx nx show projects`
- `plugins/`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/phase-a-gates.test.ts`
