# Bootgraph Package Router (`@rawr/bootgraph`)

## Purpose

- Reserve the bootgraph package identity as an explicit support shell without
  implying that a runtime graph engine exists.

## Scope

- Applies to the bootgraph support package in `packages/bootgraph/**`.

## Boundaries

- The package owns only its explicit support-shell reservation.
- Do not place runtime assembly, hidden dependency ordering, application
  startup, or mutable lifecycle state behind this reservation.

## Behavior

- Consumers can identify the reserved capability, but cannot execute a graph,
  acquire a resource, or transition lifecycle state through it.

## Concepts

- A **support-shell reservation** is package metadata held for a named
  capability. It is deliberately distinct from an executable boot graph or
  composition root.

## Flow

- Consumers may inspect the exported reservation as package metadata.
- No runtime resources, graph execution, or state transition occurs through
  this package.

## Interfaces

- The declared package export is metadata-only; runtime composition and
  context contracts remain owned by their respective packages and hosts.

## Routing

- [Packages router](../AGENTS.md)
- [Runtime context contracts](../runtime-context/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/bootgraph:typecheck`
- `bunx nx run @rawr/bootgraph:test`
- `bunx nx run @rawr/bootgraph:build`
