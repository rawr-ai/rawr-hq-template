# Runtime Derivation Owner (`runtime-derivation`)

## Purpose

- Derive Habitat's deterministic topology, complete normalized authoring graph,
  cold lookup tables, and portable runtime-plan artifact from one selected
  entrypoint and profile.

## Scope

- Applies to `packages/core/runtime/derivation/**`.
- This is a private, package-less Nx owner with no registry or workspace
  package identity.

## Boundaries

- Its only direct private dependencies are `runtime-schema` and
  `runtime-definition`; this owner never imports the terminal SDK.
- Version 2 retains the private topology handoff and owns the synchronous
  `deriveRuntimeArtifacts(...)` handoff selected by this project.
- Derivation preserves cold provider definitions, Effect bodies, and web
  loaders without reading config, decoding values, acquiring resources,
  executing bodies, loading modules, binding clients, or mounting hosts.
- Provider acquisition, live execution, compilation, service binding, native
  lowering, and lifecycle behavior remain downstream owners.

## Behavior

- Derivation validates selected cold identity and complete authoring relations,
  normalizes them into canonical tuple order and SHA-256 identities, and emits
  fresh recursively frozen schema data plus frozen cold table snapshots.
- Effect descriptor refs and web route-module refs remain distinct; only Effect
  refs enter the seven-field portable artifact.

## Flow

- Cold declarations flow from `runtime-definition` through one topology call
  into complete derivation; `runtime-schema` validates the data boundaries
  before compiler, process-runtime, web-adapter, and tooling consumers receive
  their distinct artifacts.

## Interfaces

- Private assembly interface: `src/index.ts`.
- Nx scheduler identity: `runtime-derivation`.
- The terminal SDK selectively projects the exact complete-derivation contract
  at `@habitat-ai/sdk/runtime/derivation`; this owner never imports the SDK.

## Validation

- `bunx nx run runtime-derivation:typecheck`
- `bunx nx run runtime-derivation:test`
- `bunx nx run runtime-derivation:build`
- `bunx nx run runtime-derivation:acceptance:normalized-topology`
- `bunx nx run runtime-derivation:acceptance:deployment-cold-plan`
- `bunx nx run runtime-derivation:check`
