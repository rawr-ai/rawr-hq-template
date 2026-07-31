# Habitat Catalog Module Router

## Purpose

- Admit local Habitat authority, resolve applications, and check their rules.

## Scope

- Applies to the catalog module's contract, model, and grouped router handlers.

## Boundaries

- Router handlers own filesystem observation and operation sequencing. Module
  policy owns deterministic classification, schema admission, path semantics,
  duplicate refusal, application resolution, selection, and result meaning.
- The module consumes a ready evaluator but does not select or construct its
  provider, persist a catalog, or reproduce the version 2 runner model.

## Behavior

- `resolve` returns a closed resolved/rejected result and never hides expected
  repository, parse, schema, or semantic failures as defects.
- `check` intersects selectors over resolved version 3 applications, evaluates
  selected Grit checks, and refuses unsupported runner kinds before execution.

## Concepts

- Authority paths, resolved applications, and mechanical findings are observed
  facts interpreted by pure catalog policy.

## Flow

- The module curates filesystem, path, evaluator, and workspace-root
  vocabulary. The grouped router leaf resolves exact sources before either
  returning the catalog or selecting and evaluating applications.

## Interfaces

- The module exposes only its contract and composed router to the service root.

## Routing

- [[../../../../AGENTS|Habitat service router]]

## Validation

- Run the Habitat service typecheck, behavior tests, and build.
