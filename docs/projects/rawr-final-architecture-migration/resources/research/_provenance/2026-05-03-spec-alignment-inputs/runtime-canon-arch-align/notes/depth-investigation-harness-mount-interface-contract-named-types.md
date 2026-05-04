---
title: 'Depth investigation: harness-mount interface contract — named types'
id: depth-investigation-harness-mount-interface-contract-named-types
tags:
- runtime-canon-arch-align
- locus-harness-mount-interface-contract-named-types
created: '2026-05-02T21:21:03.366223Z'
status: draft
type: interim
deprecated: false
summary: 7 boundary types classified as arch-spec-publishable (HarnessDescriptor,
  MountedSurfaceRuntimeRecord, StartedHarness, FunctionBundle, ExecutionRegistry,
  ProcessRuntimeAccess, EffectBoundaryContext.traceId); 5 classified runtime-internal;
  BEFORE/AFTER for arch-spec §10.12 drafted naming 9 named types with runtime-spec
  §21 cross-references; per-harness integration contracts drafted for all 6 harnesses;
  companion attachment requirements subsection (§13.8) drafted.
---

# Interim report: harness-mount-interface-contract-named-types

**Locus question:** Which boundary types from runtime-spec §20-§21 must the canonical architecture spec name at the integration level (CompiledSurfacePlan, FunctionBundle, mounted surface runtime records, native payload closures, HarnessDescriptor, StartedHarness) so companion harness specs and vendor integration authors have formal attachment points — and what is the integration-contract paragraph for each harness?
**Flavor:** technical

---

## What the corpus already said

The contradiction-graph cluster `harness-mount-interface-contract-undefined` identifies the core problem precisely: arch-spec L2272-L2273 states "Harnesses consume mounted surface runtimes or adapter-lowered payloads. They do not consume SDK graphs or compiler plans directly" — good prose, zero named types. Arch-spec L1804-L1808 says harnesses consume "mounted surface runtime records and adapter-lowered payloads" but again names no types. The source analysis for the arch-spec (§6.1) records this as a formal gap: "No formal integration contract for the harness-mount input shape." The source analysis for the runtime-spec (§4.4) provides the full per-harness input/output breakdown — Elysia, Inngest, OCLIF, web, agent/OpenShell, desktop — each with named inputs and named outputs. The runtime-spec source analysis also identifies `EffectBoundaryContext.traceId` (§4.9, L1193) as a required integration contract: adapters must mint a traceId before invoking `descriptor.run(...)`.

---

## What the new sources say

This investigation worked from the primary spec sources directly (no external URL fetches needed; the corpus is closed). The key material read was:

**Runtime-spec §20 (L4169-L4257):** The `SurfaceAdapter` interface (L4179-L4196) takes `CompiledSurfacePlan`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `BoundServiceBindingMap`, `ExecutionRegistry`, `ProcessExecutionRuntime`, and `RuntimeTelemetry` as lowering inputs. Output is `AdapterLoweringResult<TPayload>` containing the native payload. The adapter law is normative: adapters produce native payload closures calling `ProcessExecutionRuntime` at invocation time; they do not execute descriptors during lowering. Key quote: "Surface adapters are the only runtime layer that translates compiled surface plans into harness-facing native payloads. Harnesses consume mounted surface runtimes or adapter-lowered payloads." (L4210)

**Runtime-spec §21 (L4259-L4350):** The `HarnessDescriptor<TPayload>` interface (L4270-L4280) is the canonical harness contract: `mount(input: { processAccess, mountedSurfaces: readonly MountedSurfaceRuntimeRecord<TPayload>[], telemetry })` returns `Promise<StartedHarness>`. `StartedHarness` (L4282-L4287) carries `id`, `mountedAt`, `topologyRecords`, and an optional `stop()`. This interface is the definitive formal attachment point any harness implementation must satisfy. The six per-harness specs (§21.1-§21.6) are normative.

