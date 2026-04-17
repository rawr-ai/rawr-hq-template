# Phase 2 + Nx Cache Compaction Scratchpad

Date: 2026-04-16
Repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
Branch: `docs/reground-p2-for-effect-runtime-substrate`

## Current State

- Repo-backed Phase 2 docs remain the local source of truth.
- The local Phase 2 packet is aligned on the hardened design:
  - `packages/runtime/*` is the consolidated execution family
  - `packages/hq-sdk` is the public app-runtime / authoring seam
  - `M2-U00` owns the minimum server-only compiler/app-runtime cut
  - broader compiler/process-runtime generalization stays in `M2-U02`

## What Was Completed Before This Scratchpad Update

- The Phase 2 verifier surface was created for real:
  - `scripts/phase-2/_verify-utils.mjs`
  - `scripts/phase-2/verify-no-legacy-cutover.mjs`
  - `scripts/phase-2/verify-server-role-runtime-path.mjs`
  - `scripts/phase-2/verify-runtime-public-seams.mjs`
  - `scripts/phase-2/verify-gate-scaffold.mjs`
- Root `phase-2:gate:u00:*` scripts were added.
- `scripts/phase-03/run-structural-suite.mjs` now exposes `phase-2-u00-scaffold` on:
  - `@rawr/hq-app`
  - `@rawr/server`
  - `@rawr/hq-sdk`
- `hq-sdk` got `sync` and `structural` targets.
- Nx inventory / sync wiring was updated so the Phase 2 scaffold is part of workspace truth.
- The M2 docs were updated to use `verify-runtime-public-seams` instead of the older narrower verifier name.

## What That Phase 2 Scaffold Means

- `bun run phase-2:gate:u00:scaffold` passes and prints the live U00 gap.
- `bun run phase-2:gate:u00:contract` fails on the current codebase, which is intentional and desirable.
- The current failing U00 contract findings are the real implementation target:
  - `apps/hq/legacy-cutover.ts` still exists and is still exported/imported
  - `apps/hq/server.ts` still boots through `./legacy-cutover`
  - `packages/runtime/substrate`, `packages/runtime/bootgraph`, and `packages/runtime/harnesses/elysia` do not exist yet
  - `packages/hq-sdk` does not yet expose `./app`, `./app-runtime`, `defineApp()`, or `startAppRole()`

## Nx Cache Work Completed

- Installed workspace dependencies so Nx could run in this checkout.
- Investigated cache misses and confirmed the main root cause:
  - `nx.json` had `namedInputs.default = ["{projectRoot}/**/*"]`, which hashed `dist/**`
  - builds were self-invalidating their own cache keys
- Implemented the cache fix:
  - `nx.json` now excludes project-local `dist/**` and `coverage/**` from `default`
  - `production` now excludes tests/specs
  - `targetDefaults.build` now uses `["production", "^production"]` and `outputs: ["{projectRoot}/dist"]`
  - `targetDefaults.typecheck` and `targetDefaults.lint` are now explicitly cacheable
  - `sync` and `structural` remain `cache: false`
- Added:
  - `nx:reset`
  - `nx:doctor`
  - `build:affected`
  - `typecheck:affected`
  - `scripts/dev/nx-doctor.mjs`
- Added explicit `nx.targets.build` metadata for key projects:
  - `@rawr/web`
  - `@rawr/server`
  - `@rawr/hq-app`
  - `@rawr/hq-sdk`
  - `@rawr/core`
- Added `tsconfig.build.json` and production-only build scripts across the planned plain-`tsc` projects.

## Nx Cache Verification Results

- `bun run nx:reset` passed
- `bun run nx:doctor` passed
- `bun run sync:check` passed
- `bun run lint:boundaries` passed
- Repeated `NX_DAEMON=false bunx nx run @rawr/hq-sdk:build` produced a local cache hit on run 2
- Repeated `NX_DAEMON=false bunx nx run @rawr/core:build` produced a local cache hit on run 2
- Adding a temporary file under `packages/core/test` did **not** bust the cached `@rawr/core:build`
- Repeated `@rawr/core:sync` and `@rawr/core:structural` still reran instead of claiming cache hits

