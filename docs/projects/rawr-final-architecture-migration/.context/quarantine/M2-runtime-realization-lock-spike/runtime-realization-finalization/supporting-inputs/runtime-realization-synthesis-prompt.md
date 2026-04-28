# GPT-5.5 Pro Runtime Realization Synthesis Prompt

You are the owner of the final RAWR Runtime Realization System specification.

Your task is not only to combine documents. You own the outcome of the runtime realization system as a system design artifact. Think through what is being wired: authoring declarations, SDK derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning, process runtime binding, adapter lowering, harness mounting, diagnostics, and shutdown.

Produce the canonical blueprint for this system. The document must be strong enough that a reader can see through the layers, understand each component independently, and then understand how the components assemble into the full runtime realization system.

## Input Roles And Authority

This prompt governs the synthesis process, document-construction method, and final review standard. The Runtime Realization Synthesis Lock governs architecture. If this prompt appears to restate, narrow, or expand a Synthesis Lock rule, follow the Synthesis Lock.

Use exactly these synthesis inputs:

1. The Runtime Realization Synthesis Lock.
2. Alternative Runtime Realization Specification 1.
3. Alternative Runtime Realization Specification 2.
4. The curated Implementation Grounding Excerpt.

Use them in these roles:

- The Synthesis Lock is binding target authority for topology, naming, ownership, lifecycle, runtime artifacts, reserved boundaries, and conflict resolution.
- Alternative Runtime Realization Specification 1 supplies lifecycle depth and runtime-detail coverage where consistent with the Synthesis Lock.
- Alternative Runtime Realization Specification 2 supplies component inventory and author-to-realization sequencing pressure where consistent with the Synthesis Lock.
- The Implementation Grounding Excerpt supplies quarantined example realism only for example-todo service internals, schema-backed service contracts, and N > 1 service module shape.

Do not use raw agent reports, audit notes, spike summaries, or review transcripts as authority. They may contain superseded recommendations, temporal framing, or unresolved ambiguity.

Do not use the existing Runtime Realization System specification, the integrated canonical architecture specification, broader architecture/foundry documents, older alternate specifications, raw repository zip contents, raw repository files, or source reports as synthesis inputs. Their accepted carry-forward substance is already represented in the Synthesis Lock.

The Implementation Grounding Excerpt is not architecture authority. Do not copy its package names, import paths, registration helpers, SDK names, topology, repository state, plugin internals, API projection internals, exact file tree, helper names, module names, repository-provider split, middleware names, or example-todo paths into the canonical specification unless the Synthesis Lock independently states the same detail. Do not make example-todo the document spine, a dedicated focus area, canonical service topology, or the default lens for runtime realization.

## Task

Produce a single standalone canonical and normative Runtime Realization System specification.

The output document must read as the authoritative system specification, not as a synthesis memo. It must not mention this prompt, the existence of alternate inputs, the Synthesis Lock, prior revisions, current repo reality, migration status, agent reports, or the synthesis process.

Own the document as the finished normative artifact. It must not feel like a task response, a summary, or a stitched-together report. It must feel like the stable system blueprint for runtime realization.

You are composing the final runtime realization architecture in the form of a specification. The specification is the artifact, but the work is architectural ownership: decide how the system realizes apps at runtime, preserve the parts of the inputs that make that system concrete, and fill obvious architecture gaps that are necessary for a complete runtime realization system when they are consistent with the Synthesis Lock.

## Source Reading Posture

When inputs conflict, apply the Synthesis Lock. Do not split the difference.

Read the Synthesis Lock before reading either alternate specification. Treat it as the target vocabulary, topology, ownership model, authority frame, and conflict resolver.

Then read each alternate specification fully and independently under the Synthesis Lock frame. Think through what each alternate is trying to solve as runtime realization architecture, not merely as prose. Extract clearly necessary architecture that this prompt or the Synthesis Lock may not have named, but translate it into the Synthesis Lock's nouns, topology, ownership rules, and lifecycle. Do not draft from alternate section order, terminology, diagrams, type signatures, public API names, import paths, package layout, examples, capability-family placement, or problem framing and then patch with guardrails.

Use the Implementation Grounding Excerpt only for example realism where it agrees with the Synthesis Lock.

## Required Frame

Produce a hardened runtime realization system specification for RAWR.

