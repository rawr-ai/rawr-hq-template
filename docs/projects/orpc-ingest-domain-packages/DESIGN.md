# Design

Role: conceptual seam/axis map

## Quick Map

Problem:

- multiple seams were being conflated into one dependency/context question

Working map:

```text
composition inputs
  -> provisioning
  -> module projection
  -> handlers
```

Use this document for:

- seam vocabulary
- axis vocabulary
- ownership framing
- the narrow decision that still remains

## Locked Building Blocks

These are locked enough to use as anchors for the remaining design work:

1. Telemetry is a base cross-cutting capability, not a service-local concern.
2. Plugins should not be expected to instantiate raw telemetry clients by
   default.
3. If a capability is host-owned and lifecycle-sensitive, centralized
   provisioning is preferred over per-caller manual construction.
4. `provided` remains a valid staging seam for generated runtime capabilities.
5. Module projection stays the handler ergonomics answer, independent of the
   telemetry decision.

## Still-Live Decisions

These are the active unresolved decisions. Keep them separate:

1. Does analytics follow telemetry, or differ on purpose?
2. Do we need a separate top-level host lane, or can merged deps still work if
   semantics are tightened?

## Status

This document is an active design map for the current adapter / provider /
service-boundary discussion.

It does **not** yet replace the broader architecture already recorded across:

- `DECISIONS.md`
- `guidance.md`
- `examples.md`

Some of the current design still lives there, and some of the active design
work still lives in the durable core docs. We will consolidate later when the
open seams are resolved.

For now, this file exists to make the design space legible enough to actually
finish the remaining decisions.

## Document Status Map

Use this map to avoid treating every doc in this packet as equally current.

### Active / Canonical

- `ACTIVE_GROUNDING.md`
  - current worker brief for the active integration/design round
- `DECISIONS.md`
  - durable architecture decisions that are already locked
- `guidance.md`
  - durable operating conventions and implementation guidance
- `examples.md`
  - scaffold/example shape for the package family; active but should stay
    example-oriented rather than absorbing every design discussion
- `DESIGN.md`
  - structural seam/axis map for the remaining unresolved design work
- `TELEMETRY_DESIGN.md`
  - canonical telemetry architecture
- `TELEMETRY_MIGRATION_IMPLEMENTATION_PLAN.md`
  - retained as the authoritative migration/execution record for telemetry

### Partially Relevant / Needs Reconciliation Before Reuse

- `ADAPTER_POSTURE.md`
  - still useful for ports/adapters/provider ownership lines, but should be
    reread carefully before lifting wording into future canonical docs
- `SERVICE_CONTEXT_SEMANTICS_MINI_SPEC.md`
  - still useful for the service-context cleanup that landed, but parts of it
    still reflect the earlier telemetry seam and pre-telemetry-migration packet
    state

### Supporting Workflow / Process References

- `ADAPTER_AGENT_WORKFLOW.md`
- `ADAPTER_ORCHESTRATION_WORKFLOW.md`

These are still useful process references, but they are not architecture truth
for the current seams.

## Integration Guidance

When consolidating later:

- pull durable seam language from `DESIGN.md`, `DECISIONS.md`, `guidance.md`,
  and `TELEMETRY_DESIGN.md`
- treat `examples.md` as the place to reflect settled scaffold shape, not as
  the place to resolve active design knots
- mine `SERVICE_CONTEXT_SEMANTICS_MINI_SPEC.md` only for service-context
  semantics that still match the live SDK
- once the remaining seams are locked, sharply mark or archive docs that are
  only preserving earlier working-state reasoning

## What Problem This Document Solves

The discussion kept looping because we were treating several different seams as
one problem.

The actual problem is not just "how do we model dependencies?"

It is:

- what gets supplied at composition time
- what middleware provisions during execution
- what modules project for handler use
- what handlers should actually author against

If those seams are not separated, every term in the discussion starts carrying
multiple meanings at once.

## The Four Seams

```text
caller/plugin
  -> composition input seam
  -> provisioning seam
  -> module projection seam
  -> handler authoring seam
```

### 1. Composition Input Seam

This is the boundary before execution starts.

It is where callers supply:

- `deps`
- `scope`
- `config`
- `invocation`

This seam is about honest construction/composition semantics, not handler
ergonomics.

### 2. Provisioning Seam

This is where provider middleware turns upstream inputs into provisioned runtime
capabilities.

Today that seam is represented by `context.provided.*`.

Example:

```text
deps.dbPool -> sqlProvider -> provided.sql
```

### 3. Module Projection Seam

This is where each module decides what its procedures should actually use.

Example:

```text
provided.sql -> tasks module projects repo
deps.clock   -> tasks module projects clock
scope.workspaceId -> tasks module projects workspaceId
```

### 4. Handler Authoring Seam

This is the context shape that procedure authors read directly.

The key conclusion from the recent discussion is:

- handler ergonomics should be solved here
- not by forcing the composition seam to also be the handler seam

## The Main Structural Picture

```text
composition inputs
  -> provider middleware
  -> provisioned runtime capability
  -> module-local projection
  -> procedure handlers
```

Concrete example:

```text
deps.dbPool
  -> sqlProvider
  -> provided.sql
  -> tasks/setup.ts projects repo
  -> tasks/router.ts uses context.repo
```

This is the main architecture picture that survived the full discussion.

## Telemetry Grounding

Telemetry is now resolved enough that it no longer belongs in the main
unresolved seam map.

Canonical telemetry model:

```text
host bootstrap
  -> installRawrOrpcTelemetry(...)
  -> ORPCInstrumentation activates spans
  -> service/package observability reads the active span from OTel context
```

For telemetry-specific architecture and migration details, use
`TELEMETRY_DESIGN.md` and `TELEMETRY_MIGRATION_IMPLEMENTATION_PLAN.md`.

See `TELEMETRY_DESIGN.md` for the target telemetry model that supersedes this
package-local seam.

## Terms That Kept Getting Overloaded

### `host`

`host` means the runtime authority that owns shared wiring/defaults.

Today:

- the shared plugin server/runtime is the host

Later:

- a promoted standalone service runtime could also become a host

Important:

- a plugin is not automatically the host
- a caller is not automatically the host

### `plugin`

A plugin is a consumer/composer running on a host.

A plugin may supply config or choose a variant, but that alone does not make it
the host.

### `caller`

`caller` means "the thing constructing/using a service client at a seam."

That may be:

- a plugin
- a host composition layer
- another internal composer

`caller` is a positional term, not an ownership term.

### `port`

A port is the contract at a seam.

There are at least two relevant kinds:

- **capability port**
  - example: `AnalyticsClient`
- **provisioning-input port**
  - example: `AnalyticsInput`

The conversation kept looping because both are "ports," but they live at
different levels of the system.

The analytics decision still uses this distinction directly. Telemetry is now
specified separately in `TELEMETRY_DESIGN.md`.

### `adapter`

An adapter is a concrete implementation or binding of a port.

Examples:

- provisioning logic that turns an analytics input port into an analytics
  capability

### `dependency`

Best read as:

- an upstream composition requirement

Not:

- "the thing handlers should directly use"

This is why a broad `deps` bag can be compositionally useful while still being
bad as a direct handler surface.

### `provided`

Best read as:

- a provisioned/generated runtime capability attached during middleware

Not:

- generic extra context

Current example:

```text
deps.dbPool -> provided.sql
```

### `client`

This term is overloaded.

It can mean:

- a concrete capability client like PostHog / OpenTelemetry
- the oRPC/router client used to call the domain package

Those meanings must stay separate in docs and design decisions.

## The Axes That Matter

### Seam Axis

Which seam are we talking about?

- composition input
- provisioning
- module projection
- handler authoring

### Ownership Axis

Who owns defaults and wiring?

- host
- plugin
- service package

### Input-Form Axis

What is the upstream contract for a capability?

- ready capability/client
- provisioning input/config

For analytics and other unresolved capabilities, this remains an active axis.

### Variability Axis

Where does variation happen?

- host-wide
- per-plugin
- per-call

### Timing Axis

When does a value exist?

- before execution
- during provider middleware
- after module projection

### Ergonomics Axis

Who is this shape optimized for?

- composition honesty
- handler authoring clarity

Much of the earlier confusion came from trying to solve multiple axes with one
shape.

## The Crisp Ownership Rule

A host owns an adapter when it owns:

- the standard wiring/defaults
- the approved way that capability is created

That can still be true even if:

- a plugin passes config that changes the instance
- middleware instantiates the final client
- the resulting instance is plugin-scoped

Examples:

- host-owned adapter family + plugin-scoped config = still mostly host-owned
- plugin manually instantiates a client outside host wiring = plugin-owned
  instance and effectively plugin-owned adapter choice

## The Key Decision Question For Any Capability

For each capability, ask:

```text
Should the domain/system boundary depend on:
- the ready capability?
or
- the inputs needed to provision that capability?
```

That is the real design question.

Not:

- "ports or adapters?"
- "host or plugin?"

Those questions matter, but they are secondary to this seam choice.

## What We Already Learned

### 1. Module projection solves handler ergonomics

The module projection pass established the right local authoring pattern:

- handlers should not have to reason directly about raw `deps/scope/config/provided`
- modules should project the keys their handlers actually use

This is now live in the `example-todo` module setup files.

### 2. `provided` may be the useful staging seam

We have **not** resolved `provided` as a final concept, but we did learn:

- `provided` is not obviously the problem
- it may actually be the right place for provisioned/generated runtime
  capabilities

### 3. The unresolved question is narrower than it seemed

The remaining core question is:

```text
For analytics and similar non-telemetry seams, should baseline/service
middleware depend on:
- ready capabilities
or
- provider-produced capabilities?
```

That is the real seam that still needs a decision.

## Current Likely Shape

Near-term, the most coherent working shape looks like:

```text
deps      = upstream composition inputs
provided  = provider-generated runtime capabilities
modules   = local projection for handler ergonomics
handlers  = projected module context only
```

This is already true for SQL in spirit:

```text
deps.dbPool -> provided.sql -> module repo projection -> handlers
```

What is still open is whether analytics should follow that same pattern more
fully.

## What This Implies For The Next Decision

The next useful decision should not try to solve the whole architecture at
once.

It should answer one narrow design question:

```text
Should baseline analytics be rewritten to consume provider-generated
capabilities from `provided.*`, or should it continue to depend on direct
upstream capability inputs?
```

That decision will determine:

- what analytics ports should mean
- whether callers should pass ready clients or provisioning inputs
- and how much baseline middleware ordering needs to change for analytics

## Relationship To Other Docs

- `DECISIONS.md`
  - locked boundaries / hard choices
- `guidance.md`
  - operating conventions and current implementation guidance
- `examples.md`
  - worked scaffold shape and example progression
- `TELEMETRY_DESIGN.md`
  - canonical telemetry architecture and migration target

This file should be treated as the clean structural map that makes those other
docs easier to reason from, not as a replacement for them.
