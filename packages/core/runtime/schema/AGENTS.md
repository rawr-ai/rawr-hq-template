# Runtime Schema Owner (`runtime-schema`)

## Purpose

- Own Habitat's product-free TypeBox adaptation for runtime-carried values,
  Standard Schema validation, and JSON Schema projection.

## Scope

- Applies to `packages/core/runtime/schema/**`.
- This is a private, package-less Nx owner. It has no registry identity,
  workspace package manifest, or release membership.

## Boundaries

- TypeBox `Validator` is the sole validation authority. The adapter snapshots
  its input and does not implement a second validation grammar.
- `RuntimeSchema.fromTypeBox(...)` owns runtime decoding, validation, and
  redaction-shape metadata without changing semantic schema ownership.
- TypeBox 1.3.8 error paths are not reconstructable without ambiguity. Issues
  retain native messages and deliberately omit paths.
- The owner has zero private project dependencies and must not import the
  terminal SDK facade.
- Semantic schemas remain with their service, plugin, resource, provider, or
  app owner. This project adapts schemas; it does not own domain meaning.

## Behavior

- `standard` projects the supported Standard Schema protocols;
  `RuntimeSchema.fromTypeBox(...)` adapts runtime-carried values through the
  same TypeBox authority.

## Flow

- A semantic owner supplies a TypeBox schema, this owner snapshots and adapts
  it, and the terminal SDK publishes the appropriate face through
  `@habitat-ai/sdk/service/schema` or `@habitat-ai/sdk/runtime/schema`.

## Interfaces

- Private source interface: `src/index.ts`.
- Public assembly interfaces: `@habitat-ai/sdk/service/schema` and
  `@habitat-ai/sdk/runtime/schema`.
- Nx scheduler identity: `runtime-schema`.

## Validation

- `bunx nx run runtime-schema:typecheck`
- `bunx nx run runtime-schema:test`
- `bunx nx run runtime-schema:build`
- `bunx nx run runtime-schema:check`
