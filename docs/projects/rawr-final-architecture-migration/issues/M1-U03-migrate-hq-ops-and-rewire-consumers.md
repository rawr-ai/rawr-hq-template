---
id: M1-U03
title: "[M1] Migrate HQ operational truth into HQ Ops and rewire consumers"
state: planned
priority: 1
estimate: 8
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U02]
blocked: [M1-U04]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Move config, repo-state, journal, and security authority into `services/hq-ops`, cut active consumers directly to that service, and delete the old operational owners from the live lane.

## Deliverables
- Fold config ownership into HQ Ops.
- Fold repo-state ownership into HQ Ops.
- Fold journal ownership into HQ Ops.
- Fold security ownership into HQ Ops.
- Rewire active CLI, server, and tooling consumers directly to `@rawr/hq-ops` or approved thin module subpaths.
- Remove the old owning packages and services from the live lane once their behavior continuity proofs are preserved.

## Acceptance Criteria
- [ ] No live imports remain from `@rawr/control-plane`, `@rawr/state`, `@rawr/journal`, or `@rawr/security`.
- [ ] Active CLI, server, and tooling consumers cut directly to `@rawr/hq-ops` or approved thin module subpaths.
- [ ] Config merge/validation, repo-state locking/mutation, journal behavior, and security scan/gate/report behavior all retain continuity through targeted tests.
- [ ] Old-owner inventory and import cleanup lands in this slice rather than being deferred.

## Testing / Verification
- `bun run sync:check`
- `bun run lint:boundaries`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/cli run typecheck`
- `bun --cwd plugins/cli/plugins run typecheck`
- `bun --cwd packages/agent-sync run typecheck`
- `bun --cwd apps/server run test`
- `bun --cwd apps/cli run test`
- `bun --cwd plugins/cli/plugins run test`
- `bun scripts/phase-1/verify-no-old-operational-packages.mjs`
- `rg -n '@rawr/(control-plane|state|journal|security)\\b' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`

## Dependencies / Notes
- Blocked by: [M1-U02](./M1-U02-reserve-hq-ops-seam.md).
- Blocks: [M1-U04](./M1-U04-dissolve-legacy-hq-package.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- This is the semantic heart of Phase 1; runtime projection and app-shell authority should only move after operational truth stops being split across packages, services, CLI code, and facades.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
Runtime projection and app authority should move only after semantic truth is no longer split across packages, services, CLI code, and legacy facades. This is the load-bearing authority collapse in Phase 1.

### Scope Boundaries
In scope:
- Move config truth into HQ Ops.
- Move repo-state truth into HQ Ops.
- Move journal truth into HQ Ops.
- Move security truth into HQ Ops.
- Rewire active consumers directly to HQ Ops.
- Remove the old owning packages and services from the live lane.

Out of scope:
- Changing plugin topology.
- Changing app-shell authority.
- Introducing new transitional package facades.

### Implementation Guidance
Treat the live consumer inventory as the minimum direct-rewire set, not as optional cleanup. Follow the direct-consumer-cut rule: cut to `@rawr/hq-ops` or approved thin module subpaths, do not add a new facade package, and port or preserve the behavioral tests before deleting old owners.

### Files
- `packages/control-plane/src`
- `services/state/src`
- `packages/journal/src`
- `packages/security/src`
- `apps/server/src/bootstrap.ts`
- `apps/cli/src/commands/config/show.ts`
- `apps/cli/src/commands/config/validate.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/commands/journal/*`
- `apps/cli/src/commands/security/*`
- `plugins/cli/plugins/src/lib/security.ts`
- `plugins/cli/plugins/src/commands/plugins/sync/sources/*`
- `packages/agent-sync/src/lib/layered-config.ts`

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

### Prework Results (Resolved)

### 1) Config consumer inventory
Direct `@rawr/control-plane` consumers currently live at:
- `apps/server/src/bootstrap.ts`
- `apps/cli/src/lib/coordination-api.ts`
- `apps/cli/src/commands/config/show.ts`
- `apps/cli/src/commands/config/validate.ts`
- `apps/cli/src/commands/journal/search.ts`
- `packages/agent-sync/src/lib/layered-config.ts`
- `plugins/cli/plugins/src/commands/plugins/sync/sources/{list,add,remove}.ts`
- `plugins/cli/plugins/src/commands/plugins/web/{enable,enable/all}.ts`

These are the direct config-cut consumers that must land on `services/hq-ops/modules/config` first.

### 2) Repo-state consumer inventory
Live `@rawr/state` / `@rawr/state/repo-state` consumers currently live at:
- `apps/server/src/bootstrap.ts`
- `apps/server/src/host-satisfiers.ts`
- `plugins/api/state/src/{context,contract}.ts`
- `plugins/cli/plugins/src/commands/plugins/web/{disable,enable,enable/all,status}.ts`
- `apps/server/test/{rawr.test.ts,storage-lock-route-guard.test.ts}`

`apps/cli/src/commands/workflow/demo-mfe.ts` only embeds `@rawr/state/repo-state` in generated-code text; it is not a live runtime import and should be treated as template fallout, not a direct migration blocker.

### 3) Journal, security, and `@rawr/hq` shim fallout
Direct `@rawr/journal` consumers currently live at:
- `apps/cli/src/index.ts`
- `apps/cli/src/commands/workflow/{forge-command,harden,demo-mfe}.ts`
- `apps/cli/src/commands/{reflect,journal/show,journal/tail,journal/search}.ts`
- `plugins/cli/plugins/src/lib/factory.ts`
- `packages/hq/src/scaffold/factory.ts`

Direct `@rawr/security` usage is concentrated in:
- `plugins/cli/plugins/src/lib/security.ts`
- `packages/security/test/security.test.ts`

The remaining HQ shim surfaces that must be coordinated with `M1-U04` are:
- `apps/cli/src/lib/journal-context.ts`
- `apps/cli/src/lib/workspace-plugins.ts`
- `apps/cli/src/lib/security.ts`
- `plugins/cli/plugins/src/lib/{workspace-plugins,install-state}.ts`
- plugin CLI commands still importing `@rawr/hq/lifecycle`

### 4) Tests and proofs that must move with owner deletion
The concrete owner-specific proof set is:
- config: `packages/control-plane/test/control-plane.test.ts`
- repo-state: `services/state/test/repo-state.concurrent.test.ts`, `apps/server/test/storage-lock-route-guard.test.ts`, `apps/server/test/rawr.test.ts`
- security: `packages/security/test/security.test.ts`
- journal: there is no standalone `packages/journal/test` directory, so journal continuity currently needs to be proven through CLI command behavior and any new HQ Ops module tests added during the cut

This means `M1-U03` is not just import cleanup. It owns the proof migration for the old operational packages.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
