# Runtime Derivation Owner (`runtime-derivation`)

## Purpose

- Derive Habitat's deterministic, normalized runtime topology from one selected
  cold entrypoint and profile.

## Scope

- Applies to `packages/core/runtime/derivation/**`.
- This is a private, package-less Nx owner with no registry or workspace
  package identity.

## Boundaries

- Its only direct private dependencies are `runtime-schema` and
  `runtime-definition`; this owner never imports the terminal SDK.
- Version 1 owns only `deriveNormalizedRuntimeTopology(...)` and
  `NormalizedRuntimeTopology`.
- Complete derivation, portable artifacts, provider selection and acquisition,
  executable plans and tables, live execution, and lifecycle behavior belong
  to later owners or accepted increments.

## Behavior

- Derivation validates selected cold identity, normalizes the admitted topology
  facts into deterministic tuple order, and emits fresh recursively frozen
  data without invoking preserved executable bodies.

## Flow

- Cold declarations flow from `runtime-definition` through topology derivation;
  `runtime-schema` validates the boundary artifact before later private phases
  consume it.

## Interfaces

- Private assembly interface: `src/index.ts`.
- Nx scheduler identity: `runtime-derivation`.
- There is no public SDK projection in version 1.

## Validation

- `bunx nx run runtime-derivation:typecheck`
- `bunx nx run runtime-derivation:test`
- `bunx nx run runtime-derivation:build`
- `bunx nx run runtime-derivation:acceptance:normalized-topology`
- `bunx nx run runtime-derivation:check`
