# Runtime Definition Owner (`runtime-definition`)

## Purpose

- Own Habitat's cold, import-safe runtime authoring contracts.

## Scope

- Applies to `packages/core/runtime/definition/**`.
- This is a private, package-less Nx owner with no registry or workspace
  package identity.

## Boundaries

- The sole private dependency is `runtime-schema`; this owner never imports
  the terminal SDK.
- Definitions may describe apps, services, plugins, resources, providers,
  Effects, and observations, but never start, acquire, mount, supervise, or
  project live read models.
- The flat `src/profile.ts` module owns the cold object-shaped
  `providerSelection(...)` authoring grammar. The terminal SDK projects that
  helper only through `@habitat-ai/sdk/runtime/profiles`; it does not become a
  second definition owner.
- Provider Effect plans and acquisition remain later runtime responsibilities
  and are not admitted by the cold helper.
- The process catalog is app-owned cold data. It is not a kind, child project,
  registry, supervisor, deployment unit, or cross-process controller.
- Deployment supplies launch identity once. Habitat copies and freezes its
  exact five fields without deriving placement or lineage.

## Interfaces

- Private assembly interface: `src/index.ts`.
- Cold provider-selection authoring owner: `src/profile.ts`.
- Terminal public projections belong to the `@habitat-ai/sdk` facade.
- Nx scheduler identity: `runtime-definition`.

## Validation

- `bunx nx run runtime-definition:typecheck`
- `bunx nx run runtime-definition:test`
- `bunx nx run runtime-definition:build`
- `bunx nx run runtime-definition:check`
