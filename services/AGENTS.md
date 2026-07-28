# Service Packages Router

## Purpose

- Host reusable domain capabilities behind sealed oRPC contracts and public
  clients.

## Scope

- Applies to `services/**`; inherit the
  [RAWR HQ-Template router](../AGENTS.md).
- A service package owns one domain capability suite and its private modules,
  policy, persistence semantics, and implementation.

## Boundaries

- Services are sealed. Consumers use the public client face and never reach
  into `src/service/**` for contracts, schemas, DTOs, entities, errors, stores,
  or routers.
- A service owns domain decisions and state transitions, not transport,
  workflow identity, provider construction, or runtime mounting.
- Ready outside capabilities enter through root context. Named middleware may
  derive, guard, enrich, or project from them. Each module terminally curates the
  smallest operation vocabulary it needs.
- Service-root entities own cross-module identity and invariants. Module
  entities remain subdomain-specific. DTOs project boundary exchanges; the
  optional root database owns migrations, physical mappings, and private
  stores.
- Expected public failures belong to the owning oRPC contract and cross the
  operation boundary through native error constructors.

## Behavior

- A service validates caller intent, applies domain policy, coordinates ready
  capabilities, and returns only its declared results and failures.

## Concepts

- A **service** owns one capability suite. A **module** owns one subdomain. An
  **entity** carries domain identity and lifecycle. A **DTO** projects a
  boundary exchange. A **store** privately realizes persistence.

## Flow

- Host resources descend through base context, root middleware, a configured
  module branch, optional module middleware, terminal curation, and the
  operation handler. Contract and router directories ascend only through their
  index faces to the service composition spines.

## Interfaces

- Public clients and contracts are consumer interfaces. Host context is the
  capability input. Module contract and router indexes are private composition
  interfaces inside the service.

## Routing

- [[../.habitat/blueprints/service/skill|Service capability funnel]]
- [[../.habitat/blueprints/service/README|Service structure law]]
- [[../.habitat/blueprints/database/skill|Database capability funnel]]
- [[../.habitat/AUTHORITY|Habitat authority]]

## Validation

- Use the owning Nx project's `check` and behavior tests. Habitat owns
  topology and source relations; TypeScript owns context and router types;
  tests own runtime behavior.
