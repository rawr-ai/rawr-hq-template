---
id: M2-U04
title: "[M2] Replace transitional plugin builders with canonical role and surface builders"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U03]
blocked: [M2-U05]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace transitional public builder grammar with canonical role and surface builders that target the `packages/runtime/` family and the Effect-backed substrate now in place.

## Deliverables
- Install canonical builders in `packages/hq-sdk` such as:
  - `defineServerApiPlugin(...)` -- server role builder
  - `defineAsyncWorkflowPlugin(...)` -- async workflow role builder
  - `defineAsyncSchedulePlugin(...)` -- async schedule role builder
- Wire `bindService(...)` calls through `BoundaryCache` in `packages/runtime/substrate/` so that service resolution flows through the Effect kernel without leaking Effect types into the authoring surface.
- Ensure builder output compiles through `packages/runtime/compiler/` into a process plan consumable by the runtime substrate.
- Ensure harness-specific wiring (Elysia server, Inngest async) routes through `packages/runtime/harnesses/elysia/` and `packages/runtime/harnesses/inngest/` respectively.
- Quarantine or delete transitional builder grammar from the active lane.
- Keep compatibility-only carryover out of the canonical authoring surface.

## Acceptance Criteria
- [ ] Active plugin authoring uses canonical role and surface builders exported from `packages/hq-sdk`.
- [ ] Transitional public builder grammar is no longer live in the active lane.
- [ ] `bindService(...)` resolves through `BoundaryCache` in `packages/runtime/substrate/`.
- [ ] Existing active plugins can compile through `packages/runtime/compiler/` and execute on the canonical runtime shell.
- [ ] No raw Effect types (`Effect`, `Layer`, `ManagedRuntime`, `Effect.Service`) appear in the public builder API signatures exported from `packages/hq-sdk`.

## Testing / Verification
- `bun run sync:check`
- affected plugin typechecks/tests
- `bun scripts/phase-2/verify-canonical-plugin-builders.mjs`
- type-level audit: confirm `packages/hq-sdk` public exports contain zero raw Effect type references

## Dependencies / Notes
- Blocked by: [M2-U03](./M2-U03-install-canonical-async-runtime-path.md).
- Blocks: [M2-U05](./M2-U05-migrate-phase-2-proof-slices.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).
- Package topology:
  - `packages/hq-sdk` -- canonical authoring API home (builders live here)
  - `packages/runtime/bootgraph/` -- PUBLIC RAWR-shaped lifecycle shell
  - `packages/runtime/compiler/` -- HIDDEN manifest to compiled process plan
  - `packages/runtime/substrate/` -- HIDDEN Effect-backed kernel (services, config, schema, errors, observability, process-runtime)
  - `packages/runtime/harnesses/elysia/` -- server harness adapter
  - `packages/runtime/harnesses/inngest/` -- async harness adapter

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- canonical builder surface for active runtime roles in `packages/hq-sdk`
- `bindService(...)` wiring through `BoundaryCache` in `packages/runtime/substrate/`
- builder output compatibility with `packages/runtime/compiler/`
- harness routing through `packages/runtime/harnesses/*`
- Effect type quarantine enforcement at the `packages/hq-sdk` public API boundary

Out of scope:
- marketplace-lane redesign
- optional role families not used in the active lane
- internal substrate refactoring beyond what builders require
- `packages/runtime/substrate/` internal topology decisions (M2-U06 concern)
