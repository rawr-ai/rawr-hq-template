# Draft: Baseline Middleware Attachment and Service Telemetry Split

## Purpose

This draft defines the target architecture for baseline middleware attachment in
`packages/example-todo`, with special focus on observability and analytics.

The goals are:

- keep the service definition seam declarative
- keep runtime behavior as real oRPC middleware
- preserve SDK-owned baseline dependency guarantees
- make required service-wide telemetry hard-bound and easy to reason about
- keep module/procedure additive middleware unchanged

This draft is intended to be directly convertible into an implementation plan.

## Final Design

### Decision summary

Use **four** telemetry layers, split by responsibility:

1. **SDK baseline observability middleware**
   - attached automatically at the SDK/base builder layer
   - owns non-service-specific observability plumbing
   - owns baseline observability dependencies

2. **SDK baseline analytics middleware**
   - attached automatically at the SDK/base builder layer
   - owns non-service-specific analytics plumbing
   - owns baseline analytics dependencies

3. **Required service observability middleware**
   - required by `createServiceImplementer(...)`
   - owns service-specific observability behavior
   - attached automatically by the implementer factory once provided

4. **Required service analytics middleware**
   - required by `createServiceImplementer(...)`
   - owns service-specific analytics behavior
   - attached automatically by the implementer factory once provided

Load-bearing rule:

- `service/base.ts` does **not** have a normal observability configuration
  surface
- `service/base.ts` does **not** have a normal analytics configuration surface
- recurring declarative service semantics belong in metadata defaults or policy,
  not in dedicated telemetry configuration sections

Everything else remains explicit and lower-scope:

- service-wide providers/guards in `src/service/impl.ts`
- service-wide optional extra middleware in `src/service/impl.ts`
- module setup in module `setup.ts`
- procedure-local additions in module `router.ts`

### Why this is the right split

It keeps each concern in the seam where it actually belongs:

- **SDK baseline dependencies and generic runtime shells** belong in the SDK
- **service-specific runtime hooks** belong in service middleware files
- **required attachment/enforcement** belongs in `createServiceImplementer(...)`
- **declarative service identity/policy/static defaults** belong in `service/base.ts`

This is less work than a redesign of the whole service model. It is mainly:

- cleanup
- clearer separation of concerns
- moving enforcement to the right assembly seam

## Mental Model

### `src/orpc/*`

Framework baseline.

This layer owns:

- base dependency contracts
- framework-level baseline middleware
- implementer factories
- middleware builders and provider builders
- lane discipline and `provided` collision protection

Agents should not normally need to change this layer unless they are evolving
the SDK itself.

### `src/service/base.ts`

Declarative service definition.

This file should contain:

- support types
- service declaration types
- metadata defaults
- declarative policy vocabulary
- bound exports used elsewhere in the service

This file should **not** contain:

- runtime observability hooks
- runtime analytics payload logic
- service-wide guards
- service-wide behavioral middleware implementations

### `src/service/middleware/*`

Service-specific runtime behavior.

This is where service-wide runtime observability/analytics logic lives:

- `src/service/middleware/observability.ts`
- `src/service/middleware/analytics.ts`

These files should export concrete middleware values:

- `observability`
- `analytics`

They are built from the service-bound helper surface exported by `service/base.ts`
and supplied to `createServiceImplementer(...)`.

### `src/service/impl.ts`

Single package-wide runtime composition point.

This file should:

- call `createServiceImplementer(...)` exactly once
- provide the required service-wide telemetry middleware
- add service-wide providers/guards
- optionally add additional service-wide middleware beyond the required set

It should not re-declare or re-derive service metadata defaults or declarative
baseline config.

## Required Middleware Enforcement

### Enforcement point

The SDK should enforce required service-wide telemetry at the
`createServiceImplementer(...)` seam.

Target shape:

```ts
const impl = createServiceImplementer(contract, {
  observability,
  analytics,
})
  .use(sqlProvider)
  .use(readOnlyMode);
```

### Why this is the right enforcement seam

Because:

- the required things are runtime middleware, not declarative service shape
- `src/service/impl.ts` is already the one settled package-wide composition
  choke point
- missing required telemetry becomes a compile-time failure at the only valid
  service assembly site
- attachment remains SDK-owned because the implementer factory applies the
  required middleware automatically once supplied

### Why this is stronger than conventions

If `createServiceImplementer(...)` requires:

- `observability`
- `analytics`

then the failure mode is:

- omit one -> compile-time error
- wrong shape -> compile-time error
- wrong order -> prevented by SDK-owned attachment order inside the factory

That is a hard contract, not a lint rule or code review convention.

## Separation of Concerns

