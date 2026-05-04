---
title: RAWR Service Package Effect — vendor-integration shape reference
id: rawr-service-package-effect-vendor-integration-shape-reference
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:39:45.013425Z'
updated: '2026-05-01T21:10:19.011408Z'
source: /Users/mateicanavra/Downloads/RAWR_Service_Package_Effect_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: vendor_integration_shape_reference
- source_path: /Users/mateicanavra/Downloads/RAWR_Service_Package_Effect_Spec.md
- runtime_authority: no
- **CRITICAL**: This document is a SHAPE reference, NOT a scope source. It illustrates the "stand on the shoulders of giants" integration pattern made concrete for the oRPC × Effect × RAWR triad. It must not be cited as authoritative on what concerns RAWR covers; it is cited only for HOW vendor integrations should be constructed. The companion Runtime Realization System spec supersedes it on every runtime boundary point.

## Scope and purpose

This snapshot preserves the service-package design proposal that emerged from a Runtime Realization review and a Todo/HQ SDK/oRPC ingest investigation. It defines a concrete pattern for integrating two strong vendors (oRPC for callable contracts, Effect for local execution) inside RAWR's ownership boundary, while keeping each vendor in its zone of strength. It is explicitly framed as not authoritative over runtime boundaries: "Authoritative snapshot of the current service-package proposal. Not authoritative over runtime boundaries. Not the final service-package canonical specification."

For this digest, the load-bearing material is the integration-shape rules (Sections 3, 4, 5, 11, 12, 14, 18) — the law that other vendor integrations (Inngest, Bun, Drizzle, HyperDX, Elysia, etc.) should mirror. The decision record (Section 6, fifteen decisions) is the worked example showing how the pattern survives contact with a real, opinionated vendor pair.

## The integration shape (the pattern, generalized)

The spec articulates a tri-zone pattern repeatable for any vendor pair. Stated as the canonical thesis:

> "Services own truth. oRPC owns callable contracts. Effect owns local execution mechanics. RAWR owns the service/runtime boundary."

And as the meta-rule (Section 3):

> "Use native idioms inside each boundary. Use RAWR constraints only at ownership/lifecycle seams."

> "Do not teach a custom RAWR mini-language where a native technology already has a clear idiom. Wrap the import surface and ownership seams instead."

This generalizes to: for any vendor V that RAWR integrates, find V's zone of native strength (callable contracts, durable orchestration, query authoring, HTTP listening, telemetry export, etc.); let authors write V the way V's docs would teach; have RAWR own only the lifecycle/ownership/runtime seams that V cannot or should not own; expose V through a RAWR-owned import facade so the surface is constrained without inventing a new DSL.

### Three universal seams RAWR always owns

1. **Import surface** — public types/values are re-exported through `@rawr/sdk/<vendor>` facades, never imported directly by services/plugins/apps. The facade mirrors native names where allowed and omits names that would let authors construct lifecycle authority themselves.
2. **Lifecycle/runtime construction** — the vendor's runtime/managed-runtime/connection-pool/durable-engine construct is built once, by the runtime substrate, never by service authoring code.
3. **Descriptor handoff** — service authoring produces declarative descriptors (contract + handler/effect terminal + dep declarations); the runtime compiles those descriptors and runs the vendor.

## How Effect specifically is integrated

### Effect features used

The spec curates a precise subset of Effect for service authors:

```
Effect.succeed   Effect.fail        Effect.gen
Effect.tryPromise  Effect.all        Effect.timeout
Effect.retry      Effect.mapError    Effect.catchTag
Effect.catchTags  Effect.orElse      Effect.match
Effect.withSpan   Effect.interruptible
TaggedError       RawrEffect (success/error type)
generator-style .effect(function*) terminal
typed failure channel
```

These are the local-execution primitives — composing IO, mapping errors, retrying transient failures, timing out, observing spans. They are functional, descriptor-shaped, and interpretable.

### Effect features deliberately NOT exposed

```
ManagedRuntime          Runtime.run*           Layer.launch
Context.Tag             Scope construction      raw Queue / PubSub
Fiber / Stream / Schedule constructors          unsafe daemon/fork
effect-orpc public authoring
```