The specification must define how selected app composition becomes one started, typed, observable, stoppable process per `startApp(...)` invocation through SDK derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning, process runtime binding, adapter lowering, harness mounting, diagnostic catalog emission, and deterministic shutdown. An app may define multiple entrypoints or process shapes, but multi-process placement policy is a deployment/control-plane touchpoint, not runtime realization ownership.

The specification must preserve these ownership laws:

- Services own semantic truth.
- Plugins own projections.
- Apps own selection.
- Resources own provisionable capability contracts.
- Providers own implementation and acquisition.
- The SDK derives normalized authoring graphs, normalized `ProviderSelection` artifacts from app-owned profiles, service binding plans, surface runtime plan descriptors, and portable plan artifacts.
- The runtime owns compilation, provisioning, binding, adapter lowering, realization, diagnostics, and shutdown.
- Harnesses own native mounting.
- Diagnostics observe.

The specification must preserve the lifecycle order:

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

This specification owns runtime realization only. It reinforces the broader RAWR architecture by defining boundary contracts and integration points. It must not redefine service domain truth, plugin semantics, app product meaning, deployment or control-plane placement, or framework-native semantics except where those systems cross the runtime realization boundary.

## Required Workflow

Follow this workflow before returning the final document:

1. Read the entire Synthesis Lock first. Use it as the target vocabulary, topology, ownership model, authority frame, and conflict resolver.
2. Read Alternative Runtime Realization Specification 1 completely and independently under the Synthesis Lock frame. Extract lifecycle depth, runtime-detail coverage, and any clearly necessary architecture that should carry forward when translated into the Synthesis Lock's nouns and topology.
3. Read Alternative Runtime Realization Specification 2 completely and independently under the Synthesis Lock frame. Extract component inventory, sequencing pressure, and any clearly necessary architecture that should carry forward when translated into the Synthesis Lock's nouns and topology.
4. Treat the Implementation Grounding Excerpt as quarantined reference material for example realism only. Its concrete names and file tree do not bind the specification, and example-todo must not become the organizing frame for the document.
5. Build an internal carry-forward ledger before drafting. Decide which material carries forward as direct normative substance, which material is synthesized across sources, which material is retained as illustrative pressure only, and which material is excluded because it conflicts with the Synthesis Lock.
6. Internally plan the final document before drafting. Choose the structure that best exposes the architecture, then draft the complete standalone specification.
7. Review the draft across multiple axes before finalizing:
   - structural correctness: section order, component boundaries, and layer separation are sound;
   - goal fit: the document actually defines runtime realization as an implementable system;
   - layering clarity: internals are visible and important layers are not collapsed;
   - example coverage: simple examples are paired with realistic N > 1 examples;
   - authoring surface versus internals: simple authoring DX is backed by explicit derived/runtime/harness artifacts;
   - carry-forward fidelity: concrete load-bearing mechanisms from each alternate were either carried forward into nouns approved by the Synthesis Lock or deliberately excluded for a Synthesis Lock conflict;
   - cohesion: the document stands alone as the canonical normative spec;
   - foundation and extension: locked foundations are stable, and reserved/flexible areas can evolve without renegotiating the foundation.

This workflow is internal. The final output is only the canonical specification.

## Cohesion Requirements

Preserve the broader RAWR platform intent through the cohesion laws below. Do not import broader architecture documents as authority.

RAWR is a bounded software foundry: software systems are formed under shared semantic law, hardened through explicit runtime realization, and allowed to change placement without changing identity.

The specification must reinforce these platform laws:

- Scale changes placement, not semantic meaning.
- A system does not change species when it changes process, machine, platform service, app boundary, or repository boundary.
- Services own capability truth; plugins project that truth into role and surface lanes; apps compose selected projections into product/runtime identities; entrypoints realize selected slices into running processes.
- Runtime realization makes execution explicit without creating a second public semantic architecture.
- The broader platform composition law is bind, project, compose, realize, observe; inside runtime realization, the normative lifecycle remains `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`.
- Shared infrastructure is not shared semantic ownership.
- Namespace is not ownership.
- Harness choice, substrate choice, provider choice, and deployment placement are downstream of semantic meaning.
- Stable nouns reduce ambient ambiguity for humans and agents.

