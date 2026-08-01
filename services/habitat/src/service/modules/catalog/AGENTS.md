# Habitat Catalog Module Router

## Purpose

- Admit local Habitat authority, resolve applications, and check their rules.

## Scope

- Applies to the catalog module's contract, model, and grouped router handlers.

## Boundaries

- Router handlers own filesystem observation and operation sequencing. Module
  policy owns deterministic classification, schema admission, path semantics,
  duplicate refusal, application resolution, selection, and result meaning.
- The module consumes ready evaluator and source-inventory resources but does
  not select or construct providers or persist a catalog. The admitted version
  2 subset resolves into the same provider-neutral runner model as version 3.

## Behavior

- `resolve` returns a closed resolved/rejected result and never hides expected
  repository, parse, schema, or semantic failures as defects.
- `check` intersects selectors over version 3 applications and distinct
  version 2 compatibility rules, then evaluates both through the same Grit and
  native Habitat structure paths. Compatibility Grit acquisition is narrowed
  to live regular files matching its exact-path coverage.

## Concepts

- Authority paths, resolved applications, and mechanical findings are observed
  facts interpreted by pure catalog policy.

## Flow

- The module curates filesystem, path, evaluator, inventory, and workspace-root
  vocabulary. The grouped router leaf resolves exact sources before either
  returning the catalog or selecting and evaluating applications.

## Interfaces

- The module exposes only its contract and composed router to the service root.

## Routing

- [[../../../../AGENTS|Habitat service router]]

## Validation

- Run the Habitat service typecheck, behavior tests, and build.
