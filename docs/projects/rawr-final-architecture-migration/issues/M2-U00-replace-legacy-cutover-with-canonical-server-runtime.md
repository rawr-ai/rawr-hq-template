---
id: M2-U00
title: "[M2] Replace legacy cutover with the canonical server runtime path"
state: planned
priority: 1
estimate: 8
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: []
blocked: [M2-U01]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Delete `apps/hq/legacy-cutover.ts` by cutting the first minimal canonical server runtime path through the new `packages/runtime/` family while keeping `packages/hq-sdk` as the public app-runtime seam. This is the moment Effect enters the repo as a real dependency. Create the minimum viable Effect-backed runtime substrate, the real bootgraph with `lowerModule()` bridge, the minimum server-only app-runtime/compiler cut, and the Elysia server harness.

## Purpose
Phase 2 cannot credibly start while the one sanctioned executable bridge remains live. The first cut must replace the bridge by standing up the canonical `packages/runtime/` package family with enough substrate, bootgraph, and harness surface to boot `server.api` without any legacy host-composition authority.

## Scope

### In scope
- Extend `packages/hq-sdk/` as the PUBLIC app-runtime seam for this slice:
  - `defineApp(...)` public API
  - `startAppRole(...)` public API
  - minimum server-only app-runtime/compiler path needed to lower the active `server.api` lane into the execution family
  - any resource, process, or declaration helper introduced here must be consumed immediately by the minimum server runtime path; do not add descriptor-only inventory ahead of runtime use
  - no broader generalization of authoring grammar beyond what server bridge deletion requires
- Create `packages/runtime/substrate/` -- the minimum viable Effect-backed kernel:
  - RuntimeConfig service (environment, feature flags)
  - ProcessIdentity service (role, lane, instance id)
  - RuntimeTelemetry service (structured logging, spans, metrics sink)
  - DbPool service (connection pool lifecycle)
  - Clock service (wall/monotonic time abstraction)
  - WorkspaceRoot service (resolved repo/workspace path)
  - BoundaryCache service (per-process memoization boundary)
  - Effect is used internally (ManagedRuntime, Layer, Effect.Service, etc.) but is NOT exposed in public authoring APIs
- Create `packages/runtime/bootgraph/` -- real RAWR-shaped lifecycle shell inside the execution family:
  - `lowerModule()` bridge that converts RAWR module declarations into Effect Layers for the substrate
  - Module registration, dependency ordering (topological), identity dedupe
- Create `packages/runtime/harnesses/elysia/` -- server harness adapter:
  - Thin adapter that mounts compiled server.api surfaces onto Elysia
  - Receives the booted ManagedRuntime from bootgraph
- Rewire `apps/hq/server.ts` to the canonical runtime path
- Delete `apps/hq/legacy-cutover.ts`
- Prove there is no longer a live executable bridge across the Phase 1 to Phase 2 boundary

### Out of scope
- Full async runtime support (M2-U03)
- Generalizing every runtime primitive before the first server cut lands
- Generalizing compiler/app-runtime support beyond the minimum `server.api` lane needed to delete the bridge
- Replacing transitional plugin builders
- Full bootgraph lifecycle hardening (rollback, shutdown ordering -- M2-U01)
- Compiler generalization beyond what the first server cut needs (M2-U02)
- Inngest harness (M2-U03)
- Standalone `infra/resources`, `infra/processes`, or `infra/provisioning` descriptor layers that are not consumed by the U00 server runtime path
- Railway or other platform-provisioning descriptors; operational placement remains downstream unless a concrete runtime/deployment proof needs it

## Deliverables
- `packages/runtime/substrate/` with minimum viable Effect services listed above.
- `packages/hq-sdk/` updated with `defineApp()`, `startAppRole()`, and the minimum server-only app-runtime/compiler entry path for this slice.
- `packages/runtime/bootgraph/` with `lowerModule()` bridge and dependency-aware runtime planning for the execution family.
- `packages/runtime/harnesses/elysia/` with thin server adapter.
- `apps/hq/server.ts` rewired to the canonical runtime path.
- `apps/hq/legacy-cutover.ts` deleted.
- Effect added as a real dependency in the runtime workspace.
- Proof that no live executable bridge remains across the Phase 1/Phase 2 boundary.

