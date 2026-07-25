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
- The host supplies `ExampleTodoClientResolver`; this package must not
  construct concrete repositories, providers, Elysia handlers, or application
  runtime state.
- Router handlers forward trace context and delegate directly to the sealed
  service client. HTTP projection must not absorb service lifecycle behavior.

## Behavior

- The plugin derives transport metadata from the service contract, resolves
  the repository-scoped client supplied by the host, and forwards each request
  with trace context.

## Concepts

- An **API projection** adds HTTP route identity to a domain operation. A
  **client resolver** selects the sealed Todo client for request scope; a
  **trace-forwarding context** preserves observability across the handoff.

## Flow

- The app host binds a Todo client resolver, the plugin contributes its
  contract and router, request context supplies `repoRoot` and trace data, and
  the selected handler invokes the corresponding public Todo operation.

## Interfaces

- `api.ts` contributes the declared surface to the host; `client.ts` exposes
  the caller face; the public Example Todo client remains the sole interface
  to task behavior and state.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [Caller-facing client](src/client.ts)
- [API contribution boundary](src/api.ts)
- [Embedded service contract](src/service/contract.ts)

## Validation

- Run `bunx nx run habitat:lint`.
- Run `bunx nx run plugin-server-api-example-todo:typecheck`.
- Run `bunx nx run plugin-server-api-example-todo:structural` when contract,
  router, exports, or host-contribution topology changes.
