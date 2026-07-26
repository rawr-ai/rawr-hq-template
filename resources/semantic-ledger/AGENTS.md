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
- Four properties are load-bearing for every provider: writes are append-only and
  produce a monotonically increasing position; a read at position `N` observes
  exactly the facts written at or before `N`; a precondition is evaluated in the
  same step that writes; and a receipt says which of the two outcomes happened.
- The contract names no vendor mechanic. A commit sentinel, a CID, a flake
  count, an idempotency header, a submissions record, SPARQL, a spelling of
  absence as an optional join tested for an unbound variable, a key's expiry, and
  a time-travel suffix are all things one substrate happens to have. Any of them
  appearing here promotes a vendor mechanic into the capability, and a capability
  carrying one is no longer provisionable. Review enforces this: a hand-rolled
  source parser is not an admitted owner of source law.
- One contract satisfied by several implementations is the shape oRPC's
  contract-first mode is for, and this contract is deliberately not built that
  way. What varies between these providers is substrate, not location: they run
  in the caller's process, handed over as a value, so what must be pinned is what
  the operations *mean* rather than what they look like on a wire. Meaning is
  what the dual-provider conformance suite checks, and no schema can check it.
  **The condition that reverses this is a provider that must live out of
  process** — a remote ledger, or one owned by another team. At that point the
  port becomes a boundary, and contract-first oRPC is the shape it should take.

## Behavior

- `ensureLedger` creates a ledger when absent and is safe to repeat. `head`
  reports the current position. `propose` offers facts under a precondition and
  an identity, and returns a receipt saying whether they were written. `select`
  matches conjunctive triple patterns, optionally against an earlier position.
- A refused proposal is an answer, not a failure. The caller reads what is true
  and responds to that, rather than offering again — every precondition asserts
  that facts are present or that subjects are absent, and since nothing is ever
  retracted, a refusal states something that will not stop being the case.

## Concepts

- A **term** is a variable, IRI, or literal. A **triple pattern** filters on
  ground terms and binds variables; shared variable names join across patterns.
  A **position** is the monotonic write counter that makes temporal reads exact.
- A **proposal** is the only write: facts offered rather than instructed. Its
  **precondition** is what must hold for them to be legitimate, evaluated by the
  substrate atomically with the write, so the decision is not made by whoever
  read a moment earlier. Its **identity** closes one window and only one — a
  response that never arrived — so an offer that reaches the substrate twice is
  applied once. Its **receipt** reports the outcome; a position is not the
  discriminator, because another writer advances it either way.

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

- Run `bunx nx run @rawr/resource-semantic-ledger:typecheck`.
- Run `bunx nx run provider-semantic-ledger-memory:typecheck`.
- Run `bunx nx run provider-semantic-ledger-fluree-http:typecheck`.
- Run `bunx nx run @rawr/workstream-frame:test` for conformance. It runs one
  scenario set against both providers, so a contract claim that holds only on
  one of them fails there rather than in production. The Fluree pass is reported
  as a skip when no server is reachable, never substituted by the memory pass.
