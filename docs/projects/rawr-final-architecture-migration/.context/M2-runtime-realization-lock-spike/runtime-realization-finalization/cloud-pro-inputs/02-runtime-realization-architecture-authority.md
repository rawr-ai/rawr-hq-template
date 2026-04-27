# Runtime Realization Architecture Authority

Status: Binding Architecture Authority
Scope: Runtime realization system specification synthesis

## Authority

This Architecture Authority is an architecture authority document for the Runtime Realization System specification.

It defines the target vocabulary, topology, ownership model, lifecycle, runtime artifacts, reserved boundaries, and conflict-resolution rules. Use it only with the input manifest stated in the task prompt. Do not treat this document as an instruction to look for any other source.

This Architecture Authority wins over conflicting lower-authority statements. The final specification must be standalone, canonical, normative, and explanatory. It must not describe its own creation path, input set, revision history, or comparison process.

Do not consult or infer from any unlisted cloud-project document, project note, repository snapshot, source file, transcript, report, or existing canonical document. Any necessary carry-forward substance is represented in the provided packet.

## Affirmative Design Laws

Runtime realization is the system that turns selected authoring declarations into a started, typed, observable, stoppable process. The specification must describe that system as a transparent frame: each layer is visible, each component has a named owner, and each handoff can be followed from authoring declaration to runtime behavior.

Topology and builder classify projection identity. The file tree provides the first classification, and the lane-specific builder stamps the corresponding role, surface, and capability facts. Authors express real semantic, policy, instance, and provider-selection variability; they do not restate facts already determined by topology and builder.

Plugin boundaries are RAWR-shaped and plugin interiors are native to their surface technology. API plugins expose a RAWR plugin factory and author oRPC-native contracts, routers, middleware, and handlers inside the boundary. Async plugins expose RAWR workflow, schedule, or consumer definitions and lower to Inngest-compatible harness payloads through the async adapter. CLI, web, agent, desktop, and shell plugins follow the same pattern: RAWR owns the boundary and native frameworks own their execution semantics.

One plugin package defines one capability projection in exactly one role lane and one surface lane. The projection may use service truth or host capability, but it does not become service truth or resource truth. A capability that needs multiple callable postures, surfaces, or execution lanes is represented by multiple projection packages selected by the app, not by one package that changes species through configuration.

Apps assemble selected projections and runtime profiles into process identities. App selection may decide membership, process shape, profiles, and selected publication artifacts. App selection does not reclassify a projection that topology and builder have already classified.

The SDK derives normalized authoring graphs and portable plans. The runtime compiler turns those plans into compiled process plans. The bootgraph and provisioning kernel acquire resources and construct runtime services. Process runtime binds services and assembles mounted surface runtimes. Surface adapters lower compiled surface plans to native payloads. Harnesses mount those payloads into native hosts.

Each started process owns one root managed runtime and one process runtime assembly. Cohosting changes placement and resource sharing; it does not change service truth, plugin identity, app membership, role meaning, or surface meaning.

The foundation is stable and the edges are extensible. Locked foundations define ownership, topology, lifecycle, access, binding, provisioning, mounting, diagnostics, and forbidden layer collapse. Flexible extension areas expose named owners and integration contracts so they can evolve without renegotiating the foundation.

The specification must show internals instead of relying on unexplained behavior. Any authoring surface that appears simple must be paired with the derived graph, compiled plan, binding or provisioning artifact, adapter lowering shape, and consuming runtime or harness integration point that makes the simplicity real.

## Specification Detail Laws

The synthesized specification must stabilize runtime realization through concrete component definition, not through summary prose.

Depth is required wherever depth removes architectural ambiguity. Do not optimize for brevity when brevity hides ownership, lifecycle, interface, placement, or integration detail.

Every load-bearing system component that participates in runtime realization must be specified with:

- canonical name and owner;
- file-system placement and package boundary;
- public authoring surface, SDK-derived shape, runtime-internal shape, or harness-facing shape, as applicable;
- inputs, outputs, invariants, and forbidden responsibilities;
- upstream producer and downstream consumer;
- lifecycle phase participation;
- integration point with adjacent layers;
- diagnostics emitted or consumed;
- enforcement rules that prevent layer collapse.

