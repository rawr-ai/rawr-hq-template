# Runtime Context Router (`@rawr/runtime-context`)

## Purpose

- Define the shared type vocabulary for host support and invocation context
  after runtime capabilities have been bound.

## Scope

- Applies to shared runtime support types in `packages/runtime-context/**`.

## Boundaries

- Owns type-only host, request, middleware-state, and workflow support
  contracts used after host binding.
- Must not own application declarations, resource construction, operation
  policy, executable assembly, or compatibility aliases for domain context.
- Context fields describe ready host support; domain services narrow them to
  the capabilities each operation actually consumes.

## Behavior

- Runtime context types carry already-resolved process and request facts across
  middleware and router boundaries without constructing resources or choosing
  domain behavior.

## Concepts

- **Host context** is process-scoped support; **request context** adds
  invocation identity; **middleware state** is the typed contribution produced
  while a request crosses host policy.

## Flow

- A host constructs process-scoped support and then adds request identity and
  middleware state at its transport boundary.
- Service routers consume the resulting typed context without importing the
  host implementation.

## Interfaces

- Hosts construct values conforming to these contracts; middleware extends
  them; service routers consume narrowed views through type-only imports.

## Routing

- [Packages router](../AGENTS.md)
- [Server host](../../apps/server/AGENTS.md)
- [HQ SDK](../hq-sdk/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/runtime-context:typecheck`
- `bunx nx run @rawr/runtime-context:test`
- `bunx nx run @rawr/runtime-context:build`
