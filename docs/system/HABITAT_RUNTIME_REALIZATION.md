# Habitat Runtime Realization Specification

Status: Canonical  
Scope: Runtime realization, selected authoring declarations, the public SDK facade, runtime derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning and process-local execution, process runtime binding, process execution, adapter lowering, harness mounting, diagnostics, telemetry, and deterministic finalization

Authority note: this specification supersedes older indexed runtime/effect
documents for runtime realization. Archived or quarantined documents that still
call themselves canonical are provenance only unless explicitly subordinated
and routed from this specification or `HABITAT_ARCHITECTURE.md`.

## 1. Purpose and scope

This specification defines the mechanics and artifacts that turn selected app
composition into one started, typed, observable, stoppable process per
`startApp(...)` invocation. It operates inside the ontology, source ownership,
lifecycle boundaries, and handoffs fixed by `HABITAT_ARCHITECTURE.md`.

Runtime realization makes execution explicit without creating a second public semantic architecture. It owns the bridge from selected declarations to a running process. It does not own service domain authority, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors.

### 1.1 Normative contracts and reference realization

Habitat is the platform and runtime substrate. `apps/habitat` is its
self-hosted, non-core platform realization, not the platform itself, a peer
downstream product, or the source of app law for downstream products. The
independent downstream Rawr repository provides a broad, diverse reference
product, but it is never the normative source of Habitat runtime law and its
source is not retained inside Habitat.

Normative sections define private runtime artifacts, mechanisms, ownership,
phase handoffs, and observable guarantees inside the architecture's canonical
boundaries. Rawr examples exercise those contracts as one
diverse downstream app; their domain names, plugin selection, placement, and
function bodies are illustrative unless their `Exactness` annotation says
otherwise. A `specification://` location is a semantic anchor, not a required
repository path.

The steady-state repository boundary mirrors runtime ownership: Habitat owns
the platform, SDK, CLI, self-host, and reusable platform capabilities; Rawr
owns its downstream product closure in an independent repository; Marketplace
owns curated agent-plugin content in a third repository. Rawr consumes ordinary
published Habitat interfaces. No source checkout, workspace path, or Git
synchronization relation is a runtime interface.

Consumer implementations are proto-evidence only. A candidate lift traces the
exact behavior oracle, maps it to a named Habitat owner and active task, freezes
only generic assertions, re-authors the substrate under Habitat and pinned
vendor law, proves and releases the Habitat artifact, migrates the consumer,
and then removes only the superseded prototype. Magic demonstrates that one
semantic app may lower into independently started processes, each with its
own process identity, resource leases, admission boundary, and stop. Its MCP
endpoint is a `server` surface hosted by one such process and an external
companion seam, not a Habitat role or kind. No native Habitat MCP adapter is
implemented or implied by that evidence.

Habitat blueprints enforce kind-identifying topology and source law. OpenSpec
change records track implementation and migration state. Neither implementation status
nor incidental organization inside a sealed component becomes runtime law by
appearing in a reference example.

File: `specification://runtime-realization/lifecycle.txt`  
Layer: runtime realization lifecycle  
Exactness: normative lifecycle order and phase ownership.

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

The broader platform chain is:

File: `specification://runtime-realization/platform-chain.txt`  
Layer: platform cohesion frame  
Exactness: normative semantic-to-runtime ordering.

```text
bind -> project -> compose -> realize -> observe
```

The execution ownership law is:

File: `specification://runtime-realization/execution-ownership-law.txt`  
Layer: execution ownership  
Exactness: normative grammar split. Canonical source of this law: `HABITAT_ARCHITECTURE.md`, §4.0. This section reproduces the law as runtime-realization context; arch-spec §4.0 is authoritative if the two diverge.

```text
Services own domain semantics and service procedure bodies.
Plugins own projection meaning and projection-local bodies.
Apps own product composition, selection, and entrypoints.
Habitat defines platform authoring law and owns execution law, grammar, runtime bridges, and handoffs.
oRPC owns callable contract mechanics.
Effect owns local execution mechanics.
Inngest owns durable async.
Native hosts own host interiors after Habitat adapter lowering.
The SDK exposes the public authoring and start facade.
Runtime schema adapts boundary schemas.
Runtime definition defines cold contracts.
Runtime derivation derives.
Runtime compiler compiles.
Bootgraph orders and records rollback and release metadata.
The Effect substrate acquires, releases, and rolls back.
Process runtime binds, lowers, and executes.
Harnesses mount native hosts and return stop handles.
Runtime observation projects non-authorizing read models.
Runtime mounting starts apps and coordinates cross-owner finalization.
```

Effect is the execution layer for Habitat-managed local execution. Non-oRPC
plugin callbacks, CLI commands, agent tools, desktop background logic,
web-local application execution, resource operations, provider
acquisition/release, process-local coordination resources, and async step-local
execution retain their nearest application, plugin, resource, or provider owner
while using Habitat-defined authoring surfaces and Habitat-managed runtime
bridges.

Effect-backed oRPC operations follow the native vendor boundary instead.
Authors use native `.handler(...)` for synchronous and Promise-returning
operations and the official `.effect(...)` extension for Effect-backed
operations. The implementation owner installs that extension once in the same
physical oRPC module realm. Its internal `handlerGen(...)` mechanism owns the
request fiber, native `effect/context`, native `effect/wrap`, request signal,
Cause mapping, and Promise boundary; `handlerGen(...)` is not an authoring
choice or operation-leaf import. The application/process owns Effect Context
construction, resource lifetime, policy, telemetry, and shutdown through those
native hooks. A manual `Effect.run*`, a custom runner, a Habitat imitation, or
`ProcessExecutionRuntime` MUST NOT execute an oRPC Effect.

There is one Habitat execution terminal for non-oRPC descriptor lanes. The
official oRPC bridge is a native vendor boundary, not a second Habitat terminal:

File: `specification://runtime-realization/single-execution-terminal.txt`  
Layer: execution terminal law  
Exactness: normative.

```text
One authoring interface.
One Habitat execution terminal.
One owner for each source, artifact, and lifecycle state.
```

The non-oRPC plugin executable boundary spine is:

File: `specification://runtime-realization/service-plugin-execution-spine.txt`  
Layer: runtime execution spine  
Exactness: normative handoff sequence for non-oRPC executable boundaries.

```text
non-oRPC plugin executable authoring
  -> EffectExecutionDescriptor
  -> runtime-derivation private NormalizedRuntimeTopology
  -> complete NormalizedAuthoringGraph + ExecutionDescriptorRef/table
  -> runtime compiler
  -> CompiledExecutionPlan
  -> ExecutionRegistry
  -> ProcessExecutionRuntime
  -> EffectRuntimeAccess
  -> ManagedRuntimeHandle
  -> result / exit / diagnostics / telemetry / finalization
```

The native Effect-oRPC spine is:

File: `specification://runtime-realization/native-effect-orpc-spine.txt`  
Layer: native oRPC execution spine  
Exactness: normative for the selected bridge and ownership handoff.

```text
native oRPC operation
  -> .handler(...) for sync/Promise or .effect(function* ...) for Effect
  -> application/process-owned effect/context
  -> application/process-owned effect/wrap
  -> official extension delegates to vendor-internal handlerGen
  -> Effect.runPromiseExit(effect, { signal: requestSignal })
  -> official Cause mapping
  -> Promise returned to native oRPC
```

The provider spine is:

File: `specification://runtime-realization/provider-effect-spine.txt`  
Layer: runtime provider acquisition spine  
Exactness: normative provider handoff sequence.

```text
RuntimeResource
  -> RuntimeProvider.build(...)
  -> ProviderEffectPlan
  -> runtime compiler provider plan

compiled provider identity/dependency facts
  -> BootgraphInput
  -> bootgraph order/rollback metadata

compiled provider plan + bootgraph metadata
  -> runtime-substrate-effect provider lowering
  -> Effect-backed acquisition/release/rollback
  -> ProvisionedProcess
```

The resource operation spine is:

File: `specification://runtime-realization/resource-operation-spine.txt`  
Layer: runtime resource operation spine  
Exactness: normative relation between provisioned resource values and enclosing execution boundaries.

```text
provisioned RuntimeResource value
  -> HabitatEffect-returning operation
  -> composed inside an enclosing EffectExecutionDescriptor or ProviderEffectPlan
  -> executed by the enclosing boundary's runtime path
```

When a `HabitatEffect`-returning resource operation is composed inside a
non-oRPC plugin, CLI command, agent tool, desktop background body, web-local
execution body, or async step-local body, it executes as part of the enclosing
`EffectExecutionDescriptor` through `ProcessExecutionRuntime`. A resource
operation used by an Effect-backed oRPC handler is a native Effect value and
executes through the official bridge instead.

When a `HabitatEffect`-returning resource operation is composed inside provider acquisition or release, it executes as part of the enclosing `ProviderEffectPlan` through `runtime-substrate-effect` provider lowering under bootgraph order metadata, not through `CompiledExecutionPlan` or `ProcessExecutionRuntime`.

Resource operations are not compiled into `CompiledExecutionPlan` merely because they return `HabitatEffect`.

The durable async spine remains separate:

File: `specification://runtime-realization/durable-async-spine.txt`  
Layer: durable async handoff  
Exactness: normative async ownership split.

```text
WorkflowDefinition / ScheduleDefinition / ConsumerDefinition
  -> runtime-derivation normalized async surface plan
  -> runtime compiled async surface plan
  -> async SurfaceAdapter
  -> private FunctionBundle registration factory
  -> Inngest harness
```

Effect may appear inside durable async steps only as local execution. Inngest remains the durable owner of workflow run identity, retry, replay, history, schedules, durable queues, and durable async semantics.

The web route-module channel is distinct from Effect execution:

File: `specification://runtime-realization/web-route-module-spine.txt`  
Layer: native web module-loading handoff  
Exactness: normative separation from the Effect descriptor spine.

```text
cold WebRouteProjection.module loader
  -> WebRouteModuleRef + non-portable WebRouteModuleTable
  -> compiled web surface plan
  -> web surface adapter / selected web host
  -> native module loading
```

The loader is never an `EffectExecutionDescriptor`, never enters
`ExecutionDescriptorTable` or `ExecutionRegistry`, and is never copied into a
portable runtime plan.

Native hosts may require Promise-compatible callbacks. Non-oRPC callbacks are
generated by runtime-process-runtime adapter lowering, owned by a harness, or
exposed through an SDK delegating hook that calls `ProcessExecutionRuntime`.
Effect-backed oRPC callbacks return the Promise produced by official
`.effect(...)` bridge mechanics; adapters do not wrap that Promise in another
Effect runner.
Neither form takes semantic ownership of the application-authored body.

Shutdown, rollback, provider release, harness stop order, finalizers, managed runtime disposal, and final catalog records are deterministic runtime finalization and observation behavior. They are not an eighth lifecycle phase.

## 2. Fixed outcome

Each `startApp(...)` invocation produces exactly one started process runtime assembly.

| Runtime result | Owner | Meaning |
| --- | --- | --- |
| One `ManagedRuntime` | Runtime substrate / Effect provisioning and execution kernel | Owns its internal root/layer scopes, the built resource Context, process-local `HabitatEffect` execution, coordination, and disposal |
| One process execution runtime | Runtime / process runtime | Executes non-oRPC Effect descriptors through the process-owned runtime bridge; never oRPC service Effects |
| One execution registry | Runtime / process runtime | Pairs compiled execution plans with their matching descriptors for adapter invocation |
| One process runtime assembly | Runtime / process runtime | Bound services, role access, mount-ready surface records, adapter lowering, and its own stop handle |
| Zero or more mounted roles | App-selected process shape | Selected role slices from the app composition |
| Zero or more mounted surfaces | Process runtime and harnesses | Runtime-ready surface payloads mounted into native hosts |
| One runtime catalog stream or record set | Runtime observation | Redacted projection of selected, derived, compiled, provisioned, bound, projected, executed, mounted, observed, and stopped runtime state |
| One deterministic finalization path | Runtime mounting | Reverse-order harness stop followed by the process-runtime stop handle, which releases assembled state and the provisioned substrate; runtime observation independently projects admitted finalization records |

A cohosted development process and a split production process use the same semantic app and plugin definitions. Cohosting changes placement and resource sharing. It does not change species.

Effect-backed is an execution posture. It does not create a second public ontology. There are no public architecture kinds named `EffectService`, `EffectPlugin`, `EffectApp`, `EffectWorkflow`, `EffectProvider`, `EffectResource`, `EffectWorkstream`, or `EffectReviewLoop`.

A runtime that executes owner-authored non-oRPC descriptor, resource, or provider
bodies as ordinary Promise-only business callbacks instead of through the
Habitat-managed Effect bridge is not compliant. Native synchronous or
Promise-returning oRPC `.handler(...)` operations remain valid, and Effect-backed
oRPC operations use the official bridge. Runtime management does not transfer
body ownership away from the nearest semantic owner.

## 3. Owners And Lifecycle Boundaries

Runtime realization is stable only when every source, artifact, and live
lifecycle state has exactly one owner and each layer knows its boundary. There
is exactly one `RuntimeCatalog` read model, projected by runtime observation;
it is not a second source of runtime truth.

The compact ownership law is:

File: `specification://runtime-realization/compact-ownership-law.txt`  
Layer: ownership law  
Exactness: normative.

```text
Domain services own definitions, behavior, and state transitions.
Plugins expose capabilities through runtime surfaces.
Apps select product composition.
Resources declare host capabilities.
Providers implement host capabilities.
Habitat defines authoring/runtime law and owns execution bridges and handoffs.
The SDK exposes authoring and start contracts.
Runtime derivation derives facts.
The compiler plans processes.
Bootgraph orders lifecycle.
The Effect kernel runs local execution.
The process runtime assembles processes.
The registry matches execution.
The execution runtime runs invocations.
Adapters translate surfaces.
Harnesses mount hosts.
Runtime mounting coordinates start, harness mounting, and shutdown.
Runtime observation projects non-authorizing read models.
Diagnostics are topology projections.
```

Dependency graphs and topology constraints are compiler-owned validation
artifacts. They confer no source, semantic, composition, or lifecycle ownership.

### 3.1 Ownership and lifecycle model

File: `specification://runtime-realization/ownership-lifecycle-model.txt`  
Layer: ownership and lifecycle model  
Exactness: normative classification of load-bearing nouns.

```text
Source-definition owners:
  Service
  Plugin
  App
  Resource
  Provider

Selection records:
  RuntimeProfile
  ProviderSelection
  ResourceRequirement
  Entrypoint

Public facade:
  SDK facade

Derived and compiled artifacts:
  Runtime derivation
  Runtime compiler

Provisioned and mounted state:
  Bootgraph
  Effect provisioning/execution kernel
  Process runtime
  Execution registry
  Process execution runtime
  EffectRuntimeAccess

Runtime integration artifacts:
  Surface adapter
  Harness

Observation records and read models:
  Diagnostics
  RuntimeCatalog
  RuntimeTelemetry

Durable async integration artifacts:
  WorkflowDispatcher
  FunctionBundle

Classification fields:
  Role
  Surface
  Capability
```

This model is a reading map, not another ontology or owner. It identifies the
owner, record, artifact, state, or classification role of each noun before
implementation detail is considered.

File: `specification://runtime-realization/ownership-lifecycle-diagram.mmd`  
Layer: ownership and lifecycle diagram  
Exactness: illustrative diagram; normative direction of ownership handoff.

```mermaid
flowchart TB
  subgraph A[Source-definition owners]
    Service[Service\nDomain authority]
    Plugin[Plugin\nProjection authority]
    App[App\nProduct composition]
    Resource[Resource\nRuntime contract]
    Provider[Provider\nRuntime implementation]
  end

  subgraph B[Derived and compiled artifacts]
    SDK[SDK facade\nExposes authoring and start]
    Derivation[Runtime derivation\nDerives facts]
    Compiler[Runtime compiler\nPlans processes]
  end

  subgraph C[Provisioned and process state]
    Bootgraph[Bootgraph\nOrders lifecycle]
    Kernel[Effect kernel\nRuns local execution]
    Runtime[Process runtime\nAssembles process]
    Registry[Execution registry\nMatches execution]
    Exec[Execution runtime\nRuns invocations]
  end

  subgraph D[Runtime integration]
    Adapter[Surface adapter\nTranslates surfaces]
    Mounting[Runtime mounting\nStarts, mounts, stops]
    Harness[Harness\nMounts hosts]
  end

  subgraph E[Observation read models]
    Observation[Runtime observation\nProjects read models]
    Diagnostics[Diagnostics\nObserve]
    Catalog[Catalog\nRecords state]
    Telemetry[Telemetry\nCorrelates runtime]
  end

  App --> SDK
  Service --> SDK
  Plugin --> SDK
  Resource --> SDK
  Provider --> SDK
  SDK --> Derivation
  Derivation --> Compiler
  Compiler --> Bootgraph
  Compiler -->|compiled provider plans| Kernel
  Bootgraph -->|order + rollback metadata| Kernel
  Kernel --> Runtime
  Runtime --> Registry
  Runtime --> Adapter
  Registry -. resolved by .-> Adapter
  Runtime --> Exec
  Runtime -->|mount-ready records + stop| Mounting
  Adapter -->|lowered payloads| Mounting
  Mounting --> Harness
  Harness -->|NativeHarnessHandle| Mounting
  Exec -->|owner-local observations| Observation
  Mounting -->|lifecycle observations| Observation
  Observation --> Telemetry
  Observation --> Catalog
  Observation --> Diagnostics
```

### 3.2 Ownership definitions

Habitat authority in this document is platform authority: authoring grammar,
runtime bridge mechanics, lifecycle handoffs, foundational SDK/CLI tooling, and
enforcement. It does not supersede the nearest semantic or executable owner.
Services retain domain meaning and procedure bodies, plugins retain projection
meaning and projection-local bodies, apps retain product composition and
entrypoints, and resource/provider packages retain contracts and implementation
bodies.

A service is a domain capability boundary. It owns the domain contracts, invariants, schemas, migrations, repositories, domain policy, and authoritative write access for the domain state it governs. It may declare dependencies on runtime resources, sibling services, semantic adapters, config, scope, and invocation context. Those dependencies may have runtime lifecycle, but the service does not provision or release them. The runtime binds and provisions them from app-selected providers and compiled plans. It does not own public API projection, internal API projection, workflow execution, command projection, web projection, agent projection, desktop projection, app membership, provider selection, process placement, harness mounting, raw Effect runtime construction, or custom Effect-oRPC runner wiring. Its operation leaves use native `.handler(...)` for synchronous or Promise work and the implementation-owned official `.effect(...)` extension for Effect work. A domain service is never an Effect Context service or `Layer` node.

A plugin is a lane projection boundary. It projects underlying capabilities into exactly one role/surface/capability lane. The underlying capability may be service-owned domain capability, workflow dispatch capability, host/native capability, agent/shell capability, desktop capability, web/client capability, or another runtime-authorized capability. A plugin owns the lane-native contract, caller shape, boundary policy, authentication/authorization/redaction/transformation, service/resource use declarations, executable boundary, and native mount facts for that lane. It does not own the underlying domain authority, provider implementation, app membership, provider selection, runtime acquisition, or native host runtime.

An app is a product composition boundary. It owns app identity, selected plugin projections, runtime profiles, provider selections, config source selection, entrypoints, process role shapes, publication artifacts, and product-level composition defaults. It composes by selection. It does not acquire resources or run effects. It does not own service domain authority, plugin projection meaning, resource contracts, provider implementation, runtime acquisition, local execution, harness behavior, or deployment placement.

A resource is a runtime capability contract. It declares the identity, value shape, lifetime requirements, and diagnostic-safe snapshot rules for a provisionable runtime capability. Its package owns a closed provider family: the package root exposes the provider-neutral resource contract, and each nested provider has its own direct public face. Each provider owns its config. A resource may expose effectful operations on provisioned values, including operations that return `HabitatEffect`. It does not implement itself, select a provider, own domain authority, acquire runtime values, or become app composition.

A provider is a runtime capability implementation plan. It implements a resource contract through provider-local config, native client construction, acquisition, release, health, refresh, dependency requirements, telemetry, and diagnostics. It returns `ProviderEffectPlan` through `providerFx` and remains cold until provisioning. It does not select itself, redefine resource identity, own domain authority, compose app membership, or construct a local managed runtime.

The SDK is the public authoring and start facade. It re-exports import-safe contracts implemented by `runtime-definition`, supplies type-level inference, exposes delegating hooks backed by `runtime-process-runtime`, exposes observation read facades backed by `runtime-observation`, and exposes the terminal operation backed by `runtime-mounting`. The SDK does not implement cold definitions, derivation, raw Effect lowering, runtime adapter lowering, live start coordination, observation projection, resource acquisition, provider execution, managed-runtime construction, service binding, harness mounting, `HabitatEffect` execution, or domain/projection/app meaning. No private runtime owner imports the SDK facade.

The private `runtime-derivation` owner is the derivation boundary. Its
foundational handoff is one `NormalizedRuntimeTopology`: an exact immutable
copy of `RuntimeLaunchIdentity`, the selected `profileId`, deterministically
sorted plugin identities, role, surface, and resource requirements, and only
`app.plugin`, `plugin.resource`, `service.service`, `service.resource`, and
`service.semantic` edges. It refuses duplicate plugin identities, process-role
literals, surface full tuples, or full edge tuples and cycles in the
`service.service` graph. Shared resource demand across distinct plugin
identities is admitted and projects to one sorted resource-requirement
identity.

Complete derivation incorporates that topology into `NormalizedAuthoringGraph`
and derives provider selections, normalized service uses, service binding
plans, surface runtime plans, workflow dispatcher descriptors, Effect
descriptor refs and their non-portable table, distinct web route-module refs
and their non-portable table, owner-local findings, and the portable plan
artifact. Those complete-derivation contracts are exposed through
`@habitat-ai/sdk/runtime/derivation` and consumed by the runtime compiler or the
specific in-process consumers named in §15. The SDK uses authoring declarations
for static inference only; it does not become a second derivation owner.

The runtime compiler is the planning boundary. It consumes the normalized authoring graph plus selected app, entrypoint, profile, environment, descriptor table reference, and harness facts, then emits one compiled process plan. It owns provider coverage validation, provider dependency closure, service closure, topology/builder agreement, execution boundary policy validation, compiled service/surface/dispatcher/execution/provider plans, provider dependency graph, ordering-only bootgraph input, execution registry input, an owner-local observation seed, and compilation findings. It does not acquire resources, bind live services, execute `HabitatEffect`, mount harnesses, mutate app membership, or import observation-owned projection types.

Bootgraph is the lifecycle ordering boundary. It consumes only compiler-owned provider/resource identity and dependency input and emits deterministic acquisition order, rollback order, and reverse release metadata. It owns ordering and dedupe, not execution: it does not consume `ProviderEffectPlan`, acquire or release providers, execute rollback, register live finalizers, assemble process/role resource contexts, or produce `ProvisionedProcess`.

The Effect provisioning/execution kernel is the process-local execution substrate. It owns exactly one process `ManagedRuntime`, one `Layer.effectContext(...)` provider-lifecycle adapter, raw Effect lowering for non-oRPC descriptor lanes, scoped acquisition/release/rollback mechanics, process-local coordination primitives, interruption, timeout, retry mechanics, and `HabitatEffect` execution under runtime-owned policy. It consumes compiler-owned provider plans plus bootgraph order/rollback metadata. The adapter executes those plans in bootgraph order and returns the resource Context; provisioning forces the lazy managed runtime's `context()` before it becomes the sole producer of `ProvisionedProcess`. It does not create a second root `Scope` or managed runtime, execute Effect-backed oRPC operations, import the SDK or observation-owned projection types, or own service domain authority, plugin projection, app selection, provider selection, durable async, native host semantics, or public authoring grammar.

The process runtime is the live process assembly boundary. It turns a compiled process plan, non-portable execution descriptor table, and `ProvisionedProcess` into bound service clients, role/surface runtime access, workflow dispatchers, execution registry, process execution runtime, `EffectRuntimeAccess`, mount-ready surface records, adapter-lowered payloads, owner-local findings, and a process-runtime-owned stop handle. It owns service binding, binding cache, invocation-bound client views, execution registry and execution runtime assembly, workflow dispatcher materialization, plugin projection, and runtime adapter lowering. It does not invoke harnesses, collect `StartedHarness`, project observation-owned types, coordinate cross-owner shutdown, or own service/domain/plugin/app/provider/native-host meaning.

The execution registry is the executable-boundary matching boundary. It pairs each compiled execution plan with exactly one matching Effect execution descriptor before adapter invocation. It owns execution identity matching, descriptor/plan boundary agreement, duplicate/missing executable detection, and lookup of matched executable boundaries for adapters. It does not execute `HabitatEffect`, lower Effect, own execution policy, create descriptors, compile plans, or contain business logic.

The process execution runtime is the invocation execution boundary for non-oRPC
descriptor lanes. It receives a matched executable boundary plus an explicit
procedure execution context, resolves error and telemetry bridges, invokes the
Effect descriptor, receives `HabitatEffect`, runs it through
`EffectRuntimeAccess`, applies execution policy, and returns a host-compatible
result or structured exit. It MUST NOT execute an Effect-backed oRPC operation;
the official `.effect(...)` bridge owns that native boundary. It does not own the
service/plugin/resource/provider body being executed, bind services, acquire
providers, mount harnesses, choose apps, project plugins, own domain authority,
or run native host logic.

A surface adapter is the native-payload translation boundary. It lowers
compiled surface plans into harness-facing native payloads and callbacks. For
non-oRPC descriptor lanes it resolves executable boundaries through the
execution registry and produces host-compatible closures that delegate to
`ProcessExecutionRuntime`. For native oRPC it preserves the procedure and
application/process-owned `effect/context` and `effect/wrap` so the official
`.effect(...)` bridge remains the executor. It owns translation from Habitat
compiled surface shape into native host payload shape. It does not execute
business logic, run `HabitatEffect`, construct managed runtimes, acquire
providers, consume raw authoring declarations, consume normalized authoring
graphs directly, or own native host lifecycle.

A harness is the native host mounting boundary. Runtime mounting invokes it with
`HarnessMountInput` containing adapter-lowered payloads and bounded process
access; it mounts them into a native host such as Elysia, Inngest, OCLIF, web,
agent/OpenShell, or desktop and returns a `NativeHarnessHandle`. It owns native
host lifecycle after Habitat lowering. It does not create `StartedHarness`,
consume normalized authoring graphs or compile plans, acquire providers, bind
services, lower `HabitatEffect`, import observation-owned projection types, own
service/plugin/app meaning, or create managed runtimes.

Runtime mounting is the downstream live lifecycle boundary. It implements
`startApp(...)`, invokes harnesses, creates private `StartedHarness` wrappers
only after successful native mount, and coordinates reverse-order native-handle
shutdown before the process-runtime stop handle. It adapts admitted owner-local
findings into `RuntimeObservationRecord` values and publishes those lifecycle
records through the definition-owned observation boundary. It does not project
observation read models, compose app membership, acquire providers, bind
services, lower adapters, or own native host interiors.

Runtime observation is the downstream, non-authorizing projection boundary. It implements the definition-owned observation port and alone projects admitted `RuntimeObservationRecord` values into `RuntimeDiagnostic`, `RuntimeTelemetry`, `RuntimeTopologyRecord`, and `RuntimeCatalog`. It does not consume unadapted owner-local findings, implement `startApp(...)`, invoke or stop harnesses, coordinate finalization, mutate upstream runtime state, acquire live values, select providers, expose secrets, or become a control plane by itself.

`RuntimeCatalog` is the one runtime diagnostic read model. It records process identity, app identity, selected roles, derived authoring facts, resources, providers, provider dependency graph, service attachments, workflow dispatchers, execution plans, execution registry, surfaces, harnesses, lifecycle status, diagnostics, topology records, execution records, startup records, and finalization records. It is not live access, not a manifest, not app composition, not provider selection, and not mutable runtime authority.

`RuntimeTelemetry` is the correlation boundary for runtime spans, events, and annotations. It carries process, provisioning, binding, execution, adapter, harness, and finalization correlation across runtime realization. It does not own product analytics, service semantic events, app selection, service domain authority, or provider selection.

`WorkflowDispatcher` is the durable-async event-admission boundary. It is materialized by the process runtime from selected workflow definitions and the provisioned async provider. It lets server API/internal projections send selected workflow events and returns event/admission identity, never run identity. Status and cancellation by run identity require a separately selected control capability. The dispatcher does not own workflow definitions, durable workflow semantics, product API meaning, service domain authority, native Inngest functions, provider acquisition, or projection classification.

`FunctionBundle` is the private async harness-facing registration factory. It
captures selected workflow, schedule, and consumer registration plans without
capturing a native client. The Inngest harness materializes it with exactly the
native client supplied to the selected Serve or Connect harness.
`WorkflowDispatcher` is a separate named consumer and process-runtime
materialization; it is not part of `FunctionBundle` materialization. The bundle
owns no product API meaning, workflow semantics, live dispatcher authority, or
app selection.

An entrypoint is a selected process-start boundary. It chooses one app, one runtime profile, one entrypoint id, and one role set for a single `startApp(...)` invocation. It owns process-start selection facts. It does not redefine app membership, service domain authority, plugin projection, provider implementation, execution grammar, harness internals, or deployment placement.

A runtime profile is an app-owned runtime selection boundary. It selects provider implementations, config sources, process defaults, and environment-shaped wiring for an app. It does not acquire resources, construct providers, execute `HabitatEffect`, mount harnesses, own service domain authority, or become deployment placement.

`ProviderSelection` is the app/profile-owned binding between a runtime capability contract and a provider implementation for a lifetime, role, and optional instance. It is selection data, not acquisition. It does not construct the provider, validate live config by itself, acquire resources, or become provider implementation.

`ResourceRequirement` is a demand declaration for a runtime capability contract. It states that a service, plugin, provider, harness, or runtime plan needs a resource at a lifetime, role, optionality, and instance. It is not provider selection, not acquisition, and not live access.

A role is a selected process responsibility slice, such as server, async, web, agent, CLI, or desktop. A surface is a lane-specific projection target within a role, such as server API, server internal, workflow, schedule, command, tool, window, menubar, or background. A plugin capability is the named projection capability within one role/surface lane. It is not automatically the same thing as a service domain capability or a runtime resource capability.

Short law:

File: `specification://runtime-realization/lane-classification-law.txt`  
Layer: role/surface/capability classification  
Exactness: normative.

```text
Roles slice processes.
Surfaces target lanes.
Capabilities name projections.
```

### 3.3 Ownership matrix

| Layer | Owns | Does not own |
| --- | --- | --- |
| Habitat platform | Authoring and runtime law, foundational SDK/CLI tooling, execution law and grammar, runtime bridges, lifecycle handoffs, generic reusable platform resources/providers, self-hosted Habitat commands/topics | Downstream app composition, service/domain semantics, plugin projection meaning, owner-authored executable bodies |
| Services | Domain contracts, invariants, schemas, repositories, migrations, domain policy, stable service config, service-to-service dependency declarations, authoritative write access, native oRPC operation implementation through handler or official Effect bridge | Public API projection, app membership, provider selection, harness mounting, process placement, raw Effect runtime construction, custom Effect-oRPC runners |
| Plugins | One role/surface/capability projection, topology-implied caller classification, native builder facts, lane-native contract, boundary policy, service-use declarations, resource-use declarations, projection-local Effect execution bodies | Service domain authority, provider acquisition, app selection, projection reclassification, raw Effect runtime construction, custom Effect-oRPC runners |
| Apps | Product identity, selected projections, runtime profiles, provider selections, config source selection, entrypoints, process role shapes, process defaults, selected publication artifacts | Service domain authority, plugin species, provider implementation, runtime acquisition, `HabitatEffect` execution, managed runtime construction |
| Resources | Runtime capability contract, consumed value shape, lifetime requirement, public resource identity, closed provider family with direct contract/provider public faces, diagnostic-safe snapshot contribution rules, `HabitatEffect`-returning value operations where effectful | Provider implementation, domain authority, app selection, raw Effect runtime construction |
| Providers | Runtime capability implementation plan, acquisition/release plan, native client construction, health, refresh, provider-local config schema and redaction metadata, telemetry, diagnostics | Resource identity, app selection, service domain authority, raw managed runtime construction |
| Runtime schema | TypeBox/Standard Schema adaptation and canonical boundary validation mechanics | Semantic schema ownership, domain policy, derivation, acquisition, execution, mounting |
| Runtime definition | Cold `HabitatEffect`, execution-policy, app/profile/entrypoint, service, plugin, resource, provider, execution-descriptor, observation-record, and observation-port contracts | Live start coordination, derivation, acquisition, execution, mounting, service/plugin/app meaning |
| Runtime derivation | Foundational `NormalizedRuntimeTopology`; complete `NormalizedAuthoringGraph`; normalized provider, service-binding, surface, and workflow artifacts; Effect refs/table; distinct web route-module refs/table; exact-field portable plan artifact | Resource acquisition, provider execution, managed runtime construction, harness mounting, service/plugin/app meaning, web-loader execution, deployment placement policy |
| SDK facade | Public re-exports of definition-owned authoring contracts, type inference, delegating runtime hooks, observation read facades, and the mounting-backed start terminal | Private definition/derivation implementation, raw Effect lowering, runtime adapter lowering, observation projection, resource acquisition, provider execution, managed runtime construction, harness mounting, service/plugin/app meaning |
| Runtime compiler | Compiled process plan, provider coverage validation, provider dependency graph, service closure, topology agreement, compiled service/surface/dispatcher/execution/harness plans, registry input | Live resource acquisition, live service binding, harness mounting, app membership mutation |
| Bootgraph | Lifecycle identity, dependency ordering, dedupe, acquisition/release order, and rollback metadata | Provider-plan consumption or execution, acquisition, release, live rollback, finalizer registration, `ProvisionedProcess`, service/app/plugin/native-host authority |
| Effect kernel | Single process managed runtime, raw Effect lowering, provider plan execution, process-local coordination, acquisition/release/rollback, interruption, timeout, retry, `HabitatEffect` execution under runtime-owned bridges, sole production of `ProvisionedProcess` | Service domain authority, plugin projection, app selection, provider selection, durable async, native host semantics |
| Process runtime | Runtime access scoping, service binding, binding cache, invocation-bound client views, workflow dispatcher materialization, execution registry and `EffectRuntimeAccess` assembly, plugin projection, runtime adapter lowering, mount-ready records, owner-local findings, process-runtime stop handle | Harness invocation, `StartedHarness` collection, topology projection, cross-owner shutdown, service/public API/app/provider/durable-workflow authority |
| Execution registry | Matching compiled execution plans to Effect descriptors, identity/boundary agreement, executable boundary lookup | `HabitatEffect` execution, Effect lowering, plan compilation, descriptor construction, business logic |
| Process execution runtime | Invocation-time execution through `EffectRuntimeAccess`, bridge resolution, policy application, result/exit mapping for non-oRPC descriptor lanes | oRPC Effect execution, service binding, provider acquisition, harness mounting, app selection, plugin projection, domain authority |
| Surface adapters | Lowering compiled surface plans to host payloads, resolving executable boundaries through registry, producing native callbacks | Business logic, `HabitatEffect` execution, managed runtime construction, provider acquisition, raw authoring consumption |
| Harnesses | Native host mounting and native lifecycle after adapter lowering, `HarnessMountInput`, `NativeHarnessHandle`, owner-local reports and idempotent stop | `StartedHarness` creation, normalized-authoring-graph consumption, runtime compilation, provider acquisition, topology projection, service domain authority, `HabitatEffect` lowering, managed runtime construction |
| Runtime mounting | Live `startApp(...)` coordination, harness invocation, private `StartedHarness` creation/collection, reverse-order native-handle stop, and cross-owner finalization | Observation projection, composition authority, provider acquisition, service binding, adapter lowering, native host interiors |
| Runtime observation | Definition-port implementation and non-authorizing projection of diagnostics, telemetry, topology records, catalog views, and finalization records | Live start, harness invocation or stop, cross-owner finalization, composition authority, acquisition, binding, adapter lowering |

Shared infrastructure does not transfer schema ownership, write authority, service domain authority, resource identity, plugin identity, or app membership. Multiple services may share a process, machine, database instance, connection pool, telemetry installation, cache infrastructure, or host runtime. That sharing is infrastructure. It is not shared domain authority.

Habitat defines boundary grammar and owns runtime handoff mechanics. The
service, plugin, app, resource, or provider at each boundary retains semantic
and executable-body authority. Native framework interiors own native execution
semantics after Habitat hands them runtime-realized payloads.

## 4. Canonical topology and package authority

The physical topology is locked as a kind grammar. It applies in two distinct
source-ownership regions and does not turn every conforming component into Habitat
platform source:

```text
Habitat platform source
  packages/core/**
  resources/<generic-reusable-capability>/**
  services/<platform-capability>/**
  plugins/cli/topics/<habitat-self-host-topic>/**
  apps/habitat/**

downstream product source
  packages/<application-support>/**
  resources/<application-specific-capability>/**
  services/<application-domain>/**
  plugins/<application-projection>/**
  apps/<downstream-app>/**
```

`apps/habitat` is Habitat's self-hosted, non-core app realization and the source
app for the foundational CLI distribution; it is not a peer downstream
product. Rawr is a reference product in its independent downstream repository
and remains downstream product source. A canonical root defines a component kind, allowed dependencies, and
runtime handoff. It does not transfer downstream semantic, projection,
composition, package implementation, or executable-body ownership to Habitat.

File: `specification://runtime-realization/canonical-topology.txt`  
Layer: repository topology  
Exactness: normative for roots, package authority, and ownership placement.

```text
packages/
  core/
    sdk/                         # publishes @habitat-ai/sdk
    runtime/                     # private package-less runtime owners
      schema/
      definition/
      derivation/
      compiler/
      bootgraph/
      substrate/
        effect/
      process-runtime/
      harnesses/
        elysia/
        inngest/
        web/
        agent/
        desktop/
      observation/
      mounting/

resources/
  <capability>/                  # resource package
    <contract-face>              # provider-neutral public face
    providers/
      <provider>/
        <provider-face>          # direct provider public face

services/
  <service>/                     # domain capability boundary

plugins/
  server/
    api/
      <capability>/              # public server API projection
    internal/
      <capability>/              # trusted first-party/internal server API projection
  async/
    workflows/
      <capability>/              # durable workflow projection
    schedules/
      <capability>/              # durable scheduled projection
    consumers/
      <capability>/              # durable consumer projection
  cli/
    topics/
      <topic>/                   # selected Oclif plugin projection
        commands/                # native command contributions
  web/
    app/
      <capability>/              # web app projection
  agent/
    channels/
      <capability>/              # agent channel projection
    shell/
      <capability>/              # OpenShell projection
    tools/
      <capability>/              # agent tool projection
  desktop/
    menubar/
      <capability>/              # desktop menubar projection
    windows/
      <capability>/              # desktop window projection
    background/
      <capability>/              # desktop background projection

apps/
  <app>/
    <app>.app.ts                 # app composition
    <entrypoint>.ts              # mount or process-role entrypoint
    runtime/
      profiles/
      <app-runtime-modules>
```

