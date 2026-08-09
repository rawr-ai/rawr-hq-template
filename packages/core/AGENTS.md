# Habitat Core Router

## Purpose

- Route Habitat's public SDK and private runtime substrate through one core
  namespace without making the namespace itself a package or Nx project.

## Scope

- Applies to `packages/core/**` unless a deeper router narrows the boundary.

## Boundaries

- `sdk` owns the sole public `@habitat-ai/sdk` package.
- `runtime/*` projects own private runtime phases and must not import the public
  SDK facade to reconstruct upstream decisions.
- `packages/core` itself owns no package manifest, project identity, source
  barrel, compatibility alias, or predecessor export.

## Behavior

- Add each runtime owner only with its accepted implementation and proof. Keep
  one direction from private runtime phases into the terminal SDK facade.

## Concepts

- The **core namespace** groups Habitat substrate owners; it is not itself an
  importable capability.

## Flow

- Private runtime phases expose qualified contracts and implementations to the
  terminal SDK. Apps consume the SDK rather than core internals.

## Interfaces

- [Public Habitat SDK](sdk/AGENTS.md)
- [Runtime schema adapter](runtime/schema/AGENTS.md)

## Routing

- [Packages router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx show project @habitat-ai/sdk --json`
- `bunx nx run @habitat-ai/sdk:check`
- `bunx nx run runtime-schema:check`
