# HQ Journal Module Router

## Purpose

- Persist operational events and reusable snippets and make the snippet
  collection retrievable and searchable.

## Scope

- Applies to journal writes, reads, tails, and search behavior in this module
  directory.

## Boundaries

- Journal owns record shape, indexing, FTS and semantic ranking policy, and
  bounded query behavior.
- SQLite, filesystem, time, and embedding mechanics remain behind host
  resources; journal results do not become product or architecture authority.

## Behavior

- The module writes events and snippets, retrieves snippets by id or recency,
  and executes bounded full-text or semantic searches with an explicit warning
  when the requested mode cannot be honored.

## Concepts

- A **journal event** is append-only operational history. A **snippet** is
  reusable textual knowledge with tags; a **search row** is the ranked,
  bounded projection returned by FTS or semantic search.

## Flow

- Writes persist the canonical record and update owned indexes. Reads and
  searches query those indexes, load the necessary snippet facts, and return a
  typed result in the requested mode.

## Interfaces

- Write-event, write-snippet, get, tail, and search operations form the caller
  surface. SQLite and embedding capabilities are the persistence and semantic
  mechanics interfaces.

## Routing

- [HQ Operations service router](../../../../AGENTS.md)
- [Configuration module](../config/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/hq-ops:typecheck`.
- Run `bunx nx run @rawr/hq-ops:test` for persistence, indexing, full-text and
  semantic ranking, result bounds, and fallback behavior.
