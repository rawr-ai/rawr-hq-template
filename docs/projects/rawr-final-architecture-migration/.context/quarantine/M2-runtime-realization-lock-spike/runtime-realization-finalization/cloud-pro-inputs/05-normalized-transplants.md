# Runtime Realization Normalized Transplants

Status: Curated transplant material
Scope: transplant material to carry into the baseline finalization pass

## Authority

Baseline Specification is the baseline Runtime Realization System specification.

Material included in this document is transplant material only. It does not provide package topology, import authority, lifecycle authority, final public API names, section order, or baseline document structure.

Each transplant below must be normalized through the Finalization Authority and the Runtime Realization Architecture Authority before entering the final specification.

## Transplant Rules

- Preserve the baseline topology, nouns, ownership laws, lifecycle order, and component organization.
- Carry transplant material only where it strengthens Baseline Specification without changing those baseline commitments.
- Treat non-`@rawr/sdk` imports in transplant snippets as illustrative unless an authority document states that they are canonical.
- Keep shutdown and rollback as deterministic runtime finalization and observation behavior, not as an eighth top-level lifecycle phase.
- Replace `diagnosticView` and other live-view vocabulary with diagnostic read-model or diagnostic contributor vocabulary.
- Reject `packages/core/runtime/process`, `packages/core/runtime/access`, and `packages/core/runtime/adapters` package-root posture from transplant snippets unless a separate package-taxonomy decision explicitly locks it.

## Transplants

The non-transplantable drift list at the end of this document applies to every transplant unless a section states a stricter normalization rule.

### Purpose And Ownership Frame

Transplant material contributes useful framing that runtime realization makes execution explicit without creating a second public semantic architecture.

Affected design element: purpose, scope, ownership laws.

Purpose: reinforce that runtime realization owns the bridge from selected declarations to a running process, while services, plugins, apps, resources, providers, SDK, runtime, harnesses, and diagnostics retain separate authority.

Transplant material language to carry forward in normalized form:

```text
Runtime realization makes execution explicit without creating a second public semantic architecture.
Runtime realization owns only this bridge.
```

Normalization:

- Use the baseline's title, scope, and system nouns.
- Attach the language to the baseline's purpose/scope and ownership-law sections.
- Do not broaden runtime realization into service domain truth, app product identity, plugin semantic meaning, deployment placement, public API meaning, or native framework ownership.

Baseline Specification target: purpose/scope and ownership-law opening sections.

### Ownership-Law Prose

Transplant material states the shared-infrastructure boundary crisply.

Affected design element: ownership laws and enforcement rules.

Purpose: block drift where shared infrastructure becomes shared semantic ownership.

Transplant material language to carry forward in normalized form:

```text
Shared infrastructure does not transfer schema ownership, write authority, service truth, plugin identity, or app membership.
```

Normalization:

- Place this beside the baseline's ownership table; do not replace the baseline's ownership table.
- Preserve the canonical ownership phrase: services own truth, plugins project, apps select, resources declare capability contracts, providers implement, the SDK derives, the runtime realizes, harnesses mount, diagnostics observe.

Baseline Specification target: ownership laws and service-boundary enforcement.

### Service Neutrality And Dependency Helpers

Transplant material reinforces that services are transport-neutral and placement-neutral.

Affected design element: service authoring contract.

Purpose: prevent API, workflow, process, CLI, web, agent, or desktop placement from changing service species.

Transplant material language to carry forward in normalized form:

```text
Services are transport-neutral and placement-neutral.
```

Transplant material dependency-helper substance to carry forward:

```text
resourceDep(...) does not construct providers.
serviceDep(...) does not import sibling service internals.
semanticDep(...) names an explicit semantic adapter dependency.
```

Normalization:

- Use the baseline's service example family.
- Preserve `resourceDep(...)`, `serviceDep(...)`, `semanticDep(...)`, `deps`, `scope`, `config`, `invocation`, and `provided`.
- Keep `ServiceBindingPlan.invocationSchema`.

Baseline Specification target: service authoring contract, service-to-service dependency example, and service-boundary enforcement.

