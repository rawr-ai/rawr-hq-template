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

Phase 2 verifier scaffold still exists and is still in place:
- `scripts/phase-2/_verify-utils.mjs`
- `verify-no-legacy-cutover.mjs`
- `verify-server-role-runtime-path.mjs`
- `verify-runtime-public-seams.mjs`
- `verify-gate-scaffold.mjs`
- root `phase-2:gate:u00:*` scripts
- `phase-2-u00-scaffold` structural suites for `@rawr/hq-app`, `@rawr/server`, `@rawr/hq-sdk`

Nx cache posture remains fixed from the earlier pass:
- `nx.json` excludes project-local `dist/` and `coverage/` from default inputs
- `build`, `typecheck`, `lint` have explicit cache posture
- `sync` and `structural` remain intentionally non-cacheable

## What is now implemented

### 1. `hq-ops` stayed semantic-only

`services/hq-ops` still owns:
- service-local ports
- contracts
- schemas/models/types
- service/router/client seams

`services/hq-ops` no longer owns:
- concrete Node/Bun runtime helpers
- a service-owned executable bin

Removed:
- `services/hq-ops/src/bin/security-check.ts`
- `security:check` from `services/hq-ops/package.json`

### 2. Shared host runtime package now exists

New package:
- `packages/hq-ops-host`

It now owns the shared concrete host runtime for `hq-ops`:
- `createNodeHqOpsBoundary(...)`
- `createNodeConfigStore()`
- `createNodeRepoStateStore()`
- `createNodeJournalStore()`
- `createNodeSecurityRuntime()`

Important shape:
- this is support matter only
- no service truth
- no router/contract export surface
- no host-local caching or app/plugin policy

The old server-local concrete adapter ownership was removed:
- deleted `apps/server/src/host-adapters/hq-ops/config-store.ts`
- deleted `apps/server/src/host-adapters/hq-ops/repo-state-store.ts`

### 3. Real hosts were rebound

Server:
- `apps/server/src/host-satisfiers.ts` now uses `@rawr/hq-ops-host`
- server keeps local repo-root keyed client caching

CLI host:
- `apps/cli/src/lib/hq-ops-client.ts` was recreated as the real host wrapper
- it now builds the service client through `createNodeHqOpsBoundary(...)`

Plugin host:
- `plugins/cli/plugins/src/lib/hq-ops-client.ts` now builds through `createNodeHqOpsBoundary(...)`
- new host-local layered config helper:
  - `plugins/cli/plugins/src/lib/layered-config.ts`

### 4. `agent-sync` host behavior was removed without promoting it

`packages/agent-sync` no longer:
- imports `@rawr/hq-ops`
- constructs `@rawr/hq-ops` clients
- loads layered config internally

Removed:
- `packages/agent-sync/src/lib/layered-config.ts`
- `packages/agent-sync/src/lib/sync-cli.ts`
- `loadLayeredRawrConfigForCwd` export
- `runSyncFromCli` export
- runtime dependency on `@rawr/hq-ops`

Added:
- `packages/agent-sync/src/lib/sync-config.ts`
  - exports `deriveSyncPolicy(...)`

`resolveTargets(...)` now accepts a narrow sync-config shape rather than the old HQ Ops layered-config-derived type.

Interpretation:
- `agent-sync` is still package-scoped in this slice
- but it is explicitly treated as a deferred service candidate, not as a forever-settled package

### 5. Ratchets were tightened

Added:
- `scripts/phase-03/verify-hq-ops-host-placement.mjs`

Updated:
- `scripts/phase-1/verify-hq-ops-service-shape.mjs`
- `scripts/phase-03/run-structural-suite.mjs`
- `scripts/phase-c/verify-storage-lock-contract.mjs`
- `scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`
- `eslint.config.mjs`

What is now enforced:
- `packages/agent-sync` may not import `@rawr/hq-ops`
- `services/hq-ops` may not own `src/bin/*`
- concrete `hq-ops` runtime helpers may not reappear under `services/hq-ops/src/service/**`
- direct `createClient` composition from `@rawr/hq-ops` is only allowed in the sanctioned host roots and tests
- `@rawr/hq-ops` structural suite now includes the host-placement verifier
- `@rawr/hq-ops-host` has its own structural suite entry

### 6. Docs updated

Only non-canonical docs were adjusted for the slice:
- `docs/migration/phase-2-entry-conditions.md`
- `docs/projects/rawr-final-architecture-migration/.context/P2-execution/context.md`

These now record:
- `agent-sync` remains package-scoped in this slice
- that classification is still a deferred service-promotion candidate
- this slice removes illegal host behavior without taking on full service promotion

## Verification that passed

