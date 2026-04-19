# Current Issue Context

## Active Slice

- Issue: `M1-U04`
- Title: `Dissolve the legacy HQ package and land purpose-named tooling boundaries`
- Status: implemented and verified on `agent-FARGO-M1-U04-dissolve-legacy-hq-package`; pending commit and Graphite submit
- Dependency state: `M1-U03` is complete, so HQ operational truth already lives in `services/hq-ops`
- Current role of the slice: partition the residue of `packages/hq` by earned ownership, keep only neutral support in a purpose-named package, keep plugin-CLI-owned helpers with plugin CLI, and delete `packages/hq` entirely

## Why This Slice Matters

`packages/hq` is the last ambiguous catch-all layer left after the semantic cut into HQ Ops. If it survives, later plugin-topology and app-shell work would still be resting on a misleading package boundary that mixes neutral workspace support, plugin CLI helper logic, and stale HQ semantic facades.

U04 therefore has to do four things cleanly:

- move neutral workspace/plugin-manifest support into `packages/plugin-workspace`
- keep plugin-install / lifecycle / scaffold helper logic under plugin CLI ownership
- cut the remaining direct `@rawr/hq/*` imports to their honest homes
- delete `packages/hq` so no compatibility bucket survives

## Done Bar

This slice is done only when all of the following are true:

- `packages/hq` is gone from the live tree
- no live `@rawr/hq/*` imports remain in apps, packages, plugins, or services
- `packages/plugin-workspace` exists and owns only support-only workspace/plugin-manifest discovery logic
- plugin-CLI-owned install, lifecycle, scaffold, and scratch-policy helpers live under `plugins/cli/plugins`
- former `packages/hq` tests now pass in their real owners
- the managed HQ stack still comes up cleanly with observability required after the cut

## Canonical References

Read these before starting or resuming:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
4. [M1-U04-dissolve-legacy-hq-package.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U04-dissolve-legacy-hq-package.md)
5. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)

## Relevant Surfaces

Package being dissolved:

- `packages/hq/`

Neutral support that should survive under `packages/plugin-workspace`:

- `packages/hq/src/workspace/index.ts`
- `packages/hq/src/workspace/plugins.ts`
- `packages/hq/src/workspace/plugin-manifest-contract.ts`
- `packages/hq/test/plugin-manifest-contract.test.ts`
- `packages/hq/test/workspace-discovery.test.ts`
- `packages/hq/test/workspace.test.ts`

Plugin-CLI-owned helpers already living or wanting to live under `plugins/cli/plugins`:

- `plugins/cli/plugins/src/lib/workspace-plugins.ts`
- `plugins/cli/plugins/src/lib/install-state.ts`
- `plugins/cli/plugins/src/lib/install-reconcile.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/*`
- `plugins/cli/plugins/src/lib/factory.ts`
- `plugins/cli/plugins/test/{install-state.test.ts,distribution-alias-lifecycle.test.ts,phase-a-gates.test.ts,workspace-plugins-discovery.test.ts}`

Residual facade sites that must stop naming `@rawr/hq`:

- `apps/cli/src/lib/workspace-plugins.ts`
- `plugins/cli/plugins/src/lib/workspace-plugins.ts`
- `plugins/cli/plugins/src/lib/install-state.ts`
- `plugins/cli/plugins/src/commands/plugins/{converge,improve,sweep}.ts`

Proof / workspace wiring that must change with the cut:

- `scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `vitest.config.ts`
- `packages/hq/test/phase-a-gates.test.ts`
- `plugins/cli/plugins/test/phase-a-gates.test.ts`

## Key Insights Already Established

- `packages/hq` is not one real boundary. It is three different ownership categories packed together:
  - neutral workspace/plugin-manifest support
  - plugin CLI operational helper logic
  - stale HQ semantic facades that should die
- The workspace/plugin-manifest helpers are genuinely shared and deserve a neutral support package: `@rawr/plugin-workspace`.
- The install drift engine, install reconcile logic, lifecycle scratch-policy gate, and scaffold factory are plugin-system mechanics, not generic HQ support. They belong with `plugins/cli/plugins`.
- `apps/cli/src/lib/journal-context.ts` remains a CLI-owned in-process accumulator. Only semantic journal I/O cuts directly to `@rawr/hq-ops/journal`.
- `packages/agent-sync` has a local workspace helper today; leave that alone in U04 unless the move clearly reduces duplication without expanding scope.
- The current `verify-no-legacy-hq-imports` script is a frozen-U03 holdover and must be rewritten so U04 proves `@rawr/hq` is gone instead of allowing a legacy frozen import surface.

## Invariants and User Constraints

- Stay in this single worktree only.
- Work on `agent-FARGO-M1-U04-dissolve-legacy-hq-package`.
- Keep the milestone packet as execution authority and the architecture spec as canonical architecture truth.
- `packages/plugin-workspace` must remain support-only and must not become a new semantic HQ bucket.
- Do not preserve `packages/hq` as a renamed compatibility shell.
- Use direct cuts, not re-export bridges, unless a test-local seam genuinely needs a short-lived local alias inside the owning package.
- Keep `context.md` current-issue-only and replace it again before U05.
- Before committing code changes, have an agent validate the managed HQ stack with:
  - `bun run rawr hq up --observability required --open none`
  - status / health checks
  - log inspection
  - confirmation that first-party state still works
  - confirmation that archived coordination/support-example routes still return `404`

## Verification Bar

Run at minimum:

- `bun run sync:check`
- `bun run lint:boundaries`
- `bun --cwd packages/plugin-workspace run typecheck`
- `bun --cwd apps/cli run typecheck`
- `bun --cwd plugins/cli/plugins run typecheck`
- `bun --cwd packages/plugin-workspace run test`
- `bun --cwd plugins/cli/plugins run test`
- `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `rg -n '@rawr/hq(/|\\b)' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`

## Current Status

- Branch is `agent-FARGO-M1-U04-dissolve-legacy-hq-package`.
- `packages/hq` has been deleted from the live tree.
- `packages/plugin-workspace` now exists and owns the shared workspace/plugin-manifest support seam.
- Plugin CLI now owns the surviving install-state and scratch-policy mechanics under `plugins/cli/plugins`.
- The U04 verification bar is green:
  - `bun run sync:check`
  - `bun run lint:boundaries` (only pre-existing unrelated server warnings)
  - `bun run --cwd packages/plugin-workspace typecheck`
  - `bun run --cwd apps/cli typecheck`
  - `bun run --cwd plugins/cli/plugins typecheck`
  - `bun run --cwd packages/plugin-workspace test`
  - `bun run --cwd plugins/cli/plugins test`
  - `bun run --cwd apps/cli test`
  - `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
  - `bun run --cwd packages/plugin-workspace structural`
  - `rg -n -P '@rawr/hq(?![-\\w])(?:/|\\b)' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- HQ managed-stack validation is green:
  - `rawr hq status --json` reports running server/web/async and required observability
  - `/health` returned `200`
  - first-party `/rpc/state/getRuntimeState` returned `200`
  - archived coordination/support-example route probes returned `404`

## Immediate Next Actions

1. Commit the verified U04 diff on `agent-FARGO-M1-U04-dissolve-legacy-hq-package`.
2. Run `gt ss --draft` to publish/update the U04 Graphite PR.
3. Refresh Narsil primary-tree indexing to the new U04 commit.
4. Swap `context.md` over to U05 and continue to the canonical plugin-topology cut.