### Projection Classification Language

Transplant material has useful drift-blocking language around surface facts.

Affected design element: plugin topology and builder agreement.

Purpose: prevent `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind` fields from becoming classification authority.

Transplant material language to carry forward in normalized form:

```text
Route, command, function, shell, and native mount facts are builder-specific surface facts. They do not encode public/internal projection status.
```

Normalization:

- Preserve topology plus builder classification.
- Keep lane-specific builders and lane-specific native facts separate.
- Keep app selection and harness publication policy as selection/publication concerns, not projection reclassification.

Baseline Specification target: plugin topology/builder agreement and projection classification enforcement.

### PluginFactory Exactness

Transplant material provides useful language for grouped helper ergonomics.

Affected design element: `PluginFactory`.

Purpose: prevent helper arrays or grouped convenience functions from becoming a runtime architecture kind.

Transplant material substance to carry forward:

```text
Grouped plugin helpers may exist for ergonomics. Grouped plugins are not a runtime architecture kind.
```

Normalization:

- Keep the baseline's `PluginFactory` shape.
- Preserve exactly one `PluginDefinition` per factory.
- Preserve one plugin package equals one role lane, one surface lane, and one capability projection.

Baseline Specification target: `PluginDefinition` and `PluginFactory`.

### Resource, Provider, And Profile Separation

Transplant material opens its resource section with useful layer separation.

Affected design element: `RuntimeResource`, `RuntimeProvider`, `RuntimeProfile`, `ProviderSelection`.

Purpose: make the resource/provider/profile model read as one system before individual type definitions.

Transplant material language to carry forward in normalized form:

```text
Resources, providers, and profiles are separate layers.
Profiles select providers through providers or providerSelections.
Profile resources is reserved for required capabilities, not provider selection.
```

Normalization:

- Use `providers` or `providerSelections` as the profile selection fields.
- Preserve the rule that resources do not acquire themselves, providers do not select themselves, runtime profiles do not acquire anything, and plugins do not acquire providers.

Baseline Specification target: resource/provider/profile model introduction and runtime profile examples.

### RuntimeResource Diagnostic Naming

Transplant material confirms that `RuntimeDiagnosticContributor` is useful, but also contains rejected `diagnosticView` vocabulary.

Affected design element: `RuntimeResource`, `BootResourceModule`, diagnostics.

Purpose: repair the baseline's remaining view-like diagnostic naming.

Carry forward:

```text
RuntimeDiagnosticContributor
diagnosticContributor
toDiagnosticSnapshot
```

Reject:

```text
diagnosticView
RuntimeResourceDiagnosticView
RuntimeView
ProcessView
RoleView
```

Normalization:

- Diagnostic contributor hooks produce redacted diagnostic read-model snapshots.
- Diagnostic contributor hooks do not expose live values, raw provider internals, raw Effect handles, or unredacted secrets.

Baseline Specification target: `RuntimeResource`, boot resource modules, runtime access, diagnostics.

### RuntimeProvider Build And Acquire/Release

Transplant material supplies a concrete provider acquisition shape.

Affected design element: `RuntimeProvider`, provider acquisition, provider finalizers, runtime telemetry.

Purpose: make provider implementation realistic enough for implementation planning.

Transplant material type-shape substance to carry forward:

```ts
build(input: {
  config: TConfig;
  resources: RuntimeResourceMap;
  scope: ProvisioningScope;
  telemetry: RuntimeTelemetry;
})
```

Transplant material example substance to carry forward:

```ts
return scope.acquireRelease({
  acquire: async () => {
    const client = createNativeClient(/* validated redacted config */);
    return createRuntimeResourceValue(client);
  },
  release: async () => {
    telemetry.event("provider.release");
  },
});
```

Normalization:

- Provider descriptors remain cold until provisioning.
- Secret access is provider-acquisition-local and redacted before diagnostics/catalog emission.
- `RuntimeTelemetry` is runtime acquisition telemetry, not service semantic observability.
- Native client construction syntax is illustrative unless locked by a provider specification.

