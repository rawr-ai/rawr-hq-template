---
title: RAWR Effect Runtime Realization System — spec analysis (authoritative)
id: rawr-effect-runtime-realization-system-spec-analysis-authoritative
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:36:06.041862Z'
updated: '2026-05-01T21:10:15.452011Z'
source: /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template/docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: authoritative_runtime
- source_path: /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template/docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
- runtime_authority: yes

## Scope and purpose

This is the canonical specification for how RAWR turns selected app composition into one started, typed, observable, stoppable process per `startApp(...)`. It owns the bridge from selected declarations to a running process, including derivation, compilation, bootgraph ordering, Effect-backed provisioning, process-local execution, adapter lowering, harness mounting, diagnostics, telemetry, and deterministic finalization. It explicitly does NOT own service domain authority, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors. Once locked, this document supersedes older indexed runtime/effect docs.

## Concern coverage

- **Lifecycle phases (locked seven-phase chain)**: `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`. Shutdown/rollback are deterministic finalization, NOT an eighth phase.
- **Authority planes**: authoring/authority, selection/demand, derivation/planning, lifecycle/execution, translation/native-host, observation, durable-async-integration; classification axes: role, surface, capability.
- **Process model**: one root managed runtime per process, one process execution runtime, one execution registry, one process runtime assembly, zero-or-more roles/surfaces, one runtime catalog record set, one deterministic finalization path.
- **App and entrypoint authoring**: `defineApp(...)`, `startApp(...)`, `RuntimeProfile`, `Entrypoint`, cohosted vs. split process placement is selection (not species).
- **Service runtime boundary**: `defineService(...)`, lanes (`deps`, `scope`, `config`, `invocation`, `provided`), `resourceDep/serviceDep/semanticDep`, `RuntimeSchema` for runtime-carried lanes, service callable contracts (oRPC-shaped, service-owned), service binding cache, construction-bound vs invocation-bound clients.
- **Plugin authoring**: lane-specific builders, `useService(...)`, topology+builder agreement, projection classification (no `kind/exposure/visibility` fields), seven plugin lanes (server-api, server-internal, async-workflow/schedule/consumer, cli-command, web-app, agent-channels/shell/tools, desktop-menubar/windows/background).
- **Resource/provider/profile model**: `defineRuntimeResource`, `ResourceRequirement`, `defineRuntimeProvider`, `ProviderEffectPlan`, `providerFx.acquireRelease/tryAcquire/withSpan`, `ProviderSelection`, profile field is `providers/providerSelections` not `resources`.
- **Process-local coordination resources**: `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource` — explicitly process/role-local, NOT durable.
- **Effect execution components**: `RawrEffect`, curated `Effect` facade, `TaggedError`, generator-native `.effect(function*)`, `EffectExecutionDescriptor`, `ExecutionDescriptorRef` (boundary-discriminated union), `ExecutionDescriptorTable` (non-portable), `EffectRuntimeAccess`, `ManagedRuntimeHandle`, `ProcessExecutionRuntime`, `EffectExecutionPolicy` (per-boundary defaults).
- **SDK derivation**: `NormalizedAuthoringGraph`, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `PortableRuntimePlanArtifact` (refs only), identity policy.
- **Runtime compiler**: `CompiledProcessPlan`, `CompiledExecutionPlan`, `CompiledExecutionRegistryInput`, `CompiledServiceBindingPlan`, `CompiledSurfacePlan`, `CompiledWorkflowDispatcherPlan`, `HarnessPlan`, `ProviderDependencyGraph`, validators (provider coverage/closure/cycle, topology/builder, execution policy, import law).
- **Bootgraph**: `BootResourceKey`, `BootResourceModule`, deterministic ordering, dedupe, rollback, reverse finalization.
- **Process runtime**: runtime access scoping, service binding + cache (excludes invocation), workflow dispatcher materialization, execution registry assembly, plugin projection, adapter lowering coordination, harness handoff, catalog emission, finalization.
- **Execution registry**: pairs `CompiledExecutionPlan` with `EffectExecutionDescriptor`, validates identity/boundary agreement.
- **Workflow dispatcher / async runtime**: `WorkflowDispatcher`, async lowering chain, `FunctionBundle`, `defineAsyncStepEffect`, `stepEffect(ctx).run(descriptor)`, Inngest owns durability/retry/replay/history.
- **Surface adapters**: lower compiled plans (not raw authoring/SDK graphs), produce native callbacks delegating to `ProcessExecutionRuntime`.
- **Harnesses**: Elysia (HTTP), Inngest (durable async), OCLIF (CLI), Web, Agent/OpenShell, Desktop. Each owns native interior post-lowering.
- **Diagnostics/telemetry/catalog**: `RuntimeDiagnostic` (phase + boundary + severity), `RuntimeTelemetry` (spans/events/annotations), `RuntimeCatalog` (read model), `RuntimeDiagnosticContributor`, large diagnostic code taxonomy (~50+ codes).
- **Cross-cutting**: config & secrets (env/dotenv/file/memory/test), caching taxonomy, telemetry layering, policy primitives, reserved-detail boundaries.
- **Enforcement**: import allowlists/blocklists for raw Effect / effect-oRPC, forbidden `.handler(...)`, forbidden `ManagedRuntime.make` outside substrate, forbidden detached fibers, forbidden Promise business terminals in RAWR-owned bodies, gate families (static/type/runtime/registry/fixture/effect-only/provider-separation).
- **End-to-end flows**: full lifecycle sequence diagram, public API flow, workflow-trigger-via-internal-API flow, service-to-service binding flow, async lowering into FunctionBundle.
- **Reserved boundaries**: agent/OpenShell governance, desktop native security, key/KMS resources, multi-process placement policy, RuntimeCatalog persistence backend, runtime policy enforcement primitives, semantic adapters, retention/indexing, and more — locked owners + integration hooks but bodies deferred.

