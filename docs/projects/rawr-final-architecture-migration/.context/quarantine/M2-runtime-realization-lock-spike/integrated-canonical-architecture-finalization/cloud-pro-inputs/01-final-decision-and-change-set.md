# Final Integrated Architecture Decision And Change Set

## Locked Decision

Use Version B / Alt-X-2 as the baseline after bounded edits. Use Version A / Alt-X-1 only as the named transplant source. The bounded repairs are sufficient to produce the final document without reopening architecture.

Version B is not accepted as-is. The required repairs are bounded and do not require architecture reopening. Version A is not a competing baseline; it is a source for specific transplants and semantic mining named below.

The final output must be one standalone top-level integrated canonical architecture specification. It must not mention candidates, source documents, prompts, packets, review process, migration status, or provenance.

## Authority Order

1. This decision/change set.
2. Runtime realization spec for runtime-overlap boundaries only.
3. Version B as baseline document.
4. Version A only for accepted transplants and semantic mining named here.

Do not consult unlisted project files, old alignment prompts, prior reports, raw scratch artifacts, migration docs, current implementation reality, archived specs, old alternates, chat transcripts, or cloud/project memory.

## Exact Edit Requirements

Apply fenced replacement text exactly in final-document form. Adapt only surrounding prose, heading placement, or connective sentences as needed to keep the standalone document coherent.

### R0: Title

Replace B:1 with:

```text
# RAWR Integrated Canonical Architecture Specification
```

Acceptance criteria:

- The final document does not use `RAWR Canonical Architecture and Runtime Specification`.
- The title frames the document as integrated architecture, not the runtime subsystem spec.

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
runtime profile  = app-owned provider, config-source, process-default, and harness-default selection
```

Then add these sentences:

```text
Resources do not implement or acquire themselves. Providers implement resource contracts. Profiles select providers and config sources for an app.

