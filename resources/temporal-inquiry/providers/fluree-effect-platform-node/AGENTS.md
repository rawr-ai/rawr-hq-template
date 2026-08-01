# Fluree Effect Platform Node Provider Router

## Purpose

- Realize temporal inquiry through one exact FlureeDB 4.1.4 process and repository-local evidence model.

## Boundaries

- Own process acquisition, exact version proof, Git/filesystem/session intake, checkpoint identity, guarded SPARQL, locking, and cleanup.
- Accept consumer ontology, facts, projections, query text, paths, and ledger storage as data. Never author or infer their product meaning.
- Importing this provider performs no acquisition, refresh, query, filesystem mutation, or Bun SQLite load.

## Behavior

- One explicit foreground scope may refresh once and run serialized reads before closing. All owned scratch and processes close on success, failure, or interruption.

## Validation

- Run `bunx nx run provider-temporal-inquiry-fluree-effect-platform-node:typecheck` and `bunx nx run provider-temporal-inquiry-fluree-effect-platform-node:test`.
