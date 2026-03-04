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
Use a two-layer structure with **one shipping router choke point**:

- **Layer 1 — kit seam (`src/orpc.ts`, `src/orpc/*`)**: local proto-SDK kit primitives (no domain concretions)
- **Layer 2 — domain surface (`src/domain/`)**: deps + shared kit instance + domain semantics + **shipping router** + modules

Router responsibilities are fixed:

- `src/domain/router.ts`: **shipping router** (domain composition + middleware chain + single final `.router(...)` attach)
- `src/router.ts`: **stable public alias** for `@rawr/<pkg>/router` (re-export only)

Hard choke points / invariants:

- `src/domain/router.ts` is the **only** place allowed to call `.router(...)` (single-shot attach).
- Import DAG must remain one-way:
  - `src/orpc/**` imports nothing from `src/domain/**`
  - `src/domain/modules/**` imports nothing from package entrypoints (`src/index.ts`, `src/router.ts`, `src/client.ts`)

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
Within `src/domain/modules/`, what is the canonical module split?

### Decision
Adopt module-level hybrid contract-first:

- each module defines `contract.ts` (boundary: input/output/errors/metadata),
- each module defines `setup.ts` (runtime injection: context middleware, repos/services),
- each module defines `router.ts` (behavior: handlers + contract-enforced router export),
- modules share a single domain kit import surface (`src/domain/setup.ts`),
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
- boundary wrapping remains at `src/domain/router.ts` (single final attach does not move),
- module setup/injection remains local (typically in each module’s `setup.ts`).

### Why
This keeps the “agent drill-down” model fractal without introducing implicit wiring, while preserving one global middleware choke point.
