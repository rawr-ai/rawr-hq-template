# ChatGPT Corpus Artifacts Module Router

## Purpose

- Derive the canonical inventories, graphs, normalized threads, diagnostics,
  and navigational documents that make a source snapshot usable as a corpus.

## Scope

- Applies to artifact construction, validation, and materialization in this
  module directory.

## Boundaries

- Corpus artifacts interprets normalized snapshots but does not discover raw
  sources or define workspace infrastructure.
- Materialization writes only the declared artifact bundle through the
  workspace store; generated reports do not become unrelated architecture
  authority.

## Behavior

- The module builds deterministic source inventory and relationship views,
  records anomalies and ambiguity, validates the bundle, and materializes only
  an admitted result.

## Concepts

- A **family graph** groups related conversations; a **normalized thread**
  stabilizes message structure; the **manifest** indexes outputs; **anomalies**
  and **ambiguity flags** preserve uncertainty rather than hiding it.

## Flow

- Build accepts a source snapshot and returns an in-memory canonical bundle.
  Materialize obtains the workspace inputs, rebuilds and validates that bundle,
  then writes its declared directories and entries.

## Interfaces

- `build` is the deterministic derivation boundary. `materialize` crosses the
  workspace-store port and returns written-entry observations or declared
  validation and source failures.

## Routing

- [ChatGPT Corpus service router](../../../../AGENTS.md)
- [Source-material snapshot module](../source-materials/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/chatgpt-corpus:typecheck`.
- Run `bunx nx run @rawr/chatgpt-corpus:test` for canonical graphs, reports,
  empty input, validation, and materialized output.