These are runtime-authority primitives. They build or compose the Effect runtime itself, register services into a Layer graph, fork detached fibers, or open long-lived streams/schedules. RAWR keeps these out of authoring because the runtime substrate is the single ManagedRuntime owner per process — handing them to service code would let services compose alternate runtimes, leak fibers past finalization, and bypass `ProcessExecutionRuntime`.

The split is the canonical example of "stand on shoulders": Effect is unmatched at typed effectful composition (kept), but its runtime/concurrency authority belongs to one owner (denied to service code).

### Forbidden patterns reify the boundary

```
forbidden.raw-effect-service          (no Effect.Service species)
forbidden.raw-effect-orpc-authoring   (no effect-orpc imports outside SDK)
forbidden.managed-runtime-in-authoring (no ManagedRuntime construction)
forbidden.effect-layer-app-composition (no Layer-as-app-membership)
forbidden.effect-in-contract           (contracts stay cold)
forbidden.raw-effect-public-export     (Effect/Layer/Scope/MR not exported)
```

These read as a generalizable schema: for any vendor, list the native species the vendor invites you to mint, and forbid them in favor of RAWR descriptors that the runtime lowers.

## How oRPC specifically is integrated

oRPC is treated as the native authoring shape for callable contracts. Authors keep all of oRPC's idioms:

> "contract / implementer / middleware / context / .handler / .use / .router"

The integration adds two seams without reinventing the surface:

1. **A second terminal** — `.effect(function* ...)` joins `.handler(...)` as a procedure terminal. Both produce descriptors compiled by RAWR; only `.effect` carries Effect failure channel/typed errors.
2. **Lane-shaped initial/execution context** — `defineService({ id, deps, scope, config, invocation, metadataDefaults })` lowers to oRPC's native InitialContext/ExecutionContext lanes through SDK plumbing. Authors author RAWR lanes; oRPC sees its native context shapes.

Critically, oRPC owns the contract → caller-error boundary. Effect is allowed to fail through a typed error, but the caller sees it only as a declared oRPC contract error. This is the integration's clean error bridge:

> "Keep oRPC contract errors as the caller boundary source of truth. Map Effect failure-channel values into that same oRPC boundary. Unexpected internals become diagnostics/internal boundary failures unless explicitly mapped to declared contract errors."

## What RAWR owns in between (the don't-own-still-manage frontier)

The entire spec IS this frontier, made concrete for one vendor pair. RAWR doesn't own callable transport (oRPC does); RAWR doesn't own effect composition or fiber semantics (Effect does); but RAWR still must manage:

- which Effect runtime exists, how many, when it starts/stops
- which oRPC context shapes carry RAWR lanes
- how vendor-typed errors map to caller errors
- whether a procedure call is awaitable (`.promise`) or yieldable (`.effect`)
- how telemetry from both vendors flows into a single correlation
- which descriptors compile to which terminals
- which imports are allowed to leak the vendors' raw types

This is captured in the boundary table (Section 4):

```
Runtime owns: normalized graph consumption / service binding plans /
  service binding cache / compiled execution plans / process runtime /
  ProcessExecutionRuntime / EffectRuntimeAccess / ManagedRuntimeHandle /
  adapter lowering / harness handoff / runtime diagnostics /
  runtime telemetry correlation / deterministic finalization

Service Package owns: package topology / public/private exports /
  base/impl/contract/router/module responsibilities / oRPC contract
  authoring / service & module middleware / context lane projection /
  provided-context middleware / repositories / handler/effect authoring
  rules / service semantic errors / service semantic observability /
  service analytics contribution / package tests and gates
```

The mirrored handoff (descriptors in, bound clients/results/diagnostics out) is the contract for how authoring meets runtime in any vendor integration:

```
Service package produces:
  ServiceDefinition / service contract / router/implementation
  descriptors / dependency declarations / runtime-carried lane schemas /
  service binding plan inputs / execution descriptors

Runtime consumes those, produces:
  bound service clients / execution results / diagnostics /
  runtime telemetry correlation
```

## Standing-on-shoulders rules — extracted as general law

The spec implicitly defines a checklist any future vendor integration must satisfy. Extracted:

