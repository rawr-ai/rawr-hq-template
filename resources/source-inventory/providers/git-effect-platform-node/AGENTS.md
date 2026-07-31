# Source Inventory Git Provider Router

## Purpose

- Realize bounded visible-entry inventory through ordinary local Git and
  Effect Platform Node process capabilities.

## Scope

- Applies to
  `resources/source-inventory/providers/git-effect-platform-node/**`.

## Boundaries

- Own only the exact local Git observation, bounded stream draining, strict
  record admission, canonical normalization, interruption, and failure
  translation.
- Do not classify live filesystem kinds or own Habitat structure semantics,
  source-control hardening, mutation, persistence, evidence, or lifecycle
  state.
- Preserve the operator's inherited Git configuration and use Effect Platform
  Node directly without filesystem or command wrappers.

## Behavior

- Run one ordinary `git ls-files` observation in the caller-selected root and
  return tracked plus untracked nonignored entry paths with tracked symlinks
  and Gitlinks identified separately.

## Routing

- [Resource router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run
  `bunx nx run provider-source-inventory-git-effect-platform-node:typecheck`
  and
  `bunx nx run provider-source-inventory-git-effect-platform-node:test`.
