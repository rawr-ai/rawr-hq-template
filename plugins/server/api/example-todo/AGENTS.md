# Example Todo API Plugin Router

## Scope

- Applies to `plugins/server/api/example-todo/**`; inherit the
  [plugin package router](../../../AGENTS.md).
- This package owns the reusable HTTP and OpenAPI projection for the Example
  Todo service boundary.

## Boundaries

- The plugin owns route metadata, the public API contract projection, request
  context requirements, and the API router contribution. Todo state and policy
  remain in `@rawr/example-todo`.
- Derive API procedures from the public service contract. Do not copy service
  schemas, import service implementation paths, or introduce a second DTO
  authority.
- The host supplies `ExampleTodoClientResolver`; this package must not
  construct concrete repositories, providers, Elysia handlers, or application
  runtime state.
- Router handlers forward trace context and delegate directly to the sealed
  service client. HTTP projection must not absorb service lifecycle behavior.

## Flow

- The app host binds a Todo client resolver, the plugin contributes its
  contract and router, request context supplies `repoRoot` and trace data, and
  the selected handler invokes the corresponding public Todo procedure.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [API contract projection](src/contract.ts)
- [Host contribution boundary](src/server.ts)

## Validation

- Run `bunx nx run plugin-server-api-example-todo:lint`.
- Run `bunx nx run plugin-server-api-example-todo:typecheck`.
- Run `bunx nx run plugin-server-api-example-todo:structural` when contract,
  router, exports, or host-contribution topology changes.
