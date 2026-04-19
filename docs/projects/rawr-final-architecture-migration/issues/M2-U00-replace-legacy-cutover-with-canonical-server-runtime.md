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
- Delete `apps/hq/legacy-cutover.ts` by cutting the first minimal canonical server runtime path through app/runtime APIs instead of the quarantined host-composition chain.

## Deliverables
- Introduce the minimum public app/runtime API needed for the server role:
  - `defineApp(...)`
  - `startAppRole(...)`
- Introduce the minimum hidden runtime substrate needed to boot `server.api`.
- Rewire `apps/hq/server.ts` to the canonical runtime path.
- Delete `apps/hq/legacy-cutover.ts`.
- Prove there is no longer a live executable bridge across the Phase 1 to Phase 2 boundary.

## Acceptance Criteria
- [ ] `apps/hq/server.ts` no longer depends on `apps/hq/legacy-cutover.ts`.
- [ ] `apps/hq/legacy-cutover.ts` is deleted.
- [ ] The server role boots through canonical app/runtime APIs.
- [ ] The minimal server runtime path compiles only the active `server.api` lane.
- [ ] Legacy host-composition files are no longer live runtime authority for the server boot path.

## Testing / Verification
- `bun run sync:check`
- `bun run lint:boundaries`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/hq run test`
- `bun --cwd apps/server run test`
- `bun scripts/phase-2/verify-no-legacy-cutover.mjs`
- `bun scripts/phase-2/verify-server-role-runtime-path.mjs`
- direct server smoke validation through `apps/hq/server.ts`

## Dependencies / Notes
- Blocked by: none.
- Blocks: [M2-U01](./M2-U01-harden-bootgraph-lifetimes-and-failure-semantics.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).
- Pull forward only the minimum substrate needed to delete the bridge. Do not use this slice as an excuse to build the whole platform at once.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
Phase 2 cannot credibly start while the one sanctioned executable bridge remains live. The first cut must therefore replace the bridge instead of treating it as harmless scaffolding.

### Scope Boundaries
In scope:
- the minimum public app/runtime API needed for `server`
- the minimum hidden boot/runtime substrate needed for `server.api`
- deleting `apps/hq/legacy-cutover.ts`

Out of scope:
- full async runtime support
- generalizing every runtime primitive before the first server cut lands
- replacing transitional plugin builders

### Files
- `apps/hq/server.ts`
- `apps/hq/rawr.hq.ts`
- `apps/server/src/rawr.ts`
- `apps/server/src/host-composition.ts`
- `packages/bootgraph/**`
- `packages/runtime-compiler/**`
- `packages/runtime-harnesses/elysia/**`

### Paper Trail
- [RAWR_Architecture_Migration_Plan.md](../resources/RAWR_Architecture_Migration_Plan.md)
- [phase-2-entry-conditions.md](../../migration/phase-2-entry-conditions.md)

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
- `packages/bootgraph/src/index.ts` is only a reservation constant today
- there is no `packages/runtime-compiler` yet
- `packages/runtime-context/src/index.ts` is still a type-only support seam, not a canonical app/runtime boot path

#### 4) Practical implication for implementation
`M2-U00` cannot succeed by editing only `apps/hq/server.ts`. The minimum real cut likely needs coordinated changes across:
- `apps/hq/server.ts`
- `apps/hq/src/index.ts`
- `apps/hq/package.json`
- `apps/server/src/rawr.ts`
- `apps/server/src/bootstrap.ts`
- `packages/bootgraph/**`
- a new `packages/runtime-compiler/**`
- the thin Elysia runtime harness seam
