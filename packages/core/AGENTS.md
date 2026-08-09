# Mixed-Core Reservation Router (`@habitat-ai/rawr-core`)

## Purpose

- Retain the empty predecessor package/project identity until task 3.3 removes
  it atomically while preserving `packages/core` as a Habitat namespace.

## Scope

- Applies to the transitional package shell at `packages/core`.
- Deeper owners, including `runtime/schema`, follow their own routers.

## Boundaries

- Owns no telemetry, runtime, SDK, application, or provider capability.
- Must not own CLI command lifecycle, parsing, result rendering,
  command-specific behavior, plugin lifecycle policy, workspace manifest
  semantics, or application composition.
- Must not restore a telemetry export, add new source, or become a permanent
  Habitat SDK owner.

## Behavior

- Keep the empty package/project identity stable for task 3.3; do not turn this
  reservation into a capability owner.

## Concepts

- A **reservation shell** preserves only the path and identity needed for the
  later atomic namespace transfer.

## Flow

- No runtime or application flow passes through this package.

## Interfaces

- The root package export remains empty; there is no supported capability
  subpath.

## Routing

- [Packages router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @habitat-ai/rawr-core:typecheck`
- `bunx nx run @habitat-ai/rawr-core:build`
