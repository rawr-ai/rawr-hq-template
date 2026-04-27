# Integrated Canonical Architecture Final Modification Packet

Status: Complete
Selected baseline: Version B
Adoption verdict: adopt Version B after bounded edits

## Purpose

This packet is the standalone change specification for producing the final integrated canonical architecture document. It is not the edited final document and not a migration plan.

Baseline candidate:

```text
/Users/mateicanavra/Downloads/RAWR_Canonical_Architecture_Spec_Alt-X-2.md
```

Transplant source:

```text
/Users/mateicanavra/Downloads/RAWR_Canonical_Architecture_Spec_Alt-X-1.md
```

## Required Global Edits

1. Change the title from `RAWR Canonical Architecture and Runtime Specification` to `RAWR Integrated Canonical Architecture Specification` or `RAWR Canonical Architecture Specification`.
2. Preserve the status as canonical only after the repairs below are applied.
3. Keep runtime realization as an attached subsystem boundary, not the body of the integrated architecture.
4. Do not introduce source-document, cloud-task, review-process, or migration-plan narrative.
5. Keep current implementation reality out of normative architecture.

## Section-Level Keep / Repair Map

| Baseline section | Action | Required change |
| --- | --- | --- |
| 1 Scope | Augment | Add A:25 role statement: this is the plug-and-play architecture layer, subsystem specs attach at explicit integration boundaries, and the doc defines system vocabulary/laws/integration points. |
| 2 Architectural posture | Augment | Keep B's compact flow; add selected A:129-144 precision for output shapes if needed, especially governed steward work staying on async. |
| 3 Core ontology | Keep with minor repair | Keep B's compact ontology and three live access nouns. Do not add `SurfaceRuntimeAccess` as a top-level noun. |
| 4.4 Service boundary first | Replace sequence | Replace B:481-487 with the corrected ordering below. |
| 4.12 Future refinement seam | Rename and reframe | Replace with `Extension seam` or `Extension class rule`; remove temporal "future/later" framing. |
| 5 Canonical repo topology | Keep | Ensure the topology remains high-level and includes public SDK surfaces. Do not expand into full runtime package tree beyond architecture locks. |
| 6 Service model | Keep with wording check | Keep B's helper and service shell structure; if `Golden service shell` sounds example-gate-like, rename to `Canonical service shell`. |
| 7 Resource/provider/profile model | Repair | Replace B:1112-1116 with the resource/provider/profile split below. |
| 8 Plugin model | Augment | Add a lane index or lane subheads from A:1411-1526 while preserving B's topology-plus-builder rule. |
| 9 App model | Augment | Add a compact app selection/process shape/surface rule from A:1651-1695. Remove or demote TypeScript examples if final editor judges them runtime-spec detail. |
| 10 Runtime realization | Keep | Keep B's architecture-level summary. Do not import A's long runtime compiler, catalog, telemetry, caching, or finalization internals wholesale. |
| 11 Runtime roles and surfaces | Keep | Preserve full canonical role set: `server`, `async`, `web`, `cli`, `agent`, and `desktop`. |
| 12 Agent shell and steward activation | Keep; optional diagram | Preserve shell/steward split. Optional: transplant A's shell/steward flow if rendered cleanly and kept architecture-level. |
| 13 Stack binding | Keep | Keep native framework boundaries and role stack summaries. |
| 14 Operational mapping and growth model | Keep | Preserve service-centric platform mapping, desktop installed-user-local mapping, and app-boundary growth model. |
| 15 Schema, config, diagnostics, and policy boundaries | Keep | This is accepted as one of B's strongest architecture-level sections. |
| 16 Mechanical enforcement orientation | Keep | Keep `canon -> graph -> proof -> ratchet` as enforcement orientation, not process plan. |
| 17 Canonical invariants | Keep with repairs | Ensure resource/provider/profile separation is explicit and no undefined architecture kind appears. |
| 18 Forbidden patterns | Augment | Add A's stronger forbidden patterns for `RuntimeCatalog`, `FunctionBundle`, `WorkflowDispatcher`, and adapter identity if absent. |
| 19 What remains flexible | Repair | Replace B:2704 with service/app-boundary-safe wording. |
| 20 Final canonical picture | Repair and augment | Keep B's render-safe structure; fix resource/provider/profile edges using A; optionally add compact public SDK family summary. |

## Required Versus Optional Work

Required before adoption:

- R1 service-boundary ordering.
- R2 resource/provider/profile split.
- R3 extension seam reframe.
- R4 app selection/process shape/surface rule.
- R5 flexible-boundary wording repair.
- T1 plug-and-play architecture role transplant.
- T3 resource/provider/profile transplant.
- T5 app selection/surface transplant.
- T7 final diagram edge repair only.

R2 and required T7 are coupled: the resource/provider/profile prose formula and final diagram edges must use the same contract, implementation, and selection semantics.

