# Example Todo Service Router

## Purpose

- Serve as a complete reference domain for creating tasks and tags and
  relating them through assignments.

## Scope

- Applies to `services/example-todo/**`.
- This reference oRPC service owns todo tasks, tags, assignments, and their
  domain policy.

## Boundaries

- Consumers cross through declared package exports; module contracts, routers,
  helpers, and service context remain package-owned.
- Tasks, tags, and assignments own their operation behavior and declared
  errors. Cross-module primitives belong in `service/common` only when they
  are genuinely shared.
- Hosts provide database, clock, logging, and analytics capabilities; this
  package does not own runtime mounting or transport presentation.

## Behavior

- The service validates caller intent, enforces task, tag, assignment, and
  read-only policy, persists through the supplied database, and returns
  declared domain failures.

## Concepts

- A **task** is actionable work, a **tag** is reusable classification, and an
  **assignment** is the constrained relation between them. **Read-only mode**
  is service policy, not a database feature.

## Flow

- A host constructs the service client with stable dependencies, scope, and
  configuration; middleware establishes execution context; the owning module
  applies todo policy and persists through the supplied database capability.

## Interfaces

- Module contracts compose the public oRPC service face; database, clock,
  logging, and analytics capabilities enter through host context; API and CLI
  projections consume the sealed client.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Common-area boundary](src/service/common/README.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` when todo behavior changes.