Baseline Specification target: `RuntimeProvider`, external provider example, telemetry, provisioning.

### Provider Selector And RuntimeProfile Config Binding

Transplant material gives a clearer profile/provider binding shape than a positional selector call.

Affected design element: provider selectors and runtime profiles.

Purpose: avoid accidental reading that providers select themselves.

Transplant material substance to carry forward:

```ts
providerSelection({
  resource: EmailSenderResource,
  provider: ResendEmailProvider,
  config: /* profile-owned config binding */,
})
```

Normalization:

- Resource catalog selectors may import provider descriptors inside provider-selection helper modules.
- Apps import typed selectors and runtime profile helpers, not provider internals.
- Runtime profiles bind provider config through typed config sources and schema-backed provider config.
- Config precedence remains a reserved detail boundary unless separately specified.

Baseline Specification target: runtime profile examples, provider selectors, config/secrets section.

### Provider Dependency Graph

Transplant material makes provider dependency closure visible.

Affected design element: provider coverage, provider dependency graph, bootgraph.

Purpose: ensure required providers and provider dependencies become compiler/provisioning artifacts instead of prose.

Transplant material substance to carry forward:

```text
Provider dependency closure is validated before provisioning.
Provider dependency graph output becomes bootgraph ordering input.
Provider coverage diagnostics name missing providers, ambiguous providers, dependency cycles, and invalid lifetimes.
```

Normalization:

- Express under the baseline's `packages/core/runtime/compiler`, `packages/core/runtime/bootgraph`, `packages/core/runtime/substrate/effect`, and `packages/core/runtime/process-runtime` topology.
- Preserve app-owned `ProviderSelection`.

Baseline Specification target: compiler, bootgraph, provider dependency graph, cross-cutting runtime components.

### Bootgraph And BootResourceModule

Transplant material provides a more operational boot resource module contract.

Affected design element: `Bootgraph`, boot resource keys, boot resource modules, provisioning kernel.

Purpose: specify acquisition inputs, dependency closure, finalizers, diagnostics, and telemetry.

Transplant material substance to carry forward:

```text
Bootgraph owns stable lifecycle identity, deterministic ordering, dedupe, rollback, reverse shutdown, and typed context assembly.
Boot resource modules receive provider selection, validated config, dependency resources, scope, telemetry, and diagnostics hooks.
```

Normalization:

- Keep Bootgraph above Effect layer composition.
- Keep Effect as provisioning substrate, not RAWR ownership model.
- Preserve Baseline Specification naming for boot resource keys/modules unless the final spec chooses a more exact shape.

Baseline Specification target: bootgraph, boot resource key/module, Effect provisioning kernel.

### ProvisionedProcess, ManagedRuntimeHandle, And Shutdown Order

Transplant material provides useful stop/finalization detail.

Affected design element: `ProvisionedProcess`, `ManagedRuntimeHandle`, process runtime shutdown, harness stop.

Purpose: make deterministic teardown concrete.

Transplant material shutdown order to carry forward in normalized form:

```text
normal shutdown:
  1. stop mounted harnesses in reverse mount order
  2. stop process runtime surface assemblies
  3. run role-scope finalizers in reverse dependency order
  4. run process-scope finalizers in reverse dependency order
  5. dispose root ManagedRuntimeHandle
  6. emit shutdown records into RuntimeCatalog
```

Normalization:

- Call this runtime finalization or shutdown behavior.
- Do not make shutdown an eighth lifecycle phase.
- Catalog emission records shutdown outcomes without diagnostic components reacquiring live values.

Baseline Specification target: `ProvisionedProcess`, `ManagedRuntimeHandle`, process runtime, harness contracts, `RuntimeCatalog`.

### RuntimeAccess Family

Transplant material reinforces live runtime access boundaries.

Affected design element: `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`.

Purpose: block live access, diagnostics, and catalog read-model collapse.

Transplant material language to carry forward in normalized form:

```text
Runtime access is live operational access.
RuntimeCatalog is diagnostic read-model access.
Service handlers do not receive broad RuntimeAccess.
```