Platform machinery lives under `packages/core/*`. Authored provisionable capability contracts live under `resources/*`. In both source-ownership regions, the nearest resource/provider, service, plugin, or app remains the source and meaning owner.

The public SDK is published as `@habitat-ai/sdk` from `packages/core/sdk`.
Each immediate capability root shown beneath `packages/core/runtime` is a
private, package-less Nx owner; `substrate/effect` is the one Effect-substrate
owner and `harnesses` is the one harness-family owner. These roots have no
registry identity or release membership. `schema`, `definition`, and
`derivation` own the upstream implementations required by later phases. No
private runtime owner imports the terminal public SDK facade. The SDK assembles
their reachable outputs and exposes only the public families below, so the
build graph remains acyclic while consumers install one package.

The closed private implementation graph is:

| Private owner | Responsibility | Direct private dependencies |
| --- | --- | --- |
| `runtime-schema` | TypeBox/Standard Schema adaptation only | none |
| `runtime-definition` | cold `HabitatEffect`, policy, authoring, descriptor, observation-record, and observation-port contracts | `runtime-schema` |
| `runtime-derivation` | foundational normalized topology, then complete authoring-graph and plan derivation | `runtime-schema`, `runtime-definition` |
| `runtime-compiler` | complete process-plan admission and compilation | `runtime-definition`, `runtime-derivation` |
| `runtime-bootgraph` | provider/resource order, identity, dedupe, and rollback order | `runtime-compiler` |
| `runtime-substrate-effect` | one Effect scope, acquisition, registration, and release | `runtime-definition`, `runtime-compiler`, `runtime-bootgraph` |
| `runtime-process-runtime` | service binding, execution, `EffectRuntimeAccess`, adapter lowering, mount-ready records, and its stop handle | `runtime-derivation`, `runtime-compiler`, `runtime-substrate-effect` |
| `runtime-harnesses` | generic harness contract and non-CLI native harness realizations | `runtime-definition`, `runtime-compiler`, `runtime-process-runtime` |
| `runtime-observation` | definition-port implementation and non-authorizing diagnostic, telemetry, topology-record, and catalog projection | `runtime-definition` |
| `runtime-mounting` | live `startApp(...)`, harness invocation, `StartedHarness` collection, reverse stop, and cross-owner finalization | `runtime-definition`, `runtime-process-runtime`, `runtime-harnesses` |

Dependency direction is consumer to dependency, and no other private edge is
admitted. `runtime-definition` remains cold: it does not implement
`startApp(...)`. `runtime-observation` implements the definition-owned
observation port without controlling lifecycle. `runtime-mounting` implements
the live terminal and publishes through a definition-owned observation port
supplied by the SDK composition root; it does not import `runtime-observation`.
The terminal SDK wires the observation implementation into mounting and exposes
all observation reads through facade modules.
The foundational Oclif loader and harness are an explicit carve-out implemented
and distributed by `@habitat-ai/cli`. Oclif lowering remains in
`runtime-process-runtime`, so neither the CLI package nor `runtime-harnesses`
creates a second adapter.

The normative public SDK facade module layout is:

File: `specification://runtime-realization/sdk-facade-module-layout.txt`  
Layer: public SDK facade module layout  
Exactness: normative for public module families and for keeping native adapters
inside `runtime-process-runtime`, behind SDK delegating hooks rather than inside
the public facade.

```text
packages/core/sdk/src/
  app/
  effect/
    context.ts
    wrap.ts
  execution/
  service/
  plugins/
    server/
      effect/
    async/
      effect/
    cli/
      effect/
    web/
      effect/
    agent/
      effect/
    desktop/
      effect/
  runtime/
    derivation/
    harnesses/
    observation/
    resources/
    providers/
      effect/
    profiles/
    schema/
```

A conforming reference realization of that public facade module layout is:

File: `packages/core/sdk/src/_facade-module-layout.txt`  
Layer: public SDK facade module-layout reference realization  
Exactness: illustrative for filenames and private interiors. The public import
surfaces listed after the tree are normative; Habitat blueprints own the exact
closed source topology.

```text
packages/core/sdk/src/
  app/
    index.ts

  effect/
    index.ts
    errors.ts
    policy.ts
    context.ts
    wrap.ts

  execution/
    index.ts
    descriptor.ts
    context.ts
    policy.ts
    error-bridge.ts
    telemetry-bridge.ts

  service/
    index.ts
    define-service.ts
    implement-service.ts
    procedure-context.ts
    service-client.ts
    service-binding-types.ts
    schema.ts

  plugins/
    server/
      index.ts
      implement-server-api-plugin.ts
      implement-server-internal-plugin.ts
      effect/
        index.ts
        internal/
          runtime-delegation.ts

    async/
      index.ts
      define-workflow-plugin.ts
      define-schedule-plugin.ts
      define-consumer-plugin.ts
      effect/
        index.ts
        internal/
          runtime-delegation.ts

    cli/
      index.ts
      define-cli-topic-plugin.ts
      schema.ts
      effect/
        index.ts
        internal/
          runtime-delegation.ts

    web/
      index.ts
      define-web-app-plugin.ts
      effect/
        index.ts
        internal/
          runtime-delegation.ts

    agent/
      index.ts
      define-agent-plugin.ts
      define-tool.ts
      schema.ts
      effect/
        index.ts
        internal/
          runtime-delegation.ts

    desktop/
      index.ts
      define-desktop-plugin.ts
      effect/
        index.ts
        internal/
          runtime-delegation.ts

  runtime/
    derivation/
      index.ts
    harnesses/
      index.ts
    observation/
      index.ts
    resources/
      index.ts
      define-runtime-resource.ts
      resource-requirement.ts
    providers/
      index.ts
      define-runtime-provider.ts
      provider-effect-plan.ts
      effect/
        index.ts
        internal/
          runtime-delegation.ts
    profiles/
      index.ts
      define-runtime-profile.ts
      provider-selection.ts
    schema/
      index.ts
```

Files in this tree are public facade modules, author-facing re-exports, or
SDK-internal delegating hooks. A facade re-exports the contract implemented by
its private runtime owner; a delegating hook calls that owner without
reimplementing definition, derivation, raw Effect lowering, or runtime adapter
lowering inside the SDK.

The execution registry is a process-runtime-owned live artifact and lives in `packages/core/runtime/process-runtime/execution-registry.ts`. `runtime-derivation` owns Effect descriptor refs and their non-portable table plus the distinct web route-module refs and their non-portable table. The complete-derivation contracts are exposed from `@habitat-ai/sdk/runtime/derivation`; the SDK does not import runtime compiler types into public SDK authoring surfaces. A web route-module loader never enters the Effect descriptor table or `ExecutionRegistry`.

Canonical public import surfaces include:

| Public surface | Owner |
| --- | --- |
| `@habitat-ai/sdk/app` | App and entrypoint authoring |
| `@habitat-ai/sdk/effect` | Curated native-shaped Effect authoring facade |
| `@habitat-ai/sdk/effect/context` | Application/process-owned Effect Context composition for the official native bridge |
| `@habitat-ai/sdk/effect/wrap` | Application/process-owned Effect wrapper composition for the official native bridge |
| `@habitat-ai/sdk/execution` | Cold execution descriptor authoring and boundary-policy contracts; no derived refs or tables |
| `@habitat-ai/sdk/service` | Service authoring |
| `@habitat-ai/sdk/service/schema` | Service-owned callable data schema facade |
| `@habitat-ai/sdk/plugins/server` | Server projection authoring |
| `@habitat-ai/sdk/plugins/server/effect` | Server projection executable authoring helpers |
| `@habitat-ai/sdk/plugins/async` | Async projection authoring |
| `@habitat-ai/sdk/plugins/async/effect` | Async step-local executable authoring helpers |
| `@habitat-ai/sdk/plugins/cli` | CLI projection authoring |
| `@habitat-ai/sdk/plugins/cli/effect` | CLI command executable authoring helpers |
| `@habitat-ai/sdk/plugins/cli/schema` | CLI command schema facade |
| `@habitat-ai/sdk/plugins/web` | Web projection authoring |
| `@habitat-ai/sdk/plugins/web/effect` | Web-local executable authoring helpers |
| `@habitat-ai/sdk/plugins/agent` | Agent projection authoring |
| `@habitat-ai/sdk/plugins/agent/effect` | Agent tool executable authoring helpers |
| `@habitat-ai/sdk/plugins/agent/schema` | Agent tool schema facade |
| `@habitat-ai/sdk/plugins/desktop` | Desktop projection authoring |
| `@habitat-ai/sdk/plugins/desktop/effect` | Desktop-local executable authoring helpers |
| `@habitat-ai/sdk/runtime/resources` | Runtime resource declarations |
| `@habitat-ai/sdk/runtime/providers` | Runtime provider declarations |
| `@habitat-ai/sdk/runtime/providers/effect` | Runtime provider Effect plan authoring |
| `@habitat-ai/sdk/runtime/profiles` | Runtime profile declarations |
| `@habitat-ai/sdk/runtime/schema` | `RuntimeSchema` facade |
| `@habitat-ai/sdk/runtime/derivation` | Closed complete-derivation face: one derivation operation, exactly three runtime value exports, and the task-4.7a-frozen type-only contract inventory |
| `@habitat-ai/sdk/runtime/harnesses` | Import-safe companion harness contracts; no live handle, registry, or lifecycle owner |
| `@habitat-ai/sdk/runtime/observation` | Read-only runtime diagnostic, telemetry, topology-record, and catalog facades |

`@habitat-ai/sdk/runtime/derivation` is the sole public derivation face, and
`deriveRuntimeArtifacts(...)` is its sole derivation operation. The SDK root
and `@habitat-ai/sdk/execution` expose neither the private topology operation
nor derived graph, plan, reference, or table contracts, and neither
non-portable table is serialized.

That face has this exact closed export inventory:

- runtime values, exactly three: `deriveRuntimeArtifacts`,
  `PortableRuntimePlanArtifactSchema`, and
  `decodePortableRuntimePlanArtifact`;
- type-only exports, exactly:
  `RuntimeDerivationInput`, `RuntimeDerivationResult`,
  `NormalizedPluginIdentity`, `NormalizedSurfaceRequirement`,
  `NormalizedResourceRequirementIdentity`, `NormalizedRuntimeTopologyEdge`,
  `NormalizedRuntimeTopology`, `NormalizedAppDefinition`,
  `NormalizedPluginDefinition`, `DerivedRoleSurfaceIndex`,
  `NormalizedServiceUse`, `NormalizedServiceDependency`,
  `NormalizedSemanticDependency`, `ResourceRequirement`,
  `ProviderSelection`, `NormalizedRuntimeProfile`, `ServiceBindingPlan`,
  `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`,
  `ExecutionDescriptorRef`, `ExecutionDescriptorTable`,
  `WebRouteModuleRef`, `WebRouteModuleTableEntry`, `WebRouteModuleTable`,
  `PortableRuntimePlanArtifact`, and `DerivationFinding`.

The schema and decoder are validation values, not additional derivation
operations. No other runtime value or type-only name is exported from this
subpath. In particular, `NormalizedRuntimeTopologySchema`,
`ExecutionDescriptorRefSchema`, other nested schema constants,
`IdentityPolicy`, `DerivedExecutionArtifacts`, and a named
`ExecutionDescriptorTableEntry` remain private implementation vocabulary and
do not widen the face.

The `/effect` SDK submodules do not denote optional terminal modes. They contain the executable authoring helpers for Habitat-managed local execution in their lanes. Non-`/effect` plugin modules declare projection facts, contracts, service uses, resource requirements, topology, and other cold facts. Any owner-authored executable body managed by Habitat for a lane is authored through that lane's executable Effect helpers; use of the helper does not transfer body ownership to Habitat.

Only `@habitat-ai/sdk` public imports are locked public package export conventions in this document. Non-`@habitat-ai/sdk` imports shown in examples are illustrative package aliases unless a code block labels them otherwise.

## 5. Import safety and declaration discipline

All declarations are import-safe.

A service, plugin, resource, provider, app, or profile module declares facts,
factories, descriptors, selection values, schemas, contracts, and cold
execution plans. Importing a declaration does not acquire resources, read
secrets, connect providers, start processes, register globals, mutate app
composition, execute `HabitatEffect`, or mount native hosts.

| Module kind | Import-safe content |
| --- | --- |
| Service modules | Boundary schemas, service declarations, service contracts, router factories, native handlers, and official Effect-oRPC bridge calls |
| Plugin modules | One plugin factory, lane-specific definitions, native oRPC routers/contracts where selected, workflow definitions, command definitions, web/agent/desktop surface definitions, and non-oRPC Effect execution descriptors |
| Resource modules | `RuntimeResource` descriptors, requirement helpers, value types, and no provider imports |
| Provider modules | Cold `RuntimeProvider` descriptors, provider-local config schemas, and `ProviderEffectPlan` acquisition/release plans behind direct package public faces |
| App modules | App membership declarations and runtime profile selection |
| Entrypoints | `startApp(...)` invocation and selected process shape |

`HabitatEffect` values are lazy execution descriptions. They are not running work.

Provider configuration and its `RuntimeSchema` are provider-local. App profiles
select the direct resource and provider faces through the generic SDK helper.

Ordinary authoring modules must not construct an Effect runtime or call a manual
Effect runner. Effect-backed oRPC operation leaves may import native Effect
authoring primitives and the exact official bridge; non-oRPC descriptor lanes
use the curated Habitat facade.

File: `specification://runtime-realization/raw-effect-import-ban.txt`  
Layer: import law  
Exactness: normative.

```text
Raw Effect runtime construction and execution imports are forbidden in authored
service, plugin, app, ordinary resource, provider implementation, profile, and
entrypoint modules.

This includes:

services/**
plugins/**
apps/**
apps/*/runtime/profiles/**
resources/**
entrypoints
```

Forbidden ordinary authoring imports:

File: `specification://runtime-realization/forbidden-imports.ts`  
Layer: import law  
Exactness: normative for ordinary authoring.

```ts
import { Effect, ManagedRuntime } from "effect";
import { makeEffectORPC } from "effect-orpc";

Effect.runPromise(program);
ManagedRuntime.make(layer);
```

Native Effect constructors and combinators remain valid inside an Effect-backed
oRPC operation authored through official `.effect(...)`.

Canonical public Effect import:

File: `specification://runtime-realization/canonical-effect-import.ts`  
Layer: public SDK import law  
Exactness: normative.

```ts
import { Effect, TaggedError, type HabitatEffect } from "@habitat-ai/sdk/effect";
```

Provider plan authoring remains specialized because provider acquisition returns `ProviderEffectPlan`, not general `HabitatEffect`.

File: `specification://runtime-realization/canonical-provider-effect-import.ts`  
Layer: provider authoring import law  
Exactness: normative for provider effect plan authoring.

```ts
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
```

Provider implementations use `providerFx` for acquisition/release plans. They may use the curated `@habitat-ai/sdk/effect` facade for returned resource value operations. They must not import raw `effect`, `@effect/*`, or construct `ManagedRuntime`.

Raw Effect runtime construction and generic descriptor lowering are allowed
only in:

File: `specification://runtime-realization/raw-effect-import-allowlist.txt`  
Layer: import law  
Exactness: normative.

```text
packages/core/runtime/substrate/effect/**
```

The official Effect-oRPC side-effect import is allowed only in the
implementation-owned bootstrap:

File: `specification://runtime-realization/effect-orpc-import-allowlist.txt`  
Layer: import law  
Exactness: normative.

```text
one admitted bootstrap in the selected physical oRPC realm:
  terminal SDK consumers import "@habitat-ai/sdk/plugins/server/effect"
  an SDK-internal service that cannot depend on the terminal SDK may import
  "@orpc/experimental-effect/extensions/effect" directly under its selected law

service and oRPC plugin operation leaves:
  use the patched native implementer's .effect(function* ...) method
  do not import handlerGen
```

Community `effect-orpc`, direct bridge `runPromise`, manual `Effect.run*`, and
custom runner imports remain invalid. The extension is valid only with
one physical `@orpc/server`/bridge realm proof. A generated plain-handler service
does not need the experimental package. The extension is installed once by the
implementation owner, not once per operation leaf.

No service, plugin, resource, provider, app, or entrypoint creates or receives
its own `ManagedRuntime`. `runtime-substrate-effect` owns
`ManagedRuntimeHandle` and raw Effect lowering for non-oRPC descriptor lanes.
`runtime-process-runtime` owns `EffectRuntimeAccess` and non-oRPC runtime adapter
lowering. The application/process instead owns the Effect Context and scoped
resources supplied to the official oRPC `.effect(...)` bridge through native
hooks; it does not replace that bridge with its managed runtime.

## 6. Layered naming and artifact ownership

Names remain layer-specific. Similar concepts in different layers use different terms because they have different owners.

| Layer | Canonical terms | Consumer |
| --- | --- | --- |
| App authoring | `defineApp(...)`, `startApp(...)`, `AppDefinition`, `Entrypoint`, `RuntimeProfile` | Runtime mounting, which drives runtime derivation and compilation through private owners |
| Service authoring | `defineService(...)`, `resourceDep(...)`, `serviceDep(...)`, `semanticDep(...)`, `deps`, `scope`, `config`, `invocation`, `provided` | Runtime derivation and service binding |
| Plugin authoring | `PluginFactory`, `PluginDefinition`, `useService(...)`, `ServiceUse`, lane-specific builders, lane-native definitions, `.effect(...)` terminal bodies | Runtime derivation and surface runtime plans |
| Author-facing Effect facade | `Effect`, `HabitatEffect`, `TaggedError`, `HabitatRetryPolicy`, `HabitatTimeoutPolicy`, `HabitatConcurrencyPolicy` | Services, plugins, resources, providers, repositories where allowed |
| Resource/provider/profile authoring | `RuntimeResource`, `ResourceRequirement`, `ResourceLifetime`, `RuntimeProvider`, `ProviderSelection`, `RuntimeProfile`, `ProviderEffectPlan`, `providerFx` | Runtime derivation, runtime compiler, provisioning kernel |
| Runtime derivation | Private `NormalizedRuntimeTopology`; public complete `NormalizedAuthoringGraph`, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `ExecutionDescriptorRef` / `ExecutionDescriptorTable`, `WebRouteModuleRef` / `WebRouteModuleTable`, and `PortableRuntimePlanArtifact` through `@habitat-ai/sdk/runtime/derivation` | Complete derivation consumes the topology foundation; compiler consumes the graph and plan refs; process runtime consumes the Effect table; web adapter consumes the web table; pre-runtime tooling consumes the portable artifact |
| Runtime-definition execution model, re-exported by SDK | `HabitatEffect`, `ExecutionDescriptor`, `EffectExecutionDescriptor`, `ExecutionBoundaryKind`, `ProviderEffectBoundaryKind`, `RuntimeEffectBoundaryKind`, `EffectExecutionPolicy`, `BoundaryTelemetry`, `BoundaryErrors` | Runtime derivation, runtime compiler, process execution runtime, substrate provider lowering |
| Runtime compilation | `CompiledProcessPlan`, `CompiledResourcePlan`, `CompiledServiceBindingPlan`, `CompiledSurfacePlan`, `CompiledExecutionPlan`, `CompiledExecutableBoundary`, `ProviderDependencyGraph` | Bootgraph, process runtime, surface adapters |
| Lifecycle ordering | `Bootgraph`, `BootResourceKey`, `BootResourceModule`, acquisition/release order, rollback order | Runtime substrate |
| Provisioning | `ProvisionedProcess`, `ManagedRuntimeHandle` | Process runtime |
| Runtime execution bridge | `ExecutionRegistry`, `ProcessExecutionRuntime`, `EffectRuntimeAccess`, `ErrorBridge`, `TelemetryBridge` | Process runtime adapter lowering and SDK delegating hooks |
| Live access | `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `SurfaceRuntimeAccess` | Service binding, plugin projection, harness adapters |
| Runtime binding | `ServiceBindingCache`, `ServiceBindingCacheKey`, `bindService(...)` | Process runtime and plugin projection |
| Adapter lowering | `SurfaceAdapter`, `AdapterLoweringResult`, adapter-lowered payloads, `FunctionBundle` | Harnesses |
| Dispatcher integration | `WorkflowDispatcherDescriptor`, `WorkflowDispatcher` | Server API/internal projections and async harness integration |
| Harness/native boundary | `HarnessDescriptor`, `HarnessMountInput`, `NativeHarnessHandle`, `HarnessHealthReport`, native host payloads, owner-local harness findings | Runtime mounting and native host framework |
| Observation input | `RuntimeObservationRecord`, `RuntimeObservationPort` | Runtime observation |
| Observation projection | `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`, `RuntimeTopologyRecord` | Diagnostic readers, topology tools, control-plane touchpoints |

The authoring layer does not admit `ProcessView`, `RoleView`, `ServiceBoundary`,
or author-facing `ServiceBinding` declarations. Live access retains the canonical
`RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess` contracts in
§18.1. The sole cold plugin-to-service relation is `ServiceUse`; derived,
compiled, and live service-binding nouns remain distinct downstream artifacts.

`HabitatEffect`, `ExecutionDescriptor`, `CompiledExecutionPlan`, `ExecutionDescriptorTable`, `ExecutionRegistry`, `ProcessExecutionRuntime`, `EffectRuntimeAccess`, and `ProviderEffectPlan` are operational execution nouns. They are not top-level ontology kinds.

`startApp(...)` is the canonical app start operation. Roles, surfaces, harnesses, profiles, and process hosts are selected data passed to the entrypoint operation. There is no role-specific public start verb.

## 7. Code block exactness rule

Every illustrated code or type block in this specification includes `File:`, `Layer:`, and `Exactness:` labels immediately before it.

Code and type blocks are normative for locked names, ownership boundaries,
required fields, producer/consumer shape, lifecycle handoff, layer handoff,
public `HabitatEffect`/`Effect` import surfaces, Effect runtime-authority
confinement, admitted official Effect-oRPC imports, terminal ownership,
execution descriptor producer/consumer shape, `ExecutionDescriptorTable`,
`ExecutionRegistry` matching, non-oRPC `ProcessExecutionRuntime` ownership,
process-local coordination semantics, and bridge ownership. They are
illustrative for overloads, generic parameters, helper placement, and
non-`@habitat-ai/sdk` import paths unless a block states otherwise.

Where this document shows public facade helper generics, the public helper name, public import path, export/forbidden-export law, and architectural authority are normative. Exact generic spellings and overloads are illustrative unless explicitly labeled implementation-proven.

## 8. Schema ownership and `RuntimeSchema`

`RuntimeSchema` is the canonical SDK-facing schema facade for runtime-owned and runtime-carried boundary schema declarations.

TypeBox owns structural schema declarations. The private `runtime-schema`
adapter wraps TypeBox schemas for runtime-carried data and provides Standard
Schema adaptation for oRPC-compatible boundaries. The terminal SDK exposes
those facades. The semantic owner authors the TypeBox schema; `runtime-schema`
adapts it; and the owning runtime boundary invokes decoding and validation while
applying the schema's redaction policy to diagnostic, telemetry, and catalog
projections.

It appears where the runtime must derive validation, type projection, config decoding, redaction, diagnostics, or harness payload contracts from an authored declaration. That includes provider config, runtime profile config, service boundary `scope`, service boundary `config`, service boundary `invocation`, runtime diagnostics payloads, and harness-facing runtime payloads.

`RuntimeSchema` has this minimum contract.

File: `packages/core/runtime/schema/src/runtime-schema.ts`  
Layer: private runtime schema adapter, exposed through the SDK runtime schema facade  
Exactness: normative for required capabilities; illustrative for generic spelling.

```ts
import type { Static, TSchema as TypeBoxSchema } from "typebox";

export interface RuntimeSchema<TValue = unknown> {
  readonly kind: "runtime.schema";
  readonly serializable: unknown;
  readonly description?: string;
  readonly redaction?: RuntimeRedactionPolicy;

  decode(input: unknown): RuntimeSchemaResult<TValue>;
  validate(input: unknown): RuntimeSchemaResult<TValue>;
  toRedactedShape(): RuntimeRedactedShape;
}

export type RuntimeSchemaValue<TSchema extends RuntimeSchema<unknown>> =
  TSchema extends RuntimeSchema<infer TValue> ? TValue : never;

export namespace RuntimeSchema {
  export function fromTypeBox<const TSchema extends TypeBoxSchema>(
    schema: TSchema,
    options?: { readonly redaction?: RuntimeRedactionPolicy },
  ): RuntimeSchema<Static<TSchema>>;

  export type Infer<TSchema extends RuntimeSchema<unknown>> =
    RuntimeSchemaValue<TSchema>;
}
```

`RuntimeSchema.fromTypeBox(...)` is the explicit adaptation boundary. It uses
the one private `runtime-schema` TypeBox adapter, exposed through the SDK, for
validation and Standard Schema projection; it does not introduce another
schema grammar.

`RuntimeSchema` does not transfer service domain schema ownership to the runtime. Service procedure payloads, plugin API payloads, plugin-native contracts, and workflow payloads remain schema-backed contracts owned by their service or plugin boundary.

When an SDK generic needs the decoded value type of a runtime-carried schema, it uses `RuntimeSchema.Infer<typeof Schema>` or the equivalent `RuntimeSchemaValue<typeof Schema>`. `typeof Schema` names the schema value itself, not the decoded config, scope, invocation, diagnostic, or harness payload value. Static type projection is a TypeScript helper, not a runtime field on the schema object.

`HabitatEffect` is not a schema form. A `HabitatEffect`-returning operation still uses the existing schema owner for input, output, and error data. `RuntimeSchema` remains for runtime-carried config, diagnostics, and harness-facing runtime payloads.

| Schema-bearing boundary | Schema owner | Schema form |
| --- | --- | --- |
| Provider config | Provider boundary | `RuntimeSchema` |
| Runtime profile config | App/runtime profile boundary | `RuntimeSchema` |
| Service `scope`, `config`, `invocation` lanes | Service boundary as runtime-carried lanes | `RuntimeSchema` |
| Service callable procedure input/output/errors | Service package | Service-owned schema-backed oRPC-compatible contracts |
| Public server API input/output/errors | Server API plugin | Plugin-owned schema-backed oRPC-compatible contracts |
| Server internal API input/output/errors | Server internal plugin | Plugin-owned schema-backed oRPC-compatible contracts |
| Workflow payloads read from event data | Async plugin or projected service boundary | Schema-backed payload contract |
| Harness-facing runtime payloads | Runtime adapter/harness boundary | `RuntimeSchema` |
| Diagnostics payloads | Runtime diagnostics | `RuntimeSchema` |

Plain string labels may name capabilities, routes, ids, triggers, cron expressions, policies, event names, and diagnostic codes. They must not stand in for data schemas.

## 9. Effect execution components

Sections 9.1 through 9.6 define Habitat's non-oRPC descriptor runtime and
provider substrate. They do not define or imitate the native Effect-oRPC
request executor. Effect-backed oRPC operations stay native and use official
`.effect(...)` authoring as specified in section 1. Its `handlerGen(...)`
delegation is vendor-internal mechanics only.

### 9.1 `HabitatEffect` and curated `Effect`

`HabitatEffect` is the author-facing execution value type. It represents a lazy effectful program without exposing raw Effect runtime ownership.

`runtime-definition` owns the cold `HabitatEffect` value, curated `Effect` authoring contract, tagged-error helper contract, and execution-policy descriptors. The SDK re-exports those public authoring facades. They are not raw Effect and export no runtime authority.

`HabitatEffect` is generator-yield-compatible. Generator-native
`.effect(function*)` bodies in non-oRPC lanes produce cold definition-owned
descriptors; yielded `HabitatEffect` values remain cold until
`runtime-substrate-effect` performs raw Effect lowering. Authors may use
`yield*` with `HabitatEffect` values inside those sanctioned bodies and helper
functions. The public type must preserve success, failure, and requirement
inference through the non-oRPC descriptor body. Native oRPC `.effect(...)` is a
different vendor method that delegates internally to the official bridge and
consumes native Effect, not `HabitatEffect`.

File: `packages/core/runtime/definition/src/effect/habitat-effect.ts`  
Layer: private runtime-definition cold Effect contract re-exported by `@habitat-ai/sdk/effect`  
Exactness: normative for public import path, public names, yieldability contract, inference preservation, and forbidden raw runtime construction; illustrative for exact generic spelling, overloads, and iterator implementation.

```ts
export interface HabitatEffect<
  TSuccess,
  TError = never,
  TRequirements = never,
> extends HabitatYieldable<TSuccess, TError, TRequirements> {
  readonly kind: "habitat.effect";
  readonly __success?: TSuccess;
  readonly __error?: TError;
  readonly __requirements?: TRequirements;
}

export interface HabitatYieldable<
  TSuccess,
  TError = never,
  TRequirements = never,
> {
  [Symbol.iterator](): HabitatEffectYieldIterator<TSuccess, TError, TRequirements>;
}

export interface HabitatEffectYieldIterator<
  TSuccess,
  TError = never,
  TRequirements = never,
> extends Generator<unknown, TSuccess, unknown> {
  readonly __error?: TError;
  readonly __requirements?: TRequirements;
}

export const Effect: HabitatEffectFacade = createHabitatEffectFacade();

export interface HabitatEffectFacade {
  succeed<T>(value: T): HabitatEffect<T>;

  fail<E>(error: E): HabitatEffect<never, E>;

  gen<TSuccess, TError = never, TRequirements = never>(
    body: () => Generator<unknown, TSuccess, unknown>,
  ): HabitatEffect<TSuccess, TError, TRequirements>;

  tryPromise<TSuccess, TError>(input: {
    try: () => Promise<TSuccess> | TSuccess;
    catch: (cause: unknown) => TError;
  }): HabitatEffect<TSuccess, TError>;

  all<T extends Record<string, HabitatEffect<any, any, any>>>(
    effects: T,
    options?: {
      concurrency?: number | "unbounded";
      discard?: boolean;
    },
  ): HabitatEffect<
    HabitatEffectSuccessRecord<T>,
    HabitatEffectErrorUnion<T>,
    HabitatEffectRequirementUnion<T>
  >;

  timeout<TSuccess, TError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    duration: HabitatDurationInput,
  ): HabitatEffect<TSuccess, TError | HabitatTimeoutError, TRequirements>;

  retry<TSuccess, TError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    policy: HabitatRetryPolicy,
  ): HabitatEffect<TSuccess, TError, TRequirements>;

  mapError<TSuccess, TError, TNextError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    map: (error: TError) => TNextError,
  ): HabitatEffect<TSuccess, TNextError, TRequirements>;

  catchTag<TSuccess, TError, TTag extends string, TNextSuccess, TNextError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    tag: TTag,
    handler: (error: Extract<TError, { readonly _tag: TTag }>) =>
      HabitatEffect<TNextSuccess, TNextError, TRequirements>,
  ): HabitatEffect<TSuccess | TNextSuccess, Exclude<TError, { readonly _tag: TTag }> | TNextError, TRequirements>;

  catchTags<TSuccess, TError, TNextSuccess, TNextError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    handlers: HabitatCatchTagsHandlers<TError, TNextSuccess, TNextError, TRequirements>,
  ): HabitatEffect<TSuccess | TNextSuccess, TNextError, TRequirements>;

  orElse<TSuccess, TError, TNextSuccess, TNextError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    fallback: (error: TError) => HabitatEffect<TNextSuccess, TNextError, TRequirements>,
  ): HabitatEffect<TSuccess | TNextSuccess, TNextError, TRequirements>;

  match<TSuccess, TError, TNextSuccess, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    handlers: {
      onSuccess: (value: TSuccess) => TNextSuccess;
      onFailure: (error: TError) => TNextSuccess;
    },
  ): HabitatEffect<TNextSuccess, never, TRequirements>;

  withSpan<TSuccess, TError, TRequirements>(
    name: string,
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    attributes?: HabitatTelemetryAttributes,
  ): HabitatEffect<TSuccess, TError, TRequirements>;

  interruptible<TSuccess, TError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
  ): HabitatEffect<TSuccess, TError, TRequirements>;
}
```

Exact `catchTags` generic spelling is illustrative. The implementation must preserve residual unhandled error members unless handlers are exhaustive.

`@habitat-ai/sdk/effect` must not export:

File: `specification://runtime-realization/forbidden-effect-exports.txt`  
Layer: SDK author-facing Effect facade  
Exactness: normative forbidden public exports.

```text
ManagedRuntime
ManagedRuntime.make
Runtime.run*
Effect.runPromise
Layer.launch
raw Context key construction
raw Scope construction
raw Queue constructors
raw PubSub constructors
raw Fiber constructors
raw Stream constructors
raw Schedule constructors
raw Cache constructors
unsafe daemon/fork constructors
```

The global `fx` authoring spelling is not canonical. Canonical examples use `Effect`.

File: `packages/core/runtime/definition/src/effect/tagged-error.ts`  
Layer: private runtime-definition tagged-error contract re-exported by the SDK  
Exactness: normative for public tagged error helper location and public tagged-error role; illustrative for exact class-extension generic spelling.

```ts
export type TaggedErrorConstructor<TTag extends string> =
  new <const TFields extends Record<string, unknown> = {}>(
    fields: keyof TFields extends never ? void : TFields,
  ) => TFields & { readonly _tag: TTag };

export function TaggedError<const TTag extends string>(
  tag: TTag,
): TaggedErrorConstructor<TTag>;
```

`TaggedError` is a definition-owned cold contract re-exported by the SDK. It preserves the Effect-style `class X extends TaggedError("X")<Fields> {}` authoring shape and `_tag` discriminant without exporting raw Effect `Data.TaggedError` or transferring raw Effect runtime authority to ordinary authoring.

File: `packages/core/runtime/definition/src/effect/policy.ts`  
Layer: private runtime-definition execution policy descriptors re-exported by the SDK  
Exactness: normative for policy categories.

```ts
export interface HabitatRetryPolicy {
  readonly times?: number;
  readonly backoff?: "fixed" | "exponential" | "none";
  readonly delay?: HabitatDurationInput;
}

export interface HabitatTimeoutPolicy {
  readonly duration: HabitatDurationInput;
}

export interface HabitatConcurrencyPolicy {
  readonly concurrency: number | "unbounded";
}
```

Internal lowering remains non-public.

File: `packages/core/runtime/substrate/effect/src/lower-habitat-effect.ts`  
Layer: private runtime-substrate-effect raw Effect lowering  
Exactness: normative for confinement to the Effect-substrate owner
and non-public status; illustrative for the filename and raw
Effect API spelling.

```ts
import { Effect as RawEffect } from "effect";

import type { HabitatEffect } from "../../../definition/src/effect/habitat-effect";

export function lowerHabitatEffect<TSuccess, TError, TRequirements>(
  effect: HabitatEffect<TSuccess, TError, TRequirements>,
): RawEffect.Effect<TSuccess, TError, TRequirements> {
  return internalHabitatEffectLowering.lower(effect);
}
```

This function is not exported from public SDK surfaces. The SDK does not lower
raw Effect, and no private runtime owner imports the SDK to reach it.

### 9.2 Execution descriptors

Execution descriptors are the private runtime-definition representation of
executable bodies owned by their service or plugin and managed by the Habitat
runtime. The SDK exposes their public authoring contract. They are Effect-only.

Provider acquisition and release are not ordinary procedure execution descriptors. Provider acquisition/release use `ProviderEffectPlan` and runtime-substrate-effect provider lowering under bootgraph order metadata. Provider boundaries may share definition-owned policy and correlation vocabulary with execution boundaries, but provider acquire/release are not service/plugin procedure descriptors and do not pass through `CompiledExecutionPlan`.

File: `packages/core/runtime/definition/src/execution/descriptor.ts`  
Layer: private runtime-definition execution model exposed through the SDK facade  
Exactness: normative for descriptor kind, identity, provider separation, and boundary separation.

```ts
export type ExecutionBoundaryKind =
  | "plugin.async-step"
  | "plugin.cli-command"
  | "plugin.web-surface"
  | "plugin.agent-tool"
  | "plugin.desktop-background";

export type ProviderEffectBoundaryKind =
  | "provider.acquire"
  | "provider.release";

export type RuntimeEffectBoundaryKind =
  | ExecutionBoundaryKind
  | ProviderEffectBoundaryKind
  | "resource.operation";

export type ExecutionDescriptor<TInput, TOutput, TError, TContext> =
  EffectExecutionDescriptor<TInput, TOutput, TError, TContext>;

export interface EffectExecutionDescriptor<TInput, TOutput, TError, TContext> {
  readonly kind: "execution.effect";
  readonly executionId: string;
  readonly boundary: ExecutionBoundaryKind;
  readonly policy: EffectExecutionPolicy;

  run(
    input: ProcedureExecutionContext<TInput, TContext>,
  ): HabitatEffect<TOutput, TError, any>;
}
```

The complete-derivation reference contract has a different owner and public
face:

File: `packages/core/runtime/derivation/src/execution-descriptor-ref.ts`  
Layer: private runtime-derivation reference artifact whose
`ExecutionDescriptorRef` type is exposed only through
`@habitat-ai/sdk/runtime/derivation`; its schema value remains owner-internal  
Exactness: normative for the Effect-only reference union and identity
ingredients; illustrative for dependent helper spelling.

```ts
import { ReadonlyObject, Type, type Static } from "typebox";

const closedExecutionRef = { additionalProperties: false } as const;
const executionDescriptorRefBase = {
  kind: Type.Literal("execution.descriptor-ref"),
  executionId: Type.String(),
  ownerId: Type.String(),
} as const;

export const ExecutionDescriptorRefSchema = Type.Union([
  ReadonlyObject(Type.Object({
    ...executionDescriptorRefBase,
    boundary: Type.Literal("plugin.async-step"),
    workflowId: Type.String(),
    stepId: Type.String(),
  }), closedExecutionRef),
  ReadonlyObject(Type.Object({
    ...executionDescriptorRefBase,
    boundary: Type.Literal("plugin.async-step"),
    scheduleId: Type.String(),
    stepId: Type.String(),
  }), closedExecutionRef),
  ReadonlyObject(Type.Object({
    ...executionDescriptorRefBase,
    boundary: Type.Literal("plugin.async-step"),
    consumerId: Type.String(),
    stepId: Type.String(),
  }), closedExecutionRef),
  ReadonlyObject(Type.Object({
    ...executionDescriptorRefBase,
    boundary: Type.Literal("plugin.cli-command"),
    commandId: Type.String(),
  }), closedExecutionRef),
  ReadonlyObject(Type.Object({
    ...executionDescriptorRefBase,
    boundary: Type.Literal("plugin.web-surface"),
    surfaceId: Type.String(),
  }), closedExecutionRef),
  ReadonlyObject(Type.Object({
    ...executionDescriptorRefBase,
    boundary: Type.Literal("plugin.agent-tool"),
    toolId: Type.String(),
  }), closedExecutionRef),
  ReadonlyObject(Type.Object({
    ...executionDescriptorRefBase,
    boundary: Type.Literal("plugin.desktop-background"),
    backgroundId: Type.String(),
  }), closedExecutionRef),
]);

export type ExecutionDescriptorRef =
  Static<typeof ExecutionDescriptorRefSchema>;

export type DistributiveOmit<T, K extends PropertyKey> =
  T extends unknown ? Omit<T, K> : never;

export type ExecutionDescriptorIdentityInput =
  DistributiveOmit<ExecutionDescriptorRef, "kind" | "executionId">;
```

