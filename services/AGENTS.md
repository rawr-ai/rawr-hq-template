# Service Packages Router

## Purpose

- Host reusable domain capabilities behind sealed oRPC contracts and public
  clients.

## Scope

- Applies to `services/**`; inherit the
  [Habitat repository router](../AGENTS.md).
- A service package owns one domain capability suite and its private modules,
  policy, persistence semantics, and implementation.

## Boundaries

- Services are sealed. Consumers use the public client face and never reach
  into `src/service/**` for contracts, schemas, DTOs, entities, errors, stores,
  or routers.
- A service owns domain decisions and state transitions, not transport,
  workflow identity, provider construction, or runtime mounting.
- Ready outside capabilities enter through root context. Named middleware may
  derive, guard, enrich, or project from them. Root middleware is a direct leaf
  set attached in `impl.ts`; input-independent module policy attaches in
  `module.ts`, input-independent group policy at its grouped router leaf, and
  validated-input policy at each consuming procedure after its schema. Each
  module terminally curates the smallest operation vocabulary it needs.
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
- Awkward service composition triggers an ownership check for a hidden neutral
  resource, sibling domain service, exposure plugin, or runtime application
  concern. Size alone does not trigger extraction.

## Flow

- Host resources descend through base context, root middleware, a configured
  module branch, optional module middleware, terminal curation, and the
  operation handler. Contract leaves ascend through their directory index.
  Router leaves ascend through the module-root `router.ts`, which is the
  module's sole router composition face.

## Interfaces

- Public clients and contracts are consumer interfaces. Host context is the
  capability input. Module contract indexes and module-root routers are private
  composition interfaces inside the service.

## Routing

- [[../.habitat/blueprints/service/skill|Service capability funnel]]
- [[../.habitat/blueprints/service/README|Service structure law]]
- [[../.habitat/AUTHORITY|Habitat authority]]

## Validation

- Use the owning Nx project's `check` and behavior tests. Habitat owns
  topology and source relations; TypeScript owns context and router types;
  tests own runtime behavior.
