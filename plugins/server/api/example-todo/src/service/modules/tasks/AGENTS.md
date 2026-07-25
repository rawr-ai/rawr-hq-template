# Example Todo Task API Module Router

## Purpose

- Project the Example Todo task capability into stable HTTP and OpenAPI create
  and get operations.

## Scope

- Applies to the task projection within the Example Todo API plugin.

## Boundaries

- This module owns route metadata and delegation only. Task schemas, policy,
  persistence, and declared domain failures remain in the public
  `@rawr/example-todo` contract.
- The host supplies repository-scoped client resolution; this module does not
  construct service repositories or transport runtime state.

## Behavior

- The module derives its two operation contracts from the sealed task
  operations, resolves the request-scoped Todo client, forwards trace context,
  and returns the service result unchanged.

## Concepts

- An **API operation projection** adds HTTP method, path, tags, and operation
  identity to a domain operation. A **repository-scoped client** selects the
  service instance; **trace forwarding** preserves request observability.

## Flow

- The plugin contributes the task contract and router, while the host binds the
  domain-client resolver. A matching request supplies repository and trace
  context; the module resolves the client and its handler delegates create or
  get to the task service.

## Interfaces

- POST task-create and GET task-by-id are the transport interfaces. The public
  Todo task client is the sole domain interface behind both handlers.

## Routing

- [Example Todo API plugin router](../../../../AGENTS.md)
- [Example Todo task domain module](../../../../../../../../services/example-todo/src/service/modules/tasks/AGENTS.md)

## Validation

- Run `bunx nx run plugin-server-api-example-todo:typecheck`.
- Run `bunx nx run plugin-server-api-example-todo:structural` for projection
  topology and `bunx nx run @rawr/example-todo:test` for task-domain behavior.
