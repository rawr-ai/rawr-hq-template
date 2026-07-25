# Revisions Module Router

## Purpose

- Implement the five operations that let a work stream have more than one
  version of itself, and decide which one is truth.

## Scope

- Applies to revision lifecycle operations in this module directory.

## Boundaries

- This module owns the vocabulary of revision lifecycle and the decision of
  what may be promoted. It does not own isolation or merging — the substrate
  supplies both.
- A conflict is reported, never resolved here. Deciding what a collision
  *means* is a work-stream judgement, not a merge algorithm's.
- Nothing here deletes. The substrate can drop a line outright and this module
  deliberately does not: a candidate that was not promoted is superseded, and
  superseding is recorded rather than erased.

## Behavior

- `fork` starts a candidate holding everything the source held, diverging from
  there. `preview` reports ahead, behind, and conflicts without changing
  anything. `promote` folds a candidate into the committed revision atomically.
  `abandon` records that a candidate was set aside. `list` reports every
  revision with its disposition.

## Concepts

- A **revision** is a whole coherent version of the work stream, not of one
  item in it. That is what makes it the right unit for trying a change: a new
  frame shape, a speculative resolution, or two agents working without
  colliding.
- **Committed** is decided by identity, not by a recorded fact, so it can never
  be contradicted by one. Every other status is a fact on the committed line —
  what the work stream decided about a candidate is itself committed truth.

## Flow

- Each handler guards read-only mode, refuses the committed revision where the
  operation is meaningless, confirms the line exists, performs the substrate
  operation, and records the disposition on the committed line.

## Interfaces

- `fork`, `preview`, `promote`, `abandon`, and `list` are the module's
  procedures, composed as a plain map in `router/index.ts` and attached by the
  service root.

## Routing

- [Workstream frame service router](../../../../AGENTS.md)
- [Streams module router](../streams/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/workstream-frame:test`.
