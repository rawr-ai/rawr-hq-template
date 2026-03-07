# Domain Package Client Context Model

## Purpose

This note captures the current Phase 1 posture for domain-package client context
 in the proto oRPC SDK.

It is not an implementation plan. It is the working model we are standardizing
 so future agents do not regress into request-scoped framing, arbitrary
 top-level spread, or middleware-owned invocation contracts.

## Core correction

The earlier framing around `requestId` was wrong for this SDK.

A domain-package client is not intended to be a per-request object. It is an
in-process client created with concrete construction-time values and then
reused.

The important distinction is:

- stable per-client state
- per-invocation state

That is why `requestId` is the wrong exemplar for package-boundary context, and
 why `traceId` belongs in invocation-scoped client context instead.

## The lane model

The current model uses four semantic lanes.

### `deps`

Stable host-owned capabilities bound at client construction.

Examples:

- `logger`
- `analytics`
- `dbPool`
- `clock`

### `scope`

Stable business/client-instance scope bound at client construction.

Examples:

- `workspaceId`
- `tenantId`
- `projectId`

This is where we express what the client is scoped to.

### `config`

Stable package behavior/configuration bound at client construction.

Examples from `example-todo`:

- `readOnly`
- `limits.maxAssignmentsPerTask`

This is the lane for configuration that affects package behavior over the
client lifetime. It is not a generic metadata bucket.

### `invocation`

Per-call invocation input supplied through native oRPC client context.

Examples:

- `traceId`
- correlation ids
- other ephemeral call-scoped input

This is the lane for data that should vary per procedure call rather than being
baked into a reusable client instance.

## Reserved semantic lanes

The lane names themselves are reserved:

- `deps`
- `scope`
- `config`
- `invocation`

These lanes are input-only.

Middleware may:

- read them
- require fragments of them

Middleware may not:

- write to them
- replace them
- reshape them
- create top-level keys that shadow them

This is the hard boundary that keeps package-boundary input distinct from
execution-time derived context.

## Shared provider bucket

Shared/framework providers now write under a dedicated `provided` bucket.

Examples:

- `context.provided.sql`
- `context.provided.feedbackSession`

`provided` is a reserved top-level execution bucket:

- shared/framework providers may add values under it
- service-local providers may not write to it
- it exists to separate imported/shared provider output from service-local
  top-level execution keys

This keeps shared execution capabilities visible without treating them like
 semantic input lanes.

## Current package boundary

The canonical construction-time boundary is now:

```ts
createClient({
  deps,
  scope,
  config,
})
```

The canonical per-call invocation shape is:

```ts
await client.tasks.create(
  { title: "Ship phase one" },
  {
    context: {
      invocation: {
        traceId: "trace-123",
      },
    },
  },
)
```

This means:

- `deps`, `scope`, and `config` are bound once
- `invocation` is supplied per call
- the package boundary owns and type-enforces the invocation requirement

## Why native client context is locked

The locked repo posture is:

- use native oRPC client context for required invocation-scoped input
- do not use middleware-context as the domain-package boundary pattern here

The difference is not where tracing originates. The host can source tracing in
either model. The difference is where the invariant is expressed and enforced:

- native client context means the package boundary owns the invocation contract
- middleware-context means the host/runtime integration owns the invocation contract

For this repo, the package-owned contract is the intended default.

## Middleware-context posture in this repo

Middleware-context is a valid oRPC pattern in the abstract.

It is not a legitimate pattern for what this repo is doing right now.

Current repo posture:

- do not use middleware-context as a peer option for scaffold design
- do not hide required invocation input in host-only attachment conventions
- strongly discourage middleware-context unless the broader repository
  architecture changes enough to create a real need for it

There is no visible use case for middleware-context in the current model. It
can remain documented as a non-chosen oRPC alternative, but it is not the
pattern we are standardizing or demonstrating.

## What we are not doing

We are not using:

- arbitrary top-level spread at package construction
- top-level `requestId` / `workspaceId` style boundary inputs
- a generic runtime `metadata` bag

Why:

- arbitrary spread weakens scaffold consistency
- top-level request/runtime keys blur lifetime boundaries
- generic `metadata` becomes a junk drawer and overlaps conceptually with oRPC
  procedure metadata

## About `config`

`config` is now part of the active model.

This is no longer hypothetical in `example-todo`; Phase 1 uses it concretely
for:

- `config.readOnly`
- `config.limits.maxAssignmentsPerTask`

That makes the construction-time model:

- `deps`
- `scope`
- `config`

with `invocation` remaining per-call.

## Current `example-todo` grounding

Phase 1 now uses these examples to make the model real:

- `scope.workspaceId` partitions task/tag/assignment behavior
- `config.readOnly` drives the domain-wide read-only guard
- `config.limits.maxAssignmentsPerTask` enforces assignment policy
- `invocation.traceId` flows through native oRPC client context and is consumed
  by middleware inside the package
- shared SQL capability is attached as `context.provided.sql`
- module setup then derives domain-local top-level execution keys such as
  `repo`, `tasks`, and `tags`

That combination is intentional: the example package should show not only the
existence of the lanes, but also how they compose in realistic usage.
