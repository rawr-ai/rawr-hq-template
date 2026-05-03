# Runtime Realization Baseline Repair Map

Status: Baseline repair map
Scope: Baseline Specification finalization instructions

## Authority

Baseline Specification is the baseline specification.

Transplant material is used only through the curated Normalized Transplants document and only after normalization through the Finalization Authority and Runtime Realization Architecture Authority.

This document is a baseline edit map. It does not replace Baseline Specification, the Finalization Authority, or the final canonical specification.

## Baseline Rule

Keep the baseline's structure, topology, component-first posture, lifecycle chain, and canonical nouns unless a row below explicitly instructs replacement or augmentation.

Use four edit classes:

- Keep: preserve Baseline Specification material.
- Repair in place: keep Baseline Specification material and tighten wording, naming, or interface shape.
- Augment: keep Baseline Specification material and add normalized transplant material.
- Replace: remove a local Baseline Specification shape and substitute a normalized locked shape.

## Required Baseline Specification Repairs

| Baseline Specification area | Edit class | Required action | Normalized transplant material | Normalization |
| --- | --- | --- | --- | --- |
| Purpose and scope | Augment | Add bridge framing: runtime realization makes execution explicit without creating a second public semantic architecture. | Purpose/ownership frame | Keep Baseline Specification scope; do not broaden runtime ownership. |
| Ownership laws | Augment | Add shared-infrastructure ownership law beside the table. | Ownership-law prose | Shared infra does not transfer schema ownership, write authority, service truth, plugin identity, or app membership. |
| Service authoring contract | Augment | Add transport-neutral and placement-neutral service law. | Service neutrality | Keep service truth independent of API/workflow/CLI/web/agent/desktop placement. |
| Dependency helper rules | Augment | State that `resourceDep(...)` does not construct providers, `serviceDep(...)` does not import sibling internals, and `semanticDep(...)` names explicit semantic adapter dependency. | Service dependency helpers | Preserve the baseline's `deps`, `scope`, `config`, `invocation`, and `provided` lanes. |
| `PluginFactory` | Augment | State grouped helpers may exist ergonomically but grouped plugins are not a runtime architecture kind. | PluginFactory exactness | Preserve exactly one `PluginDefinition` per factory. |
| Projection classification | Augment | Add that route, command, function, shell, and native mount facts are builder-specific surface facts and do not classify public/internal status. | Projection classification language | Preserve topology plus builder classification and field blacklist. |
| `RuntimeResource` | Replace local naming | Replace `diagnosticView` with `diagnosticContributor`, `RuntimeDiagnosticContributor`, or `toDiagnosticSnapshot`. | Diagnostic contributor naming | No live `View` vocabulary near runtime access or diagnostics. |
| Resource/provider/profile intro | Augment | Add system-level preamble separating resources, providers, and profiles. | Resource/provider/profile separation | Profiles select providers through `providers` or `providerSelections`; profile `resources` is not provider selection. |
| `RuntimeProvider` | Augment | Add build/acquisition contract showing config, dependency resources, provisioning scope, and runtime telemetry. | RuntimeProvider build/acquisition | Provider remains cold until provisioning; telemetry is runtime acquisition telemetry. |
| External provider example | Augment | Add provider acquire/release example using `scope.acquireRelease(...)`. | Provider acquire/release realism | Imports illustrative except locked SDK surfaces; secrets provider-local and redacted. |
| Provider selector example | Repair in place | Prefer object-shaped provider selection with resource, provider, and config binding. | Provider selector shape | Apps import typed selectors, not provider internals. |
| RuntimeProfile example | Augment | Add config-source and provider config binding realism. | RuntimeProfile config binding | Config precedence stays reserved; profiles do not acquire resources. |
| Compiler/provider coverage | Augment | Make provider dependency graph a visible compiled artifact and bootgraph input. | Provider dependency graph | Preserve app-owned `ProviderSelection`. |
| Bootgraph module contract | Augment | Add boot resource module inputs: provider selection, validated config, dependencies, scope, telemetry, diagnostics hooks. | Bootgraph and BootResourceModule | Bootgraph stays above Effect; Effect remains provisioning substrate. |
| `ProvisionedProcess` and `ManagedRuntimeHandle` | Augment | Add deterministic finalization/stop order. | Shutdown order | Shutdown is runtime finalization/observation behavior, not lifecycle phase 8. |
| `RuntimeAccess` | Repair in place | Clarify producer/consumer split: provisioning produces access handles; process runtime consumes and scopes them. | Runtime access family | Hooks are sanctioned and redacted only; no live diagnostic retrieval. |
| `ProcessRuntimeAccess` / `RoleRuntimeAccess` | Augment | Add identity metadata and optional role surface identity where useful. | Runtime access family | Surface identity is observation/context, not reclassification authority. |
| `ServiceBindingCache` | Augment | Add `getOrCreate` behavior and construction-time cache identity. | ServiceBindingCache | Preserve `ServiceBindingPlan.invocationSchema`; invocation excluded from key. |
| `SurfaceAdapter` | Augment | Add observability and lowered payload result clarity. | SurfaceAdapter | Adapter identity does not classify public/internal status. |
| `FunctionBundle` | Repair in place | Replace any live dispatcher field with dispatcher descriptor or equivalent harness-facing metadata. | FunctionBundle | Live dispatcher materializes separately; `FunctionBundle` remains harness-facing. |
| `WorkflowDispatcher` | Augment | Add standalone component contract and illustrative `send`/`status`/`cancel` method shape. | WorkflowDispatcher | Normative role is producer/consumer boundary; methods illustrative unless locked. |
| Trusted internal workflow example | Augment | Strengthen with dispatcher wrapper shape and concrete schema-backed error data. | Server internal dispatcher wrapping | Keep workflow plugin identity separate from internal API identity. |
| CLI/web/agent/desktop projection lanes | Augment | Add concrete File/Layer/Exactness-labeled examples. | Surface lane examples | Non-`@rawr/sdk` imports illustrative; native interiors stay behind RAWR boundaries. |
| `RuntimeTelemetry` | Augment | Add interface shape with `span`, `event`, `annotate`. | RuntimeTelemetry | Define or reserve payload/annotation types; service semantic observability remains service-owned. |
| `RuntimeCatalog` | Augment | Add selected, derived, provisioned, bound, projected, mounted, observed, and stopped topology phrasing. | RuntimeCatalog and diagnostics | Preserve redacted diagnostics and read-model boundary. |
| Cross-cutting runtime components | Augment | Add diagnostics/enforcement or gate coverage per load-bearing component. | Component/gate material | Keep package topology from Baseline Specification. |
| End-to-end assembly flows | Augment | Add full seven-phase realization checklist and examples-as-gates matrix. | Full realization sequence and gates | Do not add shutdown as top-level phase. |
| Load-bearing/flexible matrix | Augment | State locked foundation behavior is not reserved. | Reserved/flexible wording | Flexible areas still expose owners, hooks, inputs, outputs, diagnostics, enforcement. |
| Reserved detail boundaries | Augment | Add explicit owner, integration hook, and condition that triggers a dedicated specification pass. | Reserved boundary wording | Reserved details are named extension points, not omissions. |
| Component contract summary | Augment | Add diagnostics and enforcement/migration gate columns or companion matrix. | Component/gate material | Keep Baseline Specification component list as baseline. |