### Static / build / targeted tests

Passed:
- `bun install`
- `bunx nx run @rawr/hq-ops-host:typecheck --skip-nx-cache`
- `bunx nx run @rawr/server:typecheck --skip-nx-cache`
- `bunx nx run @rawr/cli:typecheck --skip-nx-cache`
- `bunx nx run @rawr/plugin-plugins:typecheck --skip-nx-cache`
- `bunx nx run @rawr/hq-ops:typecheck --skip-nx-cache`
- `bunx nx run @rawr/agent-sync:typecheck --skip-nx-cache`
- `bunx nx run @rawr/hq-ops-host:build --skip-nx-cache`
- `bunx nx run @rawr/server:build --skip-nx-cache`
- `bunx nx run @rawr/cli:build --skip-nx-cache`
- `bunx nx run @rawr/plugin-plugins:build --skip-nx-cache`
- `bunx nx run @rawr/hq-ops:build --skip-nx-cache`
- `bunx nx run @rawr/agent-sync:build --skip-nx-cache`
- `bunx nx run @rawr/hq-ops-host:test --skip-nx-cache`
- `bunx nx run @rawr/agent-sync:test --skip-nx-cache`
- `bunx nx run @rawr/cli:test --skip-nx-cache`
- `bunx nx run @rawr/plugin-plugins:test --skip-nx-cache`
- `bunx nx run @rawr/hq-ops:test --skip-nx-cache`
- `bunx vitest run --project server apps/server/test/repo-state-store.concurrent.test.ts`
- `bunx nx run plugin-server-api-state:typecheck --skip-nx-cache`

### Structural / proof gates

Passed:
- `bun run sync:check --project @rawr/hq-ops`
- `bun run lint:boundaries`
- `bun scripts/phase-03/verify-hq-ops-host-placement.mjs`
- `bun scripts/phase-03/verify-hq-ops-service-boundary-purity.mjs`
- `bun scripts/phase-03/verify-plugin-server-api-state-structural.mjs`
- `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`
- `bun scripts/phase-c/verify-storage-lock-contract.mjs`
- `bun run phase-c:gate:c1-storage-lock-runtime`
- `bun scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`
- `bun run phase-f:gate:f1-runtime-lifecycle-runtime`
- `bunx nx run @rawr/hq-ops:structural --skip-nx-cache`
- `bun run build:affected`

### Command-surface proof

Using an isolated temp `HOME` / `CODEX_HOME`, these succeeded:
- `rawr config show --json`
- `rawr config validate --json`
- `rawr journal tail --json`
- `rawr journal search --query test --json`
- `rawr security report --json`
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync sources list --json`
- `rawr plugins sync sources add <temp-path> --json`
- `rawr plugins sync sources remove <temp-path> --json`
- `rawr plugins web status --json`

Important nuance:
- `rawr security check --json` returned a real non-zero failure because the repo currently has real vulnerability findings
- that is expected behavior, not a regression in the host rebind
- `rawr plugins status --json` also returned a real non-zero drift status in the isolated temp home, which is expected behavior for a clean unlinked temp environment

### Managed runtime / observability proof

Passed:
- `bun run rawr -- hq up --observability required --open none`
- `bun run rawr -- hq status --json`
  - reached `summary: "running"`
  - server/web/async all healthy
  - observability support state was `running`
- `curl http://localhost:3000/health`
  - returned `{"ok":true}`
- proof request:
  - `POST /rpc/exampleTodo/tasks/create`
  - returned `200`
- proof request:
  - `POST /api/orpc/exampleTodo/tasks/create`
  - returned `200`
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
- `bun run rawr -- hq down`
- final `bun run rawr -- hq status --json`
  - returned `summary: "stopped"`

## Remaining note

The known unrelated startup noise still appears:
- `Error: command hq:status not found`

