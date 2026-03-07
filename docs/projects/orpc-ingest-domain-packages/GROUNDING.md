# ORPC + Ingest (E‑E‑S‑T) — Domain Packages “Golden Example” Grounding

Created: 2026-02-24  
Repo snapshot (initial): `rawr-hq-template` @ branch `codex/support-example-orpc-unified-golden`, commit `1acfd4db`

## What this doc is

An evolving scratchpad for the “last mile” of integrating ORPC + Ingest (E‑E‑S‑T), focused on clarifying **domain package boundaries** and producing **canonical examples** agents can follow.

This is **not** the final spec; it’s a convergence workspace that should eventually promote stable decisions into `docs/system/` and `docs/process/`.

## Context (cleaned, preserving uncertainties)

We are in the last phase of integrating ORPC and Ingest (E‑E‑S‑T), and trying to develop a stronger set of boundaries for Aragon’s model.

We laid the groundwork/foundation for most of the work; we’re now in the last, most difficult percent.

Recent progress went off the rails while building concrete examples inside the new system:

- We chose the wrong domain for an example (too difficult).
- The examples were implemented incorrectly and didn’t work in the “developer experience” fashion we need.
- AI agents repeatedly built them incorrectly.
- Possible reasons (not fully sure):
  - we didn’t resolve all questions / fully outline everything up front, and/or
  - the system changed and the examples became outdated relative to other changes.
- Agents followed those outdated/incorrect examples and went off track; manual intervention was needed.
- We’re still not making the progress we want.

## Primary goal (right now)

Produce **one “golden” example model** for domain packages that demonstrates scaling from **N‑of‑1** to **N‑of‑infinity** *within the same package*, and becomes the canonical model agents follow.

## The two example packages we need

### 1) ToDo app package (N‑of‑1)

Purpose: demonstrate the *minimal* package structure for something simple with little logic.

Questions it must answer:

- What does the N‑of‑1 file/package structure look like?
- What does the client packaging look like?
- How would that client/package get used by:
  - an API plugin (or another plugin), and
  - a CLI plugin?
- Does the N‑of‑1 structure scale cleanly toward N‑of‑infinity?

### 2) Support example package (N‑of‑3/4/5)

Purpose: demonstrate how a larger service (multiple modules inside a single domain package) should be structured, including how the system/plugins integrate with it.

We should use the **existing support example package** as the golden multi‑module reference.

Together with the ToDo example, this should make the “small → large” scaling story obvious.

## Key boundary question to resolve (affects both examples)

We need to nail down the boundary between “domain packages” and everything else.

Even though the spec defines this, landed changes may differ and/or need further proof/validation.

Specifically: define the composition/relationship between:

- **router**
- **contract**
- **client**

…for domain packages (including internal usage).

Core decision axis:

1) **Pure domain services** (business logic is framework-agnostic), with an ORPC internal/private client wrapped around it
2) **ORPC defines the service directly** (the ORPC router/handlers are the service; “domain” sits inside ORPC)

This choice drives file layout, import direction, test strategy, and how we enforce the domain package boundary.

## Meta-goal (driving all this)

Standardize the setup enough that we can generate a package from our WR / CLI directly, so agents don’t have to wire it themselves. That requires an exact, repeatable domain package structure and integration pattern.

## Notes / constraints observed so far

- Graphite CLI (`gt`) cannot run in this sandbox because it cannot access `~/.local/share/graphite/...` (permission error). We can still preserve Graphite workflow invariants using git directly in this environment.

## Relevant constraints (skills → extracted)

### oRPC (contract-first canonical guidance; router-first exists but is “alternative”)

From the oRPC reference skill:

- oRPC artifacts are separable: **contract** → **implementation** → **router** → transports (`RPCHandler`, `OpenAPIHandler`) → **clients**.
- Recommended monorepo rule-of-thumb:
  - keep **transports at the edge** (mount `RPCHandler` / `OpenAPIHandler` in apps, not in shared packages),
  - keep “contract” packages dependency-clean (no app/framework imports),
  - keep domain packages reusable (domain should not depend on implementation packages).
- For testing, `createRouterClient(router, { context })` is a fast “no-network” way to call procedures in-process.

### Inngest (durable execution; adapters at edges)

From the Inngest reference skill:

