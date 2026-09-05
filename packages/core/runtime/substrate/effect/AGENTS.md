# Runtime Effect Substrate Owner

## Purpose

- Provision one process through native Effect acquisition and scoped release.

## Scope

- Applies to `packages/core/runtime/substrate/effect/**`.
- One private package-less Nx owner, `runtime-substrate-effect`.

## Boundaries

- Direct private dependencies are exactly runtime-definition, runtime-compiler
  and runtime-bootgraph. Never import the SDK or derivation owner.
- One native ManagedRuntime and one Layer.effectContext lifecycle adapter own
  process resources. Bootgraph supplies ordinary ordering data, not Layer nodes.
- Service binding, execution registries, harness mounting and public SDK APIs
  belong to downstream owners. Do not create another finalizer registry.

## Behavior

- Preflight selected configuration before acquisition, preserve exact resource
  requirement references, and return a provisioned process only after startup.
- Failed startup finalizes acquired resources through native scopes. Release
  callbacks are deferred inside Effect so a throw cannot bypass earlier releases.

## Interfaces

- Private assembly entry: `src/index.ts`; no package or public SDK face.
- SDK-owned integration tests consume the real pipeline without changing the
  substrate's dependency boundary or introducing production startApp early.

## Validation

- Run `bunx nx run runtime-substrate-effect:check`, `:test` and `:build`.
- Owner cache proof covers restoration and relevant-input invalidation.
- SDK integration owns complete producer handoff and real process-isolation proof.
