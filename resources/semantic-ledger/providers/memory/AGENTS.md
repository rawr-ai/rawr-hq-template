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
- A proposal's precondition is solved against the same visible facts a read
  would see, and a refusal writes nothing and does not advance the position.
  Each line remembers the outcome it gave every identity, refusals included, so
  an offer replayed under a spent identity is answered rather than re-decided.
  Caching only the successes would make an identity mean something here that it
  means nowhere else, and the contract would stop being provider-neutral in the
  one place it is hardest to notice.

## Concepts

- A **fact** is one subject, predicate, object, and position. The **frontier**
  is the set of partial bindings carried through successive patterns.
- An **answered offer** is an identity paired with the content it was given for.
  Matching content replays the stored outcome; different content under the same
  identity is a different offer and is refused, because one identity may stand
  for only one offer.

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
- Run `bunx nx run @rawr/workstream-frame:test` for conformance. This provider is
  single-threaded, so its racers interleave at await points within one thread:
  what the pass establishes here is that a decision offered against state another
  decision has already changed is refused, not that a real race is excluded. That
  half is Fluree's to prove, and neither substitutes for the other.
