# Runtime Derivation Owner (`runtime-derivation`)

## Purpose

- Derive Habitat's deterministic topology, complete normalized selected-process
  closure, cold lookup tables, and portable runtime-plan artifact from one
  selected entrypoint and profile.

## Scope

- Applies to `packages/core/runtime/derivation/**`.
- This is a private, package-less Nx owner with no registry or workspace
  package identity.

## Boundaries

- Its only direct private dependencies are `runtime-schema` and
  `runtime-definition`; this owner never imports the terminal SDK.
- The selected complete `runtime-derivation@3` preserves the private topology
  and synchronous `deriveRuntimeArtifacts(...)` handoffs with closed
  owner-local TypeScript helper and proof subdirectories. Earlier versions
  remain immutable and independently resolvable.
- Derivation preserves exact complete service exports, cold provider definitions,
  Effect bodies and web loaders without reading config, decoding values,
  constructing services, acquiring resources, executing bodies, loading modules,
  binding clients or mounting hosts.
- Provider acquisition, live execution, compilation, service binding, native
  lowering, and lifecycle behavior remain downstream owners.

## Behavior

- Derivation alone normalizes the selected transitive process closure before
  provider coverage, preserving required authored source policy, named dependency
  assignments, effective lanes and complete instance identity. It emits canonical
  tuple order and SHA-256 identities, fresh recursively frozen schema data and
  frozen cold table snapshots without copying referenced executable owners.
- Effect descriptor refs and web route-module refs remain distinct; only Effect
  refs enter the seven-field portable artifact.
- Only explicit named server workflow uses derive admission descriptors. Exact
  app-member targets and requested subsets stay separate from async execution
  selection; identical target/subset descriptors may share caller-local uses
  with distinct ordinary client requirements. Selected admission references
  stay private beside the unchanged eight-field descriptor.

## Flow

- Cold selections flow from `runtime-definition` into complete derivation;
  `runtime-schema` validates data boundaries. Public graph inspection stays
  separate from the cohesive executable handoff. Compiler, process-runtime,
  web-adapter and tooling consumers receive their distinct artifacts.

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
