# Runtime Realization Lab V2 Plan

Status: ready to implement with named architecture experiments.
Artifact owner: host/integrator.
Target project: `tools/runtime-realization-type-env`.
Current branch context when written: `codex/runtime-realization-lab-v2-plan`.

## 1. Decision Summary

The current lab is useful but inadequate for runtime migration planning. It proves TypeScript authoring shape, negative misuse cases, and a tiny descriptor/registry simulation. It does not prove real Effect runtime semantics, provider lowering, process-local coordination, host adapter lowering, durable async bridge behavior, boundary diagnostics, or deployment handoff compatibility.

V2 must become a contained miniature of the accepted runtime realization spine:

- Keep the project under `tools/runtime-realization-type-env`.
- Add real `effect@3.21.2` as the default vendor-native lab dependency.
- Keep `effect@4.x beta` out of the repo; use it only as an optional compatibility research lane.
- Preserve local `@rawr/sdk/*` aliases, but back relevant `RawrEffect` shapes with real Effect types and runtime execution.
- Add a mini runtime that models derivation, compilation, provisioning, registry assembly, invocation, provider lowering, process-local resources, host adapter callback lowering, diagnostics, and deployment handoff.
- Keep unresolved spine questions as explicit `xfail` or experiment lanes. The lab may surface candidate answers; it must not silently decide architecture.

The lab remains non-production. It is a proving ground for spec finalization and migration planning, not the SDK, not the runtime, and not a shortcut around the migration.

## 2. Team Workflow Record

The V2 plan was shaped with these read-only lenses:

| Lens | Input | Output Used |
| --- | --- | --- |
| Spec spine cartographer | Canonical runtime spec, deployment spec, M2 core-spine audit, current manifest | Proof gaps, proof/xfail/todo boundaries, deployment handoff constraints |
| Effect vendor agent | `effect` package metadata and official Effect docs | Real vendor probes, version choice, v4 cautions |
| Boundary vendor agent | Repo dependencies, current oRPC/Inngest/TypeBox/Bun/Nx usage | Which dependencies must be real vs shape-accurate fake |
| Mini-runtime/evidence reviewer | Current lab project, scripts, fixtures, report | V2 layer model, target names, red-team risks |
| Host/integrator | All packets | Final architecture, gates, implementation sequence, readiness verdict |

Team relationship contract for implementation:

- Workers may own disjoint write areas, but the host owns the final evidence model and gate semantics.
- Vendor workers produce compile/runtime probes, not public SDK design decisions.
- Architecture workers may create experiment lanes, but only the host may promote entries to `proof`.
- Review workers check for facade theater, dependency drift, and premature architecture closure after each category.

## 3. Current Lab Baseline

The current lab has these strengths:

- Nx-visible isolated project with `sync`, `structural`, `report`, `typecheck`, `negative`, `simulate`, and `gate`.
- Local pseudo-SDK aliases for `@rawr/sdk/*`.
- Positive fixtures for services, server plugins, async workflows, resources/providers/profiles, and app/plan artifacts.
- Negative fixtures for descriptor refs, authoring terminals, service invocation binding, portable closures, and profile misuse.
- Manifest/report model that separates `proof`, `xfail`, `todo`, and `out-of-scope`.
- Structural guard that keeps the lab out of root build/typecheck/test and out of production packages.

Its inadequacies are material:

- `@rawr/sdk/effect` is currently an inert facade, not backed by real Effect.
- `ProcessExecutionRuntime` only iterates sentinel generator bodies; it does not use Effect runtime execution.
- Provider acquisition/release is not lowered through real Effect `Layer`, `Scope`, or managed runtime semantics.
- Process-local queue/pubsub/ref/deferred/schedule/stream behavior is only recorded as TODO/xfail.
- oRPC, Inngest, and TypeBox are not proven through narrow boundary probes.
- Deployment handoff is not proven as a compile-only read model over runtime artifacts.

## 4. Target Lab Architecture

V2 keeps one Nx project, but separates concerns into lanes:

```text
tools/runtime-realization-type-env/
  evidence/
    proof-manifest.json
    focus-log.md
    vendor-fidelity.md
    spine-audit-map.md
    runtime-realization-lab-v2-plan.md
  src/
    sdk/
      effect.ts
      runtime/
      service/
      plugins/
      app.ts
    vendor/
      effect/
      boundaries/
    spine/
      artifacts.ts
      derivation.ts
      compilation.ts
    mini-runtime/
      managed-runtime.ts
      provider-lowering.ts
      process-runtime.ts
      process-resources.ts
      diagnostics.ts
      adapters/
      deployment-handoff.ts
  fixtures/
    positive/
    inline-negative/
    fail/
    todo/
    experiments/
  test/
    vendor-effect/
    vendor-boundaries/
    mini-runtime/
    spine-simulation.test.ts
  scripts/
    report-results.ts
    verify-structure.ts
    assert-negative-types.ts
```

Layer roles:

| Layer | Role | Default proof standard |
| --- | --- | --- |
| `src/sdk/**` | RAWR author-facing facade and local aliases | Typecheck and negative tests |
| `src/vendor/effect/**` | Real Effect imports, probes, and internal lowering helpers | Vendor typecheck plus runtime tests |
| `src/vendor/boundaries/**` | Narrow oRPC/Inngest/TypeBox/Bun/Nx probes | Vendor typecheck or smoke tests |
| `src/spine/**` | Descriptor refs, descriptor table, portable artifacts, compiled plans | Typecheck, negative tests, snapshot-like assertions |
| `src/mini-runtime/**` | Mini managed runtime, registry, provider lowering, invocation, adapter lowering | Bun runtime tests |
| `fixtures/**` | Positive, negative, fail, todo, and experiment scenarios | Status-specific gates |
| `evidence/**` | Manifest, focus, vendor notes, audit map, plan | Structural guard and report |

Containment rules:

- Do not create `tools/runtime-realization-type-env/package.json`.
- Do not add the lab to root `build`, root `typecheck`, root `test`, package workspaces, or published exports.
- Add real `effect` to root dev dependencies for V2 lab execution. Do not import it from production packages until a migration slice intentionally promotes runtime substrate code.
- Keep pseudo-SDK aliases local to the lab `tsconfig`.
- The structural guard must continue blocking production package imports and root project membership drift.

## 5. Required Dependencies

Default dependency decisions:

| Dependency | V2 handling | Reason |
| --- | --- | --- |
| `effect@3.21.2` | Add as root dev dependency for the lab | Current latest stable; required to prove real runtime semantics |
| `effect@4.x beta` | Do not add; inspect in `/tmp` only if needed | API drift is real and should not destabilize the migration proof |
| `@orpc/contract`, `@orpc/server` | Use installed repo versions in narrow boundary probes | oRPC owns callable contracts and server handler shapes |
| `@orpc/openapi` | Use only if added deliberately or already reachable through server workspace | OpenAPI proof is useful but not required for the first V2 spine gate |
| `inngest` | Use installed repo version for function bundle and `inngest/bun` serve-shape probes | Durable async host shape must not be completely fake |
| `typebox` | Use installed repo version for runtime schema adapter probes | Fake schema parsing would hide JSON schema and diagnostics drift |
| Bun/Nx | Always real | Workspace/project/gate behavior is part of the lab containment proof |

Vendor facts to encode in `vendor-fidelity.md` during implementation:

- `effect@latest` is `3.21.2` when this plan was written.
- `effect@beta` is `4.0.0-beta.59` and is not the implementation target.
- Official Effect docs cover `Effect.gen`, `pipe`, `.pipe`, `Layer`, `Scope`, `Runtime`, `Queue`, `PubSub`, `Deferred`, `Ref`, `Schedule`, `Stream`, `Cause`, and `Exit`.
- Use root `pipe` or value `.pipe(...)`, not `Effect.pipe`.
- `Effect` runtime proof means running real effects through a real runtime and inspecting `Exit`/`Cause` where relevant, not iterating a sentinel generator.

Official docs to cite in vendor notes:

- `https://effect.website/docs/getting-started/using-generators/`
- `https://effect.website/docs/getting-started/building-pipelines/`
- `https://effect.website/docs/requirements-management/layers/`
- `https://effect.website/docs/resource-management/scope/`
- `https://effect.website/docs/runtime/`
- `https://effect.website/docs/concurrency/queue/`
- `https://effect.website/docs/concurrency/pubsub/`
- `https://effect.website/docs/concurrency/deferred/`
- `https://effect.website/docs/state-management/ref/`
- `https://effect.website/docs/scheduling/introduction/`
- `https://effect.website/docs/stream/introduction/`
- `https://effect.website/docs/data-types/cause/`
- `https://effect.website/docs/data-types/exit/`

## 6. Proof Surface Ledger

| Claim | Required dependency | Miniature component | Evidence shape | Target status |
| --- | --- | --- | --- | --- |
| Public authoring uses `.effect(...)`, not `.handler(...)`, Promise terminals, raw Effect runtime, or `fx` | TypeScript, Effect types | `src/sdk/**` | Positive authoring fixtures plus inline negatives | `proof` |
| `RawrEffect` is backed by real `Effect.Effect<A, E, R>` while hiding raw runtime constructors | `effect@3.21.2` | `src/sdk/effect.ts`, `src/vendor/effect/**` | Typecheck plus public-surface negatives | `vendor-proof` |
| Descriptor refs are boundary-discriminated and portable artifacts carry refs only | TypeScript | `src/spine/artifacts.ts` | Positive artifacts plus `.fail.ts` closure fixtures | `proof` |
| SDK derivation can produce refs/table without executing workflow bodies or parsing arbitrary code | TypeScript | `src/spine/derivation.ts` | Positive derivation fixtures plus negative unsafe factory fixtures | `proof` after route/async association experiments lock |
| Execution registry pairs compiled plans with descriptor table entries before invocation | TypeScript, Effect | `src/mini-runtime/process-runtime.ts` | Runtime tests for match, mismatch, duplicate, missing descriptor | `simulation-proof` |
| `ProcessExecutionRuntime` runs real Effect values through runtime-owned execution access | `effect@3.21.2` | `src/mini-runtime/managed-runtime.ts`, `process-runtime.ts` | Runtime tests using `runPromiseExit`, failure, defect, interruption | `vendor-proof` |
| Provider build returns `ProviderEffectPlan`, not `CompiledExecutionPlan` or Promise | TypeScript, Effect | `src/sdk/runtime/providers`, `src/mini-runtime/provider-lowering.ts` | Typecheck, negative tests, runtime acquire/release smoke | `xfail` until plan shape is locked |
| Provider lowering handles acquire/release, scope, finalizers, rollback, diagnostics | `effect@3.21.2` | `src/mini-runtime/provider-lowering.ts` | Runtime finalizer/release order tests | `xfail` until `ProviderEffectPlan` fields are locked |
| Process-local queue/pubsub/ref/deferred/schedule/stream resources are local runtime infrastructure only | `effect@3.21.2` | `src/mini-runtime/process-resources.ts` | Runtime coordination tests plus negatives against durable/cross-process claims | `vendor-proof` once facade law is locked |
| `RuntimeResourceAccess` is narrow and does not expose runtime internals | TypeScript, Effect | `src/sdk/runtime/resources`, `src/mini-runtime/process-resources.ts` | Positive require/optional fixture plus raw access negatives | `xfail` until method law is locked |
| Workflow dispatcher access is explicit, not ambient unless the spec deliberately says otherwise | TypeScript, Inngest shape | `src/sdk/plugins/server`, `src/mini-runtime/adapters/internal.ts` | Positive opt-in fixture plus ambient-access negative | `xfail` until dispatcher declaration is locked |
| Async step bodies are statically declared and host invocation lowers into process runtime | TypeScript, Effect, Inngest shape | `src/sdk/plugins/async`, `src/mini-runtime/adapters/async.ts` | Positive step invocation test plus membership experiment | `xfail` until workflow/schedule/consumer-to-step association is locked |
| Server/internal/CLI/agent/desktop/web adapters do not execute effects themselves | TypeScript, selected real boundary deps | `src/mini-runtime/adapters/**` | Adapter smoke tests asserting registry delegation | `simulation-proof` |
| oRPC authoring and host adapter shape are vendor-aligned | `@orpc/contract`, `@orpc/server` | `src/vendor/boundaries/orpc.ts` | Compile probe for contract/server handler boundary | `vendor-proof` |
| Inngest async handoff is shape-accurate but durable semantics remain out of scope | `inngest` | `src/vendor/boundaries/inngest.ts` | Compile probe for function/serve handoff, no scheduler test | `vendor-proof` for shape, `out-of-scope` for durability |
| RuntimeSchema uses real schema backing where portability matters | `typebox` | `src/sdk/runtime/schema`, `src/vendor/boundaries/typebox.ts` | Serialization/validation/redaction probes | `vendor-proof` |
| Deployment consumes compile-only runtime handoff and never starts/provisions/mounts runtime | TypeScript | `src/mini-runtime/deployment-handoff.ts` | Positive handoff fixture plus negative live-handle leakage fixture | `proof` |

