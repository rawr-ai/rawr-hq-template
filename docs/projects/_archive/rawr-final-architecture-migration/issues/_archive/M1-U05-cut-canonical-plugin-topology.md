---
id: M1-U05
title: "[M1] Cut the canonical plugin topology"
state: done
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
- [x] Old plugin roots are gone from the live lane.
- [x] Canonical plugin topology proof passes.
- [x] Workspace/project inventory, tags, and imports align with the new topology.
- [x] There is no second live plugin tree left for implementers to treat as authoritative.

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
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../../milestones/M1-authority-collapse.md).
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

### Implementation Decisions

#### Plugin identity after the root move

- The canonical architecture spec is authoritative for on-disk topology:
  - `plugins/server/api/*`
  - `plugins/async/workflows/*`
  - `plugins/async/schedules/*`
- The spec's `@rawr/plugins/server/api/...` import examples are treated as conceptual topology examples rather than literal workspace package names. This repo still uses one package per plugin with normal package-manager naming constraints.
- For the live Phase 1 cut, plugin identities therefore move to role-first flattened names instead of nested pseudo-package names:
  - `@rawr/plugin-api-example-todo` -> `@rawr/plugin-server-api-example-todo`
  - `@rawr/plugin-api-state` -> `@rawr/plugin-server-api-state`
  - Nx project names follow the same shift: `plugin-api-*` -> `plugin-server-api-*`
- This preserves a concrete, enforceable workspace identity model while still making the canonical role-first topology authoritative on disk.

### Files
- `plugins/server/api/example-todo`
- `plugins/server/api/state`
- `package.json`
- `tools/architecture-inventory/slice-0-first-cohort.json`
- `tools/nx/sync-slice-0-inventory/generator.cjs`
- `plugins/server/api/example-todo/project.json`
- `plugins/server/api/state/project.json`
- `apps/hq/src/manifest.ts`
- `apps/server/src/host-seam.ts`
- `apps/server/src/workflows/runtime.ts`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/phase-a-gates.test.ts`

### Implementation Results

- Live server plugins now live only at:
  - `plugins/server/api/example-todo`
  - `plugins/server/api/state`
- Old live roots `plugins/api` and `plugins/workflows` are removed from the live tree.
- Workspace globs, TS path aliases, Nx inventory/project metadata, and live imports now point at the canonical role-first topology.
- Role-first flattened plugin identities are now authoritative in code:
  - `@rawr/plugin-server-api-example-todo`
  - `@rawr/plugin-server-api-state`
- Reserved empty async roots are installed at:
  - `plugins/async/workflows`
  - `plugins/async/schedules`
- Branch: `agent-FARGO-M1-U05-cut-canonical-plugin-topology`

### Paper Trail
- [Dedicated Phase 1 migration plan](../../.context/M1-execution/RAWR_P1_Architecture_Migration_Plan.md)
- [Canonical architecture spec](../../resources/_archive/RAWR_Canonical_Architecture_Spec_V1.md)

### Prework Results (Resolved)

### 1) Workspace and inventory files that must change
The plugin-root cut is not self-contained. The current root and inventory truth lives in:
- root `package.json` workspaces: currently `plugins/api/*` and `plugins/workflows/*`
- `tools/architecture-inventory/slice-0-first-cohort.json`
- `tools/nx/sync-slice-0-inventory/generator.cjs`

Those files already encode `plugin-api-*` paths and must be updated when the canonical roots move.

### 2) Nx project files and tag changes
The current plugin project files are:
- `plugins/api/{state,example-todo,coordination}/project.json`
- `plugins/workflows/{coordination,support-example}/project.json`

Current tag posture is still old:
- API plugins: `role:api`, `surface:orpc`
- Workflow plugins: `role:workflow`, `surface:async`

Phase 1 target posture should instead align to the dedicated plan:
- `type:plugin`
- `role:server` / `role:async`
- `surface:api` / `surface:workflows` / `surface:schedules`

If `support-example` is archived in `M1-U01`, its workflow project should leave live inventory rather than migrate into the new async roots.

### 3) Import and proof surfaces that must move with the topology
The live import/proof surfaces tied to the old plugin roots are:
- `apps/hq/src/manifest.ts`
- `apps/server/src/host-seam.ts`
- `apps/server/src/workflows/runtime.ts`
- `apps/web/src/ui/lib/orpc-client.ts`
- `apps/cli/src/lib/coordination-api.ts`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/phase-a-gates.test.ts`

Outside the migration project, these docs also reference the old roots and will become stale later:
- `docs/SYSTEM.md`
- `docs/system/PLUGINS.md`
- `docs/process/HQ_OPERATIONS.md`

That doc cleanup belongs to `M1-U08`, not this topology cut issue.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