The closed TypeBox union above remains exact. `ExecutionDescriptorRef` is a
type-only export from `@habitat-ai/sdk/runtime/derivation`;
`ExecutionDescriptorRefSchema`, `DistributiveOmit`, and
`ExecutionDescriptorIdentityInput` do not widen that subpath's public export
inventory.

`ExecutionDescriptorRef` is a discriminated union keyed by `boundary`, not an
optional-field bag. Native oRPC service, server API, and server-internal
operations are intentionally absent because the official bridge executes their
Effect bodies. Complete runtime derivation derives refs for the remaining
lane-native authoring facts through `@habitat-ai/sdk/runtime/derivation`;
authors do not construct refs manually.
For `plugin.async-step` refs, exactly one of `workflowId`, `scheduleId`, or
`consumerId` identifies the enclosing async definition, and `stepId` identifies
the step-local executable body. `executionId` remains the canonical derived id,
but the boundary-specific fields are required identity ingredients for
diagnostics, descriptor lookup, and registry matching.

For every plugin boundary, `ownerId` is the canonical owner identity of the
plugin that owns the executable body. An actual web-local Effect body uses the
`plugin.web-surface` variant and its required `surfaceId`; that ref is still
distinct from a lazy route-module loader and from `WebRouteModuleRef`.

A web route's lazy module loader is also intentionally absent. Complete runtime
derivation represents that loader with `WebRouteModuleRef` and
`WebRouteModuleTable`, not with `ExecutionDescriptorRef` or
`ExecutionDescriptorTable`. Loading a web route module is native web-host
module loading, not Effect execution.

`RuntimeEffectBoundaryKind` is policy and telemetry vocabulary. Its inherited
`plugin.web-surface` member describes actual web-local Effect work; it does not
classify or execute a web route-module loader. The vocabulary does not mean
every web, resource, or provider operation has a compiled execution plan.

`resource.operation` is policy and telemetry vocabulary for resource-value operations. It does not create an independent compiled execution plan. Resource operations inherit the execution path and policy of their enclosing `EffectExecutionDescriptor` or `ProviderEffectPlan` unless a resource facade explicitly narrows local policy.

The public executable terminal for a non-oRPC plugin descriptor lane may be
Habitat `.effect(...)`. Native oRPC keeps its own terminals: `.handler(...)` for
synchronous or Promise operations and official `.effect(...)` for Effect-backed
operations. Its `handlerGen(...)` delegation remains vendor-internal. The two `.effect`
spellings have different owners and must not be implemented by imitating each
other. `Effect.gen(...)` remains valid for native Effect helpers, repositories,
resource operations, provider-local composition where appropriate, generated
code, and lower-level composition.

File: `packages/core/sdk/src/execution/context.ts`  
Layer: SDK operational execution context  
Exactness: normative for common invocation fields and execution-context relation.

```ts
export interface ProcedureExecutionContext<TInput, TBoundaryContext> {
  readonly input: TInput;
  readonly context: TBoundaryContext;
  readonly telemetry: BoundaryTelemetry;
  readonly errors: BoundaryErrors;
  readonly execution: EffectBoundaryContext;
}

export interface EffectBoundaryContext {
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly role: AppRole;
  readonly surface?: string;
  readonly capability?: string;
  readonly ownerId: string;
  readonly executionId: string;
  readonly requestId?: string;
  readonly traceId: string;
  readonly caller?: RuntimeCallerRef;
}

export interface BoundaryTelemetry {
  span<TSuccess, TError, TRequirements>(
    name: string,
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    attributes?: Record<string, string | number | boolean>,
  ): HabitatEffect<TSuccess, TError, TRequirements>;

  event(
    name: string,
    attributes?: Record<string, string | number | boolean | null>,
  ): HabitatEffect<void>;
}

export interface BoundaryErrors {
  runtime(error: unknown): RuntimeBoundaryError;
  domain(error: unknown): DomainBoundaryError;
}
```

`EffectBoundaryContext.traceId` is required for Habitat-managed executable invocation boundaries. If the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`. `requestId` remains optional host correlation; `traceId` is the required runtime correlation field passed into invocation schemas and telemetry. Lane-specific invocation facades such as CLI `invocation.traceId` and agent `shell.traceId` expose the same required trace identity guarantee when they feed required invocation schemas.

### 9.3 Execution descriptor table

`ExecutionDescriptorTable` is the non-portable runtime-derived table of live descriptor values.

Portable plan artifacts carry descriptor refs only. They do not serialize executable closures. The process runtime receives the descriptor table in-process and uses it to assemble `ExecutionRegistry`.

Executable descriptor values are cold, statically declarable values. Complete
runtime derivation imports definition-owned declarations directly and collects
descriptor refs plus the non-portable descriptor table; the complete-derivation public
contracts are exposed through `@habitat-ai/sdk/runtime/derivation`, which is
never a private-owner dependency. Runtime derivation must not acquire
resources, bind services, materialize workflow dispatchers, execute workflow
bodies, invoke web route-module loaders, or statically parse arbitrary user
code to discover executable bodies. Descriptor bodies may close over
import-time constants, schemas, and SDK helper values. They must not close over
runtime-bound clients, request objects, dispatcher handles, resource
instances, `RuntimeAccess`, or `EffectRuntimeAccess`.

File: `packages/core/runtime/derivation/src/derive-execution-descriptor-table.ts`  
Layer: runtime-derived non-portable execution descriptor table exposed through the SDK  
Exactness: normative for descriptor-table role, producer/consumer, and
non-portable status. The method signatures and helper entry spelling below are
illustrative dependency sketches, not implementable public authority, until
task 4.7a freezes the exact `ExecutionDescriptorTable` methods. The shown
`ExecutionDescriptorTableEntry` name is not a public SDK export.

```ts
export interface ExecutionDescriptorTable {
  readonly kind: "execution.descriptor-table";

  get(
    ref: ExecutionDescriptorRef,
  ): ExecutionDescriptor<any, any, any, any>;

  entries(): Iterable<ExecutionDescriptorTableEntry>;
}

export interface ExecutionDescriptorTableEntry {
  readonly ref: ExecutionDescriptorRef;
  readonly descriptor: ExecutionDescriptor<any, any, any, any>;
}
```

Task 4.7a must replace the illustrative table signature without widening the
closed `@habitat-ai/sdk/runtime/derivation` export inventory; task 4.8 then
implements that exact contract.

Producer: complete runtime derivation.  
Consumer: process runtime execution registry assembly.  
Portable artifact status: non-portable; refs only are portable.

The descriptor table is import-safe and lazy. It contains executable descriptors but does not execute them.

Live invocation values are supplied later through `ProcedureExecutionContext`. Bound clients, request context, dispatcher access, resources, telemetry, and execution metadata enter executable bodies through that invocation context, not through descriptor-time closure capture.

#### 9.3a Web route-module reference table

`WebRouteModuleRef` and `WebRouteModuleTable` form a separate, non-portable
module-loading channel. Complete runtime derivation preserves each cold loader
by reference in the table and emits deterministic route facts in the ref. The
web surface adapter consumes the refs and the matching table; neither
`ExecutionRegistry` nor `ProcessExecutionRuntime` consumes them.

The table does not invoke a loader during derivation, compilation, or portable
artifact production. The selected web adapter or host invokes the preserved
loader only at its native module-loading boundary. Neither the ref nor the
table is written to `PortableRuntimePlanArtifact`.

### 9.4 Execution registry

`ExecutionRegistry` is a process-runtime-owned live artifact that pairs each compiled execution plan with its matching Effect descriptor. Adapters use the registry to obtain matched executable boundaries.

Registry matches execution.

File: `packages/core/runtime/process-runtime/execution-registry.ts`  
Layer: process runtime execution registry contract  
Exactness: normative for matching plan and descriptor before invocation; illustrative for generic spelling.

```ts
export interface ExecutionRegistry {
  readonly kind: "execution.registry";

  get<TInput, TSuccess, TError, TContext>(
    ref: ExecutionDescriptorRef,
  ): CompiledExecutableBoundary<TInput, TSuccess, TError, TContext>;
}

export interface CompiledExecutableBoundary<TInput, TSuccess, TError, TContext> {
  readonly kind: "compiled.executable-boundary";
  readonly ref: ExecutionDescriptorRef;
  readonly plan: CompiledExecutionPlan;
  readonly descriptor: ExecutionDescriptor<TInput, TSuccess, TError, TContext>;
}
```

The process runtime constructs `ExecutionRegistry` after compilation and provisioning and before adapter lowering. It validates that every `CompiledExecutionPlan.executionId` matches the `EffectExecutionDescriptor.executionId` of the descriptor it is paired with. A mismatched pair is a runtime compilation or registry assembly failure and must not be invoked.

### 9.5 `EffectRuntimeAccess`

`EffectRuntimeAccess` is the `runtime-process-runtime`-owned handle used by
`ProcessExecutionRuntime` and runtime-owned adapter lowering to execute
non-oRPC `HabitatEffect` descriptor programs against the single process managed
runtime. SDK hooks may delegate to those runtime adapters but do not own or
implement the handle. The native oRPC `.effect(...)` bridge does not call or
receive `EffectRuntimeAccess`.

It is not app authoring, service dependency declaration, plugin projection fact, provider selection, or a public runtime handle.

File: `packages/core/runtime/process-runtime/src/effect-runtime-access.ts`  
Layer: private runtime-process-runtime execution bridge  
Exactness: normative for process-owned execution bridge and forbidden public export.

```ts
export interface EffectRuntimeAccess {
  readonly kind: "effect-runtime.access";
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly roles: readonly AppRole[];

  run<TSuccess, TError, TRequirements>(
    input: {
      effect: HabitatEffect<TSuccess, TError, TRequirements>;
      context: EffectBoundaryContext;
      policy: EffectExecutionPolicy;
      telemetry: EffectTelemetryBridge;
      errors: EffectErrorBridge;
    },
  ): Promise<TSuccess>;

  runExit<TSuccess, TError, TRequirements>(
    input: {
      effect: HabitatEffect<TSuccess, TError, TRequirements>;
      context: EffectBoundaryContext;
      policy: EffectExecutionPolicy;
      telemetry: EffectTelemetryBridge;
      errors: EffectErrorBridge;
    },
  ): Promise<EffectExecutionExit<TSuccess, TError>>;
}
```

Services, plugins, harnesses, and SDK facade modules do not receive
`EffectRuntimeAccess` directly. `runtime-process-runtime` supplies it only to
its non-oRPC execution and adapter-lowering interiors; SDK delegating hooks
invoke those interiors without importing or exposing the handle. The
application/process supplies native Effect Context and wrap functions directly
through oRPC context without exposing this handle.

`CompiledExecutionPlan` bridge references are resolved by `ProcessExecutionRuntime` before `EffectRuntimeAccess` is called. The resolution path is:

File: `specification://runtime-realization/effect-bridge-resolution.txt`  
Layer: process runtime execution bridge  
Exactness: normative bridge resolution order.

```text
CompiledExecutionPlan.errorBridge
  -> ProcessExecutionRuntime resolves ErrorBridgeRef
  -> resolved EffectErrorBridge
  -> EffectRuntimeAccess.run(...) or runExit(...)
  -> boundary error mapping
  -> caller/native host response or structured exit

CompiledExecutionPlan.telemetryLabels
  -> ProcessExecutionRuntime resolves runtime telemetry context
  -> resolved EffectTelemetryBridge
  -> EffectRuntimeAccess.run(...) or runExit(...)
  -> runtime execution spans/events
  -> service/plugin semantic enrichment where present
```

File: `packages/core/runtime/substrate/effect/managed-runtime-handle.ts`  
Layer: runtime-owned raw Effect managed runtime  
Exactness: normative for one process `ManagedRuntime`, one
`Layer.effectContext(...)` provider-lifecycle adapter, eager context build
before provisioning completes, and no second root `Scope`; illustrative for
exact wrapper generics and helper names.

```ts
import { Context, Effect, Exit, Layer, ManagedRuntime } from "effect";

export interface ManagedRuntimeHandle<TResources, TProvisionError> {
  readonly kind: "managed-runtime.handle";
  readonly processId: string;
  readonly context: Context.Context<TResources>;

  run<TSuccess, TError>(
    effect: Effect.Effect<TSuccess, TError, TResources>,
  ): Promise<TSuccess>;

  runExit<TSuccess, TError>(
    effect: Effect.Effect<TSuccess, TError, TResources>,
  ): Promise<Exit.Exit<TSuccess, TError | TProvisionError>>;

  dispose(): Promise<void>;
}

export async function createManagedRuntimeHandle<TResources, TProvisionError>(input: {
  processId: string;
  providerPlans: readonly CompiledProviderPlan[];
  order: readonly BootResourceKey[];
  rollbackOrder: readonly BootResourceKey[];
}): Promise<ManagedRuntimeHandle<TResources, TProvisionError>> {
  const lifecycleLayer: Layer.Layer<TResources, TProvisionError, never> =
    Layer.effectContext(
      executeProviderPlansInBootgraphOrder<TResources, TProvisionError>({
        plans: input.providerPlans,
        order: input.order,
        rollbackOrder: input.rollbackOrder,
      }),
    );

  const runtime = ManagedRuntime.make(lifecycleLayer);
  const context = await runtime.context();

  return {
    kind: "managed-runtime.handle",
    processId: input.processId,
    context,

    run(effect) {
      return runtime.runPromise(effect);
    },

    runExit(effect) {
      return runtime.runPromiseExit(effect);
    },

    dispose() {
      return runtime.dispose();
    },
  };
}
```

Only runtime substrate code creates `ManagedRuntimeHandle`. In the pinned
Effect source, `ManagedRuntime.make(...)` allocates and owns its internal root
scope and forked layer scope, and builds the layer lazily. The explicit
`runtime.context()` call above is therefore the provisioning barrier: it must
succeed before `ProvisionedProcess` exists or any harness mounts. Disposal of
the managed runtime closes that owned scope hierarchy. Substrate code does not
allocate another root `Scope`, expose `managedRuntime.scope`, or compose a
bootgraph-shaped `Layer` DAG.

### 9.6 Effect execution policy

Execution policy applies to non-oRPC Habitat-managed descriptor execution. It
does not differentiate terminal modes or transfer ownership of an
application-authored body. Native oRPC request policy is composed by the
application/process through oRPC middleware and `effect/wrap`; cancellation is
the native request signal forwarded by the official bridge's internal
mechanism.

File: `specification://runtime-realization/effect-execution-policy.txt`  
Layer: runtime execution policy  
Exactness: normative policy defaults.

```text
plugin.async-step:
  durable retry: Inngest first
  local Effect retry: explicit transient only
  interruption: between-step cancellation only; no synthetic AbortSignal
  detachedFibers: forbidden

plugin.cli-command:
  retry: explicit only
  timeout: command policy
  interruption: interrupt-on-process-stop

plugin.web-surface:
  retry: explicit only
  timeout: host/local policy
  interruption: interrupt-on-host-cancel

plugin.agent-tool:
  retry: explicit only
  timeout: strict tool policy
  interruption: interrupt-on-request-close
  telemetry labels: actorId, traceId, pluginId

plugin.desktop-background:
  retry: explicit only
  cadence: desktop-local
  interruption: interrupt-on-process-stop
  durable semantics: none

provider.acquire:
  retry: provider policy / transient only
  timeout: provider policy
  interruption: complete-before-stop
  detachedFibers: runtime-owned-only

provider.release:
  retry: provider policy / transient only
  timeout: provider policy
  interruption: finalizer policy
  detachedFibers: runtime-owned-only
```

No retries are hidden by default. Timeouts are boundary defaults, not hidden business retries. Detached fibers are forbidden in ordinary authoring. Effect interruption is cooperative and runtime-owned. Async durable retries belong to Inngest unless explicitly modeled as transient step-local Effect retry.

## 10. App and entrypoint authoring contract

Each subsection states the generic contract before its concrete example. Blocks
located under `apps/rawr/**` are relative to the independent downstream Rawr
repository: they exercise a diverse set of Habitat roles and surfaces but do
not define the generic app, profile, or entrypoint kind. `apps/habitat` is the
platform's separate self-hosted app realization.

### 10.1 `AppDefinition`

Apps compose products.

`defineApp(...)` produces `AppDefinition` and declares app identity and selected
plugin membership. It may reference runtime profile definitions, process
defaults, and selected publication artifacts through app-owned runtime modules.
The app owns product composition and app-local source; selected services,
plugins, resources, and providers retain ownership of their own source and
behavior. `AppDefinition` is neither a separate manifest authority nor a
bootgraph input authority. It does not acquire resources or start a process.

File (independent downstream Rawr repository): `apps/rawr/rawr.app.ts`  
Layer: app authoring  
Exactness: normative for the `AppDefinition` membership field, plugin-selection
mechanism, and separation from process shape; illustrative for the Rawr app id,
concrete selected membership, plugin names, and non-`@habitat-ai/sdk` imports.

```ts
import { defineApp } from "@habitat-ai/sdk/app";

import { createPlugin as workItemsPublicApi } from "@rawr/plugins/server/api/work-items";
import { createPlugin as workItemsInternalApi } from "@rawr/plugins/server/internal/work-items-ops";
import { createPlugin as workItemsSyncWorkflow } from "@rawr/plugins/async/workflows/work-items-sync";
import { createPlugin as workItemsDigestSchedule } from "@rawr/plugins/async/schedules/work-items-digest";
import { createPlugin as workItemsCli } from "@rawr/plugins/cli/topics/work-items";
import { createPlugin as workItemsWeb } from "@rawr/plugins/web/app/work-items-board";
import { createPlugin as workItemsAgentTools } from "@rawr/plugins/agent/tools/work-items";
import { createPlugin as diskStatusDesktop } from "@rawr/plugins/desktop/menubar/disk-status";

export const rawrApp = defineApp({
  id: "rawr",
  plugins: [
    workItemsPublicApi(),
    workItemsInternalApi(),
    workItemsSyncWorkflow(),
    workItemsDigestSchedule(),
    workItemsCli(),
    workItemsWeb(),
    workItemsAgentTools(),
    diskStatusDesktop(),
  ],
});
```

The app owns membership. Foundational runtime derivation records the selected
role and surface requirements in `NormalizedRuntimeTopology`; complete
derivation expands them into the role/surface indexes carried by
`NormalizedAuthoringGraph` through the
`@habitat-ai/sdk/runtime/derivation` contract.

This reference deliberately spans public and trusted server APIs, durable
workflow and schedule projections, a CLI topic, web, agent tooling, and a
desktop surface. Its breadth demonstrates that one app can select several
native projection kinds without collapsing their owners or harnesses.

An app definition lives at `apps/<app-id>/<app-id>.app.ts`. The `.app` suffix
names the architectural kind of the file; app identity remains the directory
and definition id.

#### 10.1.1 Process launch identity

`runtime-definition` owns the immutable launch identity carried by each cold
process-catalog record into one `startApp(...)` invocation. The identity is
operational app-owned data, not a process kind, live registry, supervisor, or
deployment controller.

File: `packages/core/runtime/definition/src/app/runtime-launch-identity.ts`  
Layer: private runtime-definition contract re-exported by `@habitat-ai/sdk/app`
and `@habitat-ai/sdk/runtime/harnesses`  
Exactness: normative for the owner, fields, immutability, and re-exported type
identity.

```ts
export interface RuntimeLaunchIdentity {
  readonly app: string;
  readonly process: string;
  readonly entrypoint: string;
  readonly deployment: string;
  readonly source: string;
}
```

The harness project consumes this exact definition-owned type through its
declared Nx dependency. It does not redeclare or widen it.

### 10.2 `RuntimeProfile` and process defaults

Profiles select supply.

Runtime profiles live under `apps/<app>/runtime/profiles/*`. They select
providers and config sources for the app. The profile field that holds generic
`providerSelection({ resource, provider, config })` results is `providers`,
never `resources`.

Resources, providers, and profiles are separate layers.

A resource declares a capability contract. A provider implements that capability contract. A profile selects which provider implementation satisfies the contract for an app, environment, lifetime, role, and optional instance.

File (independent downstream Rawr repository): `apps/rawr/runtime/profiles/production.ts`  
Layer: app-owned runtime profile selection  
Exactness: normative for the `providers` field, app ownership,
config-source-binding mechanism, direct resource/provider public imports, and
generic `providerSelection({ resource, provider, config })` calls; illustrative
for the Rawr profile id, selected providers and resources, config sources and
keys, provider names, and non-`@habitat-ai/sdk` imports.

The concrete config source/ref object spellings below are illustrative
dependency examples, not implementable binding grammar. Task 4.7a must freeze
their exact closed unions, precedence, and key semantics before task 4.8; this
example fixes only profile ownership and the config-source-binding relation.

```ts
import {
  defineRuntimeProfile,
  providerSelection,
} from "@habitat-ai/sdk/runtime/profiles";
import { ClockResource } from "@habitat-ai/resource-clock";
import { systemClockProvider } from "@habitat-ai/resource-clock/providers/system";
import { EmailSenderResource } from "@habitat-ai/resource-email";
import { resendEmailProvider } from "@habitat-ai/resource-email/providers/resend";
import { InngestClientResource } from "@habitat-ai/resource-inngest";
import { cloudInngestProvider } from "@habitat-ai/resource-inngest/providers/cloud";
import { LoggerResource } from "@habitat-ai/resource-logger";
import { openTelemetryLoggerProvider } from "@habitat-ai/resource-logger/providers/open-telemetry";
import { SqlPoolResource } from "@habitat-ai/resource-sql";
import { postgresSqlProvider } from "@habitat-ai/resource-sql/providers/postgres";

export const productionProfile = defineRuntimeProfile({
  id: "rawr.production",
  providers: [
    providerSelection({
      resource: ClockResource,
      provider: systemClockProvider,
    }),
    providerSelection({
      resource: LoggerResource,
      provider: openTelemetryLoggerProvider,
      config: { from: "runtime-config", key: "telemetry" },
    }),
    providerSelection({
      resource: SqlPoolResource,
      provider: postgresSqlProvider,
      config: { from: "runtime-config", key: "sql.primary" },
    }),
    providerSelection({
      resource: EmailSenderResource,
      provider: resendEmailProvider,
      config: { from: "runtime-config", key: "email.primary" },
    }),
    providerSelection({
      resource: InngestClientResource,
      provider: cloudInngestProvider,
      config: { from: "runtime-config", key: "inngest.primary" },
    }),
  ],
  configSources: [
    { kind: "env" },
    { kind: "file", path: "runtime.production.json", optional: true },
  ],
});
```

The direct resource contract face and direct provider public face are the two
inputs to the generic SDK `providerSelection(...)` helper. Its output populates
the profile's `providers` field.

The clock, logger, SQL, email, and Inngest packages in this Rawr profile are
generic reusable Habitat platform resources and providers. Rawr owns only this
profile's selection, config bindings, and app-level defaults. It does not own
or rename those contracts or provider implementations. Rawr services and
plugins remain application source under `@rawr`.

Complete runtime derivation derives normalized `ProviderSelection` artifacts
from the profile through `@habitat-ai/sdk/runtime/derivation`; the foundational
`NormalizedRuntimeTopology` does not contain provider selection. The runtime
compiler validates provider coverage and provider dependency closure.
Bootgraph receives ordering-only provider input. The provisioning kernel loads
and validates config, supplies full validated provider-local config to
acquisition and release, acquires selected providers, and applies
provider-owned redaction metadata to owner-local findings or definition-owned
observation records. Runtime observation alone projects diagnostic, telemetry,
topology, and catalog types.

### 10.3 Entrypoint

Entrypoints start processes.

`startApp(...)` is the canonical app start operation. It receives selected app
definition, runtime profile, process roles, and optional process/harness
selection facts. The terminal SDK exposes it, `runtime-mounting` implements its
live coordination over the complete private graph, and `runtime-definition`
owns only the cold declarations and selection inputs. It starts one process.

File (independent downstream Rawr repository): `apps/rawr/server.ts`  
Layer: entrypoint authoring  
Exactness: normative for `startApp(...)` as the only start verb and for the
fields that select one process-role set; illustrative for the Rawr entrypoint
id, profile, and selected role set.

```ts
import { startApp } from "@habitat-ai/sdk/app";
import { rawrApp } from "./rawr.app";
import { productionProfile } from "./runtime/profiles/production";

await startApp(rawrApp, {
  entrypointId: "rawr.server",
  profile: productionProfile,
  roles: ["server"],
});
```

File (independent downstream Rawr repository): `apps/rawr/dev.ts`  
Layer: cohosted entrypoint authoring  
Exactness: normative for cohosted process shape as explicit role selection in
one process rather than semantic reclassification; illustrative for the Rawr
entrypoint id, profile, and selected role set.

```ts
import { startApp } from "@habitat-ai/sdk/app";
import { rawrApp } from "./rawr.app";
import { localProfile } from "./runtime/profiles/local";

await startApp(rawrApp, {
  entrypointId: "rawr.dev",
  profile: localProfile,
  roles: ["server", "async", "web", "agent", "desktop"],
});
```

The entrypoint does not redefine what belongs to the app. It selects which role slices start in this process. App membership, provider selection, execution ownership, and process shape remain distinct facts.

An entrypoint filename names its mount or process role. A surface suffix such
as `<name>.mcp.ts` is valid only when that entrypoint is intentionally a single
surface mount. An entrypoint that mounts several plugin surfaces must use its
mount or role identity rather than masquerading as one selected surface.

An entrypoint must not construct `ManagedRuntime`, call raw Effect runtime APIs, run `HabitatEffect` programs directly, construct effect-oRPC adapters, or bypass `startApp(...)` to mount service/plugin execution manually.

## 11. Service runtime boundary contract

The detailed work-items, billing, and entitlements packages in §§11-12 are
reference application source in the independent downstream Rawr repository.
Their `@rawr/services/*` and
`@rawr/plugins/*` identities, domain choices, and bodies are illustrative; the
`Exactness` annotations identify the generic Habitat contracts they exercise.

### 11.1 Service ownership

Services govern domains.

A service is a domain capability boundary. It owns the domain contracts, invariants, schemas, migrations, repositories, domain policy, and authoritative write access for the domain state it governs.

Services are transport-neutral and placement-neutral. API, workflow, process, CLI, web, agent, or desktop placement does not change service species.

A service may declare dependencies on runtime resources, sibling services, semantic adapters, config, scope, and invocation context. Those dependencies may have runtime lifecycle, but the service does not provision or release them. The runtime binds and provisions them from app-selected providers and compiled plans.

A service does not own public API projection, internal API projection, async
workflow execution, command projection, web projection, agent projection,
desktop projection, app membership, provider selection, process placement,
harness mounting, raw Effect runtime construction, or a custom Effect-oRPC
runner. It authors native `.handler(...)` operations for synchronous/Promise
work and official `.effect(...)` operations for Effect work. It does not import
`handlerGen(...)` directly and never becomes an Effect Context service or
`Layer` node.

### 11.2 Service package boundary

This specification defines the runtime-visible service-boundary mechanics and
handoff artifacts. It does not own service-private implementation detail.

A service package produces:

File: `specification://runtime-realization/service-package-produces.txt`  
Layer: service/runtime boundary  
Exactness: normative for runtime-visible service outputs.

```text
service definitions
callable contracts
dependency declarations
runtime-carried lane schemas
service binding inputs
native oRPC operations using handler or the official Effect bridge
service boundary exports
```

Runtime realization owns:

File: `specification://runtime-realization/runtime-owns-service-handoff.txt`  
Layer: service/runtime boundary  
Exactness: normative for runtime-owned responsibilities.

```text
derivation consumption
runtime compilation
provider acquisition
service binding
service binding cache
compiled execution plans
execution registry for non-oRPC process lanes
ProcessExecutionRuntime for non-oRPC process lanes
EffectRuntimeAccess for non-oRPC process lanes
application/process-owned oRPC effect/context and effect/wrap
ManagedRuntimeHandle
adapter lowering
harness handoff
diagnostics
telemetry correlation
deterministic finalization
```

The companion service-package specification owns service-private files, repository implementation, provided-context middleware API, service observability middleware, analytics middleware, module-local context projection, and service-internal gates.

The service package root exports boundary surfaces only. It must not export repositories, migrations, module internals, service-private schemas, service-private middleware, Effect internals, or runtime provider internals.

A realistic service may have multiple internal modules without changing
species. Runtime sees boundary contracts, dependency declarations, lane
schemas, native oRPC operations, and the context/wrap hooks needed by the
official bridge. It does not translate service operation bodies into Habitat
Effect execution descriptors.

The exact service-private topology belongs to the companion service-package
specification and the closed Habitat service blueprint. This runtime
specification deliberately does not repeat an illustrative internal tree that
could become a second structural authority. In particular, no generic
`shared/` directory is part of the service model.

### 11.3 Context lanes and service context projection

The canonical service lanes are:

| Lane | Owner | Runtime status |
| --- | --- | --- |
| `deps` | Service declaration, satisfied by runtime binding | Construction-time |
| `scope` | Service declaration, supplied by app/plugin binding policy | Construction-time |
| `config` | Service declaration, supplied by runtime config/profile | Construction-time |
| `invocation` | Service declaration, supplied per call by caller/harness | Per-call |
| `provided` | Service middleware/module composition | Execution-derived |

Service binding is construction-time over `deps`, `scope`, and `config`. Invocation does not participate in construction-time binding and never participates in `ServiceBindingCacheKey`.

Runtime and package boundaries may initialize the empty `provided` carrier. Only service middleware may add semantic `provided.*` values.

File: `specification://runtime-realization/provided-carrier.ts`  
Layer: service context lane law  
Exactness: normative for boundary initialization and semantic provided ownership.

```ts
const serviceBoundaryContext = {
  deps,
  scope,
  config,
  invocation,
  provided: {},
};
```

The following is invalid at runtime/package boundary because it seeds semantic `provided.*` values outside service middleware:

File: `specification://runtime-realization/invalid-provided-seeding.ts`  
Layer: service context lane law  
Exactness: normative invalid example.

```ts
const serviceBoundaryContext = {
  deps,
  scope,
  config,
  invocation,
  provided: {
    repo,
    sql,
    actor,
  },
};
```

Runtime depends on `ServiceBoundaryContext`. Procedure bodies may receive a service-projected context after service/module middleware. Projection is service-internal ergonomics. It does not alter runtime binding identity.

File: `packages/core/sdk/src/service/procedure-context.ts`  
Layer: SDK service procedure context  
Exactness: normative for boundary/projected context split; illustrative for generic spelling.

```ts
export interface ServiceBoundaryContext<TDeps, TScope, TConfig, TInvocation, TProvided> {
  readonly deps: TDeps;
  readonly scope: TScope;
  readonly config: TConfig;
  readonly invocation: TInvocation;
  readonly provided: TProvided;
}

export interface ServiceProcedureExecutionContext<
  TInput,
  TProjectedContext,
  TServiceBoundaryContext extends ServiceBoundaryContext<any, any, any, any, any>,
  TErrors,
> {
  readonly input: TInput;

  readonly context: TProjectedContext & {
    readonly serviceBoundary: TServiceBoundaryContext;
  };

  readonly telemetry: BoundaryTelemetry;
  readonly errors: TErrors;
  readonly execution: EffectBoundaryContext;
}
```

Canonical lanes are stable boundary truth. Module projection is service-internal Effect ergonomics. Projection may not overwrite reserved lane names. Projection may not become a package boundary input. Projection belongs to service/package middleware composition, not runtime binding.

The term `RuntimeProvider` is reserved for runtime resources. Service-side middleware that adds values under `context.serviceBoundary.provided.*` is provided-context middleware.

### 11.4 Dependency helper rules

`resourceDep(...)` declares a dependency on a provisionable host capability. It does not construct providers.

`serviceDep(...)` declares a service-to-service client dependency. It does not import sibling service internals and is not selected through a runtime profile.

`semanticDep(...)` names an explicit semantic adapter dependency. It is not a runtime resource, not a provider selection, and not a sibling repository import.

### 11.5 `defineService(...)`

`defineService(...)` declares service identity, dependency lanes, runtime-carried schemas for scope/config/invocation, metadata defaults, service-owned policy vocabulary, and service-local oRPC authoring helpers.

File: `services/work-items/src/service/base.ts`  
Layer: service authoring, domain authority  
Exactness: normative for lane names, dependency helpers, and `RuntimeSchema` use for runtime-carried lanes; illustrative for exact generic spelling and non-`@habitat-ai/sdk` imports.

```ts
import {
  defineService,
  resourceDep,
  serviceDep,
  semanticDep,
  type ServiceOf,
} from "@habitat-ai/sdk/service";
import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";
import { Type } from "typebox";

import { ClockResource } from "@habitat-ai/resource-clock";
import { LoggerResource } from "@habitat-ai/resource-logger";
import { SqlPoolResource } from "@habitat-ai/resource-sql";

export const WorkItemsScopeSchema = RuntimeSchema.fromTypeBox(
  Type.Object({
    workspaceId: Type.String({
      minLength: 1,
      description: "Workspace whose work items this binding may access.",
    }),
  }),
);

export const WorkItemsConfigSchema = RuntimeSchema.fromTypeBox(
  Type.Object({
    readOnly: Type.Boolean({
      description: "Whether the service binding refuses writes.",
    }),
    limits: Type.Object({
      maxAllocationsPerItem: Type.Integer({
        minimum: 1,
        description: "Maximum allocations admitted for one work item.",
      }),
    }, {
      description: "Limits applied by work-item policy.",
    }),
  }),
);

export const WorkItemsInvocationSchema = RuntimeSchema.fromTypeBox(
  Type.Object({
    traceId: Type.String({
      description: "Trace identity propagated across this invocation.",
    }),
    actorId: Type.Optional(Type.String({
      description: "Actor identity when the caller supplies one.",
    })),
  }),
);

export const service = defineService({
  id: "work-items",

  deps: {
    dbPool: resourceDep(SqlPoolResource),
    clock: resourceDep(ClockResource),
    logger: resourceDep(LoggerResource),
  },

  scope: WorkItemsScopeSchema,
  config: WorkItemsConfigSchema,
  invocation: WorkItemsInvocationSchema,

  metadataDefaults: {
    idempotent: true,
    domain: "work-items",
    audience: "internal",
    audit: "basic",
  },

  baseline: {
    policy: {
      events: {
        readOnlyRejected: "work-items.policy.read_only_rejected",
        allocationLimitReached: "work-items.policy.allocation_limit_reached",
      },
    },
  },
});

export type WorkItemsService = ServiceOf<typeof service>;

export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createServiceImplementer = service.createImplementer;
```

Foundational runtime derivation records `service.service`, `service.resource`,
and `service.semantic` edges in `NormalizedRuntimeTopology` and refuses a
`service.service` cycle. Complete derivation incorporates those edges,
runtime-carried schemas, metadata, and boundary identity into
`NormalizedAuthoringGraph` through
`@habitat-ai/sdk/runtime/derivation`, then produces `ServiceBindingPlan`
artifacts and resource requirements. The runtime compiler resolves each
derived plan into a `CompiledServiceBindingPlan`. The process runtime uses only
the compiled plan to construct live service clients.

### 11.6 Service procedure implementation terminal

Service procedures retain the native oRPC implementer. Native
`.handler(...)` is valid for synchronous and Promise-returning operations. An
Effect-backed operation uses the official `.effect(...)` extension installed
once by the implementation owner in `src/service/impl.ts`. Direct
`handlerGen(...)` imports are not an authoring option. Habitat MUST NOT create a
`HabitatServiceProcedureImplementer`, translate the operation into
`HabitatEffect`, or execute it through `ProcessExecutionRuntime`.

File: `node_modules/@orpc/experimental-effect/dist/extensions/effect.mjs`  
Layer: exact published Effect-oRPC service authoring extension  
Exactness: normative for official `.effect(...)` authoring and its delegation
to the vendor bridge; the shared vendor source remains authoritative for
`effect/context`, `effect/wrap`, request signal, Cause mapping, and returned
Promise mechanics.

Canonical Effect-backed examples use `.effect(function*)`. Plain handlers use
`.handler(...)` and do not require the bridge package.

File: `services/work-items/src/service/modules/items/router/create.ts`  
Layer: service module procedure implementation  
Exactness: normative for official `.effect(function*)` and native Effect;
illustrative for service-internal context projection, repository shape, module
names, and business body.

```ts
import { Effect } from "effect";
import { module } from "../module";

export const create = module.create.effect(function* ({ input, context, errors }) {
  if (input.title.trim().length === 0) {
    return yield* Effect.fail(
      errors.INVALID_WORK_ITEM_TITLE({
        data: { title: input.title },
      }),
    );
  }

  return yield* context.repo.insert({
    workspaceId: context.workspaceId,
    title: input.title.trim(),
    description: input.description,
    createdAt: context.clock.nowIso(),
  });
});
```

Read-only or cross-cutting service policy should be middleware-driven from metadata. Procedure-local checks are allowed when they represent procedure-specific behavior, not duplicated global policy.

### 11.7 Service callable contracts

Service callable contracts are service-owned schema-backed contracts. They may be expressed through oRPC primitives. oRPC owns procedure and transport mechanics; the service owns the meaning.

File: `services/work-items/src/service/modules/items/contract/create.ts`  
Layer: service-owned callable contract  
Exactness: normative for schema-backed input, output, and error-data contracts; illustrative for exact oRPC chaining syntax and module placement.

```ts
import { schema } from "@habitat-ai/sdk/service/schema";
import { ocBase } from "../../../base";
import { WorkItemSchema, CreateWorkItemInputSchema, InvalidTitleErrorDataSchema } from "../model/dto";
import { READ_ONLY_MODE, RESOURCE_NOT_FOUND } from "../../../model/errors";

export const contract = {
  create: ocBase
    .meta({ idempotent: false, entity: "item", audit: "full" })
    .input(CreateWorkItemInputSchema)
    .output(WorkItemSchema)
    .errors({
      READ_ONLY_MODE,
      INVALID_WORK_ITEM_TITLE: {
        status: 400,
        message: "Invalid work item title",
        data: InvalidTitleErrorDataSchema,
      },
    }),

  get: ocBase
    .meta({ idempotent: true, entity: "item", audit: "basic" })
    .input(schema.object({ id: schema.uuid() }))
    .output(WorkItemSchema)
    .errors({ RESOURCE_NOT_FOUND }),
};
```

Application/process composition lowers service lanes into native oRPC context,
including `effect/context` and optional `effect/wrap` for Effect-backed
operations. SDK service helpers remain public type/composition facades and do
not implement a runner. This handoff does not transfer service domain authority
to oRPC or runtime.

### 11.8 Service clients

Inside Habitat-managed application execution, injected service clients are Effect-facing. Promise-facing clients are for external/generated clients, adapter internals, tests that deliberately cross external boundaries, or other execution contexts outside the Habitat runtime bridge.

