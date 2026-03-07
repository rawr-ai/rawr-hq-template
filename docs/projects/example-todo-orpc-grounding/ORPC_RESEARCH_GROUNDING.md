# oRPC Skills Grounding (Example Todo)

## Quick map (how to navigate)

- Jump to: **Findings** (middleware/context/metadata), then **Mapping notes** (how this touches `packages/example-todo`), then **Open questions**.

## What this is for (and what it is not)

- This document is **research + synthesis only**.
- No architectural decisions or refactors are made here.
- Goal: become able to reshape `packages/example-todo` to be more **oRPC-native** (esp. around middleware/context/metadata) and to graduate stable, generic authoring helpers into `@rawr/hq-sdk`.

## When to reach for this doc

- Use this as the reference when we’re reshaping `packages/example-todo/src/orpc-runtime/*`.
- When deciding “where should this logic live?”:
  - Prefer **procedure-level middleware** (`.use(...)`) when behavior is part of procedure semantics.
  - Prefer **handler/transport-level hooks** (e.g. `RPCHandler` config) when behavior is per-mount/per-transport and should not be implied by a procedure definition.

## Official sources (official-first)

- oRPC docs hub: `https://orpc.dev/docs`
- Middleware: `https://orpc.dev/docs/middleware`
- Context: `https://orpc.dev/docs/context`
- Metadata: `https://orpc.dev/docs/metadata`
- Best practice: dedupe middleware: `https://orpc.dev/docs/best-practices/dedupe-middleware`
- OpenAPI operation metadata + `oo.spec`: `https://orpc.dev/docs/openapi/openapi-specification`

## Research questions this doc is trying to answer

- Middleware: what is the most oRPC-native way to attach middleware so inference remains intact and module authors don’t fight generic abstractions?
- Context: what belongs in initial context vs execution context, and how does that shape our runtime setup?
- Metadata: what’s the supported mechanism for metadata, how is it merged, and what are safe uses (vs coupling to internal fields)?
- TS authoring patterns: what “SDK authoring” patterns keep surfaces small, inference strong, and dependency direction clear (without `any`)?

## Findings (to be filled; organized by lane)

### Lane A: Middleware (procedure-level composition)

#### Mental model: what middleware is and where cross-cutting behavior lives

- Middleware is procedure-level composition: a function receives `next` and can run logic before/after calling `next`. It can also:
  - inject/guard context (`next({ context: ... })`),
  - short-circuit with a typed output helper (`output(...)`),
  - throw typed oRPC errors.
- Two distinct “where does cross-cutting behavior live?” layers exist:
  - Procedure builder `.use(...)` (definition-time, per procedure).
  - Transport/handler configuration (mount-time, per handler).

#### How middleware interacts with context

- Middleware can declare a **dependent context** via `.$context<Dependent>()` before `.middleware(...)`, so TS enforces prerequisites when the middleware is used.
- `next({ context: { ... } })` merges additional context into the existing context (merge semantics are explicit in the docs).

#### Input/output shaping patterns

- Middleware can read input to do input-aware checks.
- Middleware input-shape adaptation is first-class:
  - Per-use mapping: `.use(mw, mapFn)`
  - Reusable mapping: `mw.mapInput(mapFn)`
- Middleware can short-circuit output:
  - Return `output(cachedValue)` (typed) without calling `next`.

#### Composition + reuse mechanics

- `.middleware(fn)` creates a reusable middleware value.
- `.use(mw)` attaches middleware; can also be inline for one-offs.
- `.concat(...)` composes middleware values into a single value (input types must align; use `.mapInput`).

#### Dedupe behavior and config knobs

- “Safe repeated application” best practice: store computed values in context (e.g. `context.db ?? await connectDb()`).
- Built-in “leading middleware” dedupe exists (router middlewares as subset of leading procedure middlewares, same order). Configurable via `.$config({ dedupeLeadingMiddlewares: false })`.

#### Pitfalls to watch (inference + metadata)

- Metadata typing: reading `procedure['~orpc'].meta` inside middleware tends to go `unknown` unless metadata is typed via an oRPC-native mechanism (see metadata lane; and note our current runtime checks/casts).
- Type inference: extracted generic helpers that call `.use(...)` inside a generic abstraction can erase concrete contract typing; attach middleware where contract is concrete (typically module routers).

### Lane B: Context (initial vs execution context)

#### Mental model: initial vs execution context

- oRPC context is type-safe dependency injection with two concepts:
  - **Initial context**: required dependencies passed at call entry (explicit).
  - **Execution context**: computed during execution (typically by middleware), injected via `next({ context: ... })`.

