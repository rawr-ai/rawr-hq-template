# Runtime Schema Owner (`runtime-schema`)

## Purpose

- Own Habitat's product-free adaptation from TypeBox schemas to the Standard
  Schema validation and JSON Schema protocols.

## Scope

- Applies to `packages/core/runtime/schema/**`.
- This is a private, package-less Nx owner. It has no registry identity,
  workspace package manifest, or release membership.

## Boundaries

- TypeBox `Validator` is the sole validation authority. The adapter snapshots
  its input and does not implement a second validation grammar.
- TypeBox 1.3.8 error paths are not reconstructable without ambiguity. Issues
  retain native messages and deliberately omit paths.
- The owner has zero private project dependencies and must not import the
  terminal SDK facade.
- Semantic schemas remain with their service, plugin, resource, provider, or
  app owner. This project adapts schemas; it does not own domain meaning.

## Behavior

- `standard` snapshots one TypeBox schema, validates unknown values with the
  native validator, and projects only the supported draft-2020-12 Standard
  JSON Schema target.

## Flow

- A semantic owner supplies a TypeBox schema, this owner snapshots and adapts
  it, and the terminal SDK publishes the adapter through
  `@habitat-ai/sdk/service/schema`.

## Interfaces

- Private source interface: `src/index.ts`.
- Public assembly interface: `@habitat-ai/sdk/service/schema`.
- Nx scheduler identity: `runtime-schema`.

## Validation

- `bunx nx run runtime-schema:typecheck`
- `bunx nx run runtime-schema:test`
- `bunx nx run runtime-schema:build`
- `bunx nx run runtime-schema:check`
