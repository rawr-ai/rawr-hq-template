# Session Catalog Module Router

## Purpose

- Discover local agent sessions and resolve a caller-selected session to its
  normalized location and metadata.

## Scope

- Applies to session listing and resolution in this module directory.

## Boundaries

- Catalog owns candidate filtering, ordering, source-specific identity
  resolution, and metadata normalization.
- Transcript message extraction, query semantics, facets, and index policy
  belong to sibling modules; provider filesystem mechanics remain in the
  session-source runtime.

## Behavior

- The module lists bounded sessions across selected sources with normalized
  metadata and newest-first ordering, and resolves an explicit path or
  source-specific id to one session or a declared format/not-found failure.

## Concepts

- A **session source** identifies Codex or Claude storage. A **catalog item**
  is a bounded metadata summary; a **resolved session** combines canonical
  path, source, status, and detailed metadata.

## Flow

- List applies source and metadata filters to source-runtime candidates.
  Resolve interprets caller identity under source-specific rules, loads the
  matching metadata, and returns the stable reference.

## Interfaces

- `list` and `resolve` are caller operations. The session-source runtime is the
  discovery and metadata mechanics interface.

## Routing

- [Session Intelligence service router](../../../../AGENTS.md)
- [Transcript module](../transcripts/AGENTS.md)
- [Search module](../search/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/rawr-session-intelligence:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-session-intelligence:test` for source detection,
  filters, ordering, path and id resolution, and typed failures.
