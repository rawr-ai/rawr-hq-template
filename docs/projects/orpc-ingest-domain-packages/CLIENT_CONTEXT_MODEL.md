# Domain Package Client Context Model

## Purpose

This note captures the current architectural direction for domain-package client context in the proto oRPC SDK.

It is not an implementation plan. It is the working model we have converged on so we do not lose the reasoning, regress into request-scoped framing, or blur the boundary between stable client construction and per-invocation input.

## Core correction

The earlier framing around `requestId` was wrong for this SDK.

A domain-package client is **not** intended to be a per-request object. It is an in-process client that is created with concrete host-owned values and then reused.

Because of that:

- `requestId` is the wrong exemplar for package-boundary context.
- request-scoped values should not drive the package-construction model.
- the important distinction is **stable per-client state** vs **per-invocation state**.

## What `createClient(...)` actually is

`createClient(...)` is already a factory that takes **concrete values**.

In `packages/example-todo`, the host passes the concrete dependency bag at client creation time, and the package boundary binds that into `createRouterClient(...)`.

So the package boundary is not just shaping types. It is defining a real construction contract.

That means the architectural question is:

- what belongs in the **client construction contract**, and
- what belongs in a **per-call invocation channel** instead.

## The three stable lanes

The current best model is to separate input into three semantic lanes.

### 1. `deps`

Stable host-owned capabilities.

Examples:

- `logger`
- `analytics`
- `dbPool`
- `clock`
- host-owned policy/runtime objects when they are truly stable

Properties:

- required for client construction
- concrete values supplied by the host
- reusable across many calls
- long-lived compared to any single invocation

### 2. `scope`

Stable business/client-instance scope.

Examples:

- `workspaceId`
- `tenantId`
- `projectId`
- other business partitioning or app-scope identifiers that are stable for the lifetime of a client instance

Properties:

- may be required for some packages
- supplied at client construction time
- not a transport concern
- not request-scoped
- should represent what the client *is scoped to*, not incidental invocation metadata

This is the right place for domain/business scope that is more than a dependency but less than per-call metadata.

### 3. `invocation`

Per-call invocation context.

Examples:

- `traceId`
- correlation IDs
- invocation-local annotations
- other ephemeral values that should not be frozen into a reusable client

Properties:

- not part of long-lived client construction
- supplied per procedure call
- still valid for in-process packages
- not necessarily a transport concern
- should use native oRPC client-context patterns rather than being pushed into long-lived client state

This is where in-process tracing belongs.

## Why `requestId` was misleading

`requestId` pulled the discussion toward HTTP/request lifecycle thinking.

That is not the right lens for domain packages.

The right lens is:

- **client lifetime** values
- vs **invocation lifetime** values

A `workspaceId` can be stable across many calls and clearly belongs to client scope.
A `traceId` usually changes per invocation and should be passed per call.

So the question is not “runtime env values or not.”
The question is “what should be bound once vs what should vary per invocation.”

## Initial context vs client context in oRPC

This distinction is native to oRPC.

- **Initial context** is the context the server-side procedures ultimately receive and use.
- **Client context** is the extra input the caller passes at invocation time; a `context` function can use it to build the initial context for that call.

Relevant docs:

