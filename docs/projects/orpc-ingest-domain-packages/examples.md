# ORPC Domain Package Examples

## Purpose

This document is the source of truth for:

- what stays fixed from `n=1` to `n=∞`,
- what changes intentionally (axes),
- how the three examples differ.

It is intentionally scaffold-oriented, not a full implementation spec.

## Invariants (must not change from n=1 to n=∞)

- Package exports are boundary-only (`src/index.ts` exports `createClient`, `router`, `Client`, `Router`).
- Stable public router import remains available via `@rawr/<pkg>/router` (`src/router.ts` is a thin re-export).
- Two-layer topology:
  - **Kit seam (`src/orpc-sdk.ts`, `src/orpc/*`)**: domain-agnostic oRPC kit primitives (future SDK extraction seam).
  - **Service surface (`src/service/`)**: service definition + modules + root contract bubble-up.
- One oRPC-native composition surface:
  - `src/service/impl.ts` implements the root contract and attaches package-wide middleware.
- Router responsibilities are distinct and fixed:
  - `src/service/router.ts` composes module routers and performs a single final attach (no middleware authored here).
- Module internals stay `contract.ts` + `setup.ts` + `router.ts`.
- Module-level hybrid contract-first: `contract.ts` is boundary shape; `router.ts` is handler behavior.
- Transport-agnostic internals (no HTTP concerns inside package).
- Procedures declare explicit ORPC boundary errors for caller-actionable outcomes.
- Expected business states are modeled as values inside the boundary.
- Procedures carry shared metadata (`domain`, `audience`) plus explicit per-procedure `idempotent`.
- Shared oRPC scaffolding lives in `src/orpc/*` (and is intentionally domain-agnostic).
- `src/orpc/middleware/` is always present for kit-level cross-cutting concerns (analytics, providers, generic wrappers).
- Host/runtime tracing bootstrap is required above the package and should be wired once before app/route composition.
- `src/service/middleware/` is available for domain-wide cross-cutting concerns; ordering is authored in `src/service/impl.ts`.
- Domain package deps include shared base deps (`BaseDeps`) so logger capability is always available.
- `context.deps` remains the single host-provided dependency bag; middleware/module setup may add top-level execution keys, but we do not split runtime dependencies into multiple bags.
- One stable package entry surface (`router` + `createClient` in-process factory pattern).
- `src/service/base/index.ts` binds the service-local authoring surfaces once (`ocBase`, `createServiceMiddleware`, `createServiceImplementer`) and assembles baseline concern profiles from sibling files in `src/service/base/`.
- `src/service/base/types.ts` is the shared type source for those sibling files; it exists to keep the base-construction layer acyclic.
- `src/service/base/{observability,analytics}.ts` should contribute service-specific deltas, while the SDK derives baseline naming like `todo.procedure.*` and `rawr.todo.*` from service metadata.
- `createServiceImplementer(...)` auto-attaches the service-wide baseline concerns from `src/service/base/`; module/procedure-local observability and analytics stay additive and attach via `createServiceMiddleware(...).use(...)`.

## Real axes that should change

1. Topology axis: Leaf-only vs Leaf + composite orchestration.
2. Composition axis: No cross-module dependency vs Intentional cross-module dependency.
3. Reuse axis: Procedure-local rules vs Shared package primitives/services.
4. Coordination axis: Single-entity operations vs Multi-entity invariants/flows.
5. Governance axis: Conventions by example vs Automated guardrails (tests/checks/snapshots/lint rules).

## Clarifications

- Cross-module sharing is not golden-only; it is normal by intermediate.
- Golden-path value is disciplined sharing under high dependency density, not introducing sharing for the first time.
- Structure is not an axis in this phase; structure stays fixed (`index.ts` + `client.ts` + `router.ts` + `orpc-sdk.ts` + `orpc/` + `service/`).
- Structure is deterministic for scaffolding; avoid conditional "add this core file later" guidance.
- Module-specific boundary errors are defined inline in `contract.ts` (not separate module `errors.ts` files).
- Metadata should stay minimal and operational in this phase (`idempotent` required, `sideEffects` deferred).
- Runtime context should not introduce a generic `metadata` bag by default; use `deps` for host-owned dependencies and explicit top-level keys for request/execution values.
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
├── orpc-sdk.ts
├── orpc/
│   ├── base.ts
│   ├── package-boundary.ts
│   ├── factory/
│   │   ├── contract.ts
│   │   ├── implementer.ts
│   │   ├── middleware.ts
│   │   ├── service.ts
│   │   └── index.ts
│   └── middleware/
│       └── analytics.ts
└── service/
    ├── contract.ts
    ├── base/
    │   ├── index.ts
    │   ├── types.ts
    │   ├── observability.ts
    │   ├── analytics.ts
    │   └── policy.ts
    ├── impl.ts
    ├── router.ts
    ├── middleware/
    │   └── read-only-mode.ts
    ├── adapters/
    │   └── README.md
    ├── shared/
    │   ├── README.md
    │   ├── errors.ts
    │   └── internal-errors.ts
    └── modules/
        └── tasks/
            ├── contract.ts
            ├── setup.ts
            ├── router.ts
            ├── repository.ts
            └── schemas.ts
