---
title: Source Analysis — RAWR Runtime Realization System Canonical Spec
id: source-analysis-rawr-runtime-realization-system-canonical-spec
tags:
- runtime-canon-arch-align
- spec-analysis
- runtime-spec-analysis
created: '2026-05-02T20:40:12.744822Z'
status: draft
type: source-analysis
deprecated: false
summary: 'The RAWR Runtime Realization System Canonical Spec is the normative authority
  on how authored declarations (services, plugins, resources, providers, apps) are
  turned into a started, typed, observable, stoppable process per startApp() invocation.
  It establishes the seven-phase lifecycle (definition→selection→derivation→compilation→provisioning→mounting→observation),
  the execution ownership law (RAWR/oRPC/Effect/Inngest/native hosts), the plane model
  with long authority definitions for every noun, the six harness vendor assignments
  (Elysia, Inngest, OCLIF, web, agent/OpenShell, desktop), and the WorkflowDispatcher
  integration pattern. For the alignment task, the spec reveals that the canonical
  architecture spec is likely missing: (1) the normative execution ownership law naming
  all vendor integration players, (2) the topology+builder→projection-classification
  model, (3) the WorkflowDispatcher as async-to-server integration bridge, (4) the
  PortableRuntimePlanArtifact and RuntimeCatalog as control-plane interfaces, and
  (5) the cohosting deployment principle.'
---

# Source Analysis — RAWR Runtime Realization System Canonical Spec

**Original source:** [[rawr-effect-runtime-realization-system-canonical-spec-source]]
**Source type:** spec (internal technical specification)
**Source word count:** ~32,000 (5264 lines)
**Your judgment:** Normative, authoritative runtime realization specification that defines every execution concept from authoring declarations through to live process assembly; serves as the primary reference for understanding what integration contracts the canonical architecture spec must accurately reflect.

*Suggested by [[rawr-effect-runtime-realization-system-canonical-spec-source]] — source analyst's digest of the full source body*

---

## 1. Document Identity & Authority Claims

**Status and scope (L1–L5):**

> "Status: Canonical
> Scope: Runtime realization, selected authoring declarations, SDK derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning and process-local execution, process runtime binding, process execution, adapter lowering, harness mounting, diagnostics, telemetry, and deterministic finalization"

**Supersession claim (L5):**

> "Authority note: once locked, this document supersedes older indexed runtime/effect documents for runtime realization. Archived or quarantined documents that still call themselves canonical are provenance only unless explicitly subordinated and routed from this spec or `RAWR_Canonical_Architecture_Spec.md`."

**Explicit non-ownership / exclusion list (L11):**

> "It does not own service domain authority, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors."

**Execution ownership law (L37–L47):** The spec declares a binding ownership split between RAWR, oRPC, Effect, Inngest, native hosts, SDK, runtime, harnesses, and diagnostics. This law is normative.

**Import safety law (L634–L731):** Raw Effect imports are forbidden in ordinary authored modules; only allowed in locked runtime substrate paths. This is normative.

**Code block exactness rule (L762–L766):** All code blocks are normative for locked names, ownership boundaries, and execution terminal ownership; illustrative only for overloads and non-`@rawr/sdk` import paths.

**Lock authority (L5260–L5265):** Section 29 declares this document the canonical runtime realization authority once locked, and designates stale-source containment as a migration-readiness gate.

---

## 2. Full Table of Contents with Line Numbers

| Heading | Line |
|---|---|
| `# RAWR Runtime Realization System` | L0 |
| `## 1. Purpose and scope` | L7 |
| `## 2. Fixed outcome` | L139 |
| `## 3. Authority planes and ownership laws` | L160 |
| `### 3.1 Plane model` | L188 |
| `### 3.2 Long authority definitions` | L298 |
| `### 3.3 Ownership matrix` | L360 |
| `## 4. Canonical topology and package authority` | L384 |
| `## 5. Import safety and declaration discipline` | L634 |
| `## 6. Layered naming and artifact ownership` | L733 |
| `## 7. Code block exactness rule` | L760 |
| `## 8. Schema ownership and RuntimeSchema` | L768 |
| `## 9. Effect execution components` | L822 |
| `### 9.1 RawrEffect and curated Effect` | L824 |
| `### 9.2 Execution descriptors` | L1030 |
| `### 9.3 Execution descriptor table` | L1195 |
| `### 9.4 Execution registry` | L1232 |
| `### 9.5 EffectRuntimeAccess` | L1261 |
| `### 9.6 Effect execution policy` | L1375 |
| `## 10. App and entrypoint authoring contract` | L1446 |
| `### 10.1 AppDefinition` | L1448 |
| `### 10.2 RuntimeProfile and process defaults` | L1487 |
| `### 10.3 Entrypoint` | L1527 |
| `## 11. Service runtime boundary contract` | L1569 |
| `### 11.1 Service ownership` | L1571 |
| `### 11.2 Service package boundary` | L1583 |
| `### 11.3 Context lanes and service context projection` | L1660 |
| `### 11.4 Dependency helper rules` | L1747 |
| `### 11.5 defineService(...)` | L1755 |
| `### 11.6 Service procedure implementation terminal` | L1832 |
| `### 11.7 Service callable contracts` | L1912 |
| `### 11.8 Service clients` | L1950 |
| `### 11.9 Service-to-service dependency through serviceDep(...)` | L2038 |
| `### 11.10 Boundary errors and telemetry` | L2081 |
| `## 12. Plugin authoring contract` | L2114 |
| `### 12.1 Plugin ownership` | L2116 |
| `### 12.2 PluginDefinition and PluginFactory` | L2126 |
| `### 12.3 Topology and builder agreement` | L2172 |
| `### 12.4 useService(...)` | L2198 |
| `### 12.5 Server API plugin` | L2231 |
| `### 12.6 Trusted server internal plugin wrapping WorkflowDispatcher` | L2372 |
| `### 12.7 Async workflow plugin with step-local Effect execution` | L2415 |
| `### 12.8 CLI command plugin` | L2489 |
| `### 12.9 Agent tool plugin` | L2530 |
| `### 12.10 Desktop background plugin` | L2574 |
| `### 12.11 Web app projection contract` | L2609 |
| `## 13. Resource, provider, and profile model` | L2635 |
| `### 13.1 System model` | L2637 |
| `### 13.2 RuntimeResource` | L2651 |
| `### 13.3 ResourceRequirement` | L2703 |
| `### 13.4 RuntimeProvider and ProviderEffectPlan` | L2728 |
| `### 13.5 ProviderSelection` | L2803 |
| `### 13.6 Resource catalog and standard provider stock` | L2838 |
| `### 13.7 Resource value example` | L2880 |
| `### 13.8 Provider selector example` | L2927 |
| `### 13.9 Provider acquire/release example` | L2969 |
| `## 14. Process-local coordination resources` | L3047 |
| `### 14.1 ProcessQueueHubResource` | L3051 |
| `### 14.2 ProcessPubSubHubResource` | L3097 |
| `### 14.3 ProcessConcurrencyLimiterResource` | L3133 |
| `### 14.4 ProcessCacheHubResource` | L3167 |
| `### 14.5 Runtime-owned primitives` | L3207 |
| `## 15. SDK derivation and portable plan artifacts` | L3213 |
| `### 15.1 NormalizedAuthoringGraph` | L3217 |
| `### 15.2 ExecutionDescriptorTable` | L3249 |
| `### 15.3 Identity derivation` | L3268 |
| `### 15.4 ServiceBindingPlan` | L3320 |
| `### 15.5 SurfaceRuntimePlan` | L3354 |
| `### 15.6 WorkflowDispatcherDescriptor` | L3381 |
| `### 15.7 PortableRuntimePlanArtifact` | L3409 |
| `## 16. Runtime compiler and compiled process plan` | L3439 |
| `## 17. Bootgraph and Effect-backed provisioning/execution kernel` | L3619 |
| `### 17.1 Bootgraph` | L3621 |
| `### 17.2 Boot resource key and module` | L3648 |
| `### 17.3 Effect provisioning/execution kernel` | L3675 |
| `### 17.4 ProvisionedProcess` | L3706 |
| `## 18. Process runtime, runtime access, and service binding` | L3732 |
| `### 18.1 Runtime access` | L3734 |
| `### 18.2 Process runtime` | L3807 |
| `### 18.3 ExecutionRegistry` | L3850 |
| `### 18.4 ProcessExecutionRuntime` | L3887 |
| `### 18.5 ServiceBindingCache and ServiceBindingCacheKey` | L3934 |
| `## 19. WorkflowDispatcher and async runtime integration` | L3986 |
| `### 19.1 WorkflowDispatcher` | L3988 |
| `### 19.2 Async lowering chain` | L4032 |
| `### 19.3 FunctionBundle` | L4049 |
| `### 19.4 Async step-local Effect facade` | L4076 |
| `## 20. Surface adapter lowering` | L4151 |
| `## 21. Harness and native boundary contracts` | L4241 |
| `### 21.1 Elysia harness` | L4274 |
| `### 21.2 Inngest harness` | L4283 |
| `### 21.3 OCLIF harness` | L4294 |
| `### 21.4 Web harness` | L4304 |
| `### 21.5 Agent/OpenShell harness` | L4314 |
| `### 21.6 Desktop harness` | L4325 |
| `## 22. Diagnostics, telemetry, catalog, and observation` | L4334 |
| `### 22.1 RuntimeDiagnostic` | L4336 |
| `### 22.2 RuntimeTelemetry` | L4392 |
| `### 22.3 RuntimeCatalog` | L4470 |
| `### 22.4 Diagnostic failure classes` | L4513 |
| `## 23. Cross-cutting runtime components` | L4574 |
| `### 23.1 Config and secrets` | L4576 |
| `### 23.2 Caching taxonomy` | L4594 |
| `### 23.3 Telemetry` | L4608 |
| `### 23.4 Policy primitives` | L4622 |
| `### 23.5 Reserved detail boundaries` | L4637 |
| `## 24. End-to-end assembly flows` | L4645 |
| `### 24.1 Dynamic lifecycle sequence` | L4647 |
| `### 24.2 Seven-phase realization checklist` | L4691 |
| `### 24.3 Realistic public API with N > 1 service module and provider selection` | L4703 |
| `### 24.4 Realistic workflow trigger through internal API` | L4764 |
| `### 24.5 Service depending on sibling services` | L4823 |
| `### 24.6 Async lowering into FunctionBundle` | L4855 |
| `## 25. Enforcement rules and forbidden patterns` | L4889 |
| `### 25.1 Projection classification` | L4893 |
| `### 25.2 Service boundary` | L4905 |
| `### 25.3 Resource/provider/profile` | L4919 |
| `### 25.4 Runtime/provisioning` | L4929 |
| `### 25.5 Service binding` | L4941 |
| `### 25.6 Async` | L4951 |
| `### 25.7 Harness/framework` | L4967 |
| `### 25.8 Diagnostics` | L4977 |
| `### 25.9 Effect-only execution` | L4987 |
| `### 25.10 Process-local coordination` | L5041 |
| `### 25.11 Acceptance gates` | L5049 |
| `## 26. Load-bearing foundation and flexible extension matrix` | L5063 |
| `## 27. Runtime realization component contract summary` | L5087 |
| `## 28. Canonical runtime realization picture` | L5131 |
| `## 29. Lock authority and stale source handling` | L5260 |

