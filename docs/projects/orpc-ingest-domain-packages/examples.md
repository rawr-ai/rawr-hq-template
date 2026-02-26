# ORPC Domain Package Examples

## Purpose

This document is the source of truth for how the three domain-package examples differ.

It is intentionally scoped to:

- what stays fixed from `n=1` to `n=∞`,
- what changes on purpose (axes),
- what each example is meant to demonstrate.

It intentionally does **not** attempt to specify the full final implementation for all three examples yet.

## Current Direction (Locked for This Phase)

We are standardizing on an always-present two-way split in `src/`:

- `boundary/` for always-on package boundary scaffolding.
- `modules/` for service capability modules and router composition.

Working shape:

- `src/index.ts` stays as the primary package entry surface.
- `src/boundary/` holds package-level setup/wiring and boundary helpers.
- `src/modules/` holds module routers, schemas, repositories, and orchestration modules.

Epistemic status:

- High confidence on the value of stable top-level semantics for both human and AI navigation.
- Medium confidence on exact file naming inside `boundary/`; names can still evolve without changing the structural intent.

Error posture update for this phase:

- High confidence that procedure-level ORPC `.errors(...)` should remain the canonical boundary contract.
- Medium confidence on how much internal neverthrow usage each example should carry; this remains template-dependent and is intentionally not fixed as an invariant.

## Invariants (must not change from n=1 to n=∞)

- Router-first domain package.
- Transport-agnostic internals (no HTTP concerns inside package).
- Internal logic may use neverthrow where composition/recovery adds value (not mandatory as repository contract).
- Procedures declare explicit ORPC errors and map domain failures at boundary.
- One stable package entry surface (router + in-process client factory).

## Real axes that should change

1. Topology axis: Leaf-only vs Leaf + composite orchestration.
2. Composition axis: No cross-module dependency vs Intentional cross-module dependency.
3. Reuse axis: Procedure-local rules vs Shared package primitives/services.
4. Coordination axis: Single-entity operations vs Multi-entity invariants/flows.
5. Governance axis: Conventions by example vs Automated guardrails (tests/checks/snapshots/lint rules).

## Clarifications

- Cross-module sharing is not a golden-only axis. It is normal by intermediate level.
- Golden path should show how to keep that sharing disciplined as density grows.
- Package structure itself is **not** an axis between examples in this phase. Structure is standardized; behavior/coordination patterns are what vary.
- `createOrpcErrorMapFromDomainCatalog` + `unwrap` indirection is not part of the forward example posture. Keep error mapping direct at procedure boundaries.

## Why This Direction (Current Read)

This document now assumes one hard architectural boundary: consumers call the package through the in-process ORPC router client.

Given that, the highest-signal contract is the procedure's own `.errors(...)` surface. We currently believe that catalog-to-map conversion plus unwrap helpers add more indirection than value for this boundary shape.

Epistemic framing:

- High confidence in removing global unwrap/catalog indirection from examples.
- Medium confidence on exactly where to demonstrate optional neverthrow usage across intermediate vs golden templates.

## Example Progression (What Changes vs What Stays Fixed)

| Example | What stays fixed | What this example intentionally demonstrates |
| --- | --- | --- |
| 1. Minimal (beginner) | All invariants above + standard `boundary/` and `modules/` layout | Left side of most axes: leaf-only, no peer-module composition, mostly local rules |
| 2. Current/intermediate | All invariants above + standard `boundary/` and `modules/` layout | Midpoint: multiple modules + at least one composite module, selective sharing where it is clearly real |
| 3. Golden path | All invariants above + standard `boundary/` and `modules/` layout | Right side: denser composition, stricter layering and invariants, automated governance |

## How the 3 examples should differ

1. Minimal (beginner)
   - One leaf module, no peer dependencies, mostly local errors/schemas, single-entity CRUD-ish flow.
2. Current/intermediate
   - Multiple modules, at least one composite module that composes peer repositories directly, shared error/schema primitives where reuse is real.
3. Golden path
   - Same core pattern, but with high-density internal composition: clear layering rules, shared use-case services for repeated cross-module workflows, stronger invariants (idempotency/transactions where relevant), and automation enforcing structure.

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

Axes illustrated here:

- Topology: leaf-only.
- Composition: no cross-module dependency.
- Reuse: mostly procedure-local.
- Coordination: single-entity.
- Governance: conventions by example.

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

Axes illustrated here:

- Topology: leaf + composite orchestration.
- Composition: intentional cross-module dependency in composite module(s).
- Reuse: shared service/module errors only where clearly reused.
- Coordination: first multi-entity flows.
- Governance: still mostly convention-driven.

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

Axes illustrated here:

- Topology: dense composite orchestration.
- Composition: frequent but disciplined cross-module composition.
- Reuse: shared primitives/services for repeated patterns.
- Coordination: multi-entity invariants as first-class concerns.
- Governance: automated guardrails enforce structure and drift checks.

## Practical Reading Rule

When reviewing examples, read them in order and ask two questions only:

1. What invariant stayed fixed?
2. Which axis moved, and why?

If a change cannot be explained by one of the defined axes, it should be treated as accidental complexity until proven necessary.
