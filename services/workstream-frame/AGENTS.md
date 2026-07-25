# Workstream Frame Service Router

## Purpose

- Own the work-stream domain: a frame with ordered boundaries, an iterator that
  pushes work through it, and a feedback loop that re-admits whatever does not
  fit.

## Scope

- Applies to stream identity, frame shape, item admission, advance, peel-off,
  resolution, and temporal observation in this package.

## Boundaries

- This service owns domain truth, write ordering, and what a fact means. It does
  not own storage mechanics, transport, or vendor behavior; those belong to the
  `semantic-ledger` resource and its providers.
- The service receives an already-provisioned ledger port through `deps`. It
  never selects or constructs a provider, so provider choice stays an
  application concern.
- Facts are append-only. Nothing is updated or deleted, which is what makes an
  observation at an earlier position a faithful reconstruction rather than the
  present with rows hidden.

## Behavior

- `open` declares a frame. `admit` puts work into it. `push` advances every item
  as far as the boundaries allow and peels off each refusal into a derived item
  linked to its cause. `resolve` grants a derived item's tag to its parent.
  `inspect` reconstructs the stream at head or at any earlier position.

## Concepts

- A **boundary** is one gate in the frame's shape and is cleared by carrying a
  required **tag**. An **item** is work; its **position** is derived by counting
  durable cleared facts and never decreases. A **derived item** is a refusal
  peeled off as new input, carrying the tag it owes its parent.
  **Equilibrium** is reached when a push moves nothing.

## Flow

- A caller opens a frame and admits items; each push clears what fits and peels
  off what does not; an operator resolves derived items; the next push carries
  their parents through; the loop runs until no item can advance.

## Interfaces

- `streams.open`, `streams.admit`, `streams.push`, `streams.resolve`, and
  `streams.inspect` form the caller surface. The `semantic-ledger` port supplies
  append-only writes and temporal reads without owning their meaning.

## Routing

- [Streams module](src/service/modules/streams/AGENTS.md)
- [Semantic ledger resource](../../resources/semantic-ledger/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/workstream-frame:typecheck`.
- Run `bunx nx run @rawr/workstream-frame:test` for frame advance, peel-off,
  resolution, equilibrium, and temporal reconstruction behavior.