- [oRPC Server-Side Clients](https://orpc.dev/docs/client/server-side)
- [oRPC RPCLink / Using Client Context](https://orpc.dev/docs/client/rpc-link)

Key oRPC behavior that matters for this architecture:

- `createRouterClient(..., { context })` can take a **function** instead of a fixed object.
- that function can receive a typed **ClientContext** value per invocation.
- if a property in `ClientContext` is required, oRPC enforces its inclusion **when calling procedures**.

That gives us a clean native split:

- bind `deps` and `scope` once at client construction
- require `invocation` input per procedure call
- build the actual procedure initial context from both

## Why the `invocation` bag is useful

A dedicated `invocation` bag keeps per-call input explicit and stable instead of letting ad hoc top-level one-offs accumulate.

That matters for scaffolding because it gives one consistent place for:

- tracing/correlation
- future invocation-local annotations
- other call-scoped inputs that should not be confused with dependencies or stable scope

Without a dedicated `invocation` bag, per-call input tends to spread across arbitrary top-level keys and becomes harder to reason about and evolve.

## What the package boundary should mean

A domain-package boundary should expose the values that are part of the package’s reusable construction contract.

That suggests a boundary shaped like:

- `deps`
- optionally or additionally `scope`

If a package genuinely needs stable business scope, that scope should be part of the **public contract** instead of being hidden.

What does **not** belong in the long-lived package-construction boundary:

- per-call IDs
- transient invocation annotations
- transport-derived values
- anything that varies frequently enough that baking it into the client would be the wrong lifetime

That does **not** mean invocation-scoped data is unsupported. It means it belongs in the native oRPC per-call client-context channel instead of the construction-time contract.

## Top-level spread vs semantic bags

Arbitrary top-level spread is not the right direction for this SDK.

The better long-term model is semantic bags.

### Keep

- `deps`
- `scope`
- `invocation`

### Do not add right now

- a generic `metadata` bag
- a generic `options` / `config` bag

### Why not `metadata`

A generic `metadata` bag is too vague and becomes a junk drawer.
It also overlaps conceptually with oRPC procedure metadata even if it is technically different.

### Why not `options/config`

`options/config` is plausible, but not the right default semantic lane.
It risks becoming a dumping ground for values that are actually either:

- stable dependencies,
- stable scope, or
- per-call invocation state.

`deps`, `scope`, and `invocation` already give us clearer semantics.

## How to think about `readOnly`

`readOnly` was discussed as a possible example for `options` or `config`.

Current thinking:

- do not use `readOnly` to force a fourth bag right now
- first determine whether it is:
  - a host-owned stable dependency/policy object,
  - stable client scope, or
  - something better expressed elsewhere

In the current todo example it behaves more like a stable host/runtime policy input than a generic client-config lane.

## SSR / shared-client guidance from oRPC

The server-side client guidance matters directly here.

If a client instance is shared across requests, only bind **globally reusable** context at client construction.
For request- or invocation-specific values, use one of these instead:

1. **middleware context**, or
2. **a function as the initial context**

That advice lines up with the model above:

- `deps` and `scope` are construction-time inputs
- `invocation` is per-call input

## Two ways to handle invocation-scoped input

### A. Middleware-context approach

This approach attaches invocation-scoped values in the surrounding server or invocation pipeline before business logic runs.

Conceptually, the procedure still sees the value in its context, but the value is attached by upstream middleware or adapter logic rather than by the package client itself.

Anchored to our current `example-todo` shape:

- `packages/example-todo/src/service/middleware/read-only-mode.ts` already shows a service middleware consuming stable context (`context.deps.runtime`)
- `packages/example-todo/src/orpc/middleware/feedback-provider.ts` shows middleware reading an optional top-level value (`context.requestId`) and deriving execution context from it

A trace-aware variant of the same idea would look like this:

```ts
// packages/example-todo/src/service/middleware/trace.ts
export const traceMiddleware = createServiceMiddleware<{
  deps: {}
  invocation: {
    traceId: string
  }
}>().middleware(async ({ context, next }) => {
  context.deps.logger.info('procedure start', {
    traceId: context.invocation.traceId,
  })

  return next()
})
```

In that model, something outside the domain package would ensure that `invocation.traceId` is attached before the procedure runs.

#### Benefits

- keeps the package client construction contract focused on stable inputs
- works naturally when an outer runtime already has a middleware/invocation pipeline
- good fit when invocation data originates in an adapter layer

#### Drawbacks

- more implicit from the package consumer’s perspective
- per-call requirements may be enforced by host integration rather than by the package client surface itself
- easier for host integrations to drift if the seam is not tested

#### When to choose it

- when the invocation environment already has a strong middleware pipeline
- when the domain package should stay agnostic of the caller’s invocation mechanics
- when the host/runtime is the natural owner of invocation-local state

### B. Function-as-initial-context / native client-context approach

This approach uses oRPC’s native client-context channel directly.

The client binds stable construction-time values once, then requires invocation-scoped values per procedure call.

Grounded in our current `example-todo` code shape, the package-boundary helper would evolve from the current deps-only binding into something like this:

```ts
const client = createRouterClient(router, {
  context: (clientContext: {
    invocation: {
      traceId: string
    }
  }) => ({
    deps,
    scope,
    invocation: clientContext.invocation,
  }),
})

await client.tasks.create(
  { title: 'Hello' },
  {
    context: {
      invocation: {
        traceId: 'trace-123',
      },
    },
  },
)
```

Then procedures and middleware would read:

```ts
context.invocation.traceId
```

#### Benefits

- explicit and native to oRPC
- per-call requirements are enforced by the client type surface itself
- makes invocation-scoped requirements visible to callers instead of relying on host-only conventions
- best fit when the package boundary should own and communicate invocation-scoped requirements

#### Drawbacks

- adds per-call callsite requirements
- makes the package-boundary helper more sophisticated
- if overused, can make procedure calls noisier

#### When to choose it

- when invocation-scoped input is a first-class part of the package contract
- when you want compile-time enforcement at the callsite
- when the same package may be used across multiple hosts and you do not want each host inventing its own attachment convention

## Comparison and current recommendation

Both approaches are valid.

### Middleware-context approach

Best when:

- the invocation environment already owns the relevant context
- the package should remain simpler at the client boundary
- per-call data should be injected by the host/runtime pipeline

### Function-as-initial-context / client-context approach

Best when:

- invocation-scoped input is important enough to expose as part of the package’s explicit call contract
- we want the oRPC type system to enforce that requirement at every callsite
- we want a portable pattern that behaves the same across hosts

### Current recommendation

For this SDK, the cleaner general-purpose model is:

- `deps` for stable host capabilities
- `scope` for stable business/client scope
- `invocation` for per-call client context

That keeps the lifetime split explicit and gives us a scalable package shape.

If a value is required for **every procedure invocation** but should not be frozen into client construction, the native oRPC client-context path is the better fit.

## Why this is useful for scaffolding

The goal is not “you ain't gonna need it.”
The goal is to create a shape that scales across many domain packages without becoming semantically muddy.

`deps`, `scope`, and `invocation` are generic enough to support many packages while still keeping the meaning of each lane clear.

This gives us:

- a stable reusable dependency lane
- a stable reusable business-scope lane
- a stable reusable invocation lane
- room for tracing and other call-scoped concerns without leaking them into client construction

## Implication for future package boundaries

The likely target shape is something like:

```ts
const client = createClient({
  deps: { ... },
  scope: { ... },
})

await client.tasks.create(input, {
  context: {
    invocation: {
      traceId: 'trace-123',
    },
  },
})
```

That means:

- concrete stable values still come from the host at client creation
- the package still constructs a concrete in-process client
- invocation-scoped values are provided where they actually vary: at the procedure call

## Open implementation follow-up

This note does **not** settle the exact implementation.

The remaining implementation design work is:

1. how the package-boundary helper should expose `deps` + `scope`
2. how the package-boundary helper should model the per-call `invocation` bag while staying close to native oRPC behavior
3. how to protect the seam with compile-only type tests so silent drift is caught immediately

## Current architectural conclusion

The current working conclusion is:

- keep a stable `deps` bag
- add/support a stable `scope` bag
- add/support a per-call `invocation` bag
- do not treat request/request-id style context as part of client construction
- use native oRPC client context for required invocation-scoped values when the package boundary should enforce them
- avoid arbitrary top-level spread and avoid a generic `metadata` junk drawer
