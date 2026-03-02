# Decisions

## Decision #1 (2026-02-25)

### Question
Do we automatically expose/export a package-level contract derived from the domain router from day one?

### Decision
No, not for now.

### Why
For in-process usage, callers use the router client created from the router itself (`createRouterClient(router, { context })`). A package-level exported contract is not required for internal consumption.

This domain package is also not a public API surface. External/OpenAPI exposure is handled by the plugin boundary, not by exporting package contracts directly from domain packages.

The remaining value of package-level contract extraction is drift/snapshot tooling, which is valid but intentionally deferred.

## Decision #2 (2026-02-26)

### Question
How should we standardize package structure for ORPC domain examples and scaffolding?

### Decision
Use pre-structured packages with one consistent top-level layout across size tiers:

- always-present `orpc-runtime/`
- always-present `modules/`
- stable root boundary surface via `index.ts`, `client.ts`, and `router.ts`

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
Within the standardized `modules/` layout, should modules stay router-only or use an explicit contract/implementation split?

### Decision
Adopt module-level hybrid contract-first:

- each module defines `contract.ts` (input/output/errors/procedure shape),
- each module defines `router.ts` that implements that contract via `implement(contract)`,
- package boundary remains router-client-first (`router` + `createClient`).

### Why
This gives us explicit module contracts for readability and enforcement while preserving the existing in-process package boundary surface.

It also makes “what is boundary shape” vs “what is runtime behavior” obvious in code, which improves maintainability and agent navigation.

### References

- Define contract: <https://orpc.dev/docs/contract-first/define-contract>
- Implement contract: <https://orpc.dev/docs/contract-first/implement-contract>
- Router-first alternative: <https://orpc.dev/docs/router-first/procedure-first>
- Monorepo setup/hybrid context: <https://orpc.dev/docs/advanced/monorepo-setup>

## Decision #6 (2026-03-02)

### Question
Should domain package scaffolding use domain-prefixed public names (for example `createTodoClient`) or generic singleton names?

### Decision
Use generic singleton naming by default for package scaffolding:

- `router`, `createClient`, `Client`, `Deps`, `domain`.

Use domain-specific prefixes only when intentional discrimination is needed.

### Why
Each domain package exposes one primary boundary surface. Generic names reduce repeated naming noise, keep scaffolding uniform across packages, and let consumers alias at import sites where disambiguation is needed.

## Decision #7 (2026-03-02)

### Question
How should we name and place shared ORPC scaffolding so that a fresh agent can immediately distinguish public package boundary from internal runtime wiring?

### Decision
Use this fixed file-placement model in domain package scaffolding:

- `src/index.ts`: package export surface only,
- `src/client.ts`: in-process client factory only,
- `src/router.ts`: package-composed router only,
- `src/modules/*`: capability contracts/implementations only,
- `src/orpc-runtime/*`: shared ORPC runtime scaffolding only.

Do not use `boundary/` as the folder name for shared internal ORPC scaffolding.

### Why
`boundary` overloads two meanings (public package boundary vs internal ORPC procedure runtime). `orpc-runtime` removes that ambiguity and improves both human and agent navigation.
