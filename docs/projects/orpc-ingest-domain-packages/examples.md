# ORPC Domain Package Examples

## Purpose

This document is the source of truth for:

- what stays fixed from `n=1` to `n=∞`,
- what changes intentionally (axes),
- how the three examples differ.

It is intentionally scaffold-oriented, not a full implementation spec.

## Invariants (must not change from n=1 to n=∞)

- Package boundary is always `src/index.ts` + `src/client.ts` + `src/router.ts`; module internals stay `contract.ts` + `router.ts`.
- Module-level `contract.ts` + `router.ts` split (hybrid contract-first implementation).
- Transport-agnostic internals (no HTTP concerns inside package).
- Package root exports stay boundary-only (`createClient`, `router`, `Client`, `Router`).
- Procedures declare explicit ORPC boundary errors for caller-actionable outcomes.
- Expected business states are modeled as values inside the boundary.
- Procedures carry shared metadata (`domain`, `audience`) plus explicit per-procedure `idempotent`.
- Shared ORPC runtime scaffolding lives in `src/orpc-runtime/*`, not `src/boundary/*`.
- `src/orpc-runtime/context.ts` is always present as a stable scaffold slot.
- Domain package deps include shared base deps (`BaseDeps`) so logger capability is always available.
- One stable package entry surface (`router` + `createClient` in-process factory pattern).

## Real axes that should change

1. Topology axis: Leaf-only vs Leaf + composite orchestration.
2. Composition axis: No cross-module dependency vs Intentional cross-module dependency.
3. Reuse axis: Procedure-local rules vs Shared package primitives/services.
4. Coordination axis: Single-entity operations vs Multi-entity invariants/flows.
5. Governance axis: Conventions by example vs Automated guardrails (tests/checks/snapshots/lint rules).

## Clarifications

- Cross-module sharing is not golden-only; it is normal by intermediate.
- Golden-path value is disciplined sharing under high dependency density, not introducing sharing for the first time.
- Structure is not an axis in this phase; structure stays fixed (`index.ts` + `client.ts` + `router.ts` + `orpc-runtime/` + `modules/`).
- Structure is deterministic for scaffolding; avoid conditional "add this core file later" guidance.
- Module-specific boundary errors are defined inline in `contract.ts` (not separate module `errors.ts` files).
- Metadata should stay minimal and operational in this phase (`idempotent` required, `sideEffects` deferred).
- Contract-router/global error policy is defined in `guidance.md` (canonical); examples should not introduce package-wide shared error sets unless that policy's conditions are met.

## How the 3 examples differ

1. Minimal (beginner)
   - one leaf module,
   - no peer module dependencies,
   - single-entity flow,
   - minimal shared primitives.
2. Current/intermediate
   - multiple modules,
   - at least one composite module composing peer repositories directly,
   - shared primitives only where reuse is real.
3. Golden path
   - same base structure,
   - higher composition density,
   - shared cross-module services/use-cases,
   - stronger automated governance.

## Suggested Structures

### 1) Minimal

```text
packages/example-minimal/src/
├── index.ts
├── client.ts
├── router.ts
├── orpc-runtime/
│   ├── context.ts
│   ├── module.ts
│   ├── deps.ts
│   ├── internal-errors.ts
│   ├── errors.ts
│   └── meta.ts
└── modules/
    └── tasks/
        ├── contract.ts
        ├── router.ts
        ├── repository.ts
        └── schemas.ts
```

### 2) Current / Intermediate

```text
packages/example-todo/src/
├── index.ts
├── client.ts
├── router.ts
├── orpc-runtime/
│   ├── context.ts
│   ├── module.ts
│   ├── deps.ts
│   ├── internal-errors.ts
│   ├── errors.ts
│   └── meta.ts
└── modules/
    ├── tasks/
    │   ├── contract.ts
    │   ├── router.ts
    │   ├── repository.ts
    │   └── schemas.ts
    ├── tags/
    │   ├── contract.ts
    │   ├── router.ts
    │   ├── repository.ts
    │   └── schemas.ts
    └── assignments/
        ├── contract.ts
        ├── router.ts
        ├── repository.ts
        └── schemas.ts
```

### 3) Golden Path

```text
packages/example-golden/src/
├── index.ts
├── client.ts
├── router.ts
├── orpc-runtime/
│   ├── context.ts
│   ├── module.ts
│   ├── deps.ts
│   ├── internal-errors.ts
│   ├── errors.ts
│   └── meta.ts
└── modules/
    ├── shared/
    │   ├── schemas.ts
    │   ├── services.ts
    │   └── invariants.ts
    ├── tasks/
    │   ├── contract.ts
    │   ├── router.ts
    │   ├── repository.ts
    │   └── schemas.ts
    ├── tags/
    │   ├── contract.ts
    │   ├── router.ts
    │   ├── repository.ts
    │   └── schemas.ts
    ├── assignments/
    │   ├── contract.ts
    │   ├── router.ts
    │   ├── repository.ts
    │   └── schemas.ts
    └── use-cases/
        ├── create-task-with-tags.ts
        └── reassign-tags.ts
```

```text
packages/example-golden/test/
├── contract-snapshot.test.ts
├── error-surface.test.ts
└── module-boundary.test.ts
```

## Reading Rule

For any diff across examples, ask:

1. Which invariant stayed fixed?
2. Which axis moved and why?

If a change cannot be mapped to an axis, treat it as accidental complexity until justified.
