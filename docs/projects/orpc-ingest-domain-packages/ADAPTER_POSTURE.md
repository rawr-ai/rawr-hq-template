# Adapter Posture

This note captures the current posture before we stress-test `example-todo`
with more real integrations like PostHog and Drizzle.

## Core Distinction

Do not collapse these into one category:

- packaged SDK ports
- provider middleware
- service/domain package code
- host-side concrete integrations

They play different roles.

## Current Working Model

### `src/orpc/ports/*` is for packaged SDK ports

If something lives under `packages/example-todo/src/orpc/ports/*`, it means:

- it is part of the package-local proto SDK surface
- it is a reusable port the package may export
- it is not just local service scaffolding

This is a stronger meaning than "some adapter-like thing we happen to need
internally."

It also does **not** mean every package should invent its own reusable ports
freely. If a port is generically reusable across packages, that
creates pressure to define it centrally rather than duplicating it in each
package-local proto SDK.

This directory is therefore **not** the generic home for "things a package
needs from infrastructure." It is only for ports that are truly part of the
package-local packaged SDK.

### `src/orpc/host-adapters/*` is for host-owned concrete adapters

If something lives under `packages/example-todo/src/orpc/host-adapters/*`, it means:

- it is a concrete host-side adapter or framework binding
- it is not a package-facing port
- it exists to satisfy ports or provide host/framework integrations explicitly

### `src/orpc/middleware/*` contains provider middleware

Provider middleware is distinct from both ports and host adapters.

- ports define the capability contract
- host adapters provide the concrete binding
- provider middleware provisions downstream execution capability under
  `context.provided.*`

This layer is where host prerequisites become the runtime keys handlers and
module setup actually consume.

### `src/service/*` stays pure by default

The service package should remain:

- transport-agnostic
- concrete-adapter-agnostic
- focused on service/domain semantics

By default, `src/service/*` should not accumulate concrete technology
integrations.

### The host owns concrete implementations

Concrete integrations like:

- a PostHog client
- a Drizzle-backed database object
- a real OpenTelemetry provider setup

should generally be host-owned unless we deliberately decide that a reusable
contract belongs in the packaged SDK.

Binary capability rule:

- host-owned concrete adapters: **supported**
- package-local concrete adapters: **not supported**
- plugin-specific dependency configuration: **supported**, but only as explicit
  typed code at the plugin boundary, not as a hidden DSL
- analytics-as-provider: **supported and preferred**
- direct raw `deps.analytics` as the long-term package-facing usage model:
  **not supported**

## Important Clarification

Saying the service package stays pure does **not** mean the package can never
define a host-facing contract.

The more precise rule is:

- service/domain packages should not own concrete adapter implementations
- packaged SDK layers may define reusable host-facing contracts when those
  contracts are truly part of the package boundary

Package-local packaged contracts are therefore the exception, not the default.
They only make sense when the contract is genuinely package-specific and
semantically part of what that package ships.

So the decision point for a new integration is **not**:

- "should this go in `service/adapters`?"

It is:

- "is this only a host-side concrete integration?"
- or "is this a reusable port the packaged SDK should expose?"

If a reusable contract is needed, ask one more question immediately:

- is it package-specific?
- or is it generic enough that it should be centralized instead?

## `service/adapters` is suspect under the current model

Because `src/service/*` is supposed to stay pure, a `service/adapters`
directory is not a normal growth target right now.

Unless we can name a real case that requires it, treat that directory as
misleading residue rather than an intended architectural destination.

## Observability Default

Observability remains framework/internal by default.

For now:

- OpenTelemetry usage in the SDK is a framework/internal integration detail
- it is not automatically part of the package-facing port model
- it is configured by the runtime host once per deployment boundary
- it is bootstrapped from the host/runtime telemetry seam in
  `packages/core/src/orpc/telemetry.ts`

That means:

- shared host today -> one concrete OTel integration at the host
- standalone service later -> that service gets its own host-level OTel
  integration

Packages and plugins participate through the framework seam; they do not own
concrete OTel adapters.

This does **not** mean every plugin receives one identical concrete dependency
bundle. Host-owned means the host is the composition root and may provide:

- shared instances where the resource identity is the same
- separate instances of the same implementation type where plugin boundaries
  need different resources/configuration

We should only revisit that if a later integration shows that observability
really needs an explicit host-facing contract.

## Classification Rule for New Integrations

Before implementing a new provider/integration, classify it first:

1. packaged SDK port
2. provider middleware
3. framework/internal integration
4. host-side concrete integration
5. service-local runtime behavior

This is the repeatable process we want to validate, not just "can we wire in
PostHog?" or "can we wire in Drizzle?"

After that first classification, apply this second decision rule:

1. Is this just a host-side concrete integration?
2. If not, is a reusable port actually needed?
3. If a reusable port is needed, is it package-specific or generically reusable?

If it is generically reusable, centralize it.
If it is package-specific and truly part of the package boundary, the
package-local proto SDK may own it under `src/orpc/ports/*`.

## What This Means For The Next Step

When we bring in PostHog and Drizzle, the first question is not "where do the
files go?" in the abstract.

The first question is:

- which parts are package boundary contracts
- which parts are provider middleware
- which parts are middleware/provider seams
- which parts are host-owned concrete setup

That is the posture we should carry into the next stress-test conversation.