The service binding cache remains construction-time over `deps`, `scope`, and `config`. Invocation-bound Effect clients are per-call views over construction-bound service bindings.

`ServiceUse` is the sole cold plugin-to-service relation. Its string-keyed
public record contains only `kind: "service.use"`, `serviceId`, and optional
`serviceInstance`. The optional instance is present only for a genuinely
distinct selected service instance; it is not a cosmetic alias.

File: `packages/core/runtime/definition/src/service.ts`  
Layer: private `runtime-definition` service-use contract exposed through the SDK service face  
Exactness: normative for public fields, private carrier behavior, TypeScript inference, and the absence of alias or public definition/contract payloads; illustrative for the private symbol spelling.

```ts
declare const serviceUseCarrier: unique symbol;

interface ServiceUseCarrier<TContract> {
  readonly definition: ServiceDefinition;
  readonly contract: TContract;
}

export interface ServiceUse<TContract = unknown> {
  readonly kind: "service.use";
  readonly serviceId: string;
  readonly serviceInstance?: string;
  readonly [serviceUseCarrier]: ServiceUseCarrier<TContract>;
}

export function useService<const TContract>(
  serviceDefinition: ServiceDefinition,
  options: {
    readonly contract: TContract;
    readonly instance?: string;
  },
): ServiceUse<TContract>;

export type ServiceUses = Readonly<Record<string, ServiceUse<unknown>>>;

export type ServiceContractOf<TUse> =
  TUse extends ServiceUse<infer TContract> ? TContract : never;
```

`useService(...)` attaches the exact service definition and contract through
the unexported symbol before freezing the declaration. The symbol property is
non-enumerable and is available only through private runtime-owner accessors;
the SDK does not export the symbol or a value-level accessor. Therefore the
public record has no `service`, `definition`, `contract`, `__contract`, or
`alias` payload while `ServiceContractOf` still preserves exact client
inference.

File: `packages/core/sdk/src/service/service-client.ts`  
Layer: SDK service client execution shape  
Exactness: normative for separation between internal Effect execution and external Promise interop.

```ts
export interface ConstructionBoundServiceClient<TContract> {
  readonly kind: "service.client.construction-bound";
  readonly serviceId: string;

  withInvocation(input: {
    invocation: unknown;
  }): InvocationBoundEffectServiceClient<TContract>;
}

export type InvocationBoundEffectServiceClient<TContract> = ServiceClientMapped<
  TContract,
  "effect"
>;

export type ConstructionBoundServiceClients<
  TServiceUses extends ServiceUses,
> = {
  readonly [K in keyof TServiceUses]: ConstructionBoundServiceClient<
    ServiceContractOf<TServiceUses[K]>
  >;
};

export type InvocationBoundEffectServiceClients<
  TServiceUses extends ServiceUses,
> = {
  readonly [K in keyof TServiceUses]: InvocationBoundEffectServiceClient<
    ServiceContractOf<TServiceUses[K]>
  >;
};

export interface ExternalPromiseServiceClient<TContract> {
  readonly kind: "service.client.external-promise";
  readonly serviceId: string;
  readonly procedures: ExternalPromiseProcedureMap<TContract>;
}
```

`ServiceClientsOf`-style lane context types are projected statically by SDK type contracts from the plugin `services` map authored with `useService(...)`. Contexts that still need to supply per-call invocation data receive `ConstructionBoundServiceClients<TServiceUses>` and call `.withInvocation(...)`. Contexts whose bridge has already applied invocation data receive `InvocationBoundEffectServiceClients<TServiceUses>` and call service procedures directly. This is type-level backing for `context.clients.workItems`; it is not dynamic service lookup and does not expose broader runtime access.

Owner-authored execution bodies managed by Habitat compose Effect-facing service clients:

File: `specification://runtime-realization/internal-effect-client-example.ts`  
Layer: service client execution law  
Exactness: normative for internal Habitat-managed execution.

```ts
const item = yield* context.deps.workItems.items.get({
  id: input.itemId,
});
```

External/generated Promise clients may exist outside Habitat-managed execution:

File: `specification://runtime-realization/external-promise-client-example.ts`  
Layer: external client interop  
Exactness: normative as external/client interop only.

```ts
const item = await externalWorkItemsClient.procedures.items.get(
  { id: input.itemId },
  { invocation: { traceId } },
);
```

A Promise-facing client must not be injected as a peer execution choice inside owner-authored service, plugin, resource, or provider execution bodies managed by the Habitat runtime.

### 11.9 Service-to-service dependency through `serviceDep(...)`

A service may depend on a sibling service by declaring a service dependency. A service dependency is not a runtime resource and is not selected through a runtime profile.

File: `services/user-accounts/src/service/base.ts`  
Layer: service authoring with sibling service dependencies  
Exactness: normative for `serviceDep(...)` and construction-time service dependency lane; illustrative for service names and non-`@habitat-ai/sdk` imports.

```ts
import { defineService, resourceDep, serviceDep } from "@habitat-ai/sdk/service";
import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";
import { Type } from "typebox";

import { SqlPoolResource } from "@habitat-ai/resource-sql";
import { service as BillingService } from "@rawr/services/billing";
import { service as EntitlementsService } from "@rawr/services/entitlements";

export const service = defineService({
  id: "user-accounts",

  deps: {
    dbPool: resourceDep(SqlPoolResource),
    billing: serviceDep(BillingService),
    entitlements: serviceDep(EntitlementsService),
  },

  scope: RuntimeSchema.fromTypeBox(Type.Object({
    workspaceId: Type.String({
      description: "Workspace whose user accounts this binding may access.",
    }),
  })),

  config: RuntimeSchema.fromTypeBox(Type.Object({
    allowSelfService: Type.Boolean({
      description: "Whether users may change their own account settings.",
    }),
  })),

  invocation: RuntimeSchema.fromTypeBox(Type.Object({
    traceId: Type.String({
      description: "Trace identity propagated across this invocation.",
    }),
  })),
});
```

Foundational runtime derivation emits `service.service` dependency edges and
refuses cycles before complete authoring-graph derivation. The runtime compiler
consumes that already-acyclic topology and constructs the compiled service
binding DAG. The process runtime binds billing and entitlements clients before
constructing the user-accounts binding.

A service does not import sibling repositories, module routers, module schemas, migrations, service-private middleware, or service-private provider helpers.

### 11.10 Boundary errors and telemetry

oRPC owns declared caller errors. Effect owns the local failure channel. Habitat owns the bridge and diagnostics.

Expected business states may remain values. Procedures convert caller-actionable states into declared boundary errors. Unexpected internals are not typed caller errors by default. Internal failures produce diagnostics and internal/undefined caller errors unless explicitly mapped.

File: `services/work-items/src/service/modules/items/router-error-example.ts`  
Layer: service boundary error bridge  
Exactness: normative for declared error failure through Effect; illustrative for service-internal module placement.

```ts
import { Effect } from "@habitat-ai/sdk/effect";

export const get = module.get.effect(function* ({ input, context, errors }) {
  const item = yield* context.repo.findById({
    workspaceId: context.workspaceId,
    id: input.id,
  });

  if (!item) {
    return yield* Effect.fail(
      errors.RESOURCE_NOT_FOUND({
        data: { entity: "WorkItem", id: input.id },
      }),
    );
  }

  return item;
});
```

Runtime/host owns telemetry bootstrap and correlation. Service/plugin packages own semantic observability enrichment. Product analytics is explicit resource/sink dependency when needed, not a hidden universal baseline.

## 12. Plugin authoring contract

### 12.1 Plugin ownership

Plugins project capabilities.

A plugin is a lane projection boundary. It projects underlying capabilities into exactly one role/surface/capability lane. The underlying capability may be service-owned domain capability, workflow dispatch capability, host/native capability, agent/shell capability, desktop capability, web/client capability, or another runtime-authorized capability.

A plugin owns the lane-native contract, caller shape, boundary policy, authentication/authorization/redaction/transformation, service/resource use declarations, executable boundary, and native mount facts for that lane.

A plugin does not own the underlying domain authority, provider implementation, app membership, provider selection, runtime acquisition, or native host runtime.

### 12.2 `PluginDefinition` and `PluginFactory`

A plugin package exports one canonical `PluginFactory`. That factory is import-safe, runs at app composition time, acquires no resources, and returns exactly one `PluginDefinition`.

Grouped plugin helpers may exist for ergonomics. Grouped plugins are not a runtime architecture kind. They are not used for identity, topology, diagnostics, app composition authority, service binding, or harness mounting.

File: `packages/core/runtime/definition/src/plugin.ts`  
Layer: private `runtime-definition` plugin contract exposed through the SDK facade  
Exactness: normative for owner, producer/consumer, and fields; illustrative for generic spelling.

```ts
export type PluginFactoryArgs<TOptions> =
  [TOptions] extends [void] ? [] : [options: TOptions];

export interface PluginFactory<
  TOptions = void,
  TDefinition extends PluginDefinition = PluginDefinition,
> {
  (...args: PluginFactoryArgs<TOptions>): TDefinition;
}

export interface PluginDefinition<
  TRole extends AppRole = AppRole,
  TSurface extends string = string,
  TCapability extends string = string,
> {
  readonly kind: "plugin.definition";
  readonly id: string;
  readonly role: TRole;
  readonly surface: TSurface;
  readonly capability: TCapability;
  readonly instance?: string;
  readonly services: ServiceUses;
  readonly resourceRequirements: readonly ResourceRequirement[];
  readonly project: PluginProjectionFunction;
}
```

Most authors use lane-specific builders. The generic shape is private `runtime-definition` scaffolding exposed through the SDK, not normal plugin DX.

A plugin exports one `createPlugin` factory, is import-safe, declares service uses through `useService(...)`, declares resource requirements where needed, owns lane-native projection facts, owns projection-local caller and boundary policy, never owns service domain authority, never acquires providers, never selects app membership, and never constructs raw runtime objects. No-option plugin factories are invoked as `createPlugin()`. Optioned plugin factories are invoked as `createPlugin(options)`.

Plugin declarations may produce Effect execution descriptors. They do not execute effects at declaration time.

### 12.3 Topology and builder agreement

Public server API, trusted server internal, async, CLI, web, agent, desktop, and shell projection status is implied by topology plus matching builder. No generic projection-classification object declares status.

| Topology | Matching builder family | Projection |
| --- | --- | --- |
| `plugins/server/api/<capability>` | `defineServerApiPlugin(...)` | Public server API projection |
| `plugins/server/internal/<capability>` | `defineServerInternalPlugin(...)` | Trusted first-party/internal server API projection |
| `plugins/async/workflows/<capability>` | Workflow projection builder | Durable workflow projection |
| `plugins/async/schedules/<capability>` | Schedule projection builder | Durable scheduled projection |
| `plugins/async/consumers/<capability>` | Consumer projection builder | Durable consumer projection |
| `plugins/cli/topics/<topic>` | CLI topic projection builder | Oclif command projections |
| `plugins/web/app/<capability>` | Web app projection builder | Web surface projection |
| `plugins/agent/channels/<capability>` | Agent channel projection builder | Agent channel projection |
| `plugins/agent/shell/<capability>` | Agent shell projection builder | OpenShell projection |
| `plugins/agent/tools/<capability>` | Agent tool projection builder | Agent tool projection |
| `plugins/desktop/menubar/<capability>` | Desktop menubar projection builder | Desktop menubar projection |
| `plugins/desktop/windows/<capability>` | Desktop window projection builder | Desktop window projection |
| `plugins/desktop/background/<capability>` | Desktop background projection builder | Desktop background projection |

Path and builder mismatch is a structural error.

Route, command, function, shell, and native mount facts are builder-specific surface facts. They do not encode public/internal projection status. App selection and harness publication policy may select, mount, publish, or generate artifacts for already-classified projections. They do not reclassify a plugin projection.

Plugin authoring fields named `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind` are invalid when used to declare or reclassify projection status. A `kind` field remains valid only for non-projection discriminants such as `kind: "plugin.definition"`.

A capability that needs both public and trusted internal callable surfaces authors two projection packages.

### 12.4 `useService(...)`

Plugin authoring uses `useService(serviceDefinition, { contract, instance? })`
to produce `ServiceUse<TContract>`, the sole cold plugin-to-service relation.
The key in a plugin's `services` map names the client property available in lane
context. It is not copied into `ServiceUse` and is never a service alias,
service identity, binding identity, or instance identity. Canonical service
identity comes from `serviceId`; optional `serviceInstance` is derived from the
helper's `instance` option and names only a genuinely distinct selected
instance.

`ServiceUse` does not carry a public service definition, contract, client,
binding, callback, or any of the five service context lanes. Its private
non-enumerable symbol carrier retains the exact definition and contract for
private runtime owners, while `ServiceContractOf` gives SDK type contracts
static lane-context client inference from the same `services` map.

Runtime derivation resolves that private carrier and lowers each selected
`ServiceUse` into a `ServiceBindingPlan`. The runtime compiler resolves the
derived plan into a `CompiledServiceBindingPlan`. Only the process runtime uses
the compiled plan with live `RuntimeAccess` to bind and cache the selected
client. The plugin projection function remains cold and returns route, command,
tool, or async descriptors; it never binds a client itself.

Server, CLI, agent, and similar request contexts receive construction-bound
clients when the author must call `.withInvocation(...)`; async step contexts
receive invocation-bound clients after the step bridge has applied invocation
identity.

File: `plugins/server/api/work-items/src/plugin.ts`  
Layer: public server API plugin authoring  
Exactness: normative for `plugins/server/api/*` plus `defineServerApiPlugin(...)` classification and `useService(...)`; illustrative for route base, function names, and non-`@habitat-ai/sdk` imports.

```ts
import {
  defineServerApiPlugin,
  useService,
} from "@habitat-ai/sdk/plugins/server";

import {
  contract as WorkItemsContract,
  service as WorkItemsService,
} from "@rawr/services/work-items";
import { createWorkItemsPublicRouter } from "./router";

export const createPlugin = defineServerApiPlugin.factory()({
  capability: "work-items",
  routeBase: "/work-items",

  services: {
    workItems: useService(WorkItemsService, { contract: WorkItemsContract }),
  },

  api() {
    return createWorkItemsPublicRouter();
  },
});
```

The plugin owns public API projection. The service owns work-item domain authority. Elysia owns HTTP host mechanics. oRPC owns procedure mechanics.

### 12.5 Server API plugin

A `plugins/server/api/<capability>` package uses `defineServerApiPlugin(...)`. Its public server API projection status comes from topology and builder, not a field.

File: `plugins/server/api/work-items/src/_tree.txt`  
Layer: public server API topology  
Exactness: normative for the public-server-API lane root and its agreement with
`defineServerApiPlugin(...)`; illustrative for the N > 1 private decomposition
and exact filenames. The server API plugin blueprint owns the closed interior.

```text
plugins/server/api/work-items/
  src/
    index.ts
    plugin.ts
    contract.ts
    router.ts
```

Server API routes retain the native oRPC implementer. Synchronous or Promise
routes use native `.handler(...)`; Effect-backed routes use the official
`.effect(...)` extension installed once by the implementation owner. Habitat
MUST NOT publish or implement a `HabitatServerApiRouteImplementer.effect`
imitation. Application/process composition supplies a native
`WithEffectContext`-compatible context containing `effect/context` and optional
`effect/wrap`; the official bridge consumes it.

File: `node_modules/@orpc/experimental-effect/dist/shared/experimental-effect.C9oJcd5q.mjs`  
Layer: exact published native Effect-oRPC bridge mechanics  
Exactness: normative for beta.23 internal bridge mechanics, context/wrap order,
signal forwarding, Cause mapping, and Promise ownership; not an authoring import.

File: `plugins/server/api/work-items/src/router.ts`  
Layer: public server API projection router  
Exactness: normative for official `.effect(function*)`, invocation-bound service
client creation, declared plugin error mapping, and Effect-facing service
boundary calls; illustrative for public API body details.

```ts
import { Effect } from "effect";
import { implementServerApiPlugin } from "@habitat-ai/sdk/plugins/server";

import { workItemsPublicApiContract } from "./contract";

const os = implementServerApiPlugin(workItemsPublicApiContract, {
  pluginId: "server.api.work-items",
});

export function createWorkItemsPublicRouter() {
  return os.router({
    create: os.create.effect(function* ({ input: payload, context, execution, errors }) {
      const actor = yield* context.request.requireActor();

      if (!actor.canCreateWorkItems) {
        return yield* Effect.fail(
          errors.FORBIDDEN({
            data: { reason: "actor_cannot_create_work_items" },
          }),
        );
      }

      const workItems = context.clients.workItems.withInvocation({
        invocation: {
          traceId: execution.traceId,
          actorId: actor.id,
        },
      });

      return yield* workItems.items.create({
        title: payload.title,
        description: payload.description,
      });
    }),

    get: os.get.effect(function* ({ input: payload, context, execution }) {
      const workItems = context.clients.workItems.withInvocation({
        invocation: {
          traceId: execution.traceId,
        },
      });

      return yield* workItems.items.get({
        id: payload.id,
      });
    }),
  });
}
```

The public API plugin may redact, transform, authenticate, authorize, rate-limit, and publish public contracts. It does not own the domain invariant that determines whether a work item may be created.

Effect-oRPC remains native. SDK helpers may supply contracts, bound service
clients, and context/wrap composition, but they do not implement a second
runner. Habitat uses this bridge posture:

File: `specification://runtime-realization/native-effect-orpc-posture.txt`  
Layer: oRPC/effect-oRPC boundary law  
Exactness: normative.

```text
native .handler(...) for synchronous or Promise operation
or official .effect(function*) for Effect
  -> native oRPC validation and middleware
  -> application/process-owned effect/context and effect/wrap
  -> extension delegates to vendor-internal handlerGen
  -> vendor bridge forwards signal and owns runPromiseExit/Cause/Promise
  -> native oRPC result and transport
```

### 12.6 Trusted server internal plugin wrapping `WorkflowDispatcher`

A `plugins/server/internal/<capability>` package uses `defineServerInternalPlugin(...)`. It is eligible for trusted first-party RPC mounting and internal-client generation. It is not a public server API projection.

`WorkflowDispatcher` is runtime integration. When used inside a plugin-owned executable body managed by Habitat, dispatcher interop is supplied through invocation context and wrapped in Effect or a dispatcher Effect facade.

File: `plugins/server/internal/work-items-ops/src/router.ts`  
Layer: server internal plugin router  
Exactness: normative for internal projection wrapping `WorkflowDispatcher`
through official `.effect(...)`; illustrative for exact workflow names.

```ts
import { Effect } from "effect";
import { implementServerInternalPlugin } from "@habitat-ai/sdk/plugins/server";

import { workItemsOpsInternalContract } from "./contract";
import { WorkItemsSyncWorkflow } from "@rawr/plugins/async/workflows/work-items-sync";

const os = implementServerInternalPlugin(workItemsOpsInternalContract, {
  pluginId: "server.internal.work-items-ops",
});

export function createWorkItemsOpsRouter() {
  return os.router({
    triggerSync: os.triggerSync.effect(function* ({ input: payload, context }) {
      return yield* Effect.tryPromise({
        try: () =>
          context.workflows.send(WorkItemsSyncWorkflow, {
            itemId: payload.itemId,
            requestedBy: payload.actorId,
          }),
        catch: (cause) =>
          new WorkflowDispatchBoundaryError({
            workflowId: WorkItemsSyncWorkflow.id,
            cause,
          }),
      });
    }),
  });
}
```

The dispatcher remains durable async integration, not local Effect orchestration.

### 12.7 Async workflow plugin with step-local Effect execution

Workflow, schedule, and consumer plugins project durable async definitions.
They do not expose caller-facing product APIs by themselves. Server
API/internal projections may wrap dispatcher event admission.

File: `plugins/async/workflows/work-items-sync/src/plugin.ts`  
Layer: async workflow plugin authoring  
Exactness: normative for async workflow projection package and service-use declaration.

```ts
import {
  defineAsyncWorkflowPlugin,
  useService,
} from "@habitat-ai/sdk/plugins/async";

import {
  contract as WorkItemsContract,
  service as WorkItemsService,
} from "@rawr/services/work-items";
import { WorkItemsSyncWorkflow } from "./workflows/sync-work-item";

export const createPlugin = defineAsyncWorkflowPlugin.factory()({
  capability: "work-items-sync",

  services: {
    workItems: useService(WorkItemsService, { contract: WorkItemsContract }),
  },

  workflows: [
    WorkItemsSyncWorkflow,
  ],
});
```

Async step-local Effect execution must be mounted through the Inngest step boundary. Step-local executable bodies are declared as cold descriptors at module scope; the native workflow `run` function only invokes selected descriptors through the step bridge.

File: `plugins/async/workflows/work-items-sync/src/workflows/sync-work-item.ts`  
Layer: async step-local Effect execution  
Exactness: normative for Inngest durability and Effect local execution split; illustrative for helper spelling and workflow payload names.

```ts
import {
  defineAsyncStepEffect,
  stepEffect,
} from "@habitat-ai/sdk/plugins/async/effect";

export const SyncWorkItemStep = defineAsyncStepEffect({
  id: "sync-work-item",

  effect: function* ({ event, clients }) {
    const item = yield* clients.workItems.items.get({
      id: event.data.itemId,
    });

    if (item.status === "done") {
      return { skipped: true as const };
    }

    return yield* clients.workItems.items.sync({
      id: event.data.itemId,
      requestedBy: event.data.requestedBy,
    });
  },
});

export const WorkItemsSyncWorkflow = defineWorkflow({
  id: "work-items.sync",

  async run(ctx) {
    return await stepEffect(ctx).run(SyncWorkItemStep);
  },
});
```

The outer async function is native host interop. The step bridge lowers
`stepEffect(ctx).run(SyncWorkItemStep)` to native
`step.run(SyncWorkItemStep.id, callback)`, and that callback delegates the
pre-derived descriptor to `ProcessExecutionRuntime`. The step-local body is
Effect and is derivable before runtime mounting. Replay re-enters the native
function and `step.run(...)` registration rather than resuming a retained
Effect fiber. A completed memoized step returns native memoized state without
invoking the callback or `ProcessExecutionRuntime`; a failed or otherwise
un-memoized attempt invokes the callback anew. Cancellation is
observed between steps; the bridge invents no `AbortSignal` for an in-flight
step. The plugin owns workflow projection, its services own domain meaning, and
Inngest owns durability, retries, replay, schedules, workflow history, and
durable workflow execution semantics.

Schedules and consumers keep the same async ownership law. Cron strings and event names identify triggers only. Any read event data must have a schema-backed payload contract.

### 12.8 CLI topic plugin

CLI topic plugins live under `plugins/cli/topics/<topic>`. A topic groups the
commands and adjacent native Oclif contributions selected as one plugin. Oclif
owns command dispatch semantics. The topic plugin owns projection and command
bodies; the selecting app owns process composition. Habitat owns the CLI
authoring grammar, runtime bridge, and materialization handoff, not an
application topic's command implementation.

`@habitat-ai/cli` owns the foundational Habitat Oclif/Nx loader, CLI harness,
generators, initialization, and self-hosted Habitat commands/topics only. In
this detailed Rawr example, `plugins/cli/topics/work-items` and its command body
are Rawr application artifacts. They are materialized when selected by
`rawrApp` and do not become `@habitat-ai/cli` source. The CLI distribution never
wildcard-includes Rawr or other downstream topic trees.

File: `plugins/cli/topics/work-items/commands/create.ts`  
Layer: Rawr reference CLI command Effect authoring  
Exactness: normative for `defineCommand(...).effect(function*)`, invocation-bound service client creation, and service invocation lane separation; illustrative for command body.

```ts
import { defineCommand } from "@habitat-ai/sdk/plugins/cli/effect";
import { cliSchema } from "@habitat-ai/sdk/plugins/cli/schema";

export const CreateWorkItemArgsSchema = cliSchema.object({
  title: cliSchema.string({ minLength: 1 }),
  description: cliSchema.optional(cliSchema.string()),
});

export const CreateWorkItemCommand = defineCommand({
  id: "work-items.create",
  args: CreateWorkItemArgsSchema,

  effect: function* ({ args, clients, invocation }) {
    const actor = yield* invocation.requireOperator();

    const workItems = clients.workItems.withInvocation({
      invocation: {
        traceId: invocation.traceId,
        actorId: actor.id,
      },
    });

    return yield* workItems.items.create({
      title: args.title,
      description: args.description,
    });
  },
});
```

CLI commands do not import repositories, mutate databases directly, or acquire providers.

### 12.9 Agent tool plugin

Agent plugins live under `plugins/agent/channels/*`, `plugins/agent/shell/*`, and `plugins/agent/tools/*`. Agent tools call service boundaries, internal APIs, or runtime-authorized machine resources. They do not bypass service contracts for domain mutation and do not receive broad runtime access.

File: `plugins/agent/tools/work-items/src/tools.ts`  
Layer: agent tool Effect authoring  
Exactness: normative for `defineTool(...).effect(function*)`, invocation-bound service client creation, and service invocation lane separation; illustrative for tool body.

```ts
import { defineTool } from "@habitat-ai/sdk/plugins/agent/effect";
import { toolSchema } from "@habitat-ai/sdk/plugins/agent/schema";

export const CreateWorkItemToolInputSchema = toolSchema.object({
  title: toolSchema.string({ minLength: 1 }),
  description: toolSchema.optional(toolSchema.string()),
});

export const CreateWorkItemTool = defineTool({
  id: "work-items.create",
  description: "Create a work item through the work-items service.",
  input: CreateWorkItemToolInputSchema,

  effect: function* ({ input, clients, shell }) {
    const actor = yield* shell.requireTrustedOperator();

    const workItems = clients.workItems.withInvocation({
      invocation: {
        traceId: shell.traceId,
        actorId: actor.id,
      },
    });

    return yield* workItems.items.create({
      title: input.title,
      description: input.description,
    });
  },
});
```

Agent/OpenShell governance is a reserved boundary with locked integration hooks. Agent plugins do not acquire providers, do not expose unredacted runtime internals, and do not become a second business execution plane.

### 12.10 Desktop background plugin

Desktop plugins live under `plugins/desktop/menubar/*`, `plugins/desktop/windows/*`, and `plugins/desktop/background/*`. Desktop background loops are process-local. Durable business workflows remain on `async`.

File: `plugins/desktop/background/disk-status/src/background.ts`  
Layer: desktop background Effect authoring  
Exactness: normative for process-local pubsub and process-local desktop background execution; illustrative for disk-status body.

```ts
import { defineDesktopBackground } from "@habitat-ai/sdk/plugins/desktop/effect";

export const DiskStatusBackground = defineDesktopBackground({
  id: "disk-status.refresh",
  cadence: "60 seconds",

  effect: function* ({ resources, host }) {
    const filesystem = yield* resources.require(FileSystemResource);
    const pubsubHub = yield* resources.require(ProcessPubSubHubResource);

    const usage = yield* filesystem.diskUsageSummary();

    const diskStatusTopic = yield* pubsubHub.topic<typeof usage>({
      id: "desktop.disk-status",
      replay: "latest",
    });

    yield* diskStatusTopic.publish(usage);

    yield* host.setMenubarBadge({
      text: usage.percentUsed > 90 ? "!" : "",
    });
  },
});
```

Desktop background loops are process-local. They do not become durable async schedules. If status must survive restart or trigger durable work, it is routed to `async`.

### 12.11 Web app projection contract

Web app plugins live under `plugins/web/app/<capability>` and project generated clients or surface contracts into web surfaces. Web hosts own native rendering and bundling behavior. The plugin does not own server API publication.

File: `plugins/web/app/work-items-board/src/plugin.ts`  
Layer: web app projection authoring  
Exactness: normative for web lane and web projection boundary; illustrative for route module shape and non-`@habitat-ai/sdk` imports.

```ts
import { defineWebAppPlugin } from "@habitat-ai/sdk/plugins/web";

export const createPlugin = defineWebAppPlugin.factory()({
  capability: "work-items-board",

  routes: [
    {
      id: "work-items-board.index",
      path: "/work-items",
      module: () => import("./routes/work-items-board"),
    },
  ],
});
```

Web-local application execution uses Effect where the SDK provides web-local
execution grammar. The web plugin retains its projection and executable-body
authority. Browser rendering, bundling, framework routing, and client-side host
behavior remain web host concerns.

The preserved `module` loader is not an Effect executable body. Complete
runtime derivation assigns it a `WebRouteModuleRef` and retains the loader in a
distinct non-portable `WebRouteModuleTable`. Derivation does not invoke the
loader, the portable runtime plan carries neither the loader nor its ref, and
the Effect descriptor table and execution registry never receive it.

## 13. Resource, provider, and profile model

### 13.1 System model

Resources define runtime contracts. Providers implement runtime contracts. Profiles select supply.

The reusable clock, logger, SQL, email, and Inngest families used throughout
this specification are Habitat platform source and use illustrative Habitat
package identities such as `@habitat-ai/resource-clock` and
`@habitat-ai/resource-email`. A Rawr profile selects and configures their direct
public faces; it does not become their resource or provider owner.

Resources declare provisionable capability contracts and own closed provider
families. Each provider implements one contract and exposes one direct package
public face. Profiles import the resource and provider faces and select them
with generic `providerSelection({ resource, provider, config })`. Runtime
derivation derives resource requirements and provider selections behind the
SDK facade. The runtime compiler validates coverage and dependency closure.
Bootgraph emits deterministic order/rollback metadata; runtime-substrate-effect
alone provisions the selected providers.

Resource contracts are provider-neutral. Each provider owns its config type and
optional `RuntimeSchema` beside its implementation.

Resources may expose value operations that return `HabitatEffect`. Raw Effect imports remain forbidden in ordinary resource descriptor modules.

A `RuntimeResource` names a provisionable capability contract consumed by services, plugins, harnesses, providers, or runtime plans. A `RuntimeProvider` implements that contract. A `RuntimeProfile` is app-owned selection of provider implementations, config sources, process defaults, harness choices, and environment-shaped wiring.

Profiles place generic
`providerSelection({ resource, provider, config, lifetime?, role?, instance? })`
results in `providers`. A profile field named `resources` is reserved for
required capabilities, not provider selection.

Resources do not acquire themselves. Providers do not select themselves. Runtime profiles do not acquire anything. Plugins do not acquire providers.

### 13.2 `RuntimeResource`

A `RuntimeResource` owns stable identity, consumed value shape, default and
allowed lifetimes, and observation-safe contributor hooks. Its resource package
also closes the finite provider family and exports the contract plus each
provider as distinct public faces. The contract module imports only
provider-neutral resource types. Provider configuration remains local to each
nested provider.

File: `packages/core/runtime/definition/src/resources/define-runtime-resource.ts`  
Layer: private `runtime-definition` resource contract exposed through the SDK facade  
Exactness: normative for fields, owner, and observation contributor naming; illustrative for TypeScript details.

```ts
export type ResourceLifetime = "process" | "role";

export interface RuntimeObservationContributor<TValue = unknown> {
  toObservationRecord(input: {
    value: TValue;
    redaction: RuntimeRedactionPolicy;
  }): RuntimeObservationRecord;
}

export interface RuntimeResource<
  TId extends string = string,
  TValue = unknown,
> {
  readonly kind: "runtime.resource";
  readonly id: TId;
  readonly title: string;
  readonly purpose: string;
  readonly defaultLifetime: ResourceLifetime;
  readonly allowedLifetimes: readonly ResourceLifetime[];
  readonly observationContributor?: RuntimeObservationContributor<TValue>;
}

export function defineRuntimeResource<
  const TId extends string,
  TValue,
>(input: {
  id: TId;
  title: string;
  purpose: string;
  defaultLifetime?: ResourceLifetime;
  allowedLifetimes?: readonly ResourceLifetime[];
  observationContributor?: RuntimeObservationContributor<TValue>;
}): RuntimeResource<TId, TValue>;
```

Observation contributor hooks produce bounded, redacted definition-owned observation records. Runtime observation alone projects those records into diagnostic and catalog read models. Contributor hooks do not expose live values, raw provider internals, raw Effect handles, or unredacted secrets.

Process and role are acquisition/scoping semantics on requirements and compiled plans. They are not separate public resource-definition species.

### 13.3 `ResourceRequirement`

Requirements declare need.

A `ResourceRequirement` states that a service, plugin, harness, provider, or runtime plan needs a resource.

File: `packages/core/runtime/definition/src/resources/resource-requirement.ts`  
Layer: private `runtime-definition` resource-requirement contract exposed through the SDK facade  
Exactness: normative for requirement fields.

```ts
export interface ResourceRequirement<
  TResource extends RuntimeResource = RuntimeResource,
> {
  readonly resource: TResource;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly optional?: boolean;
  readonly instance?: string;
  readonly reason: string;
}
```

This generic definition-owned authoring interface remains authoritative at its
resource authoring face; it is not the closed derivation-result spelling. Task
4.7a must freeze the exact TypeBox-derived `ResourceRequirement` projection
exported from `@habitat-ai/sdk/runtime/derivation` without changing this cold
authoring relation.

Multiple resource instances require instance keys. Optional resources are explicitly optional and produce diagnostics when a consumer requires a path that was declared optional.

### 13.4 `RuntimeProvider` and `ProviderEffectPlan`

A `RuntimeProvider` implements acquisition, health, refresh, and release for a
`RuntimeResource`. The provider owns its `TConfig` generic, optional
`configSchema`, and redaction metadata. Provider authors derive that declaration
from TypeBox through the `runtime-schema` adapter exposed by the SDK. The runtime substrate
decodes and validates provider config before invoking `build(...)` with typed
config. It retains the schema's redaction metadata so diagnostic, telemetry,
and catalog projections receive the redacted view.

File: `packages/core/runtime/definition/src/providers/define-runtime-provider.ts`  
Layer: private `runtime-definition` provider contract exposed through the SDK facade  
Exactness: normative for provider responsibilities, build return, telemetry input, and fields.

```ts
export interface RuntimeProvider<
  TResource extends RuntimeResource = RuntimeResource,
  TConfig = unknown,
> {
  readonly kind: "runtime.provider";
  readonly id: string;
  readonly title: string;
  readonly provides: TResource;
  readonly requires: readonly ResourceRequirement[];
  readonly configSchema?: RuntimeSchema<TConfig>;
  readonly defaultConfigKey?: string;
  readonly health?: RuntimeProviderHealthDescriptor;

  build(input: ProviderBuildContext<TConfig>): ProviderEffectPlan<
    RuntimeResourceValue<TResource>
  >;
}

export interface ProviderBuildContext<TConfig> {
  readonly config: TConfig;
  readonly resources: RuntimeResourceMap;
  readonly scope: ProviderScope;
  readonly observation: RuntimeObservationPort;
}

export function defineRuntimeProvider<
  const TResource extends RuntimeResource,
  TConfig = never,
>(
  input: RuntimeProvider<TResource, TConfig>,
): RuntimeProvider<TResource, TConfig>;
```

Provider descriptors remain cold until provisioning. Secret access is provider-acquisition-local and redacted before diagnostics and catalog emission. Runtime telemetry in provider acquisition is runtime telemetry, not service semantic observability.

File: `packages/core/sdk/src/runtime/providers/effect/index.ts`  
Layer: SDK provider Effect plan facade  
Exactness: normative for provider acquisition/release authoring and `providerFx` name; illustrative for exact generic spelling.

```ts
export const providerFx: ProviderFx = createProviderFxFacade();

export interface ProviderFx {
  acquireRelease<TValue>(input: {
    acquire: ProviderAcquire<TValue>;
    release?: ProviderRelease<TValue>;
  }): ProviderEffectPlan<TValue>;

  tryAcquire<TValue, TError>(input: {
    acquire: () => Promise<TValue> | TValue;
    catch: (cause: unknown) => TError;
  }): ProviderEffectPlan<TValue, TError>;

  withSpan<TValue, TError>(
    name: string,
    plan: ProviderEffectPlan<TValue, TError>,
    attributes?: Record<string, string | number | boolean>,
  ): ProviderEffectPlan<TValue, TError>;
}
```

`providerFx` is provider-plan-specific. It does not make the global `fx` authoring spelling canonical.

Provider acquire/release plans carry definition-owned `ProviderEffectBoundaryKind` labels and owner-local policy/correlation metadata. The compiler emits provider plans plus separate ordering facts; bootgraph consumes only the ordering facts, and `runtime-substrate-effect` lowers and executes the provider plans under bootgraph order/rollback metadata. They are not `EffectExecutionDescriptor` procedure descriptors.

### 13.5 `ProviderSelection`

Selections choose supply.

A `ProviderSelection` is the app-owned normalized selection of a provider for a resource at a lifetime, role, and optional instance.

File: `packages/core/runtime/definition/src/profiles/provider-selection.ts`  
Layer: private `runtime-definition` provider-selection grammar exposed through the SDK facade  
Exactness: normative for selected-provider fields, generic SDK helper
ownership, and the object-shaped helper relation. The generic/interface
spellings and `RuntimeConfigBinding` name below are illustrative dependency
vocabulary, not an exact public derivation shape or implementable binding
grammar, until task 4.7a replaces them. `RuntimeConfigBinding` is not admitted
as an export by this spelling.

```ts
export interface ProviderSelection<
  TProvider extends RuntimeProvider = RuntimeProvider,
> {
  readonly provider: TProvider;
  readonly resource: RuntimeResource;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
  readonly config?: RuntimeConfigBinding;
}

export function providerSelection(input: {
  resource: RuntimeResource;
  provider: RuntimeProvider;
  lifetime?: ResourceLifetime;
  role?: AppRole;
  instance?: string;
  config?: RuntimeConfigBinding;
}): ProviderSelection;
```

For `@habitat-ai/sdk/runtime/derivation`, task 4.7a must supply the exact closed
TypeBox-derived `ProviderSelection` result type named in the §4 inventory. Task
4.8 must not substitute this illustrative authoring interface for that result
contract.

Every required resource has exactly one selected provider at the relevant lifetime and instance unless the requirement is explicitly optional. Provider dependencies close before provisioning. Ambiguous provider coverage requires explicit app-owned selection.

### 13.6 Resource package and closed provider family

Authored provisionable capability contracts and their finite provider families
live under `resources/*`.

The detailed email family in §§13.6-13.9 is a generic reusable Habitat platform
resource example. The Rawr profile in §13.8 is only the downstream selection
site.

File: `resources/email/_tree.txt`  
Layer: Habitat platform authored resource package topology  
Exactness: normative for one provider-neutral contract face, a closed nested
provider family, one direct public face per provider, and contract-to-provider
import direction; illustrative for filenames, export-map encoding, and provider
names.

```text
resources/email/
  contract.ts
  package.json              # "." -> contract.ts
                            # "./providers/<provider>" -> provider index.ts
  project.json
  providers/
    resend/
      index.ts
      project.json
    smtp/
      index.ts
      project.json
    noop/
      index.ts
      project.json
```

This reference layout realizes the normative public-face relationship. The
package root exposes the provider-neutral contract, each admitted provider is
directly selectable through its own public face, and provider modules import
the contract through the root face. Habitat resource/provider blueprints own
the concrete filenames and package export-map projection.

The private runtime inventory is closed over named capability owners. Reusable
private runtime machinery remains with the owner whose invariant it implements;
app selection names provider public faces under `resources/*`.