1. **Identify zone of strength.** Pick exactly the things the vendor is best in the world at (oRPC: contracts; Effect: typed effectful composition; Inngest: durable orchestration; Bun: fast runtime; Drizzle: SQL DSL).
2. **Author native inside that zone.** Service code must read like the vendor's docs, not like a RAWR DSL.
3. **Wrap the import surface.** Re-export native types/values from `@rawr/sdk/<vendor>`. Mirror native names where safe; omit lifecycle authority.
4. **Forbid lifecycle authority in authoring.** No vendor-runtime construction in services/plugins/apps. The runtime substrate owns one of each.
5. **Compile to descriptors, not to vendor calls.** Authoring produces declarative descriptors; the runtime lowers them to vendor invocations.
6. **One canonical terminal per execution mode.** No ambiguous return shape. Here `.handler` vs `.effect`; `.promise` vs `.effect` clients. Generalizes: explicit, named facades.
7. **Boundary errors = vendor's contract; internal errors = diagnostics by default.** Map vendor failure channels into the boundary error type explicitly.
8. **Telemetry split.** Runtime owns lifecycle/correlation telemetry; vendor authoring owns semantic span enrichment; product analytics is an explicit declared resource.
9. **Cross-service collaboration goes through bound clients, not vendor primitives.** Authors cannot reach across service internals via vendor mechanisms.
10. **Type/import/runtime gates.** Static gates ensure the rules above are enforced in CI, not just convention.

Applied to other vendors (interpreted, not in the spec):
- **Inngest**: durable orchestration is Inngest-shaped (`step.run`, `step.sleep`, fan-out); the Effect-side `.effect(...)` for an async-step plugin uses local Effect retry only for transient inside one step; `Durable retries belong to Inngest, not local Effect`.
- **Bun/Elysia**: HTTP listener is Bun/Elysia-shaped (Elysia routes, plugin middleware); RAWR owns adapter lowering and process lifecycle.
- **Drizzle**: schema is Drizzle-native; repository methods return `RawrEffect<T, RepositoryError>` over `Effect.tryPromise(() => drizzle.query(...))`; raw drizzle never escapes a service module.
- **HyperDX**: telemetry export is HyperDX-shaped under the hood; runtime owns the OTel bootstrap; services emit semantic spans through `telemetry.span(...)`.

The Decision 14 default-policy matrix is itself the generalization point, naming policy per terminal kind across local execution / async step / cli command / agent tool / desktop background / provider acquire — each is a vendor-shaped seam with its own retry/timeout/interruption defaults.

## Verbatim load-bearing quotes

1. (Sec 0) "Authoritative snapshot of the current service-package proposal. Not authoritative over runtime boundaries. Not the final service-package canonical specification."
2. (Sec 3) "Use native idioms inside each boundary. Use RAWR constraints only at ownership/lifecycle seams."
3. (Sec 3) "Do not teach a custom RAWR mini-language where a native technology already has a clear idiom. Wrap the import surface and ownership seams instead."
4. (Sec 3) "This matters most for Effect. Effect should feel like Effect in service-internal local execution, but services must not own raw Effect runtime construction."
5. (Sec 5) "Services own truth. oRPC owns callable contracts. Effect owns local execution mechanics. RAWR owns the service/runtime boundary."
6. (Sec 5) "One service species. One generated topology. One contract-first oRPC implementation tree. Two terminal execution modes. One runtime owner."
7. (Sec 5) "There are normal service packages whose procedures can terminate in either `.handler(...)` or `.effect(...)`."
8. (Sec 6.2) "Use native-shaped Effect authoring through a RAWR-owned import surface."
9. (Sec 6.10) "Keep oRPC contract errors as the caller boundary source of truth. Map Effect failure-channel values into that same oRPC boundary."
10. (Sec 6.11) "Runtime/host owns telemetry bootstrap and correlation. Services own semantic observability enrichment. Product analytics is explicit, not hidden universal BaseDeps."
11. (Sec 6.12) "RAWR should mimic effect-orpc's native authoring shape, but effect-orpc must not own public service execution."
12. (Sec 6.12) "Descriptor-first RAWR execution. .service/.plugin .effect(function*) authoring -> RAWR SDK captures EffectExecutionDescriptor -> oRPC route/procedure wrapper remains contract-shaped -> invocation calls ProcessExecutionRuntime -> ProcessExecutionRuntime lowers/runs RawrEffect via EffectRuntimeAccess."
13. (Sec 6.13) "Bound service clients expose explicit `.promise` and `.effect` facades. No ambiguous default call shape inside RAWR execution contexts."
14. (Sec 6.14) "Both handler and effect execute through ProcessExecutionRuntime. Only Effect mode gets full local execution policy semantics. No hidden retries by default. Detached fibers are forbidden in authoring. Durable retries belong to Inngest, not local Effect."
15. (Sec 11) "no raw Effect imports / no raw effect-orpc imports / no ManagedRuntime in authoring / no local runtime construction / no service-owned adapter wiring / no raw effect layers as app composition"
16. (Sec 18) "Native oRPC where contracts and middleware live. Native-shaped Effect where local execution lives. RAWR-owned boundaries where lifecycle, ownership, and runtime access live."

