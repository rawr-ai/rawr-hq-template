# Example Todo API Module Router

## Purpose

- Project the Example Todo capability into stable HTTP and OpenAPI operations.

## Scope

- Applies to the Example Todo projection within the embedded API plugin.

## Boundaries

- This module owns route metadata and transport delegation. Todo schemas,
  policy, persistence, and declared domain failures remain in
  `@rawr/example-todo`.
- The host supplies repository-scoped client resolution. The module curates
  only the resolved client and correlation identity required by its handlers.

## Behavior

- The module preserves the domain contract, adds HTTP route metadata, forwards
  trace context, and returns domain results unchanged.

## Concepts

- An **API projection** adds transport metadata to a domain operation. A
  **repository-scoped client** selects the domain-service instance without
  leaking host context into operation handlers.

## Flow

- Host context enters the service middleware, which resolves the Todo client.
  The module curates that client and correlation identity. Task handlers then
  delegate create and get operations to the domain service.

## Interfaces

- POST task-create and GET task-by-id are the transport interfaces. The public
  Todo client is the sole domain interface behind both handlers.

## Routing

- [Example Todo API plugin router](../../../../AGENTS.md)
- [Example Todo domain service](../../../../../../../../services/example-todo/AGENTS.md)

## Validation

- Run `bunx nx run plugin-server-api-example-todo:check`.
- Run `bun habitat check --rule require_api_server_plugin_boundary` when the
  containing API-plugin topology changes.
