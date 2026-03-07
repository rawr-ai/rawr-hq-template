# Decisions

This file is intentionally small: it records only **hard boundaries / explicit choices**.
Operational guidance belongs in `guidance.md`; worked walk-throughs belong in `examples.md`.

## Decision #1 (2026-02-25)

### Question
Do we automatically expose/export a package-level contract derived from the domain router from day one?

### Decision
No, not for now.

### Why
For in-process usage, callers use the router client created from the router itself (`createRouterClient(router, { context })`). A package-level exported contract is not required for internal consumption.

This domain package is also not a public API surface. External/OpenAPI exposure is handled by the plugin boundary, not by exporting package contracts directly from domain packages.

The remaining value of package-level contract extraction is drift/snapshot tooling, which is valid but intentionally deferred.

## Decision #2 (2026-03-04)

### Question
What is the canonical domain-package topology (and choke points) for agents?

### Decision
Use a two-layer structure with **explicit contract bubble-up** and **one router composition choke point**:

- **Layer 1 — kit seam (`src/orpc-sdk.ts`, `src/orpc/*`)**: local proto-SDK kit primitives (no domain concretions)
- **Layer 2 — service surface (`src/service/`)**: service definition + middleware + modules + root contract composition

In addition, each domain package has one oRPC-native composition file (central implementer):

- `src/service/impl.ts`: root contract implementation + package-wide middleware stacking (the “official ORPC.ts pattern”, local-first)

Router responsibilities are fixed:

- `src/service/contract.ts`: root contract composition (contracts bubble up here)
- `src/service/impl.ts`: implement the root contract once and attach middleware (framework baseline observability + package observability + providers + domain guards)
- `src/service/router.ts`: router composition only (mount module routers into one shape; single final attach)
- `src/router.ts`: **stable public alias** for `@rawr/<pkg>/router` (re-export only)

Hard choke points / invariants:

- `src/service/impl.ts` is the **only** place allowed to call `.use(...)` for package-wide middleware.
- `src/service/router.ts` is the **only** place allowed to mount module routers into the top-level router shape.
- Import DAG must remain one-way:
  - `src/orpc/**` imports nothing from `src/service/**`
  - `src/service/modules/**` imports nothing from package entrypoints (`src/index.ts`, `src/router.ts`, `src/client.ts`)

### Why
We are optimizing for rapid comprehension and predictable navigation for both humans and AI agents. Structural drift by package size creates unnecessary cognitive overhead.

CLI/template flags should vary content depth (`simple`, `intermediate`, `advanced`), not top-level shape.

## Decision #3 (2026-02-26)

### Question
For router-client-only domain packages, should we keep legacy catalog/unwrap translation layers?

### Decision
No. Use ORPC-native boundary contracts and remove legacy indirection from active paths.

Concretely:

- procedures declare boundary errors via `.errors(...)`,
- procedures throw caller-actionable boundary errors directly,
- no standing `createOrpcErrorMapFromDomainCatalog` + `unwrap` layer in active examples.

### Why
The caller contract is procedure-level ORPC errors. Extra translation layers increase indirection without improving boundary semantics in this architecture.

## Decision #4 (2026-03-01)

### Question
How should expected business states and internal failures be represented?

### Decision
Expected business states stay as values inside the boundary (`null`, `exists`, result objects). Procedures convert those states into caller-actionable ORPC errors when callers need to branch.

Unexpected internals are not part of the typed caller contract by default.

### Why
This keeps boundary contracts focused on caller behavior, reduces repetitive try/catch translation code, and avoids over-exposing internals.

## Decision #5 (2026-03-04)

### Question
Within `src/service/modules/`, what is the canonical module split?

### Decision
Adopt module-level hybrid contract-first:

- each module defines `contract.ts` (boundary: input/output/errors/metadata),
- each module defines `setup.ts` (runtime injection: context middleware, repos/services),
- each module defines `router.ts` (behavior: handlers + contract-enforced router export),
- modules derive their implementer subtrees from the central `impl` in `src/service/impl.ts`,
- modules share a single service base import surface for contract authoring + middleware authoring (`src/service/base.ts`),
- package boundary remains router-client-first (`router` + `createClient` entrypoints).

### Why
This gives us explicit module contracts for readability and enforcement while preserving the existing in-process package boundary surface.

It also makes “what is boundary shape” vs “what is runtime behavior” obvious in code, which improves maintainability and agent navigation.

### References

- Define contract: <https://orpc.dev/docs/contract-first/define-contract>
- Implement contract: <https://orpc.dev/docs/contract-first/implement-contract>
- Router-first alternative: <https://orpc.dev/docs/router-first/procedure-first>
- Monorepo setup/hybrid context: <https://orpc.dev/docs/advanced/monorepo-setup>

## Decision #6 (2026-03-04)

### Question
How do we represent nested modules while keeping composition obvious and oRPC-native?

### Decision
Nested modules are **folders under a module** and are composed explicitly (no auto-discovery):

- a parent module owns composition of its submodules (import + mount in `router.ts`),
- middleware ordering is authored at `src/service/impl.ts` (one obvious stacking point),
- router composition remains at `src/service/router.ts` (single final attach does not move),
- module setup/injection remains local (typically in each module’s `setup.ts`).

### Why
This keeps the “agent drill-down” model fractal without introducing implicit wiring, while preserving one global middleware choke point.

## Decision #7 (2026-03-05)

### Question
How should runtime context be divided between explicit dependencies and middleware-provided values?

### Decision
Keep a single dedicated dependency bag at `context.deps` for host-provided, stable dependencies, and standardize the rest of the package boundary around semantic lanes: `scope`, `config`, and `invocation`. Keep middleware-provided values as top-level execution-context keys.

Concretely:

- baseline deps and service deps are a type-authoring distinction only (`BaseDeps` extended by service deps),
- they do **not** become separate runtime bags such as `context.base` and `context.deps`,
- stable business/client-instance scope lives under `context.scope`,
- stable package behavior/configuration lives under `context.config`,
- required per-call input lives under `context.invocation` and should arrive through native oRPC client context rather than host-only middleware attachment,
- do **not** introduce a generic runtime `metadata` bag by default.

### Why
This preserves one explicit host-input channel (`deps`) while still aligning with oRPC’s middleware model, where middleware adds downstream execution context at the top level.

It keeps runtime semantics legible:

- `context.deps.*` means “host-owned injected dependency”,
- `context.scope.*` means “stable business/client-instance scope”,
- `context.config.*` means “stable package behavior/configuration”,
- `context.invocation.*` means “per-call input enforced by the package boundary”,
- top-level `context.*` outside those lanes means “execution value attached during the pipeline”.