**Runtime-spec §16 (L3457-L3621):** `CompiledProcessPlan` (L3507-L3532) carries a `surfaces: readonly CompiledSurfacePlan[]` field. The compiler artifact table (L3565-L3575) defines `CompiledSurfacePlan` as wrapping `SurfaceRuntimePlan` with resolved service binding refs, executable boundary refs, adapter target, harness target, payload schema refs, topology records, and diagnostics. Also names `MountedSurfaceRuntimeRecord` (L3575): "Records surface identity, compiled surface plan ref, bound service refs, adapter-lowered payload ref, topology records, diagnostics, and finalization ownership."

**Runtime-spec §19.3 (L4067-L4092):** `FunctionBundle` (L4077-L4087): `kind: "harness.inngest.function-bundle"`, `appId`, `processId`, `functions: readonly InngestNativeFunctionPayload[]`, `dispatcherDescriptor?: WorkflowDispatcherDescriptor`, `runtimePayloadSchemas`, `diagnostics`, `topologyRecords`. Producer: async `SurfaceAdapter`. Consumer: Inngest harness.

**Runtime-spec §9.4 (L1250-L1277) and §18.3 (L3868-L3903):** `ExecutionRegistry` — assembled once per process after provisioning and before adapter lowering. Its `get(ref)` returns `CompiledExecutableBoundary`. Adapters resolve executable boundaries through the registry; they do not independently pair plans and descriptors. This is a critical integration invariant.

**Runtime-spec §9.2 (L1185-L1212):** `EffectBoundaryContext.traceId` is required at every invocation boundary. "If the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`." (L1211)

