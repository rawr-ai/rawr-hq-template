# Bootgraph Package Router (`@rawr/bootgraph`)

## Scope

- Applies to the bootgraph support package in `packages/bootgraph/**`.

## Boundaries

- The package owns only its explicit support-shell reservation.
- Do not place runtime assembly, hidden dependency ordering, application
  startup, or mutable lifecycle state behind this reservation.

## Flow

- Consumers may inspect the exported reservation as package metadata.
- No runtime resources, graph execution, or state transition occurs through
  this package.

## Routing

- [Packages router](../AGENTS.md)
- [Runtime context contracts](../runtime-context/AGENTS.md)

## Validation

- `bunx nx run @rawr/bootgraph:lint`
- `bunx nx run @rawr/bootgraph:typecheck`
- `bunx nx run @rawr/bootgraph:test`
- `bunx nx run @rawr/bootgraph:build`
