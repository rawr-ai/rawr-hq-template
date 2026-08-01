# TypeBox Adapter Router

## Scope

- Applies to `packages/typebox-adapter/**`.
- Owns the product-free bridge from TypeBox schemas to Standard Schema and
  Standard JSON Schema.

## Boundaries

- TypeBox `Validator` is the only validation authority. The adapter snapshots
  the supplied schema once and returns detached JSON Schema projections.
- TypeBox 1.3.8 error `instancePath` values are ambiguous. Issues therefore
  expose the vendor message and intentionally omit `path`.
- This package owns no domain schema, oRPC contract, transport policy, path
  parser, coercion policy, or product validation rule.

## Behavior

- `standard` turns one JSON Schema-compatible TypeBox schema into the two
  Standard interfaces without attaching private fields to the public value.
- Validation and projection observe the same construction snapshot even when
  the caller later mutates the source schema or a returned projection.

## Flow

- A schema owner supplies TypeBox schema bytes, the adapter snapshots them,
  TypeBox validates values, and downstream standards-aware consumers receive
  detached projections.

## Interfaces

- [[src/index|Public adapter]]
- [[../AGENTS|Packages router]]

## Validation

- `bunx nx run @habitat-ai/typebox-adapter:typecheck`
- `bunx nx run @habitat-ai/typebox-adapter:test`
