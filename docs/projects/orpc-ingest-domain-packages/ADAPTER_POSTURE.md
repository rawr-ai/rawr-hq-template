# Adapter Posture

This note captures the current posture before we stress-test `example-todo`
with more real integrations like PostHog and Drizzle.

## Core Distinction

Do not collapse these into one category:

- packaged SDK contracts
- service/domain package code
- host-side concrete integrations

They play different roles.

## Current Working Model

### `src/orpc/adapters/*` is for packaged SDK contracts

If something lives under `packages/example-todo/src/orpc/adapters/*`, it means:

- it is part of the package-local proto SDK surface
- it is a reusable contract the package may export
- it is not just local service scaffolding

This is a stronger meaning than "some adapter-like thing we happen to need
internally."

It also does **not** mean every package should invent its own reusable
contracts freely. If a contract is generically reusable across packages, that
creates pressure to define it centrally rather than duplicating it in each
package-local proto SDK.

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
- or "is this a reusable contract the packaged SDK should expose?"

## `service/adapters` is suspect under the current model

Because `src/service/*` is supposed to stay pure, a `service/adapters`
directory is not a normal growth target right now.

Unless we can name a real case that requires it, treat that directory as
misleading residue rather than an intended architectural destination.

## Observability Default

Observability remains framework/internal by default.

For now:

- OpenTelemetry usage in the SDK is a framework/internal integration detail
- it is not automatically part of the adapter-contract model

We should only revisit that if a later integration shows that observability
really needs an explicit host-facing contract.

## Classification Rule for New Integrations

Before implementing a new provider/integration, classify it first:

1. packaged SDK contract
2. provider middleware
3. framework/internal integration
4. host-side concrete integration
5. service-local runtime behavior

This is the repeatable process we want to validate, not just "can we wire in
PostHog?" or "can we wire in Drizzle?"

After that first classification, apply this second decision rule:

1. Is this just a host-side concrete integration?
2. If not, is a reusable contract actually needed?
3. If a reusable contract is needed, is it package-specific or generically reusable?

If it is generically reusable, centralize it.
If it is package-specific and truly part of the package boundary, the
package-local proto SDK may own it.

## What This Means For The Next Step

When we bring in PostHog and Drizzle, the first question is not "where do the
files go?" in the abstract.

The first question is:

- which parts are package boundary contracts
- which parts are middleware/provider seams
- which parts are host-owned concrete setup

That is the posture we should carry into the next stress-test conversation.
