# Session Intelligence Service Router

## Scope

- Applies to `services/session-intelligence/**`.
- This oRPC service owns session catalog, transcript extraction, search,
  faceting, and service-owned index policy.

## Boundaries

- Consumers cross through declared package exports; module contracts, routers,
  search policy, and index queries remain package-owned.
- Hosts provide session-source and generic index runtimes. They do not decide
  session interpretation, table shape, query policy, freshness, or pruning.
- Concrete filesystem and SQLite construction belongs in the consuming
  plugin, app, or runtime surface.

## Flow

- A host supplies source and index capabilities; the public router selects the
  catalog, transcript, or search module; that module interprets session data
  and returns typed results through the service boundary.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Common-area boundary](src/service/common/README.md)

## Validation

- Run `bunx nx run @rawr/session-intelligence:lint` and
  `bunx nx run @rawr/session-intelligence:typecheck`.
- Run `bunx nx run @rawr/session-intelligence:test` when session behavior
  changes.
