# Session Intelligence Service Router

## Purpose

- Make local Codex and Claude sessions discoverable, interpretable, and
  searchable without exposing provider storage details to consumers.

## Scope

- Applies to `services/session-intelligence/**`.
- This oRPC service owns session catalog, transcript extraction, search,
  faceting, and service-owned index policy.

## Boundaries

- Consumers cross only through the declared `/client` package export. The
  client exposes the callable surface, deliberate contract, DTO vocabulary,
  and host port types; module contracts, routers, search policy, and index
  queries remain private package-owned implementation.
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

- A host binds source and index capabilities through the public client; the
  private root router selects the catalog, transcript, or search module; that
  module interprets session data and returns typed results through the client
  boundary.

## Interfaces

- The public client exposes the catalog, transcript, and search contract as one
  callable surface. Session-source and session-index port types describe the
  handoffs to host-supplied filesystem and SQLite implementations.

## Routing

- [Repository router](../../AGENTS.md)
- [Public client face](src/client.ts)
- [Private service contract](src/service/contract.ts)
- [Service model DTO face](src/service/model/dto/index.ts)
- [Service model port face](src/service/model/ports/index.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @habitat-ai/rawr-session-intelligence:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-session-intelligence:test` when session behavior
  changes.
