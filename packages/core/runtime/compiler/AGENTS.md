# Runtime Compiler Owner (`runtime-compiler`)

## Purpose

- Compile one selected process into deterministic cold planning artifacts.

## Scope

- Applies to `packages/core/runtime/compiler/**`.
- This is a private, package-less Nx owner with no registry, workspace package,
  or public SDK identity.

## Boundaries

- Its exact direct private dependencies are `runtime-definition` and
  `runtime-derivation`; it never imports the terminal SDK or runtime-schema.
- Compilation accepts only the exact selected `Entrypoint` and complete
  `NormalizedAuthoringGraph`.
- It performs no config read or decode, provider build or acquisition, service
  binding, execution, adapter lowering, harness mounting, or observation
  publication.
- The cold reference table preserves selected provider and service identities
  without copying or invoking their referenced definitions.

## Behavior

- Compilation synchronously projects the selected roles' complete transitive
  closure, canonicalizes and freezes DTO output, and refuses invalid input with
  built-in `TypeError` before returning a result.
- Missing optional resources remain derivation findings and produce no selected
  provider artifact in the compiled plan.

## Flow

- Cold definitions and normalized derivation facts enter compilation.
- The compiled plan flows to later boot and process owners; execution and web
  lookup tables bypass this owner and retain their distinct consumers.

## Interfaces

- Private assembly interface: `src/index.ts`.
- Sole operation: `compileRuntimePlan(...)`.
- Nx scheduler identity: `runtime-compiler`.

## Validation

- `bunx nx run runtime-compiler:typecheck`
- `bunx nx run runtime-compiler:test`
- `bunx nx run runtime-compiler:build`
- `bunx nx run runtime-compiler:acceptance:compiled-process-plan`
- `bunx nx run runtime-compiler:acceptance:derivation-handoff`
- `bunx nx run runtime-compiler:acceptance:nx-cache`
- `bunx nx run runtime-compiler:check`