Total headings: 80 (14 H2, 66 H3, plus the doc H1)

---

## 3. Per-Section Digest

### §1 Purpose and scope (L7–L138)
**What it establishes:** The fundamental lifecycle (`definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`) and the platform-level chain (`bind -> project -> compose -> realize -> observe`). Establishes the execution ownership law (RAWR owns semantic/runtime boundaries; oRPC, Effect, Inngest, native hosts each own their interior). Declares Effect as the execution layer for all RAWR-owned local execution. Declares one RAWR execution terminal. Provides five normative spines: service/plugin execution, provider, resource operation, durable async, and native host callback. Clarifies that shutdown/rollback/finalization are runtime finalization behaviors, not a new lifecycle phase.

**Integration-surface vs runtime-internal:** Both. The platform chain and lifecycle order (`bind -> project -> compose -> realize -> observe`) are **integration-level architecture**. The five execution spines are **runtime-internal** but their entry and exit points (e.g., harness handoff, diagnostics) are integration contracts. The execution ownership law names every external player (oRPC, Effect, Inngest, native hosts) by name — this is a system-level boundary claim.

**Duplication/complementarity vs architecture spec:** The lifecycle phases and platform chain are foundational architecture and should be present (at summary level) in the canonical architecture spec. If the architecture spec independently defines a different lifecycle or platform chain ordering, that is a contradiction.

### §2 Fixed outcome (L139–L158)
**What it establishes:** Each `startApp(...)` invocation produces exactly one started process runtime assembly. Provides a normative table of runtime results and their owners. Declares that cohosting changes placement but not species (a `dev.ts` cohosted process is semantically the same app as a split production deployment). Forbids calling execution kinds `EffectService`, `EffectApp`, etc. (no new public ontology from Effect). Declares that a Promise-only runtime is non-compliant.

**Integration-surface vs runtime-internal:** The "one started process per `startApp(...)`" contract is a **system-level architecture claim**. The cohosting-does-not-change-species rule affects deployment model understanding. The non-Effect runtime non-compliance rule is a runtime-internal enforcement.

**Duplication/complementarity vs architecture spec:** The canonical architecture spec should acknowledge the `startApp(...)` → one process contract and the cohosting deployment principle at a high level. The table of runtime result owners is runtime-internal detail.

### §3 Authority planes and ownership laws (L160–L383)
**What it establishes:** The plane model (authority/authoring, selection/demand, derivation/planning, lifecycle/execution, translation/host, observation, durable async integration, plus role/surface/capability axes). Long authority definitions for every noun (Service, Plugin, App, Resource, Provider, SDK, Runtime compiler, Bootgraph, Effect kernel, Process runtime, Execution registry, Process execution runtime, Surface adapter, Harness, Diagnostics, RuntimeCatalog, RuntimeTelemetry, WorkflowDispatcher, FunctionBundle, Entrypoint, RuntimeProfile, ProviderSelection, ResourceRequirement, Role, Surface, Capability). The ownership matrix (what each layer owns and does not own). Declares that shared infrastructure does not transfer schema ownership or domain authority.

**Integration-surface vs runtime-internal:** The **plane model** and **ownership law compact** are integration architecture — they define what every subsystem in the platform is responsible for. The long authority definitions contain both integration contracts (Service governs domains; Plugin projects into exactly one lane; App composes by selection; Harness owns native host lifecycle after RAWR adapter lowering) and runtime-internal details (Effect kernel owns raw Effect lowering mechanics). The ownership matrix is primarily a runtime-internal classification tool.

**Duplication/complementarity vs architecture spec:** The architecture spec should mirror the plane model at the summary level and own the "what each layer owns" at the integration layer. The long authority definitions at §3.2 are more detail than the architecture spec needs, but the key boundary rules (Service does not own projection; Plugin does not own domain authority; App does not execute effects; Harness owns native host after RAWR lowering) should be reflected there.

### §4 Canonical topology and package authority (L384–L630)
**What it establishes:** The locked physical topology of the monorepo (`packages/core/`, `resources/`, `services/`, `plugins/`, `apps/`). The SDK topology (module-level breakdown of `packages/core/sdk/src/`). Canonical public import surfaces (`@rawr/sdk/*`). The rule that `/effect` SDK submodules are not optional terminal modes — they are the executable authoring helpers for RAWR-owned local execution. The execution registry lives in `packages/core/runtime/process-runtime/`.

**Integration-surface vs runtime-internal:** The top-level topology (`packages/core/`, `resources/`, `services/`, `plugins/`, `apps/`) and the canonical public import surface table are **integration contracts** — the architecture spec should reflect the package boundary model. The SDK sub-topology (file-by-file breakdown) is **runtime-internal** SDK implementation detail.

**Duplication/complementarity vs architecture spec:** The architecture spec must understand that `@rawr/sdk` is the public authoring boundary and `packages/core/runtime/*` is the runtime machinery. The detailed SDK topology is runtime-internal.

### §5 Import safety and declaration discipline (L634–L731)
**What it establishes:** All declarations are import-safe (importing a module does not acquire resources, start processes, execute effects, etc.). The raw Effect import ban covering services, plugins, apps, resources, and entrypoints. The raw Effect import allowlist (only `packages/core/runtime/substrate/effect/**`, `packages/core/runtime/process-runtime/**`, `packages/core/runtime/standard/**`, and `packages/core/sdk/src/**/internal/**`). The raw effect-oRPC import allowlist. The prohibition on `ManagedRuntime` outside runtime substrate. The canonical import form from `@rawr/sdk/effect`.

