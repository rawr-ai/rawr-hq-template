---
id: M2-U02
title: "[M2] Generalize the runtime compiler and process runtime"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U01]
blocked: [M2-U03]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Create `packages/runtime/compiler/` as the manifest-to-compiled-plan transformation. Build process-runtime inside `packages/runtime/substrate/src/process-runtime/` as the live execution engine. Introduce ProcessView, RoleView, SurfaceAssembler, and started-process handle with `stop()`. Add TopologyRegistry if earned.

## Purpose
M2-U00 and M2-U01 established the bootgraph and minimum substrate. This slice generalizes the compiler from a single-lane server artifact into a reusable plan generator for all active lanes (server.api, async.workflows, async.schedules), and builds the process-runtime as a first-class substrate component that manages live process handles.

## Scope

### In scope
- Create `packages/runtime/compiler/` as a peer package under `packages/runtime/`:
  - Manifest-to-compiled-plan transformation
  - Plan generation for active lanes: `server.api`, `async.workflows`, `async.schedules`
  - Compiler takes canonical RAWR declarations and produces a typed plan object
  - Compiler is HIDDEN from public authoring APIs
- Build process-runtime INSIDE `packages/runtime/substrate/src/process-runtime/`:
  - ProcessView: read-only view of the current process's compiled plan and identity
  - RoleView: read-only view of the active role's lane configuration
  - SurfaceAssembler: assembles runtime surfaces (routes, handlers, schedules) from the compiled plan
  - Started-process handle with explicit `stop()` method that triggers graceful shutdown
  - Process-runtime is an internal substrate component, not a separate package
- TopologyRegistry: if the compiler needs a registry to track which lanes exist and their relationships, introduce it here. Only if earned by real need -- do not speculatively build.
- Resource lowering from canonical declarations must be tested end-to-end
- This is the first slice that may generalize process/resource declaration shapes beyond the minimum M2-U00 server path, because those shapes are consumed here by compiler and process-runtime work rather than existing as standalone inventory.

### Out of scope
- Optional role families and rich topology catalog work beyond what active lanes require
- Async harness wiring (M2-U03)
- Full observability instrumentation beyond what RuntimeTelemetry already provides
- Public API changes to bootgraph or authoring surface

## Deliverables
- `packages/runtime/compiler/` with:
  - Typed plan generation for `server.api`, `async.workflows`, `async.schedules`
  - Manifest ingestion from canonical RAWR declarations
  - Clean separation: compiler reads declarations, produces plans, does not execute
- `packages/runtime/substrate/src/process-runtime/` with:
  - ProcessView service
  - RoleView service
  - SurfaceAssembler
  - Started-process handle exposing `stop()` -> graceful shutdown
- TopologyRegistry (conditional -- only if compiler plan generation requires it)
- Both seams remain hidden and subordinate to app/service/plugin semantics

## Acceptance Criteria
- [ ] `packages/runtime/compiler/` exists as a peer package under `packages/runtime/`.
- [ ] Compiler generates typed plans for `server.api`, `async.workflows`, and `async.schedules` lanes.
- [ ] Compiler is hidden: no compiler types appear in public authoring APIs.
- [ ] `packages/runtime/substrate/src/process-runtime/` exists with ProcessView, RoleView, SurfaceAssembler.
- [ ] Started-process handle exposes stable `stop()` method that triggers graceful shutdown through the ManagedRuntime.
- [ ] Resource lowering from canonical declarations to compiled plan is tested.
- [ ] No hidden fallback to host-composition remains in the compiler/runtime path.
- [ ] SurfaceAssembler correctly assembles routes/handlers/schedules from compiled plans.
- [ ] TopologyRegistry is present only if earned by real compiler needs (not speculative).
- [ ] Broader process/resource declaration generalization is consumed by compiler/process-runtime tests and does not create a standalone pre-Effect descriptor layer or public compiler API.

## Testing / Verification
- Land and wire the slice-local verifiers:
  - `scripts/phase-2/verify-runtime-plan-compilation.mjs`
  - `scripts/phase-2/verify-process-runtime-stop.mjs`
  - package-script / structural-suite wiring for compiler and process-runtime ratchets
- Run affected checks:
  - `bun --cwd packages/runtime/compiler run typecheck`
  - `bun --cwd packages/runtime/compiler run test`
  - `bun --cwd packages/runtime/substrate run typecheck`
  - `bun --cwd packages/runtime/substrate run test`
  - affected structural suites for `packages/runtime/compiler` and `packages/runtime/substrate`
- Unit tests covering:
  - Plan generation for each active lane (server.api, async.workflows, async.schedules)
  - ProcessView and RoleView read correctness
  - SurfaceAssembler output for server routes, async handlers, schedules
  - stop() triggers graceful teardown through ManagedRuntime disposal
  - Compiler rejects invalid/incomplete declarations with clear errors
- Capture evidence that the broader multi-lane plan path now lives in compiler/process-runtime instead of silently remaining server-only.

## Dependencies / Notes
- Blocked by: [M2-U01](./M2-U01-harden-bootgraph-lifetimes-and-failure-semantics.md).
- Blocks: [M2-U03](./M2-U03-install-canonical-async-runtime-path.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).
- Process-runtime lives inside substrate (not as a separate package) because it is an internal execution concern, not a public API surface.
- The compiler is a peer package because it has a distinct responsibility (static plan generation) separate from the runtime kernel (dynamic execution).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- plan generation for all active runtime lanes
- explicit process runtime lifecycle behavior (ProcessView, RoleView, SurfaceAssembler, stop())
- compiler as a peer package under `packages/runtime/`
- process-runtime as an internal substrate component

Out of scope:
- optional role families and rich topology catalog work
- async harness adapter (M2-U03)
- public API surface changes

### Package Layout
```
packages/runtime/
  compiler/
    src/
      plan.ts              - Typed plan object definitions
      compile.ts           - Manifest -> plan transformation
      lanes/
        server-api.ts      - server.api lane plan generation
        async-workflows.ts - async.workflows lane plan generation
        async-schedules.ts - async.schedules lane plan generation
    index.ts
  substrate/
    src/
      process-runtime/
        process-view.ts     - Read-only process identity + plan view
        role-view.ts        - Read-only active role lane config
        surface-assembler.ts - Assembles surfaces from compiled plan
        started-process.ts  - Handle with stop() for graceful shutdown
        index.ts
```

### Files
- `packages/runtime/compiler/**`
- `packages/runtime/substrate/src/process-runtime/**`
