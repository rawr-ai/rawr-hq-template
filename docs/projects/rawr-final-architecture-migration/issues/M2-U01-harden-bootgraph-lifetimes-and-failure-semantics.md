---
id: M2-U01
title: "[M2] Harden bootgraph lifetimes and failure semantics"
state: planned
priority: 1
estimate: 5
project: rawr-final-architecture-migration
milestone: M2
assignees: [codex]
labels: [migration, phase-2]
parent: null
children: []
blocked_by: [M2-U00]
blocked: [M2-U02]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Turn the first server-runtime cut into a real bootgraph with deterministic dependency ordering, identity dedupe, rollback via Effect scope finalization, reverse shutdown, and tagged runtime errors. Bootgraph produces one root ManagedRuntime that owns the full process lifetime.

## Purpose
M2-U00 stands up the minimum bootgraph to delete the legacy bridge. This slice hardens that bootgraph into a production-grade lifecycle manager by leveraging Effect's scope and finalization model for rollback and shutdown, and by introducing tagged error types for clear failure diagnostics.

## Scope

### In scope
- Harden `packages/runtime/bootgraph/` with full lifecycle guarantees:
  - Dependency ordering: topological sort of module declarations, deterministic startup sequence
  - Identity dedupe: enforce unique module identity, reject duplicates with `BootModuleConflictError`
  - Rollback on failure: when a module fails to start, all previously-started modules are torn down via Effect scope finalization (Scope.close)
  - Reverse shutdown: graceful process shutdown tears down modules in reverse startup order
  - Tagged runtime errors: `BootModuleStartError`, `BootModuleConflictError`, `BootGraphCycleError`, `BootShutdownError`
- Effect lowering model:
  - `lowerModule()` produces an Effect Layer per module declaration
  - Layers are composed in dependency order into a single root Layer
  - Bootgraph startup produces one root `ManagedRuntime` that owns the full process lifetime
  - Shutdown disposes the ManagedRuntime, which triggers Effect scope finalization in reverse order
- Keep bootgraph process-local and role-aware without turning it into a second semantic plane
- All Effect machinery remains hidden behind the RAWR-shaped public API surface

### Out of scope
- Widening runtime scope beyond the active lane
- Authoring-surface cleanup outside what bootgraph requires
- Compiler generalization (M2-U02)
- Async runtime path (M2-U03)

## Deliverables
- `packages/runtime/bootgraph/` hardened with:
  - Deterministic topological startup ordering
  - Module identity dedupe with conflict rejection
  - Rollback-on-failure via Effect scope finalization
  - Reverse shutdown ordering
  - Tagged error types: `BootModuleStartError`, `BootModuleConflictError`, `BootGraphCycleError`, `BootShutdownError`
- One root `ManagedRuntime` produced per bootgraph startup
- Test suite proving all lifecycle guarantees

## Acceptance Criteria
- [ ] Bootgraph startup ordering is deterministic and follows declared dependency edges (topological sort).
- [ ] Duplicate module identity registration raises `BootModuleConflictError`.
- [ ] Cycle in module dependency graph raises `BootGraphCycleError`.
- [ ] Failure during module startup triggers rollback: all previously-started modules are finalized via Effect scope.
- [ ] Shutdown tears down modules in reverse startup order.
- [ ] Shutdown failure is surfaced as `BootShutdownError`.
- [ ] Startup failure is surfaced as `BootModuleStartError` with the originating module identity.
- [ ] Bootgraph produces exactly one root `ManagedRuntime` per process.
- [ ] Process and role lifetime behavior is explicit and tested.
- [ ] No Effect types leak into the public bootgraph API surface.

## Testing / Verification
- Land and wire the slice-local verifiers:
  - `scripts/phase-2/verify-bootgraph-public-api.mjs`
  - update `scripts/phase-2/verify-effect-not-in-public-api.mjs` if the public-surface audit expanded in this slice
  - package-script / structural-suite wiring so bootgraph contract checks stay in the ratchet path
- Run affected checks:
  - `bun --cwd packages/runtime/bootgraph run typecheck`
  - `bun --cwd packages/runtime/bootgraph run test`
  - `bun --cwd packages/runtime/substrate run typecheck`
  - affected structural suites for `packages/runtime/bootgraph` and `packages/runtime/substrate`
- Unit tests covering:
  - Happy path: modules start in dependency order, shutdown in reverse
  - Conflict: duplicate module identity raises `BootModuleConflictError`
  - Cycle: circular dependency raises `BootGraphCycleError`
  - Rollback: mid-startup failure finalizes already-started modules
  - Shutdown error: failure during teardown surfaces `BootShutdownError`
- Capture evidence that lifecycle guarantees are enforced by the real bootgraph path, not by ad hoc test scaffolding.

## Dependencies / Notes
- Blocked by: [M2-U00](./M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md).
- Blocks: [M2-U02](./M2-U02-generalize-runtime-compiler-and-process-runtime.md).
- Milestone: [M2: Install the Minimal Canonical Runtime Shell](../milestones/M2-minimal-canonical-runtime-shell.md).
- The Effect lowering model established here (lowerModule -> Layer -> composed root Layer -> ManagedRuntime) is the foundational pattern that compiler and process-runtime build on in M2-U02.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Scope Boundaries
In scope:
- bootgraph lifecycle guarantees (ordering, dedupe, rollback, shutdown)
- Effect lowering model (lowerModule -> Layer -> ManagedRuntime)
- tagged runtime error types
- typed boot context assembly

Out of scope:
- widening runtime scope beyond the active lane
- authoring-surface cleanup outside what bootgraph requires
- compiler or process-runtime generalization

### Effect Lowering Model
```
RAWR module declarations
  -> lowerModule() per declaration
  -> Effect Layer per module
  -> topological composition into root Layer
  -> ManagedRuntime.make(rootLayer)
  -> one root ManagedRuntime owns process lifetime
  -> shutdown = ManagedRuntime.dispose() = reverse finalization
```

### Error Taxonomy
| Error Tag | When |
|---|---|
| `BootModuleConflictError` | Duplicate module identity during registration |
| `BootGraphCycleError` | Cycle detected in module dependency graph |
| `BootModuleStartError` | A module's Layer acquisition fails |
| `BootShutdownError` | Failure during scope finalization on teardown |

### Files
- `packages/runtime/bootgraph/src/**`
- `packages/runtime/substrate/src/**` (scope finalization integration)