Optional improvements:

- T2 universal shape table expansion, if the final document needs stronger lane scanning.
- T4 plugin lane index, if the final document needs more migration-derivable navigation.
- T6 cache/control-plane boundary statements, if kept short and architecture-level.
- T7 compact public SDK family summary, if it stays a terminal authoring index rather than an exhaustive API contract.
- A shell/steward diagram, if it renders cleanly and does not carry runtime implementation detail.

## Exact Replacement Requirements

### R1: Service Boundary Ordering

Replace B:481-487 with:

```text
service boundary first
projection second
composition third
runtime realization fourth
placement fifth
transport and native host details downstream
```

Acceptance criteria:

- Runtime realization appears between composition and placement.
- Placement remains operational, not semantic.
- Transport/native details remain downstream.

### R2: Resource / Provider / Profile Split

Replace B:1112-1116 with:

```text
runtime resource = typed capability contract + consumed value shape + lifetime rules + config schema
runtime provider = cold implementation plan for that resource contract
runtime profile  = app-owned provider, config-source, and process-shape selection
```

Then add one sentence:

```text
Resources do not implement or acquire themselves. Providers implement resource contracts. Profiles select providers and config sources for an app.
```

Acceptance criteria:

- Provider implementation is no longer part of `RuntimeResource`.
- Profile selection is app-owned.
- The wording matches the runtime spec's resource/provider/profile separation.
- The final diagram's resource/provider/profile edges match the same separation.

### R3: Extension Seam

Replace B:601 `### 4.12 Future refinement seam` with:

```text
### 4.12 Extension seam
```

Replace the temporal rule with:

```text
Additional second-level contribution classes are allowed only when a host or runtime composes them differently enough to create a real architectural boundary. A naming preference is not enough.
```

Acceptance criteria:

- No "future" or "later" phrasing remains in the canonical law.
- The rule remains an architecture law, not a roadmap note.

### R4: App Selection / Process Shape / Surface Rule

After B:1482, add a compact version of A:1651-1695:

```text
App membership, runtime profile, provider implementation, process shape, platform placement, role, and surface are distinct facts.

The app owns what belongs. Runtime profiles select provider and config behavior. Entrypoints select which role slices start in one process. Platform placement decides where that process runs. None of those choices changes service truth, plugin identity, role meaning, or surface meaning.

`surface` stays explicit because it is the stable name for how a role is exposed. Server API, server internal API, workflow, schedule, consumer, CLI command, web app, agent channel, agent shell, agent tool, desktop menubar, desktop window, and desktop background are not interchangeable runtime decorations.
```

Acceptance criteria:

- The app/process/profile/surface split is visible by heading or paragraph.
- It uses B's app composition vocabulary, not repeated `manifest` framing.

### R5: Flexible "Composed Service" Wording

Replace B:2704 with:

```text
- exact thresholds for splitting, promoting, or composing app and service boundaries, while preserving service ownership law;
```

Acceptance criteria:

- No undefined `composed service` architecture kind is introduced.
- Service ownership remains binding.

## Accepted Transplants

### T1: Plug-and-Play Architecture Role

Source: A:25
Destination: B Scope after B:23
Reusable material:

```text
This specification is the canonical plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach.
```

Normalize:

- Use `Integrated Architecture` naming if the title changes.
- Keep runtime realization distinct.

### T2: Universal Shape Precision

Source: A:129-144
Destination: B:120-137

Use A's richer role/surface coverage to augment B's table, especially:

- trusted server internal API;
- durable workflow, schedule, and consumer separation;
- governed steward work stays on async;
- CLI, web, agent/OpenShell, and desktop as peer output shapes.

Normalize:

- Keep B's "Capability truth / Projection / Composition and realization" columns.
- Avoid low-level runtime payload detail unless it is an integration boundary.

### T3: Resource/Provider/Profile Separation

Source: A:1271-1327
Destination: B:1085-1169

Use:

- resources own stable identity, consumed value shape, lifetime/config rules, and diagnostic-safe hooks;
- resource requirements identify capability needs;
- providers implement resource contracts;
- runtime profiles select providers/config/process defaults.

Reject:

- provider implementation inside `RuntimeResource`.

### T4: Plugin Lane Navigability

Source: A:1411-1526
Destination: B:1190-1333

Add a small lane index or subheads:

- public server API;
- trusted server internal;
- async workflow/schedule/consumer;
- CLI command;
- web app;
- agent channel/shell/tool;
- desktop menubar/window/background.

Acceptance criteria:

- Path plus builder remains the projection classifier.
- No `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind` classification fields are introduced.

### T5: App Selection And Surface Explicitness

Source: A:1651-1695
Destination: after B:1482

Use the R4 text above.

### T6: Cache And Control-Plane Boundaries

