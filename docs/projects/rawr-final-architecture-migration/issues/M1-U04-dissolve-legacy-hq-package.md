---
id: M1-U04
title: "[M1] Dissolve the legacy HQ package and land purpose-named tooling boundaries"
state: planned
priority: 1
estimate: 4
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U03]
blocked: [M1-U05]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Delete `packages/hq`, preserve only the support and tooling surfaces that earn survival, and ensure no semantic HQ truth or ambiguous facades remain behind.

## Deliverables
- Move genuine shared workspace and plugin-discovery support into `packages/plugin-workspace`.
- Keep plugin-CLI-only helpers with plugin CLI ownership.
- Remove semantic HQ facades that become invalid once HQ Ops is authoritative.
- Delete `packages/hq` entirely after its surviving support surfaces are rehoused.

## Acceptance Criteria
- [ ] `packages/hq` is gone.
- [ ] No live `@rawr/hq/*` imports remain in apps, packages, plugins, or services.
- [ ] `packages/plugin-workspace` owns only real shared support, not semantic HQ truth.
- [ ] Plugin-CLI-only helpers live with plugin CLI ownership.
- [ ] Tests and typechecks previously carried by `packages/hq` pass in their new owners.

## Testing / Verification
- `bun run sync:check`
- `bun run lint:boundaries`
- `bun --cwd packages/plugin-workspace run typecheck`
- `bun --cwd apps/cli run typecheck`
- `bun --cwd plugins/cli/plugins run typecheck`
- `bun --cwd packages/plugin-workspace run test`
- `bun --cwd plugins/cli/plugins run test`
- `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `rg -n '@rawr/hq(/|\\b)' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`

## Dependencies / Notes
- Blocked by: [M1-U03](./M1-U03-migrate-hq-ops-and-rewire-consumers.md).
- Blocks: [M1-U05](./M1-U05-cut-canonical-plugin-topology.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- `packages/hq` is several different problems at once; split by earned ownership rather than directory nostalgia.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
`packages/hq` cannot be deleted safely until Phase 1 has already established a real home for semantic HQ truth. Once HQ Ops is authoritative, the remaining question is which support/tooling surfaces actually earn survival.

### Scope Boundaries
In scope:
- Move genuine shared workspace/plugin-discovery support into `packages/plugin-workspace`.
- Keep plugin-CLI-only helpers with plugin CLI ownership.
- Remove semantic HQ facades that became invalid once HQ Ops became authoritative.
- Delete `packages/hq`.

Out of scope:
- Moving work into the HQ SDK unless it truly belongs there.
- Preserving `packages/hq` as a generic compatibility bucket.

### Implementation Guidance
Partition `packages/hq` by earned ownership, not by directory nostalgia. Support surfaces survive only if they are support-only. Semantic facades die once direct HQ Ops cuts land.

### Files
- `packages/hq/src/workspace/index.ts`
- `packages/hq/src/workspace/plugin-manifest-contract.ts`
- `packages/hq/src/install/*`
- `packages/hq/src/lifecycle/*`
- `packages/hq/src/scaffold/*`
- `packages/hq/src/journal/*`
- `packages/hq/src/security/*`
- `plugins/cli/plugins/src/lib/*`
- `packages/plugin-workspace`

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

### Prework Results (Resolved)

### 1) Preserve as `packages/plugin-workspace`
These files are genuine workspace/plugin-discovery support and should move together:
- `packages/hq/src/workspace/index.ts`
- `packages/hq/src/workspace/plugin-manifest-contract.ts`
- `packages/hq/src/workspace/plugins.ts`

Their matching tests should follow them:
- `packages/hq/test/plugin-manifest-contract.test.ts`
- `packages/hq/test/workspace-discovery.test.ts`
- `packages/hq/test/workspace.test.ts`

Reason: these files parse workspace plugin manifests, discover plugins, and provide neutral workspace support used by more than one owner.

### 2) Move to plugin CLI ownership
These files already map directly onto plugin CLI helpers and should move under `plugins/cli/plugins` ownership:
- `packages/hq/src/install/{index,reconcile,state}.ts`
- `packages/hq/src/lifecycle/{fix-slice,index,lifecycle,policy,process,scratch-policy,types}.ts`
- `packages/hq/src/scaffold/{factory,index}.ts`

The existing plugin CLI mirrors are already present and should become the destination seams:
- `plugins/cli/plugins/src/lib/install-state.ts`
- `plugins/cli/plugins/src/lib/install-reconcile.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/lifecycle.ts`
- `plugins/cli/plugins/src/lib/workspace-plugins.ts`

The matching tests that need relocation or ownership review are:
- `packages/hq/test/install-state.test.ts`
- `packages/hq/test/instance-alias-isolation.test.ts`
- `packages/hq/test/phase-a-gates.test.ts`

### 3) Delete after direct cuts land
These are semantic facades and should not survive once HQ Ops and direct consumer rewires are complete:
- `packages/hq/src/journal/{context,index}.ts`
- `packages/hq/src/security/{index,module}.ts`
- `packages/hq/src/index.ts` once the surviving support/tooling exports have moved out

Reason: they exist to repackage semantic HQ truth or HQ-specific facades, which Phase 1 explicitly forbids from surviving.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
