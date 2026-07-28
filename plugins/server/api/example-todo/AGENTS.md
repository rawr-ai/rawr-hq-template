# Example Todo API Plugin Router

## Purpose

- Publish the Example Todo capability as reusable HTTP and OpenAPI operations
  without creating a second todo domain.

## Scope

- Applies to `plugins/server/api/example-todo/**`; inherit the
  [plugin package router](../../../AGENTS.md).
- This package owns the reusable HTTP and OpenAPI projection for the Example
  Todo service boundary.

## Boundaries

- The plugin owns route metadata, the public API contract projection, request
  context requirements, and the API router contribution. Todo state and policy
  remain in `@rawr/example-todo`.
- Derive API operations from the public service contract. Do not copy service
  schemas, import service implementation paths, or introduce a second DTO
  authority.
- The host supplies a ready Todo client resolver under `deps`; this package must not
  construct concrete repositories, providers, Elysia handlers, or application
  runtime state.
- Router handlers forward trace context and delegate directly to the sealed
  service client. HTTP projection must not absorb service lifecycle behavior.

## Behavior

- The plugin derives transport metadata from the service contract. Root
  middleware resolves one repository-scoped client per request, and the
  Example Todo module curates only that client and correlation identity for
  its task handlers.

## Concepts

- An **API projection** adds HTTP route identity to a domain operation. A
  **client resolver** selects the sealed Todo client for request scope; a
  **trace-forwarding context** preserves observability across the handoff.

## Flow

- The app host contributes `deps`, `scope`, `config`, and `invocation`. The
  plugin starts with an empty `provided` lane; root middleware contributes the
  resolved client; module composition narrows the context; task handlers invoke
  the corresponding public Todo operation.

## Interfaces

- `api.ts` contributes the declared surface to the host; `client.ts` exposes
  the caller face; the public Example Todo client remains the sole interface
  to task behavior and state.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [Caller-facing client](src/client.ts)
- [API contribution boundary](src/api.ts)
- [Embedded service contract](src/service/contract.ts)
- [Example Todo API module](src/service/modules/example-todo/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint`.
- Run `bunx nx run plugin-server-api-example-todo:typecheck`.
- Run `bunx nx run plugin-server-api-example-todo:structural` when contract,
  router, exports, or host-contribution topology changes.
