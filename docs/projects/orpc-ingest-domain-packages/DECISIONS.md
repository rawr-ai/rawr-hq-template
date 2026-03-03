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

## Decision #2 (2026-03-03)

### Question
What is the canonical domain-package topology (and choke points) for agents?

### Decision
Use a two-lane structure with **two distinct router concerns**:

- **Lane A — package boundary (`src/orpc/`)**: base context + base metadata + global middleware + boundary-wrapped router
- **Lane B — domain surface (`src/modules/`)**: modules + domain router composition

Router responsibilities are fixed:

- `src/modules/router.ts`: **domain composition** (what procedures exist + hierarchy)
- `src/orpc/router.ts`: **boundary choke point** (global middleware applied once)
- `src/router.ts`: **stable public alias** for `@rawr/<pkg>/router` (re-export only)

Within `src/orpc/`, keep package-global middleware in `src/orpc/middleware/*`.

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

## Decision #5 (2026-03-01)

### Question
Within `src/modules/`, what is the canonical module split?

### Decision
Adopt module-level hybrid contract-first:

- each module defines `contract.ts` (boundary: input/output/errors/metadata),
- each module defines `setup.ts` (runtime injection: context middleware, repos/services),
- each module defines `router.ts` (behavior: handlers + contract-enforced router export),
- package boundary remains router-client-first (`router` + `createClient`).

### Why
This gives us explicit module contracts for readability and enforcement while preserving the existing in-process package boundary surface.

It also makes “what is boundary shape” vs “what is runtime behavior” obvious in code, which improves maintainability and agent navigation.

### References

- Define contract: <https://orpc.dev/docs/contract-first/define-contract>
- Implement contract: <https://orpc.dev/docs/contract-first/implement-contract>
- Router-first alternative: <https://orpc.dev/docs/router-first/procedure-first>
- Monorepo setup/hybrid context: <https://orpc.dev/docs/advanced/monorepo-setup>

## Decision #6 (2026-03-03)

### Question
How do we represent nested modules while keeping composition obvious and oRPC-native?

### Decision
Nested modules are **folders under a module** and are composed explicitly (no auto-discovery):

- a parent module owns composition of its submodules (import + mount in `router.ts`),
- boundary wrapping remains at `src/orpc/router.ts` (global middleware does not move),
- module setup/injection remains local (typically in each module’s `setup.ts`).

### Why
This keeps the “agent drill-down” model fractal without introducing implicit wiring, while preserving one global middleware choke point.