**Arch-spec §10.11-§10.12 (L1814-L1831):** The BEFORE text. §10.11 correctly states the adapter rule (does not lower raw declarations, etc.) but names no types. §10.12 states "They consume mounted surface runtime records and adapter-lowered payloads, then return started harness handles" — correct direction, but `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, and `StartedHarness` are unnamed.

**Arch-spec §13 (L2150-L2291):** The per-harness stack diagrams correctly show the chain but terminate with generic labels ("mounted server surfaces → Elysia HTTP runtime and oRPC handlers"; "FunctionBundle → Inngest harness") without integrating the type names from runtime-spec §21 into contract paragraphs.

---

## Evidence synthesis

The runtime-spec defines a complete, named harness integration contract. Every term the arch-spec currently uses in prose has a corresponding named type in the runtime-spec:

| Arch-spec prose term | Runtime-spec named type | Source section |
|---|---|---|
| "compiled surface plan" | `CompiledSurfacePlan` (field of `CompiledProcessPlan.surfaces`) | §16 L3522-L3523, L3568-L3570 |
| "adapter-lowered payloads" | native payload closures (`AdapterLoweringResult<TPayload>.payload`) | §20 L4199-L4205 |
| "mounted surface runtime records" | `MountedSurfaceRuntimeRecord<TPayload>` | §16 L3575, §21 L4276-L4277 |
| "started harness handles" | `StartedHarness` | §21 L4282-L4287 |
| (no arch-spec equivalent) | `HarnessDescriptor<TPayload>` | §21 L4270-L4280 |
| "FunctionBundle" (mentioned in stack diagram) | `FunctionBundle` | §19.3 L4077-L4087 |
| (no arch-spec equivalent) | `ExecutionRegistry` (passed to adapters) | §9.4 L1250-L1277, §18.3 L3868-L3903 |
| (mentioned in source-analysis but not arch-spec) | `EffectBoundaryContext.traceId` | §9.2 L1193-L1211 |

The arch-spec's §13.7 "Harness law" is two sentences. The runtime-spec's §21 is eight pages of normative per-harness contract. The mismatch is not a contradiction — the runtime-spec is the mechanical authority — but it creates a usability gap: companion harness spec authors reading the arch-spec cannot determine the formal attachment point they must satisfy (`HarnessDescriptor<TPayload>`), cannot determine what they receive (`MountedSurfaceRuntimeRecord<TPayload>[]`), and cannot determine what they must return (`StartedHarness`).

The right resolution is not to replicate the runtime-spec's §21 content in the arch-spec; it is to name the integration types at the arch-spec level and cross-reference runtime-spec §21 for the mechanics. The arch-spec must name the attachment types without defining their internal fields.

---

## Boundary-type classification table

| Type name | Runtime-spec source | Arch-spec should name it? | Publication depth in arch-spec | Rationale |
|---|---|---|---|---|
| `CompiledSurfacePlan` | §16 L3568-L3570 | **Y** | Name + producer/consumer | This is the adapter input type. Any adapter author must know what they receive from the compiler. "Adapters lower `CompiledSurfacePlan`" is already used in arch-spec §10.11 — the type should be named there. |
| `CompiledExecutionPlan` | §16 L3535-L3546 | **N** | Runtime-internal | `CompiledExecutionPlan` is internal to the compiler → execution-registry pipeline. Adapters resolve through `ExecutionRegistry`, not directly through `CompiledExecutionPlan`. Companion harness spec authors don't attach to this type. |
| `CompiledProcessPlan` | §16 L3507-L3532 | **N** | Runtime-internal | `CompiledProcessPlan` is the compiler's top-level output; it is consumed by the process runtime internally. No companion spec or vendor integration author receives it directly. |
| `SurfaceRuntimePlan` | §15.5 L3381-L3399 | **N** | Runtime-internal | SDK-derived descriptor that the compiler turns into `CompiledSurfacePlan`. Adapters explicitly must NOT receive `SurfaceRuntimePlan` (runtime-spec L4173). Naming it at arch level would invite confusion. |
| `WorkflowDispatcherDescriptor` | §15.6 L3401-L3425 | **N** | Runtime-internal | SDK derivation artifact consumed by compiler and process runtime. Not a public integration point for companion harness specs. Named as context in arch-spec §10.10 but should not be added as a harness attachment type. |
| `PortableRuntimePlanArtifact` | §15.7 L3427-L3455 | **Y** | Name + role + consumer class | Control-plane/deployment integration surface. Separately covered by the platform-external-interfaces-table locus, but should be cross-referenced in the harness boundary section as the deployment-side counterpart. |
| `FunctionBundle` | §19.3 L4077-L4087 | **Y** | Name + producer/consumer | The Inngest harness's formal input type. Arch-spec §13.2 stack diagram already mentions it; arch-spec §8.7 async projection lowering chain names it. It must be named as the integration type at the Inngest harness boundary in §10.12 and §13.2. |
| `MountedSurfaceRuntimeRecord` | §16 L3575, §21 L4276-L4277 | **Y** | Name + role | This is what "mounted surface runtime records" means in the arch-spec's current prose. Naming it closes the gap. All six harnesses receive `readonly MountedSurfaceRuntimeRecord<TPayload>[]` from the process runtime. |
| `HarnessDescriptor` | §21 L4265-L4280 | **Y** | Name + role + what it must produce | This is the formal attachment contract for any harness implementation. Companion harness spec authors MUST know this interface name. The arch-spec §10.12 should name it as the required implementation interface. |
| `StartedHarness` | §21 L4282-L4287 | **Y** | Name + role | The output of every harness mount. The arch-spec says "return started harness handles" (L1826) — the named type is `StartedHarness`. Should be named in §10.12. |
| `ExecutionRegistry` | §9.4 L1250-L1277, §18.3 L3868-L3903 | **Y** | Name + role | Adapters resolve executable boundaries through `ExecutionRegistry`; this is the integration invariant that prevents adapters from independently pairing plans and descriptors. Must be named in §10.11 as the adapter-law enforcement artifact. |
| `EffectBoundaryContext.traceId` | §9.2 L1193-L1211 | **Y** | Name + integration invariant | Required at every invocation boundary. The arch-spec should state this as an integration law ("adapters or the process execution runtime must mint a traceId if the native host does not supply one") in §10.12 or §17.8. Not a type name to publish — a property name to cite as an invariant. |

**Summary:** 7 types classified Y (should be named), 5 types classified N (runtime-internal).

Y types: `CompiledSurfacePlan`, `PortableRuntimePlanArtifact`, `FunctionBundle`, `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, `StartedHarness`, `ExecutionRegistry` (+ `EffectBoundaryContext.traceId` as a named invariant field).