## Keep Without Replacement

Keep these Baseline Specification areas as baseline unless edited by the repair table:

- canonical topology under `packages/core/sdk`, `packages/core/runtime/*`, `resources/*`, `apps/<app>/runtime/*`, `services/*`, and `plugins/*`;
- `@rawr/sdk`, `defineApp(...)`, `startApp(...)`, `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`;
- `RuntimeSchema` including explicit runtime decode/validation, static type projection, redaction metadata, and diagnostic-safe description;
- `ServiceBindingPlan` including `invocationSchema`;
- `NormalizedAuthoringGraph` and `PortableRuntimePlanArtifact`;
- seven-phase realization lifecycle: `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`;
- the baseline's component-first organization and final canonical picture.

## Replace Or Remove

Remove or replace these Baseline Specification shapes:

- `diagnosticView` field names become `diagnosticContributor` or `toDiagnosticSnapshot`.
- Any wording that suggests diagnostics can retrieve live values becomes redacted diagnostic contributor wording.
- Any `FunctionBundle` shape that carries a live `WorkflowDispatcher` becomes descriptor or harness-facing metadata.
- Any shutdown listing that reads as a lifecycle phase becomes finalization/observation behavior.
- Any example import path that looks canonical beyond `@rawr/sdk` gets an exactness label marking it illustrative unless an authority document states otherwise.

## Transplant Material To Use Only Through Normalized Transplants

Use these named transplant materials:

- `WorkflowDispatcher` standalone component and illustrative method shape.
- `RuntimeTelemetry` interface shape.
- Seven-phase full realization sequence rewritten with Baseline Specification names.
- Deterministic shutdown/finalization order.
- Provider acquire/release example and provider selector/config binding shape.
- CLI, web, agent/OpenShell, and desktop projection examples.
- Ownership-law prose and native interior boundary phrasing.
- Reserved-boundary and examples-as-gates framing.

Do not use transplant material for baseline section order, title, package taxonomy, import posture, `RuntimeSchema`, `ServiceBindingPlan`, or lifecycle authority.