## 7. Open Spine Experiments

These remain named experiments, not hidden decisions:

| Experiment | Why open | V2 requirement |
| --- | --- | --- |
| Async step membership | Current visible association may require parsing/executing workflow `run(...)` unless a declarative association exists | Keep `xfail`; add one or more experiment fixtures for explicit `steps`, plugin-level mapping, or equivalent association |
| `ProviderEffectPlan` shape | Provider acquire/release is central but payload, error, release, telemetry, policy, and lowering fields are not fully locked | Keep `xfail`; model candidate shapes behind experiment paths only |
| Dispatcher access declaration | Ambient `context.workflows` conflicts with derivable operation descriptors if access is meant to be opt-in | Keep `xfail`; test ambient vs declared access as separate candidates |
| `RuntimeResourceAccess` method law | Context uses the surface but exact require/optional/metadata behavior is not locked | Keep `xfail`; test narrow methods without leaking runtime internals |
| Server route derivation mechanics | Cold route factories are likely safe to invoke during derivation, but the rule needs explicit proof | Keep `xfail` until import-safe derivation behavior is stated and tested |
| Boundary policy matrix | Timeout, retry, interruption, telemetry, redaction, Exit/Cause mapping need executable semantics | Promote only after real Effect runtime tests prove the mapping |
| First resource/provider catalog cut | Needed for migration planning but not core architecture truth | Keep `todo`; add catalog fixtures as planning input |
| Source authority hygiene | Repo-local stale specs can mislead agents | Keep outside the type lab proof, but record as mandatory migration preflight |

## 8. V2 Implementation Phases

### Phase A: Containment And Dependency Preflight

- Create a child Graphite branch from the current lab branch.
- Add `effect@3.21.2` through Bun as a root dev dependency.
- Keep the lab out of root build/typecheck/test and package workspaces.
- Update `vendor-fidelity.md` to distinguish previous pseudo-Effect proof from new vendor-native proof.
- Extend `verify-structure.ts` so it allows the new lab dependency while still blocking production imports, public exports, tool package creation, and root gate membership drift.

Gate:

```bash
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:structural
git diff --check
```

### Phase B: Real Effect Substrate Probe

- Replace inert-only Effect assumptions with a curated facade backed by real `Effect.Effect<A, E, R>`.
- Add internal raw Effect imports only under `src/vendor/effect/**` and `src/mini-runtime/**`.
- Add vendor tests for `Effect.gen`, `yield*`, `pipe`, `.pipe`, `Layer`, `Scope`, `ManagedRuntime`, `runPromiseExit`, `Exit`, and `Cause`.
- Add runtime tests for scoped acquire/release and finalizer order.
- Add interruption tests proving cleanup still runs.

Gate:

```bash
bunx nx run runtime-realization-type-env:typecheck
bunx nx run runtime-realization-type-env:vendor-effect
```