## Don't-own-still-manage frontier — explicit instances in this spec

| Concern | RAWR doesn't own | RAWR still manages |
|---|---|---|
| Effect runtime | Effect's ManagedRuntime/Layer/Fiber semantics | One ManagedRuntime per process via runtime substrate; descriptor compilation; finalization order |
| oRPC transport | oRPC's contract/router/middleware/client mechanics | Lane lowering; descriptor capture; binding cache; invocation forwarding |
| effect-orpc | effect-orpc's `.effect(...)` syntax/typing | SDK-internal-only consumption; never exported; descriptor-first wrapping |
| SQL/IO via Promise | Underlying DB/SDK Promise mechanics | `Effect.tryPromise` boundary; tagged repository errors; `RawrEffect` return rule |
| OTel | OTel bootstrap & exporter wiring | Runtime-owned bootstrap; service-side semantic spans; correlation linkage |
| Product analytics | Analytics SDK shape | Explicit declared `resourceDep(AnalyticsSinkResource)`; not hidden in BaseDeps |
| Durable async retries | Inngest retry/durability | Forbidden as local-Effect concern; declared as Inngest's job |

## Completeness signals (shape-quality, not scope)

- Status line: "Investigation snapshot, not final canonical specification." This is appropriate humility for a shape reference.
- Section 12 lists five "Implementation proof points before final lock" (generator-native typing; descriptor-first oRPC; error bridge; client facades; import gates) — these are integration-shape risks the spec admits.
- Section 17 reconciliation checklist enumerates twelve axes the next session must align with the updated Runtime spec — admitting boundary points that may shift (e.g., `Effect` vs `fx` facade name, generator-native vs callback-returning `.effect`).
- Section 13 gate plan is unusually concrete: static/import gates, type gates, runtime behavior gates, fixture/plan gates, mandatory service-specific gates. This is the rare spec that says how it will be enforced.
- Section 15 drift classification table catalogs twelve known drifts vs the Runtime spec, each labeled (boundary pollution / accidental drift / intentional migration / problematic regression / wording issue / real ambiguity / intentional supersession / correct).

## Cross-spec dependencies

- Defers to: **Runtime Realization System Canonical Spec** for runtime lifecycle, ProcessExecutionRuntime, EffectRuntimeAccess, ManagedRuntimeHandle, adapter lowering, harness, runtime catalog, multi-process placement, import law.
- Uses as evidence: Golden Todo service package, HQ SDK, ORPC Ingest Domain Packages, oRPC docs, Effect docs, effect-orpc repo.
- The pattern declared here is the integration template the landscape report should expect for every other vendor edge (Inngest, Bun, Elysia, Drizzle, HyperDX, etc.).

## Estimated shape-quality grade

**A−.** As a shape reference for "stand on shoulders" vendor integration, this is among the most explicit artifacts available in the corpus. It states the meta-rule, names the seams, lists what to expose vs forbid, gives the import-facade discipline, names the descriptor-first compile target, defines an error bridge, splits telemetry/analytics ownership, and closes with concrete static/type/runtime gates. The half-grade deduction is because (a) it self-identifies as a snapshot pending Runtime-spec reconciliation on twelve axes, and (b) some of the rules (generator-native typing, descriptor capture from `.effect(function*)`) are listed as proof points, not closed. As a SHAPE reference (the role assigned in this digest), it is gold-standard. As a SCOPE source it must not be used.
