# Phase 2 Scratchpad

Repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`  
Branch: `docs/reground-p2-for-effect-runtime-substrate`  
Trunk: `main`  
Process: Graphite repo

## Current state

Phase 2 architecture remains:
- `packages/runtime/*` = execution family
- `packages/hq-sdk` = public app-runtime / authoring seam
- `M2-U00` = minimum server-only compiler/app-runtime cut
- `M2-U02` = broader compiler/process-runtime generalization

Phase 2 verifier scaffold exists and is still in place:
- `scripts/phase-2/_verify-utils.mjs`
- `verify-no-legacy-cutover.mjs`
- `verify-server-role-runtime-path.mjs`
- `verify-runtime-public-seams.mjs`
- `verify-gate-scaffold.mjs`
- root `phase-2:gate:u00:*` scripts
- `phase-2-u00-scaffold` structural suites for `@rawr/hq-app`, `@rawr/server`, `@rawr/hq-sdk`

Nx cache contract was already repaired before this pass:
- `nx.json` excludes project-local `dist/` and `coverage/` from default inputs
- `build`, `typecheck`, `lint` have explicit cache posture
- `sync` and `structural` remain intentionally non-cacheable
- repeated `@rawr/hq-sdk:build` and `@rawr/core:build` were verified to hit local cache on second run

## What was implemented in the last pass

### 1. Immediate build break repair

The original red builds were:
- `@rawr/server`: missing `@rawr/example-todo` dependency
- `@rawr/hq-app`: failed only because it compiled through `../server/src/*`
- `@rawr/web`: browser bundle reached `services/hq-ops/src/service/modules/config/support.ts` through `@rawr/plugin-server-api-state -> @rawr/hq-ops/service/contract`

Those were fixed by:
- completing direct workspace deps in `apps/server/package.json`
- splitting pure config schema/model material out of `services/hq-ops/src/service/modules/config/support.ts` into `services/hq-ops/src/service/modules/config/model.ts`
- keeping `plugins/server/api/state/src/contract.ts` pointed at `@rawr/hq-ops/service/contract`

Result:
- `@rawr/server:build` passes
- `@rawr/hq-app:build` passes
- `@rawr/web:build` passes
- `build:affected` passes

### 2. `hq-ops` re-grounding onto service runtime ports

Implemented:
- `services/hq-ops/src/service/shared/ports/config-store.ts`
- `services/hq-ops/src/service/shared/ports/repo-state-store.ts`
- `services/hq-ops/src/service/shared/ports/journal-store.ts`
- `services/hq-ops/src/service/shared/ports/security-runtime.ts`

`services/hq-ops/src/service/base.ts` now declares service-specific runtime deps:
- `configStore`
- `repoStateStore`
- `journalStore`
- `securityRuntime`

Module repositories/middleware were rewired to consume those ports rather than service-owned Node helpers:
- `config`
- `repo-state`
- `journal`
- `security`

The following service-owned runtime helpers were removed from `services/hq-ops/src/service/**`:
- `repo-state/storage.ts`
- `repo-state/support.ts`
- `journal/index-db.ts`
- `journal/paths.ts`
- `journal/semantic.ts`
- `journal/sqlite.ts`
- `journal/support.ts`
- `journal/utils.ts`
- `journal/writer.ts`
- `security/audit.ts`
- `security/exec.ts`
- `security/git.ts`
- `security/internal.ts`
- `security/report.ts`
- `security/secrets.ts`
- `security/support.ts`
- `security/untrusted.ts`

Concrete host-owned runtime now exists only for the live platform path that was implemented in this pass:
- `apps/server/src/host-adapters/hq-ops/config-store.ts`
- `apps/server/src/host-adapters/hq-ops/repo-state-store.ts`

And those are bound in:
- `apps/server/src/host-satisfiers.ts`

Important nuance:
- only the live server runtime path is fully rebound so far
- `configStore` and `repoStateStore` have concrete server host adapters
- `journalStore` and `securityRuntime` are defined as service ports, but not yet concretely rebound across the whole consumer surface outside test helpers

### 3. Verifier and gate ratchets updated

Verifier / lint changes now present:
- `scripts/phase-03/verify-hq-ops-service-boundary-purity.mjs`
- updated `scripts/phase-03/verify-plugin-server-api-state-structural.mjs`
- updated `scripts/phase-1/verify-hq-ops-service-shape.mjs`
- tightened `eslint.config.mjs`

What they now enforce:
- `hq-ops` contract/schema/model/type files may not import runtime helpers or `node:*` / `bun:*`
- the browser-facing `plugin-server-api-state` root export graph must remain runtime-safe
- the cleaned `hq-ops` topology is ratcheted instead of the old runtime-heavy one

Additional gate updates:
- `phase-c` and `phase-f` storage-lock / runtime-lifecycle gates now point at the server-host-owned repo-state store rather than the deleted `hq-ops` service runtime helper
- repo-state concurrency runtime proof moved to:
  - `apps/server/test/repo-state-store.concurrent.test.ts`

## Verification that passed

Static / build / verifier proof:
- `bunx nx run @rawr/hq-ops:typecheck --skip-nx-cache`
- `bunx nx run @rawr/hq-ops:build --skip-nx-cache`
- `bunx nx run @rawr/hq-ops:test --skip-nx-cache`
- `bunx nx run @rawr/server:build --skip-nx-cache`
- `bunx nx run @rawr/hq-app:build --skip-nx-cache`
- `bunx nx run @rawr/web:build --skip-nx-cache`
- `bunx nx run plugin-server-api-state:typecheck --skip-nx-cache`
- `bun scripts/phase-03/verify-hq-ops-service-boundary-purity.mjs`
- `bun scripts/phase-03/verify-plugin-server-api-state-structural.mjs`
- `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`
- `bun scripts/phase-c/verify-storage-lock-contract.mjs`
- `bun scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`
- `bun run sync:check --project @rawr/hq-ops`
- `bun run lint:boundaries`
- `bun run build:affected`
- `bunx vitest run --project server apps/server/test/repo-state-store.concurrent.test.ts`

Managed runtime / observability proof that passed:
- `bun run rawr hq up --observability required --open none`
- `bun run rawr hq status --json`
  - reached `summary: "running"`
  - server/web/async all healthy
  - observability support state was `running`
- `curl http://localhost:3000/health`
  - returned `{"ok":true}`
- first-party proof request succeeded:
  - `POST /rpc/exampleTodo/tasks/create`
- published proof request succeeded:
  - `POST /api/orpc/exampleTodo/tasks/create`
- `.rawr/hq/runtime.log` contains correlated entries for:
  - `hq-ops.procedure`
  - `orpc.procedure`
  - `todo.tasks.create`
  - `todo.procedure`
  - both `/rpc/...` and `/api/orpc/...` surfaces
- HyperDX ClickHouse showed:
  - `rawr.orpc.rpc.request`
  - `rawr.orpc.openapi.request`
  - `rawr.orpc.requests`
  - `rawr.orpc.request.duration`

Managed runtime was shut down afterward:
- final `rawr hq status --json` returned `summary: "stopped"`

## What remains

The live platform path is green, but the **entire `hq-ops` consumer surface is not yet fully re-grounded**.

What still remains to do:

1. Rebind all non-server direct `@rawr/hq-ops` clients to concrete host runtimes
- `packages/agent-sync/src/lib/layered-config.ts`
- `plugins/cli/plugins/src/lib/hq-ops-client.ts`
- `services/hq-ops/src/bin/security-check.ts`
- any other direct `createClient()` callers for `@rawr/hq-ops`

2. Provide concrete non-server host adapters for the remaining ports
- `configStore`
- `repoStateStore`
- `journalStore`
- `securityRuntime`

3. Decide whether to keep those adapters duplicated by host or factor shared host-owned runtime support into a sanctioned package-level host adapter location without violating the architecture

4. Re-run full static and runtime proof after those additional hosts are rebound

## Important observed runtime issue

`rawr hq up` still emits this unrelated operational error from the downstream CLI workspace:
- `Error: command hq:status not found`

But in this repo’s managed runtime path, it did **not** block startup or the proof loop:
- server still booted
- health passed
- requests passed
- logs/traces/metrics passed

That issue is real, but it is separate from the `hq-ops` runtime-port re-grounding work completed here.

## Relevant commits on this branch

Already on this branch before this pass:
- `498ea980` `build(phase-2): scaffold M2-U00 verifier ratchets`
- `f5f023b2` `build(nx): restore local cache hits for build targets`
- `99549868` `docs(handoff): refresh phase 2 scratchpad`

This pass:
- `9bc00a2f` `refactor(hq-ops): route runtime through host ports`

Notes:
- a verifier-only worker produced `dc3d3014` in its own forked flow; the relevant verifier content is already integrated into the current branch state
- an `hq-ops` service-slice worker produced `e3d983d6` in its own forked worktree; the relevant service content is already integrated into the current branch state

## Repo state now

- branch is ahead of origin by 6 commits
- worktree was clean at the end of the last implementation pass
- pre-existing intentionally untracked files should remain untracked:
  - `.claude/`
  - `docs/projects/rawr-final-architecture-migration/briefs/`
  - `the-reactive-codebase.html`
  - `the-reactive-codebase.md`

## Continuation snippet

```text
Continue from this compacted state:

Repo: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
Branch: docs/reground-p2-for-effect-runtime-substrate
Graphite repo, trunk = main.

Phase 2 architecture remains:
- packages/runtime/* = execution family
- packages/hq-sdk = public app-runtime / authoring seam
- M2-U00 = minimum server-only compiler/app-runtime cut
- M2-U02 = broader compiler/process-runtime generalization

What is now complete:
- The original build break trio is fixed:
  - @rawr/server build passes
  - @rawr/hq-app build passes
  - @rawr/web build passes
- hq-ops service boundary purity is now enforced:
  - config model/schema split landed
  - service/shared/ports/{config-store,repo-state-store,journal-store,security-runtime}.ts exist
  - hq-ops module repositories/middleware consume deps-backed runtime ports
  - old service-owned runtime helpers were removed from services/hq-ops/src/service/**
- server host binding exists for the live platform path:
  - apps/server/src/host-adapters/hq-ops/config-store.ts
  - apps/server/src/host-adapters/hq-ops/repo-state-store.ts
  - apps/server/src/host-satisfiers.ts binds configStore + repoStateStore
- verifier/lint ratchets were updated and are green:
  - scripts/phase-03/verify-hq-ops-service-boundary-purity.mjs
  - scripts/phase-03/verify-plugin-server-api-state-structural.mjs
  - scripts/phase-1/verify-hq-ops-service-shape.mjs
  - scripts/phase-c/verify-storage-lock-contract.mjs
  - scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs
  - eslint.config.mjs tightened for hq-ops boundary purity

Verification already passed:
- bunx nx run @rawr/hq-ops:typecheck --skip-nx-cache
- bunx nx run @rawr/hq-ops:build --skip-nx-cache
- bunx nx run @rawr/hq-ops:test --skip-nx-cache
- bunx nx run @rawr/server:build --skip-nx-cache
- bunx nx run @rawr/hq-app:build --skip-nx-cache
- bunx nx run @rawr/web:build --skip-nx-cache
- bunx nx run plugin-server-api-state:typecheck --skip-nx-cache
- bun scripts/phase-03/verify-hq-ops-service-boundary-purity.mjs
- bun scripts/phase-03/verify-plugin-server-api-state-structural.mjs
- bun scripts/phase-1/verify-hq-ops-service-shape.mjs
- bun scripts/phase-c/verify-storage-lock-contract.mjs
- bun scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs
- bun run sync:check --project @rawr/hq-ops
- bun run lint:boundaries
- bun run build:affected
- bunx vitest run --project server apps/server/test/repo-state-store.concurrent.test.ts

Managed runtime / observability proof already passed:
- rawr hq up --observability required --open none
- rawr hq status --json reached summary=running
- curl http://localhost:3000/health returned {\"ok\":true}
- both proof requests succeeded:
  - POST /rpc/exampleTodo/tasks/create
  - POST /api/orpc/exampleTodo/tasks/create
- .rawr/hq/runtime.log contains correlated hq-ops + todo + orpc proof entries
- HyperDX ClickHouse showed matching traces and rawr.orpc request metrics/histograms
- runtime was shut down cleanly afterward
- final rawr hq status --json returned summary=stopped

What is NOT done yet:
- the entire hq-ops consumer surface is not yet fully re-grounded
- only the live server/platform path has concrete host runtime bindings so far

Remaining work to plan and implement next:
1. Re-ground every other direct @rawr/hq-ops consumer, especially:
   - packages/agent-sync/src/lib/layered-config.ts
   - plugins/cli/plugins/src/lib/hq-ops-client.ts
   - services/hq-ops/src/bin/security-check.ts
   - any other direct createClient() callers for @rawr/hq-ops
2. Provide concrete non-server host adapters for the remaining runtime ports:
   - configStore
   - repoStateStore
   - journalStore
   - securityRuntime
3. Decide whether those adapters should stay host-local per consumer or be factored into a sanctioned shared host-owned adapter location without violating the architecture
4. Re-run full static + runtime + observability proof after all consumers are rebound

Important runtime note:
- rawr hq up still emits a separate downstream CLI error:
  - Error: command hq:status not found
- that did not block startup or the platform proof in this repo, but it is a real separate issue

Current commit for the implementation pass:
- 9bc00a2f refactor(hq-ops): route runtime through host ports

Use nx-workspace, narsil-mcp, architecture, and team-design again where useful.
Assume the goal is now to finish re-grounding the entire hq-ops consumer surface rigorously, not just the platform path.
```