## Important Build-Failure Investigation Result

The remaining red builds are **not** caused by the new lint or verification scripts.
They are real pre-existing build-health / boundary problems that were surfaced more clearly once `build` became meaningful and cacheable.

### `@rawr/server`

- [apps/server/src/host-satisfiers.ts](/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/host-satisfiers.ts) imports `@rawr/example-todo`
- [apps/server/package.json](/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/package.json) does **not** declare `@rawr/example-todo`
- This is a real missing workspace dependency / config oversight and should be fixed

### `@rawr/hq-app`

- `apps/hq/legacy-cutover.ts` imports server internals
- that pulls in `apps/server/src/host-satisfiers.ts`
- so `hq-app` fails because it flows through the same real `@rawr/example-todo` dependency bug above

### `@rawr/web`

- [apps/web/src/ui/lib/orpc-client.ts](/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/web/src/ui/lib/orpc-client.ts) imports `createStateApiClient` from `@rawr/plugin-server-api-state`
- that package’s public contract path goes through `@rawr/hq-ops/service/contract`
- that transitively reaches [services/hq-ops/src/service/modules/config/support.ts](/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/services/hq-ops/src/service/modules/config/support.ts)
- `support.ts` imports `node:fs/promises`, `node:os`, `node:path`, and `node:url`
- so a browser-facing path is dragging in Node-only service internals
- this is a real architectural boundary leak, not a verifier artifact and not an expected migration-state tolerance

## Interpretation Of Those Failures

- `server`: should not be broken like this
- `hq-app`: should not be broken like this
- `web`: should not be broken like this

These are not “expected because Phase 2 migration is incomplete.”
They are actual issues that should be triaged and fixed.

## Git / Commit State

Relevant commits on this branch now include:

- `57e66b23` `docs(migration): align phase 2 runtime family and public seams`
- `8bdb61ef` `docs(migration): harden phase 2 verification loop`
- `c39c1c07` `chore(git): keep unrelated local files untracked`
- `26f730ca` `docs(migration): add phase 2 verifier setup scratchpad`
- `498ea980` `build(phase-2): scaffold M2-U00 verifier ratchets`
- `f5f023b2` `build(nx): restore local cache hits for build targets`

Branch was ahead of origin by 4 at the time of writing this scratchpad update.

Pre-existing untracked local files that should remain untracked:

- `.claude/`
- `docs/projects/rawr-final-architecture-migration/briefs/`
- `the-reactive-codebase.html`
- `the-reactive-codebase.md`

## Next Topic After Compaction

1. Make a focused plan to fix the immediate dependency/build issues:
   - the missing `@rawr/example-todo` dependency problem in `server` / `hq-app`
   - the browser/server boundary leak through `plugin-server-api-state` -> `hq-ops`
2. Then devise a proper plan, likely with agents, to clean up the internal `hq-ops` implementation so it obeys the architecture:
   - services should stay runtime-agnostic
   - Node-only concerns should come in through dependencies/resources/ports, not leak across browser-facing import paths
   - use `example-todo` as the internal golden reference
   - use the existing architecture docs and:
     - [guidance.md](../../../../orpc-ingest-domain-packages/guidance.md)
     - [DECISIONS.md](../../../../orpc-ingest-domain-packages/DECISIONS.md)

## Context Continuation Snippet

Paste this after compaction:

