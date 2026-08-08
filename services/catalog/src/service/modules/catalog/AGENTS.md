# Habitat Catalog Module Router

## Purpose

- Admit local Habitat authority, resolve applications, and check their rules.

## Scope

- Applies to the catalog module's contract, model, middleware, and operation handlers.

## Boundaries

- Module middleware owns shared current-catalog filesystem observation. Router
  handlers own operation-specific I/O and sequencing. Module policy owns
  deterministic classification, schema admission, path semantics, duplicate
  refusal, application resolution, selection, and result meaning.
- The module consumes ready evaluator and source-inventory resources but does
  not select or construct providers or persist a catalog. The admitted version
  2 subset resolves into the same provider-neutral runner model as version 3.

## Behavior

- `resolve` returns a closed resolved/rejected result and never hides expected
  repository, parse, schema, or semantic failures as defects.
- `check` intersects selectors over version 3 applications and distinct
  version 2 compatibility rules, then evaluates both through the same Grit and
  native Habitat structure paths. Compatibility Grit acquisition is narrowed
  to live regular files matching its exact-path coverage. Grit applications
  batch only when those final ordered prepared subject paths are exactly equal;
  provider results are accepted only at matching cardinality, identity, and
  request order.

## Concepts

- Authority paths, resolved applications, and mechanical findings are observed
  facts interpreted by pure catalog policy.

## Flow

- The module middleware derives one request-local current-catalog capability
  from the service base. Terminal curation projects that capability plus the
  evaluator, inventory, filesystem, path, and workspace-root values needed by
  the separate resolve and check operation leaves.

## Interfaces

- The module exposes only its contract and composed router to the service root.

## Routing

- [[../../../../AGENTS|Habitat service router]]

## Validation

- Run the Habitat service typecheck, behavior tests, and build.
