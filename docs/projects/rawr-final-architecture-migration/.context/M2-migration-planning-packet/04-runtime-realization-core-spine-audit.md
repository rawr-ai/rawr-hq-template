# Runtime Realization Core-Spine Audit

Status: investigative audit report.  
Scope: critical risk-reduction pass before runtime migration planning.  
Authority snapshot: `/Users/mateicanavra/Downloads/RAWR-temp/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` at 5,264 lines, SHA-256 `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.

This report treats the downloaded `RAWR-temp` spec as the content authority. The repo-local spec remains an important drift risk because active repo routing still points at `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`, which is a different 3,483-line file with SHA-256 `4d7d19d2064574a7ad07a1e43013681b75eae788081ad0558cc87ca475b8d654`.

## Method

The audit ran in five phases: surface inventory, type coherence, lifecycle/timing coherence, cross-section consistency, and migration actionability. Explorer agents produced fact packets only; final prioritization and readiness judgment are from the orchestrating/default agent.

Tools used:

- Nx first-hop workspace checks: `bunx nx show projects`, targeted `bunx nx show project ... --json`.
- Local source/spec checks: `rg`, `sed`, `nl`, `wc`, `shasum`, `git diff --no-index`.
- Narsil was smoke-checked earlier but results pointed at a sibling checkout, so source evidence in this report is confirmed against the active `habitat/rawr-hq-template` checkout and the downloaded authority file.

Mechanical findings:

- The current authority snapshot has 124 fenced code blocks with `File:`, `Layer:`, and `Exactness:` labels present.
- The prior review's small cleanup items are now largely fixed in the current snapshot: CLI/agent schema public imports are listed, `EffectBoundaryContext.traceId` is required, the vocabulary says "domain authority", `ExecutionDescriptorRef` is now boundary-discriminated, and server context clients now use construction-bound clients where `.withInvocation(...)` is shown.

## Prioritized Issues

### P0 - Async step ownership is still not derivable without parsing or executing `run(...)`

Blocking for core spine migration: yes.

Where:

- Async step example defines `SyncWorkItemStep` and references it only inside `WorkItemsSyncWorkflow.run(...)`: authority spec lines 2445-2481.
- The async facade says the SDK derives async step descriptors from `defineAsyncStepEffect(...)` and must not make descriptor discovery depend on executing workflow `run(...)` or parsing workflow source: lines 4142-4147.
- The lowering flow says derivation emits async step `ExecutionDescriptorRef` and descriptor table entries before invocation: lines 4869-4875.

What it is:

The spec fixed the earlier inline-body problem by moving step bodies into `defineAsyncStepEffect(...)`, but it still does not show a declarative association between a workflow/schedule/consumer and its step descriptors. The only visible association is the call `stepEffect(ctx).run(SyncWorkItemStep)` inside the native `run(...)` body.

Why it matters:

`plugin.async-step` refs require enclosing async identity plus `stepId`. The SDK cannot derive the workflow/schedule/consumer-to-step mapping from the current example without either executing `run(...)`, parsing the function body, or relying on an unstated side channel. That directly conflicts with the descriptor-table derivation rule and can make compiled async step plans incomplete or incorrectly identified.

Expected fix shape:

Add an explicit association channel, for example `defineWorkflow({ id, steps: [SyncWorkItemStep], run })`, a plugin-level `stepEffects` list keyed by workflow/schedule/consumer id, or an equivalent SDK-owned metadata declaration. The fix should state how the SDK derives `workflowId`/`scheduleId`/`consumerId` plus `stepId` before runtime mounting.

Source: independent audit, confirmed by prior-review checklist lineage.

### P1 - `ProviderEffectPlan` is central but still has no plan shape

Blocking for core spine migration: yes for provider/bootgraph implementation.

Where:

- Providers return `ProviderEffectPlan` from `RuntimeProvider.build(...)`: lines 2728-2752.
- `providerFx` methods return `ProviderEffectPlan` and reference `ProviderAcquire` / `ProviderRelease`: lines 2773-2796.
- Bootgraph modules consume `ProviderEffectPlan`: line 3667.
- Component summary gives `ProviderEffectPlan` its own placement and gate: line 5098.

What it is:

The spec repeatedly treats `ProviderEffectPlan` as the public provider authoring result and bootgraph/provisioning input, but it never defines the minimal structure of the plan. `ProviderAcquire`, `ProviderRelease`, provider plan boundary metadata, error channel, release semantics, and policy/telemetry fields are also not anchored.

Why it matters:

Without this shape, implementers can agree that providers must be cold and Effect-backed while still producing incompatible plan values. Bootgraph lowering, provider dependency ordering, rollback, telemetry, and diagnostics all depend on what a provider plan actually contains.

Expected fix shape:

Define `ProviderEffectPlan<TValue, TError = never>` and the acquire/release callback types in `packages/core/sdk/src/runtime/providers/provider-effect-plan.ts`, including kind, boundary, acquire/release effect payload, dependency/resource requirements if carried there, telemetry/error metadata, and lowering contract. Keep generic spelling flexible if needed, but lock producer/consumer fields.

Source: independent audit.

### P1 - Dispatcher access is request-scoped in derivation but exposed broadly in server context

Blocking for core spine migration: yes for workflow dispatcher planning and server/internal projections.

Where:

- `ServerApiInvocationContext` exposes `workflows: WorkflowDispatcher`: lines 2273-2281.
- `WorkflowDispatcherDescriptor` is derived from selected workflow definitions and projections that request dispatcher access: lines 3383-3405.
- `WorkflowDispatcher` materializes after provisioning and may be wrapped by server API/internal projections: lines 3988-4028.

What it is:

The spec says dispatcher descriptors are derived from projections that request dispatcher access, but the shown server API context exposes a live dispatcher as a general context field. The server/internal examples do not show the declaration that requests dispatcher access, nor do they show how dispatcher operations become `WorkflowDispatcherOperationDescriptor[]`.

Why it matters:

This changes the capability surface. If every server route gets `WorkflowDispatcher`, dispatcher access is effectively ambient. If access is opt-in, the opt-in mechanism is missing from the authoring surface, and the SDK cannot reliably derive dispatcher descriptors or operations.

Expected fix shape:

Add a dispatcher-use declaration such as `useWorkflowDispatcher(...)`, a plugin `workflows` / `dispatchers` requirement block, or an explicit server-internal builder option that names allowed workflow refs and operations. Then make `context.workflows` conditional on that declaration or explain that the context field is always present but operation-scoped by a derived policy.

Source: independent audit.

### P1 - `RuntimeResourceAccess` is referenced in executable contexts but not defined

Blocking for core spine migration: yes for plugin/async resource access safety.

Where:

- Server API context includes `resources: RuntimeResourceAccess`: lines 2273-2281.
- Async step bridge/execution contexts include `resources: RuntimeResourceAccess`: lines 4106-4124.
- Runtime access types are defined separately as `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, and `SurfaceRuntimeAccess`: section 18.1, lines 3734-3805.