Apply this component contract requirement to each load-bearing runtime realization component and to any derived, compiled, adapter-lowered, or harness-facing artifact whose boundary would otherwise be ambiguous. Smaller artifacts may be grouped under their owning component when owner, producer, consumer, lifecycle phase, integration point, diagnostics, and enforcement remain explicit. Do not force identical subsections or tables for every noun; vary density by load-bearing risk.

Every system component with a file-system presence must include a concrete placement illustration. Placement illustrations must show enough tree context to locate the component inside the canonical topology.

Every illustrated code block must name the file path it represents and the layer or owner it belongs to. Use visible `File:` and `Layer:` labels immediately before the block.

Simplified examples are permitted only when they are paired with at least two realistic examples that preserve layer boundaries. A simplified example cannot be the only example for any public authoring surface, runtime compilation boundary, provisioning boundary, harness boundary, or diagnostics boundary.

Every author-facing convenience must be mirrored by its derived or realized backend artifact. The specification must show each applicable link: authoring declaration, SDK-derived graph or plan, runtime-compiled artifact, binding/provisioning or adapter-lowered artifact, and consuming runtime or harness integration point. If a link is absent, state which layer is absent and why.

Schema-bearing boundaries use schema-backed contracts or concrete typed shapes. Service contracts, plugin API contracts, resource value shapes, provider config, runtime profile config, diagnostics payloads, and harness payload contracts must not represent data schemas as plain string labels. String values may identify capabilities, routes, ids, names, or policy labels; they do not stand in for schema definitions.

`RuntimeSchema` is the canonical SDK-facing schema facade for runtime-owned and runtime-carried boundary schema declarations. It appears where the runtime must derive validation, type projection, config decoding, redaction, diagnostics, or harness payload contracts from an authored declaration, including resource config, provider config, runtime profile config, service boundary `scope`, service boundary `config`, service boundary `invocation`, runtime diagnostics payloads, and harness-facing runtime payloads. Its minimum contract is a serializable schema artifact, runtime decode and validation, static type projection, redaction metadata where applicable, and diagnostic-safe description. `RuntimeSchema` does not transfer service semantic schema ownership to the runtime; service procedure payloads, plugin API payloads, workflow payloads, and plugin-native contracts remain schema-backed contracts owned by their service or plugin boundary. Do not rely on raw TypeBox APIs, `.Type` extraction, or bare type aliases unless the example defines the schema-backed artifact at the owning layer.

Architecture diagrams, sequence diagrams, package trees, type illustrations, and interface tables are core specification material. They are not optional explanatory supplements. Use them when they make component placement, ownership, lifecycle flow, or integration shape unambiguous.

The document must define components as independent plug-in units before assembling them into the full runtime realization system. Assembly sections must use the previously defined component contracts and must not introduce unowned behavior, unnamed adapters, or implicit cross-layer behavior.

The document must distinguish load-bearing foundation from flexible extension areas. Use load-bearing versus flexible matrices where that distinction prevents accidental renegotiation of foundational architecture.

Reserved detail boundaries are not permission to omit integration detail. Each reserved boundary must state the owner, package location, integration hook, required input and output shapes, diagnostics, enforcement rule, and the condition that requires a dedicated specification pass.

Do not use placeholder phrases as substitutes for a boundary contract. If an internal detail is reserved, name the owning component and the exact interface through which the rest of the runtime system interacts with it.

## Canonical Topology

Use this physical topology:

```text
packages/
  core/
    sdk/                 # publishes @rawr/sdk
    runtime/             # compiler, bootgraph, substrate, process runtime, harnesses, topology
      standard/          # RAWR-owned standard provider implementations and internal runtime machinery

resources/
  <capability>/          # authored provisionable capability catalog

apps/
  <app>/
    runtime/             # app-owned profiles, config source selection, process defaults

services/                # semantic truth
plugins/                 # role, surface, and capability projections
```

This topology locks `packages/core/sdk`, `packages/core/runtime/*`, `resources/*`, `apps/<app>/runtime/*`, `services/*`, and `plugins/*` as canonical placement.

Do not create a root-level `core/` authoring root. Do not create a root-level `runtime/` authoring root. Platform machinery stays under `packages/core/*`. Authored provisionable capability contracts stay under `resources/*`.