## Acceptance Criteria
- [ ] `packages/runtime/substrate/` exists with RuntimeConfig, ProcessIdentity, RuntimeTelemetry, DbPool, Clock, WorkspaceRoot, and BoundaryCache as Effect services.
- [ ] Effect is used internally in substrate; no Effect types appear in public bootgraph or authoring APIs.
- [ ] `packages/hq-sdk/` exposes `defineApp()` and `startAppRole()` as the public app-runtime APIs for the active server lane.
- [ ] `packages/runtime/bootgraph/` is an execution-family seam, not the public authoring entrypoint.
- [ ] `lowerModule()` correctly bridges RAWR module declarations into Effect Layer composition.
- [ ] `M2-U00` includes the minimum server-only compiler/app-runtime cut required to boot `server.api` and delete the bridge without pulling broader compiler generalization forward.
- [ ] `packages/runtime/harnesses/elysia/` boots the server.api lane from the compiled plan.
- [ ] `apps/hq/server.ts` no longer depends on `apps/hq/legacy-cutover.ts`.
- [ ] `apps/hq/legacy-cutover.ts` is deleted.
- [ ] The server role boots through canonical app/runtime APIs.
- [ ] The minimal server runtime path compiles only the active `server.api` lane.
- [ ] Legacy host-composition files are no longer live runtime authority for the server boot path.

## Testing / Verification
- Land the first slice-local Phase 2 verifier surface:
  - `scripts/phase-2/verify-no-legacy-cutover.mjs`
  - `scripts/phase-2/verify-server-role-runtime-path.mjs`
  - `scripts/phase-2/verify-runtime-public-seams.mjs`
  - package-script wiring for the U00 gate so later slices can ratchet it instead of re-inventing it
- Add or refresh the affected structural ratchets for the touched runtime projects (`apps/hq`, `apps/server`, `packages/runtime/substrate`, `packages/runtime/bootgraph`, `packages/runtime/harnesses/elysia`).
- Run affected checks:
  - `bun run sync:check`
  - `bun run lint:boundaries` and treat the known pre-slice baseline failures in `apps/server` separately from any new regression introduced by this slice
  - `bun --cwd apps/hq run typecheck`
  - `bun --cwd apps/server run typecheck`
  - `bun --cwd packages/runtime/substrate run typecheck`
  - `bun --cwd packages/runtime/bootgraph run typecheck`
  - `bun --cwd packages/runtime/harnesses/elysia run typecheck`
  - affected tests for `apps/hq`, `apps/server`, `packages/runtime/substrate`, and `packages/runtime/bootgraph`
- Run direct runtime smoke validation through `apps/hq/server.ts`.
- Capture evidence that the slice removed the bridge as authority rather than merely wrapping it.

## Dependencies / Notes
- Blocked by: none.
- Blocks: [M2-U01](./M2-U01-harden-bootgraph-lifetimes-and-failure-semantics.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).
- Pull forward only the minimum substrate needed to delete the bridge. Do not use this slice as an excuse to build the whole platform at once.
- Pull forward only declaration shapes that the first server runtime cut actually lowers or consumes. Broader process/resource declaration generalization belongs in M2-U02 with the compiler/process-runtime work, not in a pre-Effect alignment slice.
- The substrate services created here must be sufficient to satisfy what example-todo and hq-ops require at boot time: DbPool, Clock, Logger (via RuntimeTelemetry), Analytics (via RuntimeTelemetry), workspaceId (via WorkspaceRoot), repoRoot (via WorkspaceRoot), RuntimeConfig, ProcessIdentity, RuntimeTelemetry, BoundaryCache.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
Phase 2 cannot credibly start while the one sanctioned executable bridge remains live. The first cut must therefore replace the bridge instead of treating it as harmless scaffolding. This is also the moment Effect enters the repo as a real dependency -- the substrate is the kernel that all subsequent runtime work builds on.