## Platform-level signal

This spec is the **Core Runtime / Mechanical** authority. It defines the bind→project→compose→realize→observe spine. It is also strongly cross-cutting because it dictates enforcement that bleeds into every other plane (auth, deployment, async, web). Coordination-plane concerns (durable async via Inngest, server API mounting via Elysia/oRPC) are addressed only at the integration-point level — the spec defers all coordination *meaning* outward. Governance-plane concerns (decisions over time, agent/shell governance, deployment placement, control-plane projection) are explicitly named as reserved boundaries with integration hooks but no governance bodies.

## Vendor integrations declared

- **Effect** (Effect-TS): the execution layer for all RAWR-owned local execution. Used as the runtime kernel — `ManagedRuntime.make(layer)` lives only inside `packages/core/runtime/substrate/effect/managed-runtime-handle.ts`. Effect owns scoped acquisition/release, structured concurrency primitives (Fiber/Queue/PubSub/Schedule/Stream/Cache/Ref), interruption, timeout, retry mechanics. RAWR wraps Effect behind `RawrEffect` + curated `Effect` facade (`@rawr/sdk/effect`) so authors never import raw `effect`. The author gets generator-native `.effect(function*)` bodies that lower to Effect; integration-point ownership is the bridge (`EffectRuntimeAccess`, `ProcessExecutionRuntime`, error/telemetry bridges) plus the `RawrEffect` type's preservation of success/failure/requirement inference.
- **oRPC + effect-oRPC**: oRPC owns "callable contract mechanics" (procedure/transport mechanics, OpenAPI shape). RAWR uses a *descriptor-first* posture — the SDK captures `EffectExecutionDescriptor` from `.effect(function*)`, while the oRPC route/procedure wrapper stays contract-shaped; invocation calls `ProcessExecutionRuntime`. effect-oRPC adapter code is *contained* to `packages/core/sdk/src/service/effect/internal/**` and `packages/core/sdk/src/plugins/server/effect/internal/**`. Service/plugin authors never construct effect-oRPC adapters directly. RAWR owns boundary error bridge and lane lowering into oRPC initial/execution context.
- **Inngest**: owns durable async — workflow run identity, retry, replay, history, schedules, durable queues, durable async semantics. RAWR delegates all of that. RAWR owns: workflow/schedule/consumer *definition* (cold), `WorkflowDispatcherDescriptor`/`WorkflowDispatcher` integration, async lowering into `FunctionBundle`, `defineAsyncStepEffect` step-local descriptors mounted through Inngest step boundary via `stepEffect(ctx).run(descriptor)`. The native workflow `run(ctx)` function becomes pure Inngest interop. Effect retries inside steps are local/transient unless explicitly coordinated with Inngest policy.
- **Bun**: not explicitly named in the runtime spec body (despite being in Habitat-class); JS runtime-host concerns ride below the substrate.
- **Elysia**: owns HTTP host lifecycle and request routing. RAWR's Elysia harness (`packages/core/runtime/harnesses/elysia`) consumes mounted server API/internal surface runtimes and adapter-lowered oRPC/Elysia route payloads. Elysia does NOT own public API meaning, service construction, provider selection, app membership, or runtime provisioning. Public OpenAPI publication is harness output for selected public projections.
- **Drizzle**: not explicitly named — SQL is referenced abstractly through `SqlPoolResource`/`sql.postgres({ configKey })` provider selectors. Drizzle would slot in as a provider implementation under `resources/sql/providers/*`.
- **HyperDX / OpenTelemetry**: `RuntimeTelemetry` is the runtime-owned correlation boundary. `logger.openTelemetry({ configKey: "telemetry" })` shows up as a profile selector. Standard provider stock under `packages/core/runtime/standard/providers/open-telemetry`. HyperDX is not explicitly named; the telemetry layering separates runtime telemetry (RAWR-owned) from native framework instrumentation, service semantic events, and product analytics.
- **OCLIF**: owns command dispatch semantics; OCLIF harness mounts adapter-lowered command payloads.
- **OpenShell / Agent hosts**: native shell/tool interiors. Agent governance is a reserved boundary with locked integration hooks.
- **Desktop hosts**: native desktop interiors (menubar, windows, background loops).

