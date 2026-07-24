# Runtime Context Router (`@rawr/runtime-context`)

## Scope

- Applies to shared runtime support types in `packages/runtime-context/**`.

## Boundaries

- Owns type-only host, request, middleware-state, and workflow support
  contracts used after host binding.
- Must not own application declarations, resource construction, procedure
  policy, executable assembly, or compatibility aliases for domain context.
- Context fields describe ready host support; domain services narrow them to
  the capabilities each procedure actually consumes.

## Flow

- A host constructs process-scoped support and then adds request identity and
  middleware state at its transport boundary.
- Service routers consume the resulting typed context without importing the
  host implementation.

## Routing

- [Packages router](../AGENTS.md)
- [Server host](../../apps/server/AGENTS.md)
- [HQ SDK](../hq-sdk/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/runtime-context:typecheck`
- `bunx nx run @rawr/runtime-context:test`
- `bunx nx run @rawr/runtime-context:build`