### Framework middleware vs service middleware

The split should be explicit and clean.

#### Framework observability middleware

Owns:

- required baseline observability dependencies
- generic span/log lifecycle wrapping
- generic path/outcome/duration handling
- generic non-service-specific observability events/attributes
- framework-level telemetry plumbing

It should not own:

- service-specific event names
- service-specific policy names
- service-specific domain enrichment
- service-specific runtime hooks

#### Framework analytics middleware

Owns:

- required baseline analytics dependencies
- canonical baseline analytics emission plumbing
- generic envelope fields that apply to every service

It should not own:

- service-specific analytics payload enrichment
- service-specific business-domain signals

#### Service observability middleware

Owns:

- service-specific naming/enrichment
- service-specific observability hooks
- policy-aware service instrumentation
- service-global runtime observability logic

It should wrap the whole downstream service pipeline after the framework
observability middleware is already present.

#### Service analytics middleware

Owns:

- service-specific analytics payload enrichment
- service-global runtime analytics logic

It should work on top of the framework analytics middleware rather than replace
it.

## Declarative Baseline

### What stays declarative

`service/base.ts` should still own declarative baseline information such as:

- metadata defaults
- policy event names / policy vocabulary

This is a hard rule, not a soft preference:

- the architecture does **not** provide a normal declarative telemetry authoring
  path in `service/base.ts`
- the generic telemetry envelope is already derivable from metadata defaults,
  procedure shape, stable lanes, and policy vocabulary
- recurring non-derived declarative service inputs belong to metadata or policy
  instead
- a dedicated telemetry configuration surface would mostly duplicate semantics
  already expressed elsewhere and weaken the architecture

### What does not stay declarative

The service definition should not keep:

- observability configuration blocks
- analytics configuration blocks
- `onStarted` / `onFailed` observability callbacks
- analytics payload functions
- service-wide behavioral middleware logic

Those are middleware concerns and should move to `src/service/middleware/*`.

## Policy Clarification

`policy` is not the same thing as:

- errors
- observability
- analytics

Short version:

- **policy** = declarative vocabulary for service-wide rule decisions
- **errors** = caller-facing boundary outcomes
- **observability** = operational traces/logs/events about execution
- **analytics** = structured product/domain telemetry

Why keep policy separate:

- a policy decision may surface as an error, but it is not identical to the
  error
- the same policy decision may need to be consumed by observability and
  analytics in a consistent way
- policy vocabulary belongs in the service declaration seam, not hidden inside a
  runtime callback

Example:

- `readOnlyRejected` is the name of a service-wide rule decision
- it may correspond to:
  - a caller-facing error
  - an observability event
  - an analytics signal

## One Middleware vs Multiple

### What “one single middleware” should mean

The sane version is:

- one canonical **observability** middleware attached once per service
- one canonical **analytics** middleware attached once per service

It does **not** mean:

- collapsing observability and analytics into one mega-middleware
- removing lower-scope additive contributor middleware

### What this means for the SDK

The SDK should move toward:

- one canonical framework observability middleware
- one canonical framework analytics middleware

And the service layer should supply:

- one required service observability middleware
- one required service analytics middleware

That is the “one middleware per concern” model that still preserves real
semantic structure.

## Analytics Invariant

There should be **one canonical analytics emission path**.

That means:

- SDK baseline analytics middleware owns canonical analytics emission
- required service analytics middleware enriches that path
- module/procedure analytics remain additive contributors below that

Required service analytics middleware must **not**:

- emit a second baseline analytics event
- redefine the canonical analytics event stream
- create a competing service-wide emitter by default

If the architecture ever needs multiple canonical analytics streams, that should
be a separate explicit design decision, not an accidental side effect of the
service middleware split.

## Dependency Aggregation

### Guarantee to preserve

Baseline dependencies should remain SDK-owned.

Concretely:

- `logger` remains part of SDK baseline deps
- `analytics` client remains part of SDK baseline deps

This should continue to be modeled through the SDK’s base dependency contract,
not through manual service-level dependency repetition.

### Why this matters

If baseline deps move out of the SDK and become implicit consequences of
middleware attachment, then:

- every service would have to restate those deps
- agents would manually re-author framework requirements
- the strongest existing baseline guarantee would be weakened

That is not desirable.

### Result under the target design

Under the target design:

- baseline observability/analytics deps still come from the SDK
- required service telemetry middleware can assume those deps already exist
- services do **not** manually restate baseline deps just because they supply
  required telemetry middleware to `createServiceImplementer(...)`

This keeps the dependency model explicit at the host/package boundary while
keeping the service declaration seam clean.

## Middleware Ordering