**Integration-surface vs runtime-internal:** The import safety principle and its prohibition list are **enforcement law** — technically runtime/SDK-internal but the principle (declaration ≠ execution) is an architectural discipline that the architecture spec may need to reference in its "authoring model" description. The detailed allowlists are runtime-internal.

**Duplication/complementarity vs architecture spec:** The architecture spec should describe "authoring declarations are import-safe and cold" as a property of the platform, without listing the specific forbidden imports.

### §6 Layered naming and artifact ownership (L733–L758)
**What it establishes:** Every runtime layer has its own canonical terms (table of layer → canonical terms → consumer). Key rule: `RawrEffect`, `ExecutionDescriptor`, `CompiledExecutionPlan`, etc., are operational execution nouns, not top-level ontology kinds. `startApp(...)` is the only canonical app start verb.

**Integration-surface vs runtime-internal:** The `startApp(...)` = single canonical verb is **integration-level**. The artifact naming table is runtime-internal.

**Duplication/complementarity vs architecture spec:** The architecture spec may benefit from the high-level layer vocabulary (SDK produces `NormalizedAuthoringGraph`; compiler produces `CompiledProcessPlan`; etc.) without the detailed table.

### §7 Code block exactness rule (L760–L766)
**What it establishes:** Meta-rule about the spec itself: blocks labeled `File:`, `Layer:`, `Exactness:` are normative for locked names and boundaries; illustrative for generics and overloads.

**Integration-surface vs runtime-internal:** Runtime spec internal meta-rule. Not relevant to architecture spec.

### §8 Schema ownership and RuntimeSchema (L768–L820)
**What it establishes:** `RuntimeSchema` is the SDK-facing schema facade for runtime-owned boundary schema declarations (resource config, provider config, runtime profile config, service scope/config/invocation lanes, runtime diagnostics, harness-facing runtime payloads). A schema ownership table distinguishing service-owned schema-backed contracts from runtime-carried `RuntimeSchema` uses. `RawrEffect` is not a schema form.

**Integration-surface vs runtime-internal:** The schema ownership table is a **cross-boundary integration concern** — it defines who owns schema authority at each boundary. The canonical architecture spec should be aware that service procedures have service-owned schemas while runtime config/diagnostics use `RuntimeSchema`.

**Duplication/complementarity vs architecture spec:** The architecture spec should acknowledge schema authority splitting (service-owned vs runtime-carried) without detailing the `RuntimeSchema` interface.

### §9 Effect execution components (L822–L1444)
**What it establishes:**
- **§9.1:** `RawrEffect` as the author-facing execution value type; curated `Effect` facade (not raw Effect); generator-yield compatibility; `RawrEffectFacade` interface; forbidden exports from `@rawr/sdk/effect`; `TaggedError` facade; execution policy types (`RawrRetryPolicy`, `RawrTimeoutPolicy`, `RawrConcurrencyPolicy`). Internal lowering (`lowerRawrEffect`) is non-public.
- **§9.2:** Execution descriptors (`EffectExecutionDescriptor`) as the SDK operational representation of RAWR-owned executable bodies. `ExecutionDescriptorRef` as a discriminated union keyed by `boundary` (8 boundary kinds). `ProviderEffectBoundaryKind` as separate from ordinary execution descriptors. `RuntimeEffectBoundaryKind` as policy/telemetry vocabulary only. The `.effect(...)` public executable terminal. `EffectBoundaryContext` (includes `traceId` as required). `BoundaryTelemetry` and `BoundaryErrors`.
- **§9.3:** `ExecutionDescriptorTable` as non-portable SDK-derived table of live descriptor values; portable artifacts carry refs only.
- **§9.4:** `ExecutionRegistry` as process-runtime authority pairing compiled plans with descriptors; must validate all listed rules before invocation.
- **§9.5:** `EffectRuntimeAccess` as runtime-owned handle for executing `RawrEffect` through the single process managed runtime; not exposed to services/plugins; `ManagedRuntimeHandle` owned only by runtime substrate.
- **§9.6:** Per-boundary execution policy defaults (retry, timeout, interruption, detached fibers) for all 8 execution boundary kinds plus 2 provider boundary kinds.

**Integration-surface vs runtime-internal:** The `RawrEffect` type contract and `.effect(...)` terminal are **integration contracts** (authoring boundary). The execution policy defaults and `EffectRuntimeAccess` mechanics are **runtime-internal**. The `EffectBoundaryContext` shape (including `traceId` requirement) is an **integration contract** because adapters must mint trace IDs before invocation.

**Duplication/complementarity vs architecture spec:** The architecture spec should acknowledge that RAWR uses Effect as its local execution substrate, that `RawrEffect` is the author-facing execution type, and that `traceId` is required at every invocation boundary. The detailed `RawrEffectFacade` methods and `ManagedRuntimeHandle` are runtime-internal.

### §10 App and entrypoint authoring contract (L1446–L1568)
**What it establishes:** `defineApp(...)` owns membership; SDK derives role/surface indexes from selected plugins. `RuntimeProfile` selects providers and config sources using `providers` or `providerSelections` field (not `resources`). `startApp(...)` is the only start verb, producing one process from selected app, profile, roles. Cohosted dev entrypoint uses `roles: ["server", "async", "web", "agent", "desktop"]` — this is selection, not semantic reclassification. Entrypoints must not construct `ManagedRuntime`, call raw Effect runtime APIs, or bypass `startApp(...)`.

**Integration-surface vs runtime-internal:** `startApp(...)` as the canonical process start operation and the profile-selects-providers model are **integration contracts**. The prohibition on manual runtime construction is enforcement.

**Duplication/complementarity vs architecture spec:** The architecture spec should confirm `startApp(...)` → one process and describe the profile-as-selection model. The field names (`providers` vs `resources`) are runtime spec territory.

### §11 Service runtime boundary contract (L1569–L2113)
**What it establishes:** Services govern domains; services are transport-neutral and placement-neutral. Runtime realization owns the runtime-visible service handoff (derivation, compilation, provider acquisition, binding, execution registry, adapter lowering, harness handoff, diagnostics, telemetry, finalization). The companion service-package specification owns service-private files. The five context lanes (`deps`, `scope`, `config`, `invocation`, `provided`). `invocation` is per-call; `deps`, `scope`, `config` are construction-time. `provided` initialized empty by runtime, populated only by service middleware. `defineService(...)` contract. `.effect(...)` as the only service procedure terminal. Service callable contracts using oRPC primitives (oRPC owns mechanics; service owns meaning). Service clients: `ConstructionBoundServiceClient` (construction-time) and `InvocationBoundEffectServiceClient` (per-call). `serviceDep(...)`, `resourceDep(...)`, `semanticDep(...)` dependency helpers. Boundary errors bridge: oRPC owns declared caller errors; Effect owns local failure; RAWR owns bridge and diagnostics.

**Integration-surface vs runtime-internal:** The "services are placement-neutral" and "runtime owns binding" rules are **integration architecture**. The five lanes and their runtime status (construction-time vs per-call) are **integration contracts** — adapters must know which lanes participate in cache identity. The `.effect(...)` terminal is an **integration contract** (authoring model). The oRPC bridge ownership (§11.7) is an **integration boundary claim**.

**Duplication/complementarity vs architecture spec:** The architecture spec should reflect: (a) service placement-neutrality, (b) the service/runtime boundary split (service produces contracts; runtime binds and executes), (c) oRPC's role in service callable contracts. The lane details (`ServiceBindingCacheKey` excludes `invocation`) are runtime-internal.

### §12 Plugin authoring contract (L2114–L2633)
**What it establishes:** Plugins project capabilities into exactly one role/surface/capability lane. Topology plus builder agreement determines projection status — no explicit classification field. `PluginFactory` → `PluginDefinition` (import-safe). Lane-specific builders for each projection type. `useService(...)` for declaring service dependencies. Grouped plugins are not a runtime architecture kind. Full walkthroughs of: server API plugin (Elysia/oRPC), server internal plugin (wrapping `WorkflowDispatcher`), async workflow plugin (Inngest step-local Effect), CLI command plugin (OCLIF), agent tool plugin (OpenShell), desktop background plugin (process-local), web app projection.

**Integration-surface vs runtime-internal:** The topology+builder→projection-classification rule is an **integration architecture** rule (the architecture spec must know that plugin type = topology path + builder, not a flag field). The `WorkflowDispatcher` integration (server internal wraps dispatcher) is an **integration contract**. Harness assignments (Elysia for server, Inngest for async, OCLIF for CLI, etc.) are **integration contracts**.