## Ownership Laws

Services own semantic truth: schemas, repositories, migrations, domain policy, callable contracts, stable service config, and service-to-service dependency declarations.

Plugins own projections: role, surface, capability projection, topology-implied caller classification, native builder facts, projection-local caller and boundary policy facts, and service-use declarations.

Apps own selection: app membership, role and surface membership, entrypoints, runtime profiles, provider selections, config source selection, process defaults, selected publication artifacts, and deployment-shaped choices that enter a process.

Resources own provisionable capability contracts: required host capabilities, consumed value shape, lifetime requirement, and public authoring identity.

Providers own implementation: acquisition, release, validation, native client construction, health, refresh, and provider-specific configuration.

The SDK owns derivation: normalized authoring graph, canonical identities, resource requirements, normalized `ProviderSelection` artifacts from app-owned runtime profiles, service binding plans, surface runtime plan descriptors, and portable plan artifacts. Apps own provider choice.

The SDK does not acquire resources, execute providers, construct managed runtime roots, own service truth, own app membership, construct native harness payloads, mount harnesses, or define native framework semantics.

The runtime owns realization: compiler, compiled process plan, bootgraph, Effect provisioning kernel, process runtime, runtime access, service binding cache, adapter lowering, topology emission, diagnostics emission, and deterministic shutdown.

The runtime does not own service truth, app membership, plugin meaning, caller-facing API semantics, command semantics, workflow semantics, deployment placement semantics, or domain governance.

Harnesses own native mounting: Elysia, Inngest, OCLIF, web, agent, desktop, and other native host boundaries execute inside their own framework semantics after runtime realization and surface adapter lowering hand them harness-facing payloads. Harnesses do not consume SDK graphs or compiler plans directly.

Harnesses do not acquire resources outside the provisioning plan, construct service truth, define role or surface meaning, or become a second process runtime.

Diagnostics observe runtime realization. Diagnostics do not compose app membership, acquire live values, mutate running state, or become app, service, plugin, resource, provider, or harness authority.

Service callable contracts are service-owned, schema-backed contracts that may be expressed with oRPC primitives. oRPC owns procedure framework semantics, middleware, transport handling, and OpenAPI/RPC mechanics. It does not own service truth, service schema authority, app membership, public API meaning, runtime access, provider selection, or bootgraph lifecycle.

## Realization Chain

Use this lifecycle order:

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

Definition contains service, plugin, resource, provider, and app declarations.

Selection contains app membership, runtime profile, provider choices, process shape, selected already-classified role and surface lanes, and selected harnesses.

Derivation contains SDK normalization, identity derivation, requirement collection, provider coverage, service binding plans, and surface runtime plan descriptors.

Compilation contains compiled process plans, dependency coverage, role and surface runtime plans, adapter-lowering inputs, runtime diagnostics, and bootgraph input.

Provisioning contains bootgraph ordering, Effect layer construction, scoped acquisition, rollback, finalizers, config loading, redaction, runtime services, and managed runtime ownership.

Mounting contains process runtime construction, service binding, resource access, surface projection, harness handoff, native route/function/command registration, and process startup.

Observation contains runtime catalog records, diagnostics, telemetry annotations, topology export, health state, and shutdown records.

No component acquires live runtime values before provisioning. No diagnostic component performs composition authority. No harness component owns service truth. No plugin component owns resource acquisition.

## Authoring And Import Posture

Declarations are import-safe. Service, plugin, resource, provider, app, and profile modules declare facts, factories, descriptors, selectors, and contracts. Importing a declaration does not acquire resources, read secrets, connect to providers, start processes, register globals, mutate app composition, or mount native hosts.

Ordinary service, plugin, app, and entrypoint authoring imports public SDK surfaces, service descriptors, plugin factories, resource descriptors, provider selectors, and app-owned runtime profile helpers.

Concrete providers, runtime substrate internals, Effect layer machinery, process runtime internals, adapter implementations, native harness payload construction, and harness mounting code live in their owning runtime/provider/harness packages. They are not normal service, plugin, or app authoring imports.

