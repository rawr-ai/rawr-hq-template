# Hyperresearch V8 Runs Module Router

## Purpose

- Own the durable state machine that starts, advances, inspects, and validates
  a Hyperresearch V8 run.

## Scope

- Applies to V8 run lifecycle behavior in this module directory.

## Boundaries

- Runs owns ledger transitions, artifact contracts, packet fan-out and fan-in,
  source capture, and integrity classification.
- Research agents produce declared outputs but cannot directly advance or
  rewrite accepted ledger state. CLI and filesystem mechanics remain behind
  host resources.

## Behavior

- The module initializes a tiered route, advances only the active step,
  persists every transition, emits or accepts audited agent packets, snapshots
  artifact lineage, and blocks validation on inconsistent or missing evidence.

## Concepts

- A **V8 ledger** is durable run authority. A **step** declares required work
  and artifacts; an **agent packet** is an audited delegated job; an **accepted
  artifact hash** pins lineage; a **validation marker** records a passing final
  assessment.

## Flow

- Start creates query, route, scaffold, and ledger state. Advance validates
  current inputs and performs bounded work or returns pending packets. Inspect
  observes state; validate classifies blocking and warning findings without
  advancing it.

## Interfaces

- `startV8Run`, `advanceV8Run`, `inspectV8Run`, and `validateV8Run` are the
  caller surface. CLI execution, clock, identity, hash, path, and file
  capabilities are the host mechanics interface.

## Routing

- [Hyperresearch Codex service router](../../../../AGENTS.md)
- [Synthetic fixtures module](../fixtures/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/hyperresearch-codex:typecheck`.
- Run `bunx nx run @rawr/hyperresearch-codex:test` for tier routes, resume,
  packet audit and fan-in, source capture, artifact lineage, failed steps, and
  final validation.