**Duplication/complementarity vs architecture spec:** The architecture spec should reflect the topology+builder classification model and the harness assignment by role/surface. The per-plugin code examples are runtime-internal.

### §13 Resource, provider, and profile model (L2635–L3045)
**What it establishes:** Resources declare contracts; providers implement contracts; profiles select supply. `RuntimeResource` owns stable identity, value shape, lifetime (process/role), config schema, diagnostic contributors. `ResourceRequirement` declares demand. `RuntimeProvider` implements acquisition/release via `ProviderEffectPlan` from `providerFx`. `ProviderSelection` is app/profile-owned binding between resource and provider. Resource catalog under `resources/*`. Standard RAWR providers under `packages/core/runtime/standard/*`. Detailed examples for email resource, provider selector, and provider acquire/release.

**Integration-surface vs runtime-internal:** The resource/provider/profile layering model is an **integration architecture** concern — the architecture spec must understand this three-way split. The `ResourceLifetime` enum (process/role) affects deployment/process model understanding. `ProviderEffectPlan` vs `EffectExecutionDescriptor` separation is runtime-internal.

**Duplication/complementarity vs architecture spec:** The architecture spec should describe: resource = contract, provider = implementation, profile = selection. The detailed type shapes are runtime-internal.

### §14 Process-local coordination resources (L3047–L3211)
**What it establishes:** Four process-local coordination resources: `ProcessQueueHubResource` (bounded local handoff), `ProcessPubSubHubResource` (in-process broadcast), `ProcessConcurrencyLimiterResource` (rate/concurrency cap), `ProcessCacheHubResource` (process/role scoped caching). All are explicit resources with process/role lifetime. All are not durable coordination systems (no cross-process durability, no workflow history).

**Integration-surface vs runtime-internal:** The existence of these resources as RAWR-owned first-class coordination primitives is architecturally significant. The distinction "process-local, not durable" is an **integration boundary** — it tells subsystem authors what cannot be achieved via these resources vs what requires Inngest. The architecture spec should acknowledge this resource category exists and its durability boundary.

**Duplication/complementarity vs architecture spec:** The architecture spec should mention that process-local coordination primitives exist and are not substitutes for durable async. Type details are runtime-internal.

### §15 SDK derivation and portable plan artifacts (L3213–L3437)
**What it establishes:** SDK derives `NormalizedAuthoringGraph` (section breakdown), `ExecutionDescriptorTable` (non-portable; refs only are portable), identity derivation policy, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `PortableRuntimePlanArtifact` (consumable by compiler/diagnostics/control-plane without live resources).

**Integration-surface vs runtime-internal:** `PortableRuntimePlanArtifact` is an **integration point** — it is the artifact consumed by "runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints" (L3437). The SDK → compiler handoff via `NormalizedAuthoringGraph` is an **internal runtime pipeline boundary**. The `ExecutionDescriptorTable` portability split (refs portable, table non-portable) is a **runtime-internal detail** with integration-level implications (a separate runtime consuming only portable artifacts must also receive the matching descriptor table).

**Duplication/complementarity vs architecture spec:** The architecture spec should acknowledge the SDK produces both portable and non-portable artifacts and that the `PortableRuntimePlanArtifact` is the control-plane/deployment-touchpoint surface. Type details are runtime-internal.

### §16 Runtime compiler and compiled process plan (L3439–L3617)
**What it establishes:** Compiler inputs (NormalizedAuthoringGraph, ExecutionDescriptorTable availability, AppDefinition, entrypoint, RuntimeProfile, environment, harness selection). Compiler outputs (`CompiledProcessPlan` with sections: roles, resourceRequirements, providerSelections, providerDependencyGraph, compiledResources, serviceBindings, surfaces, workflowDispatchers, harnesses, executionPlans, executionRegistryInput, bootgraphInput, topologySeed, diagnostics). `CompiledExecutionPlan` (executionId, boundary, policy, telemetryLabels, errorBridge — no execution mode field). Provider coverage validation rules and diagnostic codes. Compiler does not acquire resources or mount harnesses.

**Integration-surface vs runtime-internal:** The compiler's validation responsibilities (provider coverage, dependency closure, service closure, topology/builder agreement, execution boundary policy, raw Effect import law) are **architectural enforcement points**. The `CompiledProcessPlan` structure is runtime-internal. The diagnostic codes are runtime-internal.

**Duplication/complementarity vs architecture spec:** The architecture spec should describe the compiler's role as a validation + planning boundary. The plan structure is runtime-internal.

### §17 Bootgraph and Effect-backed provisioning/execution kernel (L3619–L3731)
**What it establishes:** Bootgraph receives `BootgraphInput` from compiler and produces `ProvisionedProcess`. Bootgraph owns dependency ordering, dedupe, rollback on failed startup, reverse finalization. Effect kernel creates one root managed runtime per process — used for both provisioning and `RawrEffect` execution. `ProvisionedProcess` contains the managed runtime handle, process resources, role resources, finalizer registry. On provider acquisition failure: rollback already-acquired providers, dispose managed runtime, emit diagnostics, do not mount harnesses.

**Integration-surface vs runtime-internal:** The single-managed-runtime-per-process rule is an **architectural claim** (one root managed runtime → one Effect kernel per started process). The rollback-on-failure behavior is a runtime-internal guarantee. The `ProvisionedProcess` is an internal artifact. The startup failure behavior (no harness mounting) is an integration guarantee (harnesses only mount after successful provisioning).

**Duplication/complementarity vs architecture spec:** The architecture spec should know: bootgraph handles lifecycle ordering, Effect kernel handles local execution substrate, provisioning happens before harness mounting, and a single managed runtime handles both provisioning and execution.

### §18 Process runtime, runtime access, and service binding (L3732–L3984)
**What it establishes:** `RuntimeAccess` as live operational access (process-level, role-level, surface-level); never exposes raw Effect/provider/config internals; services receive scoped `deps`, not broad `RuntimeAccess`. Process runtime assembles processes from compiled plan + descriptor table + provisioned process. `ExecutionRegistry` assembled once before adapter lowering; validates descriptor/plan identity agreement. `ProcessExecutionRuntime` centralizes all Effect descriptor execution; adapters must not independently run `RawrEffect`. `ServiceBindingCache` excludes `invocation` from cache key. `bindService(...)` constructs live service binding from provisioned resources and sibling clients.

**Integration-surface vs runtime-internal:** The `RuntimeAccess` scoping (services do not receive broad runtime access) is an **architectural security boundary**. The centralization of Effect execution in `ProcessExecutionRuntime` is an architectural rule. The `ServiceBindingCache` key exclusion of `invocation` has implications for adapter design.

**Duplication/complementarity vs architecture spec:** The architecture spec should reflect: (a) process runtime assembles processes and owns service binding, (b) runtime access is scoped — services receive only their declared deps. The cache key details are runtime-internal.

### §19 WorkflowDispatcher and async runtime integration (L3986–L4150)
**What it establishes:** `WorkflowDispatcher` materializes at runtime from selected workflow definitions + provisioned async client. Server API/internal projections wrap dispatcher for trigger/status/cancel surfaces; workflow plugins do not expose product APIs. Async lowering chain: `WorkflowDefinition/ScheduleDefinition/ConsumerDefinition → SDK normalized async surface plan → runtime compiled async surface plan → async SurfaceAdapter → FunctionBundle → Inngest harness`. `FunctionBundle` is the Inngest harness-facing artifact. Async step-local Effect via `defineAsyncStepEffect(...)` and `stepEffect(...)`. Inngest owns durability, step replay, schedules, event history, workflow run identity.

**Integration-surface vs runtime-internal:** The WorkflowDispatcher/server-internal-plugin pattern is an **integration boundary** — it defines how async workflow capabilities surface to API callers. The `FunctionBundle` → Inngest harness boundary is an **integration contract** between the runtime and Inngest. The Inngest ownership claim (durable semantics) is an **integration boundary declaration**.

**Duplication/complementarity vs architecture spec:** The architecture spec must reflect: (a) WorkflowDispatcher as the integration bridge between server projections and async definitions, (b) Inngest owns durable semantics, (c) server internal plugins wrap dispatcher access. The `FunctionBundle` type details are runtime-internal.