#### Heuristic: what belongs where (as implied by docs)

- Initial context: environment / boundary-provided dependencies required to begin work (e.g. headers, env config, stable service handles).
- Execution context: derived per-request/per-call facts (auth payloads), or resources with a strict lifetime (connect/cleanup in middleware).

#### Combining initial + execution context

- Standard pattern is initial context for static/boundary inputs; middleware derives runtime values (auth, db client) and injects them (merged context).

#### Per-request lifetime management

- Middleware can create a resource, `await next({ context: { ... } })`, then dispose in `finally` (the docs show this for a DB client created from an initial `env.DB_URL`).

#### Optional “header shims” (plugins)

- There are official plugins that inject request/response headers into context (notes mention `reqHeaders?` / `resHeaders?` as optional to preserve in-process callability). This is useful when you want consistent context keys across transports, but it also introduces optionality that must be guarded unless the plugin is always installed.

#### Pitfalls

- Context merges can overwrite keys; avoid accidental overrides (namespacing helps).
- Don’t leak transport-specific objects into domain code unless you accept losing in-process call ergonomics.
- Resource lifetime mismatches (never-disposed per-request clients, or accidentally disposing shared pools) are the main foot-guns.

### Lane C: Metadata (procedure-attached configuration)

#### Mental model and authoring pattern

- Metadata is procedure-attached configuration: build-time key/value pairs you define and later read at runtime (usually in middleware) to branch behavior.
- Pattern:
  - define a metadata shape on a base via `.$meta<TMeta>(initialMeta)`,
  - layer per-procedure overrides via `.meta(partialMeta)` (can be called multiple times),
  - read at runtime from the procedure object.

#### Merging semantics (shallow)

- `.meta(...)` merges via shallow JS spread:
  - later keys overwrite earlier keys,
  - nested objects are replaced (not deep-merged).

#### Reading metadata at runtime (coupling point)

- Official docs show reading via `procedure['~orpc'].meta`.
- Treat `['~orpc']` reads as a coupling point (even if documented); if we depend on this heavily, hide it behind a tiny local helper to localize future breakage.

#### OpenAPI: route metadata is a separate channel

- OpenAPI “operation metadata” is attached via `.route({ ... })`, router tags via `.tag(...)`.
- `oo.spec(...)` (from `@orpc/openapi`) can decorate middleware/errors to extend generated OpenAPI operation objects (e.g. `security`).
- Generic `.meta()` does not automatically influence OpenAPI output; bridging requires an explicit convention/helper if we want it.

#### Pitfalls

- Key collisions and “action at a distance” from shallow merge.
- Confusing `.meta()` (generic) vs `.route()` / `.tag()` / `oo.spec()` (OpenAPI).

### Secondary: TypeScript SDK authoring patterns (for `@rawr/hq-sdk`)

Notes we’ll use when shaping `@rawr/hq-sdk` surfaces (non-oRPC-specific, but relevant to the authoring SDK):

- Inference-first: prefer APIs where consumers almost never provide explicit generic type params.
- Don’t “wrap away” type information: highly-generic helpers tend to erase inference and force casts.
- Small public surfaces + hard boundaries:
  - keep public exports minimal and intentional;
  - avoid deep imports by providing a stable, small façade.
- Keep runtime + type-time aligned:
  - types without runtime backing are lies;
  - parsing/validation belongs at boundaries.

## Mapping notes: how this shows up in `packages/example-todo` today (options only)

Grounded observations from `packages/example-todo` today (no changes implied):

- Module routers attach package middleware in the module-local `.use(...)` chain:
  - `withTelemetry`
  - `withReadOnlyMode`
- `withReadOnlyMode` gates mutating behavior by inspecting procedure metadata; currently this requires runtime checks/casts because metadata typing isn’t end-to-end.
- Each module injects module-local adapters (repos) via `.use(({ context, next }) => next({ context: { repo: ... } }))`, which aligns with oRPC execution-context injection.

Potential “more oRPC-native” directions (options only, not decisions):

- Make metadata type-safe end-to-end so metadata-driven middleware doesn’t live on `unknown`.
- Use dependent-context to keep injection middleware type-safe without casts.
- Decide deliberately whether telemetry belongs in procedure middleware or transport interceptors based on whether it should be implied by a procedure definition vs implied by a specific mount.

## Open questions / follow-ups

- Metadata lane: what is the supported/idiomatic mechanism to type metadata so middleware can read it without `unknown`?
- OpenAPI lane: when should we use route/tag/spec (OpenAPI op metadata) vs generic procedure metadata?
- Header plugins: do we want request/response headers in context as optional shims, or keep headers strictly at the boundary adapter?
