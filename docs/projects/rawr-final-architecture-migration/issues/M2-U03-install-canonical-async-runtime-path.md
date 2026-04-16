---
id: M2-U03
title: "[M2] Install the canonical async runtime path"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U02]
blocked: [M2-U04]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make `apps/hq/async.ts` a real canonical runtime path by creating `packages/runtime/harnesses/inngest/` as the async harness adapter, adding an AsyncActivation runtime service to the substrate, and wiring async.ts through the canonical bootgraph/compiler/substrate path instead of the reserved shell entrypoint.

## Purpose
M2-U00 through M2-U02 established the canonical server runtime path, hardened the bootgraph, and generalized the compiler and process-runtime. This slice completes the Phase 2 runtime shell by proving the same canonical path works for the async role, via an Inngest-backed harness adapter that consumes compiled async plans.

## Scope

### In scope
- Create `packages/runtime/harnesses/inngest/` -- async harness adapter:
  - Thin adapter that mounts compiled async.workflows and async.schedules surfaces onto the Inngest client
  - Receives the booted ManagedRuntime from bootgraph (same pattern as Elysia harness)
  - Translates compiled plan workflow/schedule entries into Inngest function registrations
- Add AsyncActivation runtime service to `packages/runtime/substrate/`:
  - Manages the async activation lifecycle (Inngest client initialization, event source binding)
  - Provides activation context to async workflows and schedules
  - Lives alongside other substrate services (RuntimeConfig, ProcessIdentity, etc.)
- Rewire `apps/hq/async.ts` through the canonical runtime path:
  - Boot through `defineApp()` + `startAppRole()` (same public API as server)
  - Compiler produces async.workflows and async.schedules plans
  - Inngest harness mounts surfaces from the compiled plan
- Prove workflows and schedules register from the compiled async plan instead of ad hoc host glue
- No live async path depends on the legacy host-composition chain

### Out of scope
- Optional non-active runtime families
- Replacing transitional plugin builders (M2-U04)
- Server harness changes (already stable from M2-U00)
- Substrate service additions beyond AsyncActivation

## Deliverables
- `packages/runtime/harnesses/inngest/` with:
  - Inngest harness adapter that mounts async surfaces from compiled plans
  - Workflow registration from compiled async.workflows plan
  - Schedule registration from compiled async.schedules plan
  - Integration with ManagedRuntime for service resolution
- `packages/runtime/substrate/src/services/async-activation.ts` -- AsyncActivation service:
  - Inngest client lifecycle management
  - Event source binding
  - Activation context for async handlers
- `apps/hq/async.ts` rewired through canonical app/runtime APIs
- Proof that no live async path depends on legacy host-composition

## Acceptance Criteria
- [ ] `packages/runtime/harnesses/inngest/` exists with a thin async harness adapter.
- [ ] AsyncActivation service exists in `packages/runtime/substrate/src/services/`.
- [ ] `apps/hq/async.ts` boots through canonical `defineApp()` + `startAppRole()` APIs.
- [ ] Inngest workflow registration derives from the compiled async.workflows plan (not ad hoc host glue).
- [ ] Inngest schedule registration derives from the compiled async.schedules plan.
- [ ] Async workflows and schedules are mounted through the canonical harness, not direct host wiring.
- [ ] No live async path depends on the legacy host-composition chain.
- [ ] The Inngest harness receives and uses the same root ManagedRuntime pattern as the Elysia harness.
- [ ] AsyncActivation service is hidden from public authoring APIs (Effect internal only).

## Testing / Verification
- `bun --cwd packages/runtime/harnesses/inngest run typecheck`
- `bun --cwd packages/runtime/harnesses/inngest run test`
- `bun --cwd packages/runtime/substrate run typecheck`
- `bun --cwd packages/runtime/substrate run test`
- `bun --cwd apps/hq run typecheck`
- `bun scripts/phase-2/verify-async-role-runtime-path.mjs`
- `bun scripts/phase-2/verify-effect-not-in-public-api.mjs`
- Unit tests covering:
  - Inngest harness mounts workflows from compiled plan
  - Inngest harness mounts schedules from compiled plan
  - AsyncActivation service initializes and provides activation context
  - Async role boots through canonical path end-to-end
- Async registration smoke validation through `apps/hq/async.ts`

## Dependencies / Notes
- Blocked by: [M2-U02](./M2-U02-generalize-runtime-compiler-and-process-runtime.md).
- Blocks: [M2-U04](./M2-U04-replace-transitional-plugin-builders-with-canonical-builders.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).
- The Inngest harness follows the same structural pattern as the Elysia harness: receive ManagedRuntime, consume compiled plan, mount surfaces. This proves the harness adapter pattern is generalizable.
- AsyncActivation is a substrate service because it manages infrastructure lifecycle (Inngest client), not application logic.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- async role runtime path through canonical bootgraph/compiler/substrate
- Inngest harness adapter under `packages/runtime/harnesses/inngest/`
- AsyncActivation substrate service
- compiled-plan async registration

Out of scope:
- optional non-active runtime families
- server harness modifications
- transitional plugin builder replacement

### Package Layout
```
packages/runtime/
  harnesses/
    elysia/          - (stable from M2-U00)
    inngest/
      src/
        adapter.ts   - Inngest harness adapter
        workflows.ts - Workflow registration from compiled plan
        schedules.ts - Schedule registration from compiled plan
      index.ts
  substrate/
    src/
      services/
        async-activation.ts  - NEW: Inngest client lifecycle + activation context
        ...                  - (existing services from M2-U00)
```

### Files
- `packages/runtime/harnesses/inngest/**`
- `packages/runtime/substrate/src/services/async-activation.ts`
- `apps/hq/async.ts`