### §20 Surface adapter lowering (L4151–L4239)
**What it establishes:** Adapters lower `CompiledSurfacePlan` (not raw authoring or SDK graphs) into harness-facing native payloads. Adapters produce native closures that call `ProcessExecutionRuntime` at invocation time. Adapters do not execute descriptors during lowering. Effect-oRPC adapter containment rules. The native callback pattern (registry resolve → execution runtime execute).

**Integration-surface vs runtime-internal:** The adapter contract (input: `CompiledSurfacePlan` + registry + execution runtime; output: native payload closures) is an **integration contract** between the runtime and native harnesses. The "adapters resolve through registry" rule is an enforcement law.

**Duplication/complementarity vs architecture spec:** The architecture spec should describe: adapters are the translation layer between compiled surfaces and native hosts; adapters delegate invocation to `ProcessExecutionRuntime`. The adapter interface details are runtime-internal.

### §21 Harness and native boundary contracts (L4241–L4333)
**What it establishes:** `HarnessDescriptor` contract (mount, return `StartedHarness`). Per-harness specifications:
- **Elysia harness:** HTTP host, oRPC callbacks, OpenAPI publication for public APIs, internal RPC handlers for internal projections. Boundary: Elysia owns HTTP lifecycle; does not own API meaning, service construction, provider selection.
- **Inngest harness:** FunctionBundle input, connected worker or serve-mode output, native async handles. Does not produce `WorkflowDispatcher`. Boundary: Inngest owns durable async execution semantics.
- **OCLIF harness:** CLI command registration, callbacks to ProcessExecutionRuntime. Boundary: OCLIF owns command execution semantics.
- **Web harness:** web app mount/build/serve handoff to selected web host.
- **Agent/OpenShell harness:** channel, shell, tool mounts; policy hooks; "reserved boundary with locked integration hooks."
- **Desktop harness:** native desktop payloads, host callbacks. Boundary: desktop hosts own native desktop interiors.

**Integration-surface vs runtime-internal:** The per-harness **input/output/boundary rules** are **integration contracts** — the architecture spec must list the harnesses and their integration shapes. "Inngest harness does not produce `WorkflowDispatcher`" is an important boundary clarification. "Agent/OpenShell governance is a reserved boundary with locked integration hooks" is a significant architectural statement.

**Duplication/complementarity vs architecture spec:** The architecture spec should list all six harnesses with their native host assignments and boundary rules. Placement and internal details are runtime-internal.

### §22 Diagnostics, telemetry, catalog, and observation (L4334–L4572)
**What it establishes:** `RuntimeDiagnostic` (structured finding with severity, phase, boundary, code, message, payload, redaction). Seven lifecycle phases (`definition`, `selection`, `derivation`, `compilation`, `provisioning`, `mounting`, `observation`). `RuntimeTelemetry` interface and telemetry chain (full ordering from entrypoint through to finalization). `RuntimeCatalog` minimum record sections (processIdentity, appIdentity, entrypointIdentity, roles, derivedAuthoring, resources, providers, providerDependencyGraph, plugins, serviceAttachments, workflowDispatchers, executionPlans, executionRegistry, surfaces, harnesses, lifecycleTimestamps/status, diagnostics, topologyRecords, startupRecords, executionRecords, finalizationRecords). Diagnostic failure class table (50+ diagnostic codes). Storage backend/indexing/retention are reserved.

**Integration-surface vs runtime-internal:** The seven lifecycle phases are **integration-level architecture** (the architecture spec should reference the canonical phase names). `RuntimeCatalog` as the diagnostic read model is an **integration contract** for "diagnostic readers/control-plane touchpoints" (L3437). The telemetry chain ordering is runtime-internal.

**Duplication/complementarity vs architecture spec:** The architecture spec should list the seven lifecycle phases and describe `RuntimeCatalog` as the observation/control-plane interface. Diagnostic codes and the catalog's detailed record shape are runtime-internal.

### §23 Cross-cutting runtime components (L4574–L4643)
**What it establishes:** Config/secrets (loads once, `RuntimeSchema`-validated, secrets redacted at config boundary, supported source kinds, no global config bag, raw env reads forbidden in service/plugin bodies). Caching taxonomy (ServiceBindingCache, process-local primitives, ProcessCacheHubResource, service semantic cache, call-local memoization — explicitly differentiated). Telemetry separation (runtime telemetry vs telemetry resources vs oRPC middleware vs Inngest spans vs Elysia instrumentation vs service semantic events vs product analytics). Policy separation (app membership, process defaults, projection boundary, domain invariants, runtime enforcement, native host policy). Reserved detail boundaries list.

**Integration-surface vs runtime-internal:** The config source kind list (env, dotenv, file, memory, test) is a **runtime specification concern** but affects deployment model. The caching taxonomy is runtime-internal detail. The telemetry separation table is an **integration boundary description** (each layer owns its own observability). The policy separation table is **integration architecture**.

**Duplication/complementarity vs architecture spec:** The architecture spec should reflect the multi-layer observability ownership (service semantic events ≠ runtime telemetry ≠ product analytics) and the policy ownership distribution. Config source details are runtime-internal.

### §24 End-to-end assembly flows (L4645–L4887)
**What it establishes:** Dynamic lifecycle sequence diagram (normative handoff order). Seven-phase realization checklist (with required output, producer, consumer, gate per phase). Four realistic flow walkthroughs: public API with provider selection, workflow trigger through internal API, service-to-service dependency, and async lowering into FunctionBundle.

**Integration-surface vs runtime-internal:** The sequence diagram is the canonical integration picture of the runtime pipeline — it is the most complete single integration artifact in the spec. The checklist with gates is runtime-internal enforcement. The realistic flows are illustrative implementations of the integration model.

**Duplication/complementarity vs architecture spec:** The architecture spec should contain a summary of the handoff sequence at the layer level (authoring → SDK → compiler → bootgraph → kernel → process runtime → adapter → harness → observation). The detailed mermaid sequence diagram belongs in the runtime spec only.

### §25 Enforcement rules and forbidden patterns (L4889–L5061)
**What it establishes:** Normative prohibitions across: projection classification (no reclassification fields), service boundary (dependency helper rules, no importing service internals), resource/provider/profile (no self-selection, no auto-acquisition), runtime/provisioning (no pre-provisioning live value acquisition), service binding (cache excludes invocation), async (workflow plugins do not expose APIs; no inline async step bodies), harness/framework (Effect/oRPC/frameworks are native interiors, not peer owners), diagnostics (catalog is read model only), Effect-only execution (full list of forbidden raw Effect operations), process-local coordination (not durable), acceptance gates (seven gate families).

**Integration-surface vs runtime-internal:** The enforcement rules themselves are runtime-internal. However, some are **integration-relevant**: the "workflow plugins do not expose product APIs" rule requires server internal projection to wrap dispatcher access — this affects how the architecture spec describes async capability surfacing. "Effect/oRPC/Elysia/Inngest/OCLIF are native interiors behind RAWR-shaped boundaries, not peer semantic owners" (L4969) is a key architectural positioning statement.

**Duplication/complementarity vs architecture spec:** The architectural positioning statement in §25.7 should be reflected in the architecture spec's vendor integration framing. Other enforcement rules are runtime-internal.

### §26 Load-bearing foundation and flexible extension matrix (L5063–L5085)
**What it establishes:** Separates what is locked (normative foundation — ownership law, topology, lifecycle, app start verb, service lanes, plugin classification model, execution model, resource/provider/profile layering, compiler validation, bootgraph, runtime access, service binding cache rule, workflow dispatcher pattern, adapter lowering rule, harness mounting rule, diagnostics minimum shape) from what is flexible (new service domains, new plugin capabilities, new provider families, per-lane surface facts, etc.).

**Integration-surface vs runtime-internal:** The locked vs flexible matrix is primarily runtime spec internal, but it implicitly defines what the architecture spec must preserve (locked items) vs what it can evolve over time (flexible items).

**Duplication/complementarity vs architecture spec:** The architecture spec should be aware that the items in the "load-bearing foundation" column represent invariants it must not contradict.

### §27 Runtime realization component contract summary (L5087–L5130)
**What it establishes:** A large table listing every component/artifact with: owner, placement, produced by, consumed by, phase, diagnostics, enforcement/acceptance gate.

**Integration-surface vs runtime-internal:** This table is the most comprehensive integration map in the spec — it defines the producer/consumer relationships for every artifact. It is primarily runtime-internal detail.