```text
Continue from this compacted state:

Repo: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
Branch: docs/reground-p2-for-effect-runtime-substrate
Graphite repo, trunk = main.

Phase 2 state:
- The repo-backed Phase 2 packet is aligned on the hardened design:
  - packages/runtime/* = execution family
  - packages/hq-sdk = public app-runtime/authoring seam
  - M2-U00 = minimum server-only compiler/app-runtime cut
  - M2-U02 = broader compiler/process-runtime generalization
- The Phase 2 verifier scaffold is now real:
  - scripts/phase-2/_verify-utils.mjs
  - verify-no-legacy-cutover.mjs
  - verify-server-role-runtime-path.mjs
  - verify-runtime-public-seams.mjs
  - verify-gate-scaffold.mjs
- Root phase-2:gate:u00:* scripts exist.
- phase-2-u00-scaffold structural suites exist for @rawr/hq-app, @rawr/server, and @rawr/hq-sdk.
- bun run phase-2:gate:u00:scaffold passes.
- bun run phase-2:gate:u00:contract fails intentionally and now defines the real U00 implementation target.

Nx cache state:
- The local Nx cache contract was fixed.
- nx.json now excludes dist/coverage from default inputs.
- build now uses production-style inputs and {projectRoot}/dist outputs.
- typecheck and lint are explicitly cacheable.
- sync and structural remain non-cacheable.
- nx:reset, nx:doctor, build:affected, and typecheck:affected were added.
- scripts/dev/nx-doctor.mjs exists.
- explicit nx.targets.build metadata exists for:
  - @rawr/web
  - @rawr/server
  - @rawr/hq-app
  - @rawr/hq-sdk
  - @rawr/core
- tsconfig.build.json and production-only build scripts were added across the planned plain-tsc projects.

Nx cache verification already proved:
- bun run nx:reset ✅
- bun run nx:doctor ✅
- bun run sync:check ✅
- bun run lint:boundaries ✅
- repeated NX_DAEMON=false bunx nx run @rawr/hq-sdk:build -> second run local-cache-hit ✅
- repeated NX_DAEMON=false bunx nx run @rawr/core:build -> second run local-cache-hit ✅
- adding a temporary file under packages/core/test did not bust cached @rawr/core:build ✅
- repeated @rawr/core:sync and @rawr/core:structural reran instead of claiming cache hits ✅

Important build-failure investigation result:
- The remaining failing builds are NOT caused by the new lint/verification scripts.
- They are real pre-existing build/boundary problems that were surfaced more clearly once build became meaningful and cacheable.

Concrete failures:
1. @rawr/server
   - apps/server/src/host-satisfiers.ts imports @rawr/example-todo
   - apps/server/package.json does not declare @rawr/example-todo
   - this is a real missing workspace dependency / config oversight

2. @rawr/hq-app
   - apps/hq/legacy-cutover.ts imports server internals
   - that pulls in apps/server/src/host-satisfiers.ts
   - so hq-app fails because it flows through the same real dependency bug above

3. @rawr/web
   - apps/web/src/ui/lib/orpc-client.ts imports createStateApiClient from @rawr/plugin-server-api-state
   - that path goes through @rawr/hq-ops/service/contract
   - that transitively reaches services/hq-ops/src/service/modules/config/support.ts
   - support.ts imports node:fs/promises, node:os, node:path, node:url
   - so a browser-facing path is dragging in Node-only service internals
   - this is a real architectural boundary leak, not a verifier artifact and not an expected migration-state tolerance

Interpretation:
- server: should not be broken like this
- hq-app: should not be broken like this
- web: should not be broken like this

Next task:
1. Create a focused plan to fix the immediate dependency/build issues:
   - missing @rawr/example-todo dependency in server / hq-app flow
   - browser/server boundary leak through plugin-server-api-state -> hq-ops
2. Then create a proper plan, likely with agents, to clean up internal hq-ops so it obeys the architecture:
   - services stay runtime-agnostic
   - Node-only concerns come in through dependencies/resources/ports instead of leaking through browser-facing import paths
   - use services/example-todo as the internal golden reference
   - use architecture docs plus:
     - docs/projects/orpc-ingest-domain-packages/guidance.md
     - docs/projects/orpc-ingest-domain-packages/DECISIONS.md

Relevant recent commits on this branch:
- 498ea980 build(phase-2): scaffold M2-U00 verifier ratchets
- f5f023b2 build(nx): restore local cache hits for build targets

Pre-existing untracked local files should remain untracked:
- .claude/
- docs/projects/rawr-final-architecture-migration/briefs/
- the-reactive-codebase.html
- the-reactive-codebase.md
```