What it is:

Plugin and async executable contexts use `RuntimeResourceAccess`, but the spec does not define the interface or type alias. This is not the same as broad `RuntimeAccess`, which is explicitly constrained and not supplied to services.

Why it matters:

The allowed resource-access shape is security and architecture critical. If left implicit, implementers may expose broad runtime access, raw resource maps, provider internals, or unscoped optional resources to plugin/async bodies.

Expected fix shape:

Define `RuntimeResourceAccess` with explicit methods, scope, and prohibitions. It should likely be a narrow surface/resource-scoped facade over declared `ResourceRequirement`s, not broad `RuntimeAccess`. State whether it supports `resource(...)`, `optionalResource(...)`, instance selection, and diagnostic-safe metadata.

Source: independent audit.

### P1 - Active authority drift can send implementation agents to the wrong runtime model

Blocking for core spine migration: yes as a migration-readiness/source-hygiene gate.

Where:

- Active docs router points to the repo-local runtime spec as canonical: `docs/AGENTS.md` lines 7-15.
- Repo-local runtime spec still identifies as canonical: `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` lines 1-4.
- Downloaded authority requires stale canonical-looking runtime/effect docs to be updated, renamed, archived/quarantined, or subordinated before migration-planning agents rely on indexed docs: authority spec lines 5260-5264.

What it is:

The active repo copy and the downloaded authority are materially different. During this audit, the external authority file also changed multiple times, ending at the 5,264-line hash listed above. The repo copy is stale and still canonical-looking.

Why it matters:

The repo is the first place implementation agents will search. If the stale copy remains active, agents can follow older handler/runtime/async shapes while believing they are obeying the canonical spec.