### Phase C: Mini Runtime Spine

- Split the current `src/spine/simulate.ts` into explicit derivation, compilation, registry, managed runtime, process runtime, diagnostics, and deployment handoff modules.
- Keep the old simulation behavior as a compatibility test until the new runtime tests replace it.
- Run executable descriptors through real Effect runtime access.
- Preserve invocation-time context binding for clients, resources, workflows, execution metadata, telemetry, and request context.

Gate:

```bash
bunx nx run runtime-realization-type-env:mini-runtime
bunx nx run runtime-realization-type-env:simulate
```

### Phase D: Provider And Resource Experiments

- Add experiment fixtures for `ProviderEffectPlan` shape and lowering.
- Use real `Layer`, `Scope`, and finalizers in the mini runtime where the experiment is explicit.
- Add process-local resource experiments for queue, pubsub, ref, deferred, schedule, stream, cache, and concurrency limiter behavior.
- Keep `ProviderEffectPlan` and `RuntimeResourceAccess` manifest entries as `xfail` until the spec locks their public shapes.

Gate:

```bash
bunx nx run runtime-realization-type-env:vendor-effect
bunx nx run runtime-realization-type-env:mini-runtime
bunx nx run runtime-realization-type-env:report
```

### Phase E: Boundary Vendor Probes

- Add TypeBox-backed `RuntimeSchema` probes for runtime-carried schemas, JSON schema portability, diagnostics, and redaction metadata.
- Add oRPC compile probes for contract/server handler shape. Keep `.effect(...)` RAWR-owned; do not claim it is native oRPC.
- Add Inngest compile probes for function bundle or `inngest/bun` serve-shape handoff. Do not test durable scheduling in this lab.
- Add adapter miniatures that receive native callbacks and delegate to `ProcessExecutionRuntime`.

Gate:

```bash
bunx nx run runtime-realization-type-env:vendor-boundaries
bunx nx run runtime-realization-type-env:mini-runtime
```

### Phase F: Evidence Engine Upgrade

- Extend manifest status values to include `vendor-proof` and `simulation-proof`.
- Update `report-results.ts` so the report separates:
  - type-only proof;
  - vendor-native proof;
  - simulation proof;
  - xfail;
  - todo;
  - out-of-scope.
- Keep one `focus-log.md`; do not add owner/date/kanban workflow.
- Require every experiment fixture to map to a manifest entry and an oracle.
- Require every `proof`, `vendor-proof`, or `simulation-proof` entry to name a gate that would fail on regression.

Gate:

```bash
bunx nx run runtime-realization-type-env:report
bunx nx run runtime-realization-type-env:structural
```

### Phase G: Full V2 Gate And Review

- Expand the project `gate` target to run:
  - `sync`
  - `structural`
  - `report`
  - `typecheck`
  - `negative`
  - `vendor-effect`
  - `vendor-boundaries`
  - `mini-runtime`
  - `simulate`
- Run a red-team pass against facade risk, vendor mismatch, over-abstraction, and premature architecture decisions.
- Update this plan or the manifest if the implementation reveals a core architecture gap.

Gate:

```bash
bunx nx run runtime-realization-type-env:gate
git diff --check
git status --short
gt status --short
```

## 9. Nx Target Additions

Keep current targets and add:

| Target | Command intent | Required for gate |
| --- | --- | --- |
| `vendor-effect` | Run real Effect vendor type/runtime probes | Yes after Phase B |
| `vendor-boundaries` | Run oRPC/Inngest/TypeBox boundary probes | Yes after Phase E |
| `mini-runtime` | Run mini process runtime/provider/resource/adapter tests | Yes after Phase C |
| `gate:v1` | Preserve old gate temporarily if needed during transition | Optional, delete once V2 gate is stable |

Default command names:

```bash
bunx nx run runtime-realization-type-env:vendor-effect
bunx nx run runtime-realization-type-env:vendor-boundaries
bunx nx run runtime-realization-type-env:mini-runtime
bunx nx run runtime-realization-type-env:gate
```

## 10. Test Strategy