Entrypoints select process shape. Runtime profiles may provide defaults and provider/config/harness selections, but they do not redefine process shape.
```

Acceptance criteria:

- Provider implementation is no longer part of `RuntimeResource`.
- Profile selection is app-owned.
- Process shape remains entrypoint-selected.
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

## Semantic / Qualitative Requirements

Apply these with architectural judgment. Preserve the intended meaning and target authority, but do not mechanically copy source wording unless exact text is provided above.

### T1: Plug-And-Play Architecture Role

Source: A:25
Destination: B Scope after B:23

Reusable material:

```text
This specification is the canonical plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach.
```

Normalize:

- Use integrated architecture naming if the title changes.
- Keep runtime realization distinct from the integrated architecture body.

### T2: Universal Shape Precision

Source: A:129-144
Destination: B:120-137

Use A's richer role/surface coverage to augment B's table where it improves scanning, especially:

- trusted server internal API
- durable workflow, schedule, and consumer separation
- governed steward work staying on async
- CLI, web, agent/OpenShell, and desktop as peer output shapes

Normalize:

- Keep B's "Capability truth / Projection / Composition and realization" orientation.
- Avoid low-level runtime payload detail unless it is an integration boundary.

### T3: Resource / Provider / Profile Separation

Source: A:1271-1327
Destination: B:1085-1169

Use:

- resources own stable identity, consumed value shape, lifetime/config rules, and diagnostic-safe hooks
- resource requirements identify capability needs
- providers implement resource contracts
- runtime profiles select providers/config/process defaults

Reject provider implementation inside `RuntimeResource`.

### T4: Plugin Lane Navigability

Source: A:1411-1526
Destination: B:1190-1333

Add a small lane index or lane subheads if it improves migration-derivable navigation:

- public server API
- trusted server internal
- async workflow/schedule/consumer
- CLI command
- web app
- agent channel/shell/tool
- desktop menubar/window/background

Acceptance criteria:

- Path plus builder remains the projection classifier.
- Do not introduce generic projection-classification fields named `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind`. This does not forbid canonical lane names such as "public server API" or "trusted server internal API".

### T5: App Selection And Surface Explicitness

Source: A:1651-1695
Destination: after B:1482

Use the R4 text above. This is required because app membership, runtime profile, provider implementation, process shape, platform placement, role, and surface must not collapse.

### T6: Cache And Control-Plane Boundaries

Source: A:2032-2050
Destination: B 15, B 19, or B final picture

If included, add architecture-level statements only:

- `ServiceBindingCache`, runtime-local cache primitives, cache resources, semantic service read-model caches, and call-local memoization have different owners.
- Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, and finalization records at control-plane boundaries.
- Deployment/control-plane architecture owns multi-process placement policy; runtime does not decide placement.

Reject:

- detailed runtime cache APIs
- full catalog field inventory
- control-plane product design

### T7: Final Canonical Picture Repairs

Source: A:2889-3060
Destination: B:2716-2838

Required diagram repairs:

- Apply these with R2; do not update the prose formula without updating the final diagram edges to match.
- Add the provider-contract edge:
  `R -->|"capability contract"| V`
- Replace B's resource/service edge with resource dependency semantics:
  `R -->|"resourceDep declarations"| S`
- Replace B's provider/profile edge with provider selector semantics:
  `V -->|"provider selectors"| RP`
- Keep B's escaped `\n` label style.
- Do not add `SurfaceRuntimeAccess` as a node.

Optional final summary:

Add a compact public SDK family summary if it improves the final architecture as a terminal authoring index:

```text
app: defineApp(...), startApp(...)
service: defineService(...), resourceDep(...), serviceDep(...), semanticDep(...)
plugins: role/surface builders plus useService(...)
runtime resources: defineRuntimeResource(...), defineRuntimeProvider(...), defineRuntimeProfile(...), providerSelection(...), RuntimeSchema
```

Acceptance criteria:

- The final picture remains architecture-level.
- It does not become an exhaustive runtime API contract.

## Optional Improvements

Include these only if they improve the final document without expanding it into a runtime subsystem specification:

1. Add a compact public SDK family summary from A:3023-3058, normalized to avoid an exhaustive low-level API contract.
2. Add a compact shell/steward or role/surface table from A if it improves navigation without carrying over A's heavy runtime section.
3. Add A:2032-2050 cache/control-plane distinctions as short boundary statements, not detailed runtime APIs.

## Runtime Detail Boundary

The final document is top-level architecture, not the runtime subsystem spec. It must expose ontology, ownership laws, integration points, and flows without copying runtime internals.

Keep runtime realization as an attached subsystem boundary, not the body of the integrated architecture. Include enough runtime realization framing to prevent migration drift, including lifecycle, ownership law, package/SDK naming, runtime access vocabulary, and SDK/runtime/harness/diagnostics relationships.

At the integrated architecture level, runtime access vocabulary is limited to `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`. `SurfaceRuntimeAccess` may remain runtime-subsystem internal detail in the runtime realization spec, but the final integrated architecture must not introduce, list, explain, or diagram it as a top-level live access noun.

Do not copy the full runtime component catalog, full TypeScript interfaces, detailed file-by-file runtime package tree, or all runtime examples. Those remain in the runtime realization subsystem specification.

## Canonical Phrasing To Preserve

Preserve these statements substantively:

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
- Runtime realization follows `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`.
- `RuntimeCatalog` is a diagnostic read model, not live access and not app composition.
- Topology plus builder classifies projection identity.
- Native framework interiors keep native execution semantics after RAWR handoff.

## Subsystem Boundary Decisions

The final document should preserve the following subsystem attachment boundaries without turning them into detailed subsystem specifications or roadmap/status notes.

| Topic | Decision | Integration point to preserve |
| --- | --- | --- |
| Runtime realization | Keep as existing dedicated canonical spec. | Lifecycle, ownership law, package/SDK naming, runtime access vocabulary, SDK/runtime/harness/diagnostics relationships. |
| Schema/config/diagnostics/policy | Keep in integrated architecture as B Section 15. | `RuntimeSchema`, app profiles, diagnostics, telemetry, policy ownership. |
| Agent/OpenShell governance | Preserve boundary outside the top-level spec. | Agent harness, `plugins/agent/*`, resource/policy hooks, async steward handoff. |
| Desktop native internals | Preserve harness boundary outside the top-level spec. | Desktop role, desktop surfaces, desktop harness, process-local loops. |
| RuntimeCatalog persistence/telemetry backend | Preserve as flexible implementation detail. | Redacted catalog records, diagnostics, telemetry records, control-plane touchpoints. |
| Multi-process placement policy | Keep placement policy outside runtime realization; preserve only the integration point. | Entrypoint -> platform service -> replicas; runtime emits records but does not decide placement. |
| Config precedence | Keep the detailed precedence algorithm outside this document. | Runtime profiles select config sources; config validates/redacts through runtime substrate. |

## Forbidden / Superseded Material

This section is exclusion guidance only. Do not discuss rejected material in the final architecture document.

Do not carry forward:

- Version A `SurfaceRuntimeAccess` as an architecture-level live access noun at A:224-233, A:1930, or A:2782.
- Version A runtime-subsystem detail density from A:1763-2050 when it duplicates runtime spec component/catalog/detail authority.
- Version A repeated `publication artifacts` phrasing where it could imply projection classification.
- Version A raw multiline Mermaid labels in A:2891-2970 unless rewritten in render-safe syntax.
- Version B collapsed `runtime resource = ... provider implementation ...` language.
- Version B service-boundary sequence at B:481-487 without runtime realization.
- Version B temporal `Future refinement seam` heading and "future/later" framing at B:601-610.
- Version B undefined `composed service` architecture kind at B:2704.
- Source-document, cloud-task, review-process, provenance, or migration-plan narrative.
- Current implementation reality as normative architecture.

The final document must not present these direct stale target terms as target architecture:

- `packages/runtime`
- `@rawr/hq-sdk`
- `@rawr/runtime`
- `startAppRole`
- `startAppRoles`
- `ProcessView`
- `RoleView`
- `RuntimeView`
- `exposure`
- `visibility`
- `adapter.kind`
- `bindService(...)`
- `defineServicePackage(...)`
- `initialContext`
- `packages/agent-runtime`

## Final Acceptance Checks

The edited final integrated architecture document is acceptable only if:

- It has one selected baseline shape, not an averaged A/B hybrid.
- It no longer uses the old `and Runtime Specification` title.
- It states the integrated architecture role in the opening.
- It contains no direct stale target terms listed above.
- It lists top-level live access nouns as only `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`.
- It keeps resource/provider/profile separate in both prose and the final diagram.
- It places runtime realization before operational placement.
- It includes `desktop` in canonical roles/surfaces.
- It keeps runtime realization details at integration-boundary level.
- It preserves B Section 15's schema/config/diagnostics/telemetry/policy ownership model.
- It can support migration planning without reopening architecture.
