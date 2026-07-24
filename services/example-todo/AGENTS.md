# Example Todo Service Router

## Scope

- Applies to `services/example-todo/**`.
- This reference oRPC service owns todo tasks, tags, assignments, and their
  domain policy.

## Boundaries

- Consumers cross through declared package exports; module contracts, routers,
  helpers, and service context remain package-owned.
- Tasks, tags, and assignments own their procedure behavior and declared
  errors. Cross-module primitives belong in `service/common` only when they
  are genuinely shared.
- Hosts provide database, clock, logging, and analytics capabilities; this
  package does not own runtime mounting or transport presentation.

## Flow

- A host constructs the service client with stable dependencies, scope, and
  configuration; middleware establishes execution context; the owning module
  applies todo policy and persists through the supplied database capability.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Common-area boundary](src/service/common/README.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` when todo behavior changes.
