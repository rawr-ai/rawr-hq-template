# Server Application Router (`@rawr/server`)

## Purpose

- Realize an HQ application as the local HTTP, oRPC, OpenAPI, and workflow
  host.

## Scope

- Applies to the HTTP, oRPC, OpenAPI, and workflow host in `apps/server/**`.

## Boundaries

- Owns process bootstrap, host resource binding, route mounting,
  request-scoped context, host authentication, and host observability.
- Owns the executable process host exposed through `./host`; the HQ app owns
  declaration and process-role selection.
- Consumes application and plugin declarations; it must not choose domain
  policy, implement service operations, or become an agent-plugin state owner.
- Internal RPC and published OpenAPI surfaces must derive from the same
  realized host composition rather than alternate router assembly.

## Behavior

- The server binds host resources and request policy around declared
  capabilities, then delegates each admitted request to the realized service
  or plugin route.

## Concepts

- **Host composition** is the resolved set of declarations, resources, and
  route contributions. **Request context** projects ready dependencies,
  repository scope, host configuration, and invocation identity into services.

## Flow

- Bootstrap resolves configuration and telemetry, then creates the host
  application.
- Host composition consumes app-selected declarations, binds satisfiers, and
  materializes declared service surfaces.
- Process start listens only after bootstrap has returned the fully composed
  server.
- RPC, OpenAPI, and workflow adapters create the same canonical context lanes.
  Service middleware enriches those lanes before module-curated handlers run.

## Interfaces

- HQ manifests and plugin contributions enter through composition APIs;
  resource satisfiers enter through host bindings; HTTP, internal RPC,
  published OpenAPI, and workflows are the server's outward interfaces.

## Routing

- [Apps router](../AGENTS.md)
- [HQ application declarations](../hq/AGENTS.md)
- [Runtime context contracts](../../packages/runtime-context/AGENTS.md)
- [HQ SDK](../../packages/hq-sdk/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/server:typecheck`
- `bunx nx run @rawr/server:test`
- `bunx nx run @rawr/server:build`