Provider selection is app-owned profile wiring through typed selectors. Provider implementation imports are provider-authoring or runtime-internal concerns, not ordinary service/plugin/app composition.

Resource lifetimes are runtime acquisition and scoping semantics. Process and role lifetimes describe where provisioned values live. Invocation-local and call-local values are request, workflow, command, or function execution context; they are not separate public runtime resource species.

## Entrypoint Locks

Use these canonical app and entrypoint terms:

- `defineApp(...)`
- `startApp(...)`
- `AppDefinition`
- `Entrypoint`
- `RuntimeProfile`

`startApp(...)` is the only canonical start verb. Roles, surfaces, harnesses, profiles, and process hosts are selected data passed to the entrypoint operation. A separate role-specific start verb is not part of the target contract.

## Topology-Implied Projection Locks

Public, internal, async, CLI, web, desktop, and agent projection status is implied by topology plus the matching builder. Authors do not declare a generic public/internal exposure object.

`plugins/server/api/<capability>` plus `defineServerApiPlugin(...)` defines a public server API projection. It is eligible for public API route mounting, OpenAPI publication, and public-client generation according to app and harness publication policy.

`plugins/server/internal/<capability>` plus `defineServerInternalPlugin(...)` defines a trusted first-party/internal server API projection. It is eligible for internal RPC mounting and internal-client generation. It is not a public API projection.

App selection and harness publication policy may select which already-public artifacts are mounted, published, or generated. They do not reclassify a plugin projection. A server internal projection does not become public through app selection, and a server API projection does not become internal through a config field.

Async workflow, schedule, and consumer plugins do not become public APIs by setting an exposure field. Caller-facing trigger, status, and cancel APIs belong in `plugins/server/api/*` or `plugins/server/internal/*` projections that call service or workflow-dispatcher capabilities.

The builder must agree with topology. A plugin under `plugins/server/api/*` must use the server API builder. A plugin under `plugins/server/internal/*` must use the server internal builder. Equivalent agreement is required for async, CLI, web, desktop, and agent projection lanes.

Use these projection lane locks:

| Topology | Builder family | Projection |
| --- | --- | --- |
| `plugins/server/api/<capability>` | `defineServerApiPlugin(...)` | Public server API projection |
| `plugins/server/internal/<capability>` | `defineServerInternalPlugin(...)` | Trusted first-party/internal server API projection |
| `plugins/async/workflows/<capability>` | workflow projection builder | Durable async workflow projection |
| `plugins/async/schedules/<capability>` | schedule projection builder | Durable scheduled async projection |
| `plugins/async/consumers/<capability>` | consumer projection builder | Durable async consumer projection |
| `plugins/cli/commands/<capability>` | CLI command projection builder | OCLIF command projection |
| `plugins/web/app/<capability>` | web app projection builder | Web surface projection |
| `plugins/agent/channels/<capability>` | agent channel projection builder | Agent channel projection |
| `plugins/agent/shell/<capability>` | agent shell projection builder | OpenShell projection |
| `plugins/agent/tools/<capability>` | agent tool projection builder | Agent tool projection |
| `plugins/desktop/menubar/<capability>` | desktop menubar projection builder | Desktop menubar projection |
| `plugins/desktop/windows/<capability>` | desktop window projection builder | Desktop window projection |
| `plugins/desktop/background/<capability>` | desktop background projection builder | Desktop background projection |

Path and builder mismatch is a structural error. Lane-specific builder names may be finalized by the SDK surface, but the topology, role, surface, and projection meaning are load-bearing.

Route, command, function, shell, or native mount facts are builder-specific surface facts. For example, a server API route base may be a top-level server API builder fact or a route-module fact, but it does not encode public/internal status and must not be nested inside an `exposure`, `visibility`, `publication`, or adapter-kind object.

Plugins own projection-local caller and boundary policy facts. App selection and harness publication policy decide whether already-classified artifacts are mounted, published, or generated. Neither plugins, apps, nor harness publication policy reclassify projection status.

Do not canonicalize plugin authoring fields named `exposure`, `visibility`, `public`, `internal`, `kind: "public"`, `kind: "internal"`, or `adapter.kind` as the way a plugin declares projection status.

## Caller Transport And Async Boundary Locks