The lab tests claims, not files.

Highest-risk failure modes:

- The lab claims Effect integration while still running sentinel code.
- Public authoring leaks `Layer`, `Scope`, `ManagedRuntime`, `Context.Tag`, `FiberRef`, provider internals, or raw Effect runtime APIs.
- The mini runtime executes descriptors in adapters instead of delegating through the registry and process runtime.
- Provider lowering accidentally becomes a compiled execution plan.
- Process-local coordination resources are mistaken for durable async or cross-process state.
- Boundary adapters become generic fake hosts and lose oRPC/Inngest/TypeBox constraints.
- Deployment handoff accidentally contains live runtime handles, raw config, secrets, or executable closures.
- TODO/xfail entries are promoted without a failing oracle.

Required tests:

- Type tests for SDK authoring, descriptor refs, provider/resource/profile declarations, invocation context, and deployment handoff artifacts.
- Inline negative tests for forbidden public imports, forbidden raw runtime access, invalid descriptor identities, handler/fx terminals, and service calls before `.withInvocation(...)`.
- `.fail.ts` compiler assertions for portable executable closures, provider-as-compiled-plan, ambient dispatcher access if opt-in is selected, and deployment live-handle leakage.
- Vendor Effect runtime tests for managed runtime, scoped resource cleanup, interruption, error/defect/interruption mapping, queue/pubsub/ref/deferred, schedule/stream behavior, and pipe spelling.
- Boundary vendor probes for oRPC, Inngest, TypeBox, Bun/Nx.
- Mini-runtime tests for descriptor derivation, registry assembly, invocation context binding, provider lowering, process-local resources, adapter callback lowering, async bridge lowering, diagnostics, and deployment handoff.

Adequacy criterion:

- A green V2 gate must prove every `proof`, `vendor-proof`, and `simulation-proof` manifest entry.
- A green V2 gate must also prove that every `xfail` and `todo` remains visibly fenced.
- The report must make it impossible to confuse tracked TODOs with proven behavior.

## 11. Spec Feedback Workflow

When the lab reveals a result:

| Lab result | Required action |
| --- | --- |
| Existing spec rule passes against real vendor/runtime proof | Promote manifest entry and add spec-backport note |
| Existing spec rule fails because the lab was wrong | Fix lab and keep manifest status unchanged |
| Existing spec rule fails because the spec is underspecified | Add named issue to the plan/manifest and keep `xfail` |
| Experiment produces a viable architecture candidate | Write a decision packet or spec patch proposal before promotion |
| Production code is needed to prove the claim | Stop and split into migration work |

No lab code becomes production code automatically. Promotion requires an explicit migration slice.

## 12. Readiness Verdict

Verdict: ready to implement with named architecture experiments.

The V2 plan is decision-complete for building the next lab iteration. It deliberately does not resolve these core design questions:

- async workflow/schedule/consumer-to-step membership declaration;
- final `ProviderEffectPlan` producer/consumer shape;
- dispatcher access declaration;
- `RuntimeResourceAccess` method law;
- server route derivation mechanics;
- exact boundary policy defaults.

Those questions are the point of the next lab. The lab must make them executable enough to decide, while keeping them fenced until the spec accepts the answer.

## 13. Acceptance Criteria

V2 implementation is acceptable when:

- `effect@3.21.2` is installed and used in real vendor-native probes.
- `@rawr/sdk/effect` in the lab is backed by real Effect types without exposing raw runtime constructors publicly.
- The mini runtime executes real Effect descriptors through runtime-owned access.
- Provider/resource/profile experiments use real Effect lifecycle mechanics where relevant.
- Process-local coordination resources are proven as local infrastructure, not durable semantics.
- Boundary probes use real oRPC/Inngest/TypeBox where the claim depends on vendor behavior.
- Deployment handoff proof stays compile-only and contains no live runtime handles or secrets.
- Existing type/negative/structural/report gates still pass.
- The final report clearly separates proven behavior from xfail/todo/open architecture questions.
- The repo remains clean and Graphite-managed after commit/submit.