- Inngest is **durable execution**: handlers can re-run; step boundaries (`step.run`, `step.sleep`, etc.) are the durability / idempotency unit.
- Keep **adapters at the edges** (the `serve()` wiring lives in an app endpoint); keep shared workflow packages portable.
- Treat event names + payload schemas like an internal API (centralize, evolve additively, version via new event names).

### System design (boundary discipline)

From the system-design skill:

- Boundaries are *choices*; define what’s inside/outside and what flows across.
- Prefer designs where changes do not cascade (reduce coupling), and force yourself to trace second-order effects (what gets worse when this gets better).

## What the repo currently demonstrates (important signals)

As of the `codex/support-example-orpc-unified-golden` branch:

### Two competing “domain package” patterns are already present

1) **Contract-only domain packages (contract-first posture)**  
Example: `packages/state/src/orpc/contract.ts` exports `stateContract` only.

2) **Router-first domain package (router is the authority; contract derived from router)**  
Example: `packages/support-example/README.md` explicitly states “router-first authority chain”, and `packages/support-example/src/contract.ts` derives the contract via `minifyContractRouter(supportExampleRouter)`.

### How support-example currently composes router/contract/client

- **Router**: `packages/support-example/src/router.ts` composes module routers (e.g. `triage/items/*`) into `supportExampleRouter`.
- **Procedures + handlers**: modules like `packages/support-example/src/modules/triage/items/request.ts` define procedures via `os.$context<...>().route().input().output().handler(...)` (i.e., oRPC server is inside the package).
- **Contract**: `packages/support-example/src/contract.ts` minifies/derives a contract view from the router (no separate contract tree).
- **Client (internal, no-network)**:
  - tests create an in-process client via `createRouterClient(supportExampleRouter, { context })` (`packages/support-example/test/*`),
  - the host wires the client into request context in `rawr.hq.ts` (`resolveSupportExampleClient`, `enrichSupportExampleContext`).

### How plugins integrate with the domain package (support-example)

- API plugin provides a boundary router that **delegates** to the in-process domain client (see `plugins/api/support-example/src/operations/**`).
- API plugin uses `implement<typeof supportExampleRouter, SupportExampleApiContext>(supportExampleRouter)` as a typed procedure handle surface, then attaches delegating handlers (see `plugins/api/support-example/src/orpc.ts`).

## Decision surface we need to converge on (for the golden examples)

The key is to standardize the relationship between:
1) **domain logic**, 2) **router**, 3) **contract**, 4) **client**.

We need one canonical pattern that:
- feels minimal at N-of-1 (ToDo),
- scales cleanly at N-of-3/4/5 (support-example),
- is “agent-proof” (hard to wire incorrectly),
- preserves the domain-package boundary (import direction + dependency hygiene).

### Architecture options (not decided yet)

#### Option A — “Router-first domain package” (oRPC defines the service)

Domain package exports:
- `router` (procedures + handlers),
- `contract` derived from router,
- optionally helpers to create an in-process client (`createRouterClient(router, { context })`).

Implications:
- Easiest to make N-of-1 feel real and usable quickly.
- Strong “single authority” story (router is what exists; contract is a view).
- Domain package depends on `@orpc/server` (purity is intentionally traded for ergonomics).

#### Option B — “Pure domain services + ORPC adapters at the edge”

Domain package exports:
- domain models + services (no oRPC),
- possibly a narrow service interface for tests and DI.

Then *some boundary layer* (plugin/app or a dedicated adapter submodule) exports:
- oRPC `contract`,
- oRPC `router` via `implement(contract)` whose handlers call domain services.

Implications:
- Cleanest boundary and import direction; easiest to enforce “domain purity”.
- More artifacts to keep in sync (contract vs implementation vs domain).
- N-of-1 feels heavier unless we define a strict minimum skeleton / generator.

#### Option C — “Layered domain package (pure core + ORPC adapter submodule)”

Domain package contains both:
- `domain/` (pure),
- `orpc/` (contract + router adapter), with a hard rule that only `orpc/` imports `@orpc/*`.

Implications:
- Keeps “one package” scaling story while preserving a meaningful internal boundary.
- Slightly more structure up front, but reduces drift and confusion long-term.

## Concrete implications for the two golden examples (discussion prep)

