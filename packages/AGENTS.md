# Packages Router

## Purpose

- Provide reusable, host-neutral capabilities that apps, plugins, and services
  can consume through stable package boundaries.

## Scope

- Applies to `packages/**`.

## Nx First Hop

- Use Nx to identify package project names, roots, tags, and available targets before reading package-local config by hand:
  - `bunx nx show project <project-name> --json`
- Use Narsil after Nx when the question shifts from package membership to source-level dependencies or symbol usage.

## Boundaries

- `packages/*` may be consumed by `apps/*` and `plugins/*`.
- `packages/*` must not depend on `apps/*`.
- Package-local internals are not cross-package APIs; consumers use declared
  exports.

## Behavior

- A package admits consumers through declared exports, keeps its dependency
  direction toward lower-level contracts, and delegates concrete environment
  mechanics to the resource that owns them.

## Concepts

- A **shared package** is reusable implementation or contract authority. A
  **public export** is its supported consumer interface; internal paths are
  not. **Dependency direction** prevents packages from reaching upward into
  runtime hosts.

## Flow

- Reusable capabilities enter through a package's declared public exports.
- Services, plugins, and apps compose those exports without reaching into
  package internals.
- Concrete provider or filesystem behavior belongs behind its owning resource,
  not in a generic package fallback.

## Interfaces

- Package exports are the code interface, Nx project metadata is the
  ownership and validation interface, and resource contracts are the handoff
  for provider-specific mechanics.

## Routing

- [Repository router](../AGENTS.md)
- [Habitat core namespace](core/AGENTS.md)
- [Public Habitat SDK](core/sdk/AGENTS.md)
- [Runtime schema adapter](core/runtime/schema/AGENTS.md)

## Parent Coverage

- Use this router as the default first hop for package dirs without a local `AGENTS.md` (for example, newly added package folders).
- Canonical process and docs pointers live in the
  [docs router](../docs/AGENTS.md).

## Validation

- Use `bunx nx show project <project-name> --json` to confirm package targets
  and dependency tags.
- Run the owning package's Nx `lint`, `typecheck`, and behavior tests.
- Use the Nx project graph to verify dependency direction when exports or
  cross-package imports change.
