# Habitat Catalog Module Router

## Purpose

- Admit local Habitat authority and resolve reusable rule applications.

## Scope

- Applies to the catalog module's contract, policy, and resolve handler.

## Boundaries

- The handler owns filesystem observation and operation sequencing. Module
  policy owns deterministic classification, schema admission, path semantics,
  duplicate refusal, and application resolution.
- The module does not evaluate applications, acquire providers, persist a
  catalog, or reproduce the version 2 runner model.

## Behavior

- `resolve` returns a closed resolved/rejected result and never hides expected
  repository, parse, schema, or semantic failures as defects.

## Concepts

- Authority paths and resolved path facts are service-observed evidence used by
  pure catalog policy.

## Flow

- The module curates filesystem, path, and workspace-root vocabulary. The
  resolve handler enumerates exact sources and observes referenced paths before
  policy closes the catalog.

## Interfaces

- The module exposes only its contract and composed router to the service root.

## Routing

- [[../../../../AGENTS|Habitat service router]]

## Validation

- Run the Habitat service typecheck, behavior tests, and build.