Transplant material shape to consider:

```ts
export interface ProcessRuntimeAccess {
  readonly appId: string;
  readonly entrypointId: string;
  readonly processId: string;
  readonly profileId: string;
  readonly roles: readonly AppRole[];
  resource<TResource extends RuntimeResource>(resource: TResource, input?: { readonly instance?: string }): RuntimeResourceValue<TResource>;
  optionalResource<TResource extends RuntimeResource>(resource: TResource, input?: { readonly instance?: string }): RuntimeResourceValue<TResource> | undefined;
  telemetry(): RuntimeTelemetry;
}
```

Normalization:

- Preserve the baseline's `process-runtime` placement.
- Runtime access may expose sanctioned redacted topology/diagnostic emission hooks; those hooks cannot mutate app composition, acquire resources, retrieve live values for diagnostics, or expose raw Effect/provider/config internals.
- Role access may include selected surface identity if useful, but surface identity does not grant projection reclassification authority.

Baseline Specification target: runtime access, process runtime, diagnostics.

### ServiceBindingCache And ServiceBindingCacheKey

Transplant material gives a concrete cache API.

Affected design element: `ServiceBindingCache`, `ServiceBindingCacheKey`, `bindService(...)`.

Purpose: make binding reuse behavior explicit.

Transplant material substance to carry forward:

```ts
export interface ServiceBindingCache {
  getOrCreate(input: {
    key: ServiceBindingCacheKey;
    plan: CompiledServiceBindingPlan;
    create: () => BoundServiceClient;
  }): BoundServiceClient;
}
```

Normalization:

- Preserve the baseline's `ServiceBindingPlan.invocationSchema`.
- Preserve that service binding is construction-time over `deps`, `scope`, and `config`.
- Invocation is supplied per call and never participates in `ServiceBindingCacheKey`.
- Call-local memoization remains separate.

Baseline Specification target: service binding plan, service binding cache, process runtime binding.

### SurfaceAdapter And Async Lowering

Transplant material clarifies adapter observability and async lowering.

Affected design element: `SurfaceAdapter`, `FunctionBundle`, async harness handoff.

Purpose: show the boundary between compiled surface plans, adapter-lowered payloads, and native harness mounting.

Transplant material substance to carry forward:

```text
WorkflowDefinition / ScheduleDefinition / ConsumerDefinition
  -> SDK normalized async surface plan
  -> runtime compiled async surface plan
  -> async SurfaceAdapter
  -> FunctionBundle
  -> Inngest harness
```

Normalization:

- Surface adapters lower compiled surface plan artifacts, not raw authoring declarations or SDK graphs.
- `FunctionBundle` is harness-facing and not public authoring.
- `FunctionBundle` may carry a dispatcher descriptor or equivalent metadata; the live `WorkflowDispatcher` materializes separately from selected workflow definitions plus the provisioned process async client.
- Adapter `kind` or `id` does not classify public/internal status.

Baseline Specification target: async examples, `SurfaceAdapter`, `FunctionBundle`, Inngest harness.

### WorkflowDispatcher

Transplant material provides a useful standalone dispatcher contract.

Affected design element: `WorkflowDispatcher`.

Purpose: give the final spec a component-level dispatcher section instead of only example references.

Transplant material shape to carry forward as illustrative method shape:

```ts
export interface WorkflowDispatcher {
  send<TPayload>(
    workflow: WorkflowDefinition<TPayload>,
    payload: TPayload,
    options?: WorkflowDispatchOptions,
  ): Promise<WorkflowDispatchResult>;

  status(input: {
    workflowId: string;
    runId: string;
  }): Promise<WorkflowStatusResult>;

  cancel(input: {
    workflowId: string;
    runId: string;
    reason?: string;
  }): Promise<WorkflowCancelResult>;
}
```

Normalization:

