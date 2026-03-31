# Current Issue Context

## Active Slice

- Issue: `M1-U05`
- Title: `Cut the canonical plugin topology`
- Status: implementation ready on `agent-FARGO-M1-U05-cut-canonical-plugin-topology`
- Dependency state: `M1-U04` is complete, so the ambiguous `packages/hq` lane is already gone and plugin support is now cleanly partitioned
- Current role of the slice: move the live runtime-projection tree onto the canonical role-first plugin roots so the old plugin roots stop being a viable authority path

## Why This Slice Matters

Phase 1 cannot leave two different live plugin topologies behind. If `plugins/api/*` and `plugins/workflows/*` remain while the canonical architecture says `plugins/server/api/*` and `plugins/async/*`, implementers still have two competing answers to the same question.

U05 therefore has to make filesystem truth, workspace truth, Nx truth, import truth, and proof truth agree on one live topology:

- live server plugins belong under `plugins/server/api/*`
- live async plugins belong under `plugins/async/workflows/*` and `plugins/async/schedules/*`
- the old live roots `plugins/api/*` and `plugins/workflows/*` must disappear from the live lane

## Done Bar

This slice is done only when all of the following are true:

- `plugins/api` and `plugins/workflows` are gone from the live lane
- canonical roots exist and are authoritative:
  - `plugins/server/api/*`
  - `plugins/async/workflows/*`
  - `plugins/async/schedules/*`
- workspace globs, Nx inventory, project metadata, tags, and imports all point at the canonical roots
- the live server plugins use role-first identities, not the old `plugin-api-*` naming
- proof scripts pass and there is no second live plugin tree left for implementers to treat as authoritative

## Canonical References

Read these before starting or resuming:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
4. [M1-U05-cut-canonical-plugin-topology.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U05-cut-canonical-plugin-topology.md)
5. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)
6. [RAWR_P1_Architecture_Migration_Plan.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md)
7. [plugins/AGENTS.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/AGENTS.md)

## Relevant Surfaces

Canonical roots being installed:

- `plugins/server/api/*`
- `plugins/async/workflows/*`
- `plugins/async/schedules/*`

Old live roots being removed:

- `plugins/api/*`
- `plugins/workflows/*`

Live server plugins being moved:

- `plugins/api/example-todo`
- `plugins/api/state`

Root/workspace/inventory truth that must move with the cut:

- `package.json`
- `tsconfig.base.json`
- `tools/architecture-inventory/slice-0-first-cohort.json`
- `tools/nx/sync-slice-0-inventory/generator.cjs`
- `plugins/AGENTS.md`

Live import sites already confirmed stale:

- `apps/hq/src/manifest.ts`
- `apps/server/src/host-seam.ts`
- `apps/web/src/ui/lib/orpc-client.ts`
- `apps/hq/package.json`
- `apps/web/package.json`

Tests / helpers already confirmed stale:

- `packages/plugin-workspace/test/plugin-manifest-contract.test.ts`
- `packages/plugin-workspace/test/workspace-discovery.test.ts`
- `plugins/cli/plugins/src/commands/plugins/sweep.ts`
- `plugins/cli/plugins/test/plugin-plugins.test.ts`
- `plugins/cli/plugins/test/workspace-plugins-discovery.test.ts`

## Key Insights Already Established

- The topology cut is not just a directory move. The old roots are also embedded in workspaces, project names, tags, path aliases, imports, inventory sync, and plugin discovery tests.
- The architecture spec's `@rawr/plugins/server/api/...` examples are conceptual topology examples, not directly usable workspace package names. This repo still operates on one package per plugin with normal package-manager constraints.
- Because of that, the concrete live rename for this slice is role-first but still one-package-per-plugin:
  - `@rawr/plugin-api-example-todo` -> `@rawr/plugin-server-api-example-todo`
  - `@rawr/plugin-api-state` -> `@rawr/plugin-server-api-state`
  - Nx project names follow the same shift: `plugin-api-*` -> `plugin-server-api-*`
- `plugins/AGENTS.md` is active routing truth, so it must move with the topology cut rather than lag behind as stale doc debt.
- The async live lane may stay reserved-empty after archiving. Do not invent fake async plugins just to populate `plugins/async/workflows` or `plugins/async/schedules`.

## Invariants and User Constraints

- Stay in this single worktree only.
- Work on `agent-FARGO-M1-U05-cut-canonical-plugin-topology`.
- Keep the milestone packet as execution authority and the architecture spec as canonical architecture truth.
- Do not reopen U04 and do not move to U06 until U05 is fully verified, HQ-validated, committed, submitted, and tracked.
- Make one authoritative live plugin tree. Do not leave an old-root compatibility lane behind.
- Keep the frozen `plugins/agents/hq` marketplace lane unchanged.
- Before committing code changes, have an agent validate the managed HQ stack with:
  - `bun run rawr hq up --observability required --open none`
  - status / health checks
  - log inspection
  - confirmation that first-party state still works
  - confirmation that archived coordination/support-example routes still return `404`

## Verification Bar

Run at minimum:

- `bun run sync:check`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/server run test`
- `bun scripts/phase-1/verify-canonical-plugin-topology.mjs`
- `rg -n 'plugins/(api|workflows)/' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- `test ! -d plugins/api && test ! -d plugins/workflows`

## Current Status

- Branch is `agent-FARGO-M1-U05-cut-canonical-plugin-topology`.
- Working tree was clean before U05 edits started.
- Old topology truth is still present in:
  - root workspaces (`plugins/api/*`, `plugins/workflows/*`)
  - `tsconfig.base.json` path aliases
  - plugin package names and Nx project IDs (`plugin-api-*`)
  - `tools/architecture-inventory/slice-0-first-cohort.json`
  - `tools/nx/sync-slice-0-inventory/generator.cjs`
  - `plugins/AGENTS.md`
  - `apps/hq`, `apps/server`, and `apps/web` imports/dependencies
  - plugin discovery tests and helper heuristics
- Concrete naming decision for implementation:
  - use canonical roots on disk
  - use role-first flattened package identities in code and manifests
  - do not attempt a fake nested package-name scheme that package managers cannot natively own

## Immediate Next Actions

1. Move `plugins/api/example-todo` and `plugins/api/state` into `plugins/server/api/*`.
2. Rename package/project identities from `plugin-api-*` to `plugin-server-api-*`.
3. Update workspace globs, path aliases, inventory sync, routing docs, imports, tests, and proof scripts to the new live topology.
4. Add or update the canonical topology proof, run the U05 verification bar, run HQ validation via agent, then commit and submit.
