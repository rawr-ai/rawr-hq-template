# Vendor Fidelity Notes

This lab uses canonical-looking imports to test the RAWR authoring spine. Those imports are local aliases, not vendor packages.

## TypeScript

- Local compiler: TypeScript `5.9.3`.
- Discriminated descriptor refs rely on TypeScript's normal discriminated-union narrowing.
- Manifest and artifact fixtures use `satisfies` to validate object shape while preserving literal inference.
- Generator checks rely on the installed `Generator<TYield, TReturn, TNext>` definition, where `TYield` is the yielded value type.

## Effect

- The repo does not currently install the `effect` package, so this lab does not prove real Effect runtime semantics.
- `@rawr/sdk/effect` is a RAWR pseudo-SDK facade for type-shape checks.
- `TaggedError("Tag")<{ ... }>` is intentionally aligned with Effect's `Data.TaggedError` spelling, but this lab models only a narrow sentinel: `_tag`, fields, and `Error` inheritance.
- `Effect.succeed`, `Effect.fail`, and `Effect.tryPromise` are inert/lazy test sentinels. They are not a ManagedRuntime, fiber, scheduler, dependency environment, or promise interpreter.
- Vendor inspection for the Effect integration TODO pass used official docs plus temporary package metadata/source inspection, not a repo dependency install.
- Inspected package: `effect@3.21.2`.
- The inspected package exports root/subpath surfaces for `Effect`, `Layer`, `Scope`, `ManagedRuntime`, `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, `Stream`, `Fiber`, `FiberRef`, `Config`, `Logger`, `Tracer`, `Metric`, and `Data`.
- Current vendor spelling supports root `pipe` or value `.pipe(...)`; `Effect.pipe` is not the verified namespace spelling.
- Do not install `effect` into this repo for TODO-only evidence. Install it later only when production runtime substrate or a deliberate vendor compile probe needs real package types through the repo's normal dependency workflow.

## oRPC

- Installed package metadata reports `@orpc/server` `1.13.5`, but Bun's local package cache for this repo includes README/package metadata only, not the built type/source files.
- Official oRPC docs use `.handler(...)` as the native procedure terminal and model routers as plain/nestable procedure objects.
- Therefore, `.effect(...)` in this lab means the RAWR runtime-realization authoring terminal, not native oRPC API surface.
