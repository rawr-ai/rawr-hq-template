# Phase 2 Entry Conditions

Phase 2 begins from a collapsed-authority plateau, not from an in-flight cleanup state. The purpose of this note is to record exactly what must be treated as stable when Phase 2 starts, and what the first deliberate cleanup step is.

## What Phase 1 Leaves Stable

- `services/hq-ops` is the canonical HQ operational authority.
- `apps/hq/rawr.hq.ts` is the canonical HQ manifest authority.
- `apps/hq/server.ts`, `apps/hq/async.ts`, and `apps/hq/dev.ts` are the real app-owned executable entrypoints.
- The only live runtime plugin topology is the canonical role-first topology under `plugins/server/api/*` and `plugins/async/*`.
- `coordination` and `support-example` remain archived and out of the live lane.
- `plugins/agents/hq` remains frozen in place as the only allowed non-executable compatibility carryover for marketplace sync-install continuity.

## Explicit Transitional Carryover

If `apps/hq/legacy-cutover.ts` exists at Phase 1 exit, it is the only allowed executable bridge across the boundary.

Phase 2 Slice 0 must therefore begin with one explicit cleanup item:

- delete `apps/hq/legacy-cutover.ts` by replacing the quarantined host-composition chain with the canonical Phase 2 runtime path

No other hidden cleanup debt is allowed to cross the boundary.

## Phase 2 Starting Constraints

- Do not reopen Phase 1 authority decisions while building Phase 2 substrate.
- Do not reintroduce dual manifests, dual plugin registries, or dual executable composition paths.
- Do not let parked or archived lanes steer the Phase 2 runtime design.
- Treat the frozen marketplace lane as continuity-only, not as a design precedent for the canonical runtime.

## Deferred HQ Ops Watch Item

Phase 2 should also begin with one explicit caution in mind:

- `services/hq-ops` now satisfies the required Phase 1 service boundary, but its internal module structure still diverges from the cleaner `services/example-todo` pattern.
- That internal divergence may become the root cause of confusion or false leads once broader verification, especially runtime verification, starts to expand.
- Before treating HQ Ops verification failures as pure runtime-substrate problems, re-check:
  - `services/hq-ops/src/service/modules/*`
  - `services/example-todo/src/service/modules/*`
  - `docs/projects/rawr-final-architecture-migration/.context/M1-execution/notes/HQ-OPS-service-shape-followup.md`
  - `docs/projects/orpc-ingest-domain-packages/guidance.md`
- No repo-local service-package `decisions.md` was located during the Phase 1 closeout pass; if a later slice depends on one, locate and ground on it explicitly instead of assuming it was already followed.

## Practical Hand-Off

Phase 2 starts from a repo where the canonical shell is already real. The first runtime-substrate work therefore builds on `apps/hq`, `services/hq-ops`, and the canonical plugin topology directly, while removing the one remaining executable bridge as early as possible.