### 13.7 Resource value example

File: `resources/email/contract.ts`  
Layer: Habitat platform authored runtime resource contract  
Exactness: normative for the provider-neutral `HabitatEffect`-returning resource
value operation; illustrative for the exact resource family.

```ts
import { TaggedError, type HabitatEffect } from "@habitat-ai/sdk/effect";
import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";

export class EmailSendError extends TaggedError("EmailSendError")<{
  readonly provider: string;
  readonly cause: unknown;
}> {}

export interface EmailSender {
  send(input: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): HabitatEffect<{ providerMessageId: string }, EmailSendError>;
}

export const EmailSenderResource = defineRuntimeResource<
  "habitat.email.sender",
  EmailSender
>({
  id: "habitat.email.sender",
  title: "Email sender",
  purpose: "Process-scoped outbound email sender capability.",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
```

### 13.8 Direct app-owned provider selection

File (independent downstream Rawr repository): `apps/rawr/runtime/profiles/production.ts`  
Layer: app-owned provider selection  
Exactness: normative for direct package public faces and generic
`providerSelection({ resource, provider, config })`; illustrative for provider
names and non-`@habitat-ai/sdk` imports.

```ts
import { providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import { EmailSenderResource } from "@habitat-ai/resource-email";
import { resendEmailProvider } from "@habitat-ai/resource-email/providers/resend";

const emailSelection = providerSelection({
  resource: EmailSenderResource,
  provider: resendEmailProvider,
  config: { from: "runtime-config", key: "email.primary" },
});
```

A notifications service may declare
`email: resourceDep(EmailSenderResource)`. The app profile decides whether the
provider is Resend, SMTP, or no-op. The service imports only the resource
contract public face.

### 13.9 Provider acquire/release example

File: `resources/email/providers/resend/index.ts`  
Layer: Habitat platform provider implementation authoring  
Exactness: normative for the cold provider descriptor,
`providerFx.acquireRelease(...)`, telemetry, curated Effect use on returned
resource operations, and provider-owned redaction metadata; illustrative for
the exact redaction-policy spelling, native client construction, and
non-`@habitat-ai/sdk` imports.

```ts
import { Effect } from "@habitat-ai/sdk/effect";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";
import { Type } from "typebox";

import {
  EmailSenderResource,
  EmailSendError,
} from "@habitat-ai/resource-email";

const ResendEmailConfigSchema = RuntimeSchema.fromTypeBox(
  Type.Object({
    apiKey: Type.String({
      minLength: 1,
      description: "Resend credential used only during provider operations.",
    }),
    from: Type.String({
      minLength: 1,
      description: "Default sender identity for outgoing email.",
    }),
  }),
  {
    redaction: { paths: ["apiKey"] },
  },
);

export const resendEmailProvider = defineRuntimeProvider({
  id: "habitat.provider.email.resend",
  title: "Resend email provider",
  provides: EmailSenderResource,
  requires: [],
  configSchema: ResendEmailConfigSchema,
  defaultConfigKey: "email.primary",

  build({ config, telemetry }) {
    return providerFx.acquireRelease({
      acquire: async () => {
        telemetry.event("provider.acquire.start", {
          providerId: "habitat.provider.email.resend",
          resourceId: EmailSenderResource.id,
        });

        const client = createResendClient({
          apiKey: config.apiKey.value,
        });

        return {
          send(input) {
            return Effect.tryPromise({
              try: async () => {
                const result = await client.emails.send({
                  from: config.from,
                  to: input.to,
                  subject: input.subject,
                  html: input.html,
                  text: input.text,
                });

                return {
                  providerMessageId: result.id,
                };
              },
              catch: (cause) =>
                new EmailSendError({
                  provider: "resend",
                  cause,
                }),
            });
          },
        };
      },

      release: async () => {
        telemetry.event("provider.release", {
          providerId: "habitat.provider.email.resend",
          resourceId: EmailSenderResource.id,
        });
      },
    });
  },
});
```

Provider acquisition receives validated provider-local config, already-provisioned dependency resources, provider scope, and runtime telemetry. The runtime retains the provider's redaction metadata. Secret-bearing fields are usable only inside provider acquisition and release hooks. Diagnostic, telemetry, and catalog projections receive redacted snapshots. Providers may construct native clients. They do not become service domain authority and do not select themselves.

Provider acquisition and release callbacks shown inside `providerFx.acquireRelease(...)` are provider-plan authoring, not Promise business execution terminals. The public provider authoring result is `ProviderEffectPlan`.

## 14. Process-local coordination resources

Process-local queue, pubsub, cache, and concurrency limiting are explicit runtime resources with process/role lifetime. They may return `HabitatEffect`. They are process-local coordination resources, not durable coordination systems.

### 14.1 `ProcessQueueHubResource`

File: `resources/process-queue-hub/contract.ts`  
Layer: process-local coordination resource  
Exactness: normative for process-local queue semantics.

```ts
import { TaggedError, type HabitatEffect } from "@habitat-ai/sdk/effect";
import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";

export class ProcessQueueOfferError extends TaggedError("ProcessQueueOfferError")<{
  readonly queueId: string;
  readonly cause: unknown;
}> {}

export class ProcessQueueTakeError extends TaggedError("ProcessQueueTakeError")<{
  readonly queueId: string;
  readonly cause: unknown;
}> {}

export interface ProcessQueue<T> {
  offer(value: T): HabitatEffect<void, ProcessQueueOfferError>;
  take(): HabitatEffect<T, ProcessQueueTakeError>;
}

export interface ProcessQueueHub {
  queue<T>(input: {
    id: string;
    capacity: number;
  }): HabitatEffect<ProcessQueue<T>>;
}

export const ProcessQueueHubResource = defineRuntimeResource<
  "habitat.process.queue-hub",
  ProcessQueueHub
>({
  id: "habitat.process.queue-hub",
  title: "Process queue hub",
  purpose: "Process-local queue registry for bounded local handoff.",
  defaultLifetime: "process",
  allowedLifetimes: ["process", "role"],
});
```

`ProcessQueueHubResource` provides bounded local handoff inside one started process or role.

### 14.2 `ProcessPubSubHubResource`

File: `resources/process-pubsub-hub/contract.ts`  
Layer: process-local coordination resource  
Exactness: normative for process-local pubsub semantics.

```ts
import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { HabitatEffect } from "@habitat-ai/sdk/effect";

export interface ProcessPubSub<T> {
  publish(value: T): HabitatEffect<void>;
  subscribe(): HabitatEffect<AsyncIterable<T>>;
}

export interface ProcessPubSubHub {
  topic<T>(input: {
    id: string;
    replay?: "none" | "latest";
  }): HabitatEffect<ProcessPubSub<T>>;
}

export const ProcessPubSubHubResource = defineRuntimeResource<
  "habitat.process.pubsub-hub",
  ProcessPubSubHub
>({
  id: "habitat.process.pubsub-hub",
  title: "Process PubSub hub",
  purpose: "Process-local broadcast of runtime state and progress.",
  defaultLifetime: "process",
  allowedLifetimes: ["process", "role"],
});
```

`ProcessPubSubHubResource` broadcasts runtime-local state/progress to in-process participants. Optional latest-value replay is process-local.

### 14.3 `ProcessConcurrencyLimiterResource`

File: `resources/process-concurrency-limiter/contract.ts`  
Layer: process-local coordination resource  
Exactness: normative for process-local concurrency semantics.

```ts
import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { HabitatEffect } from "@habitat-ai/sdk/effect";

export interface ProcessConcurrencyLimiter {
  withPermit<TSuccess, TError, TRequirements>(
    input: {
      key: string;
      permits: number;
      effect: HabitatEffect<TSuccess, TError, TRequirements>;
    },
  ): HabitatEffect<TSuccess, TError, TRequirements>;
}

export const ProcessConcurrencyLimiterResource = defineRuntimeResource<
  "habitat.process.concurrency-limiter",
  ProcessConcurrencyLimiter
>({
  id: "habitat.process.concurrency-limiter",
  title: "Process concurrency limiter",
  purpose: "Process-local concurrency caps for expensive or rate-limited work.",
  defaultLifetime: "process",
  allowedLifetimes: ["process", "role"],
});
```

Allowed uses include external API fanout limits, browser automation caps, local import transforms, and host-local work caps.

### 14.4 `ProcessCacheHubResource`

File: `resources/process-cache-hub/contract.ts`  
Layer: process-local coordination resource  
Exactness: normative for process-local cache semantics.

```ts
import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { HabitatEffect } from "@habitat-ai/sdk/effect";

export interface ProcessCache<TKey, TValue> {
  get(key: TKey): HabitatEffect<TValue>;
  refresh(key: TKey): HabitatEffect<TValue>;
  invalidate(key: TKey): HabitatEffect<void>;
  invalidateAll(): HabitatEffect<void>;
}

export interface ProcessCacheHub {
  cache<TKey, TValue>(input: {
    id: string;
    capacity: number;
    ttl: HabitatDurationInput;
    lookup: (key: TKey) => HabitatEffect<TValue>;
  }): HabitatEffect<ProcessCache<TKey, TValue>>;
}

export const ProcessCacheHubResource = defineRuntimeResource<
  "habitat.process.cache-hub",
  ProcessCacheHub
>({
  id: "habitat.process.cache-hub",
  title: "Process cache hub",
  purpose: "Process-local cache registry for request, role, and process scoped caching.",
  defaultLifetime: "process",
  allowedLifetimes: ["process", "role"],
});
```

`ProcessCacheHubResource` caches computed values within one process/role lifetime.

### 14.5 Runtime-owned primitives

Raw Effect `Fiber`, `Ref`, `Schedule`, `Stream`, `Queue`, `PubSub`, and `Cache` APIs remain runtime-internal unless wrapped by a Habitat resource or facade with explicit process-local semantics.

Durable async execution, durable schedules, workflow history, cross-process eventing, and system-of-record state remain outside these process-local coordination resources.

## 15. Runtime derivation and SDK-exposed plan artifacts

The private `runtime-derivation` owner has one foundational topology handoff and
one complete derivation handoff. The foundational handoff remains private. The
terminal SDK exposes the complete-derivation artifact contracts at
`@habitat-ai/sdk/runtime/derivation`; it does not reimplement derivation. The
runtime compiler consumes the complete normalized graph, not arbitrary
authoring shorthand or the lossy portable projection.

Task 4.8 exposes exactly one public derivation operation through that sole SDK
face, but task 4.8 cannot open until the task-4.7a
complete-derivation-contract and binding-source authority gate is satisfied.
Task 4.7a is a canonical authority amendment only; it adds no source, SDK
assembly edge, export-map change, or runtime implementation. It must complete
all of the following before implementation begins:

- freeze the exact closed SDK export inventory stated in §4: the sole
  derivation operation, exactly three runtime values, and exactly the listed
  type-only exports;
- freeze the exact `RuntimeDerivationInput` and operation signature, then
  replace the illustrative `RuntimeDerivationResult` and every illustrative or
  undefined schema-shaped nested public data contract in this section with
  exact closed TypeBox schemas and recursively readonly `Static`-derived types;
  non-portable behavioral tables instead receive exact public method
  signatures;
- freeze every artifact's exact producer and consumer, the table/ref matching
  contracts, all derivation finding and failure/error behavior, and every
  deterministic ordering rule, without inventing a public error export;
- preserve rather than reopen the already exact task-4.7
  `NormalizedRuntimeTopology` law, the exact closed
  `ExecutionDescriptorRefSchema` union in §9.2, and the recursively readonly
  `PortableRuntimePlanArtifactSchema` and decoder in §15.9; and
- freeze all existing binding-source grammar decisions together: insertion
  owner, exact closed source/ref unions, required/absent behavior, transitive
  propagation and override, `RuntimeConfigSource` precedence and keys,
  binding/cache identity ingredients, and callback/live-value rejection.

Until that amendment lands, every illustrative public interface spelling or
unresolved referenced public noun in §§15.2-15.8 is a dependency sketch only.
It is not implementable authority, cannot be transcribed into source, and does
not add an export to the §4 inventory. The following input/result spelling has
that same provisional status:

File: `packages/core/runtime/derivation/src/derive-runtime-artifacts.ts`  
Layer: complete private derivation operation exposed only through
`@habitat-ai/sdk/runtime/derivation`  
Exactness: normative for the sole operation name, topology reuse, freezing, and
non-execution behavior. The input and result interface spellings below are an
illustrative dependency map, not implementable public shape authority, pending
task 4.7a's exact input/signature contract and exact closed TypeBox-derived
result/data replacements.

```ts
export interface RuntimeDerivationInput {
  readonly entrypoint: Entrypoint;
  readonly profileId: string;
}

export interface RuntimeDerivationResult {
  readonly topology: NormalizedRuntimeTopology;
  readonly graph: NormalizedAuthoringGraph;
  readonly executionDescriptorTable: ExecutionDescriptorTable;
  readonly webRouteModuleTable: WebRouteModuleTable;
  readonly portableArtifact: PortableRuntimePlanArtifact;
}

export declare function deriveRuntimeArtifacts(
  input: RuntimeDerivationInput,
): RuntimeDerivationResult;
```

`deriveRuntimeArtifacts(input)` calls the private
`deriveNormalizedRuntimeTopology(input)` exactly once, carries that exact object
into complete derivation, and returns a frozen result satisfying
`result.graph.topology === result.topology`. It does not invoke a web
route-module loader or an Effect body. `deriveNormalizedRuntimeTopology(...)`
has no public SDK export; there is no public topology-only operation or second
derivation face.

### 15.1 `NormalizedRuntimeTopology`

`NormalizedRuntimeTopology` is the sole foundational derivation artifact. It
contains only selected runtime topology facts and is the input to complete
authoring-graph derivation.

File: `packages/core/runtime/derivation/src/normalized-runtime-topology.ts`  
Layer: private foundational runtime-derivation artifact  
Exactness: normative for the operation, fields, closed schemas, fact sources,
edge direction, deterministic ordering, copying/freezing, and refusal behavior.

```ts
import { ReadonlyObject, Type, type Static } from "typebox";

const closed = { additionalProperties: false } as const;

export const NormalizedAppRoleSchema = Type.Union([
  Type.Literal("server"),
  Type.Literal("async"),
  Type.Literal("cli"),
  Type.Literal("web"),
  Type.Literal("agent"),
  Type.Literal("desktop"),
]);

const NormalizedResourceLifetimeSchema = Type.Union([
  Type.Literal("process"),
  Type.Literal("role"),
]);

export const NormalizedRuntimeLaunchIdentitySchema = ReadonlyObject(Type.Object({
  app: Type.String(),
  process: Type.String(),
  entrypoint: Type.String(),
  deployment: Type.String(),
  source: Type.String(),
}), closed);

export const NormalizedPluginIdentitySchema = ReadonlyObject(Type.Object({
  pluginId: Type.String(),
  instance: Type.Optional(Type.String()),
}), closed);

export const NormalizedSurfaceRequirementSchema = ReadonlyObject(Type.Object({
  plugin: NormalizedPluginIdentitySchema,
  role: NormalizedAppRoleSchema,
  surface: Type.String(),
  capability: Type.String(),
}), closed);

export const NormalizedResourceRequirementIdentitySchema = ReadonlyObject(Type.Object({
  resourceId: Type.String(),
  lifetime: NormalizedResourceLifetimeSchema,
  role: Type.Optional(NormalizedAppRoleSchema),
  instance: Type.Optional(Type.String()),
}), closed);

export const NormalizedRuntimeTopologyEdgeSchema = Type.Union([
  ReadonlyObject(Type.Object({
    kind: Type.Literal("app.plugin"),
    appId: Type.String(),
    plugin: NormalizedPluginIdentitySchema,
  }), closed),
  ReadonlyObject(Type.Object({
    kind: Type.Literal("plugin.resource"),
    plugin: NormalizedPluginIdentitySchema,
    resource: NormalizedResourceRequirementIdentitySchema,
  }), closed),
  ReadonlyObject(Type.Object({
    kind: Type.Literal("service.service"),
    serviceId: Type.String(),
    dependencyServiceId: Type.String(),
  }), closed),
  ReadonlyObject(Type.Object({
    kind: Type.Literal("service.resource"),
    serviceId: Type.String(),
    resourceId: Type.String(),
  }), closed),
  ReadonlyObject(Type.Object({
    kind: Type.Literal("service.semantic"),
    serviceId: Type.String(),
    adapterId: Type.String(),
  }), closed),
]);

export const NormalizedRuntimeTopologySchema = ReadonlyObject(Type.Object({
  identity: NormalizedRuntimeLaunchIdentitySchema,
  profileId: Type.String(),
  pluginIdentities: ReadonlyObject(Type.Array(NormalizedPluginIdentitySchema)),
  roleRequirements: ReadonlyObject(Type.Array(NormalizedAppRoleSchema)),
  surfaceRequirements: ReadonlyObject(Type.Array(NormalizedSurfaceRequirementSchema)),
  resourceRequirementIdentities: ReadonlyObject(Type.Array(
    NormalizedResourceRequirementIdentitySchema,
  )),
  edges: ReadonlyObject(Type.Array(NormalizedRuntimeTopologyEdgeSchema)),
}), closed);

export type NormalizedPluginIdentity =
  Static<typeof NormalizedPluginIdentitySchema>;
export type NormalizedSurfaceRequirement =
  Static<typeof NormalizedSurfaceRequirementSchema>;
export type NormalizedResourceRequirementIdentity =
  Static<typeof NormalizedResourceRequirementIdentitySchema>;
export type NormalizedRuntimeTopologyEdge =
  Static<typeof NormalizedRuntimeTopologyEdgeSchema>;
export type NormalizedRuntimeTopology =
  Static<typeof NormalizedRuntimeTopologySchema>;

export declare function deriveNormalizedRuntimeTopology(input: {
  readonly entrypoint: Entrypoint;
  readonly profileId: string;
}): NormalizedRuntimeTopology;
```

`deriveNormalizedRuntimeTopology({ entrypoint, profileId })` is the private
task-4.7 operation. Before emitting anything it requires
`entrypoint.identity.app === entrypoint.app.id`,
`entrypoint.identity.process === entrypoint.process.id`,
`entrypoint.identity.entrypoint === entrypoint.id`, and
`profileId === entrypoint.profile.id`. It then recursively copies all five
launch-identity fields without sharing references and recursively freezes the
copy. `deployment` and `source` are opaque selected values: they are copied
unchanged and never interpreted or re-derived.

`roleRequirements` comes only from `entrypoint.process.roles`.
`pluginIdentities`, `surfaceRequirements`,
`resourceRequirementIdentities`, `app.plugin`, and `plugin.resource` facts come
from every definition in `entrypoint.app.plugins`, not from a process-role
filter. A plugin identity is exactly `{ pluginId: definition.id, instance? }`.
Each surface requirement carries that identity plus the definition's `role`,
`surface`, and `capability`. Each resource-requirement identity carries
`resourceId: requirement.resource.id`, effective
`lifetime: requirement.lifetime ?? requirement.resource.defaultLifetime`, an
optional `role` only when the requirement authored one, and the authored
optional `instance`.

Service topology starts only from service definitions recovered through the
selected plugins' private `ServiceUse` carriers and traverses their service
definitions transitively. It emits `service.service` from dependent
`serviceId` to `dependencyServiceId`, `service.resource` from service to
resource contract id, and `service.semantic` from service to semantic adapter
id. There is no `plugin.service` edge. A `service.service` self-loop is a cycle
and is refused with every longer directed service cycle.

The task-4.7 cycle proof is limited to order-independent refusal: every
authored-order permutation of the same service graph must make the same
accept/refuse decision, and both self-loops and longer directed cycles are
refused. Task 4.7 prescribes no error class, chosen cycle path, diagnostic
ordering, or finding payload. It introduces no error API; complete-derivation
finding and failure behavior remains part of the task-4.7a authority gate.

Before output, derivation refuses duplicate plugin identity
`(pluginId, instance ?? "")`, duplicate role literal, duplicate surface full
tuple `(pluginId, instance ?? "", role, surface, capability)`, or duplicate
edge full structural tuple. Arrays are sorted lexicographically by these
explicit tuples using ascending ECMAScript code-unit string order:

| Array | Sort tuple |
| --- | --- |
| `pluginIdentities` | `(pluginId, instance ?? "")` |
| `roleRequirements` | `(role)` |
| `surfaceRequirements` | `(plugin.pluginId, plugin.instance ?? "", role, surface, capability)` |
| `resourceRequirementIdentities` | `(resourceId, lifetime, role ?? "", instance ?? "")` |
| `app.plugin` edge | `(kind, appId, plugin.pluginId, plugin.instance ?? "")` |
| `plugin.resource` edge | `(kind, plugin.pluginId, plugin.instance ?? "", resource.resourceId, resource.lifetime, resource.role ?? "", resource.instance ?? "")` |
| `service.service` edge | `(kind, serviceId, dependencyServiceId)` |
| `service.resource` edge | `(kind, serviceId, resourceId)` |
| `service.semantic` edge | `(kind, serviceId, adapterId)` |

`resourceRequirementIdentities` is the sorted unique projection of the
resource identities carried by accepted `plugin.resource` edges. Two distinct
plugin identities may carry the same resource-requirement identity; that shared
demand is admitted and projects to one resource identity. An exact repeated
`plugin.resource` edge is still refused by the full-edge duplicate rule.

Missing optionals compare as the empty string and remain absent in emitted
objects. Every output object and collection is a fresh recursive copy and is
recursively frozen. Equivalent cold inputs therefore produce deeply equal,
nonidentical topology regardless of authored collection order.

The private owner adapts `NormalizedRuntimeTopologySchema` through
`RuntimeSchema.fromTypeBox(...)`. Every object schema is a TypeBox 1
`ReadonlyObject(..., { additionalProperties: false })`, and every collection is
an immutable array schema. `Static` therefore derives recursively readonly
objects and arrays consistent with the recursively frozen runtime output.
Unknown fields and edge kinds are refused, and there is no parallel handwritten
type authority.

`NormalizedRuntimeTopology` and its listed nested topology types are type-only
exports because they occur in the complete derivation result. Their schema
constants and the private `deriveNormalizedRuntimeTopology(...)` operation are
not runtime value exports from `@habitat-ai/sdk/runtime/derivation`.

This artifact contains no provider selection, normalized service use, binding
plan, surface plan, workflow descriptor, Effect descriptor ref or table, web
route-module ref or table, portable artifact, placement constraint, executable
value, or live runtime value. Producer: private `runtime-derivation`. Consumer:
complete derivation within the same owner. It is not itself a public authoring
operation and creates no SDK assembly edge or export by itself.

### 15.2 `NormalizedAuthoringGraph`

Complete derivation incorporates `NormalizedRuntimeTopology` and derives the
remaining cold plan artifacts needed by compilation and in-process runtime
assembly.

File: `packages/core/runtime/derivation/src/normalized-authoring-graph.ts`  
Layer: complete private runtime-derivation artifact with a public contract at
`@habitat-ai/sdk/runtime/derivation`  
Exactness: normative for producer, consumer, and graph-section relationships.
The interface fields and dependent type spellings below are illustrative and
not implementable public shape authority until task 4.7a replaces them with an
exact closed TypeBox schema and `Static`-derived type.

```ts
export interface NormalizedAuthoringGraph {
  readonly topology: NormalizedRuntimeTopology;
  readonly app: NormalizedAppDefinition;
  readonly plugins: readonly NormalizedPluginDefinition[];
  readonly roleSurfaceIndex: DerivedRoleSurfaceIndex;
  readonly serviceUses: readonly NormalizedServiceUse[];
  readonly serviceDependencies: readonly NormalizedServiceDependency[];
  readonly semanticDependencies: readonly NormalizedSemanticDependency[];
  readonly resourceRequirements: readonly ResourceRequirement[];
  readonly providerSelections: readonly ProviderSelection[];
  readonly runtimeProfiles: readonly NormalizedRuntimeProfile[];
  readonly serviceBindingPlans: readonly ServiceBindingPlan[];
  readonly surfaceRuntimePlans: readonly SurfaceRuntimePlan[];
  readonly workflowDispatcherDescriptors: readonly WorkflowDispatcherDescriptor[];
  readonly executionDescriptorRefs: readonly ExecutionDescriptorRef[];
  readonly webRouteModuleRefs: readonly WebRouteModuleRef[];
  readonly findings: readonly DerivationFinding[];
}
```

Producer: private `runtime-derivation`; public contract:
`@habitat-ai/sdk/runtime/derivation`; consumer: runtime compiler. The matching
non-portable Effect descriptor table and web route-module table travel through
the in-process realization path alongside the graph to their specific
consumers. One `PortableRuntimePlanArtifact` is produced alongside the complete
graph as its reduced portable projection; it is not embedded in the graph and
neither non-portable table is embedded in it.

Complete derivation does not acquire resources, execute providers, construct
managed runtime roots, invoke web loaders, construct native harness payloads,
start processes, mount harnesses, or mutate app membership. If an
`effectExecutionDescriptors` index is produced for diagnostics, it is a
derived view over `executionDescriptorRefs`, not parallel authority.

### 15.3 `ExecutionDescriptorTable`

Complete runtime derivation produces a non-portable Effect execution descriptor
table alongside portable descriptor refs. The process runtime receives the
table in-process and uses it to assemble `ExecutionRegistry`.

File: `packages/core/runtime/derivation/src/derive-execution-descriptor-table.ts`  
Layer: complete-derivation non-portable artifact with a public contract
at `@habitat-ai/sdk/runtime/derivation`  
Exactness: normative for producer/consumer split and non-portability. The
aggregate spelling below is illustrative private helper vocabulary, not a
public SDK export or implementable table-signature authority; task 4.7a freezes
the exact `ExecutionDescriptorTable` methods before task 4.8.

```ts
export interface DerivedExecutionArtifacts {
  readonly refs: readonly ExecutionDescriptorRef[];
  readonly table: ExecutionDescriptorTable;
}
```

`ExecutionDescriptorTable` is not written to `PortableRuntimePlanArtifact`.
It is passed through the in-process runtime realization path. A process that
mounts Effect-backed executable surfaces must receive the matching table before
`ExecutionRegistry` assembly.

### 15.4 `WebRouteModuleRef` and `WebRouteModuleTable`

Web route-module loaders have their own derivation artifacts. They are not
Effect descriptors and do not enter `ExecutionRegistry`.

File: `packages/core/runtime/derivation/src/web-route-module-table.ts`  
Layer: complete-derivation non-portable web module-loading artifact with
a public contract at `@habitat-ai/sdk/runtime/derivation`  
Exactness: normative for distinct identity, producer/consumer split,
non-portability, and non-execution during derivation. The ref, entry, and table
interface spellings below are illustrative dependency sketches, not
implementable public shape or method-signature authority, until task 4.7a
replaces them with exact contracts.

```ts
export interface WebRouteModuleRef {
  readonly kind: "web.route-module-ref";
  readonly pluginId: string;
  readonly routeId: string;
  readonly path: string;
}

export interface WebRouteModuleTable {
  readonly kind: "web.route-module-table";
  get(ref: WebRouteModuleRef): () => Promise<unknown>;
  entries(): Iterable<WebRouteModuleTableEntry>;
}

export interface WebRouteModuleTableEntry {
  readonly ref: WebRouteModuleRef;
  readonly load: () => Promise<unknown>;
}
```

Producer: complete runtime derivation. Consumer: the web surface
adapter/module-loading boundary in process runtime and the selected web host.
The table preserves the exact cold loader reference without invoking it. The
ref and table are both excluded from `PortableRuntimePlanArtifact`; the loader
itself is always non-portable.

### 15.5 Identity derivation

Complete runtime derivation derives canonical identities for plugin, resource
instance, surface runtime plan, workflow dispatcher descriptor, execution
descriptor, and web route module. Service-binding and binding-cache identity
ingredients remain gated by the binding-source portion of the task-4.7a
amendment in §15.6. The foundational topology uses the same canonical plugin
identity and copies `RuntimeLaunchIdentity` exactly.

File: `packages/core/runtime/derivation/src/identity-policy.ts`  
Layer: private runtime identity derivation; its effects are reflected in the
public ref/plan types, but `IdentityPolicy` is not an SDK export  
Exactness: normative for identity ingredients; illustrative for string format.

```ts
export interface IdentityPolicy {
  pluginId(input: {
    role: AppRole;
    surface: string;
    capability: string;
    instance?: string;
  }): string;

  workflowDispatcherDescriptorId(input: {
    appId: string;
    role: AppRole;
    surface: string;
    capability: string;
    workflowIds: readonly string[];
  }): string;

  executionDescriptorId(input: ExecutionDescriptorIdentityInput): string;
}
```

`executionDescriptorId(...)` consumes the same boundary-discriminated identity
input used to derive `ExecutionDescriptorRef`, excluding only `kind` and the
derived `executionId`. It must not accept a looser optional-field bag that can
describe impossible boundary/id combinations.

Authors may supply explicit instance identity when multiple real instances of
the same capability are selected. Cosmetic identity overrides are not app
authoring authority.

No service-binding id function or cache-seed input is specified here. The
binding-source portion of the task-4.7a Designer amendment must fix those
ingredients before task 4.8 adds them to this policy.

### 15.6 `ServiceBindingPlan`

Once the task-4.7a complete-derivation-contract and binding-source authority
gate in §15 is satisfied, `ServiceBindingPlan` is the derived recipe for
constructing a service client from provisioned resources, sibling service
clients, semantic adapters, and the admitted declarative scope/config binding
references.

File: `packages/core/runtime/derivation/src/service-binding-plan.ts`  
Layer: complete-derivation service binding artifact exposed through
`@habitat-ai/sdk/runtime/derivation`  
Exactness: normative for the authority gate, owner, construction-time lanes,
and exclusion of invocation from binding cache identity. The dependent plan
spelling below is illustrative and not implementable public shape authority
until the task-4.7a amendment replaces it with an exact closed TypeBox-derived
contract.

```ts
export interface ServiceBindingPlan {
  readonly bindingId: string;
  readonly serviceId: string;
  readonly serviceInstance?: string;

  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;

  readonly resourceDeps: readonly BoundResourceDependency[];
  readonly serviceDeps: readonly BoundServiceDependency[];
  readonly semanticDeps: readonly BoundSemanticDependency[];

  readonly scopeSchema: RuntimeSchema;
  readonly configSchema: RuntimeSchema;
  readonly invocationSchema: RuntimeSchema;

  readonly cacheKeyInput: ServiceBindingCacheKeyInput;
}
```

**Binding-source portion of the task-4.7a authority gate.** This list is one
inseparable part of the complete gate stated at the start of §15, not the whole
gate. Task 4.8 cannot open until a Habitat Designer amendment fixes all of the
following together:

- the authoring insertion owner for service scope/config binding values;
- the exact closed TypeBox source and reference discriminated unions;
- required-value and absent-value semantics;
- transitive `serviceDep(...)` propagation and override semantics;
- `RuntimeConfigSource` precedence and key semantics;
- binding identity and `ServiceBindingCacheKey` ingredients; and
- rejection of callbacks, closures, executable resolvers/selectors, and live values.

Current `ServiceUse`, `RuntimeProfile`, and the five service lanes (`deps`,
`scope`, `config`, `invocation`, and `provided`) contain no binding values. An
implementation must not choose an insertion owner, invent source/ref variants,
infer precedence or override behavior, or allocate a catch-all
`RuntimeValueBinding`. After the amendment lands, `ServiceBindingPlan` may carry
only the exact schema-backed references that amendment admits.

`invocationSchema` is preserved because invocation remains required per call.
Invocation does not participate in construction-time service binding and does
not participate in `ServiceBindingCacheKey`.

The runtime compiler consumes `ServiceBindingPlan` and emits
`CompiledServiceBindingPlan`; process runtime consumes the compiled form only.

### 15.7 `SurfaceRuntimePlan`

`SurfaceRuntimePlan` describes the selected role/surface/capability projection
before native adapter lowering.

File: `packages/core/runtime/derivation/src/surface-runtime-plan.ts`  
Layer: complete-derivation surface plan exposed through
`@habitat-ai/sdk/runtime/derivation`  
Exactness: normative for plan owner, executable refs, and downstream consumer;
the interface below is an illustrative dependency sketch, not implementable
public shape authority, until task 4.7a replaces it with an exact closed
TypeBox-derived contract.

```ts
export interface SurfaceRuntimePlan {
  readonly surfacePlanId: string;
  readonly pluginId: string;
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly instance?: string;

  readonly serviceBindingRefs: readonly string[];
  readonly resourceRequirements: readonly ResourceRequirement[];
  readonly nativeDefinitionRefs: readonly NativeDefinitionRef[];
  readonly executableBoundaryRefs: readonly ExecutionDescriptorRef[];
  readonly webRouteModuleRefs: readonly WebRouteModuleRef[];
  readonly adapterInput: SurfaceAdapterInputDescriptor;
  readonly findings: readonly DerivationFinding[];
}
```

The runtime compiler turns `SurfaceRuntimePlan` into compiled surface plans.
Surface adapters lower compiled surface plans to native payloads. Effect
executable boundary refs are resolved through `ExecutionRegistry`; web route
module refs are resolved through `WebRouteModuleTable` and never through that
registry.

### 15.8 `WorkflowDispatcherDescriptor`

`WorkflowDispatcherDescriptor` is the runtime-derivation integration descriptor
for selected workflow definitions that may be wrapped by server API or server
internal projections.

File: `packages/core/runtime/derivation/src/workflow-dispatcher-descriptor.ts`  
Layer: complete-derivation dispatcher descriptor exposed through
`@habitat-ai/sdk/runtime/derivation`  
Exactness: normative for descriptor role and producer/consumer split;
the interface below is an illustrative dependency sketch, not implementable
public shape authority, until task 4.7a replaces it with an exact closed
TypeBox-derived contract.

```ts
export interface WorkflowDispatcherDescriptor {
  readonly kind: "workflow.dispatcher-descriptor";
  readonly descriptorId: string;
  readonly appId: string;
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly workflowRefs: readonly WorkflowDefinitionRef[];
  readonly admissionOperations: readonly WorkflowAdmissionOperationDescriptor[];
  readonly findings: readonly DerivationFinding[];
}
```

Producer: complete runtime derivation from selected workflow definitions and
projections that request dispatcher access. Consumer: runtime compiler and
process runtime.

It is not a product API, native workflow execution, a live dispatcher, or a
second source of async metadata.

### 15.9 `PortableRuntimePlanArtifact`

`PortableRuntimePlanArtifact` is a narrow reproducible correlation and
pre-runtime inspection artifact. It is not the complete compiler input.

File: `packages/core/runtime/derivation/src/portable-runtime-plan-artifact.ts`  
Layer: complete private runtime-derivation artifact with a public contract at
`@habitat-ai/sdk/runtime/derivation`  
Exactness: normative for the public schema and decoder, every field and
exclusion, canonical ordering, and artifact-id derivation.

```ts
import { ReadonlyObject, Type, type Static } from "typebox";

const closedPortableObject = { additionalProperties: false } as const;

export const PortableRuntimePlanArtifactSchema = ReadonlyObject(Type.Object({
  kind: Type.Literal("portable.runtime-plan-artifact"),
  artifactId: Type.String({ pattern: "^sha256:[0-9a-f]{64}$" }),
  identity: NormalizedRuntimeLaunchIdentitySchema,
  profileId: Type.String(),
  roles: ReadonlyObject(Type.Array(NormalizedAppRoleSchema)),
  surfaces: ReadonlyObject(Type.Array(NormalizedSurfaceRequirementSchema)),
  executionDescriptorRefs: ReadonlyObject(Type.Array(ExecutionDescriptorRefSchema)),
}), closedPortableObject);

export type PortableRuntimePlanArtifact =
  Static<typeof PortableRuntimePlanArtifactSchema>;

export declare function decodePortableRuntimePlanArtifact(
  value: unknown,
): PortableRuntimePlanArtifact;
```

Those seven fields are the complete shape. `identity` is the exact immutable
`RuntimeLaunchIdentity` copy carried by `NormalizedRuntimeTopology`; `roles`
and `surfaces` are its normalized requirements, and
`executionDescriptorRefs` contains Effect execution refs only. The artifact
has no `derivedAt`, graph hash, placement constraints, provider plan or selection,
service binding plan, surface runtime plan, workflow dispatcher plan, web route
module ref or loader, executable closure, live resource or runtime handle,
secret, readiness gate, observation port or read model, supervision field, or
lifecycle authority. Any additional field is non-conforming.

`PortableRuntimePlanArtifactSchema` and
`decodePortableRuntimePlanArtifact(...)` are public only through the sole
`@habitat-ai/sdk/runtime/derivation` face. The outer object and every nested
TypeBox object, including every `ExecutionDescriptorRefSchema` variant, use
`ReadonlyObject(..., { additionalProperties: false })`; every array schema uses
the corresponding immutable-array transformation. The TypeScript artifact and
ref types derive from those schemas with `Static`, so their public contract is
recursively readonly; no handwritten parallel shape is public authority. The
decoder performs closed-schema decoding, canonical ordering, and artifact-id
verification.

Canonical roles and surfaces retain the §15.1 ordering. Effect refs sort by
the complete tuple for their discriminated boundary using ascending ECMAScript
code-unit string order; an absent optional compares as `""`:

| Effect ref boundary | Complete sort tuple |
| --- | --- |
| `plugin.async-step` | `(boundary, ownerId, workflowId ?? "", scheduleId ?? "", consumerId ?? "", stepId)` |
| `plugin.cli-command` | `(boundary, ownerId, commandId)` |
| `plugin.web-surface` | `(boundary, ownerId, surfaceId)` |
| `plugin.agent-tool` | `(boundary, ownerId, toolId)` |
| `plugin.desktop-background` | `(boundary, ownerId, backgroundId)` |

Exactly one async owner id is present. `executionId` is derived from the full
boundary-specific identity input in §15.5 and must agree with it; it is not a
second ordering input. A `plugin.web-surface` ref identifies actual private
web-local Effect work, requires `surfaceId`, and uses the plugin owner as
`ownerId`. It remains categorically distinct from `WebRouteModuleRef`: a lazy
native web module loader is absent from the Effect refs, the portable artifact,
`ExecutionDescriptorTable`, and `ExecutionRegistry`.

To derive `artifactId`, complete derivation first canonically orders the six
non-`artifactId` fields as described above, forms exactly
`{ kind, identity, profileId, roles, surfaces, executionDescriptorRefs }`, and
encodes that value as RFC 8785 canonical JSON. It computes SHA-256 over those
UTF-8 bytes. `artifactId` is `sha256:` followed by exactly 64 lowercase
hexadecimal SHA-256 characters. The decoder applies
the same ordering and calculation and refuses a supplied `artifactId` that does
not match.

Producer: complete private runtime derivation; public contract:
`@habitat-ai/sdk/runtime/derivation`; consumers: diagnostic tooling, topology
export, and future control-plane or deployment touchpoints. The runtime compiler
consumes `NormalizedAuthoringGraph`, not this reduced artifact. The
`deployment` value inside `identity` is immutable launch correlation only;
deployment placement constraints remain omitted until a companion deployment
authority defines them.

