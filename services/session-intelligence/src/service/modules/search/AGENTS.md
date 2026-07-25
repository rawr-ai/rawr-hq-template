# Session Search Module Router

## Purpose

- Provide bounded metadata, content, and facet discovery over local sessions
  and maintain the service-owned search-text index.

## Scope

- Applies to search, faceting, reindex, and clear-index behavior in this module
  directory.

## Boundaries

- Search owns query interpretation, regex failures, facet extraction and
  filtering, candidate bounds, cache freshness, pruning, and result ranking.
- Session discovery and transcript normalization remain sibling authorities;
  filesystem and SQLite mechanics remain behind source and index runtimes.

## Behavior

- The module searches metadata without unnecessary content reads, performs
  bounded content scans with optional cache, derives visible structural
  facets, and reindexes or clears cached search text through the index port.

## Concepts

- A **search hit** is a bounded matched projection. **Facets** are extracted
  structural tags and directives; **candidate limit** bounds sessions scanned
  while result and match limits bound returned output. The **search-text
  cache** is an acceleration, not query authority.

## Flow

- The module gathers filtered candidates, applies facet and query policy,
  obtains normalized searchable text from source or cache, ranks bounded
  results, and updates cache state only through explicit index operations.

## Interfaces

- `metadata`, `content`, `facets`, `reindex`, and `clearIndex` are caller
  operations. Session-source and session-index runtimes are the mechanics
  handoffs.

## Routing

- [Session Intelligence service router](../../../../AGENTS.md)
- [Session catalog module](../catalog/AGENTS.md)
- [Transcript module](../transcripts/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/session-intelligence:typecheck`.
- Run `bunx nx run @rawr/session-intelligence:test` for metadata isolation,
  regex handling, content/cache parity, facets and candidate bounds, reindex,
  freshness, and index clearing.
