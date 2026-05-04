# Vendor Fidelity Notes

This lab uses canonical-looking imports to test the RAWR authoring spine. Those imports are local aliases, not vendor packages.

## TypeScript

- Local compiler: TypeScript `5.9.3`.
- Discriminated descriptor refs rely on TypeScript's normal discriminated-union narrowing.
- Manifest and artifact fixtures use `satisfies` to validate object shape while preserving literal inference.
- Generator checks rely on the installed `Generator<TYield, TReturn, TNext>` definition, where `TYield` is the yielded value type.

## Effect

- The lab installs `effect@3.21.2` as a root `devDependency` only. It is not a production dependency and the tool is not a workspace package.
- `@rawr/sdk/effect` remains a RAWR facade, but in Lab V2 `RawrEffect<A, E, R>` is backed by real `Effect.Effect<A, E, R>`.
- The facade intentionally exposes curated authoring helpers, root `pipe`, value `.pipe(...)`, `TaggedError`, and policy types. It does not expose raw `ManagedRuntime`, `Layer`, `Queue`, `PubSub`, `Stream`, `Schedule`, or runtime constructors.
- `TaggedError("Tag")<{ ... }>` is backed by Effect's `Data.TaggedError` spelling.
- Vendor tests run real Effect programs for `Effect.gen`, `yield*`, root `pipe`, value `.pipe(...)`, `Exit`, `Cause`, typed failure, defects, interruption through `AbortSignal`, scoped acquire/release, finalizer ordering, and `ManagedRuntime`. Process-local `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, and `Stream` behavior is exercised only through the lab's RAWR-owned process-local resource probe, not as standalone vendor demonstrations.
- `Effect.repeat(effect, Schedule.recurs(n))` returns schedule output. The vendor lane records this explicitly; examples must not assume the repeated action output is returned.
- `Stream.runCollect(...)` returns a `Chunk`, so lab code converts with `Chunk.toArray(...)` at boundaries.
- Root/subpath exports inspected and now used where relevant include `Effect`, `Layer`, `Scope`, `ManagedRuntime`, `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, `Stream`, `Fiber`, `FiberRef`, `Config`, `Logger`, `Tracer`, `Metric`, and `Data`.
- Current vendor spelling supports root `pipe` or value `.pipe(...)`; `Effect.pipe` is not the verified namespace spelling.
- Real Effect runtime semantics are proven only for the narrow lab lanes listed in `proof-manifest.json`; unresolved RAWR public runtime substrate decisions remain `xfail` entries.

## oRPC

- Installed packages: `@orpc/contract` and `@orpc/server` `1.13.5`.
- The vendor boundary probe compiles native `oc.router(...)`, `implement(contract).$context<...>()`, and native `.handler(...)` shapes.
- `.effect(...)` in this lab means the RAWR runtime-realization authoring terminal, not native oRPC API surface. The lab does not assert a fake oRPC `.effect(...)` negative because oRPC never claimed that API.

## TypeBox

- Installed package: `typebox` `1.0.81`.
- The boundary probe uses `Type.Object(...)`, `Static`, `Value.Check`, `Value.Errors`, and `Compile(...).Check(...)`.
- Raw TypeBox schemas are vendor schema values. They become RAWR `RuntimeSchema<T>` only through an explicit RAWR adapter.

## Inngest

- Installed package: `inngest` `3.51.0`.
- The boundary probe constructs an `Inngest` client, a `createFunction(...)` step callback, and the `inngest/bun` `serve({ client, functions })` handoff shape.
- The lab does not claim durable scheduling, retries, idempotency, or production Inngest host semantics.

## Semantica

- The `codex/semantica-first-pipeline-implementation` branch is inspected read-only as evidence discovery only.
- That branch diverges from the runtime lab stack and must not be merged into this implementation branch.
- Semantica output may point reviewers to source spans, but it is not architecture authority and cannot promote a manifest entry to proof without a concrete gate.