### Package Topology
```
packages/runtime/
  bootgraph/       - execution-family lifecycle shell consumed by hq-sdk/runtime entry
  compiler/        - reserved for generalization in M2-U02; U00 only lands the minimum server-only cut
  substrate/       - HIDDEN Effect-backed kernel
    src/
      services/
        runtime-config.ts
        process-identity.ts
        runtime-telemetry.ts
        db-pool.ts
        clock.ts
        workspace-root.ts
        boundary-cache.ts
      index.ts
  harnesses/
    elysia/        - Server harness adapter

packages/hq-sdk/
  ...             - PUBLIC authoring/app-runtime seam (`defineApp`, `startAppRole`, `bindService`, etc.)
```

### Scope Boundaries
In scope:
- the minimum public app/runtime API needed for `server`, exposed from `packages/hq-sdk`
- the minimum hidden boot/runtime substrate needed for `server.api`
- the minimum server-only compiler/app-runtime path needed to lower `server.api` into the runtime execution family
- deleting `apps/hq/legacy-cutover.ts`
- Effect as a real dependency in `packages/runtime/substrate`

Out of scope:
- full async runtime support
- generalizing every runtime primitive before the first server cut lands
- replacing transitional plugin builders

### Files
- `apps/hq/server.ts`
- `apps/hq/rawr.hq.ts`
- `apps/server/src/rawr.ts`
- `apps/server/src/host-composition.ts`
- `packages/runtime/bootgraph/**`
- `packages/runtime/substrate/**`
- `packages/runtime/harnesses/elysia/**`

### Paper Trail
- [RAWR_Architecture_Migration_Plan.md](../resources/RAWR_Architecture_Migration_Plan.md)
- [phase-2-entry-conditions.md](../../migration/phase-2-entry-conditions.md)

### Design Precedence
- `packages/runtime/*` is the consolidated execution family for Phase 2.
- `packages/hq-sdk` remains the public app-runtime and authoring seam.

### Prework Results (Live)

#### 1) The bridge is still the entire live app boot path
- `apps/hq/server.ts` imports `bootstrapRawrHqServerViaLegacyCutover` and `startRawrHqServerViaLegacyCutover`
- `apps/hq/async.ts` and `apps/hq/dev.ts` also still import from `./legacy-cutover`
- `apps/hq/src/index.ts` re-exports `../legacy-cutover`
- `apps/hq/package.json` still publishes `./legacy-cutover`

#### 2) Server runtime materialization still depends on the bridge
- `apps/server/src/rawr.ts` imports `createRawrHqLegacyRouteAuthority` from `@rawr/hq-app/legacy-cutover`
- `createHostInngestBundle(...)` and `registerRawrRoutes(...)` still derive runtime surfaces from that legacy authority
- `apps/server/src/bootstrap.ts` still boots directly through host-owned loading and route/plugin mounting

#### 3) Existing runtime packages are not yet the canonical answer
- The old `packages/bootgraph/src/index.ts` is only a reservation constant today (to be replaced by `packages/runtime/bootgraph/`)
- There is no compiler package yet (to be created as `packages/runtime/compiler/` in M2-U02)
- `packages/runtime-context/src/index.ts` is still a type-only support seam, not a canonical app/runtime boot path

#### 4) Practical implication for implementation
`M2-U00` cannot succeed by editing only `apps/hq/server.ts`. The minimum real cut likely needs coordinated changes across:
- `apps/hq/server.ts`
- `apps/hq/src/index.ts`
- `apps/hq/package.json`
- `apps/server/src/rawr.ts`
- `apps/server/src/bootstrap.ts`
- `packages/runtime/bootgraph/**`
- `packages/runtime/substrate/**`
- `packages/runtime/harnesses/elysia/**`