- The normative role is producer/consumer and derivation boundary; method names are illustrative unless the SDK defines them.
- SDK/runtime derivation produces dispatcher descriptors and async surface plans.
- The live dispatcher is materialized from selected workflow definitions plus the provisioned process async client.
- Server API/internal projections may wrap dispatcher capabilities for trigger, status, cancel, or dispatcher-facing caller surfaces.
- Workflow plugins do not expose caller-facing product APIs.
- Schedules and consumers do not become caller-facing dispatcher APIs.

Baseline Specification target: `FunctionBundle`, workflow/internal API examples, async caller boundary.

### Server Internal Dispatcher Wrapping Example

Transplant material provides concrete internal API wrapping details.

Affected design element: server internal projection wrapping `WorkflowDispatcher`.

Purpose: strengthen the baseline's internal workflow trigger/status example.

Transplant material code pattern to carry forward in normalized form:

```ts
export function createWorkflowInternalRouter(input: {
  workflows: WorkflowDispatcher;
  request: ServerRequestContext;
}) {
  return createORPCRouter(workflowInternalContract, {
    trigger: async ({ input: payload, errors }) => {
      const dispatch = await input.workflows.send(SelectedWorkflow, payload);
      if (!dispatch.ok) {
        throw errors.WORKFLOW_DISPATCH_FAILED({
          message: "Unable to dispatch workflow.",
          data: {
            workflowId: SelectedWorkflow.id,
            reason: dispatch.reason,
          },
        });
      }
      return { dispatchId: dispatch.dispatchId, workflowId: SelectedWorkflow.id };
    },
  });
}
```

Normalization:

- Use the baseline's example family.
- Keep oRPC input/output/error schemas concrete and schema-backed.
- Keep workflow plugin identity and internal API identity separate.

Baseline Specification target: trusted server internal plugin, workflow dispatcher example, end-to-end workflow trigger flow.

### CLI, Web, Agent, And Desktop Examples

Transplant material fills the baseline's thinnest projection-lane area.

Affected design element: non-server projection lanes.

Purpose: provide concrete examples with `File:`, `Layer:`, and `Exactness:` labels.

Transplant material example patterns to carry forward:

```ts
defineCliCommandPlugin({
  capability: "work-items",
  services: { workItems: useService(WorkItemsService) },
  commands: [CreateWorkItemCommand, ListWorkItemsCommand],
});
```

```ts
defineWebAppPlugin({
  capability: "work-items-board",
  routes: [{ id: "work-items-board.index", path: "/work-items", module: () => import("./routes/work-items-board") }],
});
```

```ts
defineAgentToolPlugin({
  capability: "work-items",
  services: { workItems: useService(WorkItemsService) },
  tools({ clients, shell }) {
    return createWorkItemTools({ workItems: clients.workItems, shell });
  },
});
```

```ts
defineDesktopMenubarPlugin({
  capability: "disk-status",
  resources: [{ resource: FilesystemResource, lifetime: "role", reason: "Menubar status reads local filesystem capacity." }],
  menubar({ resources }) {
    return { id: "disk-status.menubar", readStatus: async () => resources.resource(FilesystemResource).diskUsageSummary() };
  },
});
```

Normalization:

- Rename examples away from Todo if the final spec uses WorkItems.
- Treat non-`@rawr/sdk` imports as illustrative.
- Preserve native interiors behind RAWR boundaries.
- Do not imply web plugins own server API publication.
- Do not give agent plugins broad runtime access.
- Preserve desktop background as process-local and durable business workflows as async.

Baseline Specification target: `10.8` projection boundaries and harness sections.

### RuntimeTelemetry

Transplant material adds concrete runtime telemetry shape.

Affected design element: runtime telemetry.

Purpose: make telemetry implementation-facing without making it service observability.

Transplant material interface to carry forward with normalized dependent types:

```ts
export interface RuntimeTelemetry {
  span<T>(input: RuntimeTelemetrySpanInput, run: () => Promise<T>): Promise<T>;
  event(name: string, payload?: RuntimeTelemetryPayload): void;
  annotate(input: RuntimeTelemetryAnnotation): void;
}
```

Normalization:

- `RuntimeTelemetryPayload` and `RuntimeTelemetryAnnotation` must be defined or reserved.
- `RuntimeTelemetrySpanInput.phase` uses the canonical realization phases only.
- Shutdown telemetry is observation/finalization telemetry, not a lifecycle phase.
- Service semantic enrichment remains service-owned.

Baseline Specification target: `RuntimeTelemetry`, cross-cutting telemetry, provider acquisition example.

### RuntimeCatalog And Diagnostics

Transplant material contributes useful catalog and failure-boundary language.

Affected design element: `RuntimeCatalog`, `RuntimeDiagnostic`, observation.

Purpose: strengthen the read-model/lifecycle boundary.

Transplant material phrase to carry forward in normalized form:

```text
RuntimeCatalog records selected, derived, provisioned, bound, projected, mounted, observed, and stopped topology.
```

Normalization:

- Preserve the baseline's redacted diagnostics.
- Add explicit topology and catalog boundary coverage.
- Catalog storage backend, indexing, retention, and persistence remain reserved detail boundaries.

Baseline Specification target: diagnostics/catalog, component summary, reserved boundaries.

### Reserved Boundaries And Flexible Areas

Transplant material gives useful boundary framing.

Affected design element: load-bearing/flexible matrix and reserved boundaries.

Purpose: make clear that reserved internals still have locked owners and hooks.

Transplant material substance to carry forward:

```text
Locked foundation behavior is not reserved.
Reserved boundaries are named extension points with owners, hooks, inputs, outputs, diagnostics, enforcement, and dedicated specification conditions.
```

Normalization:

- Add the baseline's missing explicit owner, integration hook, and condition that triggers a dedicated specification pass.
- Keep reserved detail from swallowing implementation obligations.

Baseline Specification target: load-bearing/flexible matrix and reserved detail boundaries.

### Full Realization Sequence And Example Gates

The full sequence in Normalized Transplants is an excellent audit checklist.

Affected design element: end-to-end assembly and migration-readiness gates.

Purpose: give the final spec a concrete path from definition through observation and a gate map for examples.

Transplant material phases 1-7 to carry forward:

```text
1. Definition
2. Selection
3. Derivation
4. Compilation
5. Provisioning
6. Mounting
7. Observation
```

Transplant material shutdown detail to carry forward only as finalization behavior:

```text
StartedHarness.stop?() runs in reverse mount order.
Mounted surface assemblies stop.
Role-scope finalizers run in reverse dependency order.
Process-scope finalizers run in reverse dependency order.
ManagedRuntimeHandle disposes.
RuntimeCatalog records shutdown outcome.
```

Normalization:

- Use `NormalizedAuthoringGraph`, `PortableRuntimePlanArtifact`, `CompiledProcessPlan`, `CompiledSurfacePlan`, `ServiceBindingCacheKey`, `FunctionBundle`, `RuntimeCatalog`.
- Do not carry `AuthoringGraph` or a phase named `Shutdown`.
- Convert examples into gates: derivation artifact snapshot, compiler validation, provider coverage, bootgraph ordering, service binding cache, adapter lowering, harness mount, catalog/diagnostic/telemetry record, shutdown/rollback finalization record.

Baseline Specification target: end-to-end assembly flows, component summary, final canonical picture.

## Non-Transplantable Drift

Do not carry forward:

- `packages/core/runtime/process`, `packages/core/runtime/access`, or `packages/core/runtime/adapters` as package-root topology.
- Bare `services/*`, `resources/*`, or `plugins/*` imports as canonical public package exports.
- `RuntimeSchema` interfaces that lack explicit `validate(...)`.
- `ServiceBindingPlan` shapes that omit `invocationSchema`.
- `AuthoringGraph` where `NormalizedAuthoringGraph` is required.
- `diagnosticView`, `RuntimeResourceDiagnosticView`, `RuntimeView`, `ProcessView`, or `RoleView`.
- `8. Shutdown` as a lifecycle phase.
- Any positive classification field model for public/internal projection status.
- Any interpretation where providers select themselves, resources acquire themselves, runtime profiles acquire resources, or plugins acquire providers.
- Any shape where schedules or consumers become caller-facing dispatcher APIs.
