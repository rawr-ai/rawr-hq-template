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
- The selected complete `runtime-compiler@2` admits closed owner-local
  TypeScript helper and proof subdirectories while preserving `src/index.ts`
  as the assembly entry. Version 1 remains immutable.
- Compilation accepts the cohesive library-produced derivation handoff for one
  selected process, not independently pairable entrypoint and graph inputs.
- It performs no config read or decode, provider build or acquisition, service
  binding, execution, adapter lowering, harness mounting, or observation
  publication.
- The cold reference table preserves exact selected providers and complete
  service-owned cold exports, including constructors, without copying or
  invoking them. Process runtime receives that reference channel explicitly.

## Behavior

- Compilation lowers the already-normalized selected closure and complete named
  binding recipes. It retains consumed-shape, identity, relation, cold-reference,
  cycle and lowering checks without repeating authoring normalization, then
  canonicalizes and freezes DTO output. Invalid input refuses with built-in
  `TypeError` before returning a result.
- Missing optional resources remain derivation findings and produce no selected
  provider artifact in the compiled plan.

## Flow

- The cohesive selected derivation handoff enters compilation; public data-only
  graph inspection is not an alternative executable authority.
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
