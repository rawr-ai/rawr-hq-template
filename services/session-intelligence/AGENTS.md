# Session Intelligence Service Router

## Purpose

- Make local Codex and Claude sessions discoverable, interpretable, and
  searchable without exposing provider storage details to consumers.

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

## Behavior

- The service catalogs provider records, resolves and extracts normalized
  transcripts, evaluates metadata, content, and facet queries, and maintains a
  service-owned search index.

## Concepts

- A **session source** is provider-native storage. A **resolved session**
  combines location and metadata; a **normalized transcript** carries selected
  messages; **facets** and the **search index** support bounded discovery.

## Flow

- A host supplies source and index capabilities; the public router selects the
  catalog, transcript, or search module; that module interprets session data
  and returns typed results through the service boundary.

## Interfaces

- Catalog, transcript, and search contracts form the public oRPC surface;
  session-source and session-index ports are the handoffs to host-supplied
  filesystem and SQLite implementations.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Common-area boundary](src/service/common/README.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/session-intelligence:typecheck`.
- Run `bunx nx run @rawr/session-intelligence:test` when session behavior
  changes.
