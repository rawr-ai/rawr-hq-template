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
- `src/service/impl.ts`: implement the root contract once, supply required service-wide observability/analytics to `createServiceImplementer(...)`, and then attach only extra service-wide providers/guards
- required service middleware extensions are an explicit allowed pattern when SDK baseline middleware cannot be correct without service-authored runtime behavior
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

Required service middleware extension is now part of that topology contract:

- `src/service/base.ts` stays declarative
- `src/service/impl.ts` is the enforced runtime assembly seam
- runtime service-wide telemetry stays in `src/service/middleware/*`
- additive middleware is not a substitute for required extensions

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
- modules share a single service base import surface for contract authoring + middleware authoring (`src/service/base.ts` as the service-definition entrypoint),
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
Keep a single dedicated dependency bag at `context.deps` for host-provided, stable dependencies, and standardize the rest of the package boundary around semantic lanes: `scope`, `config`, and `invocation`. Keep middleware-provided values under `context.provided.*`.

Concretely:

- baseline deps and service deps are a type-authoring distinction only (`BaseDeps` extended by service deps),
- capability contracts used by baseline deps should still live under
  `src/orpc/ports/*` when they are swappable package-facing contracts (for
  example logger and analytics),
- they do **not** become separate runtime bags such as `context.base` and `context.deps`,
- stable business/client-instance scope lives under `context.scope`,
- stable package behavior/configuration lives under `context.config`,
- required per-call input lives under `context.invocation` and should arrive through native oRPC client context rather than host-only middleware attachment,
- middleware/module setup writes downstream execution values under `context.provided.*`,
- do **not** introduce a generic runtime `metadata` bag by default.

### Why
This preserves one explicit host-input channel (`deps`) while still aligning with oRPC’s middleware model, where middleware adds downstream execution context at the top level.

It keeps runtime semantics legible:

- `context.deps.*` means “host-owned injected dependency”,
- `context.scope.*` means “stable business/client-instance scope”,
- `context.config.*` means “stable package behavior/configuration”,
- `context.invocation.*` means “per-call input enforced by the package boundary”,
- `context.provided.*` means “execution value attached during the pipeline”.

## Decision #8 (2026-03-10)

### Question
Where do concrete adapters and ports belong as we integrate real
providers like PostHog and Drizzle?

### Decision
Use this hard boundary model:

- **Ports, host adapters, and provider middleware are different layers.**
- **Concrete adapters are host-owned.**
- **Package-local concrete adapters are not a supported capability.**
- `src/service/*` stays pure and does not own concrete technology integrations.
- `src/orpc/ports/*` is only for packaged SDK ports that are truly part of the
  package boundary.
- `src/orpc/host-adapters/*` is the staging home for host-owned concrete
  adapters inside the proto SDK.
- Provider middleware remains in `src/orpc/middleware/*` and exists to turn
  host-provided prerequisites into downstream execution capabilities under
  `context.provided.*`.
- If a port is generically reusable across packages, it should be
  centralized rather than duplicated in each package-local proto SDK.
- Plugin-specific dependency configuration is allowed, but it must be authored
  as explicit typed code at the plugin boundary, not as a hidden DSL.
- Telemetry contract and wiring are governed by Decision #9. Do not treat the
  current `example-todo` package-local telemetry seam as the canonical target
  architecture.
- Analytics should follow the provider pattern as well. Treat the current
  `deps.analytics` baseline usage in `example-todo` as transitional while real
  provider-backed analytics is integrated.
- Logger, analytics, and telemetry contracts are SDK ports even when baseline
  still depends on them through `BaseDeps`; baseline owns the dependency
  requirement, not the port contract definition.
- Provider outputs stay under `context.provided.*`; module setup is the only
  supported place to inline/reshape those execution keys for module-local
  handler ergonomics.

### Why
We want a binary capability model for agents:

- supported
- not supported

Leaving package-local concrete adapters as a fuzzy maybe-capability would create
architecture drift and unclear ownership. The correct ownership line is:

- runtime host owns concrete wiring
- plugins and packages consume injected ports

### Implication
If a future API plugin is broken out into its own standalone service, that
service gets its **own host composition layer**. That does not change the
boundary rule:

- the host for that deployment still owns concrete adapters
- the plugin/package boundary still consumes ports rather than owning concrete
  implementations

## Decision #9 (2026-03-12)

### Question
How should telemetry work across hosts, plugins, and service packages?

### Decision
Telemetry is a **host-owned OpenTelemetry bootstrap + oRPC/OTel context
propagation seam**, not a service-package dependency seam.

Concretely:

- each host/runtime bootstraps its own OpenTelemetry SDK once
- the canonical bootstrap helper lives in `packages/core/src/orpc/telemetry.ts`
- hosts register oRPC instrumentation during bootstrap
- service packages and plugins consume the active span from OpenTelemetry
  runtime context
- service packages own telemetry semantics (attributes/events/log enrichment),
  not SDK bootstrap
- plugin and host request/network middleware own ingress/request telemetry
  outside service-package boundaries
- telemetry does **not** travel through service package boundaries as
  `BaseDeps.telemetry`

### Why
OpenTelemetry already provides the right abstraction split:

- host/runtime owns SDK lifecycle, exporters, resources, sampling, and
  propagators
- instrumented code consumes the active runtime context

oRPC’s integration sits on top of that model by registering instrumentation. It
does not turn telemetry into a package dependency that callers should pass
through service boundaries.

This supports:

- one shared host runtime today
- multiple future hosts later
- stable downstream package shape across hosts
- plugin-specific ingress/request telemetry without forcing host bootstrap into
  service packages

### Implication
Telemetry is intentionally different from other seams such as SQL:

- SQL is a provider-style execution capability (`deps.dbPool -> provided.sql`)
- telemetry rides on host-owned OTel bootstrap + active runtime context

Migration should move package observability code toward active-span access and
remove telemetry from the package dependency model.