Source: A:2032-2050
Destination: B 15, B 19, or B final picture

Add architecture-level statements only:

- `ServiceBindingCache`, runtime-local cache primitives, cache resources, semantic service read-model caches, and call-local memoization have different owners.
- Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, and finalization records at control-plane boundaries.
- Deployment/control-plane architecture owns multi-process placement policy; runtime does not decide placement.

Reject:

- detailed runtime cache APIs;
- full catalog field inventory;
- control-plane product design.

### T7: Final Canonical Picture Repairs

Source: A:2889-3060
Destination: B:2716-2838

Required diagram repairs:

- Apply these with R2; do not update the prose formula without updating the final diagram edges to match.
- Replace B's resource/service edge with resource dependency semantics:
  `R -->|"resourceDep declarations"| S`
- Replace B's provider/profile edge with provider selector semantics:
  `V -->|"provider selectors"| RP`
- Keep B's escaped `\n` label style.
- Do not add `SurfaceRuntimeAccess` as a node.

Optional final summary:

Add a compact public SDK family summary if the final editor wants a terminal authoring index:

```text
app: defineApp(...), startApp(...)
service: defineService(...), resourceDep(...), serviceDep(...), semanticDep(...)
plugins: role/surface builders plus useService(...)
runtime resources: defineRuntimeResource(...), defineRuntimeProvider(...), defineRuntimeProfile(...), providerSelection(...), RuntimeSchema
```

Acceptance criteria:

- The final picture remains architecture-level.
- It does not become an exhaustive runtime API contract.

## Material To Reject

Do not carry forward:

- Version A `SurfaceRuntimeAccess` as an architecture-level live access noun.
- Version A long runtime compiler/diagnostic/catalog/cache/telemetry detail where it duplicates the runtime realization spec.
- Version A repeated `publication artifacts` phrasing where it can imply projection classification.
- Version A Mermaid raw multiline labels unless rewritten.
- Version B collapsed `runtime resource = ... provider implementation ...` language.
- Version B service-boundary ordering without runtime realization.
- Version B temporal `Future refinement seam`.
- Version B undefined `composed service` architecture kind.

## Canonical Boundary Statements To Preserve

These statements must remain substantively intact:

- Services own truth.
- Plugins project.
- Apps select.
- Resources declare capability contracts.
- Providers implement capability contracts.
- The SDK derives.
- The runtime realizes.
- Harnesses mount.
- Diagnostics observe.
- Runtime placement changes process shape, not semantic species.
- Runtime realization exists below semantic composition and above native host frameworks.
- Each `startApp(...)` invocation starts one selected process shape.
- `RuntimeCatalog` is a diagnostic read model, not live access and not app composition.
- Topology plus matching builder classifies plugin projection identity.
- Native framework interiors own native semantics after RAWR handoff.

## Sub-Specification Decisions

No sub-spec extraction is required before adoption.

| Topic | Decision | Required integration point |
| --- | --- | --- |
| Runtime realization | Keep existing dedicated runtime spec as authority. | Lifecycle, package/SDK naming, runtime access vocabulary, SDK/runtime/harness/diagnostics relationships. |
| Agent/OpenShell governance | Preserve boundaries; defer deeper governance spec. | Agent harness, `plugins/agent/*`, resource/policy hooks, async steward handoff. |
| Desktop native details | Preserve role/surface/harness boundary; defer native internals. | Desktop menubar/window/background, desktop harness, process-local loops. |
| RuntimeCatalog persistence | Defer. | Diagnostic read model, redaction, topology records. |
| Telemetry backend/export | Defer. | Runtime telemetry ownership and service observability separation. |
| Multi-process placement policy | Defer. | Runtime emits records; deployment/control-plane systems decide placement. |
| Config precedence | Defer until executable multi-source profile support. | Runtime profiles select config sources; config validates/redacts through runtime substrate. |

## Final Acceptance Checks

The edited final integrated architecture document is acceptable only if:

- It has one selected baseline shape, not an averaged A/B hybrid.
- It no longer uses the old `and Runtime Specification` title.
- It states the integrated architecture role in the opening.
- It contains no direct stale target terms: `packages/runtime`, `@rawr/hq-sdk`, `@rawr/runtime`, `startAppRole`, `startAppRoles`, `ProcessView`, `RoleView`, `RuntimeView`, `exposure`, `visibility`, `adapter.kind`, `bindService(...)`, `defineServicePackage(...)`, `initialContext`, or `packages/agent-runtime`.
- It lists top-level live access nouns as only `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`.
- It keeps resource/provider/profile separate in both prose and the final diagram.
- It places runtime realization before operational placement.
- It includes `desktop` in canonical roles/surfaces.
- It keeps runtime realization details at integration-boundary level.
- It preserves B Section 15's schema/config/diagnostics/telemetry/policy ownership model.
- It can support migration planning without reopening architecture.
