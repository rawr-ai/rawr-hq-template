# Runtime Realization Finalization Authority

Status: Binding finalization authority
Scope: baseline repair and final cloud synthesis

## Authority

This Finalization Authority governs the final Runtime Realization System specification synthesis packet.

Use these finalization inputs in this authority order:

1. This Finalization Authority.
2. Runtime Realization Architecture Authority as architecture authority.
3. Baseline Runtime Realization Specification.
4. Baseline Repair Map.
5. Normalized Transplants document.

Baseline Specification is the baseline document. Transplant material is carried only through the Normalized Transplants document. Do not average the baseline with transplant material. Do not rebuild the document from transplant snippet structure. Do not infer additional transplant material beyond the Normalized Transplants document. Do not treat transplant snippet package layout, import paths, section order, or lifecycle wording as authority.

The final specification is standalone, canonical, normative, explanatory, and implementable. It contains no metacommentary about candidates, synthesis, input documents, review process, revisions, or provenance.

## Baseline Law

Preserve the baseline structure, topology, component-first organization, lifecycle chain, and canonical nouns unless this authority document, the Architecture Authority, or the Baseline Repair Map states a specific repair. Baseline Repair Map overrides local Baseline Specification wording where it identifies a repair; Baseline Specification remains the baseline everywhere else.

Baseline Specification keeps:

- `packages/core/sdk` publishing `@rawr/sdk`;
- `packages/core/runtime/*`;
- top-level `resources/*`;
- `apps/<app>/runtime/*`;
- `services/*`;
- `plugins/*`;
- `defineApp(...)` and `startApp(...)`;
- topology plus builder classification;
- seven-phase lifecycle: `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`;
- `RuntimeSchema`, `NormalizedAuthoringGraph`, `PortableRuntimePlanArtifact`, `ServiceBindingPlan`, `ServiceBindingCacheKey`, `FunctionBundle`, `WorkflowDispatcher`, `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `RuntimeCatalog`, `RuntimeDiagnostic`, and `RuntimeTelemetry`.

## Normalized Transplant Law

Carry transplant material only through the Normalized Transplants document.

Every transplant must state:

- design element or component affected;
- purpose of the transplant;
- concrete language, code shape, or example pattern being carried forward;
- normalization required;
- Baseline Specification insertion or repair target;
- rejected drift.

Transplant material may be transplanted only through the Normalized Transplants document. The allowed transplant categories include:

- purpose/scope bridge framing;
- shared-infrastructure and ownership-law prose;
- service neutrality and dependency helper guardrails;
- projection classification wording;
- `PluginFactory` exactness;
- resource/provider/profile separation;
- diagnostic contributor naming;
- `WorkflowDispatcher` role, producer/consumer boundary, and illustrative `send`/`status`/`cancel` method shape;
- `FunctionBundle` descriptor/runtime-payload boundary;
- `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess` live-access boundaries;
- `ServiceBindingCache` and `ServiceBindingCacheKey` behavior;
- `SurfaceAdapter` observability and lowered-payload boundary;
- `RuntimeTelemetry` interface shape;
- full seven-phase realization sequence as an audit checklist;
- deterministic shutdown/finalization order;
- provider acquire/release example and provider selector/config binding shape;
- provider dependency graph, provider dependency closure, and provider coverage diagnostics as compiler/provisioning artifacts;
- bootgraph and boot resource module acquisition contracts;
- CLI, web, agent/OpenShell, and desktop projection examples;
- server internal dispatcher wrapping example;
- async lowering chain into `FunctionBundle`;
- native interior boundary language;
- `RuntimeCatalog` and diagnostics read-model phrasing;
- reserved-boundary and examples-as-gates framing.

## Required Baseline Specification Repairs

Apply these repairs before the final specification is considered complete:

1. Replace `diagnosticView` and `RuntimeResourceDiagnosticView` with diagnostic contributor or diagnostic snapshot vocabulary.
2. Clarify that `WorkflowDispatcher` descriptors/plans are derived, while the live dispatcher materializes from selected workflow definitions plus the provisioned process async client.
3. Clarify that server API/internal projections may wrap dispatcher capabilities, and async workflow plugins do not expose product APIs.
4. Keep runtime access hooks sanctioned and redacted: they may emit topology or diagnostics, but they do not mutate composition, acquire resources, retrieve live values for diagnostics, or expose raw Effect/provider/config internals.
5. Mark non-`@rawr/sdk` import paths as illustrative unless the final spec explicitly locks a public package export convention.
6. Keep shutdown, rollback, finalizers, and stop order as runtime finalization and observation behavior, not as an eighth top-level lifecycle phase.
7. Add explicit owner, integration hook, and condition that triggers a dedicated specification pass to every reserved detail boundary.
8. Add diagnostics and enforcement/gate coverage to the component summary or a companion gate matrix.
9. Add examples-as-gates mapping: derivation artifact snapshot, compiler validation, provider coverage, bootgraph ordering, service binding cache, adapter lowering, harness mount, catalog/diagnostic/telemetry record, and shutdown/rollback finalization record.
10. Clarify runtime access producer/consumer split: provisioning produces access handles; process runtime consumes and scopes them for binding, projection, adapter handoff, and diagnostics.

## Affirmative Design Laws

Runtime realization is a transparent bridge from selected RAWR declarations to a started, typed, observable, stoppable process.

Services own truth. Plugins project. Apps select. Resources declare capability contracts. Providers implement capability contracts. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe.

Topology plus builder classifies projection identity.

RAWR owns boundaries and runtime handoffs. Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads.

Authoring surfaces express meaningful variability. SDK and runtime layers derive, compile, bind, provision, lower, mount, and observe mechanical wiring.

Every author-facing convenience has a visible backend path: authoring declaration, SDK-derived artifact, runtime-compiled artifact, binding/provisioning or adapter-lowered artifact, and consuming runtime or harness integration point.

Reserved boundaries are named extension points with locked owners, package locations, hooks, inputs, outputs, diagnostics, enforcement rules, and dedicated specification conditions.

Locked foundation behavior is not reserved.

## Required Transplant Normalizations

Normalize all transplant material as follows:

- `AuthoringGraph` becomes `NormalizedAuthoringGraph`.
- Generic portable plan wording becomes `PortableRuntimePlanArtifact`.
- `ServiceBindingPlan` keeps `invocationSchema`.
- `RuntimeSchema` keeps explicit decode and validation behavior.
- `FunctionBundle` carries harness-facing metadata and runtime payload schemas, not live dispatcher authority.
- `WorkflowDispatcher` is not a product API and does not own workflow semantics.
- Shutdown language becomes finalization/observation language.
- `RuntimeLifecyclePhase`, telemetry phase fields, and diagnostic phase fields use only the seven canonical realization phases. Shutdown and finalization may appear as record kind, status, subphase, telemetry event, diagnostic class, catalog record, or observation detail, but not as a member of the realization phase enum.
- Provider acquire/release examples keep secrets provider-local and redacted.
- CLI, web, agent, and desktop examples keep non-`@rawr/sdk` imports illustrative.
- Agent/OpenShell examples do not grant broad runtime access to agent plugins.
- Desktop examples keep durable business execution on async workflows.
- Adapter identity does not classify public/internal projection status.

## Forbidden Carryover

Do not carry forward:

- root-level `core/` or root-level `runtime/` authoring roots;
- `packages/runtime/*`;
- `@rawr/runtime`;
- `@rawr/hq-sdk`;
- `packages/core/runtime/process`, `packages/core/runtime/access`, or `packages/core/runtime/adapters` as locked package-root taxonomy;
- `startAppRole(...)`;
- `RuntimeView`, `ProcessView`, `RoleView`, `diagnosticView`, or `RuntimeResourceDiagnosticView`;
- `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind` as projection classification fields;
- profile `resources` as provider selection;
- schemas represented as plain string labels;
- service-side `useService(...)`;
- provider self-selection;
- resource self-acquisition;
- plugin provider acquisition;
- runtime profile acquisition;
- harnesses consuming raw authoring declarations, SDK graphs, or compiler plans directly;
- diagnostics composing app membership, acquiring live values, mutating runtime state, or exposing unredacted secrets;
- shutdown as a top-level lifecycle phase.

## Detail And Example Requirements

Every load-bearing component must identify owner, placement, input, output, producer, consumer, lifecycle phase, diagnostics, integration hook, and forbidden responsibilities.

Every code block must include visible `File:`, `Layer:`, and `Exactness:` labels.

Simplified examples must be paired with realistic examples that preserve layer boundaries.

The final specification must include concrete examples for:

- N > 1 service module shape, including root contract/router composition and the contract/module/router/repository responsibility split;
- public server API projection calling a service;
- trusted server internal projection wrapping `WorkflowDispatcher`;
- service depending on sibling service through `serviceDep(...)`;
- app profile and entrypoint selection without collapsing app membership, provider selection, and process shape;
- provider acquire/release;
- CLI command projection;
- web app projection;
- agent/OpenShell projection;
- desktop projection;
- async lowering into `FunctionBundle`;
- examples-as-gates acceptance mapping.

## Completion Gates

The final specification passes this authority document only when:

- Baseline Specification remains recognizably the baseline;
- every required baseline repair is applied;
- every normalized transplant is either incorporated in normalized form or explicitly rejected for authority conflict;
- no forbidden carryover appears as normative target text;
- final output contains no candidate/provenance/synthesis/process narrative;
- the document can drive M2 migration planning without another cloud synthesis run.
