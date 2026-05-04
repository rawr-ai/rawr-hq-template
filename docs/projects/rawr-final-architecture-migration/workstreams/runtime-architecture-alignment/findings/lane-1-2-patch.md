# Lane 1.2 Patch — Companion-spec attachment-points registry (§10.14 + L25 upgrade)

**Lane:** 1.2
**Workstream:** Runtime-Architecture Alignment
**Recommendation applied:** Recommendation #2
**Decisions in effect:** Decision #1 = Option A (§10.14 placement); Decision #2 = Option B (11 rows, no OpenShell placeholder)

---

## Sub-edit 1.2.A — Insert §10.14 between §10.13 and the §10 closing divider

**Target file:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

**BEFORE block** (lines 1824–1828 in the spec at time of patch authoring):

```
Service semantic observability remains service-owned and oRPC-native inside the service boundary.

---

## 11. Runtime roles and surfaces
```

**AFTER block:**

```
Service semantic observability remains service-owned and oRPC-native inside the service boundary.

### 10.14 Companion specifications and integration-boundaries registry

This registry enumerates the named integration boundaries at which subsystem (companion) specifications attach to this canonical architecture specification. It is the operational form of the §1 attachment promise.

Each boundary names the architecture-spec section that establishes it, the runtime realization-specification section that owns its mechanics, which side owns naming and which owns mechanics, the named interface contract types this specification carries, and the companion specifications currently attaching there.

| Boundary name | Arch-spec section | Runtime-spec section | Naming owner | Mechanics owner | Named interface contract types | Companion specs that attach |
|---|---|---|---|---|---|---|
| Lifecycle vocabulary | §10.2 | §24.2, §22.1 | Arch-spec: canonical phase names | Runtime-spec: phase implementation, diagnostics, telemetry correlation | Seven phase names: `definition`, `selection`, `derivation`, `compilation`, `provisioning`, `mounting`, `observation` | Runtime realization spec; TBD: deployment spec |
| SDK derivation handoff | §10.4 | §15 | Arch-spec: artifact category names | Runtime-spec: artifact shapes, portability classification, producer/consumer contracts | `NormalizedAuthoringGraph`, `PortableRuntimePlanArtifact`, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `ExecutionDescriptorTable` (non-portable) | Runtime realization spec |
| Runtime compiler | §10.5 | §16 | Arch-spec: compiler role in the chain | Runtime-spec: validation list, CompiledProcessPlan shape, emission contract | `CompiledProcessPlan`, `CompiledExecutionPlan` | Runtime realization spec |
| Bootgraph and provisioning kernel | §10.6 | §17 | Arch-spec: RAWR-vs-Effect control split naming | Runtime-spec: bootgraph ordering, Effect kernel construction, ProvisionedProcess, rollback mechanics | `Bootgraph`, `ProvisionedProcess` | Runtime realization spec |
| Runtime access | §10.8 | §18.1–§18.2 | Arch-spec: runtime access noun taxonomy | Runtime-spec: RuntimeAccess scoping, ProcessRuntimeAccess, RoleRuntimeAccess shapes | `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess` | Runtime realization spec; TBD: observability companion spec |
| Service binding | §10.9 | §18.3–§18.5 | Arch-spec: cache-key exclusion rule | Runtime-spec: ServiceBindingCache mechanics, bindService contract | `ServiceBindingCache`, `ServiceBindingCacheKey` | Runtime realization spec |
| Workflow dispatcher | §10.10 | §19 | Arch-spec: dispatcher role as server-internal→async bridge | Runtime-spec: WorkflowDispatcher materialization, FunctionBundle lowering, async step-local Effect | `WorkflowDispatcher`, `FunctionBundle` | Runtime realization spec |
| Surface adapter lowering | §10.11 | §20 | Arch-spec: adapter layer position in the chain | Runtime-spec: CompiledSurfacePlan → native payload closure contract, SurfaceAdapter interface | `CompiledSurfacePlan`, `SurfaceAdapter` | Runtime realization spec; TBD: additional vendor harness specs |
| Harness and native boundary | §10.12 | §21 | Arch-spec: harness role taxonomy and vendor assignments | Runtime-spec: per-harness input/output contracts, HarnessDescriptor mount protocol | `HarnessDescriptor`, `StartedHarness`, per-harness: `FunctionBundle` (Inngest), oRPC route payloads (Elysia), command payloads (OCLIF) | Runtime realization spec; TBD: vendor harness companion specs (incl. OpenShell vendor contract per §13.5) |
| Control-plane and deployment interface | §15.7, §15.8 | §15.7, §22.3 | Arch-spec: control-plane boundary rule | Runtime-spec: PortableRuntimePlanArtifact shape and consumers, RuntimeCatalog schema | `PortableRuntimePlanArtifact`, `RuntimeCatalog` | Runtime realization spec; TBD: deployment spec |
| Diagnostics, telemetry, and observation | §10.13, §15.8 | §22 | Arch-spec: observability construct names | Runtime-spec: RuntimeDiagnostic shape, RuntimeTelemetry chain, RuntimeCatalog minimum sections | `RuntimeDiagnostic`, `RuntimeTelemetry`, `RuntimeCatalog` | Runtime realization spec; TBD: observability companion spec |

#### 10.14.1 Attachment protocol

Companion specifications attach to this architecture specification by following six rules:

1. **Companion specs reference boundary names from the §10.14 registry, not internal aliases.** A companion deployment spec must call the deployment integration interface `PortableRuntimePlanArtifact` (the registry name), not `RuntimeDeploymentBlueprint` (an internal alias).
2. **Companion specs do not redefine boundary types; they refer by name to the owning runtime-spec section.** A companion observability spec must point at runtime-spec §22.2 for the `RuntimeTelemetry` field shape; it does not redefine `RuntimeTelemetry`.
3. **Companion specs do not duplicate mechanics covered by another spec.** A companion deployment spec should not enumerate the runtime compiler's validation list; it should cross-reference runtime-spec §16.
4. **Companion specs declare their own reserved-detail boundaries at lock time per the runtime-spec §23.5 / L4637 model.** A companion observability spec that defers, say, "telemetry sink choice" to a future implementation slice must declare that boundary as reserved at lock time.
5. **Companion specs do not use "fixes" language on mechanics they do not own — only on their own integration vocabulary.** A companion deployment spec may "fix" deployment placement vocabulary; it may not "fix" the runtime compiler's validation list.
6. **Arch-spec vocabulary is the canonical naming source; companion-spec names that conflict must yield.** If a companion spec invents a name that collides with an arch-spec name, the arch-spec name wins.

#### 10.14.2 Worked example: the runtime realization specification as the canonical companion

The runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`) is the current canonical companion that attaches at every row of the registry. The expected attachment shape per row:

- **Lifecycle vocabulary:** runtime-spec §24.2 uses the identical seven phase names established in arch-spec §10.2, adds per-phase required output, producer, consumer, and gate — extending, not replacing, the arch-spec's phase vocabulary.
- **SDK derivation handoff:** runtime-spec §15 specifies artifact shapes and portability classification; the arch-spec names artifact categories without enumerating shape internals.
- **Runtime compiler:** runtime-spec §16 owns the validation list and emission contract; the arch-spec names the compiler's role in the chain.
- **Bootgraph and provisioning kernel:** arch-spec §10.6 names the RAWR-vs-Effect control split; the arch-spec must NOT enumerate the Effect-internal primitives (queues, pubsub, refs, fibers, semaphores) — those belong in runtime-spec §17.
- **Runtime access:** runtime-spec §18.1 carries the RuntimeAccess scoping invariant ("services do not receive broad RuntimeAccess; only their declared deps"); the arch-spec names the access noun taxonomy.
- **Service binding:** runtime-spec §18.3–§18.5 owns ServiceBindingCache mechanics; the arch-spec carries the cache-key exclusion rule (`invocation` excluded from `ServiceBindingCacheKey`) and enumerates the five context lanes (`deps`, `scope`, `config`, `invocation`, `provided`) as integration vocabulary.
- **Workflow dispatcher:** runtime-spec §19 owns dispatcher materialization and FunctionBundle lowering; the arch-spec names the dispatcher as the server-internal→async bridge.
- **Surface adapter lowering:** runtime-spec §20 owns the CompiledSurfacePlan → native payload closure contract; the arch-spec §10.11 names the adapter layer position in the chain.
- **Harness and native boundary:** arch-spec §10.12 must name `HarnessDescriptor` and `StartedHarness` as the formal interface types at the boundary; per-harness input/output is owned by runtime-spec §21.
- **Control-plane and deployment interface:** arch-spec §15.8 names `PortableRuntimePlanArtifact` and `RuntimeCatalog` as integration interfaces; runtime-spec §15.7 + §22.3 own their shapes.
- **Diagnostics, telemetry, and observation:** arch-spec §10.13 names `RuntimeDiagnostic` and `RuntimeTelemetry`; runtime-spec §22 owns the field shapes and chain ordering.

#### 10.14.3 Phase-transition trigger conditions

The seven lifecycle phases are strictly sequential. Each phase's start gate is the validated availability of the prior phase's output. Phase-transition mechanics — eager vs lazy, sync vs async handoff, what triggers compilation vs derivation — are defined in the canonical runtime realization specification, §24.

#### 10.14.4 Error propagation across phase boundaries

Error propagation across phase boundaries flows through `RuntimeDiagnostic` as the structured channel and rollback as the lifecycle response. A failed phase produces structured diagnostics; rollback applies to already-started components in the failed startup subset; reverse-order finalization runs on rollback. Mechanics for diagnostic emission and rollback are defined in the canonical runtime realization specification, §17 and §22.

---

## 11. Runtime roles and surfaces
```

---

## Sub-edit 1.2.B — Replace the L25 sentence

**Target file:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

**BEFORE block** (line 25 in the spec at time of patch authoring):

```
This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach.
```

**AFTER block:**

```
This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at named integration boundaries enumerated in §10.14. The runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`) is the current canonical companion document for all runtime concerns; it is authoritative on mechanics within each integration boundary this specification names. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach.
```

---

## Verification notes

- Sub-edit 1.2.A BEFORE: lines 1824–1828 of the spec. Exact text confirmed via Read.
- Sub-edit 1.2.B BEFORE: line 25 of the spec. Exact text confirmed via Read.
- Registry has 11 rows (Decision #2 = Option B: no OpenShell placeholder row; OpenShell is third-party with vendor contract, referenced only via §13.5 in the Harness row).
- Registry placement is §10.14, closing subsection of chapter 10 (Decision #1 = Option A).
- No divergences found between task instructions and spec content.