```

Example change at this scale (small): add a new procedure.

- Touch `service/modules/tasks/contract.ts` (add `.meta({ idempotent })`, `.input`, `.output`, `.errors`)
- Touch `service/modules/tasks/router.ts` (implement handler and include it in `os.router({ ... })`)

### 2) Current / Intermediate

```text
packages/example-todo/src/
├── index.ts
├── client.ts
├── router.ts
├── orpc-sdk.ts
├── orpc/
│   ├── base.ts
│   ├── package-boundary.ts
│   ├── factory/
│   │   ├── contract.ts
│   │   ├── implementer.ts
│   │   ├── middleware.ts
│   │   ├── service.ts
│   │   └── index.ts
│   └── middleware/
│       ├── analytics.ts
│       ├── sql-provider.ts
│       └── feedback-provider.ts
└── service/
    ├── contract.ts
    ├── base/
    │   ├── index.ts
    │   ├── types.ts
    │   ├── observability.ts
    │   ├── analytics.ts
    │   └── policy.ts
    ├── impl.ts
    ├── router.ts
    ├── middleware/
    │   └── read-only-mode.ts
    ├── adapters/
    │   └── README.md
    ├── shared/
    │   ├── README.md
    │   ├── errors.ts
    │   └── internal-errors.ts
    └── modules/
        ├── tasks/
        │   ├── contract.ts
        │   ├── setup.ts
        │   ├── router.ts
        │   ├── repository.ts
        │   └── schemas.ts
        ├── tags/
        │   ├── contract.ts
        │   ├── setup.ts
        │   ├── router.ts
        │   ├── repository.ts
        │   └── schemas.ts
        └── assignments/
            ├── contract.ts
            ├── setup.ts
            ├── router.ts
            ├── repository.ts
            └── schemas.ts
```

Example change at this scale (medium): add a new module.

- Add `service/modules/projects/{contract,setup,router,repository,schemas}.ts`
- Wire it into `service/contract.ts` (import + add to exported contract object)
- Wire it into `service/router.ts` (import module router + add to exported router object)
- No changes needed outside `service/contract.ts` + `service/router.ts` unless you’re changing middleware ordering (`src/service/impl.ts`)
- If the change is only module/procedure-local observability or analytics, prefer `service/modules/<name>/setup.ts` or `service/modules/<name>/router.ts`; do not re-attach the default service-wide baseline in `src/service/impl.ts`.

### 3) Golden Path

```text
packages/example-golden/src/
├── index.ts
├── client.ts
├── router.ts
├── orpc-sdk.ts
├── orpc/
│   ├── base.ts
│   ├── package-boundary.ts
│   ├── factory/
│   │   ├── contract.ts
│   │   ├── implementer.ts
│   │   ├── middleware.ts
│   │   ├── service.ts
│   │   └── index.ts
│   └── middleware/
│       ├── analytics.ts
│       ├── sql-provider.ts
│       └── feedback-provider.ts
└── service/
    ├── contract.ts
    ├── base.ts
    ├── impl.ts
    ├── router.ts
    ├── middleware/
    │   └── read-only-mode.ts
    ├── adapters/
    │   └── README.md
    ├── shared/
    │   ├── README.md
    │   ├── errors.ts
    │   ├── internal-errors.ts
    │   ├── schemas.ts
    │   ├── services.ts
    │   └── invariants.ts
    └── modules/
        ├── tasks/
        │   ├── contract.ts
        │   ├── setup.ts
        │   ├── router.ts
        │   ├── repository.ts
        │   ├── schemas.ts
        │   └── comments/
        │       ├── contract.ts
        │       ├── setup.ts
        │       ├── router.ts
        │       ├── repository.ts
        │       └── schemas.ts
        ├── tags/
        │   ├── contract.ts
        │   ├── setup.ts
        │   ├── router.ts
        │   ├── repository.ts
        │   └── schemas.ts
        ├── assignments/
        │   ├── contract.ts
        │   ├── setup.ts
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