### Shared acceptance criteria (regardless of option)

For the “golden” ToDo + support-example pair to actually serve as canonical guidance, they should make these things obvious:

- **Single obvious import** for “the thing you call”:
  - either `router` (router-first) or `contract` (contract-first), but not a confusing mixture.
- **No-network local usage** is first-class (tests + in-process integrations).
- **Adapters live at the edges**:
  - API host owns transport mounting (`RPCHandler` / `OpenAPIHandler`) in `apps/server/**`.
  - Inngest `serve()` wiring lives in an app endpoint; workflows call into domain packages via injected dependencies/clients.
- The pattern works for:
  - an API plugin (delegating boundary / routing),
  - a workflows plugin (Inngest orchestration),
  - a CLI plugin (either offline/in-process *or* calling a running server via RPC).

### ToDo package (N-of-1): what “minimal but scalable” probably means per option

#### If we choose Option A (router-first in the domain package)

Minimal ToDo package would likely mirror `@rawr/support-example` but with one module:

- `src/domain/**`: Todo model + invariants.
- `src/modules/todos/**`: procedures + handlers (small set).
- `src/router.ts`: compose module routers.
- `src/contract.ts`: derived via `minifyContractRouter(router)` (no separate contract tree).
- `src/index.ts`: exports `router` and `contract` (and optionally a `createClient()` helper).

Usage:
- API plugin: create a delegating boundary router whose handlers call `context.todo.*`.
- Workflows plugin: Inngest function resolves an in-process `todo` client and calls it inside `step.run(...)`.
- CLI plugin:
  - offline: import `router` and build an in-process client (`createRouterClient(router, { context })`), or
  - online: import `contract` and use an RPC link (`@rawr/orpc-client`) to call the server.

Key tension: domain package is not “pure”; it intentionally depends on `@orpc/server`.

#### If we choose Option B (pure domain services + ORPC adapters outside)

Minimal ToDo domain package would export *only* domain/service code:

- `src/domain/**`: Todo model + invariants.
- `src/service.ts`: `createTodoService(deps)` with methods like `createTodo`, `listTodos`, etc.

Then the oRPC pieces would live elsewhere (plugin or dedicated adapter package/module):
- `contract` defined via `oc.router(...)` (or `minifyContractRouter` of a boundary router).
- `router` created via `implement(contract)`; handlers call the domain service.

Usage:
- API plugin owns contract/router and mounts it into the host.
- Workflows plugin calls the service directly (pure TS) *or* calls the API boundary (depending on desired boundary discipline).
- CLI plugin:
  - offline: call the pure service directly,
  - online: call the API via RPC client + contract.

Key tension: more “places to look” (domain vs adapter vs contract), so the generator + docs must be very explicit to prevent drift.

#### If we choose Option C (layered package: pure core + `orpc/` adapter)

Minimal ToDo package would still be one package, but layered:

- `src/domain/**`: pure.
- `src/service/**`: pure.
- `src/orpc/contract.ts`: oRPC contract.
- `src/orpc/router.ts`: `implement(contract)` and wire handlers to the service.
- `src/orpc/index.ts`: export `contract` + `router`.
- `src/index.ts`: package boundary exports (likely re-export `orpc/contract` + `orpc/router`).

Usage:
- API plugin can delegate to an in-process `todo` ORPC client (created from the package router) to keep plugins thin.
- Workflows plugin can choose:
  - call the pure service directly (if orchestrations are allowed to depend on service), or
  - call the in-process ORPC client to enforce “call surface uniformity”.
- CLI plugin can choose offline/online like Option A, with cleaner internal boundaries than A.

### Support example (N-of-3/4/5): how it maps to the options

- Today, `@rawr/support-example` is explicitly **Option A** (router-first authority chain; contract derived from router; procedures/handlers in-package).
- To make it **Option B**, we would have to:
  - move oRPC procedure definitions out of the package (into plugin/adapter),
  - keep the package as pure domain/services,
  - ensure plugins/workflows call the service (or a generated client) consistently.
- To make it **Option C**, we would likely:
  - keep the current router/contract surface, but move all `@orpc/*` imports under `src/orpc/**`,
  - keep module composition and business rules under `src/domain/**` + `src/service/**`,
  - make “imports allowed” rules explicit (and ideally enforceable).

