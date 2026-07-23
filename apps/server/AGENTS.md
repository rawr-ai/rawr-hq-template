# Server Application Router (`@rawr/server`)

## Scope

- Applies to the HTTP, oRPC, OpenAPI, and workflow host in `apps/server/**`.

## Boundaries

- Owns process bootstrap, host resource binding, route mounting,
  request-scoped context, host authentication, and host observability.
- Consumes application and plugin declarations; it must not choose domain
  policy, implement service procedures, or become an agent-plugin state owner.
- Internal RPC and published OpenAPI surfaces must derive from the same
  realized host composition rather than alternate router assembly.

## Flow

- Bootstrap resolves configuration and telemetry, then creates the host
  application.
- Host composition consumes the HQ manifest, binds satisfiers, and materializes
  declared service surfaces.
- Route handlers create request context, enforce host policy, and delegate to
  the realized oRPC or OpenAPI router.

## Routing

- [Apps router](../AGENTS.md)
- [HQ application declarations](../hq/AGENTS.md)
- [Runtime context contracts](../../packages/runtime-context/AGENTS.md)
- [HQ SDK](../../packages/hq-sdk/AGENTS.md)

## Validation

- `bunx nx run @rawr/server:lint`
- `bunx nx run @rawr/server:typecheck`
- `bunx nx run @rawr/server:test`
- `bunx nx run @rawr/server:build`