N types: `CompiledExecutionPlan`, `CompiledProcessPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `CompiledExecutionRegistryInput`.

---

## Per-harness integration-contract draft

Six integration-contract paragraphs for arch-spec §10.12 / §13.x (one per harness). Each names the input boundary type, output type, what the harness owns vs what RAWR owns, and defers mechanics to runtime-spec §21.x.

### Elysia harness (§13.1 / runtime-spec §21.1)

The Elysia harness receives mounted server surface runtime records (`MountedSurfaceRuntimeRecord`) carrying adapter-lowered oRPC/Elysia route payloads, along with server harness configuration and process access. It mounts these payloads as Elysia HTTP routes and oRPC callback handlers that delegate invocation to `ProcessExecutionRuntime`; for selected public API projections it publishes OpenAPI; for selected internal projections it registers internal RPC handlers. The harness returns a `StartedHarness`. RAWR owns the compiled surface plan, route payload closures, and invocation delegation; Elysia owns HTTP host lifecycle and request routing. The harness must implement `HarnessDescriptor` and must not construct service bindings, select providers, or acquire resources directly. Mechanics are defined in the runtime realization specification, §21.1.

### Inngest harness (§13.2 / runtime-spec §21.2)

The Inngest harness receives a `FunctionBundle` — the async surface adapter's lowered artifact — along with the selected Inngest runtime resource, async harness mode (serve-mode or connect-worker mode), process access, and runtime telemetry. It produces a connected worker or serve-mode runtime ingress, registers native Inngest functions, and returns a `StartedHarness` with native async handles. RAWR owns workflow definition, step dispatch semantics, and function bundle derivation; Inngest owns durable async execution semantics including retry, step replay, workflow run identity, and event history. The harness must implement `HarnessDescriptor<FunctionBundle>` and must not produce or own the `WorkflowDispatcher`. Mode choice (serve-mode vs connect-worker) is selected at the runtime profile level and is architecturally consequential: serve-mode requires an inbound HTTP listener; connect-worker mode requires an outbound persistent connection to Inngest. Mechanics are defined in the runtime realization specification, §21.2.

### OCLIF harness (§13.3 / runtime-spec §21.3)

The OCLIF harness receives adapter-lowered command payloads from `plugins/cli/commands/*` plus role access and process access, delivered as `MountedSurfaceRuntimeRecord` entries. It registers native OCLIF commands with callbacks delegating to `ProcessExecutionRuntime`, and returns a `StartedHarness`. RAWR owns command surface plan compilation and adapter lowering; OCLIF owns command execution semantics. The harness must implement `HarnessDescriptor` and must not own plugin management authority, service semantics, or runtime provisioning. Mechanics are defined in the runtime realization specification, §21.3.

### Web harness (§13.4 / runtime-spec §21.4)

The web harness receives web app surface payloads, client publication metadata, process profile, and web host configuration as `MountedSurfaceRuntimeRecord` entries. It hands off the web app mount, build, and serve workflow to the selected web host, and returns a `StartedHarness`. RAWR owns web surface plan compilation; web hosts own rendering, bundling, routing, and browser-native behavior inside their boundary. The harness must implement `HarnessDescriptor` and must not own service domain authority, server API projection classification, or provider acquisition. Mechanics are defined in the runtime realization specification, §21.4.

### Agent/OpenShell harness (§13.5 / runtime-spec §21.5)

The agent/OpenShell harness receives agent channel/shell/tool surface payloads and OpenShell-related runtime resources as `MountedSurfaceRuntimeRecord` entries, plus process access and policy hooks. It produces channel mounts, shell mounts, tool mounts, OpenShell host payloads, and native tool callbacks delegating to `ProcessExecutionRuntime`, returning a `StartedHarness`. RAWR owns agent surface plan compilation and adapter lowering; OpenShell and agent hosts own native shell behavior inside the harness boundary. Agent governance is a reserved boundary with locked integration hooks — the harness must implement `HarnessDescriptor` but the internal protocol between RAWR and the agent/OpenShell runtime is reserved for the forthcoming companion spec. Mechanics are defined in the runtime realization specification, §21.5.

### Desktop harness (§13.6 / runtime-spec §21.6)

The desktop harness receives desktop menubar/window/background surface payloads and desktop host configuration as `MountedSurfaceRuntimeRecord` entries, plus process access. It produces native desktop mount payloads and host callbacks delegating to `ProcessExecutionRuntime`, returning a `StartedHarness`. RAWR owns desktop surface plan compilation; desktop hosts own native desktop interiors. Durable business execution remains on the `async` role, not the desktop harness. The harness must implement `HarnessDescriptor`. Mechanics are defined in the runtime realization specification, §21.6.

---

## Draft for arch-spec §10.12 (Harness and native boundary)

### BEFORE (arch-spec L1822-L1831)

```
### 10.12 Harness and native boundary

Harnesses own native mounting after runtime realization and adapter lowering.

They consume mounted surface runtime records and adapter-lowered payloads, then return started harness handles.

Harness startup records every successful mount. Startup rollback and normal finalization stop harnesses in reverse mount order before releasing role and process scopes.

Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads.
```

### AFTER (replacement text)

```
### 10.12 Harness and native boundary

Harnesses own native mounting after runtime realization and adapter lowering. Every harness implementation must satisfy the `HarnessDescriptor` interface defined in the runtime realization specification, §21.

**Integration contract.** Each harness receives:
- `MountedSurfaceRuntimeRecord[]` — the set of adapter-lowered surface records assembled by the process runtime from compiled surface plans and lowered native payloads;
- `ProcessRuntimeAccess` — scoped process-level access (no raw Effect internals, no provider internals, no unredacted config);
- `RuntimeTelemetry` — the telemetry carrier for tracing across the mounting phase.

Each harness returns a `StartedHarness` that carries mount identity, topology records, and an optional `stop()` finalizer invoked by rollback and finalization in reverse mount order.

**Inngest harness exception.** The Inngest harness receives a `FunctionBundle` (the async surface adapter's lowered artifact) rather than generic `MountedSurfaceRuntimeRecord` entries. `FunctionBundle` is defined in the runtime realization specification, §19.3.

**traceId integration invariant.** `EffectBoundaryContext.traceId` is required at every RAWR-owned executable invocation boundary. If the native host does not supply a trace identifier, the surface adapter or `ProcessExecutionRuntime` must mint one before invoking the descriptor. Adapters resolve executable boundaries through `ExecutionRegistry`; they do not independently pair compiled execution plans with descriptors. See runtime realization specification, §9.2 and §18.3.

**Boundary rule.** RAWR hands harnesses runtime-realized payloads; native framework interiors own native execution semantics from that point. Harnesses must not consume raw authoring declarations, SDK graphs, or compiler plans directly. Per-harness integration contracts are specified in §13.1-§13.6 below; the complete per-harness input/output and boundary rules are defined in the runtime realization specification, §21.
```

**Summary of change:** BEFORE names zero types, is 4 sentences. AFTER names `HarnessDescriptor`, `MountedSurfaceRuntimeRecord`, `ProcessRuntimeAccess`, `RuntimeTelemetry`, `StartedHarness`, `FunctionBundle`, `EffectBoundaryContext.traceId`, `ExecutionRegistry`, and `ProcessExecutionRuntime` — nine named types, all cross-referenced to the runtime-spec without re-defining their internal fields.

---

## Draft for arch-spec §13 (Stack binding) — integration-contract pattern + two exemplars

### Pattern

Each §13.x subsection should gain an "Integration contract" callout block below the existing process stack diagram:

```
**Integration contract.** The <harness-name> harness receives:
- Input boundary type: <type-name> (runtime-spec §21.x)
- Output type: `StartedHarness` (runtime-spec §21)
- RAWR owns: <one-line boundary claim>
- <harness-name> owns: <one-line boundary claim>
```

### Exemplar: §13.1 Server harness posture

(ADD after existing stack diagram and Elysia boundary rule, approximately at arch-spec L2192)

```
**Integration contract.** The Elysia harness receives `MountedSurfaceRuntimeRecord[]` carrying adapter-lowered oRPC/Elysia route payloads, server harness configuration, and process access. It must return a `StartedHarness`. RAWR owns compiled surface plans, route payload closures, and delegation to `ProcessExecutionRuntime` at invocation time; Elysia owns HTTP host lifecycle and request routing. The complete input/output contract is defined in the runtime realization specification, §21.1.
```

### Exemplar: §13.2 Async harness posture

(ADD after existing stack diagram and Inngest boundary rule, approximately at arch-spec L2211)

```
**Integration contract.** The Inngest harness receives a `FunctionBundle` (runtime-spec §19.3) — not `MountedSurfaceRuntimeRecord` entries — along with the selected Inngest runtime resource and async harness mode. It must return a `StartedHarness`. Mode choice is profile-selected: serve-mode requires an inbound HTTP listener; connect-worker mode requires an outbound persistent connection to Inngest. A single process binds exactly one mode. RAWR owns async surface plan compilation, FunctionBundle derivation, and workflow dispatch semantics; Inngest owns durable async execution semantics. The complete contract and mode specifications are defined in the runtime realization specification, §21.2.
```

---

## Companion-harness attachment-points subsection

Proposed as **§13.8 Companion harness attachment requirements** (or §13.7 if the Harness law remains at §13.7 and this becomes an addendum):

```
### 13.8 Companion harness attachment requirements

Any future harness implementation — whether RAWR-internal or vendor-provided — must satisfy the following requirements to attach at the RAWR harness-mount boundary. Companion harness specifications must address each of these requirements explicitly.

(a) **Named boundary types.** The harness must be implemented against the named boundary types defined in arch-spec §10.12 and the runtime realization specification, §21: `HarnessDescriptor<TPayload>`, `MountedSurfaceRuntimeRecord<TPayload>`, and `StartedHarness`. It must not receive, inspect, or depend on SDK derivation artifacts (`SurfaceRuntimePlan`, `NormalizedAuthoringGraph`) or compiler-internal artifacts (`CompiledProcessPlan`, `CompiledExecutionPlan`).

(b) **HarnessDescriptor contract.** The harness must implement `HarnessDescriptor<TPayload>` with a `mount(input: { processAccess, mountedSurfaces, telemetry })` method that returns `Promise<StartedHarness>`. The `mount(...)` method may not acquire providers, construct service bindings, or access raw Effect internals. It must call `stop()` on `StartedHarness` during finalization. The complete `HarnessDescriptor` and `StartedHarness` contracts are defined in the runtime realization specification, §21.

(c) **RuntimeDiagnostic conformance.** The harness must emit `RuntimeDiagnostic`-conforming findings for all mount failures, surface registration failures, and native host errors. Diagnostic minimum shape and phase classification are defined in the runtime realization specification, §22.1.

(d) **traceId requirement.** The harness must respect `EffectBoundaryContext.traceId` as the required invocation correlation field at every RAWR-owned executable boundary it triggers through native host callbacks. If the native host does not supply a trace identifier, the harness or the surface adapter must mint one before invoking `ProcessExecutionRuntime`. This requirement is non-negotiable and cannot be deferred to a native host that does not support tracing. See runtime realization specification, §9.2.

(e) **No direct descriptor pairing.** The harness must resolve executable boundaries through `ExecutionRegistry` (via adapter-produced callbacks), not by independently pairing compiled execution plans with descriptors. See runtime realization specification, §18.3.

A companion harness specification that satisfies (a)-(e) may extend each requirement with harness-specific constraints (native SDK versions, mode selection, performance bounds, harness-local policy hooks) without reopening the RAWR harness-mount boundary contract.
```

---

## Cross-locus implications

**companion-spec-attachment-points-registry (sibling locus):** The named types produced in this locus — `HarnessDescriptor`, `MountedSurfaceRuntimeRecord`, `StartedHarness`, `FunctionBundle`, `ExecutionRegistry`, `EffectBoundaryContext.traceId` — are the vocabulary the companion-spec attachment-points registry will use in its "harness-mount" row. Without this locus's classification work, the registry locus has no formal type vocabulary to anchor the harness-mount boundary. This locus should be incorporated into the registry table before the registry locus finalizes its attachment protocol.

**inngest-integration-mode-architecture-level (sibling locus):** The Inngest harness integration contract (§13.2 exemplar above) is one specific dimension of the Inngest harness boundary. The mode-specific topology distinction (serve-mode HTTP listener vs connect-worker outbound connection) is a level above the `FunctionBundle` type — it is a network-topology choice that the Inngest locus handles. The two loci are complementary: this locus names the formal input type (`FunctionBundle`) and the required harness interface (`HarnessDescriptor<FunctionBundle>`); the Inngest locus specifies how mode selection changes the network ingress shape that surrounds the harness. Both must land in §13.2 — the §10.12 harness boundary and the §13.2 mode-topology statement are sequenced, not competing.

---

## Committed position

The canonical architecture specification must formally name seven boundary types at arch-spec §10.12 and §13.1-§13.6: `HarnessDescriptor`, `MountedSurfaceRuntimeRecord`, `StartedHarness`, `FunctionBundle`, `ExecutionRegistry`, `ProcessRuntimeAccess`, and `EffectBoundaryContext.traceId` (as an integration invariant field). It must do so by naming — not defining — these types, each with a single-sentence role description and a cross-reference to the runtime-spec section that owns their contract. The load-bearing reason is that companion harness spec authors and vendor integration authors currently have no formal attachment point at the architecture level; arch-spec §10.12's current prose ("consume mounted surface runtime records and adapter-lowered payloads, then return started harness handles") is correct in direction but provides zero type vocabulary, making it impossible to write a conforming harness without reading the runtime-spec's §21 directly.

- **Position:** Arch-spec §10.12 must name `HarnessDescriptor`, `MountedSurfaceRuntimeRecord`, `StartedHarness`, `FunctionBundle`, `ExecutionRegistry`, and `EffectBoundaryContext.traceId` as the formal harness-mount boundary vocabulary, each cross-referenced to runtime-spec §21 (or §19.3 / §9.2), without re-defining their internal fields.
- **Confidence:** High (>80%). The runtime-spec defines these types unambiguously at §21, the arch-spec uses the semantic content without the names, and the user's stated intent is to make the arch-spec explicit about integration points. The only uncertainty is editorial: whether the arch-spec should name `ProcessRuntimeAccess` at §10.12 or whether that is sufficiently covered in §10.8 (Runtime access).
- **Boundary conditions:** This position applies to the arch-spec's role as the integration document for companion harness spec authors and vendor integration authors. If the runtime-spec's §21 changes its type names, the arch-spec's naming must track those changes — the arch-spec is not the source of truth for the shapes, only a naming relay. Outside this scope: the arch-spec should not add field-level detail for any of these types; that remains exclusively in runtime-spec §21.
- **What would change this position:** If the user decides that the arch-spec should only ever describe harness integration at the prose/intent level (i.e., that all named type information lives exclusively in the runtime-spec and companion harness specs attach to the runtime-spec directly, not the arch-spec), then §10.12 should remain prose-only and instead add a single directive: "The harness-mount integration contract is defined in the runtime realization specification, §21; companion harness specs must attach at that boundary." That is a weaker but still valid approach. The present position assumes the user wants the arch-spec to serve as a usable integration anchor without sending authors directly to the runtime-spec for every named type.
- **Evidence weight:** 2 direct spec sources (runtime-spec §21 normative, arch-spec §10.12 current prose), 1 corpus analysis confirming the gap (source-analysis-arch-spec §6.1), 1 contradiction-graph cluster confirming the missing type vocabulary (cluster `harness-mount-interface-contract-undefined`). No countervailing sources found — the gap is undisputed; the only question is how much to name at the arch-spec level.
- **Minimal-viable subset:** If the maximalist version (all seven types named) is rejected, the minimal-viable subset is three: `HarnessDescriptor`, `StartedHarness`, and `FunctionBundle`. These three names, cross-referenced to runtime-spec §21 and §19.3 respectively, give companion spec authors the two ends of the harness contract (what they must implement, what they receive) and give Inngest integration authors the specific input type. With these three, a companion harness spec can be written; without them, it cannot be formally anchored.

---

## Open questions

- **`ProcessRuntimeAccess` naming depth:** The arch-spec already names `ProcessRuntimeAccess` at §10.8 (runtime access nouns). Should §10.12 explicitly list it as a harness-mount input, or assume §10.8 makes it available by reference? Investigation stayed at naming level; the editorial question is unresolved.
- **`CompiledSurfacePlan` at §10.11 vs §10.12:** The adapter lowering section (§10.11) should name `CompiledSurfacePlan` as the adapter input; the harness section (§10.12) should name `MountedSurfaceRuntimeRecord` as the harness input. The sequencing between these two sections needs a bridging sentence: "Surface adapters lower `CompiledSurfacePlan` into native payloads; the process runtime assembles these into `MountedSurfaceRuntimeRecord` entries for harness mounting." That sentence is missing from the current arch-spec.
- **Agent/OpenShell harness type completeness:** §21.5 does not give the agent harness a single specific payload type name the way Inngest gets `FunctionBundle`. The investigation deduced that it receives `MountedSurfaceRuntimeRecord[]` by the general `HarnessDescriptor` contract. If a future companion spec for OpenShell defines a dedicated payload type, the arch-spec's §13.5 would need updating. This is a "reserved boundary with locked integration hooks" situation — not a gap to fill now, but one to flag.
- **`RuntimeDiagnostic` minimum shape:** The companion attachment requirements subsection (§13.8(c)) references `RuntimeDiagnostic` minimum shape but this locus did not investigate §22.1 in depth. Cross-referenced to the platform-external-interfaces-table locus which covers RuntimeDiagnostic.

---

## Sources

1. [[rawr-effect-runtime-realization-system-canonical-spec-source]] — Runtime realization specification; §20 (L4169-L4257 surface adapter lowering), §21 (L4259-L4350 harness and native boundary contracts), §19.3 (L4067-L4092 FunctionBundle), §16 (L3457-L3621 compiled process plan), §9.2 (L1185-L1212 EffectBoundaryContext.traceId), §9.4 / §18.3 (ExecutionRegistry)
2. [[rawr-canonical-architecture-spec-source]] — Canonical architecture specification; §10.11-§10.12 (L1814-L1831 surface adapter lowering and harness boundary), §13 (L2150-L2291 stack binding and per-harness posture), §17.8 (L2709-L2718 runtime subsystem invariants)
3. [[source-analysis-rawr-runtime-realization-system-canonical-spec]] — Source analysis; §4.4 (per-harness input/output contracts), §4.9 (traceId integration contract), §6.4 (harness enumeration and vendor assignments)
4. [[source-analysis-rawr-canonical-architecture-specification]] — Source analysis; §6.1 (harness boundary contract gap), §8.5 (FunctionBundle interface contract not defined), §4c (harness integration boundaries)
5. [[contradiction-graph.json]] — Cluster `harness-mount-interface-contract-undefined` (confirms gap, names both sides)
