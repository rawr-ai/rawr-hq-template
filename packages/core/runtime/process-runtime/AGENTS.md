# Process Runtime Owner

## Purpose

- Bind ready process resources and service clients to their declared consumers,
  then coordinate process-local execution through the native bridge.

## Scope

- Applies to `packages/core/runtime/process-runtime/**`.
- One private package-less Nx owner, `runtime-process-runtime`.

## Boundaries

- Direct private dependencies are runtime-definition, runtime-derivation,
  runtime-compiler and runtime-substrate-effect. Never import the SDK.
- Consume the exact provisioned process and compiled reference handoff. Do not
  select providers, call provider build/acquisition, or construct another runtime.
- Service-owned routers stay private. Supply one client-assembly capability;
  the official Effect-oRPC bridge owns procedure execution and Promise adaptation.
- Consumer projections expose only declared capabilities. Raw process resource
  maps and native runtime handles remain inside process-runtime implementation;
  neither belongs on a service, plugin or module context.
- Harness mounting and cross-owner finalization belong to downstream mounting.
- Adapter contracts live in `src/surface-adapter.ts`; lowering helpers live in
  `src/adapters/**`. The selected version-2 source law forbids raw Effect
  imports there. Deferred payload callbacks may delegate to process execution;
  behavior tests must prove lowering itself never executes or mounts.

## Behavior

- Preserve service binding identity and fresh invocation context. Resolve ready
  construction dependencies before calling synchronous service constructors.
- Process-owned admission and settlement tracking must drain accepted work
  before releasing its resources; no second provider finalizer registry.

## Interfaces

- Private assembly entry is `src/index.ts`. No package or public SDK runtime face.
- SDK-owned integration tests establish the real composition edge without
  publishing a lifecycle API prematurely.

## Validation

- Run `bunx nx run runtime-process-runtime:check`, `:typecheck`, `:test`, `:build`.
- Isolated cache proof covers exact restoration and relevant upstream invalidation.