## Don't-own-still-manage frontier

The execution-ownership law is explicit and load-bearing: "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe." (§1)

Concrete don't-own-still-manage observations:

- **API management** (oRPC delegated; integration ownership = descriptor-first posture, oRPC import containment, lane lowering into oRPC initial/execution context, declared-error-vs-Effect-failure bridge, public publication policy through `RuntimeProfile` not plugin field). RAWR owns *projection classification* (topology + builder, never field-based) and *boundary policy* (auth, redaction, transformation, rate-limit) but defers the procedure/transport mechanics.
- **Runtime concurrency / resource management** (Effect delegated; integration ownership = single `ManagedRuntimeHandle` per process, sanctioned `EffectRuntimeAccess`, `ProcessExecutionRuntime` as the only invocation path, raw-Effect-import allowlist, forbidden detached fibers, `RawrEffect` opacity). RAWR owns *bootgraph lifecycle ordering*, *rollback/finalization*, *interruption posture*, and the *bridge resolution* for error and telemetry refs.
- **Durable async orchestration** (Inngest delegated; integration ownership = `WorkflowDispatcher` materialization, async surface adapter lowering into `FunctionBundle`, `defineAsyncStepEffect` cold descriptors derivable without executing workflow `run()`, schema-backed event payloads, server-API/internal projections wrapping dispatcher operations). RAWR owns *what gets dispatched and how it's classified* but defers *durability semantics*.
- **HTTP listener lifecycle** (Elysia delegated; integration ownership = harness mount/stop ordering, public OpenAPI publication artifacts, adapter-lowered closure as the only execution path).
- **Configuration & secrets** (substrate-owned but reserved precedence/refresh details; integration ownership = `RuntimeSchema` validation, redaction-at-config-boundary, supported source kinds, profile-driven provider config). Provider-specific refresh strategy and retry mechanics are *reserved* — named owner + integration hooks but bodies deferred to dedicated specs.
- **Telemetry backend** (storage/export reserved; integration ownership = `RuntimeTelemetry` interface shape, telemetry chain order, label policy on `CompiledExecutionPlan`, layering between runtime telemetry / service semantic / product analytics).
- **Catalog persistence** (RuntimeCatalog backend/indexing/retention reserved; integration ownership = locked minimum sections, redaction rule, lifecycle status fields, control-plane touchpoint hook).
- **Multi-process / deployment placement** explicitly reserved. The spec stays "scale-continuous" by separating semantic identity from runtime placement.

The spec also names **silences via reserved boundaries** (§23.5): config/secret precedence algorithms, provider refresh/retry mechanics, call-local memoization, generic cache resources, runtime-owned raw primitive public facades, telemetry backend/export, RuntimeCatalog storage, runtime policy enforcement primitives, semantic service dependency adapters, key/KMS resources, multi-process placement, Agent/OpenShell governance, desktop native host security, lane-specific native implementation details. Each must be locked "no later than the first implementation slice that makes its dedicated specification trigger true."