Expected fix shape:

Before migration planning starts, land the current authority spec in the repo or explicitly subordinate the repo copy to the downloaded file. Update routers and planning packet authority tables so there is one obvious runtime authority path. If the downloaded file continues to change, freeze a hash before plan generation.

Source: independent audit and source-hygiene verification.

### P2 - Server route descriptor derivation mechanics are less explicit than async step derivation

Blocking for core spine migration: not necessarily, but it can make implementation slices diverge.

Where:

- Descriptor-table derivation may import declarations and collect refs/table but must not acquire/bind/materialize/execute workflow bodies/parse arbitrary user code: lines 1195-1230.
- Server API route descriptors are built inside `createWorkItemsPublicRouter()` via `.effect(function*)`: lines 2231-2353.
- Descriptor-first oRPC posture says `.effect(function*) authoring -> SDK captures EffectExecutionDescriptor`: lines 2361-2370.

What it is:

The spec does not spell out the safe derivation operation for server/plugin route factories. It is probably intended that SDK derivation invokes import-safe plugin projection/router factory functions to receive cold descriptors, but that boundary is not explicit.

Why it matters:

Without a stated mechanism, implementers may choose source parsing, import-time global registration, runtime factory execution, or route factory invocation. Those choices have different safety and ergonomics profiles.

Expected fix shape:

Add a short derivation rule: plugin projection functions may be invoked during SDK derivation only as import-safe cold descriptor factories, with no runtime-bound inputs, and must return descriptor-bearing lane-native definitions. State how failures are diagnosed.

Source: independent audit.

### P2 - Current gates and workspace reservations still target older topology

Blocking for core spine migration: yes unless treated as stale current-state evidence rather than target enforcement.

Where:

- Downloaded authority locks `packages/core/sdk` and `packages/core/runtime/*`: lines 385-467.
- Older migration packet requires public SDK/runtime packages and evidence gates, but it was produced against an older snapshot.
- Current root workspaces still reserve `packages/runtime/*` and `packages/runtime/harnesses/*`; current U00 gates check `packages/runtime/*` and `packages/hq-sdk` paths.

What it is:

The existing red/green gates are useful current-state pressure, but they encode older topology names. If used as target gates without update, they will reward the wrong package placement.

Why it matters:

Migration agents need mechanical pressure, but stale gates can make the correct `packages/core/runtime/*` implementation look wrong and make the older `packages/runtime/*` route look correct.

Expected fix shape:

Regenerate or patch the U00/current-finding gates before they become acceptance gates. Keep the old gates only as evidence of current drift, not as target enforcement.

Source: migration actionability pass.

### P2 - First resource/provider cut for replacing current host satisfiers is not locked

Blocking for core spine migration: not a spec design blocker, but a planning blocker for the first implementation slice.

Where:

- Generic resource/provider/profile model is defined in section 13, lines 2635-3045.
- Resource catalog placement is locked under `resources/<capability>`: lines 2838-2879.
- Current repo still constructs concrete service deps/satisfiers in `apps/server/src/host-satisfiers.ts`.

What it is:

The target model is clear, but the spec does not identify the first resource/provider families needed to replace the current HQ server host satisfiers. Existing code includes practical dependencies such as SQL, clock, logger/telemetry, analytics/feedback, workspace/repo-root style context, and async/Inngest runtime.

Why it matters:

Migration planning can still proceed, but the first slice needs a concrete catalog cut. Otherwise agents may invent incompatible resource ids, provider ids, config keys, and fixture coverage.

Expected fix shape:

Add a migration planning addendum, not necessarily a canonical spec change, that names the initial standard resources/providers required to replace the current host satisfier path and maps each to evidence fixtures.

Source: migration actionability pass.

### P2 - Type and fixture gates are named but not concrete enough to execute

Blocking for core spine migration: not a design blocker, but a proof-planning blocker.

Where:

- Acceptance gate families are listed at lines 5049-5061.
- Component-specific gates are summarized at lines 5087-5129.
- Older packet requires type tests, fixture snapshots, negative tests, registry mismatch fixtures, adapter bypass fixtures, async FunctionBundle fixtures, and catalog redaction fixtures.

What it is:

The spec names what must be proven, but not the target fixture file shape, type-test mechanism, snapshot artifact format, or Nx task boundaries.

Why it matters:

This does not change the architecture, but it makes "green" ambiguous. Different agents can build incompatible evidence fixtures while claiming the same gate name.

Expected fix shape:

Put concrete evidence artifacts in the regenerated migration plan: fixture package/project names, Nx targets, minimal fixture app(s), expected snapshots, and negative test names.

Source: migration actionability pass.

### P3 - `@rawr/sdk/service/effect` appears in topology but not the public import table

Blocking for core spine migration: no.

Where:

- SDK topology includes `service/effect/index.ts`: lines 505-515.
- Public import table lists `@rawr/sdk/service` and `@rawr/sdk/service/schema`, but no `@rawr/sdk/service/effect`: lines 604-627.

What it is:

The topology contains a service effect submodule, but the public import table does not list it. This may be intentional if service executable helpers are only reachable through service implementer APIs, but it is inconsistent with the nearby statement that `/effect` SDK submodules contain executable authoring helpers.

Why it matters:

This is mostly documentation/API-surface cleanup. It should not block migration if service `.effect(...)` remains exposed through `@rawr/sdk/service`.

Expected fix shape:

Either list `@rawr/sdk/service/effect` as public, mark `service/effect` as SDK-internal, or remove the topology entry if the service executable terminal is intentionally surfaced only through `@rawr/sdk/service`.

Source: Phase 1 import/topology cross-check.

### P3 - Service procedure implementer generic constraint is invalid if copied directly

Blocking for core spine migration: no, because exact generic spelling is illustrative.

Where:

- `ServiceProcedureExecutionContext` constrains `TServiceBoundaryContext extends ServiceBoundaryContext<...>`: lines 1725-1729.
- `RawrServiceProcedureImplementer` passes an unconstrained `TServiceBoundaryContext` into that constrained context: lines 1858-1876.

What it is:

The TypeScript generic shape would need the same constraint on `RawrServiceProcedureImplementer` or another constrained derivation.

Why it matters:

The code block marks exact generic spelling as illustrative, so this is not an architecture blocker. It is still worth fixing because implementers will copy from the spec.

Expected fix shape:

Constrain `TServiceBoundaryContext` in `RawrServiceProcedureImplementer` or simplify the generic shape in the example.

Source: type coherence pass.

## What Now Passes

The updated authority snapshot is much stronger than the prior review checklist implied:

- `ExecutionDescriptorRef` is no longer an optional-field bag; it is boundary-discriminated and shares identity shape with `IdentityPolicy.executionDescriptorId(...)`.
- `EffectBoundaryContext.traceId` is required, and the spec states adapters/process runtime must mint it before invocation if needed.
- CLI and agent schema submodules are listed in the public import table.
- The "semantic ownership" wording has been corrected to "domain authority".
- Server API examples no longer close over runtime-bound service clients or request objects.
- Async step bodies are no longer inline executable bodies inside `stepEffect(...).effect(...)`.
- Provider acquire/release is consistently separated from `CompiledExecutionPlan` and ordinary execution descriptors.
- Service binding cache consistently excludes invocation.
- Adapter/harness execution consistently delegates through `ExecutionRegistry` and `ProcessExecutionRuntime`.

## Migration Readiness Synthesis

Verdict: not migration-actionable for the full core runtime spine yet.

The aggregate picture is not "architecture incoherent." The ontology, lifecycle, provider/resource separation, registry/process-runtime split, Effect-only execution stance, and adapter/harness split are coherent. The real risk is concentrated in a small number of load-bearing mechanics that implementation agents would otherwise have to guess:

1. async step descriptor ownership and workflow/schedule/consumer association;
2. provider plan shape and bootgraph lowering input;
3. dispatcher access declaration and operation derivation;
4. narrow runtime resource access for plugin/async contexts;
5. source-hygiene/gate drift between the downloaded authority and active repo docs/gates.

Resolve those before generating the migration plan. After that, the remaining issues are mostly planning and proof-surface work: aligning stale gates, choosing the initial resource/provider catalog cut, and defining concrete fixture/type-test artifacts.

The strongest next action is a targeted spec patch plus repo authority sync, not a broad rewrite. The patch should be small and mechanical: declare async step membership metadata, define `ProviderEffectPlan`, define `RuntimeResourceAccess`, define dispatcher access declaration, clarify server route derivation, and then replace or subordinate the stale repo-local runtime spec.