Do not turn this cohesion frame into a broad platform manifesto. Use it to keep the runtime specification aligned with the overall architecture while keeping the document focused on runtime realization.

Think with information-design and system-design discipline while writing. The document must reveal the relationships between components, not merely list components. It must be navigable as a reference, coherent as a system explanation, and concrete enough to derive implementation work.

Consider Effect, oRPC, Inngest, OCLIF, Elysia, web, desktop, OpenShell, and agent hosts where they cross the runtime realization boundary. Treat them as native framework interiors behind RAWR-shaped boundaries, not as peer semantic owners.

## Required Coverage To Fit Into The Chosen Structure

Own the final structure. Choose the section organization that best produces a cohesive, standalone, canonical runtime realization specification. The list below defines coverage that must appear; it is not an exhaustive table of contents and it does not prohibit additional sections, subsections, diagrams, matrices, or assembly flows needed to satisfy the larger objective.

Cover these categories while preserving their layer separation and canonical nouns:

1. Purpose and scope: define runtime realization, what it owns, and what it does not own.
2. Ownership laws: state the normative ownership split across services, plugins, apps, resources, providers, SDK, runtime, harnesses, and diagnostics.
3. Canonical topology: define package placement, authored roots, platform roots, and import authority.
4. Realization lifecycle: define the chain from definition through observation.
5. Entrypoint and app authoring contract: define `defineApp(...)`, `startApp(...)`, app membership, roles, surfaces, harness choices, and runtime profiles.
6. Service authoring contract: define `defineService(...)`, `resourceDep(...)`, `serviceDep(...)`, `semanticDep(...)`, `RuntimeSchema` for runtime-carried service boundary lanes, `deps`, `scope`, `config`, `invocation`, and `provided`.
7. Plugin authoring contract: define `PluginDefinition`, `PluginFactory`, `useService(...)`, lane-specific role builders, lane-specific surface builders, projection rules, and topology/builder agreement for server API/internal, async workflow/schedule/consumer, CLI, web, agent, and desktop lanes.
8. Resource, provider, and profile model: define `RuntimeResource`, `ResourceRequirement`, `ResourceLifetime`, `RuntimeProvider`, `RuntimeProfile`, `ProviderSelection`, authored resource catalog, standard provider stock, and provider dependency graph.
9. SDK derivation and plan artifacts: define normalized graph construction, identity derivation, requirements, provider coverage, service binding plans, surface runtime plan descriptors, and portable plan artifacts.
10. Runtime compiler and compiled process plan: define compiler inputs, outputs, coverage checks, diagnostics, and plan boundaries.
11. Bootgraph and provisioning kernel: define ordering, boot resource keys/modules, scopes, Effect substrate, acquisition, rollback, finalizers, `ProvisionedProcess`, config/secrets handling, and managed runtime ownership.
12. Process runtime and service binding: define `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `ServiceBindingCacheKey`, service binding cache, mounted surface assembly, live access, invocation handoff, and process runtime ownership.
13. Surface adapter lowering: define `SurfaceAdapter`, compiled surface plan inputs, adapter-lowered payloads, `FunctionBundle` as the async harness-facing derived/lowered artifact, and harness handoff.
14. Harness and native boundary contracts: define Elysia, Inngest, OCLIF, web, desktop, OpenShell, and agent host boundaries as native mounting lanes, not semantic owners.
15. Diagnostics and observation: define `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`, topology records, redaction, read models, and diagnostic boundaries.
16. Cross-cutting runtime components: define config/secrets, caching taxonomy, telemetry, policy primitives, service dependency adapters, key/KMS resources, and control-plane touchpoints by owner.
17. Named reserved detail boundaries: identify boundaries whose ownership and integration points are locked while internal detail remains intentionally bounded.
18. Enforcement rules and forbidden patterns: state rejected topology, naming, ownership, lifecycle, and framework-boundary patterns as normative architecture rules.

You may add sections and reorder explanatory material when that improves the specification, but do not collapse the layer-specific contracts above into generic authoring, generic runtime, generic plugin, or generic framework sections. Each layer's contract must remain independently readable and assembly sections must use previously defined component contracts.

## Specification Construction Method

The specification must be built from concrete components that can be assembled into the final runtime realization system. Within the structure you choose, move from ownership and design laws into named components, mechanisms, examples, and assembly flows.

For every load-bearing system component or artifact that participates in runtime realization, include the applicable component contract:

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

Each load-bearing component section must stand on its own. A reader must be able to understand what the component owns, where it lives, what artifact it receives, what artifact it emits, and what consumes it without relying on another section's unstated assumptions.

Every system component with file-system presence must include a concrete placement illustration. Use package trees that show enough surrounding context to locate the component inside `packages/core/sdk`, `packages/core/runtime/*`, `resources/*`, `apps/<app>/runtime/*`, `services/*`, or `plugins/*`.

Every illustrated code block must identify the file path and layer or owner it represents. Put visible `File:` and `Layer:` labels immediately before the code block. Do not emit anonymous code blocks.

Mark TypeScript and code blocks by exactness level. Code and type blocks are normative for locked names, ownership boundaries, required fields, producer/consumer shape, lifecycle handoff, and layer handoff. They are illustrative for overloads, generic parameters, helper placement, and import paths unless the Synthesis Lock states them. Label non-final examples as type-shape illustrations rather than final TypeScript signatures.

Simplified examples are allowed only as entry points. When the specification includes a simplified example for any public authoring surface, runtime compilation boundary, provisioning boundary, harness boundary, or diagnostics boundary, also include at least two realistic examples that preserve the relevant layers and integration artifacts.

Every author-facing convenience must be mirrored by its backend realization. If the document shows authoring DX, it must show each applicable link: authoring declaration, SDK-derived graph or plan, runtime-compiled artifact, binding/provisioning or adapter-lowered artifact, and consuming runtime or harness integration point. If a link is absent, state which layer is absent and why.

Use architecture diagrams, sequence diagrams, package trees, type illustrations, and interface tables as core specification material. These are not optional appendices. They are required wherever prose alone would allow the model, implementer, or reviewer to collapse layers.

The document's later sections must assemble previously defined components into the end-to-end runtime realization system. Assembly sections must not introduce new unnamed adapters, hidden transformations, implicit ownership transfer, or unillustrated integration behavior.

Do not optimize for concision. Optimize for implementable specificity, stable naming, explicit boundaries, and enough realistic examples to make layer collapse difficult.

Use load-bearing versus flexible matrices where they clarify the architecture. Load-bearing foundations include ownership, topology, lifecycle, authoring/runtime layering, resource/provider/profile separation, runtime access, service binding, process runtime, adapter lowering, harness mounting, diagnostics, and forbidden layer collapse. Flexible areas must still expose owner, integration hook, inputs, outputs, diagnostics, and extension boundary.

Use the following artifact forms where they make the component contract more precise:

- a placement tree showing canonical file and package location;
- a component contract table when tabular shape makes owner, inputs, outputs, invariants, lifecycle phase, integration points, diagnostics, and forbidden responsibilities easier to compare;
- concrete TypeScript interface, `RuntimeSchema`, schema-backed contract, or type-shape illustrations for public, SDK-derived, runtime-internal, or harness-facing artifacts;
- at least one architecture or sequence diagram when the section describes a dynamic flow;
- at least one simple example and at least two realistic examples for the same public authoring surface, runtime compilation boundary, provisioning boundary, harness boundary, or diagnostics boundary when a simplified example is used;
- an explicit "what consumes this" statement for every derived or compiled artifact.

The specification must include drift-blocking examples for:

- an N > 1 service module shape;
- a public server API projection calling a service;
- an internal workflow trigger or status projection wrapping a workflow dispatcher;
- a service depending on a sibling service through `serviceDep(...)`;
- app profile and entrypoint selection showing app membership, provider selection, and process shape without collapsing them into one authoring field;
- schema-backed service contracts and plugin API contracts that use schemas or equivalent concrete typed contract objects rather than string labels for data shapes;
- server API and server internal plugin examples with at least one concrete oRPC input schema, output schema, and error-data schema-backed contract. Placeholder names such as generic ORPC contracts, routers, or undefined input/output aliases may appear only after the concrete schema artifact is defined or imported from a named owner;
- workflow, schedule, or consumer examples where any read event data is backed by a schema-owned payload contract; event names, cron strings, and function ids identify triggers only.

Reserved detail boundaries are not permission to omit integration detail. For each reserved boundary, state the owner, package location, integration hook, required input and output shapes, diagnostics, enforcement rule, and the condition that requires a dedicated specification pass.

Do not use placeholder phrases such as "implementation detail", "handled internally", "framework-specific", or "outside scope" as substitutes for a boundary contract. If an internal detail is reserved, name the owning component and the exact interface through which the rest of the runtime system interacts with it.

## Synthesis Lock Completion Anchors

The Synthesis Lock is the authority for these anchors. This list is a review aid, not a substitute for reading the Synthesis Lock and not a second source of architectural wording. Carry forward the Synthesis Lock exactly in substance, including:

- `packages/core/sdk` publishing `@rawr/sdk`.
- `packages/core/runtime/*` for compiler, bootgraph, substrate, process runtime, harnesses, topology, standard provider implementations, internal standard runtime machinery, and runtime internals.
- top-level `resources/*` for authored provisionable capability contracts.
- `apps/<app>/runtime/*` for app-owned profiles, config source selection, provider selection, and process defaults.
- `defineApp(...)` and `startApp(...)` as canonical app and entrypoint APIs.
- topology-implied projection status: `plugins/server/api/<capability>` plus `defineServerApiPlugin(...)` means public server API projection; `plugins/server/internal/<capability>` plus `defineServerInternalPlugin(...)` means trusted internal server API projection.
- topology and builder agreement for async workflow, async schedule, async consumer, CLI command, web app, agent channel/shell/tool, and desktop menubar/window/background projection lanes.
- import-safe declarations that do not acquire resources, read secrets, start processes, register globals, mutate app composition, or mount native hosts.
- one started process owns one root managed runtime and one process runtime assembly.
- `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`, `ServiceBindingCache`, and `ServiceBindingCacheKey`.
- `resourceDep(...)`, `serviceDep(...)`, `semanticDep(...)`, `useService(...)`, and `bindService(...)` separated by layer.
- service binding is construction-time over `deps`, `scope`, and `config`; invocation is supplied per call and does not participate in `ServiceBindingCacheKey`.
- `RuntimeResource`, `ResourceRequirement`, `ResourceLifetime`, `RuntimeProvider`, `RuntimeProfile`, `ProviderSelection`, and profile `providers` or `providerSelections` fields.
- `RuntimeSchema` as the canonical SDK-facing schema facade for runtime-owned and runtime-carried boundary schema declarations, including resource config, provider config, runtime profile config, service boundary `scope`, service boundary `config`, service boundary `invocation`, diagnostics payloads, and harness-facing runtime payloads.
- service callable contracts as service-owned schema-backed contracts that may be expressed through oRPC primitives; oRPC is the procedure/framework substrate, not the owner of service truth or public API meaning.
- process and role resource lifetimes as acquisition/scoping semantics, not separate public resource-definition species.
- provider coverage as a compiler/provisioning contract: every required resource has a provider, provider dependencies close, ambiguous provider coverage requires explicit app-owned selection, optional resources are explicitly optional, and multiple instances require instance keys.
- `Bootgraph`, boot resource keys/modules, `ProvisionedProcess`, `ManagedRuntimeHandle`, `ProcessRuntime`, mounted surface runtime records, `StartedHarness.stop?()`, and deterministic reverse-order shutdown.
- service API caller posture: external callers use selected server API projections, first-party remote callers use selected server internal projections, and same-process trusted callers use service clients instead of local HTTP self-calls.
- workflow, schedule, and consumer metadata authored once in RAWR async projection definitions; `FunctionBundle` is the harness-facing derived/lowered artifact consumed by the Inngest harness, not a public authoring declaration.
- `WorkflowDispatcher` as a derived runtime/SDK integration artifact that server API and server internal projections may wrap for trigger, status, cancel, or dispatcher-facing caller surfaces.
- `RuntimeCatalog` minimum record shape: process identity, app identity, entrypoint identity, roles, derived authoring, resources, providers, plugins, service attachments, surfaces, harnesses, lifecycle timestamps, lifecycle status, redacted diagnostics, topology records, startup records, and shutdown records.
- `PluginFactory` as import-safe, app-composition-time, resource-free, and exactly one `PluginDefinition` per factory.
- framework boundaries for Effect, oRPC, Elysia, Inngest, OCLIF, OpenShell, desktop, and web hosts.
- named runtime components for config/secrets, provider dependency graphs, caching, telemetry, policy, service dependency adapters, key/KMS resources, multi-process placement boundary records, and agent governance.

## Output Rules

Write in present-tense canonical language.

Do not include metacommentary, provenance narrative, changelog language, comparison language, report language, or revision language.

Do not use temporal or transient framing such as "prior", "current", "future", "transitional", "migration-era", "for now", "eventually", "later", "maybe", or "recommend".

Do not mention the alternate documents by name. Do not mention source reports.

Use the Synthesis Lock's accepted names for target topology, target APIs, and target components.

The target public SDK is `@rawr/sdk`, the target platform homes are `packages/core/sdk` and `packages/core/runtime/*`, and live runtime access uses `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`.

Public/internal projection status is derived from topology plus the matching builder. Plugin examples express lane-specific surface facts directly in the lane-specific builder or native module, not through generic projection-status fields.

Native mount facts are builder-specific surface facts or route/module facts. They do not decide public/internal classification.

Surface adapters lower runtime-compiled `SurfaceRuntimePlan` artifacts or compiled surface plan artifacts to native payloads. They do not lower raw authoring declarations or SDK graphs directly.

When showing server API or server internal plugin examples, include package path and builder agreement explicitly. A `plugins/server/api/<capability>` example must use `defineServerApiPlugin(...)`; a `plugins/server/internal/<capability>` example must use `defineServerInternalPlugin(...)`. If a capability needs both public and internal callable surfaces, show two projection packages rather than a field that switches exposure.

When showing app or harness publication policy, state that it can select, mount, publish, or generate artifacts for already-classified projections. It cannot reclassify a projection's public/internal status.

Use one canonical term per concept unless the Synthesis Lock states that two terms belong to different layers.

Make the document self-contained. A runtime implementer must be able to derive package placement, public APIs, internal runtime components, ownership boundaries, harness boundaries, diagnostics shape, and forbidden patterns from the specification alone.

Use explanatory prose, tables, diagrams, package trees, and code blocks wherever they reduce ambiguity. Avoid long narrative history. Avoid references to evidence-gathering. Length is acceptable when it carries specification detail.

When the specification describes authoring DX that implies SDK or runtime behavior, include TypeScript illustrations showing the author-facing declaration, the SDK-derived graph or plan, the runtime-compiled artifact shape, the adapter-lowered or provisioning artifact, and the runtime or harness integration point that consumes that artifact. These examples are specification-grade illustrations with concrete file and layer labels, not implementation bodies or tutorial flows.

Schema-bearing examples must use `RuntimeSchema`, schemas, schema-backed contracts, or concrete typed contract objects for service boundary lanes, service contracts, plugin API contracts, workflow payloads, resource value shapes, provider config, runtime profile config, diagnostics payloads, and harness payload contracts. Use `RuntimeSchema` for runtime-owned and runtime-carried boundary schemas such as resource config, provider config, runtime profile config, service boundary `scope`, service boundary `config`, service boundary `invocation`, diagnostics payloads, and harness-facing runtime payloads. Use service-owned or plugin-owned schema-backed contracts for service procedure payloads, plugin API payloads, plugin-native contracts, and workflow payloads. Plain string labels may name identities, capabilities, routes, ids, triggers, cron expressions, or policy labels; they must not stand in for data schema definitions.

Every authoring convenience must be paired with the equivalent SDK derivation, runtime plan, binding plan, or harness handoff concept it produces. Do not describe runtime behavior through mystery terms or shorthand. Name the responsible component, artifact, producer, consumer, and lifecycle phase.

Structurally distinguish locked specification from reserved detail boundaries. A locked section states normative contracts, boundaries, and rules that bind implementation. A reserved detail boundary states the locked owner, the integration hook, the intentionally bounded internal detail, and the condition that requires a dedicated specification pass. Reserved boundaries are named architecture surfaces, not vague gaps.

Reserve these areas without solving their internals beyond the locked boundary contract: config and secret precedence algorithms; provider-specific refresh strategy, retry policy, and refresh mechanics; call-local memoization separate from `ServiceBindingCache`; generic `CacheResource`; runtime telemetry outside oRPC; `RuntimeCatalog` storage backend, indexing, retention, and exact persistence format; runtime policy enforcement primitives; semantic service dependency adapters; key/KMS resource families; multi-process placement policy owned by deployment/control-plane architecture; Agent/OpenShell governance; desktop projection native interiors; and lane-specific native implementation details inside plugin packages after the RAWR projection boundary is specified.

Do not reserve foundation behavior as an internal detail. Dependency-ordered acquisition, provider coverage validation, config validation, config redaction boundary, app-profile-mediated provider config, no raw environment reads in plugins or service handlers, rollback on startup failure, finalizer registration, reverse-order shutdown, diagnostics, topology/builder agreement, `useService(...)`, service binding, projection outputs, adapter lowering, `FunctionBundle`, `RuntimeCatalog` record shape, and harness handoff remain locked specification material.

## Ambiguity Guardrails

Use guardrails only to protect the affirmative architecture above:

- Superseded target names such as `@rawr/hq-sdk`, `packages/runtime/*`, root `core/`, root `runtime/`, `startAppRole(...)`, `startAppRoles(...)`, `RuntimeView`, `ProcessView`, and `RoleView` are not target names.
- Generic projection-status fields such as `exposure`, `visibility`, `public`, `internal`, `kind: "public"`, `kind: "internal"`, and `adapter.kind` are not the way plugin authoring declares projection status.
- Profile `resources` is not the provider-selection field; use `providers` or `providerSelections`.
- Service authoring uses `serviceDep(...)` for service-to-service dependencies; plugin authoring uses `useService(...)` for projected service clients.
- Service binding cache keys exclude invocation; invocation is per-call input, not construction-time binding identity.
- Async workflow, schedule, and consumer plugins do not expose product APIs directly. Server API or server internal projections provide caller-facing workflow trigger, status, cancel, or dispatcher surfaces.
- Ordinary async plugin authoring returns RAWR workflow, schedule, or consumer definitions; it does not manually acquire native async clients, construct native function bundles, or bypass adapter lowering.
- Examples that simplify authoring must still show the derived plan, runtime artifact, adapter or provisioning artifact, and consuming integration point.
- Data contracts use `RuntimeSchema`, schemas, schema-backed contracts, or concrete typed contract objects according to the owning layer. Plain string labels are not schemas.

## Completion Check

Before returning the final document, verify:

- The document contains no references to alternate specifications, reports, prompts, revisions, or synthesis process.
- The document contains the canonical topology and API locks from the Synthesis Lock.
- The document does not copy target-unsafe import paths, helper names, package names, or repository topology from the Implementation Grounding Excerpt.
- The document uses layer-correct terminology.
- The document shows that load-bearing concepts from the alternate specifications were carried forward into nouns approved by the Synthesis Lock or deliberately excluded for Synthesis Lock conflicts.
- The document separates live runtime access from diagnostic catalog/read-model concepts.
- The document does not blur resources, providers, and profiles.
- The document does not make Effect, oRPC, Elysia, Inngest, OCLIF, OpenShell, web, desktop, or agent frameworks peer semantic owners.
- The document is written from affirmative ownership laws into mechanisms, examples, and assembly flows, not from guardrails alone.
- The document derives public/internal projection status from topology plus builder agreement and does not introduce an `exposure`, `visibility`, `public`, `internal`, `kind`, or adapter-kind field for plugin status.
- The document states forbidden patterns as normative architecture rules, not as historical cleanup notes.
- The document covers the required categories, may add structure needed for completeness, and does not collapse layer-specific contracts.
- Each runtime realization component has owner, placement, interfaces, inputs, outputs, lifecycle phase, integration points, diagnostics, and enforcement rules.
- Every illustrated code block has visible file and layer labels.
- Simplified examples are paired with at least two realistic examples where examples cover public authoring surfaces, compilation boundaries, provisioning boundaries, harness boundaries, or diagnostics boundaries.
- Authoring examples are backed by SDK derivation, runtime plan, binding plan, provisioning artifact, adapter-lowered artifact, or harness handoff illustrations.
- The document includes load-bearing versus flexible framing for foundational contracts and reserved extension areas.
- Later assembly sections use previously defined components instead of introducing unowned behavior or unnamed adapters.
- Reserved detail boundaries are named explicitly and define external contracts without over-specifying internals.
- TypeScript and code blocks make clear what is normative versus type-shape illustration.
