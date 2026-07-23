# Effect Vendor Evidence

## Map

| Need | Answer |
| --- | --- |
| What RAWR relies on | Real Effect execution semantics behind a curated RAWR facade |
| Current lab evidence | `vendor-proof` plus contained `simulation-proof` through RAWR runtime wrappers |
| System impact | Runtime substrate, provider lowering, process-local resources, boundary policy, finalization |
| Related system map | `../systems/effect-integration-map.md` |

## Current Vendor Facts

- Installed package: `effect@4.0.0-beta.100`. The runtime-realization tool
  consumes the root development dependency; the lifecycle service and its
  filesystem/process resources consume the same exact package as a production
  dependency. The tool is not a workspace package.
- `@rawr/sdk/effect` remains a RAWR facade, but `RawrEffect<A, E, R>` is backed
  by real `Effect.Effect<A, E, R>`.
- The facade exposes curated authoring helpers, root `pipe`, value
  `.pipe(...)`, `TaggedError`, and policy types.
- The facade intentionally does not expose raw `ManagedRuntime`, `Layer`,
  `Queue`, `PubSub`, `Stream`, `Schedule`, or runtime constructors.
- `TaggedError("Tag")<{ ... }>` is backed by Effect's `Data.TaggedError`
  spelling.
- Verified composition spelling is root `pipe` or value `.pipe(...)`, not
  `Effect.pipe`.
- `Effect.repeat(effect, Schedule.recurs(n))` returns schedule output; examples
  must not assume the repeated action output is returned.
- `Stream.runCollect(...)` returns an array in this Effect 4 release, so the lab
  uses the returned array directly at boundaries.
- Root/subpath exports inspected and used where relevant include `Effect`,
  `Layer`, `Scope`, `ManagedRuntime`, `Queue`, `PubSub`, `Ref`, `Deferred`,
  `Schedule`, `Stream`, `Fiber`, `FiberRef`, `Config`, `Logger`, `Tracer`,
  `Metric`, and `Data`.

## Current Lab Evidence

- Vendor tests run real Effect programs for `Effect.gen`, `yield*`, root
  `pipe`, value `.pipe(...)`, `Exit`, `Cause`, typed failure, defects,
  interruption through `AbortSignal`, scoped acquire/release, finalizer
  ordering, and `ManagedRuntime`.
- Process-local `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, and `Stream`
  behavior is exercised only through the lab's RAWR-owned process-local
  resource probe, not as standalone vendor demonstrations.
- Provider acquire/release, boundary policy, finalization, and runtime access
  are proven only through contained RAWR oracle paths.

## Evidence Pointers

- `accepted.curated-effect-public-surface`
- `vendor.effect.runtime-substrate`
- `vendor.effect.process-local-coordination`
- `audit.p1.provider-effect-plan-lowering`
- `audit.p1.effect-boundary-policy-matrix`
- `../systems/effect-integration-map.md`

## Golden Integration Pattern

Reference:
`docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`.

Use this as a native-fit integration exemplar: author-facing APIs should feel
native to the vendor where that improves DX, while RAWR owns lifecycle,
runtime construction, import law, diagnostics, telemetry correlation, policy,
context projection, and finalization seams.

It is not authority over runtime boundaries, lifecycle, public SDK names,
adapter lowering, provider acquisition/finalization, proof categories, or
Parent-Repo Migration authorization. Its older `.handler(...)` / `.effect(...)`
terminal split is superseded; RAWR `.effect(...)` remains the runtime
realization execution terminal.

## Not Proven

Effect vendor proof does not settle final RAWR runtime-substrate public/internal
contracts, public helper lists, provider API/DX, production config/secret
policy, durable async policy, native host error mapping, or production
Parent-Repo Migration authorization.

## Future Official-Docs Requirement

Any future Effect work that models advanced runtime idioms, Layer/Scope
composition, Config, Logger, Tracer, Metric, Stream, Schedule, or resource
lifecycle policy must run a dedicated official-doc/source pass before becoming
normative integration guidance.
