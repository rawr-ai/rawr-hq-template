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
- `Entrypoint` is the sole cold selection artifact. Synchronous
  `defineEntrypoint(...)` produces it from real `AppDefinition`,
  `RuntimeProfile`, and `ProcessDefinition` values, one entrypoint id, and the
  exact five-field `RuntimeLaunchIdentity`.
- Before returning or otherwise publishing the frozen artifact,
  `defineEntrypoint(...)` requires launch-identity app, process, and entrypoint
  fields to agree with their selected definitions and id. Mismatch is built-in
  `TypeError` with no output, external mutation, or authored executable call;
  error text and check order are noncontractual.
- Launch identity has no profile field. Profile-id agreement remains a
  selection-to-derivation check, and derivation retains all agreement checks
  defensively for a corrupted or substituted selected artifact.
- Future `startApp(...)` consumes the exact accepted `Entrypoint` and does not
  reconstruct selection. Source-unavailable means producer-local authoring
  bindings or factory scope is gone, not that implementation code or artifacts
  are unavailable.
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
- Cold app/process/entrypoint authoring and selection owner: `src/app.ts`.
- Cold provider-selection authoring owner: `src/profile.ts`.
- Terminal public projections belong to the `@habitat-ai/sdk` facade.
- Nx scheduler identity: `runtime-definition`.

## Validation

- `bunx nx run runtime-definition:typecheck`
- `bunx nx run runtime-definition:test`
- `bunx nx run runtime-definition:build`
- `bunx nx run runtime-definition:check`
