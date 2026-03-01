# ORPC Domain Package Examples

## Purpose

This document is the source of truth for:

- what stays fixed from `n=1` to `n=∞`,
- what changes intentionally (axes),
- how the three examples should differ.

It intentionally does not try to fully specify every implementation detail yet.

## Current Direction (Locked)

We keep a standardized package shape:

- `src/index.ts` as stable public entry.
- `src/boundary/` for package boundary scaffolding.
- `src/modules/` for capability modules + router composition.

Error posture (locked for this phase):

- Procedures define caller-actionable `.errors(...)` only.
- Expected business states inside the boundary are values (`null`, `exists`, result objects), not thrown domain exception classes.
- Procedures throw actionable ORPC errors directly from those states.
- Unexpected internal failures are not part of typed boundary contract by default.
- No standing domain-exception-to-ORPC mapping helper pattern.

Epistemic status:

- High confidence on structural standardization (`boundary/` + `modules/`).
- High confidence on actionable-only boundary error surface.
- Medium confidence on where neverthrow should be showcased (likely advanced/golden example unless a clear intermediate need appears).

## Invariants (must not change from n=1 to n=∞)

- Router-first domain package.
- Transport-agnostic internals (no HTTP concerns inside package).
- Procedures declare explicit ORPC boundary errors for caller-actionable outcomes.
- Expected business states are modeled as values inside the boundary.
- One stable package entry surface (router + in-process client factory).

## Real axes that should change

1. Topology axis: Leaf-only vs Leaf + composite orchestration.
2. Composition axis: No cross-module dependency vs Intentional cross-module dependency.
3. Reuse axis: Procedure-local rules vs Shared package primitives/services.
4. Coordination axis: Single-entity operations vs Multi-entity invariants/flows.
5. Governance axis: Conventions by example vs Automated guardrails (tests/checks/snapshots/lint rules).

## Clarifications

- Cross-module sharing is not a golden-only axis. It is normal by intermediate level.
- Golden path should show how to keep sharing disciplined as dependency density grows.
- Package structure is not an axis in this phase; behavior/coordination is.
- Avoid surfacing internal subsystem failures as typed boundary errors unless callers actually need a distinct branch on them.

## How the 3 examples should differ

1. Minimal (beginner)
   - one leaf module, no peer dependencies, single-entity CRUD-ish flow.
2. Current/intermediate
   - multiple modules, at least one composite module that composes peer repositories directly, shared primitives only where reuse is real.
3. Golden path
   - same core pattern, high-density composition, stronger invariants and automation guardrails.

## Suggested File Structures (Scaffold-Level)

### 1) Minimal (beginner)

```text
packages/example-minimal/src/
├── index.ts
├── boundary/
│   ├── base.ts
│   ├── deps.ts
│   ├── service-errors.ts
│   └── procedure-errors.ts
└── modules/
    ├── router.ts
    └── tasks/
        ├── schemas.ts
        ├── repository.ts
        └── router.ts
```

Axes emphasized:

- leaf topology,
- no cross-module dependency,
- convention-driven governance.

### 2) Current/intermediate

```text
packages/example-todo/src/
├── index.ts
├── boundary/
│   ├── base.ts
│   ├── deps.ts
│   ├── service-errors.ts
│   └── procedure-errors.ts
└── modules/
    ├── router.ts
    ├── tasks/
    │   ├── schemas.ts
    │   ├── repository.ts
    │   └── router.ts
    ├── tags/
    │   ├── schemas.ts
    │   ├── errors.ts
    │   ├── repository.ts
    │   └── router.ts
    └── assignments/
        ├── schemas.ts
        ├── errors.ts
        ├── repository.ts
        └── router.ts
```

Axes emphasized:

- leaf + composite orchestration,
- intentional cross-module dependency,
- first multi-entity flows.

### 3) Golden path

```text
packages/example-golden/src/
├── index.ts
├── boundary/
│   ├── base.ts
│   ├── deps.ts
│   ├── service-errors.ts
│   └── procedure-errors.ts
└── modules/
    ├── router.ts
    ├── shared/
    │   ├── schemas.ts
    │   ├── services.ts
    │   └── invariants.ts
    ├── tasks/
    │   ├── schemas.ts
    │   ├── errors.ts
    │   ├── repository.ts
    │   └── router.ts
    ├── tags/
    │   ├── schemas.ts
    │   ├── errors.ts
    │   ├── repository.ts
    │   └── router.ts
    ├── assignments/
    │   ├── schemas.ts
    │   ├── errors.ts
    │   ├── repository.ts
    │   └── router.ts
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

Axes emphasized:

- high-density composition,
- shared use-case services,
- automated governance.

## Practical Reading Rule

When reviewing examples, ask:

1. Which invariant stayed fixed?
2. Which axis moved and why?

If a change cannot be explained by an axis, treat it as accidental complexity until proven necessary.
