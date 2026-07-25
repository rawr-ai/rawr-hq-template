# Semantic Ledger Memory Provider Router

## Purpose

- Satisfy the semantic-ledger capability in process, so the contract can be
  proved provider-neutral rather than shaped around one vendor.

## Scope

- Applies to the in-memory implementation in this provider directory.

## Boundaries

- This provider owns fact storage and pattern matching. It owns no domain
  vocabulary and no durability guarantee across processes.
- Its commit identity is a deterministic stand-in. Callers must treat commit
  values as opaque, which is exactly what keeps them portable.

## Behavior

- Facts are appended to a log stamped with the position at which they became
  visible. A read at a position filters to facts at or before it, then joins
  triple patterns through a frontier of partial bindings.

## Concepts

- A **fact** is one subject, predicate, object, and position. The **frontier**
  is the set of partial bindings carried through successive patterns.

## Flow

- A test or host creates the port, optionally sharing a backing store, then uses
  it wherever a real ledger would be used.

## Interfaces

- `createMemorySemanticLedgerPort` returns a `SemanticLedgerPort`.

## Routing

- [Semantic ledger resource](../../AGENTS.md)
- [Fluree HTTP provider](../fluree-http/AGENTS.md)

## Validation

- Run `bunx nx run provider-semantic-ledger-memory:typecheck`.