## 16. Runtime compiler and compiled process plan

The compiler plans processes.

The runtime compiler turns a normalized authoring graph plus entrypoint selection into one `CompiledProcessPlan`.

After the complete task-4.7a authority amendment lands and its binding-source
portion admits the exact binding grammar, the compiler consumes each derived
`ServiceBindingPlan`, validates its service closure and schema-backed binding
references, resolves dependency and binding refs, and emits
`CompiledServiceBindingPlan`. It never evaluates a callback or binds a live
client.

File: `packages/core/runtime/compiler/_tree.txt`  
Layer: runtime compiler placement  
Exactness: normative placement and component role; illustrative for file names.

```text
packages/core/runtime/compiler/
  src/
    compile-process-plan.ts
    collect-resource-requirements.ts
    collect-provider-dependency-graph.ts
    collect-service-bindings.ts
    collect-surface-runtime-plans.ts
    collect-workflow-dispatchers.ts
    collect-execution-descriptors.ts
    compile-execution-plans.ts
    compile-execution-registry-input.ts
    validate-provider-coverage.ts
    validate-provider-dependency-closure.ts
    validate-role-surface-selection.ts
    validate-topology-builder-agreement.ts
    validate-execution-boundary-policy.ts
    validate-effect-import-law.ts
    validate-effect-local-coordination.ts
    emit-bootgraph-input.ts
```

Compiler inputs:

| Input | Producer |
| --- | --- |
| `NormalizedAuthoringGraph` containing `NormalizedRuntimeTopology` | Complete runtime derivation |
| `ExecutionDescriptorTable` availability metadata | Complete runtime derivation |
| `WebRouteModuleTable` availability metadata | Complete runtime derivation |
| Selected `AppDefinition` | App authoring |
| Entrypoint selection | `startApp(...)` |
| `RuntimeProfile` | App runtime profile |
| Runtime environment descriptor | Entrypoint/runtime |
| Harness selection/defaults | App/runtime profile and runtime defaults |

Compiler outputs:

File: `packages/core/runtime/compiler/src/compiled-process-plan.ts`  
Layer: runtime-compiled artifact  
Exactness: normative for process plan sections.

```ts
export interface CompiledProcessPlan {
  readonly kind: "compiled.process-plan";
  readonly appId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly processId: string;

  readonly roles: readonly AppRole[];

  readonly resourceRequirements: readonly ResourceRequirement[];
  readonly providerSelections: readonly ProviderSelection[];
  readonly providerDependencyGraph: ProviderDependencyGraph;
  readonly compiledResources: readonly CompiledResourcePlan[];

  readonly serviceBindings: readonly CompiledServiceBindingPlan[];
  readonly surfaces: readonly CompiledSurfacePlan[];
  readonly workflowDispatchers: readonly CompiledWorkflowDispatcherPlan[];
  readonly harnesses: readonly HarnessPlan[];
  readonly executionPlans: readonly CompiledExecutionPlan[];
  readonly executionRegistryInput: CompiledExecutionRegistryInput;

  readonly bootgraphInput: BootgraphInput;
  readonly observationSeed: CompilationObservationSeed;
  readonly findings: readonly CompilationFinding[];
}
```

File: `packages/core/runtime/compiler/src/compiled-execution-plan.ts`  
Layer: runtime compiled execution plan  
Exactness: normative for compiled execution plan fields and absence of execution mode.

```ts
export interface CompiledExecutionPlan {
  readonly executionId: string;
  readonly boundary: ExecutionBoundaryKind;
  readonly policy: EffectExecutionPolicy;
  readonly telemetryLabels: readonly EffectTelemetryLabel[];
  readonly errorBridge: ErrorBridgeRef;
}

export interface CompiledExecutionRegistryInput {
  readonly executableBoundaries: readonly CompiledExecutableBoundaryInput[];
}

export interface CompiledExecutableBoundaryInput {
  readonly ref: ExecutionDescriptorRef;
  readonly planRef: {
    readonly executionId: string;
  };
}
```

The compiler compiles Effect execution descriptor refs into execution plans. It validates boundary, policy, telemetry labels, and error bridges. It does not execute execution descriptors and does not own live descriptor values.

Provider acquire/release policy and correlation facts are compiled into provider plans; only provider identity/dependency facts enter bootgraph input. Runtime-substrate-effect performs provider lowering under the resulting order/rollback metadata. None of this passes through `CompiledExecutionPlan`.

The compiled process plan carries these load-bearing compiled artifacts:

| Artifact | Contract |
| --- | --- |
| `CompiledServiceBindingPlan` | After the complete task-4.7a authority amendment, compiles `ServiceBindingPlan` with resolved resource, service, semantic, and amendment-admitted scope/config binding refs plus the amendment-fixed `ServiceBindingCacheKey` ingredients for process-runtime consumption. |
| `CompiledSurfacePlan` | Wraps `SurfaceRuntimePlan` with resolved service binding refs, executable boundary refs, adapter target, harness target, payload schema refs, and compilation findings. |
| `CompiledWorkflowDispatcherPlan` | Wraps `WorkflowDispatcherDescriptor` with selected workflow refs, async provider refs, event-admission policy, and compilation findings. |
| `CompiledExecutionPlan` | Wraps `ExecutionDescriptor` refs with boundary kind, Effect execution policy, telemetry labels, and error bridge refs. |
| `CompiledExecutionRegistryInput` | Records the pairings required to assemble the live `ExecutionRegistry`. |
| `HarnessPlan` | Records harness id, selected roles, selected surfaces, required lowered payload kinds, process access needs, and harness config refs. |
| `BootgraphInput` | Records ordering-only resource/provider identities and dependency edges; it carries no `ProviderEffectPlan` or executable acquisition/release callback. |

Provider dependency graph is a visible compiled artifact and bootgraph input.

File: `packages/core/runtime/compiler/src/provider-dependency-graph.ts`  
Layer: runtime compiler provider coverage artifact  
Exactness: normative for provider dependency graph role; illustrative for exact fields.

```ts
export interface ProviderDependencyGraph {
  readonly kind: "provider.dependency-graph";
  readonly nodes: readonly ProviderDependencyNode[];
  readonly edges: readonly ProviderDependencyEdge[];
  readonly closure: readonly ProviderDependencyClosureRecord[];
  readonly findings: readonly CompilationFinding[];
}

export interface ProviderDependencyNode {
  readonly providerId: string;
  readonly resourceId: string;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}

export interface ProviderDependencyEdge {
  readonly fromProviderId: string;
  readonly toResourceId: string;
  readonly reason: string;
}
```

Plan consumers:

| Plan section | Consumer |
| --- | --- |
| `providerDependencyGraph` | Compiler coverage findings and bootgraph ordering |
| `compiledResources` | Effect provisioning/execution kernel; only their identity/dependency facts enter bootgraph input |
| `serviceBindings` | Process runtime and service binding cache |
| `surfaces` | Process runtime and surface adapters |
| `workflowDispatchers` | Process runtime dispatcher materialization |
| `executionPlans` | Process execution runtime, execution registry, and surface adapters |
| `executionRegistryInput` | Process runtime execution registry assembly |
| `harnesses` | Process runtime handoff and runtime mounting |
| `bootgraphInput` | Bootgraph |
| `observationSeed` | Process runtime, then runtime mounting forwarding through the definition-owned observation boundary |
| `findings` | Compiler admission/startup policy; runtime mounting adapts admitted findings into definition-owned observation records |

Provider coverage validation is locked:

| Rule | Owner-local finding when violated |
| --- | --- |
| Every required resource has a selected provider at the relevant lifetime and instance | `provider.coverage.missing` |
| Provider dependencies close before provisioning | `provider.dependency.unclosed` |
| Provider dependency cycle is detected before bootgraph ordering | `provider.dependency.cycle` |
| Ambiguous provider coverage requires app-owned selection | `provider.coverage.ambiguous` |
| Optional resources remain explicitly optional | `resource.optional.required-by-consumer` |
| Multiple instances require instance keys | `resource.instance.missing-key` |
| Invalid lifetime or role scope request is rejected | `resource.lifetime.invalid` |

The runtime compiler does not acquire resources, bind live services, construct native functions, mount harnesses, write runtime catalog final status, or import observation-owned projection types. It emits a plan plus owner-local compilation findings.

## 17. Bootgraph and Effect-backed provisioning/execution kernel

### 17.1 Bootgraph

Bootgraph orders lifecycle.

`Bootgraph` is the Habitat lifecycle ordering graph above provider acquisition. It receives ordering-only `BootgraphInput` from the compiler and emits ordered resource keys plus rollback/reverse-release metadata for `runtime-substrate-effect`.

Bootgraph owns stable lifecycle identity, dependency graph resolution, deterministic ordering, dedupe, and rollback/reverse-release order as metadata. It does not consume provider plans, execute acquisition/release/rollback, register live finalizers, assemble typed live contexts, or produce `ProvisionedProcess`.

File: `packages/core/runtime/bootgraph/_tree.txt`  
Layer: runtime lifecycle placement  
Exactness: normative package placement and owner.

```text
packages/core/runtime/bootgraph/
  src/
    bootgraph.ts
    boot-resource-key.ts
    boot-resource-module.ts
    ordering.ts
    rollback-order.ts
    findings.ts
```

Bootgraph does not own app identity, app composition membership, service domain authority, plugin meaning, public API meaning, durable workflow semantics, native harness behavior, execution descriptor meaning, or deployment placement.

### 17.2 Boot resource key and module

File: `packages/core/runtime/bootgraph/src/boot-resource-module.ts`  
Layer: bootgraph module input  
Exactness: normative for bootgraph module responsibilities.

```ts
export interface BootResourceKey {
  readonly kind: "boot.resource-key";
  readonly resourceId: string;
  readonly lifetime: ResourceLifetime;
  readonly instanceKey?: string;
  readonly owner: RuntimeRequirementOwnerRef;
}

export interface BootResourceModule {
  readonly key: BootResourceKey;
  readonly providerId: string;
  readonly dependencies: readonly BootResourceKey[];
}
```

Bootgraph modules are ordering records emitted from compiler input. Provider authors do not author `BootResourceModule` directly, and these records carry no provider plan or executable callback. The substrate executes startup in bootgraph order, executes failed-startup rollback for already-acquired providers using rollback-order metadata, and releases in reverse order.

### 17.3 Effect provisioning/execution kernel

The Effect kernel runs local execution.

The Effect provisioning/execution kernel consumes compiled provider plans plus
bootgraph order/rollback metadata and creates exactly one `ManagedRuntime` per
started process. Its one substrate-owned `Layer.effectContext(...)` lifecycle
adapter executes provider plans in bootgraph order and returns the resource
Context. Because `ManagedRuntime.make(...)` is lazy, the substrate forces
`managedRuntime.context()` before producing `ProvisionedProcess` or permitting
mounting. That managed runtime owns its internal root and layer scopes and is
used for process-local `HabitatEffect` execution through process-runtime-owned
`EffectRuntimeAccess`. The substrate creates no second root `Scope` or managed
runtime. The substrate alone produces `ProvisionedProcess`.

File: `packages/core/runtime/substrate/effect/_tree.txt`  
Layer: Effect-backed runtime substrate  
Exactness: normative placement and responsibilities; illustrative for file names.

```text
packages/core/runtime/substrate/effect/
  src/
    managed-runtime-handle.ts
    lower-habitat-effect.ts
    provider-effect-lowering.ts
    provider-lifecycle-layer.ts
    provision-process.ts
    rollback.ts
    release.ts
    config.ts
    secrets.ts
    errors.ts
    observability.ts
    coordination.ts
    runtime-services.ts
```

Bootgraph owns lifecycle identity, deterministic ordering, dedupe, and rollback/release-order metadata only.

Effect substrate owns raw Effect lowering, the one provider-lifecycle layer
adapter, scoped acquisition, release, failed-startup rollback, layer-scoped
finalizers, runtime ownership, process/role resource Context assembly,
process-local coordination, structured runtime execution, typed local failure,
interruption, retry, timeout, and finalization mechanics inside runtime
boundaries. Bootgraph never becomes a `Layer` DAG. Domain services remain live
Habitat bindings outside the resource Context; they are not Effect Context
services or `Layer` nodes.

Effect local fibers, queues, schedules, pubsub, refs, streams, and caches are process-local runtime mechanics. They do not become durable workflow ownership.

### 17.4 `ProvisionedProcess`

File: `packages/core/runtime/substrate/effect/src/provisioned-process.ts`  
Layer: runtime provisioning artifact  
Exactness: normative for provisioning output, access producer, and finalization owner.

```ts
export interface ProvisionedProcess<TResources, TProvisionError> {
  readonly kind: "provisioned.process";
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly roles: readonly AppRole[];
  readonly managedRuntime: ManagedRuntimeHandle<TResources, TProvisionError>;
  readonly processResources: RuntimeResourceMap;
  readonly roleResources: RoleRuntimeResourceMap;
  readonly findings: readonly ProvisioningFinding[];
}
```

If provider acquisition fails during startup, `runtime-substrate-effect` rolls back already-acquired providers using bootgraph rollback-order metadata, disposes the managed runtime, publishes redacted observation records or returns owner-local provisioning findings, and does not produce `ProvisionedProcess` or permit harness mounting.

`runtime-substrate-effect` is the sole producer of `ProvisionedProcess`; that
artifact contains the already-built `ManagedRuntimeHandle`, resource maps
derived from its resource Context, and owner-local provisioning findings.
Provider finalizers remain in the managed runtime's layer scope rather than a
second finalizer registry. Runtime access scoping, `EffectRuntimeAccess`,
`ExecutionRegistry`, `ProcessExecutionRuntime`, bound service clients,
mount-ready surface records, adapter-lowered payloads, process-runtime stop
handle, and harness handles are not provisioning outputs.

## 18. Process runtime, runtime access, and service binding

### 18.1 Runtime access

`RuntimeAccess` is live operational access to provisioned values and runtime services. It is not diagnostics and not a read model.

File: `packages/core/runtime/process-runtime/src/runtime-access.ts`  
Layer: live runtime access  
Exactness: normative for live access surfaces, identity metadata, sanctioned hooks, and forbidden raw internals.

```ts
export interface RuntimeAccess {
  readonly process: ProcessRuntimeAccess;
  readonly roles: ReadonlyMap<AppRole, RoleRuntimeAccess>;
}

export interface ProcessRuntimeAccess {
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly roles: readonly AppRole[];

  resource<TResource extends RuntimeResource>(
    resource: TResource,
    input?: { instance?: string },
  ): RuntimeResourceValue<TResource>;

  optionalResource<TResource extends RuntimeResource>(
    resource: TResource,
    input?: { instance?: string },
  ): RuntimeResourceValue<TResource> | undefined;
}

export interface RoleRuntimeAccess {
  readonly role: AppRole;
  readonly process: ProcessRuntimeAccess;
  readonly selectedSurfaces: readonly RoleSurfaceIdentity[];

  resource<TResource extends RuntimeResource>(
    resource: TResource,
    input?: { instance?: string },
  ): RuntimeResourceValue<TResource>;

  optionalResource<TResource extends RuntimeResource>(
    resource: TResource,
    input?: { instance?: string },
  ): RuntimeResourceValue<TResource> | undefined;

  forSurface(input: {
    surface: string;
    capability: string;
    instance?: string;
  }): SurfaceRuntimeAccess;
}

export interface SurfaceRuntimeAccess {
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly instance?: string;
  readonly roleAccess: RoleRuntimeAccess;
}
```

Runtime access does not expose observation-owned diagnostic, telemetry, topology-record, or catalog APIs. Process-runtime interiors return owner-local findings with their mount-ready handoff; owners that directly depend on `runtime-definition` may instead publish `RuntimeObservationRecord` values through its narrow port. Neither route grants mutation or live-value authority.

Runtime access never exposes raw Effect `Layer`, raw Context keys, `Scope`,
`ManagedRuntime`, provider internals, or unredacted config secrets.
`EffectRuntimeAccess` stays inside `runtime-process-runtime`; SDK delegating
hooks never import or expose it.

Service procedures do not receive broad `RuntimeAccess`. They receive declared `deps`, `scope`, `config`, per-call `invocation`, and execution-derived `provided`.

### 18.2 Process runtime

The process runtime assembles processes.

`ProcessRuntime` consumes `CompiledProcessPlan`, `ExecutionDescriptorTable`, the
distinct `WebRouteModuleTable`, and `ProvisionedProcess`. It returns mount-ready
surface records, adapter-lowered payloads and harness-plan inputs, owner-local
findings, plus its own `stop(): Promise<void>` handle. It neither invokes
harnesses nor returns `StartedHarness`. Only Effect executable boundaries enter
`ExecutionRegistry`; web route-module refs are resolved by the web adapter
against `WebRouteModuleTable`.

File: `packages/core/runtime/process-runtime/_tree.txt`  
Layer: process runtime placement  
Exactness: normative placement and runtime ownership.

```text
packages/core/runtime/process-runtime/
  src/
    create-process-runtime.ts
    runtime-access.ts
    bind-service.ts
    service-binding-cache.ts
    workflow-dispatcher.ts
    execution-registry.ts
    mount-surfaces.ts
    surface-runtime-record.ts
    execution-runtime.ts
    effect-runtime-access.ts
    stop.ts
```

Process runtime owns:

| Responsibility | Input | Output |
| --- | --- | --- |
| Runtime access scoping | `ProvisionedProcess`, `CompiledProcessPlan` | Process, role, and surface runtime access |
| Service binding | `CompiledServiceBindingPlan` values, runtime access | Live service clients |
| Service binding cache | Binding inputs | Cached live service clients |
| Invocation-bound client view creation | Cached construction-bound binding, invocation context | Effect-facing per-call client views |
| Workflow dispatcher materialization | Dispatcher plans, selected workflow definitions, provisioned async client | Live `WorkflowDispatcher` |
| Execution registry assembly | Compiled execution plans, descriptor refs, descriptor table | Live `ExecutionRegistry` |
| Web route-module resolution | Compiled web surface plans, `WebRouteModuleRef` values, `WebRouteModuleTable` | Native web module-loader handoff outside `ExecutionRegistry` |
| Plugin projection | Compiled surface plans, bound clients, role access | `MountReadySurfaceRuntimeRecord` values |
| Runtime adapter lowering | Compiled surface plans, matching Effect descriptor or web route-module channels as required | Adapter-lowered payloads and callbacks |
| Mount-ready handoff | Mount-ready surface runtime records, lowered payloads, harness plans | Records consumed by runtime mounting |
| Process execution runtime | Execution registry, non-oRPC execution plans and descriptors, Effect runtime access | Centralized non-oRPC Effect execution bridge |
| Owner-local observation | Compiler observation seed and process events | Process-runtime findings consumed by runtime mounting and forwarded through the definition-owned observation boundary |
| Process-runtime stop | Bound services, runtime adapters, dispatchers, and provisioned process | Process-owned stop handle; no harness handles |

`MountReadySurfaceRuntimeRecord` is a process-runtime-owned handoff record. It
carries surface identity, a compiled surface-plan reference, bound-service
references, the adapter-lowered payload, and owner-local findings or observation
records. It represents no native mount and carries no `StartedHarness` handle.

Runtime mounting invokes harnesses only after this handoff succeeds. On shutdown it stops collected harnesses in reverse mount order, then invokes the process-runtime stop handle. That handle releases process-runtime state and delegates provisioned role/process release and managed-runtime disposal to the substrate. Runtime mounting is the only cross-owner finalization owner; runtime observation remains read-only.

### 18.3 `ExecutionRegistry`

The registry matches execution.

`ExecutionRegistry` is assembled once per started process after provisioning and
before adapter lowering. It maps every non-oRPC executable boundary ref used by
compiled surfaces to exactly one matched `CompiledExecutionPlan` and
`EffectExecutionDescriptor`. Native oRPC operations are deliberately absent;
their native implementer plus official bridge is already executable.

File: `packages/core/runtime/process-runtime/execution-registry.ts`  
Layer: process runtime execution registry  
Exactness: normative for descriptor/plan matching, descriptor table consumption, and validation.

```ts
export function createExecutionRegistry(input: {
  processId: string;
  registryInput: CompiledExecutionRegistryInput;
  executionPlans: readonly CompiledExecutionPlan[];
  descriptorTable: ExecutionDescriptorTable;
}): ExecutionRegistry;
```

Registry assembly must validate:

File: `specification://runtime-realization/execution-registry-validation.txt`  
Layer: process runtime execution registry  
Exactness: normative.

```text
descriptor table is present
every registry input ref resolves to exactly one descriptor
every registry input planRef resolves to exactly one compiled execution plan
descriptor.executionId === plan.executionId
descriptor.boundary === plan.boundary
duplicate execution ids are rejected
missing executable boundaries are rejected
```

Adapters do not independently pair plans and descriptors. They resolve executable boundaries through `ExecutionRegistry`.

### 18.4 `ProcessExecutionRuntime`

The execution runtime runs non-oRPC descriptor invocations.

Runtime invocation of non-oRPC Effect descriptors is centralized. Harnesses and
adapters do not independently lower or run `HabitatEffect`. This owner never
executes an Effect-backed oRPC operation; the official `.effect(...)` bridge
does.

File: `packages/core/runtime/process-runtime/execution-runtime.ts`  
Layer: process runtime execution bridge  
Exactness: normative for centralized Effect descriptor execution and explicit invocation input; illustrative for generic spelling.

```ts
export interface ProcessExecutionRuntime {
  execute<TInput, TSuccess, TError, TContext>(input: {
    boundary: CompiledExecutableBoundary<TInput, TSuccess, TError, TContext>;
    invocation: ProcedureExecutionContext<TInput, TContext>;
  }): Promise<TSuccess>;

  executeExit<TInput, TSuccess, TError, TContext>(input: {
    boundary: CompiledExecutableBoundary<TInput, TSuccess, TError, TContext>;
    invocation: ProcedureExecutionContext<TInput, TContext>;
  }): Promise<EffectExecutionExit<TSuccess, TError>>;
}
```

Execution rules:

File: `specification://runtime-realization/process-execution-runtime-rules.txt`  
Layer: process runtime execution bridge  
Exactness: normative.

```text
execution.effect
  -> receive matched CompiledExecutableBoundary
  -> validate boundary.plan.executionId equals boundary.descriptor.executionId
  -> receive explicit ProcedureExecutionContext
  -> resolve CompiledExecutionPlan.errorBridge into EffectErrorBridge
  -> resolve CompiledExecutionPlan.telemetryLabels into EffectTelemetryBridge
  -> call descriptor.run(invocation)
  -> receive HabitatEffect
  -> run through EffectRuntimeAccess
  -> apply Effect execution policy
  -> bridge errors/telemetry through compiled plan
  -> return Promise result or structured exit to adapter/native host interop
```

The process runtime supplies `EffectRuntimeAccess` only to non-oRPC descriptor
lanes. Services and plugins do not receive it, and official Effect-oRPC does not
call it.

### 18.5 `ServiceBindingCache` and `ServiceBindingCacheKey`

Service binding is construction-time over `deps`, `scope`, and `config`. `invocation` is supplied per call and does not participate in `ServiceBindingCacheKey`.

After the complete task-4.7a authority amendment fixes their schemas, process runtime consumes
`CompiledServiceBindingPlan`, resolves its amendment-admitted binding references
against live `RuntimeAccess`, and alone owns
`bindService(...)` plus `ServiceBindingCache`. It does not consume authoring
`ServiceUse` declarations or uncompiled `ServiceBindingPlan` artifacts.

File: `packages/core/runtime/process-runtime/src/service-binding-cache.ts`  
Layer: runtime service binding cache  
Exactness: normative for invocation exclusion and `getOrCreate(...)` ownership;
the exact cache-key ingredients remain reserved to the binding-source portion
of task 4.7a.

```ts
export interface ServiceBindingCache {
  getOrCreate(input: {
    key: ServiceBindingCacheKey;
    plan: CompiledServiceBindingPlan;
    create: () => ConstructionBoundServiceClient<any>;
  }): ConstructionBoundServiceClient<any>;
}
```

`ServiceBindingCacheKey` excludes invocation. Call-local memoization is separate from `ServiceBindingCache`.
Its remaining fields are not specified before the binding-source portion of
the task-4.7a Designer amendment.

`bindService(...)` constructs a live service binding from provisioned resource values, sibling service clients, semantic adapters, scope, and config.

File: `packages/core/runtime/process-runtime/src/bind-service.ts`  
Layer: runtime service binding  
Exactness: normative for construction-time binding; illustrative for function signature.

```ts
export function bindService(input: {
  plan: CompiledServiceBindingPlan;
  resources: RuntimeResourceMap;
  serviceClients: ServiceClientMap;
  semanticAdapters: SemanticAdapterMap;
  scope: unknown;
  config: unknown;
  cache: ServiceBindingCache;
}): ConstructionBoundServiceClient<any>;
```

Trusted same-process application callers executing through the Habitat runtime use runtime-supplied invocation-aware Effect clients. External or deliberately boundary-crossing callers may use generated Promise clients.

## 19. WorkflowDispatcher and async runtime integration

### 19.1 `WorkflowDispatcher`

Dispatcher bridges workflows.

`WorkflowDispatcher` is a live runtime integration artifact materialized by the process runtime from selected workflow definitions plus the provisioned process async client.

Runtime derivation derives dispatcher descriptors, and the runtime compiler
produces compiled dispatcher plans. The live dispatcher materializes only after
provisioning. Server API and server internal projections may wrap event
admission for caller-facing surfaces. Workflow plugins do not expose
caller-facing product APIs.

File: `packages/core/runtime/process-runtime/src/workflow-dispatcher.ts`  
Layer: live runtime dispatcher integration  
Exactness: normative for producer/consumer boundary and live materialization role; illustrative for method names.

```ts
export interface WorkflowDispatcher {
  send<TPayload>(
    workflow: WorkflowDefinition<TPayload>,
    payload: TPayload,
    options?: WorkflowDispatchOptions,
  ): Promise<WorkflowDispatchResult>;
}

export interface WorkflowDispatchResult {
  readonly ok: boolean;
  readonly eventIds: readonly string[];
  readonly admissionId?: string;
  readonly acceptedAt: string;
  readonly reason?: string;
}
```

`WorkflowDispatcher.send(...)` confirms native event admission and returns event
or admission identity. It MUST NOT label that result as workflow run identity.
Status lookup and cancellation by run identity require a separately named,
selected, and provisioned workflow-control capability. When used inside a
plugin-owned executable body managed by Habitat, dispatcher send interop is
wrapped by `Effect.tryPromise(...)` or a sanctioned dispatcher Effect facade.
The dispatcher does not own workflow semantics, expose product APIs by itself,
construct native functions, classify projection status, acquire the async
provider, inspect runs, or cancel runs.

### 19.2 Async lowering chain

Workflow, schedule, and consumer definitions lower through the runtime chain
into a private `FunctionBundle` registration factory.

File: `specification://runtime-realization/async-lowering-chain.txt`  
Layer: async lowering sequence  
Exactness: normative for producer/consumer order.

```text
WorkflowDefinition / ScheduleDefinition / ConsumerDefinition
  -> runtime-derived async surface plan exposed through the SDK
  -> runtime compiled async surface plan
  -> async SurfaceAdapter
  -> private FunctionBundle registration factory
  -> Inngest harness
```

Ordinary async plugin authoring returns app-owned workflow, schedule, or consumer definitions expressed through Habitat's grammar. It does not manually acquire the Inngest client, call runtime access directly to construct native functions, or construct the harness-facing bundle.

### 19.3 `FunctionBundle`

FunctionBundle carries a private registration factory.

`FunctionBundle` is the async harness-facing derived/lowered registration
factory consumed by the Inngest harness. It remains client-free until the
harness materializes it with exactly the provisioned native Inngest client
supplied to the selected Serve or Connect harness. `WorkflowDispatcher` is a
separate named consumer and process-runtime materialization, not part of this
factory's materialization. `FunctionBundle` is not public authoring, service
API, product invocation contract, or a parallel metadata source.

File: `packages/core/runtime/harnesses/inngest/src/function-bundle.ts`  
Layer: async harness-facing lowered registration factory  
Exactness: normative for private factory role, same-client materialization, and
absence of dispatcher metadata; illustrative for native function types and
factory spelling.

```ts
export interface FunctionBundle {
  readonly kind: "harness.inngest.function-bundle";
  readonly appId: string;
  readonly processId: string;
  readonly runtimePayloadSchemas: readonly RuntimeSchema[];
  readonly findings: readonly AdapterFinding[];
  readonly observations: readonly AdapterObservation[];

  materialize(input: {
    client: InngestNativeClient;
    executionRegistry: ExecutionRegistry;
    processExecutionRuntime: ProcessExecutionRuntime;
  }): readonly InngestNativeFunction[];
}
```

Producer: async `SurfaceAdapter`. Consumer: Inngest harness. Lifecycle phase:
adapter lowering during mounting. The harness passes its already provisioned
client to `materialize(...)`; the factory MUST NOT construct or capture a
second client.

It does not classify projection status, own workflow semantics, expose product
APIs, carry a live `WorkflowDispatcher`, or carry a `dispatcherDescriptor`.
No `dispatcherDescriptor` field may return without a named consumer and an
accepted owner edge.

### 19.4 Async step-local Effect facade

Async step-local Effect execution must be mounted through the Inngest step boundary.

File: `packages/core/sdk/src/plugins/async/effect/index.ts`  
Layer: async step-local Effect facade  
Exactness: normative for step-local ownership and Promise boundary; illustrative for exact generic spelling.

```ts
export interface AsyncStepEffectFacade {
  run<TOutput, TError, TRequirements>(
    descriptor: AsyncStepEffectDescriptor<TOutput, TError, TRequirements>,
  ): Promise<TOutput>;
}

export interface AsyncStepEffectDescriptor<
  TOutput,
  TError,
  TRequirements,
  TServiceUses extends ServiceUses = ServiceUses,
> {
  readonly kind: "async.step-effect";
  readonly id: string;
  readonly effect: (
    ctx: AsyncStepExecutionContext<TServiceUses>,
  ) =>
    | Generator<unknown, TOutput, unknown>
    | HabitatEffect<TOutput, TError, TRequirements>;
}

export interface AsyncStepBridgeInput<
  TServiceUses extends ServiceUses = ServiceUses,
> {
  readonly step: InngestStepApi;
  readonly event: AsyncEventContext;
  readonly clients: InvocationBoundEffectServiceClients<TServiceUses>;
  readonly resources: RuntimeResourceAccess;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}

export interface AsyncStepExecutionContext<
  TServiceUses extends ServiceUses = ServiceUses,
> {
  readonly event: AsyncEventContext;
  readonly clients: InvocationBoundEffectServiceClients<TServiceUses>;
  readonly resources: RuntimeResourceAccess;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}

export function defineAsyncStepEffect<
  TOutput,
  TError,
  TRequirements,
  TServiceUses extends ServiceUses = ServiceUses,
>(input: {
  readonly id: string;
  readonly effect: AsyncStepEffectDescriptor<
    TOutput,
    TError,
    TRequirements,
    TServiceUses
  >["effect"];
}): AsyncStepEffectDescriptor<TOutput, TError, TRequirements, TServiceUses>;

export function stepEffect<TServiceUses extends ServiceUses>(
  input: AsyncStepBridgeInput<TServiceUses>,
): AsyncStepEffectFacade;
```

Complete runtime derivation derives async step Effect descriptor refs and their
non-portable table from `defineAsyncStepEffect(...)`; their public contracts
are exposed at `@habitat-ai/sdk/runtime/derivation`.
`stepEffect(input).run(descriptor)` binds a pre-derived descriptor to the native
step invocation. `stepEffect(...)` does not accept inline executable bodies and
does not make descriptor discovery depend on executing workflow `run(...)` or
parsing workflow source code.

The materialized native function implements that call through the exact step
boundary:

File: `packages/core/runtime/harnesses/inngest/src/materialize-function-bundle.ts`  
Layer: private native Inngest step bridge  
Exactness: normative for `step.run(...)` delegating a pre-derived descriptor to
`ProcessExecutionRuntime`; illustrative for helper names.

```ts
return step.run(descriptor.id, () =>
  processExecutionRuntime.execute({
    boundary: executionRegistry.get(executionDescriptorRef(descriptor)),
    invocation: buildAsyncStepExecutionContext(nativeInvocation, descriptor),
  })
);
```

Effect retries inside async steps are local/transient unless explicitly
coordinated with Inngest policy. Inngest owns durability, step replay,
schedules, event history, workflow run identity, and durable async semantics.
Replay re-enters the native function and its `step.run(...)` registration; it
never resumes a retained Effect fiber. A completed memoized step returns native
memoized state without invoking the callback or `ProcessExecutionRuntime`; a
failed or otherwise un-memoized attempt invokes the callback anew. Native
cancellation is observable between
steps. The bridge does not synthesize an `AbortSignal` or claim interruption of
an already-running step callback unless the selected native API supplies and
proves that signal.

## 20. Surface adapter lowering

Adapters translate surfaces.

Surface adapters lower `CompiledSurfacePlan` artifacts emitted by the runtime
compiler into native harness-facing payloads. They do not lower runtime-derived
`SurfaceRuntimePlan` descriptors, raw authoring declarations, or SDK facades
directly. They may produce non-oRPC native payload closures that call
`ProcessExecutionRuntime` at invocation time. For oRPC they preserve the native
procedure and application/process-owned `effect/context` and `effect/wrap`, and
the official `.effect(...)` bridge owns invocation. Its internal
`handlerGen(...)` remains vendor mechanics. Adapters do not execute descriptors
during lowering.

File: `packages/core/runtime/process-runtime/src/surface-adapter.ts`  
Layer: runtime adapter lowering contract  
Exactness: normative for adapter input, execution registry, lowered result, observability, and forbidden sources.

```ts
export interface SurfaceAdapter<
  TPlan extends CompiledSurfacePlan = CompiledSurfacePlan,
  TPayload = unknown,
> {
  readonly role: AppRole;
  readonly surface: string;
  readonly harness: string;

  lower(input: {
    plan: TPlan;
    processAccess: ProcessRuntimeAccess;
    roleAccess: RoleRuntimeAccess;
    serviceBindings: BoundServiceBindingMap;
    executionRegistry: ExecutionRegistry;
    executionRuntime?: ProcessExecutionRuntime;
    effectORPCContext?: WithEffectContext<unknown>;
  }): AdapterLoweringResult<TPayload>;
}

export interface AdapterLoweringResult<TPayload> {
  readonly payload: TPayload;
  readonly payloadSchemas: readonly RuntimeSchema[];
  readonly findings: readonly AdapterFinding[];
  readonly observations: readonly AdapterObservation[];
}
```

Adapter identity does not classify public/internal projection status. Topology plus builder does that before adapter lowering.

Surface adapters are the only runtime layer that translates compiled surface plans into harness-facing native payloads. Harnesses consume mount-ready surface runtime records or adapter-lowered payloads. Harnesses never consume raw authoring declarations, normalized authoring graphs, or compiler plans directly.

Adapter rules:

File: `specification://runtime-realization/adapter-rules.txt`  
Layer: adapter lowering law  
Exactness: normative.

```text
Adapters may produce non-oRPC native payload closures that call ProcessExecutionRuntime at invocation time.
Adapters resolve non-oRPC plan/descriptor pairs through ExecutionRegistry.
Adapters preserve native oRPC procedures and application/process effect/context and effect/wrap.
Adapters never wrap an oRPC Effect in ProcessExecutionRuntime or another runner.
Adapters do not execute descriptors during lowering.
Adapters do not construct raw Effect runtimes.
Adapters do not import raw Effect; raw Effect lowering belongs only to runtime-substrate-effect.
Adapters do not contain application business/capability execution logic.
```

A non-oRPC native host callback is conceptually:

File: `specification://runtime-realization/native-host-callback.ts`  
Layer: native host interop  
Exactness: illustrative shape; normative for non-oRPC registry resolution and delegation rule.

```ts
async function nativeHostCallback(nativeInput: unknown) {
  const boundary = executionRegistry.get(route.executionRef);

  return processExecutionRuntime.execute({
    boundary,
    invocation: buildProcedureExecutionContext(nativeInput),
  });
}
```

The Promise returned by a non-oRPC callback is host interop. The underlying
owner-authored execution body remains Effect and runs through the
Habitat-managed bridge. An oRPC callback instead returns the Promise from
the official bridge without another runner.

Official Effect-oRPC bridge code is selected from:

File: `specification://runtime-realization/effect-orpc-adapter-containment.txt`  
Layer: native bridge import law  
Exactness: normative for the exact selected package.

```text
@orpc/experimental-effect@2.0.0-beta.23 extensions/effect
vendor-internal handlerGen mechanism (source proof only)
```

Service and plugin authors use native `.handler(...)` for synchronous/Promise
operations and official `.effect(...)` for Effect operations. They never import
`handlerGen(...)`, construct an adapter, call bridge `runPromise` directly, use
manual `Effect.run*`, or route oRPC execution through
`ProcessExecutionRuntime`.

## 21. Harness and native boundary contracts

Harnesses mount hosts.

Harnesses own native mounting after runtime realization and adapter lowering. Runtime mounting invokes them with process-runtime mount-ready inputs. They do not consume normalized authoring graphs or compiler plans directly.

File: `packages/core/runtime/harnesses/harness-descriptor.ts`  
Layer: public import-safe runtime harness contract  
Exactness: normative for every exported name, field, return type, and native
ownership boundary.

```ts
import type { RuntimeLaunchIdentity } from
  "../definition/src/app/runtime-launch-identity.js";

export type { RuntimeLaunchIdentity };

export interface HarnessFinding {
  readonly code: string;
  readonly message: string;
  readonly severity: "info" | "warning" | "error";
}

export interface RequiredResourceReadinessRecord {
  readonly resource: string;
  readonly ready: boolean;
  readonly findings: readonly HarnessFinding[];
}

export interface RequiredResourceReadiness {
  readonly ready: boolean;
  readonly resources: readonly RequiredResourceReadinessRecord[];
}

export type HarnessHealthKind = "readiness" | "liveness";
export type HarnessHealthStatus =
  | "passing"
  | "failing"
  | "not-applicable"
  | "unknown";

export interface HarnessHealthReport {
  readonly launchIdentity: RuntimeLaunchIdentity;
  readonly harnessId: string;
  readonly kind: HarnessHealthKind;
  readonly status: HarnessHealthStatus;
  readonly findings: readonly HarnessFinding[];
}

export interface HarnessReportSink {
  report(report: HarnessHealthReport): void | Promise<void>;
}

export interface HarnessMountInput<TMountPayload = unknown> {
  readonly launchIdentity: RuntimeLaunchIdentity;
  readonly roles: readonly AppRole[];
  readonly mountReadyPayloads: readonly TMountPayload[];
  readonly processAccess: ProcessRuntimeAccess;
  readonly requiredResources: RequiredResourceReadiness;
  readonly reports: HarnessReportSink;
}

export interface NativeHarnessHandle {
  stop(): Promise<void>;
  readiness?(): Promise<HarnessHealthReport>;
  liveness?(): Promise<HarnessHealthReport>;
}

export interface HarnessDescriptor<TMountPayload = unknown> {
  readonly id: string;
  readonly roles: readonly AppRole[];
  readonly surfaces: readonly string[];

  mount(
    input: HarnessMountInput<TMountPayload>,
  ): Promise<NativeHarnessHandle>;
}
```