## Completeness signals

- **Authoritative-feeling**: The spec is dense, normative, and self-described as canonical. Approximately 28 numbered top-level sections with deeply nested code blocks each labeled `File:` / `Layer:` / `Exactness:` (normative vs illustrative). The end-to-end assembly flows (§24), enforcement rules (§25), and runtime realization component contract summary (§27) cover the load-bearing surface. The "Lock authority and stale source handling" coda (§29) explicitly supersedes older runtime/effect docs.
- **Reserved/deferred areas**: Section 23.5 names ~14 reserved-detail boundaries that are explicitly NOT omissions but are deferred to dedicated specs. Examples: config/secret precedence algorithms, provider refresh, call-local memoization, runtime policy enforcement primitives, key/KMS resources, multi-process placement, agent/OpenShell governance, desktop native security, RuntimeCatalog persistence backend, lane-specific native implementation details.
- **Phase Three / Phase Four references**: not present in this spec by name; the `gitStatus` recent commits show Phase Three child 7 work in the codebase. The spec itself is timeless once locked.
- **TBD/TODO**: No literal `TBD` or `TODO` markers found in the body. Reserved boundaries replace TODOs.
- **Cross-references to missing specs**: §23.5 refers to "dedicated specifications" that have not all been authored — these correspond to several of the shape-correct specs in the corpus (Authentication Subsystem, OpenShell Agent Runtime, Async Runtime, Deployment Subsystem, Managed Agent Workspace Execution, Workstream System, Workstream Review, Authoring Classifier). The "companion service-package specification" referenced in §11.2 corresponds to `RAWR_Service_Package_Effect_Spec.md` (vendor-integration shape reference).
- **Exploratory-feeling**: minimal — the spec reads as locked normative authority. The only exploratory residue is in illustrative code blocks (overloads, generic spellings, exact iterator implementation marked "SDK-owned"), which are explicitly *labeled* illustrative.

## Cross-spec dependencies

References (explicit or implicit by topic):
- **Async Runtime spec** — §19, §12.7 (durable async via Inngest, FunctionBundle).
- **Service Package Effect spec** — §11.2 ("companion service-package specification owns service-private files, repository implementation, provided-context middleware API…").
- **Authentication Subsystem spec** — implicit via `request.requireActor()`, plugin boundary policy (auth/authz/redaction).
- **Deployment Subsystem spec** — implicit via reserved "multi-process placement policy"; `startApp(...)` deferring to deployment placement.
- **Managed Agent Workspace Execution / OpenShell Agent Runtime specs** — §21.5 reserved Agent/OpenShell governance.
- **Authoring Classifier spec** — implicit via topology+builder classification (§12.3).
- **Workstream / Workstream Review specs** — not directly referenced; orthogonal governance plane.
- **Habitat SDK Layers / Factory Bundle Export** — implicit via `PortableRuntimePlanArtifact` (control-plane handoff, reproducible runtime planning, deployment touchpoints).
- **System Architecture spec** — referenced in authority note ("RAWR_Canonical_Architecture_Spec.md").

This spec **supersedes** older indexed runtime/effect documents that describe `.handler(...)` terminals, Promise/handler execution branches, global `fx` authoring, or runtime-bound descriptor closure patterns.

## Verbatim load-bearing definitions / claims

1. (§1 Purpose and scope): "The RAWR Runtime Realization System turns selected app composition into one started, typed, observable, stoppable process per `startApp(...)` invocation."

2. (§1 execution-ownership-law.txt): "RAWR owns semantic/runtime boundaries. / oRPC owns callable contract mechanics. / Effect owns local execution mechanics. / Inngest owns durable async. / Native hosts own host interiors after RAWR adapter lowering. / The SDK derives. / The runtime realizes. / Harnesses mount. / Diagnostics observe."

3. (§1 lifecycle.txt): "definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation"

4. (§1 service-plugin-execution-spine.txt): "service/plugin executable authoring -> EffectExecutionDescriptor -> SDK normalized authoring graph -> runtime compiler -> CompiledExecutionPlan -> ExecutionRegistry -> ProcessExecutionRuntime -> EffectRuntimeAccess -> ManagedRuntimeHandle -> result / exit / diagnostics / telemetry / finalization"