Target order:

1. SDK baseline observability middleware
2. SDK baseline analytics middleware
3. required service observability middleware
4. required service analytics middleware
5. explicit service-wide providers and guards
6. explicit optional extra service-wide middleware
7. module setup and lower-level additive middleware

### Why this order

- baseline framework telemetry attaches first so required baseline deps and
  generic runtime shells always exist
- service telemetry attaches next so it wraps the whole service pipeline
- providers/guards come after telemetry so telemetry can observe them
- lower-level middleware stays additive and bounded

### Discipline this implies

Required service telemetry should depend only on:

- `deps`
- `scope`
- `config`
- `invocation`
- declarative service metadata/policy inputs

If telemetry needs provider-added `provided.*` values, that logic belongs lower
in module/procedure middleware.

## Module and Procedure Contributors

Lower-scope additive middleware remains valid and unchanged in principle.

Keep:

- `createServiceObservabilityMiddleware(...)`
- `createServiceAnalyticsMiddleware(...)`

Use them for:

- module-level additions in `setup.ts`
- procedure-level additions in `router.ts`

These remain additive contributors on top of the required service-wide baseline.

## Current Code vs Target Design

### What the current code already gets right

- there is already a single package-wide composition point in
  `src/service/impl.ts`
- framework baseline observability already exists in the SDK
- service-wide analytics already resembles a canonical emitter plus lower-scope
  contributors
- lower-scope additive middleware already exists and works

### What the current code still gets wrong

- service runtime observability logic still lives in `service/base.ts`
- service runtime analytics/observability are still too entangled with the
  service-definition seam
- observability’s additive helper does not yet have full parity with the
  current service baseline profile
- analytics framework/service split is less explicit than it should be

## SDK Changes Required

### 1. Add framework baseline analytics middleware

The SDK should own a clear framework analytics middleware, analogous to the
existing framework observability middleware.

### 2. Change `createServiceImplementer(...)` signature

It should require the service-specific middleware:

- `observability`
- `analytics`

and auto-attach them internally in canonical order.

### 3. Keep baseline deps in SDK

Do not move baseline `logger` / `analytics` dependency ownership out of the SDK.

### 4. Extend service observability middleware capability

Before service observability fully leaves `service/base.ts`, the SDK must allow
service observability middleware to express the full current baseline behavior,
including:

- structured log enrichment
- started/succeeded/failed event fields
- policy-aware failure hooks

Until that parity exists, service observability should not be treated as fully
migrated.

### 5. Narrow declarative profile types

The current declarative observability/analytics profile types should either be:

- narrowed to truly declarative inputs only, or
- demoted from the primary authoring path

## File Layout

Target service surface:

- `src/service/base.ts`
  - service declaration
  - metadata defaults
  - policy vocabulary
  - narrow declarative baseline inputs
  - bound exports
- `src/service/impl.ts`
  - root implementer assembly
  - required service observability/analytics middleware passed to
    `createServiceImplementer(...)`
  - additional providers/guards
- `src/service/middleware/observability.ts`
  - service-wide required observability middleware
  - exports `observability`
- `src/service/middleware/analytics.ts`
  - service-wide required analytics middleware
  - exports `analytics`
- `src/service/middleware/read-only-mode.ts`
  - explicit service-wide guard
- `src/service/modules/*/setup.ts`
  - module setup and module-wide additions
- `src/service/modules/*/router.ts`
  - procedure handlers and procedure-local additions

## Draft `impl.ts` Shape

```ts
import { contract } from "./contract";
import { createServiceImplementer } from "./base";
import { observability } from "./middleware/observability";
import { analytics } from "./middleware/analytics";
import { readOnlyMode } from "./middleware/read-only-mode";
import { sqlProvider } from "../orpc-sdk";

export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
})
  .use(sqlProvider)
  .use(readOnlyMode);
```

## Risks and Conditions

### Main risk

The main risk is assuming the observability side is already ready for the target
model when its helper surface is not yet sufficient.

### Minimum safe conditions

- framework baseline deps remain SDK-owned
- `createServiceImplementer(...)` owns required telemetry attachment and order
- service observability middleware reaches parity with the current baseline
  profile before the old path is removed
- additive module/procedure observability/analytics remain additive-only
- policy vocabulary remains declarative and continues to feed required service
  observability behavior

## Bottom line

This is **not** a full redesign. It is a cleanup and separation-of-concerns
refactor with one important SDK enforcement change:

- SDK baseline observability and analytics remain in the SDK
- required service observability and analytics move to the implementer seam
- the service definition stays declarative
- lower-scope additive contributors remain intact

That is the target architecture this draft is defining.