Every `NativeHarnessHandle.stop()` is idempotent: repeated or concurrent calls
share the same owner-local stop operation. Readiness and liveness are optional,
distinct probes. Every `HarnessHealthReport`, whether returned by a probe or
sent to `HarnessReportSink`, must carry the exact `RuntimeLaunchIdentity` from
the mount input, the descriptor id as `harnessId`, the truthful probe `kind`,
and an evidence-backed `status` and `findings`. `unknown`, missing, rejected,
timed-out, or mismatched evidence never becomes passing readiness. Required
resource readiness is a read-only input produced before mount; a harness may
not mutate it or use its report sink to promote a failed required resource.

`HarnessMountInput`, `NativeHarnessHandle`, `HarnessHealthReport`,
`HarnessReportSink`, and the supporting interface types are import-safe public
contract types. Exporting `NativeHarnessHandle` as an interface is required;
the public SDK must not export a live handle value, handle accessor, live-handle
registry, or `StartedHarness`.

File: `packages/core/runtime/mounting/src/started-harness.ts`  
Layer: private runtime-mounting lifecycle wrapper  
Exactness: normative for private ownership and construction inputs;
illustrative for mount-metadata fields.

```ts
interface StartedHarness {
  readonly descriptorId: string;
  readonly nativeHandle: NativeHarnessHandle;
  readonly findings: readonly HarnessFinding[];
  readonly launchIdentity: RuntimeLaunchIdentity;
  readonly mount: {
    readonly mountedAt: string;
    readonly roles: readonly AppRole[];
    readonly surfaces: readonly string[];
  };
}
```

Only runtime mounting creates `StartedHarness`, and only after
`HarnessDescriptor.mount(...)` succeeds. It constructs that private wrapper
from descriptor identity, the returned native handle, accepted owner-local
findings, the frozen launch identity, and mount metadata. Runtime mounting
adapts admitted findings into `RuntimeObservationRecord` values, publishes
harness observations through the definition-owned observation boundary, and
on failed startup or normal shutdown stops private wrappers in reverse mount
order before invoking the process-runtime stop handle. Runtime observation
alone projects the admitted records.

### 21.1 Elysia harness

Placement: `packages/core/runtime/harnesses/elysia`.

Input: `HarnessMountInput<MountReadySurfaceRuntimeRecord<ElysiaRoutePayload>>`
carrying mounted server API/internal payloads, server harness config, bounded
process access, launch identity, required-resource readiness, and report sink.

Output: mounted Elysia routes; mounted native oRPC callbacks whose
Effect-backed operations execute through official `.effect(...)`; public
OpenAPI publication for selected public API projections; internal RPC handlers
for selected internal projections; `NativeHarnessHandle` plus truthful
`HarnessHealthReport` values. Non-oRPC descriptor
callbacks may delegate to `ProcessExecutionRuntime`.

Boundary rule: Elysia owns HTTP host lifecycle and request routing. It does not own public API meaning, service construction, provider selection, app membership, or runtime provisioning.

### 21.2 Inngest harness

Placement: `packages/core/runtime/harnesses/inngest`.

The future harness selects native `inngest@4.18.0`. This specification does not
land the dependency; the harness implementation task must add and prove that
exact version at its owner. `effect-inngest` is rejected. Habitat integrates the
native client, function, step, Serve, and Connect APIs directly behind its
runtime boundaries.

Input: `HarnessMountInput<FunctionBundle>` carrying the private registration
factory, launch identity, async roles, required-resource readiness, bounded
process access, and report sink, plus the selected and provisioned native
Inngest client and async harness mode. The harness materializes the factory with
exactly the client supplied to that selected Serve or Connect harness. It does
not construct a second registration client. `WorkflowDispatcher` is a separate
named consumer and process-runtime materialization.

Output: Connect worker or Serve-mode runtime ingress, native Inngest functions,
native async handles used by runtime dispatcher integration, and one
`NativeHarnessHandle` plus truthful `HarnessHealthReport` values. The harness
does not produce or own `WorkflowDispatcher`.

**Step execution.** Each materialized native step calls exactly
`step.run(id, () => ProcessExecutionRuntime...)`; the callback delegates its
pre-derived boundary to `ProcessExecutionRuntime` and returns the resulting
Promise. Replay re-enters the native function and `step.run(...)` registration;
it does not resume an Effect fiber. A completed memoized step returns native
memoized state without invoking the callback or `ProcessExecutionRuntime`; a
failed or otherwise un-memoized attempt invokes the callback anew.
Cancellation is observed between steps. No
adapter-created `AbortSignal` is admitted for an in-flight step callback unless
the selected native API supplies and proves one.

**Serve lifecycle.** The Habitat-owned HTTP host admits the Promise returned by
the native Serve handler into an owner-local active set before returning it to
the server. Stop first closes new HTTP admission, then waits for every admitted
handler Promise to settle, and only then permits process resources and the one
managed runtime to dispose. Handler settlement is a local drain fact, not a
universal claim that every event, checkpoint, or workflow result has been
delivered.

**Connect lifecycle.** Habitat constructs native Connect with
`handleShutdownSignals: []`; runtime mounting remains the sole signal and
cross-owner shutdown coordinator. Exact 4.18 source leaves one callback path
outside native close proof: `RequestProcessor.handleExtendLeaseAck` deletes the
request from `requestLeases` when renewal is denied while explicitly allowing
the user callback to continue; `ConnectionCore.close` and `reconcileLoop` gate
on `requestLeases`; `waitForInProgress` exists, but
`SameThreadStrategy.close` does not call it. The owner-local callback tracker is
therefore required around every materialized native callback. Runtime mounting
owns one outer single-flight stop, invokes and awaits native `close()` exactly
once, then waits for that owner tracker to reach zero before provider release.
Native Connect close or flush is transport lifecycle behavior; it never proves
delivery or callback completion. Reports preserve only evidence-backed
`presented`, `confirmed`, `dropped`, or `unknown` truth.

Boundary rule: Inngest owns durable async execution semantics. It does not own workflow meaning, service domain authority, caller-facing API semantics, app membership, provider selection, or runtime provisioning.

### 21.3 OCLIF harness

Placement: foundational Habitat CLI harness implemented and distributed by
`@habitat-ai/cli` (reference source placement:
`apps/habitat/src/harness/oclif`).

The Oclif `SurfaceAdapter` implementation remains in
`packages/core/runtime/process-runtime`; it lowers the compiled CLI surface
before this harness receives the payload. The CLI package does not implement a
second adapter.

Input: `HarnessMountInput<MountReadySurfaceRuntimeRecord<OclifCommandPayload>>`
carrying adapter-lowered command payloads from the app-selected
`plugins/cli/topics/*` packages, launch identity, role/process access,
required-resource readiness, and report sink.

Output: native OCLIF command registration/materialization, native command
callbacks that delegate to `ProcessExecutionRuntime`, one
`NativeHarnessHandle`, and truthful `HarnessHealthReport` values.

Boundary rule: the selected topic plugin retains projection and command-body
authority; `@habitat-ai/cli` owns the foundational loader, harness, and selected
topic materialization; OCLIF owns command parsing and dispatch semantics. None
owns service semantics or app selection outside its boundary.

### 21.4 Web harness

Placement: `packages/core/runtime/harnesses/web`.

Input: `HarnessMountInput<MountReadySurfaceRuntimeRecord<WebHostPayload>>`
carrying web app surface payloads, launch identity, client publication metadata,
bounded process access, required-resource readiness, and report sink, plus
process profile and web host config.

Output: web app mount/build/serve handoff appropriate to the selected web host,
one `NativeHarnessHandle`, and truthful `HarnessHealthReport` values.

Boundary rule: web hosts own rendering, bundling, routing, and browser-native behavior inside their boundary. They do not own service domain authority, server API projection classification, or provider acquisition.

### 21.5 Agent/OpenShell harness

Placement: `packages/core/runtime/harnesses/agent`.

Input: `HarnessMountInput<MountReadySurfaceRuntimeRecord<AgentHostPayload>>`
carrying agent channel/shell/tool surface payloads, launch identity,
OpenShell-related runtime-resource readiness, bounded process access, report
sink, and policy hooks.

Output: channel mounts, shell mounts, tool mounts, OpenShell host payloads,
native tool callbacks that delegate to `ProcessExecutionRuntime`, one
`NativeHarnessHandle`, and truthful `HarnessHealthReport` values.

Boundary rule: OpenShell and agent hosts own native shell behavior inside their harness boundary. Agent governance remains a reserved boundary with locked integration hooks. Agent plugins do not move service domain authority or broad runtime access into agent-local semantics.

### 21.6 Desktop harness

Placement: `packages/core/runtime/harnesses/desktop`.

Input: `HarnessMountInput<MountReadySurfaceRuntimeRecord<DesktopHostPayload>>`
carrying desktop menubar/window/background surface payloads, launch identity,
bounded process access, required-resource readiness, and report sink, plus
desktop host config.

Output: native desktop mount payloads, host callbacks that delegate to
`ProcessExecutionRuntime`, one `NativeHarnessHandle`, and truthful
`HarnessHealthReport` values.

Boundary rule: desktop hosts own native desktop interiors. Menubar, window, and background surfaces are process-local projections. Durable business execution remains on `async`.

## 22. Diagnostics, telemetry, catalog, and observation

The cold observation contract is upstream of every emitting phase. Its TypeBox
record schema and narrow operational port belong to `runtime-definition`; the
downstream `runtime-observation` owner implements the port and projects admitted
records into diagnostics, telemetry, topology-record, and catalog views.

File: `packages/core/runtime/definition/src/runtime-observation.ts`  
Layer: cold runtime definition  
Exactness: normative for ownership, direction, and non-authorizing behavior;
illustrative for exact record fields.

```ts
import { Type, type Static } from "typebox";
import { RuntimeLifecyclePhaseSchema } from "./runtime-lifecycle-phase";

export const RuntimeObservationRecordSchema = Type.Object({
  phase: RuntimeLifecyclePhaseSchema,
  boundary: Type.String({ description: "Qualified runtime boundary that emitted the record." }),
  kind: Type.String({ description: "Stable observation kind within the emitting boundary." }),
  correlationId: Type.String({ description: "Process or invocation correlation identity." }),
  payload: Type.Unknown({ description: "Owner-produced bounded payload before runtime-observation projection." }),
});

export type RuntimeObservationRecord = Static<typeof RuntimeObservationRecordSchema>;

export interface RuntimeObservationPort {
  publish(record: RuntimeObservationRecord): void;
}
```

An upstream owner either returns findings in its own contract to an admitted
downstream consumer or, where the exact private graph admits a direct
`runtime-definition` dependency, publishes `RuntimeObservationRecord` through
this port. It never imports `RuntimeDiagnostic`, `RuntimeTelemetry`,
`RuntimeTopologyRecord`, `RuntimeCatalog`, or the runtime-observation implementation.
Publication failure cannot select providers, acquire resources, advance
finalization, or replace a product result.

`RuntimeObservationRecord` is observation-only. Publishing or projecting one
cannot select providers, acquire resources, mutate runtime state, advance a
lifecycle, invoke or stop harnesses, or change finalization.

### 22.1 `RuntimeDiagnostic`

Runtime observation projects diagnostics.

`RuntimeDiagnostic` is a structured runtime finding, violation, status, or lifecycle event.

File: `packages/core/runtime/observation/src/runtime-diagnostic.ts`  
Layer: runtime diagnostics  
Exactness: normative for diagnostic sections and canonical phase enum.

```ts
export type RuntimeLifecyclePhase =
  | "definition"
  | "selection"
  | "derivation"
  | "compilation"
  | "provisioning"
  | "mounting"
  | "observation";

export interface RuntimeDiagnostic<TPayload = unknown> {
  readonly id: string;
  readonly severity: "info" | "warning" | "error" | "fatal";
  readonly phase: RuntimeLifecyclePhase;
  readonly recordKind?: "finding" | "status" | "finalization" | "rollback";

  readonly boundary:
    | "service"
    | "plugin"
    | "app"
    | "resource"
    | "provider"
    | "sdk"
    | "runtime-compiler"
    | "bootgraph"
    | "provisioning-kernel"
    | "process-runtime"
    | "execution-registry"
    | "execution-runtime"
    | "surface-adapter"
    | "harness"
    | "runtime-mounting"
    | "runtime-observation";

  readonly code: string;
  readonly message: string;
  readonly payloadSchema?: RuntimeSchema<TPayload>;
  readonly payload?: TPayload;
  readonly redaction: RuntimeDiagnosticRedaction;
  readonly source?: RuntimeSourceRef;
}
```

Diagnostics name the violated boundary or failed lifecycle phase. They explain; they do not compose.

Finalization and rollback diagnostics use phase `observation` with `recordKind` set to `finalization` or `rollback`, or use phase `provisioning`/`mounting` when describing the failure that caused rollback. They do not create another lifecycle phase.

### 22.2 `RuntimeTelemetry`

Telemetry correlates runtime.

`RuntimeTelemetry` is the runtime-observation-owned projection of spans, events, annotations, and lifecycle correlation from admitted observation inputs.

File: `packages/core/runtime/observation/src/runtime-telemetry.ts`  
Layer: runtime telemetry interface  
Exactness: normative for interface shape, phase restriction, and service-observability boundary; illustrative for payload types.

```ts
export interface RuntimeTelemetry {
  span<T>(
    input: RuntimeTelemetrySpanInput,
    run: () => Promise<T>,
  ): Promise<T>;

  event(
    name: string,
    payload?: RuntimeTelemetryPayload,
  ): void;

  annotate(input: RuntimeTelemetryAnnotation): void;
}

export interface RuntimeTelemetrySpanInput {
  readonly name: string;
  readonly phase: RuntimeLifecyclePhase;
  readonly boundary: RuntimeDiagnostic["boundary"];
  readonly attributes?: RuntimeTelemetryPayload;
}

export type RuntimeTelemetryPayload =
  | RuntimeTelemetryPrimitive
  | readonly RuntimeTelemetryPayload[]
  | { readonly [key: string]: RuntimeTelemetryPayload };

export type RuntimeTelemetryPrimitive =
  | string
  | number
  | boolean
  | null;

export interface RuntimeTelemetryAnnotation {
  readonly key: string;
  readonly value: RuntimeTelemetryPayload;
  readonly redaction?: RuntimeDiagnosticRedaction;
}
```

Runtime observation projects correlation across this ordered lifecycle:

File: `specification://runtime-realization/telemetry-chain.txt`  
Layer: runtime telemetry flow  
Exactness: normative telemetry order.

```text
entrypoint
  -> runtime derivation findings
  -> Effect execution descriptor derivation findings
  -> runtime compiler findings
  -> compiled execution plan findings
  -> execution registry findings
  -> bootgraph lifecycle spans/events
  -> Effect runtime annotations
  -> provider acquisition spans/events
  -> HabitatEffect execution spans/events
  -> service binding spans/events
  -> plugin projection spans/events
  -> adapter lowering spans/events
  -> harness ingress/egress spans/events
  -> service oRPC middleware spans/events
  -> async workflow spans/events
  -> finalization spans/events
```

Runtime telemetry provides process, provisioning, execution, and correlation context. Service semantic observability enriches semantic spans and events. Product analytics requires explicit service/resource ownership.

### 22.3 `RuntimeCatalog`

Catalog records state.

`RuntimeCatalog` is the diagnostic read model of selected, derived, compiled, provisioned, bound, projected, executed, mounted, observed, and stopped topology.

File: `packages/core/runtime/observation/src/runtime-catalog.ts`  
Layer: runtime diagnostic catalog  
Exactness: normative minimum catalog sections; illustrative for exact nested field spelling.

```ts
export interface RuntimeCatalog {
  readonly processIdentity: RuntimeProcessIdentity;
  readonly appIdentity: RuntimeAppIdentity;
  readonly entrypointIdentity: RuntimeEntrypointIdentity;

  readonly roles: readonly RuntimeCatalogRole[];
  readonly derivedAuthoring: RuntimeCatalogDerivedAuthoring;

  readonly resources: readonly RuntimeCatalogResource[];
  readonly providers: readonly RuntimeCatalogProvider[];
  readonly providerDependencyGraph: RuntimeCatalogProviderDependencyGraph;
  readonly plugins: readonly RuntimeCatalogPlugin[];
  readonly serviceAttachments: readonly RuntimeCatalogServiceAttachment[];
  readonly workflowDispatchers: readonly RuntimeCatalogWorkflowDispatcher[];
  readonly executionPlans: readonly RuntimeCatalogExecutionPlan[];
  readonly executionRegistry: RuntimeCatalogExecutionRegistry;
  readonly surfaces: readonly RuntimeCatalogSurface[];
  readonly harnesses: readonly RuntimeCatalogHarness[];

  readonly lifecycleTimestamps: RuntimeLifecycleTimestamps;
  readonly lifecycleStatus: RuntimeLifecycleStatus;

  readonly diagnostics: readonly RedactedRuntimeDiagnostic[];
  readonly topologyRecords: readonly RuntimeTopologyRecord[];
  readonly startupRecords: readonly RuntimeStartupRecord[];
  readonly executionRecords: readonly RuntimeExecutionRecord[];
  readonly finalizationRecords: readonly RuntimeFinalizationRecord[];
}
```

Storage backend, indexing, retention, and exact persistence format are reserved. The minimum record sections are not reserved.

### 22.4 Diagnostic failure classes

Runtime diagnostics cover at least:

| Failure class | Example diagnostic code |
| --- | --- |
| Topology and builder mismatch | `plugin.topology.builder_mismatch` |
| Unsupported role, surface, or harness lane | `surface.unsupported_lane` |
| Invalid plugin export or plugin factory shape | `plugin.factory.invalid` |
| Missing service, resource, provider, profile, workflow-dispatcher, or execution target | `reference.target_missing` |
| Provider/resource mismatch | `provider.resource_mismatch` |
| Missing provider coverage | `provider.coverage.missing` |
| Ambiguous provider coverage | `provider.coverage.ambiguous` |
| Unclosed provider dependency | `provider.dependency.unclosed` |
| Provider dependency cycle | `provider.dependency.cycle` |
| Invalid lifetime or scope request | `resource.lifetime.invalid` |
| Duplicate runtime identity or duplicate provisioned instance | `identity.duplicate` |
| Service dependency cycle | `service.dependency.cycle` |
| Service binding cache collision | `service.binding.cache_collision` |
| Config, secret, or redaction coverage failure | `config.redaction.coverage_failure` |
| Runtime compiler coverage failure | `compiler.coverage.failure` |
| Bootgraph identity, dependency, or ordering failure | `bootgraph.ordering.failure` |
| Substrate acquisition, rollback, release, or finalizer failure | `substrate.provisioning.failure` |
| Harness mount failure | `harness.mount.failure` |
| Diagnostic catalog emission failure | `catalog.emission.failure` |
| Finalization record failure | `catalog.finalization_record.failure` |
| Missing execution descriptor | `execution.descriptor.missing` |
| Duplicate execution descriptor | `execution.descriptor.duplicate` |
| Missing compiled execution plan | `execution.plan.missing` |
| Missing descriptor table | `execution.registry.descriptor-table.missing` |
| Unresolved descriptor ref | `execution.registry.ref_unresolved` |
| Unresolved plan ref | `execution.registry.plan_ref_unresolved` |
| Missing executable boundary | `execution.registry.boundary_missing` |
| Duplicate executable boundary | `execution.registry.boundary_duplicate` |
| Mismatched compiled plan and descriptor | `execution.registry.identity_mismatch` |
| Invalid execution policy | `execution.policy.invalid` |
| Forbidden handler terminal in a non-oRPC descriptor lane | `execution.handler-terminal.forbidden` |
| Forbidden handler descriptor | `execution.handler-descriptor.forbidden` |
| Forbidden execution mode branch | `execution.mode-branch.forbidden` |
| Forbidden noncanonical global `fx` authoring import | `execution.fx-canonical-import.forbidden` |
| Forbidden raw Effect runtime-authority import | `execution.raw-effect-import.forbidden` |
| Forbidden raw Effect run call | `execution.raw-effect-run.forbidden` |
| Forbidden manual, community, or custom Effect-oRPC runner import | `execution.effect-orpc-import.forbidden` |
| Managed runtime construction in authoring | `execution.managed-runtime.authoring-forbidden` |
| Missing process execution bridge for a non-oRPC descriptor lane | `execution.bridge.missing` |
| Missing error bridge | `execution.error-bridge.missing` |
| Missing telemetry labels | `execution.telemetry-labels.missing` |
| Invalid `HabitatEffect` yieldability | `execution.habitat-effect-yieldability.invalid` |
| Provider boundary misclassified as ordinary descriptor | `execution.provider-boundary-kind.misclassified` |
| Detached fiber use in authoring | `execution.detached-fiber.forbidden` |
| Promise business execution in a Habitat-managed application body | `execution.promise-business-terminal.forbidden` |
| Process-local coordination used as durable architecture | `coordination.process-local-used-as-durable` |
| Process queue used across process boundary | `coordination.process-queue.cross-process-forbidden` |
| Process PubSub used as durable event bus | `coordination.process-pubsub.durable-event-bus-forbidden` |
| Process cache used as durable business truth | `coordination.process-cache.durable-truth-forbidden` |
| Missing provider effect plan | `provider.effect-plan.missing` |
| Forbidden raw Effect import in provider authoring | `provider.raw-effect-import.forbidden` |

Execution diagnostics are emitted during derivation, compilation, execution registry assembly, adapter lowering, runtime invocation, and observation. Provider/resource diagnostics remain valid and are not replaced by execution diagnostics.

Execution registry findings use boundary `"execution-registry"`.

## 23. Cross-cutting runtime components

### 23.1 Config and secrets

Config and secrets use app runtime profiles for source selection and runtime substrate components for loading, validation, provider-local access, redaction of observation projections, diagnostics hygiene, and process-local availability.

Locked behavior:

| Rule | Owner |
| --- | --- |
| Config loads once per process unless a provider declares refresh behavior | Runtime substrate |
| Config validates through `RuntimeSchema` | Runtime substrate |
| Full validated secrets stay provider-local; observation projections redact | Runtime substrate using provider-owned redaction metadata |
| Supported source kinds include environment, dotenv, file, memory, and test | Runtime config component |
| Provider config flows through app-owned runtime profiles | App profile and runtime compiler |
| Raw environment reads are forbidden in service/plugin execution bodies | Enforcement and diagnostics |
| Config is not a global untyped bag | Runtime schema and access rules |

Config precedence algorithms, provider-specific refresh strategy, retry policy, and refresh mechanics are reserved details.

### 23.2 Caching taxonomy

Caching is separated by owner.

| Cache kind | Owner | Scope |
| --- | --- | --- |
| `ServiceBindingCache` | Process runtime | Live service binding reuse across matching construction-time inputs |
| Runtime-local cache primitives | Runtime substrate | Process-local runtime mechanics |
| `ProcessCacheHubResource` | Resource/provider model | Process-local cache capability |
| Semantic service read-model cache | Service | Domain-owned data/cache truth |
| Call-local memoization | Procedure/call-local layer | One invocation or call chain |

Call-local memoization is not `ServiceBindingCache`.

### 23.3 Telemetry

Telemetry separates runtime telemetry, optional telemetry resources, native framework instrumentation, service semantic enrichment, and product analytics.

| Telemetry layer | Owner |
| --- | --- |
| Runtime startup/provisioning/binding/execution/mount/finalization telemetry | Runtime |
| Telemetry provider resources | Resources/providers |
| oRPC middleware traces | Service/plugin oRPC boundary |
| Inngest workflow spans | Async harness/native runtime |
| Elysia HTTP instrumentation | Server harness |
| Service semantic events | Service |
| Product analytics | Explicit service/resource/sink owner |

### 23.4 Policy primitives

Policy separates app membership and process policy, plugin boundary policy, service invariants, runtime enforcement primitives, and native host policy.

| Policy kind | Owner |
| --- | --- |
| App membership and publication policy | App |
| Process defaults and provider selection policy | App runtime profile |
| Projection boundary policy | Plugin |
| Domain invariants and write authority | Service |
| Runtime enforcement primitives | Runtime |
| Native host policy | Harness/native host boundary |

Runtime policy enforcement primitives are reserved, but they must consume compiled process plan, runtime access metadata, topology records, and diagnostics.

### 23.5 Reserved detail boundaries

Reserved boundaries are named architecture surfaces with locked owners and integration hooks. They are not omissions.

A reserved boundary must be locked no later than the first implementation slice that makes its dedicated specification trigger true. Before that slice, only the named integration hook, input/output contract, diagnostics, and enforcement rule may land.

Reserved boundaries include config and secret precedence algorithms, provider refresh and retry mechanics, call-local memoization, generic cache resources, process-local coordination provider details, runtime-owned raw primitive public facades, runtime telemetry backend/export, `RuntimeCatalog` storage backend/indexing/retention/persistence, runtime policy enforcement primitives, semantic service dependency adapters, key/KMS resources, multi-process placement policy, Agent/OpenShell governance, desktop native host security, and lane-specific native implementation details.

## 24. Normative lifecycle and reference assembly flows

Sections 24.1 and 24.2 state the normative lifecycle. Sections 24.3, 24.4, and
24.6 project that lifecycle through the diverse reference app in the
independent downstream Rawr repository; their named domains and paths are
illustrative. Section 24.5 is a separate generic service
composition example whose named services are illustrative and whose dependency
handoffs are normative as stated by its `Exactness` annotation.

### 24.1 Dynamic lifecycle sequence

File: `specification://runtime-realization/end-to-end-sequence.mmd`  
Layer: runtime realization sequence diagram  
Exactness: normative for handoff order; illustrative for participant labels.

```mermaid
sequenceDiagram
  participant Authoring as Import-safe declarations
  participant SDK as @habitat-ai/sdk facade
  participant Derivation as Runtime derivation
  participant Compiler as Runtime compiler
  participant Bootgraph as Bootgraph
  participant EffectKernel as Effect provisioning/execution kernel
  participant ProcessRuntime as Process runtime
  participant ExecutionRegistry as Execution registry
  participant Callback as Adapter-lowered callback
  participant ExecutionRuntime as Process execution runtime
  participant Adapter as Surface adapter
  participant Mounting as Runtime mounting
  participant Harness as Native harness
  participant Observation as Runtime observation

  Authoring->>SDK: declarations + cold Effect terminals + cold web module loaders
  SDK->>Derivation: invoke complete derivation with import-safe declarations
  Derivation->>Derivation: emit private NormalizedRuntimeTopology; refuse duplicate plugin identities, process-role literals, surface full tuples, full edge tuples, and service cycles
  Derivation->>Derivation: complete NormalizedAuthoringGraph; derive Effect and web-module refs/tables
  Derivation->>Compiler: NormalizedAuthoringGraph + table availability metadata
  Compiler->>Compiler: validate topology, provider coverage, service closure, Effect execution policy
  Compiler->>Bootgraph: ordering-only bootgraph input
  Compiler->>EffectKernel: compiled provider plans
  Bootgraph->>EffectKernel: order + rollback/reverse-release metadata
  EffectKernel->>EffectKernel: one Layer.effectContext adapter executes provider plans in bootgraph order
  EffectKernel->>EffectKernel: force ManagedRuntime.context; scoped acquisition, rollback, release, finalizers
  EffectKernel->>ProcessRuntime: ProvisionedProcess
  ProcessRuntime->>ProcessRuntime: scope RuntimeAccess, bind services, cache bindings, materialize WorkflowDispatcher
  ProcessRuntime->>ExecutionRegistry: pair compiled execution plans with descriptors from descriptor table
  ProcessRuntime->>ExecutionRuntime: create process execution bridge and EffectRuntimeAccess
  ProcessRuntime->>Adapter: project plugins and lower compiled surface plans
  Adapter->>ProcessRuntime: mount-ready records and payload closures, including private FunctionBundle factory
  ProcessRuntime->>Mounting: mount-ready records + process-runtime stop handle + owner-local findings
  Mounting->>Harness: invoke selected harness with mount-ready payloads; Inngest materializes factory with its client
  Harness->>Mounting: NativeHarnessHandle + truthful owner-local reports
  Mounting->>Mounting: create private StartedHarness after successful mount
  Harness->>Callback: invoke native callback
  Callback->>ExecutionRegistry: resolve executable boundary
  Callback->>ExecutionRuntime: execute matched boundary
  ExecutionRuntime->>EffectKernel: run HabitatEffect through the process managed runtime
  Mounting->>Observation: publish admitted RuntimeObservationRecord values
  Observation->>Observation: project catalog/diagnostic/telemetry/topology records
  Mounting->>Harness: stop StartedHarness handles in reverse mount order
  Mounting->>ProcessRuntime: invoke process-runtime stop handle
  Mounting->>Observation: publish finalization observations
```

### 24.2 Seven-phase realization checklist

| Phase | Required output | Producer | Consumer | Gate |
| --- | --- | --- | --- | --- |
| Definition | Import-safe declarations for services, plugins, resources, providers, apps, profiles, native oRPC operations, cold non-oRPC Effect executable bodies, and cold web route-module loaders | Authors | Private runtime derivation invoked by `deriveRuntimeArtifacts(...)` through `@habitat-ai/sdk/runtime/derivation`; native oRPC implementers | Declaration import safety, topology/builder check, native handler/official Effect bridge gate, and web-loader/Effect separation |
| Selection | App membership, profile, provider choices, process roles, selected harnesses | App/entrypoint | Runtime derivation/runtime compiler | App/profile/entrypoint snapshot |
| Derivation | Private `NormalizedRuntimeTopology`; complete `NormalizedAuthoringGraph`, provider/service-binding/surface/workflow artifacts, `ExecutionDescriptorRef` plus non-portable `ExecutionDescriptorTable`, distinct `WebRouteModuleRef` plus non-portable `WebRouteModuleTable`, and exact-field `PortableRuntimePlanArtifact` | Private runtime derivation; complete-derivation public contracts through `@habitat-ai/sdk/runtime/derivation` | Complete derivation consumes the topology foundation; compiler consumes the graph and plan refs; process runtime consumes the Effect table; web adapter consumes the web table; pre-runtime tooling consumes the portable artifact | Deterministic topology, refusal of duplicate plugin identities, process-role literals, surface full tuples, and full edge tuples, shared resource-demand projection, order-independent service-cycle refusal only, artifact-shape, and table-separation gates |
| Compilation | `CompiledProcessPlan`, provider dependency graph, compiled service/surface/harness plans, `CompiledExecutionPlan[]`, `CompiledExecutionRegistryInput` | Runtime compiler | Bootgraph/process runtime/adapters | Compiler validation and provider coverage |
| Provisioning | Bootgraph order/rollback metadata; eagerly built `ProvisionedProcess`, `ManagedRuntimeHandle`, resources, layer-owned finalizers, owner-local provisioning findings | Bootgraph for metadata; runtime substrate alone for `ProvisionedProcess` | Runtime substrate; then process runtime | Ordering validation, one `Layer.effectContext(...)` lifecycle adapter, forced managed-runtime context, and scoped acquisition/rollback |
| Mounting | Runtime access, bound services, execution bridge, mount-ready records, adapter-lowered payloads, process-runtime stop handle, returned `NativeHarnessHandle` values, and private `StartedHarness` wrappers | Process runtime/adapters; runtime mounting invokes harnesses and creates wrappers after success | Runtime mounting and native hosts | Binding cache, registry matching, adapter lowering, harness mount |
| Observation | `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`, `RuntimeTopologyRecord`, execution/finalization records | Runtime observation projecting admitted definition-owned observation records | Diagnostic readers/control-plane touchpoints | Catalog/diagnostic/telemetry/finalization projection |

### 24.3 Realistic public API with N > 1 service module and provider selection

File: `specification://runtime-realization/work-items-public-api-flow.txt`  
Layer: end-to-end assembly flow  
Exactness: normative for handoff sequence; illustrative for service/module names.

```text
services/work-items
  owns modules: items, labels, allocations
  declares dbPool, clock, logger resource deps
  owns domain contracts and repository writes
  implements native oRPC procedures with the official Effect bridge

plugins/server/api/work-items
  uses workItems service
  owns public oRPC API schemas and public route policy
  composes native effect/context and effect/wrap for public routes

apps/rawr/rawr.app.ts
  selects workItems public API plugin

apps/rawr/runtime/profiles/production.ts
  imports the direct SQL, clock, and logger resource/provider public faces
  places generic providerSelection(...) results only in profile.providers

apps/rawr/server.ts
  calls startApp(rawrApp, { profile: productionProfile, roles: ["server"] })

deriveRuntimeArtifacts(...) through @habitat-ai/sdk/runtime/derivation
  derives service binding plan and surface runtime plan

Runtime compiler
  validates provider coverage
  validates provider dependency closure
  validates native Effect-oRPC bridge authority and import law
  emits provider dependency graph and compiled process plan

Bootgraph
  orders SQL pool, clock, and logger from compiler-owned ordering input

Effect provisioning/execution kernel
  consumes compiled provider plans plus bootgraph metadata
  acquires SQL pool, clock, and logger and alone produces ProvisionedProcess

Process runtime
  creates RuntimeAccess and application/process-owned oRPC Effect Context and wrap
  binds workItems service client with deps/scope/config
  caches binding by ServiceBindingCacheKey
  projects API plugin into mount-ready surface runtime records

Surface adapter
  lowers server API compiled plan while preserving the native oRPC procedure
  supplies invocation context with request and invocation-bound clients at call time

Elysia harness
  mounts public routes and selected publication artifacts
  invokes the native procedure; official .effect owns Effect authoring while
  its vendor-internal bridge owns request signal, Cause mapping, and Promise return

Runtime mounting
  invokes Elysia harness and collects StartedHarness

Runtime observation
  projects RuntimeCatalog with app, entrypoint, selected profile, resources, providers,
  service attachment, surface, harness, execution plan, execution registry,
  diagnostics, startup status, and finalization records when stopped
```

### 24.4 Realistic workflow trigger through internal API

File: `specification://runtime-realization/workflow-internal-api-flow.txt`  
Layer: end-to-end async dispatcher flow  
Exactness: normative for workflow dispatcher and async boundary; illustrative for capability names.

```text
plugins/async/workflows/work-items-sync
  owns WorkItemsSyncWorkflow
  defines schema-backed event payload with itemId and requestedBy
  uses step-local Effect for local execution
  does not expose product API

plugins/server/internal/work-items-ops
  wraps WorkflowDispatcher for event admission
  requires a separate selected control capability for run status/cancel
  uses defineServerInternalPlugin(...)
  owns trusted internal oRPC input/output/error schemas
  wraps dispatcher Promise interop inside Effect execution

apps/rawr/rawr.app.ts
  selects both projection packages

apps/rawr/runtime/profiles/production.ts
  imports the direct InngestClientResource and cloud-provider public faces
  places the generic providerSelection(...) result only in profile.providers

apps/rawr/server.ts
  realizes trusted internal API surface

apps/rawr/async.ts
  realizes async workflow surface

deriveRuntimeArtifacts(...) through @habitat-ai/sdk/runtime/derivation
  derives WorkflowDispatcherDescriptor
  derives async SurfaceRuntimePlan
  derives Effect descriptor refs and descriptor table

Runtime compiler
  compiles dispatcher plan
  compiles async surface plan
  emits FunctionBundle lowering input for async harness

Process runtime
  materializes WorkflowDispatcher from selected workflow definitions
  and provisioned process async client
  injects dispatcher into server internal projection
  binds workflow plugin service clients
  creates ExecutionRegistry for executable boundaries

Surface adapter
  lowers workflow compiled surface plan to private FunctionBundle registration factory

Runtime mounting
  invokes the selected Inngest and server harnesses and collects StartedHarness handles

Inngest harness
  materializes FunctionBundle with the same provisioned client
  mounts native Serve functions or Connect worker

Server internal harness path
  mounts a trusted internal native oRPC procedure that calls the dispatcher
  through official .effect with application/process-owned effect/context and effect/wrap
```

Workflow plugin identity and internal API identity remain separate. The internal API can trigger the workflow; the workflow plugin does not become an API.

### 24.5 Service depending on sibling services

File: `specification://runtime-realization/service-dependency-flow.txt`  
Layer: service binding assembly flow  
Exactness: normative for `serviceDep(...)` binding order.

```text
services/user-accounts
  declares serviceDep(BillingService)
  declares serviceDep(EntitlementsService)
  declares resourceDep(SqlPoolResource)

Foundational private runtime derivation
  records service.service and service.resource edges and refuses service cycles

deriveRuntimeArtifacts(...) through @habitat-ai/sdk/runtime/derivation
  derives resource requirements and service binding plans

Runtime compiler
  validates acyclic service binding DAG
  produces compiled binding plans

Bootgraph
  orders SQL and any required process resources

Effect provisioning/execution kernel
  acquires SQL and any required process resources and produces ProvisionedProcess

Process runtime
  binds BillingService and EntitlementsService first
  supplies those clients into UserAccounts deps
  caches binding using deps/scope/config cache key

UserAccounts Effect body
  yields calls to context.deps.billing and context.deps.entitlements
  never imports sibling repositories or module internals
```

### 24.6 Async lowering into `FunctionBundle`

File: `specification://runtime-realization/function-bundle-flow.txt`  
Layer: async adapter lowering flow  
Exactness: normative for async derived/compiled/lowered/harness boundary.

```text
Definition
  plugins/async/workflows/work-items-sync defines WorkItemsSyncWorkflow
  with schema-backed payload and SyncWorkItemStep = defineAsyncStepEffect(...)

Selection
  apps/rawr/rawr.app.ts selects work-items-sync plugin

Derivation
  complete runtime derivation derives async SurfaceRuntimePlan, workflow dispatcher metadata,
  async step ExecutionDescriptorRef, and non-portable descriptor table entry

Compilation
  runtime compiler emits CompiledSurfacePlan, CompiledWorkflowDispatcherPlan,
  and CompiledExecutionPlan for the step descriptor

Adapter lowering
  async SurfaceAdapter lowers compiled async plan to private FunctionBundle registration factory

Runtime mounting
  invokes the selected Inngest harness with the private FunctionBundle factory

Harness
  Inngest harness materializes FunctionBundle with its provisioned native client
  and mounts the resulting functions into native durable async runtime

Invocation
  Inngest invokes native callback
  callback enters stepEffect(ctx).run(SyncWorkItemStep)
  bridge calls native step.run(stepId, callback)
  callback runs the pre-derived step descriptor through ProcessExecutionRuntime / EffectRuntimeAccess
```

## 25. Enforcement rules and forbidden patterns

The following rules prevent likely architectural drift.

### 25.1 Projection classification

Plugin projection identity is classified by topology plus lane-specific builder.

A plugin under `plugins/server/api/*` must use `defineServerApiPlugin(...)`. A plugin under `plugins/server/internal/*` must use `defineServerInternalPlugin(...)`. Equivalent topology/builder agreement is required for async, CLI, web, agent, and desktop lanes.

