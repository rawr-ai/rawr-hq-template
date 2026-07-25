# Semantic Ledger Resource Router

## Purpose

- Declare the provisionable capability for an append-only temporal graph
  ledger: write facts, read facts, and read facts as they stood earlier.

## Scope

- Applies to the capability contract in this package and the providers beneath
  it.

## Boundaries

- This contract declares mechanics only. It carries no work-stream vocabulary;
  semantic owners decide what facts mean.
- Providers own acquisition, transport, and vendor mechanics. They do not own
  domain state.
- Two properties are load-bearing for every provider: writes are append-only and
  produce a monotonically increasing position, and a read at position `N`
  observes exactly the facts written at or before `N`.

## Behavior

- `ensureLedger` creates a ledger when absent and is safe to repeat. `head`
  reports the current position. `transact` appends facts. `select` matches
  conjunctive triple patterns, optionally against an earlier position.

## Concepts

- A **term** is a variable, IRI, or literal. A **triple pattern** filters on
  ground terms and binds variables; shared variable names join across patterns.
  A **position** is the monotonic write counter that makes temporal reads exact.

## Flow

- A host constructs one provider and hands the port to a service. The service
  writes nodes and reads bindings, and never learns which provider it holds.

## Interfaces

- `SemanticLedgerPort` is the capability. `createMemorySemanticLedgerPort` and
  `createFlureeHttpSemanticLedgerPort` are its two implementations.

## Routing

- [Memory provider](providers/memory/AGENTS.md)
- [Fluree HTTP provider](providers/fluree-http/AGENTS.md)
- [Workstream frame service](../../services/workstream-frame/AGENTS.md)

## Validation

- Run `bunx nx run provider-semantic-ledger-memory:typecheck`.
- Run `bunx nx run provider-semantic-ledger-fluree-http:typecheck`.
