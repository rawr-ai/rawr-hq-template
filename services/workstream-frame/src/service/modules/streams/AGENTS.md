# Streams Module Router

## Purpose

- Implement the five operations that move work through one frame and expose its
  durable truth over time.

## Scope

- Applies to stream and item operations in this module directory.

## Boundaries

- This module owns operation behavior and caller-actionable refusals. It does
  not own ledger mechanics, provider selection, or the meaning of a tag to any
  particular team.
- A boundary refusing an item is a result, not a failure. There is deliberately
  no "item blocked" error in the contract.
- Handlers receive the narrowed module context — store, clock, config — never
  the raw dependency bag.

## Behavior

- `push` advances an item while the next boundary's required tag is present,
  stops at the first refusal, and creates one derived item per unmet
  requirement. Peel-off identity is deterministic, so repeated pushes address
  the same derived item instead of forking duplicates.

## Concepts

- An **advance** reports what one turn of the iterator did to one item:
  `completed`, `blocked`, `waiting`, or `idle`. **Waiting** means a peel-off is
  already outstanding; **idle** means the item is itself an unresolved peel-off.

## Flow

- Each handler guards read-only mode, confirms the stream exists, reads durable
  state through the store, applies frame policy, appends facts, and returns the
  reconstructed view.

## Interfaces

- `open`, `admit`, `push`, `resolve`, and `inspect` are the module's procedures,
  composed as a plain map in `router/index.ts` and attached by the service root.

## Routing

- [Workstream frame service router](../../../../AGENTS.md)
- [Semantic ledger resource](../../../../../../resources/semantic-ledger/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/workstream-frame:test`.