A capability needing both public and trusted internal callable surfaces authors two projection packages.

App selection and harness publication policy may select, mount, publish, or generate artifacts for already-classified projections. They cannot reclassify projection status.

Plugin authoring fields named `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind` are invalid when used to declare or reclassify projection status.

### 25.2 Service boundary

Services use `resourceDep(...)` for provisionable host capabilities, `serviceDep(...)` for service-to-service dependencies, and `semanticDep(...)` for explicit semantic adapters.

Plugins use `useService(...)`.

`useService(...)` produces `ServiceUse` as the sole cold plugin-to-service
relation. A `services` map key is a client property only. The public record has
`kind: "service.use"`, `serviceId`, and optional genuine `serviceInstance`; it
has no alias or public definition/contract payload. Exact definition/contract
retention remains on the private non-enumerable carrier used by private runtime
owners and `ServiceContractOf` inference.

Service-to-service clients are not runtime resources. They are service dependencies materialized by service binding.

Plugins and apps must not import service repositories, migrations, module routers, module schemas, service-private middleware, or service-private providers.

Multiple services may share a database instance or pool. They do not share table write authority or migration authority by accident.

Runtime and package boundaries may initialize `provided: {}` only. Only service middleware may add semantic `provided.*` values.

### 25.3 Resource/provider/profile

Services and plugins declare resource requirements. Apps import resource and
provider package public faces, call the generic SDK
`providerSelection({ resource, provider, config })` helper, and place its
results only in the runtime profile's `providers` field.

A profile field named `resources` is not the provider-selection field.

Providers do not select themselves. Resources do not acquire themselves. Runtime profiles do not acquire anything.

Provider implementations do not become service domain authority.

### 25.4 Runtime/provisioning

No component acquires live runtime values before provisioning.

The SDK does not acquire resources, execute providers, construct managed runtime roots, construct native harness payloads, mount harnesses, or define native framework semantics.

The runtime compiler does not acquire resources or mount harnesses.

Bootgraph owns lifecycle order and rollback/release-order metadata only; it is
never a `Layer` DAG. Runtime-substrate-effect owns one
`Layer.effectContext(...)` lifecycle adapter, executes acquisition, release,
rollback, layer-scoped finalizers, process-local coordination, and structured
execution, and alone produces `ProvisionedProcess`. Neither owns service domain
authority.

Each started process owns exactly one `ManagedRuntime`, one execution registry,
one process execution runtime, and one process runtime assembly. Provisioning
forces the lazy managed runtime's `context()` before mounting; no second root
`Scope` or managed runtime is admitted.

### 25.5 Service binding

`ServiceBindingCacheKey` excludes invocation.

Runtime derivation lowers `ServiceUse` to `ServiceBindingPlan`; the compiler
lowers that plan to `CompiledServiceBindingPlan`; process runtime alone resolves
live access and owns binding/cache mechanics, but task 4.8 cannot begin that
lowering until the task-4.7a Designer amendment freezes the complete public
derivation contract and fixes the binding grammar and identity/cache
ingredients. Callbacks and live values remain forbidden.

Invocation context is supplied per call through invocation-aware Effect clients, oRPC context, workflow context, command context, shell/tool context, or equivalent native caller context.

Trusted same-process application callers executing through the Habitat runtime use runtime-supplied invocation-aware Effect clients. External or deliberately boundary-crossing callers may use generated Promise clients.

Promise-facing generated clients are external/client interop. They are not a peer execution choice for owner-authored bodies managed by the Habitat runtime.

### 25.6 Async

Workflow, schedule, and consumer plugins do not expose public product APIs directly.

Workflow event-admission APIs may wrap `WorkflowDispatcher` in
`plugins/server/api/*` or `plugins/server/internal/*`. Run status and
cancellation APIs require a separately selected workflow-control capability in
one of those projection lanes; admission identity is not run identity.

Workflow, schedule, and consumer metadata is authored once in an app-owned
async plugin through Habitat's definition grammar and lowered once by the
Habitat runtime bridge.

Async step-local executable bodies are authored once as cold `defineAsyncStepEffect(...)` descriptors. Inline `stepEffect(...).effect(...)` executable bodies are invalid because descriptor-table derivation must not execute workflow `run(...)` or parse arbitrary workflow source code.

`FunctionBundle` is a private harness-facing registration factory. Ordinary
async plugin authoring does not construct it, manually acquire native async
clients, or bypass adapter lowering. The harness materializes it with its one
provisioned native client; the bundle carries no `dispatcherDescriptor`.

Event names, cron strings, and function ids identify triggers only. Any read event data must have a schema-backed payload contract.

Effect local retry, timeout, process queue, process pubsub, process cache, schedule, fiber, stream, and concurrency primitives do not become durable async ownership.

The future harness uses native `inngest@4.18.0`; `effect-inngest` is forbidden.
Native step replay re-enters the function and `step.run(...)` registration,
not an Effect fiber. A completed memoized step returns native memoized state
without invoking `ProcessExecutionRuntime`; a failed or otherwise un-memoized
attempt invokes the callback anew. Cancellation is between steps unless a
native signal is proved. Serve tracks
admitted handler Promises. Connect uses `handleShutdownSignals: []`, the
mounting-owned outer single-flight close, and the separately required
owner-local callback tracker for callbacks that outlive denied lease renewal.
Mounting awaits native close once and then callback-tracker zero before release.
Native close or flush proves neither callback completion nor delivery.

### 25.7 Harness/framework

Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts are native interiors behind Habitat-shaped boundaries. They are not peer semantic owners.

Harnesses consume mount-ready surface runtime records or adapter-lowered payloads. They do not consume normalized authoring graphs or compiler plans directly.

Surface adapters lower compiled surface plans. They do not lower raw authoring declarations or normalized authoring graphs directly.

Non-oRPC native Promise callbacks are adapter/harness/external-client interop
only and may delegate to `ProcessExecutionRuntime`. Native oRPC handlers and
official `.effect(...)` callbacks remain owned by oRPC and its selected bridge;
`handlerGen(...)` is vendor-internal mechanics only.

### 25.8 Diagnostics

`RuntimeCatalog` is a diagnostic read model, not a second manifest and not live access.

Diagnostics do not compose app membership, acquire live values, mutate runtime state, or choose providers.

Diagnostic payloads are schema-backed and redacted. Secrets do not appear in catalog records.

Runtime access hooks may emit owner-local findings or definition-owned observation records. An admitted downstream consumer adapts findings into records when projection is required; runtime observation alone projects those records into topology records and diagnostics. Neither path acquires resources, retrieves live values for observation, exposes raw Effect/provider/config internals, or mutates running composition.

### 25.9 Effect execution boundaries

Effect runtime construction and manual `Effect.run*` are forbidden in ordinary
authoring. Native Effect constructors and combinators are admitted inside
Effect-backed oRPC operations executed by the official bridge.

File: `specification://runtime-realization/ordinary-authoring-raw-effect-forbidden.txt`  
Layer: enforcement law  
Exactness: normative.

```text
services/**
plugins/**
apps/**
apps/*/runtime/profiles/**
resources/**
entrypoints
```

Effect-oRPC imports are limited to the implementation-owned extension
bootstrap:

File: `specification://runtime-realization/effect-orpc-forbidden-boundary.txt`  
Layer: enforcement law  
Exactness: normative.

```text
admitted terminal-consumer bootstrap: import "@habitat-ai/sdk/plugins/server/effect"
admitted SDK-internal acyclic bootstrap under an earlier selected service law:
  import "@orpc/experimental-effect/extensions/effect"
operation leaf: native .handler(...) or official .effect(...); no handlerGen import
```

`ManagedRuntime.make(...)` is forbidden outside runtime substrate code.

Raw Effect `runPromise`, `runSync`, `runFork`, or equivalent runtime execution calls are forbidden in ordinary authoring.

Provider `build(...)` must return `ProviderEffectPlan`. Ad hoc Promise acquisition as the public provider authoring result is invalid.

Native oRPC `.handler(...)` is valid for synchronous and Promise-returning
operations. Effect-backed oRPC operations use official `.effect(...)`. Its
`handlerGen(...)` delegation is vendor-internal and not author-selectable. No
oRPC handler delegates its Effect to `ProcessExecutionRuntime`.

`HandlerExecutionDescriptor` is invalid.

`execution.handler` is invalid.

`CompiledExecutionPlan.mode` is invalid.

A Promise/handler execution branch is invalid inside Habitat's non-oRPC
descriptor runtime; it remains valid at the native oRPC boundary.

A server route implementation must not use community Effect-oRPC, bridge
`runPromise` directly, manual `Effect.run*`, a custom runner, or a Habitat
imitation. It may use the selected official bridge.

Executable descriptor bodies must not close over runtime-bound clients, request objects, dispatcher handles, resource instances, `RuntimeAccess`, or `EffectRuntimeAccess`. Those values arrive only through invocation context supplied by process runtime and adapter-lowered callbacks.

An entrypoint must not manually run `HabitatEffect`, construct `EffectRuntimeAccess`, construct `ManagedRuntime`, call raw Effect runtime APIs, or manually mount service/plugin execution.

A harness must not lower `HabitatEffect`, construct `EffectRuntimeAccess`, import raw Effect, consume raw authoring declarations, consume normalized authoring graphs, or consume compiler plans directly.

The global `fx` authoring spelling is noncanonical. Non-oRPC descriptor
authoring imports `Effect`, `TaggedError`, and `HabitatEffect` from
`@habitat-ai/sdk/effect`; native oRPC operations use native Effect values with
the official bridge.

### 25.10 Process-local coordination

`ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessCacheHubResource`, and `ProcessConcurrencyLimiterResource` are process-local or role-local runtime resources.

They do not provide cross-process durability, workflow run identity, workflow history, distributed locks, durable queues, durable schedules, durable event logs, or service-owned business truth.

Desktop background cadence is process-local desktop behavior. Business-level durable work belongs on `async`.

### 25.11 Habitat public runtime and consumer initialization

Distribution identities, release composition, and consumer initialization are
outside runtime-realization authority. They are owned by
[the platform and distribution boundary in the architecture specification](HABITAT_ARCHITECTURE.md#161-habitat-platform-and-distribution-boundary)
and by the repository's [Habitat authority boundary](../../.habitat/AUTHORITY.md).
This specification requires only that SDK dependencies conform to the
build-enforced private dependency graph defined in §4, that no private owner
import the SDK, and that the SDK re-export authoring contracts or delegate
runtime operations without implementing a parallel runtime path. Rawr remains
downstream product source and contributes no Habitat distribution authority.

### 25.12 Blueprint evaluator boundary and test layout

Blueprint identity, policy-pack resolution, evaluator authority, and test
layout are not runtime-realization mechanisms. Their canonical contracts live
in [architecture §16](HABITAT_ARCHITECTURE.md#16-mechanical-enforcement-orientation),
the [Habitat authority boundary](../../.habitat/AUTHORITY.md), and the
[Habitat authority ontology](../../.habitat/AUTHORITY-ONTOLOGY.md). This runtime
specification neither restates their distribution rules nor defines the
blueprint evaluator test layout. It contributes only the runtime artifact,
import, behavior, and dependency-boundary acceptance obligations listed in
§25.13.

### 25.13 Acceptance gates

Gate families are:

| Gate family | Required coverage |
| --- | --- |
| Static/import gates | no managed runtime construction outside runtime substrate; no manual `Effect.run*`; no community/custom Effect-oRPC runner; one same-realm official extension bootstrap and `.effect(...)` authoring for Effect-backed oRPC; no operation-leaf `handlerGen` import; contracts/providers cold; no sibling service internals |
| Type gates | `defineService` lane inference, runtime-carried schema inference, `provided` carrier rule, `ServiceContractOf` inference from private-carried `ServiceUse`, non-oRPC descriptor inference, native handler and official bridge inference, `HabitatEffect` yieldability where applicable, contract errors |
| Runtime behavior gates | one lazy `ManagedRuntime` forced through `context()` before mount; one `Layer.effectContext(...)` provider adapter; no second root `Scope`; non-oRPC descriptor execution through `ProcessExecutionRuntime`; native oRPC Effect execution through official `.effect(...)` and its internal bridge; `effect/context` and `effect/wrap`; abort/finalizer/resource-release order; single physical bridge/oRPC realm; `EffectRuntimeAccess` internal-only; service binding cache invocation exclusion; provider acquire/release finalization |
| Registry gates | Effect descriptor table is present; descriptors are derivable without runtime-bound closure capture; every Effect executable boundary ref resolves to one descriptor and one compiled plan; descriptor and plan identities match before invocation; web route-module refs resolve only through their distinct table and never enter `ExecutionRegistry` |
| Fixture/plan gates | private `NormalizedRuntimeTopology` exact-copy, deterministic-order, refusal of duplicate plugin identities, process-role literals, surface full tuples, and full edge tuples, shared resource-demand projection, and order-independent service-cycle-refusal fixtures with no prescribed diagnostic payload; complete `NormalizedAuthoringGraph`; exact-field `PortableRuntimePlanArtifact`; distinct Effect/web ref-table fixtures; `ServiceBindingPlan`; `CompiledServiceBindingPlan`; `CompiledExecutionPlan`; `CompiledExecutionRegistryInput`; provider dependency graph; `RuntimeCatalog`; telemetry labels; startup rollback; finalization records |
| Execution terminal gates | native `.handler(...)` for sync/Promise oRPC; official `.effect(...)` for Effect-backed oRPC; no direct `handlerGen` authoring; no oRPC `ProcessExecutionRuntime`/manual/custom runner; no inline async step executable body hidden inside workflow invocation; native `step.run(...)` delegates pre-derived step execution to `ProcessExecutionRuntime` |
| Inngest harness gates | exact native `inngest@4.18.0` when the harness lands; no `effect-inngest`; same client for registration and selected Serve/Connect harness; replay re-enters function and `step.run` registration, completed memoized steps skip the callback/runtime, and failed or un-memoized attempts invoke it anew; no synthetic step `AbortSignal`; Serve admitted-Promise drain; Connect `handleShutdownSignals: []`, mounting-owned single-flight close, and separate owner-callback drain; close/flush is not universal delivery confirmation |
| Provider separation gates | provider acquire/release represented as `ProviderEffectPlan`; bootgraph modules carry identity/dependency ordering facts only; neither is an ordinary `EffectExecutionDescriptor` procedure plan |
| Private dependency-boundary gates | exact §4 graph only; no private owner imports SDK; no upstream owner imports observation-owned projection types; runtime mounting alone starts, invokes and stops harnesses, and coordinates cross-owner finalization; runtime observation alone projects observation read models |

## 26. Load-bearing foundation and flexible extension matrix

Locked foundation behavior is not reserved. Flexible areas still expose owners, hooks, inputs, outputs, diagnostics, enforcement, and dedicated specification triggers.

| Area | Load-bearing foundation | Flexible extension boundary |
| --- | --- | --- |
| Ownership | Services govern domains, plugins project capabilities, apps compose products, runtime realizes | New service domains, plugin capabilities, provider families |
| Topology | Locked roots, public faces, projection lanes, and closed test directories | Additional private files only through explicitly admitted, versioned blueprint test layout |
| Lifecycle | `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation` | Additional owner-local findings, observation records, and derived artifacts within phases |
| App start | `defineApp(...)`, `startApp(...)` | Entrypoint count and selected role combinations |
| Service lanes | `deps`, `scope`, `config`, `invocation`, `provided` | Service-specific schemas and middleware |
| Service dependencies | `serviceDep(...)`; no sibling internals | Semantic adapters via `semanticDep(...)` |
| Plugin classification | Topology plus lane-specific builder | Surface-local route, command, workflow, shell, desktop facts |
| Execution | native oRPC handler/official Effect bridge plus cold non-oRPC `.effect(...)` bodies, `defineAsyncStepEffect(...)`, `EffectExecutionDescriptor`, `ExecutionDescriptorTable`, `ExecutionRegistry`, `ProcessExecutionRuntime`, `EffectRuntimeAccess`; web route-module loaders remain on the distinct `WebRouteModuleRef` / `WebRouteModuleTable` channel | Additional definition-owned policies and process-runtime-owned adapters for non-oRPC lanes; application/process-owned oRPC context/wrap composition |
| Resources/providers/profiles | Resource contract, provider implementation, app profile selection | New resource families and providers |
| Runtime compiler | Coverage, closure, topology validation, provider dependency graph, compiled process plan | Additional plan findings and optimization |
| Bootgraph | Acquisition/release order and rollback metadata only | Provider-specific refresh and retry strategies |
| Runtime access | `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess` live access only | Additional sanctioned redacted handles |
| Service use and binding | `ServiceUse` is the sole cold author relation; private carrier preserves exact definition/contract inference; the complete task-4.7a authority amendment must freeze all public derivation contracts and its binding-source portion must fix the insertion owner, closed TypeBox grammar, propagation/precedence, and identity/cache ingredients before task 4.8; compiler and process-runtime ownership remain fixed; cache key excludes invocation; callbacks/live values are forbidden | Call-local memoization, service-local caches, and additional owner-local binding findings that do not add authoring nouns or binding-source variants |
| Workflow dispatcher | Descriptor derived before runtime; live event-admission dispatcher materialized after provisioning | Additional event-admission options only; run controls require a separate capability |
| Adapter lowering | Adapters lower compiled plans, not raw authoring | Native payload details |
| Runtime mounting | `startApp(...)`, harness invocation, `StartedHarness` collection, reverse stop, cross-owner finalization | Mount policy details that do not change owner edges |
| Harnesses | Harnesses mount already-lowered payloads | Native host implementation details |
| Observation projection | Runtime observation alone projects `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`, and `RuntimeTopologyRecord` | Storage backend, indexing, retention |

## 27. Runtime realization component contract summary

Component identity, owner, producer, consumer, phase, finding/observation channel, and gate are
normative contracts. **Reference placement** shows one conforming realization;
it is not a canonical repository path unless another section explicitly marks
that topology or public face as normative. Habitat blueprints own the exact
closed source topology for each kind.

The canonical task-4.7 blueprint-registry entry is the closed
`runtime-derivation@1` topology-only project below. This version is immutable
and remains topology-only forever:

```text
packages/core/runtime/derivation/
  AGENTS.md
  habitat.toml
  project.json
  src/
    index.ts
    normalized-runtime-topology.ts
  test/
    normalized-topology.test.ts
    nx-cache.test.ts
  tsconfig.json
  tsconfig.test.json
  tsdown.config.ts
```

The shell contains exactly the eight top-level entries shown; `src/` and
`test/` contain exactly their two listed files. This registry entry admits no
optional interior, `package.json`, SDK assembly edge, or SDK export. Its source
closes over only private `deriveNormalizedRuntimeTopology(...)` and
`NormalizedRuntimeTopology`; its proof closes over only normalized-topology
acceptance and owner cache behavior.

After the task-4.7a complete-derivation-contract and binding-source authority
gate in §15 is satisfied, task 4.8 selects the
independent closed `runtime-derivation@2` complete-derivation law below. Version
2 never inherits from, falls back to, or mutates version 1:

```text
packages/core/runtime/derivation/
  AGENTS.md
  habitat.toml
  project.json
  src/
    index.ts
    normalized-runtime-topology.ts
    derive-runtime-artifacts.ts
    normalized-authoring-graph.ts
    execution-descriptor-ref.ts
    derive-execution-descriptor-table.ts
    identity-policy.ts
    service-binding-plan.ts
    surface-runtime-plan.ts
    web-route-module-table.ts
    workflow-dispatcher-descriptor.ts
    portable-runtime-plan-artifact.ts
  test/
    normalized-topology.test.ts
    complete-derivation.test.ts
    nx-cache.test.ts
  tsconfig.json
  tsconfig.test.json
  tsdown.config.ts
```

Version 2 retains the exact eight-entry root shell. Its `src/` and `test/`
closures are exactly the files shown, with no optional interior or
`package.json`. Task 4.8 alone adds the SDK assembly edge and sole public
derivation face. Task 4.9 edits these existing modules rather than adding a
source or test file. Tasks 4.10 and 4.11 add their assertions to
`complete-derivation.test.ts`. No `runtime-derivation@3` is admitted for this
sequence.

| Component/artifact | Owner | Reference placement | Produced by | Consumed by | Phase | Finding / observation channel | Enforcement / acceptance gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RuntimeSchema` | `runtime-schema`, exposed by SDK | `packages/core/runtime/schema` | Runtime schema adaptation | Compiler, config, diagnostics, harness payload validators | Definition through observation | Schema decode/validation/redaction findings | Schema-backed boundary gate |
| `AppDefinition` | App | `apps/<app>/<app>.app.ts` | `defineApp(...)` | Runtime derivation | Definition | App identity and plugin membership findings | App composition snapshot |
| `Entrypoint` | App | `apps/<app>/<entrypoint>.ts` | `startApp(...)` call | Runtime mounting, then runtime derivation/compiler | Selection | Entrypoint/process shape findings | Entrypoint selection gate |
| `RuntimeProfile` | App runtime profile | `apps/<app>/runtime/profiles/*` | `defineRuntimeProfile(...)` | Runtime derivation/runtime compiler | Selection/compilation | Provider/config findings | Profile snapshot |
| `RuntimeResource` | Resource contract family | Provider-neutral root face of `resources/<capability>` | Resource package `defineRuntimeResource(...)` call | Runtime derivation/compiler/providers | Definition through provisioning | Resource coverage, lifetime, observation contributor findings | Resource contract gate |
| `RuntimeProvider` | Nested provider | Direct public face under `resources/<capability>/providers/<provider>` | Nested provider `defineRuntimeProvider(...)` call | Runtime derivation/compiler/substrate | Definition through provisioning | Owner-local provider coverage, dependency, config, acquisition, and release findings | Provider coverage gate |
| `ProviderSelection` | App/runtime profile | `providers` field in `apps/<app>/runtime/profiles/*` | Generic SDK `providerSelection({ resource, provider, config, lifetime?, role?, instance? })` call | Runtime derivation/compiler | Selection/compilation | Ambiguity/missing provider findings | Provider selection gate |
| `ProviderEffectPlan` | `runtime-definition`, re-exported by SDK | `packages/core/runtime/definition/src/providers/provider-effect-plan.ts` | Definition-backed `providerFx` facade re-exported by SDK | Runtime compiler and `runtime-substrate-effect`; never bootgraph | Definition/provisioning | Owner-local `provider.effect-plan.missing` finding | Provider effect plan gate |
| `HabitatEffect` | `runtime-definition`, re-exported by SDK | `packages/core/runtime/definition/src/effect/habitat-effect.ts` | Definition-owned curated `Effect` facade | Execution descriptors, resource values, substrate raw Effect lowering through process-runtime execution | Definition through invocation | Raw import, yieldability, and owner-local execution findings | `habitat-effect.execution` gate |
| `EffectExecutionDescriptor` | `runtime-definition`, exposed by SDK | `packages/core/runtime/definition/src/execution/descriptor.ts` | Cold `.effect(...)` terminal bodies and `defineAsyncStepEffect(...)` descriptors through the SDK facade | Runtime compiler/process execution runtime | Derivation through invocation | Owner-local Effect descriptor findings | Effect descriptor gate |
| `ExecutionDescriptorRef` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation | Runtime compiler / execution registry | Derivation/compilation/mounting | Owner-local missing/duplicate/under-identified async-step findings | Descriptor ref gate |
| `ExecutionDescriptorTable` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation | Process runtime / execution registry | Derivation/mounting | Owner-local descriptor-table findings | Effect descriptor table gate |
| `WebRouteModuleRef` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation | Runtime compiler / web surface adapter | Derivation/compilation/mounting | Owner-local missing/duplicate route-module findings | Web route-module ref gate |
| `WebRouteModuleTable` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation | Web surface adapter / selected web host module-loading boundary; never `ExecutionRegistry` | Derivation/mounting | Owner-local table/ref mismatch findings | Web route-module table separation gate |
| `CompiledExecutionPlan` | Runtime compiler | `packages/core/runtime/compiler` | `compile-execution-plans.ts` | Execution registry / process execution runtime / adapters | Compilation/mounting/invocation | Owner-local missing plan/policy/bridge findings | Execution plan gate |
| `CompiledExecutionRegistryInput` | Runtime compiler | `packages/core/runtime/compiler` | Runtime compiler | Process runtime | Compilation/mounting | Owner-local registry-input findings | Registry input gate |
| `ExecutionRegistry` | Process runtime | `packages/core/runtime/process-runtime/execution-registry.ts` | Process runtime | Adapters and process execution runtime | Mounting/invocation | Owner-local identity mismatch and missing-boundary findings | Registry matching gate |
| `ProcessExecutionRuntime` | `runtime-process-runtime` | `packages/core/runtime/process-runtime/execution-runtime.ts` | Process runtime | Non-oRPC runtime adapter-lowered closures and SDK delegating hooks only | Mounting/invocation | Owner-local non-oRPC execution bridge findings | Execution bridge gate |
| `EffectRuntimeAccess` | `runtime-process-runtime` | `packages/core/runtime/process-runtime/src/effect-runtime-access.ts` | Process runtime | Process execution and process-runtime adapter interiors only | Mounting/invocation | Owner-local `HabitatEffect` execution findings | Effect runtime access gate |
| `ManagedRuntimeHandle` | Runtime substrate | `packages/core/runtime/substrate/effect` | Runtime substrate | `EffectRuntimeAccess`, provisioning/finalization | Provisioning/invocation/finalization | Owner-local managed-runtime findings or definition-owned observation records | Managed runtime ownership gate |
| `ServiceUse` | `runtime-definition`, exposed by SDK | `packages/core/runtime/definition/src/service.ts` | `useService(...)` | Runtime derivation; SDK type inference through `ServiceContractOf` | Definition/derivation | Cold public record plus private non-enumerable exact-definition/contract carrier; no live finding authority | Service-use shape and inference gate |
| `NormalizedRuntimeTopology` | Private `runtime-derivation` foundation | `packages/core/runtime/derivation` | Private runtime derivation from selected launch facts | Complete derivation within the same owner | Derivation | Owner-local refusal channel; task 4.7 proves only order-independent refusal of duplicate facts, service self-loops, and longer service cycles, without prescribing an error class, chosen cycle path, diagnostic order, or finding payload | Owner-local TypeBox decode plus exact-copy, deterministic-order, and refusal gate |
| `NormalizedAuthoringGraph` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation from `NormalizedRuntimeTopology` and remaining cold declarations | Runtime compiler | Derivation | Owner-local derivation findings | Complete normalized graph snapshot |
| `ServiceBindingPlan` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation from selected `ServiceUse` declarations | Runtime compiler | Derivation/compilation | Owner-local binding-closure findings | Complete task-4.7a authority amendment, then service binding plan snapshot |
| `CompiledServiceBindingPlan` | Runtime compiler | `packages/core/runtime/compiler` | Runtime compiler from `ServiceBindingPlan` | Process runtime | Compilation/mounting/invocation | Owner-local compiled binding findings | Complete task-4.7a authority amendment, then compiled service binding plan gate |
| `SurfaceRuntimePlan` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation | Runtime compiler | Derivation/compilation | Owner-local surface-plan findings | Surface plan snapshot |
| `WorkflowDispatcherDescriptor` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation | Runtime compiler/process runtime | Derivation/mounting | Owner-local dispatcher findings | Dispatcher descriptor gate |
| `PortableRuntimePlanArtifact` | `runtime-derivation`, complete-derivation contract at `@habitat-ai/sdk/runtime/derivation` | `packages/core/runtime/derivation` | Complete runtime derivation | Diagnostic tooling, topology export, and future deployment/control-plane touchpoints; never the complete compiler input | Derivation | Owner-local artifact findings | Exact seven-field portable plan gate; `artifactId` is `sha256:` followed by exactly 64 lowercase hexadecimal SHA-256 characters |
| `CompiledProcessPlan` | Runtime compiler | `packages/core/runtime/compiler` | Runtime compiler | Bootgraph/process runtime/adapters | Compilation through mounting | Owner-local compiler findings | Compiled process plan gate |
| `Bootgraph` | `runtime-bootgraph` | `packages/core/runtime/bootgraph` | Bootgraph from compiler-owned ordering input | Runtime substrate only | Provisioning | Owner-local ordering/rollback-metadata findings | Bootgraph ordering gate |
| `BootResourceKey` | `runtime-bootgraph` | `packages/core/runtime/bootgraph` | Bootgraph | Runtime substrate | Provisioning | Owner-local resource identity findings | Boot resource key gate |
| `BootResourceModule` | `runtime-bootgraph` | `packages/core/runtime/bootgraph` | Bootgraph from compiler identity/dependency facts | Runtime substrate | Provisioning | Owner-local module ordering findings; no executable plan | Boot module gate |
| `ProvisionedProcess` | `runtime-substrate-effect` | `packages/core/runtime/substrate/effect` | Runtime substrate alone | Process runtime | Provisioning/mounting/finalization | Owner-local provisioning findings or definition-owned observation records | Provisioned process gate |
| `RuntimeAccess` | `runtime-process-runtime` | `packages/core/runtime/process-runtime` | Process runtime | Runtime adapters, harnesses, and runtime mounting | Mounting | Owner-local access findings | Runtime access gate |
| `ProcessRuntime` mount-ready handoff | `runtime-process-runtime` | `packages/core/runtime/process-runtime` | Process runtime | Runtime mounting | Mounting/finalization | Mount-ready records, owner-local findings, and process-owned stop handle; no `StartedHarness` | Process runtime handoff gate |
| `ServiceBindingCache` | Process runtime | `packages/core/runtime/process-runtime` | Process runtime | `bindService(...)` | Mounting/invocation | Owner-local cache-collision findings | Cache key gate |
| `WorkflowDispatcher` | Process runtime | `packages/core/runtime/process-runtime` | Process runtime | Server API/internal projections | Mounting/invocation | Owner-local dispatcher findings | Dispatcher materialization gate |
| `SurfaceAdapter` | `runtime-process-runtime` | `packages/core/runtime/process-runtime` | Process runtime | Runtime mounting handoff, then selected harness | Mounting | Owner-local adapter findings/observations | Adapter lowering gate |
| `FunctionBundle` | Async adapter/harness boundary | `packages/core/runtime/harnesses/inngest` | Async surface adapter | Inngest harness | Mounting | Owner-local async-lowering findings | Function bundle gate |
| `RuntimeMounting` | `runtime-mounting` | `packages/core/runtime/mounting` | SDK terminal delegation | Selected harnesses and process-runtime stop handle | Mounting/finalization | Owner-local lifecycle findings and definition-owned observation records | Start/finalization ownership gate |
| `HarnessDescriptor` / `HarnessMountInput` | Selected harness owner | `packages/core/runtime/harnesses/*`; Oclif: `apps/habitat/src/harness/oclif` | Runtime/harness implementation | Runtime mounting | Mounting/finalization | Owner-local harness findings | Harness mount gate |
| `NativeHarnessHandle` / `HarnessHealthReport` | Selected harness owner | `packages/core/runtime/harnesses/*`; Oclif: `apps/habitat/src/harness/oclif` | Successful harness mount and probes | Runtime mounting | Mounting/finalization | Idempotent stop and truthful process-local health reports | Native handle gate |
| `StartedHarness` | `runtime-mounting` | `packages/core/runtime/mounting` | Runtime mounting after successful native mount | Runtime mounting only | Mounting/finalization | Private descriptor/handle/findings/identity/metadata wrapper | Harness finalization gate |
| `RuntimeObservationRecord` / `RuntimeObservationPort` | `runtime-definition` | `packages/core/runtime/definition` | Cold contract; records published by owners with an admitted direct definition edge | Runtime observation implementation | All phases | Bounded non-authorizing records | Observation-direction gate |
| `RuntimeCatalog` | `runtime-observation` | `packages/core/runtime/observation` | Runtime observation only | Diagnostic readers/control-plane touchpoints | Observation | Projected catalog findings | Catalog snapshot gate |
| `RuntimeDiagnostic` | `runtime-observation` | `packages/core/runtime/observation` | Runtime observation only | Catalog/observability readers | Observation projection over all phases | Projected boundary/phase/finalization findings | Diagnostic coverage gate |
| `RuntimeTelemetry` | `runtime-observation` | `packages/core/runtime/observation` | Runtime observation only | Observability exporters and diagnostic correlation | Observation projection over all phases | Projected spans/events/annotations | Telemetry correlation gate |
| `RuntimeTopologyRecord` | `runtime-observation` | `packages/core/runtime/observation` | Runtime observation only | Runtime catalog/topology readers | Observation | Observation-only structure/read-model record; cannot change runtime state | Topology projection gate |
| `RuntimeObservationContributor` | `runtime-definition` | Resource descriptors through the SDK facade | Resources/providers | Runtime observation port / runtime observation projection | Provisioning/observation | Bounded redacted observation records | Observation contributor gate |

## 28. Canonical runtime realization picture

File: `specification://runtime-realization/canonical-picture.txt`  
Layer: final assembly model  
Exactness: normative.

```text
services
  govern domains
  own domain authority and authoritative writes
  declare service dependencies and resource dependencies
  declare runtime-carried lane schemas
  produce callable contracts
  produce Effect execution descriptors

plugins
  project capabilities
  into exactly one role/surface/capability lane
  declare service uses and resource requirements
  produce Effect execution descriptors for Habitat-managed local execution

apps
  compose products
  select plugins, profiles, publication artifacts, providers, and entrypoints

resources
  define runtime contracts
  expose HabitatEffect-returning operations where effectful

providers
  implement runtime contracts
  return ProviderEffectPlan through providerFx
  remain cold until provisioning

runtime definition
  owns cold HabitatEffect, execution-policy, authoring, and descriptor contracts
  owns observation record schemas and the narrow observation port
  never starts a process

runtime derivation
  first emits private NormalizedRuntimeTopology only
  copies RuntimeLaunchIdentity exactly and carries profileId
  sorts plugin identities and derives role/surface requirements
  emits only app.plugin, plugin.resource, service.service, service.resource,
  and service.semantic topology edges
  refuses duplicate plugin identities, process-role literals, surface full tuples, and full edge tuples
  admits shared resource demand across distinct plugins, and order-independently refuses
  service.service self-loops and longer cycles without fixing diagnostic shape
  then completes NormalizedAuthoringGraph
  derives provider selections, normalized ServiceUse declarations, and ServiceBindingPlan artifacts
  derives surface runtime plans and workflow dispatcher descriptors
  derives Effect descriptor refs and their non-portable table
  derives distinct WebRouteModuleRef values and their non-portable table
  emits the exact-field PortableRuntimePlanArtifact without web-loader refs or placement constraints

@habitat-ai/sdk
  re-exports stable public authoring contracts
  exposes type inference and delegating runtime hooks
  assembles private runtime owners into one package
  owns no cold runtime contract, raw Effect lowering, or runtime adapter lowering
  is never imported by a private runtime owner

runtime compiler
  plans processes
  validates selection, topology, provider coverage, provider dependency closure, service closure
  emits CompiledServiceBindingPlan artifacts
  validates Effect execution boundary policy
  validates raw Effect authority and official Effect-oRPC bridge import law
  emits one compiled process plan
  emits provider dependency graph
  emits compiled execution plans without terminal modes
  emits execution registry input

bootgraph
  orders lifecycle
  consumes compiler ordering input only
  emits acquisition/release order and rollback metadata
  never consumes ProviderEffectPlan or executes lifecycle work

Effect provisioning/execution kernel
  runs local execution
  creates exactly one ManagedRuntime and no second root Scope
  owns one Layer.effectContext provider-lifecycle adapter
  executes provider plans in bootgraph order and returns resource Context
  forces managedRuntime.context before mounting
  owns raw Effect and ProviderEffectPlan lowering
  validates config and secrets
  lowers ProviderEffectPlan into scoped acquisition/release
  executes provider/resource acquisition, release, and rollback
  alone produces ProvisionedProcess
  owns process-local coordination substrate
  supplies the managed runtime used for HabitatEffect execution

process runtime
  assembles processes
  scopes runtime access
  creates ExecutionRegistry from compiled registry input and non-portable descriptor table
  resolves web route-module refs through the distinct WebRouteModuleTable outside ExecutionRegistry
  creates ProcessExecutionRuntime for non-oRPC descriptor lanes
  owns EffectRuntimeAccess and supplies it only to non-oRPC process-runtime interiors
  binds services
  caches bindings
  creates invocation-bound Effect client views
  materializes WorkflowDispatcher
  projects plugins
  owns runtime adapter lowering
  returns mount-ready records, owner-local findings, and its own stop handle

execution registry
  matches execution
  pairs compiled execution plans with matching descriptors
  validates execution identity and boundary agreement
  gives adapters matched executable boundaries

process execution runtime
  runs non-oRPC descriptor invocations
  executes non-oRPC Effect descriptors at invocation time
  receives explicit ProcedureExecutionContext
  resolves error and telemetry bridge refs from CompiledExecutionPlan
  runs HabitatEffect through EffectRuntimeAccess
  emits owner-local execution findings or admitted observation records

surface adapters
  translate surfaces
  lower compiled surface plans
  resolve non-oRPC executable boundaries through ExecutionRegistry
  produce non-oRPC harness-facing native payload closures that delegate to ProcessExecutionRuntime
  preserve native oRPC procedures, effect/context, and effect/wrap for official .effect

async surface adapter
  lowers workflow, schedule, and consumer plans
  into a private FunctionBundle registration factory
  carries step-local HabitatEffect execution for the Inngest harness boundary

harnesses
  mount hosts
  are invoked by runtime mounting
  invoke adapter-lowered payloads
  return NativeHarnessHandle values and truthful owner-local reports
  never create StartedHarness
  own native interiors only after Habitat adapter lowering

runtime mounting
  implements startApp
  invokes harnesses and creates/collects private StartedHarness wrappers after success
  coordinates reverse-order harness stop before the process-runtime stop handle
  adapts admitted owner-local findings into RuntimeObservationRecord values
  publishes lifecycle observation records through the definition-owned port

runtime observation
  implements the definition-owned observation port
  projects admitted RuntimeObservationRecord inputs
  never invokes or stops harnesses and never coordinates finalization

RuntimeCatalog
  is projected only by runtime observation

RuntimeTelemetry
  is projected only by runtime observation

RuntimeDiagnostic and RuntimeTopologyRecord
  are projected only by runtime observation
```

Habitat stays scale-continuous because semantic identity and runtime placement remain separate. A capability does not change species when it changes process, machine, platform service, app boundary, repository boundary, harness, provider, or substrate. Runtime realization makes execution explicit, typed, observable, and stoppable while preserving the authority laws that make the system legible.

## 29. Canonical Source And Stale-Document Handling

This document is the canonical runtime realization specification. Older indexed
runtime/effect documents that still self-identify as canonical or still describe
superseded Promise-only handler execution for Effect-backed operations, global
`fx` authoring, or runtime-bound descriptor closure patterns must be updated,
renamed as superseded, moved to the appropriate archive/quarantine location,
or explicitly subordinated to this specification before migration-planning
agents rely on indexed docs.

That cross-document containment work is not a new runtime architecture decision. It is a migration-readiness gate that prevents future agents from finding two apparent canonical execution models.