Caller posture follows topology, process placement, and app selection.

External callers use selected `plugins/server/api/*` projections.

First-party remote callers use selected `plugins/server/internal/*` projections when the caller is outside the process boundary.

Trusted same-process callers use package-local service clients or runtime-bound service clients instead of local HTTP self-calls.

Inngest runtime ingress is harness/runtime ingress. It is not a product API and does not define caller-facing semantics.

Workflow trigger, status, cancel, and dispatcher-facing APIs are server API or server internal projections that call service or workflow-dispatcher capabilities. Durable workflow execution remains in async workflow, schedule, or consumer projections.

Workflow, schedule, and consumer metadata is authored once in RAWR async projection definitions. `FunctionBundle` is the harness-facing derived/lowered artifact produced by the async surface adapter and consumed by the Inngest harness. It is not a public authoring declaration, service API, product invocation contract, or parallel metadata source.

`WorkflowDispatcher` is a derived runtime/SDK integration artifact from selected workflow definitions and the process async client. Server API and server internal projections may wrap it for trigger, status, cancel, or dispatcher-facing caller surfaces. Workflow plugins do not expose caller-facing product APIs, and the dispatcher does not own workflow semantics.

## Layered Terminology Locks

| Layer | Canonical terms | Excluded drift |
| --- | --- | --- |
| App and entrypoint authoring | `defineApp(...)`, `startApp(...)`, `AppDefinition`, `Entrypoint`, `RuntimeProfile` | Multiple public verbs for the same app start operation |
| Service authoring | `defineService(...)`, `resourceDep(...)`, `serviceDep(...)`, `semanticDep(...)`, `deps`, `scope`, `config`, `invocation`, `provided` | Treating service-to-service clients as runtime resources |
| Plugin authoring | `PluginDefinition`, `PluginFactory`, `useService(...)`, lane-specific role builders, lane-specific surface builders, native builder vocabulary | Public generic adapter-kind fields or exposure/visibility objects as normal plugin authoring |
| SDK and plan derivation | `ServiceBindingPlan`, `ProviderSelection`, `ResourceRequirement`, `SurfaceRuntimePlan`, portable plan artifacts | Exposing derivation nouns as ordinary app or plugin authoring concepts |
| Runtime internals | `runtime compiler`, `CompiledProcessPlan`, `bootgraph`, `Effect provisioning kernel`, `process runtime`, `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `ServiceBindingCache` | Live-access nouns named as diagnostic views |
| Runtime adapter lowering | `SurfaceAdapter`, compiled surface plan input, adapter-lowered payloads | Adapters lowering raw authoring declarations or SDK graphs directly |
| Harness and native boundary | `Harness`, `HarnessAdapter`, `FunctionBundle`, native framework payload nouns at the harness edge | Harness vocabulary as app, service, or plugin authority |
| Diagnostics and control plane | `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeDiagnosticContributor`, topology read model | Live access as a diagnostic noun |

Different names may coexist only when different layers own different concepts.

## Carry-Forward Precision Locks

These precision locks preserve load-bearing runtime architecture after translation into the target topology and nouns in this Architecture Authority.

### Service Binding And Invocation

Service binding is construction-time over service `deps`, service `scope`, and service `config` only. `bindService(...)` constructs a live service binding from provisioned resources, sibling service clients, semantic adapters, scope, and config. It does not bind invocation context as construction-time state.

`invocation` is required per-call input supplied by the harness or caller through invocation-aware clients, oRPC context, workflow context, command context, or equivalent native caller context. It never participates in `ServiceBindingCacheKey`.

`provided.*` is service middleware output. The runtime and package boundaries do not seed `provided` by default.

`ServiceBindingCacheKey` is derived from canonical process, role, surface, capability, service identity, optional service instance, dependency instances, `scopeHash`, and `configHash`. Authors do not provide binding cache keys as public DX. Call-local memoization is separate from `ServiceBindingCache`.

### Resources, Providers, Profiles, And Coverage

`ResourceLifetime` is `process` or `role`. Process and role are acquisition/scoping semantics on requirements and compiled plans, not separate public resource-definition species.

`RuntimeResource` carries stable resource identity, consumed value shape, default and allowed lifetimes, optional `configSchema`, and diagnostic-safe view/export behavior.

`ResourceRequirement` carries `resource`, `lifetime`, optional `role`, optional `instance`, optional `optional`, and `reason`. Multiple instances require instance keys. Optional resources are explicitly optional and produce diagnostics when an expected optional path becomes required by a consumer.

`RuntimeProvider` carries the provided resource, provider dependencies through `requires`, optional `configSchema`, optional `defaultConfigKey`, health/diagnostic behavior, and an Effect-backed build/acquisition hook that receives validated config, already-provisioned dependency resources, and provisioning scope.

`ProviderSelection` carries provider identity or descriptor, provided resource, lifetime, optional role, optional instance, config binding or config key, and diagnostics for ambiguity. Every required resource has exactly one selected provider at the relevant lifetime and instance unless the requirement is explicitly optional. Provider dependencies close before provisioning. Ambiguous provider coverage requires explicit app-owned selection.

### Runtime Access

`RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess` expose only typed RAWR-approved live values and sanctioned redacted handles. They carry process, app, entrypoint, role, surface, capability, and topology identity metadata needed by runtime binding and diagnostics.

Runtime access may expose `resource(...)` and `optionalResource(...)` retrieval for approved resource values and may expose sanctioned topology/observability write hooks. Runtime access never exposes raw Effect `Layer`, `Context.Tag`, `Scope`, `ManagedRuntime`, provider internals, or unredacted config secrets.

### Bootgraph And Provisioning

The bootgraph is the RAWR lifecycle graph above Effect layer composition. It owns stable RAWR lifecycle identity, deterministic ordering, dedupe, rollback, reverse shutdown, and typed context assembly for process and role lifetimes. It is not a second Effect replacement.

The bootgraph contains boot resource modules keyed by resource id, process-or-role lifetime, optional role, optional surface/capability identity, optional instance, dependency edges, `start(...)`, and optional `stop(...)`. Startup follows dependency order. Shutdown and finalizers run in reverse dependency order.

The Effect Provisioning Kernel emits `ProvisionedProcess`: `managedRuntime`, process scope, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, and `stop()`. `managedRuntime` is internal only; consumers receive `RuntimeAccess` surfaces. `stop()` owns shutdown orchestration: stop mounted harnesses, stop process runtime surface assemblies, run role-scope finalizers, run process-scope finalizers, then dispose the managed runtime.

`ManagedRuntimeHandle` is internal runtime machinery. It runs process-local runtime effects and owns disposal. It is not a workflow, service, plugin, harness, app, diagnostic view, or public authoring surface.

### Process Runtime, Surface Runtime, And Harness Handoff

`ProcessRuntime` consumes a `CompiledProcessPlan` plus provisioned process and role runtime access. It resolves SDK-derived service binding plans, invokes selected plugin projections, merges contributions by topology-defined role and surface, and emits mounted surface runtime records.

Harnesses consume mounted surface runtimes or adapter-lowered payloads. Harnesses never consume raw authoring declarations, SDK graphs, or compiler plans directly.

`HarnessDescriptor.mount(...)` returns `StartedHarness`. `StartedHarness.stop?()` is the runtime-owned shutdown hook for native host teardown. Runtime startup records every successfully mounted harness. Startup rollback and normal shutdown stop harnesses in reverse mount order before releasing role and process scopes.

### Runtime Catalog And Diagnostics

`RuntimeCatalog` is a stable diagnostic read model, not a second manifest and not live access. Do not reserve its record shape. Reserve only storage backend, retention, indexing, and exact persistence format.

The minimum catalog sections are process identity, app identity, entrypoint identity, roles, derived authoring, resources, providers, plugins, service attachments, surfaces, harnesses, lifecycle timestamps, lifecycle status, redacted diagnostics, topology records, startup records, and shutdown records.

### Async Artifacts And Dispatcher

`WorkflowDefinition`, `ScheduleDefinition`, and consumer definitions are the single authored source for stable async facts: id, trigger event or cron/timezone, schema-backed payload when event data is read, optional flow controls, and handler.

Event names, cron strings, and function ids identify triggers only. They are not data schemas. Any workflow, schedule, or consumer definition that reads event data carries a schema-backed payload contract owned by the async projection or the service boundary it projects.

The async `SurfaceAdapter` lowers compiled `SurfaceRuntimePlan` artifacts into `FunctionBundle`, the harness-facing artifact consumed by the Inngest harness. Ordinary async plugin authoring returns RAWR workflow, schedule, or consumer definitions. It does not manually acquire the Inngest client, call runtime access directly to construct native functions, or construct the harness-facing bundle.

`WorkflowDispatcher` is derived from selected workflow definitions plus the process async client. It exposes dispatcher operations such as trigger, status, cancel, or `send(...)` according to the selected workflow definitions. Server API and server internal projections wrap the dispatcher for caller-facing surfaces. Workflow plugins do not expose product APIs directly.

### Config And Secrets

Runtime config loads once per process unless a provider explicitly declares refresh behavior. Runtime config validates through `RuntimeSchema`, redacts secrets at the config layer, supports environment, dotenv, file, memory, and test source kinds, supplies provider config through app-owned runtime profiles, forbids raw environment reads in plugin and service handler code, and does not become a global untyped bag.

Config precedence algorithms, provider-specific refresh strategy, retry policy, and refresh mechanics are reserved details. Validation, redaction boundary, source kinds, profile-mediated provider config, no raw environment reads, and no untyped global config are locked behavior.

### Plugin Factory Exactness

`PluginFactory` is import-safe, is instantiated at app composition time, acquires no resources, and returns exactly one `PluginDefinition`. Ergonomic helpers may return arrays of `PluginDefinition` values, but grouped plugins are not a runtime architecture kind and are not used for identity, topology, diagnostics, or app composition authority.

## Resource, Provider, And Profile Locks

`RuntimeResource` names a provisionable capability contract consumed by services, plugins, harnesses, or runtime plans.

`RuntimeProvider` names an implementation that acquires, validates, supplies, refreshes, and releases a resource value.

`RuntimeProfile` names an app-owned selection of providers, config sources, process defaults, harness choices, and environment-shaped wiring.

Profile fields that hold provider choices use `providers` or `providerSelections`. The field name `resources` is reserved for required capabilities, not implementation selection.

Resource names describe consumed capability values, such as `SqlPoolResource`, `ClockResource`, `EmailSenderResource`, `ObjectStorageResource`, `FilesystemResource`, `CacheResource`, and `TelemetryResource`.

Provider names describe implementations, such as `PostgresSqlProvider`, `SystemClockProvider`, `ResendEmailProvider`, `S3ObjectStorageProvider`, `LocalFilesystemProvider`, and `OpenTelemetryProvider`.

Standard RAWR-owned provider implementations belong under `packages/core/runtime/standard/*`. Public authoring still flows through `resources/*` and `@rawr/sdk`.

## Service Binding Locks

`resourceDep(...)` is service-authoring language for a provisionable host capability.

`serviceDep(...)` is service-authoring language for a service-to-service client dependency.

`semanticDep(...)` is service-authoring language for an explicit semantic adapter dependency.

`useService(...)` is plugin-authoring language for a projected service client requirement.

`bindService(...)` is SDK and runtime lowering language for constructing a live service binding from resources, service clients, semantic adapters, scope, and config.

`ServiceBindingPlan` is the derived binding recipe.

`ServiceBindingCache` is the runtime-owned cache for live service bindings.

`ServiceBindingCacheKey` is derived from canonical process, role, surface, capability, service identity, optional service instance, dependency instances, `scopeHash`, and `configHash`. It does not include invocation inputs. Authors do not provide binding cache keys as public DX.

## Runtime Access And Catalog Locks

`RuntimeAccess` retrieves live provisioned values and live runtime services through typed RAWR-approved access only.

`ProcessRuntimeAccess` scopes live access to a started process.

`RoleRuntimeAccess` scopes live access to one role inside a started process.

`RuntimeCatalog` records selected, derived, provisioned, bound, projected, mounted, observed, and stopped topology. It is a diagnostic read model. It does not retrieve live values.

`RuntimeDiagnostic` is a structured runtime finding, status, or violation.

`RuntimeTelemetry` is the runtime-owned spans, events, annotations, and lifecycle telemetry chain.

## Framework Boundary Locks

Effect is the runtime provisioning substrate. It is public to runtime-resource authors, provider authors, substrate authors, process-runtime authors, and harness-integration authors. It is private to ordinary service, plugin, app, and entrypoint authoring.

oRPC owns RPC semantics inside server API and trusted internal API boundaries. It does not own service truth, app membership, runtime access, provider selection, or bootgraph lifecycle.

Elysia owns HTTP host semantics inside the server harness. It does not own public API meaning, service construction, runtime provisioning, or app selection.

Inngest owns durable async execution semantics inside the async harness. It does not own workflow meaning, service truth, app membership, runtime provisioning, or caller-facing API semantics.

OCLIF owns command host semantics inside the CLI harness. It does not own plugin management truth, service semantics, runtime provisioning, or app selection.

OpenShell, desktop, and web hosts own native shell behavior inside their harness boundaries. They do not own RAWR semantic truth or runtime realization.

Effect queues, schedules, pubsub values, fibers, scopes, and layers are process-local runtime mechanics unless a resource, provider, service, plugin, app, or harness explicitly assigns them a higher-level semantic role.

RAWR-shaped boundaries wrap native interiors. oRPC contracts and routers remain oRPC-native inside server API and server internal plugins. Inngest execution remains Inngest-native inside the async harness boundary. OCLIF commands remain OCLIF-native inside CLI plugins. Web, desktop, OpenShell, and agent hosts retain their native execution semantics inside their harness boundaries.

Surface adapters lower runtime-compiled `SurfaceRuntimePlan` artifacts or compiled surface plan artifacts to native payloads. They do not lower raw authoring declarations or SDK graphs directly, and they do not create a second public DSL that duplicates native framework semantics.

## Named Runtime Components

Config and secrets use app runtime profiles for source selection and runtime substrate components for loading, validation, redaction, provider access, diagnostics hygiene, and process-local availability.

Provider dependency graphs use compiler coverage, bootgraph ordering, scoped acquisition, refresh rules, rollback, and finalizers.

Caching separates service binding cache, runtime-local cache primitives, app-selected cache resources, and semantic service read-model caches.

Telemetry separates runtime telemetry, optional telemetry resources, native framework instrumentation, and service semantic enrichment.

Policy separates app membership and process policy, plugin boundary policy, service domain invariants, and runtime enforcement primitives.

Service dependency adapters attach service-to-service dependency semantics to SDK derivation, compiler binding plans, and process-runtime binding.

Key and KMS capabilities are resource families only where a service, plugin, harness, or provider consumes live key-management capability values.

Runtime realization defines local process semantics and emits or consumes topology, health, profile, process identity, and shutdown records at control-plane boundaries. Deployment and control-plane architecture own multi-process placement policy.

Agent governance belongs to the agent harness, OpenShell resource boundary, app selection, and policy hooks. It does not move service truth or runtime access into agent plugins.

## Diagnostics Failure Classes

Runtime diagnostics must name the violated boundary or failed lifecycle phase. The diagnostic system must cover at least these failure classes:

- topology and builder mismatch;
- unsupported role, surface, or harness lane;
- invalid plugin export or plugin factory shape;
- missing service, resource, provider, profile, or workflow-dispatcher target;
- provider/resource mismatch;
- invalid lifetime or scope request;
- duplicate runtime identity or duplicate provisioned instance;
- service dependency cycle;
- service binding cache collision;
- config, secret, or redaction coverage failure;
- runtime compiler coverage failure;
- bootgraph startup, rollback, finalizer, or shutdown ordering failure;
- harness mount failure;
- diagnostic catalog emission failure.

## Synthesis Requirements

The synthesized specification must use present-tense normative statements.

The synthesized specification must explain concepts directly, without referring to input documents, review artifacts, revisions, authors, evaluation runs, or decision history.

The synthesized specification must preserve nuanced naming rules. Similar concepts in different layers keep distinct names when their ownership differs.

The synthesized specification must be self-contained enough for a runtime implementer to derive package placement, public authoring APIs, runtime internals, harness boundaries, diagnostics shape, and forbidden patterns without reading review material.

The synthesized specification must not average incompatible shapes. A conflict resolves by applying this Architecture Authority.