5. (§9.5 EffectRuntimeAccess): "`EffectRuntimeAccess` is the runtime-owned handle that sanctioned SDK adapters use to execute `RawrEffect` programs against the single process managed runtime. It is not app authoring, service dependency declaration, plugin projection fact, provider selection, or a public runtime handle."

6. (§9.4 Execution registry): "`ExecutionRegistry` is process-runtime authority. It is the live process runtime artifact that pairs each compiled execution plan with its matching Effect descriptor. Adapters use the registry to obtain matched executable boundaries."

7. (§18.4 ProcessExecutionRuntime): "Runtime invocation of Effect descriptors is centralized. Harnesses and adapters do not independently lower or run `RawrEffect`."

8. (§18.4 process-execution-runtime-rules.txt): "execution.effect / -> receive matched CompiledExecutableBoundary / -> validate boundary.plan.executionId equals boundary.descriptor.executionId / -> receive explicit ProcedureExecutionContext / -> resolve CompiledExecutionPlan.errorBridge into EffectErrorBridge / -> resolve CompiledExecutionPlan.telemetryLabels into EffectTelemetryBridge / -> call descriptor.run(invocation) / -> receive RawrEffect / -> run through EffectRuntimeAccess / -> apply Effect execution policy / -> bridge errors/telemetry through compiled plan / -> return Promise result or structured exit to adapter/native host interop"

9. (§22.3 RuntimeCatalog): "`RuntimeCatalog` is the diagnostic read model of selected, derived, compiled, provisioned, bound, projected, executed, mounted, observed, and stopped topology."

10. (§17.1 Bootgraph): "Bootgraph owns stable lifecycle identity, dependency graph resolution, deterministic ordering, dedupe, rollback on failed startup subsets, reverse finalization order, and typed context assembly for process and role lifetimes."

11. (§19.1 WorkflowDispatcher): "`WorkflowDispatcher` is durable async interop. When used inside a RAWR-owned executable body, dispatcher operations are wrapped by `Effect.tryPromise(...)` or by a sanctioned dispatcher Effect facade. The dispatcher does not own workflow semantics, does not expose product APIs by itself, does not construct native functions, does not classify projection status, and does not acquire the async provider."

12. (§12.7): "The outer async function is native host interop. The step-local body is Effect and is derivable before runtime mounting. Inngest owns durability, retries, replay, schedules, workflow history, and workflow semantics."

13. (§5 raw-effect-import-ban.txt): "Raw Effect imports are forbidden in authored service, plugin, app, ordinary resource, provider implementation, profile, and entrypoint modules. / This includes: services/** plugins/** apps/** apps/*/runtime/profiles/** resources/** entrypoints"

14. (§10.3 Entrypoint rule): "An entrypoint must not construct `ManagedRuntime`, call raw Effect runtime APIs, run `RawrEffect` programs directly, construct effect-oRPC adapters, or bypass `startApp(...)` to mount service/plugin execution manually."

15. (§25.7 Harness/framework): "Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts are native interiors behind RAWR-shaped boundaries. They are not peer semantic owners."

16. (§28 Canonical picture coda): "RAWR stays scale-continuous because semantic identity and runtime placement remain separate. A capability does not change species when it changes process, machine, platform service, app boundary, repository boundary, harness, provider, or substrate. Runtime realization makes execution explicit, typed, observable, and stoppable while preserving the authority laws that make the system legible."

17. (§3.3 Ownership matrix excerpt): "Effect kernel | Single process managed runtime, Effect lowering, provider plan execution, process-local coordination, interruption, timeout, retry, `RawrEffect` execution under runtime-owned bridges | Service domain authority, plugin projection, app selection, provider selection, durable async, native host semantics"

## Estimated completeness grade (initial impression)

**Grade: A.** The spec exhaustively locks runtime semantics across all seven lifecycle phases, all named vendor integrations, all reserved boundaries, every cross-cutting concern (config/secrets/caching/telemetry/policy), and every enforcement gate; the only deferrals are explicitly named reserved boundaries with locked owners and integration hooks, which the spec frames as "not omissions" and which fan out to the other corpus specs. For the runtime/core-platform plane this is gospel-grade.