**Duplication/complementarity vs architecture spec:** The table's "consumed by" column for artifacts like `PortableRuntimePlanArtifact` ("Compiler/diagnostics/control-plane touchpoints") and `RuntimeCatalog` ("Diagnostic readers/control-plane touchpoints") are integration claims the architecture spec should reflect.

### §28 Canonical runtime realization picture (L5131–L5258)
**What it establishes:** A structured prose summary of every component's canonical responsibilities — a compact one-liner per component. The closing statement: "RAWR stays scale-continuous because semantic identity and runtime placement remain separate."

**Integration-surface vs runtime-internal:** This section is the canonical integration picture — it is the most compact authoritative statement of what each component does. The closing statement is an architectural principle.

**Duplication/complementarity vs architecture spec:** The architecture spec should reference this principle ("semantic identity and runtime placement remain separate") explicitly. The per-component one-liners are runtime-internal.

### §29 Lock authority and stale source handling (L5260–L5264)
**What it establishes:** This spec supersedes all older indexed runtime/effect documents once locked. Stale-source containment is a migration-readiness gate.

**Integration-surface vs runtime-internal:** Spec authority management — not relevant to the architecture spec content.

---

## 4. Integration Boundaries the Spec Exposes

### 4.1 `startApp(...)` → one process contract
**Description (L139–L141):** "Each `startApp(...)` invocation produces exactly one started process runtime assembly."
**Type:** Public API contract / integration contract. Every system component or deployment tool that initiates a RAWR process uses this entry point.

### 4.2 `@rawr/sdk` public import surface
**Description (L598–L630):** The table of 25+ public SDK import paths (e.g., `@rawr/sdk/app`, `@rawr/sdk/effect`, `@rawr/sdk/service`, `@rawr/sdk/plugins/server`, `@rawr/sdk/plugins/async`, `@rawr/sdk/runtime/resources`, etc.) is the locked public authoring API.
**Type:** Public SDK contract — the integration surface between authored code and the runtime system.

### 4.3 Execution ownership law / vendor integration shape
**Description (L37–L47):**
> "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe."

**Type:** System-level integration boundary declaration naming all vendor integration points.

### 4.4 Harness input/output contracts (per harness)
- **Elysia harness (L4278–L4282):** Input = mounted server API/internal surface runtimes, adapter-lowered oRPC/Elysia route payloads. Output = mounted Elysia routes, oRPC callbacks to `ProcessExecutionRuntime`, OpenAPI for public projections, internal RPC handlers.
- **Inngest harness (L4287–L4291):** Input = `FunctionBundle`, selected Inngest runtime resource, async harness mode. Output = connected worker or serve-mode runtime ingress, native Inngest functions, native async handles. "The harness does not produce or own `WorkflowDispatcher`."
- **OCLIF harness (L4297–L4300):** Input = adapter-lowered command payloads. Output = native OCLIF command registration, callbacks to `ProcessExecutionRuntime`.
- **Web harness (L4308–L4310):** Input = web app surface payloads, client publication metadata. Output = web app mount/build/serve handoff.
- **Agent/OpenShell harness (L4317–L4322):** Input = agent surface payloads, OpenShell resources. Output = channel/shell/tool mounts, OpenShell host payloads, callbacks to `ProcessExecutionRuntime`. "Agent governance remains a reserved boundary with locked integration hooks."
- **Desktop harness (L4328–L4331):** Input = desktop surface payloads, desktop host config. Output = native desktop payloads, callbacks to `ProcessExecutionRuntime`.

**Type:** Integration contracts between RAWR runtime and native host systems.

### 4.5 `WorkflowDispatcher` as server-internal → async bridge
**Description (L3992–L3994):** "The SDK and runtime derive dispatcher descriptors and compiled dispatcher plans. The live dispatcher materializes only after provisioning. Server API and server internal projections may wrap dispatcher capabilities for trigger, status, cancel, or dispatcher-facing caller surfaces."
**Type:** Integration contract between server projection plane and async/Inngest plane.

### 4.6 `PortableRuntimePlanArtifact` as control-plane / deployment touchpoint
**Description (L3409–L3437):** The portable plan artifact "allows inspection, control-plane handoff, and reproducible runtime planning without live resources or executable closures." Consumed by "runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints."
**Type:** Integration contract between the runtime derivation pipeline and external control planes / deployment tooling.

### 4.7 `RuntimeCatalog` as observation / control-plane interface
**Description (L4470–L4511):** "The diagnostic read model of selected, derived, compiled, provisioned, bound, projected, executed, mounted, observed, and stopped topology." Consumed by "diagnostic readers/control-plane touchpoints."
**Type:** Integration contract between the runtime observation plane and external diagnostic/control-plane consumers.

### 4.8 Topology + builder = projection classification rule
**Description (L2172–L2192):** The table of topology paths to builder families. "Path and builder mismatch is a structural error." App selection and harness publication policy cannot reclassify a plugin projection.
**Type:** Integration contract between plugin authoring and the runtime compiler/adapter system.

### 4.9 `EffectBoundaryContext.traceId` as required invocation correlation
**Description (L1193):** "EffectBoundaryContext.traceId is required for RAWR-owned executable invocation boundaries. If the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`."
**Type:** Integration contract between native hosts/adapters and the execution pipeline — adapters must guarantee trace identity.

### 4.10 Inngest SDK integration shape
**Description (L131–L133):** "Effect may appear inside durable async steps only as local execution. Inngest remains the durable owner of workflow run identity, retry, replay, history, schedules, durable queues, and durable async semantics."
**Description (L4149):** "Inngest owns durability, step replay, schedules, event history, workflow run identity, and durable async semantics."
**Type:** Integration boundary claim — load-bearing for alignment recommendation (Inngest is not optional; it is the durable async owner).

### 4.11 oRPC integration shape
**Description (L1914–L1948, L2358–L2371):** "oRPC owns procedure and transport mechanics; the service owns the meaning." The descriptor-first posture: `.effect(function*)` authoring → SDK captures `EffectExecutionDescriptor` → oRPC route/procedure wrapper remains contract-shaped → invocation calls `ProcessExecutionRuntime`.
**Type:** Integration boundary — oRPC is a mechanics layer, not a semantic owner. The `effect-oRPC` adapter is SDK-internal only.

### 4.12 Effect SDK integration shape (runtime substrate)
**Description (L3676–L3703):** "The Effect provisioning/execution kernel creates one root managed runtime per started process. That managed runtime is used both for provisioning/finalization and for runtime execution of `RawrEffect` programs through `EffectRuntimeAccess`."
**Type:** Integration boundary — Effect's `ManagedRuntime` is the single process-local execution kernel; its construction is gated to runtime substrate code only.

### 4.13 Elysia integration shape
**Description (L4278–L4282):** Elysia owns HTTP host lifecycle and request routing. It does not own public API meaning, service construction, provider selection, app membership, or runtime provisioning.
**Type:** Integration boundary claim for the HTTP host.

### 4.14 OCLIF integration shape
**Description (L2489–L2527, L4297–L4302):** OCLIF owns command execution semantics; does not own plugin management authority, service semantics, runtime provisioning, or app selection.
**Type:** Integration boundary claim for the CLI host.

### 4.15 Bun process model (implied)
The spec references `apps/<app>/<entrypoint>.ts` files calling `startApp(...)` as Node/Bun-compatible entrypoints but does not explicitly discuss Bun as a distinct vendor. Bun is the underlying runtime for process execution based on the repo context, but the spec treats it as infrastructure rather than naming it as a RAWR concern.

---

## 5. Runtime-Internal Concepts the Architecture Spec Must NOT Duplicate

The following concepts belong exclusively to the runtime spec. The architecture spec may acknowledge their *existence* (and the surface they present) but must not reproduce their internals:

1. **`RawrEffectFacade` method signatures** (L865–L942) — SDK authoring surface detail
2. **`ExecutionDescriptorRef` discriminated union fields** (L1078–L1136) — runtime execution contract detail
3. **`ExecutionDescriptorTable` non-portable/portable split mechanics** (L1197–L1228) — SDK derivation internal
4. **`EffectRuntimeAccess.run(...)` / `runExit(...)` signatures** (L1280–L1298) — runtime substrate internal
5. **Per-boundary execution policy defaults** (L1382–L1442) — runtime policy detail
6. **`NormalizedAuthoringGraph` field breakdown** (L3224–L3240) — SDK derivation internal
7. **`CompiledProcessPlan` section breakdown** (L3490–L3515) — runtime compiler internal
8. **`BootResourceModule` fields** (L3662–L3670) — bootgraph internal
9. **`ServiceBindingCache` key fields** (L3943–L3953) — process runtime internal
10. **`FunctionBundle` fields** (L4060–L4069) — async adapter/harness internal
11. **`SurfaceAdapter` interface** (L4162–L4187) — adapter internal
12. **Diagnostic failure code table** (L4513–L4569) — runtime diagnostics internal
13. **Provider dependency graph fields** (L3565–L3587) — compiler internal
14. **`RuntimeCatalog` nested record shapes** (L4480–L4508) — observation plane internal
15. **Raw Effect allowlist paths** (L705–L726) — enforcement law internal
16. **`defineService(...)`, `defineRuntimeProvider(...)`, `providerFx.acquireRelease(...)` signatures** — authoring API details owned by runtime spec
17. **Config precedence algorithms, provider refresh mechanics, call-local memoization** (L4643) — reserved details in runtime spec

---

## 6. Runtime-Driven Additions the Architecture Spec is Likely Missing

### 6.1 The five-phase platform chain and seven-phase lifecycle as canonical vocabulary
**Runtime spec (L21–L29):**
```
bind -> project -> compose -> realize -> observe  [platform chain]
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation  [lifecycle]
```
These are the canonical phase names used throughout the runtime spec for diagnostics, telemetry correlation, and artifact classification. If the architecture spec does not name these phases, or uses different names, downstream documents will use inconsistent terminology.

### 6.2 Execution ownership law (vendor split)
**Runtime spec (L37–L47):** The normative breakdown of which vendor/layer owns which execution concern (RAWR, oRPC, Effect, Inngest, native hosts, SDK, runtime, harnesses, diagnostics) is a system-level integration statement. The architecture spec should reflect this split explicitly so companion subsystem documents know where their boundary falls.

### 6.3 The topology + builder → projection classification model
**Runtime spec (L2172–L2192, §12.3):** Projection status (public server API vs trusted internal vs async vs CLI vs web vs agent vs desktop) is determined by filesystem topology + matching builder, not by a classification field. This is a significant architectural rule that affects how the platform is structured. The architecture spec should reflect that "plugin classification = topology + builder agreement."

### 6.4 Harness enumeration and vendor assignments
**Runtime spec (§21):** The six harnesses (Elysia/HTTP, Inngest/async, OCLIF/CLI, web, agent/OpenShell, desktop) with their specific vendor assignments and boundary rules. The architecture spec should explicitly list the harnesses and their vendor associations so companion documents (e.g., a deployment guide, an integration guide) know what native host systems the platform integrates with.

### 6.5 `WorkflowDispatcher` as the async-to-server integration bridge
**Runtime spec (§19.1, §12.6, §24.4):** The pattern that async workflow capabilities surface to API callers via server internal plugins wrapping `WorkflowDispatcher` (not directly) is architecturally load-bearing. Without this pattern described in the architecture spec, the division of responsibility between async plugins and server API/internal plugins is unclear. This is specifically: workflow plugins do not expose product APIs; server internal projections wrap dispatcher for trigger/status/cancel.

### 6.6 `PortableRuntimePlanArtifact` as the control-plane / deployment integration surface
**Runtime spec (L3409–L3437):** The portable plan artifact is the formal integration point for "deployment/control-plane touchpoints." The architecture spec should describe this artifact as the platform's interface to external control planes and deployment tooling.

### 6.7 `RuntimeCatalog` as the observation / control-plane read interface
**Runtime spec (§22.3):** `RuntimeCatalog` is the runtime's interface for external diagnostic readers and control-plane touchpoints. The architecture spec should name `RuntimeCatalog` as the observation plane interface without replicating its schema.

### 6.8 The cohosting model (single semantic vs multiple physical processes)
**Runtime spec (L154):** "A cohosted development process and a split production process use the same semantic app and plugin definitions. Cohosting changes placement and resource sharing. It does not change species." This deployment-level architectural principle should appear in the architecture spec's deployment or process model section.

### 6.9 Process-local coordination resources as a distinct resource category
**Runtime spec (§14):** The four process-local coordination resources (`ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource`) represent a formal RAWR-owned coordination category distinct from both external services and durable async. The architecture spec should acknowledge this category and its durability boundary.

### 6.10 `traceId` as required at every invocation boundary
**Runtime spec (L1193–L1194):** `EffectBoundaryContext.traceId` is required; adapters must mint one if the native host does not supply it. The architecture spec should reflect that trace correlation is a required contract at every RAWR execution boundary.

---

## 7. Vendor-Integration Claims

### 7.1 Effect (effect-ts library)

**Claims in runtime spec:**
1. **Effect is the execution layer for all RAWR-owned local execution** (L49–L50) — LOAD-BEARING. Services, server API/internal plugins, CLI commands, agent tools, desktop background, web-local RAWR execution, resource operations, and async step-local execution all use Effect through RAWR-owned authoring and runtime surfaces.
2. **Effect's `ManagedRuntime` creates one root managed runtime per process** (L1350–L1371, L3677–L3679) — LOAD-BEARING. `ManagedRuntime.make(input.layer.rawEffectLayer)` is called in `createManagedRuntimeHandle(...)`.
3. **Effect owns scoped acquisition/release, process-local coordination, interruption, timeout, retry** (L3700–L3703) — LOAD-BEARING. These capabilities determine what process-local coordination resources can do.
4. **`Effect.gen(function*)` as generator-yield execution model** (L830–L832) — LOAD-BEARING. The generator-native authoring syntax depends on Effect's generator support.
5. **Effect local fibers, queues, schedules, pubsub, refs, streams, caches are process-local runtime mechanics** (L3703–L3704) — name-drop only (naming what Effect provides internally that RAWR wraps).

**Verification status:** Effect is a well-known TypeScript library (effect-ts). The `ManagedRuntime` API, generator support, and structured concurrency claims are consistent with the library's documented capabilities. No verification note needed for the core effect-ts claims. The claim that Effect's `ManagedRuntime` is used as the single process runtime substrate is load-bearing — this determines the process lifecycle model.

### 7.2 Inngest

**Claims in runtime spec:**
1. **Inngest owns durable async execution semantics: workflow run identity, retry, replay, history, schedules, durable queues** (L133, L4149) — LOAD-BEARING.
2. **Inngest harness operates in "connected worker or serve-mode"** (L4289) — LOAD-BEARING. This determines whether Inngest integration requires a separate serve endpoint or a worker connection.
3. **`FunctionBundle` is packaged as "native Inngest-compatible payloads"** (L4064–L4069) — LOAD-BEARING for verifying that `InngestNativeFunctionPayload` maps to actual Inngest API shapes.
4. **Async step-local Effect execution "must be mounted through the Inngest step boundary"** (L2445) — LOAD-BEARING. The `InngestStepApi` (L4109) is referenced as the step-level interface.
5. **Inngest durable retries take precedence over Effect local retries in async step context** (L1405–L1407: "durable retry: Inngest first; local Effect retry: explicit transient only") — LOAD-BEARING.

**Verification status:** LOAD-BEARING claims. These claims about Inngest's serve/connect modes and the step API shape need verification against Inngest's official documentation. Recommend verifying: (a) Inngest `serve` vs `connect` worker modes, (b) `InngestStepApi` step execution shape.

### 7.3 oRPC

**Claims in runtime spec:**
1. **oRPC owns callable contract mechanics and procedure/transport** (L39, L1914) — LOAD-BEARING.
2. **Service callable contracts may be expressed through oRPC primitives** (L1912) — LOAD-BEARING.
3. **`effect-oRPC` is an SDK-internal adapter** (L678–L679, §12.5, L2229) — LOAD-BEARING. "Service and plugin packages do not import effect-oRPC directly." Only `packages/core/sdk/src/service/effect/internal/**` and `packages/core/sdk/src/plugins/server/effect/internal/**` use it.
4. **oRPC route/procedure wrapper remains contract-shaped while Effect descriptor handles execution** (L2362–L2371) — LOAD-BEARING.
5. **oRPC middleware traces as a distinct telemetry layer** (L4616) — name-drop only.

**Verification status:** LOAD-BEARING claims about `effect-oRPC` as a library that bridges Effect execution with oRPC contract mechanics. This is a critical integration claim — `effect-oRPC` may be an internal fork/wrapper or a separate package. Recommend verifying whether `effect-orpc` is a public package or RAWR-internal library.

