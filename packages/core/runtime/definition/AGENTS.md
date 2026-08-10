# Runtime Definition Owner (`runtime-definition`)

## Purpose

- Own Habitat's cold, import-safe runtime authoring contracts.

## Scope

- Applies to `packages/core/runtime/definition/**`.
- This is a private, package-less Nx owner with no registry or workspace package identity.

## Boundaries

- The sole private dependency is `runtime-schema`; this owner never imports the terminal SDK.
- Definitions may describe apps, services, plugins, resources, providers, Effects, and observations, but never start, acquire, mount, supervise, or project live read models.
- The process catalog is app-owned cold data. It is not a kind, child project, registry, supervisor, or cross-process controller.
- Deployment supplies launch identity once. Habitat copies and freezes it without deriving placement or lineage.

## Interfaces

- Private assembly interface: `src/index.ts`.
- Terminal public projections are the implemented `@habitat-ai/sdk` authoring subpaths.
- Nx scheduler identity: `runtime-definition`.

## Validation

- `bunx nx run runtime-definition:typecheck`
- `bunx nx run runtime-definition:test`
- `bunx nx run runtime-definition:build`
- `bunx nx run runtime-definition:check`