Important clarification:
- the stack trace points at the separate checkout:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`
- not this repo
- despite that, this workspace still reached healthy `running` state and completed the full runtime proof loop

So this is still a real issue, but it is external to this repo’s successful `hq-ops` host-runtime re-grounding pass.

## Latest commit

This pass was committed on the current Graphite branch as:
- `fe8637c1`
- `refactor(hq-ops): move host runtime bindings into shared package`

Branch state at handoff time:
- branch is ahead of origin by 8 commits
- worktree was clean after the handoff-note commit

Pre-existing intentionally untracked files should remain untracked:
- `.claude/`
- `docs/projects/rawr-final-architecture-migration/briefs/`
- `the-reactive-codebase.html`
- `the-reactive-codebase.md`

## Next migration: `agent-config-sync`

The next planned migration is to promote `packages/agent-sync` into:

- `services/agent-config-sync`
- `packages/agent-config-sync-host`

Frozen architectural decisions for this cut:

- canonical service name: `services/agent-config-sync`
- canonical host runtime package: `packages/agent-config-sync-host`
- `services/hq-ops` remains the authority for sync-source config and layered config reads
- all current `agent-sync` capabilities move in this migration
- only semantic truth moves into the service core
- concrete filesystem / process / destination runtime stays in the host package
- final state removes `packages/agent-sync`

Implementation posture:

- implement as a small Graphite stack layered on top of `docs/reground-p2-for-effect-runtime-substrate`
- first land scratch/docs + boundary freeze
- then scaffold service + host package
- then migrate read/status paths
- then migrate apply/retirement/undo
- then remove the old package and canonize docs

### Current `packages/agent-sync` classification matrix

| File | Classification | Target |
| --- | --- | --- |
| `claude-cli.ts` | host runtime | `packages/agent-config-sync-host` |
| `cowork-package.ts` | host runtime | `packages/agent-config-sync-host` |
| `effective-content.ts` | service truth | `services/agent-config-sync` |
| `fs-utils.ts` | host runtime helper | `packages/agent-config-sync-host` |
| `marketplace-claude.ts` | split: manifest semantics + Claude IO | service models + host runtime |
| `plugin-content.ts` | host source discovery/layout | `packages/agent-config-sync-host` |
| `plugin-yaml.ts` | host source parsing | `packages/agent-config-sync-host` |
| `registry-codex.ts` | split: claim/registry semantics + Codex IO | service models + host runtime |
| `resolve-source-plugin.ts` | host source discovery | `packages/agent-config-sync-host` |
| `retire-stale-managed.ts` | service truth | `services/agent-config-sync` |
| `scan-canonical-content.ts` | host source scanning | `packages/agent-config-sync-host` |
| `scan-source-plugin.ts` | host source scanning | `packages/agent-config-sync-host` |
| `scan-tools-composed.ts` | host source scanning | `packages/agent-config-sync-host` |
| `source-scope.ts` | service truth | `services/agent-config-sync` |
| `sync-all.ts` | split: plan semantics + source discovery | service + host runtime |
| `sync-config.ts` | host/plugin config shaping | plugin host layer |
| `sync-engine.ts` | service truth with host-backed IO ports | `services/agent-config-sync` |
| `sync-undo.ts` | service truth with host-backed persistence ports | `services/agent-config-sync` |
| `targets.ts` | host runtime | `packages/agent-config-sync-host` |
| `types.ts` | split: service models vs host helper types | service + host runtime |
| `workspace.ts` | host runtime | `packages/agent-config-sync-host` |

### Required internal service shape

`services/agent-config-sync` must follow the `services/example-todo` internal topology, not a looser service-shaped approximation:

- `src/index.ts`
- `src/client.ts`
- `src/router.ts`
- `src/service/base.ts`
- `src/service/contract.ts`
- `src/service/impl.ts`
- `src/service/router.ts`
- `src/service/modules/<module>/{contract,module,router,schemas,repository}.ts`
- `src/service/shared/*`

Recommended initial module decomposition:

- `planning`
- `execution`
- `retirement`
- `undo`

The final implementation pass must include a dedicated service-shape review against:

- `services/example-todo/src/service/**`
- `docs/projects/orpc-ingest-domain-packages/guidance.md`
- `docs/projects/orpc-ingest-domain-packages/DECISIONS.md`

## Current state after the `agent-config-sync` migration

The migration is now implemented.

- `services/agent-config-sync` is the canonical sync service package.
- `packages/agent-config-sync-host` is the host-runtime adapter package for the sync domain.
- `packages/agent-sync` has been removed.
- `plugins/cli/plugins` now consumes the new service/host seam through:
  - `plugins/cli/plugins/src/lib/agent-config-sync.ts`
- `apps/cli/package.json` no longer carries the stale `@rawr/agent-sync` dependency.

Implemented service shape:

- thin package boundary:
  - `src/index.ts`
  - `src/client.ts`
  - `src/router.ts`
- explicit service choke points:
  - `src/service/base.ts`
  - `src/service/contract.ts`
  - `src/service/impl.ts`
  - `src/service/router.ts`
- modules:
  - `planning`
  - `execution`
  - `retirement`
  - `undo`
- shared ports:
  - `planning-runtime`
  - `execution-runtime`
  - `retirement-runtime`
  - `undo-runtime`

Key verification that passed for the migration:

- `bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-host,@rawr/plugin-plugins,@rawr/cli --skip-nx-cache`
- `bunx nx run-many -t build --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-host,@rawr/plugin-plugins,@rawr/cli --skip-nx-cache`
- `bunx nx run @rawr/agent-config-sync:test --skip-nx-cache`
- `bunx nx run @rawr/agent-config-sync-host:test --skip-nx-cache`
- `bunx nx run @rawr/plugin-plugins:test --skip-nx-cache`
- `bun run lint:boundaries`
- `bun run sync:check --project @rawr/agent-config-sync`
- `bunx nx run @rawr/agent-config-sync:structural --skip-nx-cache`
- `bun run build:affected`

Command-surface smoke:

- `rawr plugins status --json` still returns the expected non-zero drift status in a clean temp home
- `rawr plugins sync all --dry-run --json` passes through the new service/host seam
- `rawr plugins sync sources list --json` remains green through `hq-ops`

Managed runtime / observability smoke:

- `rawr hq up --observability required --open none` succeeded after restarting the external HyperDX container
- the known external `hq:status` noise from the separate `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq` checkout still appeared during startup
- `curl http://localhost:3000/health` returned `{"ok":true}` while the runtime was up
- `rawr hq down` returned the workspace to `summary: "stopped"`

## Continuation snippet

```text
Continue from this compacted state:

Repo: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
Branch: docs/reground-p2-for-effect-runtime-substrate
Graphite repo, trunk = main.

What is complete:
- `hq-ops` is now re-grounded across the real host surface for this slice.
- `services/hq-ops` kept service-local ports/contracts/models only.
- concrete host-owned runtime moved into `packages/hq-ops-host`
- `apps/server`, `apps/cli`, and `plugins/cli/plugins` now use that package
- `services/hq-ops/src/bin/security-check.ts` is gone
- `packages/agent-sync` no longer composes `@rawr/hq-ops` or loads layered config internally
- plugin host owns layered config loading now via:
  - `plugins/cli/plugins/src/lib/layered-config.ts`

Key new package:
- `packages/hq-ops-host`
  - `src/boundary.ts`
  - `src/config-store.ts`
  - `src/repo-state-store.ts`
  - `src/journal/*`
  - `src/security/*`
  - `test/boundary.test.ts`

Important enforcement now in place:
- `scripts/phase-03/verify-hq-ops-host-placement.mjs`
- updated `scripts/phase-1/verify-hq-ops-service-shape.mjs`
- updated `scripts/phase-03/run-structural-suite.mjs`
- updated `scripts/phase-c/verify-storage-lock-contract.mjs`
- updated `scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`
- updated `eslint.config.mjs`

Verification already passed:
- typecheck/build/test on:
  - `@rawr/hq-ops-host`
  - `@rawr/server`
  - `@rawr/cli`
  - `@rawr/plugin-plugins`
  - `@rawr/hq-ops`
  - `@rawr/agent-sync`
- `plugin-server-api-state:typecheck`
- `sync:check --project @rawr/hq-ops`
- `lint:boundaries`
- `verify-hq-ops-host-placement`
- `verify-hq-ops-service-boundary-purity`
- `verify-plugin-server-api-state-structural`
- `verify-hq-ops-service-shape`
- `phase-c` storage lock contract + runtime gate
- `phase-f` runtime lifecycle contract + runtime gate
- `@rawr/hq-ops:structural`
- `build:affected`

Command-surface proof already passed:
- `rawr config show --json`
- `rawr config validate --json`
- `rawr journal tail --json`
- `rawr journal search --query test --json`
- `rawr security report --json`
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync sources list/add/remove --json`
- `rawr plugins web status --json`

Nuance:
- `rawr security check --json` correctly returned non-zero because the repo currently has real vulnerabilities
- `rawr plugins status --json` returned non-zero in the isolated temp home because it correctly detected drift in that fresh environment

Managed runtime / observability proof already passed:
- `rawr hq up --observability required --open none`
- `rawr hq status --json` reached `summary=running`
- `curl /health` returned `{\"ok\":true}`
- `/rpc/exampleTodo/tasks/create` returned 200
- `/api/orpc/exampleTodo/tasks/create` returned 200
- `.rawr/hq/runtime.log` contains correlated `hq-ops`, `todo`, and `orpc` events
- HyperDX ClickHouse showed matching traces and `rawr.orpc` metrics
- `rawr hq down`
- final `rawr hq status --json` returned `summary=stopped`

Known residual note:
- startup still emitted `Error: command hq:status not found`
- stack trace points at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`, not this repo
- local proof here still completed successfully

Latest commit on this branch:
- `fe8637c1` `refactor(hq-ops): move host runtime bindings into shared package`

Next task is related but new; use this state as the baseline and do not reopen the just-closed `hq-ops` host-runtime ownership split unless the new task directly requires it.
```
