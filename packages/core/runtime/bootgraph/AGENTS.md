# Runtime Bootgraph Owner (`runtime-bootgraph`)

## Purpose

- Order compiler-selected resource/provider nodes for deterministic lifecycle
  acquisition, rollback, and release.

## Scope

- Applies to `packages/core/runtime/bootgraph/**`.
- This is a private, package-less Nx owner with no registry, workspace package,
  or public SDK identity.

## Boundaries

- Its sole direct private dependency is `runtime-compiler`; it never imports
  the terminal SDK, runtime definition, or runtime derivation.
- Ordering accepts only the exact compiler-owned `BootgraphInput` and exposes no
  parallel input schema, compiled-plan carrier, reference table, or observation
  seed.
- It performs no config read or decode, provider build, Effect construction or
  execution, acquisition, release, finalizer registration, service binding,
  harness mounting, or observation publication.
- It owns ordinary lifecycle order data, not provider plans, live values,
  findings, diagnostics, or partial results.

## Behavior

- `orderBootgraph(...)` synchronously validates the closed input, orders
  dependencies before dependents with `selectionId` tie-breaking, and returns a
  fresh recursively frozen artifact with exact reverse rollback and release
  orders.
- Invalid input refuses with built-in `TypeError` before any result or external
  work, and accepted input is neither mutated nor newly frozen.

## Flow

- Compiler-owned resource/provider dependency nodes enter bootgraph ordering.
- Frozen acquisition and reverse lifecycle order flow to the later provisioning
  substrate and terminal composition; no SDK source face exists in this task.

## Interfaces

- Private assembly interface: `src/index.ts`.
- Sole operation: `orderBootgraph(...)`.
- Nx scheduler identity: `runtime-bootgraph`.

## Validation

- `bunx nx run runtime-bootgraph:typecheck`
- `bunx nx run runtime-bootgraph:test`
- `bunx nx run runtime-bootgraph:build`
- `bunx nx run runtime-bootgraph:check`