### 7.4 OCLIF

**Claims in runtime spec:**
1. **OCLIF owns command execution semantics** (L4301) — LOAD-BEARING.
2. **OCLIF harness receives adapter-lowered command payloads and produces native OCLIF command registration** (L4297–L4300) — LOAD-BEARING.
3. **OCLIF does not own plugin management authority, service semantics, runtime provisioning, or app selection** (L4302) — LOAD-BEARING (defines the boundary).

**Verification status:** OCLIF is a known CLI framework. The claims about its capabilities are consistent with OCLIF's documented behavior. The integration shape (OCLIF gets RAWR-lowered command payloads and handles dispatch) is a design choice about the adapter boundary, verifiable through OCLIF's API.

### 7.5 Elysia

**Claims in runtime spec:**
1. **Elysia owns HTTP host lifecycle and request routing** (L4281) — LOAD-BEARING.
2. **Elysia harness mounts oRPC callbacks delegating to `ProcessExecutionRuntime`** (L4280) — LOAD-BEARING.
3. **Elysia publishes OpenAPI for selected public API projections** (L4280) — LOAD-BEARING. The claim that OpenAPI publication is Elysia-provided needs verification (Elysia does have OpenAPI/Swagger plugin support, but this is via plugin, not built-in).
4. **"The plugin owns public API projection. The service owns work-item domain authority. Elysia owns HTTP host mechanics. oRPC owns procedure mechanics."** (L2229) — architectural positioning.

**Verification status:** LOAD-BEARING claim about OpenAPI publication. Recommend verifying that Elysia's OpenAPI support can be integrated with oRPC contract shapes as the spec implies.

### 7.6 Bun

The spec does not explicitly name Bun as a vendor integration. Bun is the implied process host (given the repo context), but the spec treats it as infrastructure-level and below its scope. The spec references `apps/<app>/<entrypoint>.ts` files calling `await startApp(...)` as the process entry point — compatible with Bun's top-level await support but not exclusive to it.

**Verification status:** Name-drop-level at best (through `await startApp(...)`). Not load-bearing for alignment recommendations.

---

## 8. Authority Overlaps & Contradictions to Flag

### 8.1 The execution ownership law names oRPC as owning "callable contract mechanics" — potential overlap with architecture spec's API layer description
The runtime spec's normative execution ownership law (L37–L47) positions oRPC as owning "callable contract mechanics." If the canonical architecture spec has its own description of how the API layer works (e.g., "the server API layer uses HTTP+JSON contracts"), this may conflict with the runtime spec's specific claim that oRPC is the contract mechanics owner. The resolution heuristic ("runtime spec is authoritative on runtime concerns") would apply here since oRPC is a runtime execution integration choice. **Flag for cross-locus reconcile.**

### 8.2 The runtime spec asserts harness-level system integration topology — architecture spec purview
The runtime spec (§21) specifies exact input/output shapes for every harness, including which vendor owns which native host. This is integration architecture: "Elysia owns HTTP host lifecycle", "Inngest owns durable async execution semantics", "OCLIF owns command execution semantics." These are system-level claims that extend beyond runtime-internal mechanics. If the architecture spec has a different view of the HTTP or async host stack, there is a contradiction. **Load-bearing for alignment.**

### 8.3 The runtime spec's topology (§4) locks the monorepo package structure — potential architecture spec conflict
The canonical topology at L384–L466 includes `services/`, `plugins/`, `resources/`, `apps/`, `packages/core/` as locked top-level roots. If the architecture spec describes a different module layout (e.g., a different package structure or different layer naming), this is a direct contradiction. **Flag.**

### 8.4 The agent/OpenShell harness is "a reserved boundary with locked integration hooks" — implies the architecture spec should not yet specify its full integration shape
The runtime spec (L4322) says "Agent governance remains a reserved boundary with locked integration hooks. Agent plugins do not move service domain authority or broad runtime access into agent-local semantics." This means: (a) the agent harness integration surface is intentionally incomplete; (b) the architecture spec should not yet claim a fully specified agent integration model. **Flag for architecture spec authors.**

### 8.5 The runtime spec defers some details to "dedicated specifications" — implies companion subsystem docs exist
The runtime spec (L23.5) lists reserved detail boundaries and states each "must be locked no later than the first implementation slice that makes its dedicated specification trigger true." This implies companion specification documents should exist for config precedence, provider refresh mechanics, call-local memoization, generic cache resources, process-local coordination provider details, runtime telemetry backend, `RuntimeCatalog` storage backend, etc. If the architecture spec claims to describe these in full, it contradicts the runtime spec's reserved-detail model.

### 8.6 The runtime spec claims authority over "shell governance" as out-of-scope for runtime realization — but harness §21.5 specifies agent/OpenShell integration
L11 says the runtime spec "does not own [...] shell governance." Yet §21.5 specifies the Agent/OpenShell harness integration. This is not a contradiction — "shell governance" (OpenShell's internal governance model) is different from "the RAWR harness integration point for OpenShell." The architecture spec should preserve this distinction: RAWR owns the harness adapter shape; OpenShell governs its internal shell behavior.

---

## 9. Committed Position

The runtime realization spec is primarily a runtime-internal document that has been carefully scoped to avoid duplicating system-level architecture claims. It defines execution mechanics, plane models, artifact schemas, harness contracts, and enforcement laws that belong to the runtime pipeline. However, in multiple places it **necessarily asserts integration architecture** — the execution ownership law (§1), the harness boundary rules (§21), the platform chain and lifecycle phases (§1), the topology+builder classification model (§12.3), the WorkflowDispatcher integration pattern (§19), and the PortableRuntimePlanArtifact + RuntimeCatalog as control-plane interfaces (§15.7, §22.3) are all system-level integration claims that the canonical architecture spec must reflect at its level of abstraction. These are not boundary violations — they are inevitable given that the runtime spec must describe how it connects to external systems and companion subsystems.

Where the runtime spec risks overstepping its own scope, the risk is modest and well-managed: the harness specifications (§21) are detailed about vendor assignments (Elysia, Inngest, OCLIF, web host, OpenShell, desktop host) but appropriately defer native host internals. The execution ownership law (§1) names all external owners explicitly, which is valuable for integration clarity but means the runtime spec is asserting claims about oRPC's, Effect's, and Inngest's roles that the architecture spec should not contradict. The clearest integration claim that the architecture spec likely needs to adopt verbatim is the execution ownership law — it is the most compact and authoritative statement of how the platform integrates with its vendor ecosystem.

---

## Extracted Quotes

> "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe." (L37–L47)

This is the normative execution ownership split — the single most load-bearing integration statement in the spec. Any downstream document describing how RAWR integrates with its vendor ecosystem should treat this as gospel.

> "Runtime realization makes execution explicit without creating a second public semantic architecture. It owns the bridge from selected declarations to a running process. It does not own service domain authority, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors." (L10–L12)

This is the runtime spec's own scope boundary — what it claims to own vs explicitly not own.

> "Effect-backed is an execution posture. It does not create a second public ontology. There are no public architecture kinds named `EffectService`, `EffectPlugin`, `EffectApp`, `EffectWorkflow`, `EffectProvider`, `EffectResource`, `EffectWorkstream`, or `EffectReviewLoop`." (L156–L157)

Critical architectural principle preventing Effect-polluting the public ontology.

> "A cohosted development process and a split production process use the same semantic app and plugin definitions. Cohosting changes placement and resource sharing. It does not change species." (L154)

The cohosting/deployment model principle — affects how the architecture spec should describe multi-process deployment.

> "The plane model is not a new ontology. It is a reading map. It answers which kind of authority a noun exercises before implementation detail is considered." (L239–L240)

Clarifies that the plane model is analytical scaffolding, not additional semantic layers.

> "Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts are native interiors behind RAWR-shaped boundaries. They are not peer semantic owners." (L4967–L4969)

The vendor positioning statement — defines RAWR's relationship to all external frameworks and vendors.

> "RAWR stays scale-continuous because semantic identity and runtime placement remain separate. A capability does not change species when it changes process, machine, platform service, app boundary, repository boundary, harness, provider, or substrate." (L5257–L5259)

The architectural principle underlying scale-continuity — should appear in the architecture spec.

> "Agent governance remains a reserved boundary with locked integration hooks. Agent plugins do not move service domain authority or broad runtime access into agent-local semantics." (L4322–L4323)

Flags agent/OpenShell as intentionally incomplete — the architecture spec must not over-specify agent integration.
