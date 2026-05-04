---
title: 'Depth investigation: companion-spec attachment-points registry'
id: depth-investigation-companion-spec-attachment-points-registry
tags:
- runtime-canon-arch-align
- locus-companion-spec-attachment-points-registry
created: '2026-05-02T21:19:06.221086Z'
status: draft
type: interim
deprecated: false
summary: NET-NEW arch-spec §10.14 with 11-boundary registry table + 6-rule attachment
  protocol + worked example using runtime-spec as canonical companion; upgrade arch-spec
  L24 from promise to pointer
---

# Interim report: companion-spec-attachment-points-registry

**Locus question:** How should the canonical architecture spec operationalize its claim that 'subsystem specifications attach at explicit integration boundaries' — i.e., what does the integration-boundaries registry look like, and how does the runtime realization spec attach to it?
**Flavor:** synthesis

---

## 1. Locus framing

The arch-spec asserts at L24: "Subsystem specifications attach to it at explicit integration boundaries." This is a load-bearing promise — the arch-spec frames itself as a "canonical integrated plug-and-play architecture layer" whose purpose is to be the document that companion subsystem docs plug into. But the promise is entirely unoperationalized: there is no registry section, no named boundary table, no attachment protocol, and no pointer to the runtime realization specification by name anywhere in the document. The runtime realization spec demonstrably IS such a companion document — it names the same seven lifecycle phases, uses the same vocabulary, and defines detailed contracts at every phase boundary — but the arch-spec has no formal mechanism for acknowledging that attachment. This matters for the alignment task because: (a) the user's explicit requirement is that the arch-spec be "explicit about integration points: interfaces, boundaries, conditions, rules — whatever the system needs to make companion subsystem documents plug in cleanly"; (b) without a registry, future companion specs (deployment, observability, OpenShell) have no formal protocol to follow; and (c) the absence means the arch-spec cannot fulfil its own self-description as an integration layer. The depth investigation must deliver a NET-NEW arch-spec section that operationalizes the companion-spec attachment promise with concrete prose — not a recommendation to add one.

---

## 2. Evidence inventory

**Arch-spec line refs:**

- **arch-spec L24** — "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach." — the promise, entirely unoperationalized.
- **arch-spec L9–L22** — scope list includes "the runtime realization lifecycle" (L17) and "the process-local runtime substrate" (L12) — the arch-spec claims these as things it "fixes," but does not name the runtime realization spec as the companion that owns the mechanics.
- **arch-spec L1633–L1641 (§10.2)** — the seven-phase lifecycle table with Producer/Consumer columns. This IS an integration contract, but is embedded in §10 without cross-reference to any companion spec owning the implementation.
- **arch-spec L1651–L1683 (§10.4 SDK derivation)** — artifact list (normalized authoring graph, canonical identities, resource requirements, normalized provider selections, service binding plans, surface runtime plan descriptors, workflow dispatcher descriptors, portable plan artifacts, derivation diagnostics) — names the artifacts but does not link to the runtime spec's §15 as the owning authority on their shapes.
- **arch-spec L1687–L1710 (§10.5–§10.6)** — runtime compiler and bootgraph/kernel described at runtime-internal depth without pointing to runtime-spec §16–§17 as the canonical contracts.
- **arch-spec L1808–L1826 (§10.11–§10.12)** — "Harnesses consume mounted surface runtimes or adapter-lowered payloads. They do not consume SDK graphs or compiler plans directly." (L2272–L2273 in spec numbering). Correct boundary rule, no named types.
- **arch-spec L1832–L1842 (§10.13)** — RuntimeCatalog, RuntimeDiagnostic, RuntimeTelemetry named but without cross-reference to runtime-spec §22 as the owning contract section.
- **arch-spec §13 (L2133–L2277)** — per-harness process stack diagrams. Each diagram terminates at the harness boundary without naming the runtime-spec section owning that harness contract.
- **arch-spec §17.12 (L2733–L2740)** — control-plane invariant: "Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, finalization, diagnostics, telemetry, and catalog records at control-plane boundaries." Names the records; no reference to PortableRuntimePlanArtifact or RuntimeCatalog as the formal typed interfaces.

**Absence evidence:**
- No arch-spec section labeled "Companion specifications," "Integration boundaries registry," "Subsystem attachment protocol," or similar.
- No arch-spec mention of "runtime realization specification" or "RAWR_Effect_Runtime_Realization_System_Canonical_Spec" by name.
- No arch-spec definition of a "reserved detail boundary" concept (despite the runtime-spec using it at §23.5, L4637).

**Runtime-spec line refs (attachment points that exist but are unnamed in arch-spec):**

- **runtime-spec L1–L5** — status: Canonical; scope declares runtime realization as its domain; "once locked, supersedes older runtime/effect documents." The arch-spec never names this document as the authoritative companion for runtime concerns.
- **runtime-spec L37–L47** — execution ownership law: "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe." — the most compact statement of all vendor integration points; arch-spec covers the same content diffusely (L2153–L2154, §4.1, §4.9) without this single authoritative form.
- **runtime-spec §15 (L3213–L3437)** — SDK derivation and portable plan artifacts. Owns the artifact shapes the arch-spec lists at L1651–L1683. Attachment boundary: SDK derivation phase output.
- **runtime-spec §15.7 (L3427–L3455)** — PortableRuntimePlanArtifact: "consumed by runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints." The arch-spec's control-plane boundary (§15.7, L2554–L2569) does not name this artifact.
- **runtime-spec §16 (L3439–L3617)** — runtime compiler contract. Owns the validation list and CompiledProcessPlan. Arch-spec §10.5 (L1687–L1710) duplicates this at runtime-internal depth.
- **runtime-spec §17 (L3619–L3731)** — bootgraph and Effect-backed provisioning/execution kernel. Owns the provisioning mechanics arch-spec §10.6 (L1710–L1722) describes at runtime-internal depth.
- **runtime-spec §18 (L3732–L3984)** — process runtime, runtime access, service binding. Owns runtime access nouns (RuntimeAccess, ProcessRuntimeAccess, RoleRuntimeAccess) arch-spec §10.8 (L1753–L1768) names.
- **runtime-spec §19 (L3986–L4150)** — WorkflowDispatcher and async runtime integration. Attachment boundary: workflow dispatcher materialization point between compilation and mounting phases.
- **runtime-spec §20 (L4151–L4239)** — surface adapter lowering. Defines the adapter contract (CompiledSurfacePlan → native payload closures). Arch-spec §10.11 (L1814–L1819) states the rule but names no types.
- **runtime-spec §21 (L4241–L4333)** — harness and native boundary contracts. Defines per-harness input/output: HarnessDescriptor (mount → StartedHarness), Elysia (CompiledSurfacePlan + ExecutionRegistry → oRPC route payloads → Elysia routes), Inngest (FunctionBundle → connected worker or serve-mode), OCLIF, web, agent/OpenShell, desktop. Arch-spec §13 shows the stack diagrams but names no types.
- **runtime-spec §22 (L4334–L4572)** — RuntimeDiagnostic, RuntimeTelemetry, RuntimeCatalog. RuntimeCatalog is "the diagnostic read model… consumed by diagnostic readers/control-plane touchpoints." Arch-spec §10.13 names the constructs without cross-referencing this as the owning section.
- **runtime-spec §23.5 (L4637–L4661)** — reserved detail boundaries: "Reserved boundaries are named architecture surfaces with locked owners and integration hooks. They are not omissions. A reserved boundary must be locked no later than the first implementation slice that makes its dedicated specification trigger true." This protocol concept does not appear in the arch-spec at all, yet it is the mechanism by which the runtime spec defers details to future companion specs.
- **runtime-spec §27 (L5087–L5147)** — component contract summary table. Lists every component/artifact with owner, placement, produced by, consumed by, phase, diagnostics, enforcement/acceptance gate. This is the most comprehensive integration map in the spec; the arch-spec has no equivalent.
- **runtime-spec §29 (L5260–L5265)** — lock authority: "once locked, this document supersedes older indexed runtime/effect documents." The arch-spec does not acknowledge this lock authority or the companion spec's supersession chain.

**Contradiction-graph clusters (by reference):**

- `companion-spec-attachment-points-not-enumerated`: arch-spec L24 asserts attachment protocol; runtime-spec is a demonstrable companion with no formal acknowledgment. Gap, not contradiction.
- `harness-mount-interface-contract-undefined`: arch-spec names harness boundary in prose; runtime-spec §20–§21 names the typed interface. Gap that the registry must bridge.
- `portable-plan-artifact-as-control-plane-interface-missing`: arch-spec §15.7 names control-plane records; runtime-spec §15.7 names PortableRuntimePlanArtifact as the typed interface. Gap requiring registry entry.
- `lifecycle-naming-vs-mechanics-authority`: arch-spec "fixes" the lifecycle (L17); runtime-spec is canonical on runtime mechanics. Resolves under naming-vs-mechanics carve-out; registry must formalize the carve-out per boundary.

---

## 3. Synthesis: what is the integration-boundaries registry?

**Shape recommendation: table-primary with one subsection per boundary.**

The registry should be organized as a master table (one row per integration boundary) followed by per-boundary subsections that spell out the attachment protocol for that boundary. The table gives readers a scanning surface; the subsections give companion-spec authors the formal contract they need to correctly attach.

**Why not table-only:** A table alone cannot carry the attachment protocol (who owns naming vs mechanics, what interface types the companion spec may reference, what the companion spec must not re-define). That requires prose.

**Why not pure section-per-boundary:** The runtime spec's §27 component contract summary shows that a table is indispensable as a quick reference map. Companion-spec authors reading the arch-spec need to find their attachment point quickly; dense per-boundary sections without a master table create a navigation problem.

**Why this hybrid shape is justified against the evidence:**

(a) **The runtime spec's actual attachment points** (§15, §16, §17, §18, §19, §20, §21, §22) map cleanly to named phase transitions in the lifecycle table. The master table can use the same column structure as the lifecycle table (arch-spec L1633–L1641): boundary name | arch-spec section | runtime-spec section | naming owner | mechanics owner | required interface contract type names | known companion-spec consumers.

(b) **The arch-spec's existing structure** already has a lifecycle table with Producer/Consumer columns (§10.2). The registry table extends the same structural idiom — phase-level → boundary-level. This maintains document coherence.

(c) **Future companion-spec needs:** deployment, observability, OpenShell, and additional harness specs each need to find their attachment point. A table with a "known companion-spec consumers" column (initially listing "runtime realization spec" and "TBD: deployment spec," "TBD: OpenShell companion spec") makes the registry forward-looking without requiring those specs to exist yet.

**The registry is NOT:** a copy of the runtime spec's §27 table. The arch-spec version is shallower — it names boundaries and owner sides, without duplicating the runtime spec's per-artifact producer/consumer/phase detail.

---

## 4. Draft section: actual prose

### Suggested heading: `§10.14 Companion specifications and integration-boundaries registry`

### Insertion point: immediately after §10.13 (RuntimeCatalog, diagnostics, and telemetry), before the `---` that closes §10 and before §11 (Runtime roles and surfaces).

**Why here:** §10 is the runtime realization section — the natural home for a registry that maps arch-spec runtime integration claims to the companion spec that owns their mechanics. Placing the registry at §10.14 keeps it inside the runtime realization section (where companion specs for runtime concerns attach) while making it adjacent to the lifecycle table (§10.2), SDK derivation (§10.4), compiler (§10.5), bootgraph (§10.6), runtime access (§10.8), service binding (§10.9), workflow dispatcher (§10.10), surface adapters (§10.11), harness boundary (§10.12), and RuntimeCatalog (§10.13) — all of which are integration boundaries the registry tabulates.

---

**DRAFT SECTION TEXT:**

```markdown
### 10.14 Companion specifications and integration-boundaries registry

This specification is the canonical integration layer. Companion subsystem specifications attach to it at explicit integration boundaries defined in this section. The runtime realization specification is the current canonical companion subsystem document for all runtime concerns.

**Runtime realization specification:** RAWR Effect Runtime Realization System Canonical Spec (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`). Status: Canonical. Once locked, it supersedes older runtime/effect documents on runtime realization concerns. This architecture specification defers all runtime mechanics, phase implementation, substrate internals, and per-harness interface contracts to the runtime realization specification.

#### Integration-boundaries registry

Each row names one integration boundary: the architecture-spec section that establishes the boundary, the runtime-spec section that owns the mechanics, which side owns naming and which owns mechanics, the required interface contract type names the architecture spec names (without re-defining their internal shapes), and which companion specifications currently attach at this boundary.

| Boundary name | Arch-spec section | Runtime-spec section | Naming owner | Mechanics owner | Named interface contract types | Companion specs that attach |
|---|---|---|---|---|---|---|
| Lifecycle vocabulary | §10.2 | §24.2, §22.1 | Arch-spec: canonical phase names | Runtime-spec: phase implementation, diagnostics, telemetry correlation | Seven phase names: `definition`, `selection`, `derivation`, `compilation`, `provisioning`, `mounting`, `observation` | Runtime realization spec; TBD: deployment spec |
| SDK derivation handoff | §10.4 | §15 | Arch-spec: artifact category names | Runtime-spec: artifact shapes, portability classification, producer/consumer contracts | `NormalizedAuthoringGraph`, `PortableRuntimePlanArtifact`, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `ExecutionDescriptorTable` (non-portable) | Runtime realization spec |
| Runtime compiler | §10.5 | §16 | Arch-spec: compiler role in the chain | Runtime-spec: validation list, CompiledProcessPlan shape, emission contract | `CompiledProcessPlan`, `CompiledExecutionPlan` | Runtime realization spec |
| Bootgraph and provisioning kernel | §10.6 | §17 | Arch-spec: RAWR-vs-Effect control split naming | Runtime-spec: bootgraph ordering, Effect kernel construction, ProvisionedProcess, rollback mechanics | `Bootgraph`, `ProvisionedProcess` | Runtime realization spec |
| Runtime access | §10.8 | §18.1–§18.2 | Arch-spec: runtime access noun taxonomy | Runtime-spec: RuntimeAccess scoping, ProcessRuntimeAccess, RoleRuntimeAccess shapes | `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess` | Runtime realization spec; TBD: observability companion spec |
| Service binding | §10.9 | §18.3–§18.5 | Arch-spec: cache-key exclusion rule | Runtime-spec: ServiceBindingCache mechanics, bindService contract | `ServiceBindingCache`, `ServiceBindingCacheKey` | Runtime realization spec |
| Workflow dispatcher | §10.10 | §19 | Arch-spec: dispatcher role as server-internal→async bridge | Runtime-spec: WorkflowDispatcher materialization, FunctionBundle lowering, async step-local Effect | `WorkflowDispatcher`, `FunctionBundle` | Runtime realization spec |
| Surface adapter lowering | §10.11 | §20 | Arch-spec: adapter layer position in the chain | Runtime-spec: CompiledSurfacePlan → native payload closure contract, SurfaceAdapter interface | `CompiledSurfacePlan`, `SurfaceAdapter` (named only; do not re-define internal shape) | Runtime realization spec; TBD: additional vendor harness specs |
| Harness and native boundary | §10.12 | §21 | Arch-spec: harness role taxonomy and vendor assignments | Runtime-spec: per-harness input/output contracts, HarnessDescriptor mount protocol | `HarnessDescriptor`, `StartedHarness`, per-harness: `FunctionBundle` (Inngest), oRPC route payloads (Elysia), command payloads (OCLIF) | Runtime realization spec; TBD: OpenShell companion spec |
| Control-plane and deployment interface | §15.7 | §15.7, §22.3 | Arch-spec: control-plane boundary rule | Runtime-spec: PortableRuntimePlanArtifact shape and consumers, RuntimeCatalog schema | `PortableRuntimePlanArtifact`, `RuntimeCatalog` | Runtime realization spec; TBD: deployment spec |
| Diagnostics, telemetry, and observation | §10.13 | §22 | Arch-spec: observability construct names | Runtime-spec: RuntimeDiagnostic shape, RuntimeTelemetry chain, RuntimeCatalog minimum sections | `RuntimeDiagnostic`, `RuntimeTelemetry`, `RuntimeCatalog` | Runtime realization spec; TBD: observability companion spec |

#### Companion-spec attachment protocol

A companion subsystem specification that attaches at one or more boundaries in the registry above must follow this protocol:

1. **Reference boundaries by name.** The companion spec must name the boundary using the exact boundary name from the registry table above (e.g., "Surface adapter lowering boundary" or "Harness and native boundary"). It must not invent a new name for a boundary that this registry already names.

2. **Do not re-define named interface contract types.** The companion spec may use the type names listed in the "Named interface contract types" column as opaque references. It must not re-define their internal shapes — those shapes are owned by the mechanics owner (typically the runtime realization specification). A companion harness spec may say "the harness receives a `HarnessDescriptor` and returns a `StartedHarness`" but must not reproduce the field layout of either type.

3. **Do not duplicate scope owned by the mechanics owner.** If the runtime realization specification owns mechanics for a boundary, the companion spec must not include a competing description of how those mechanics work. Linking is correct; copying is not.

4. **Declare reserved detail boundaries at lock time.** If the companion spec intentionally defers a sub-boundary to a future dedicated specification (following the model in runtime-spec §23.5), it must: (a) name the deferred boundary explicitly; (b) state the locked owner and integration hooks; (c) state the trigger condition — the implementation slice that makes the dedicated specification necessary. Reserved detail boundaries are named deferments, not omissions.

5. **Scope language must not claim to "fix" mechanics owned by another spec.** If the arch-spec or a companion spec says it "fixes" a surface, the fixing must be limited to naming, invariants, and integration-boundary vocabulary — not the mechanics of implementation. Mechanics claims must route to the mechanics owner.

6. **The arch-spec's vocabulary governs naming conflicts.** If a companion spec uses a term that this architecture specification has already defined in §3 (Core ontology), the companion spec must use that term with the same meaning or explicitly note a qualified sub-meaning. Companion specs do not redefine the canonical ontology.

#### Worked example: runtime realization specification as canonical companion spec

The runtime realization specification is the canonical worked example of correct companion-spec attachment. It demonstrates correct attachment at every boundary in the registry:

- **Lifecycle vocabulary** — runtime-spec §24.2 uses the identical seven phase names established in arch-spec §10.2, adds per-phase required output, producer, consumer, and gate — extending, not replacing, the arch-spec's phase vocabulary.

- **SDK derivation handoff** — runtime-spec §15 defines `NormalizedAuthoringGraph`, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `PortableRuntimePlanArtifact`, and `ExecutionDescriptorTable`. The arch-spec §10.4 names the artifact categories without re-defining their field shapes. Attachment is correct: arch-spec names the boundary, runtime-spec owns the artifact shapes.

- **Runtime compiler** — runtime-spec §16 defines `CompiledProcessPlan` with its full section breakdown, validation list, and diagnostic codes. Arch-spec §10.5 names the compiler's role and the high-level validation categories. The arch-spec must NOT enumerate the individual validation items (topology/builder agreement, provider coverage, provider dependency closure, etc.) — that list belongs in runtime-spec §16. Correct amended arch-spec posture: "The runtime compiler validates coverage and dependency closure and emits one compiled process plan; the complete validation list and emission contract are defined in the runtime realization specification, §16."

- **Bootgraph and provisioning kernel** — runtime-spec §17 defines bootgraph ordering, the Effect kernel's single managed runtime, rollback-on-failure, and `ProvisionedProcess`. Arch-spec §10.6 names the RAWR-vs-Effect control split: "RAWR plans identity, order, dependency, lifetime, and boundary policy. Effect executes scoped acquisition, release, runtime ownership, and process-local coordination." (arch-spec L1708–L1709). This is the correct naming-level claim; the arch-spec must not enumerate the Effect-internal primitives (queues, pubsub, refs, fibers, semaphores) — those belong in runtime-spec §17.

- **Runtime access** — runtime-spec §18.1–§18.2 defines RuntimeAccess scoping and the three named access handles. Arch-spec §10.8 names the three nouns (RuntimeAccess, ProcessRuntimeAccess, RoleRuntimeAccess) — correct at the naming level.

- **Workflow dispatcher** — runtime-spec §19 defines WorkflowDispatcher materialization, FunctionBundle lowering, and async step-local Effect. Arch-spec §10.10 names the dispatcher as "a live runtime/SDK integration artifact materialized by the process runtime from selected workflow definitions plus the provisioned process async client" — correct naming-level claim, no re-definition of mechanics.

- **Surface adapter lowering** — runtime-spec §20 defines the CompiledSurfacePlan → native payload closure contract. Arch-spec §10.11 states the rule "Surface adapters lower compiled surface plans into native harness-facing payloads... They do not lower raw authoring declarations, SDK graphs, or uncompiled surface plan descriptors directly" — correct boundary statement. Companion spec (runtime-spec) owns the implementation.

- **Harness and native boundary** — runtime-spec §21 defines HarnessDescriptor, StartedHarness, and per-harness input/output contracts for all six harnesses. Arch-spec §10.12 states the rule "Harnesses own native mounting after runtime realization and adapter lowering. They consume mounted surface runtime records and adapter-lowered payloads, then return started harness handles." The arch-spec must additionally name `HarnessDescriptor` and `StartedHarness` as the formal interface types at the boundary (currently absent — see §6.1 of source analysis). Per-role stack diagrams in §13 are correct integration-level depictions.

- **Control-plane and deployment interface** — runtime-spec §15.7 designates `PortableRuntimePlanArtifact` as "consumed by runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints." Arch-spec §15.7 names control-plane boundaries but omits `PortableRuntimePlanArtifact`. Correct attachment requires the arch-spec to add `PortableRuntimePlanArtifact` to its control-plane boundary section as the formal named interface.

- **Diagnostics, telemetry, and observation** — runtime-spec §22 defines `RuntimeDiagnostic`, `RuntimeTelemetry`, `RuntimeCatalog`. Arch-spec §10.13 names all three and defines their arch-spec-level roles. Attachment is already approximately correct; the arch-spec should add a cross-reference pointer to runtime-spec §22 as the owning contract section.

- **Reserved detail boundaries** — runtime-spec §23.5 lists named deferred boundaries (config precedence, provider refresh, call-local memoization, RuntimeCatalog storage, Agent/OpenShell governance, etc.). The arch-spec does not currently acknowledge this protocol. Correct attachment requires arch-spec §10.14 to reference §23.5 as the model for how this companion spec defers sub-boundaries, and to note that future companion specs (deployment, observability, OpenShell) should follow the same model.
```

---

## 5. Edge cases / open questions

**Edge case 1: Where to place the registry — inside §10 vs a new top-level section.**
The locus rationale suggests either §10.14 or a new top-level section (§10A). The case for a new top-level section is that companion specs may attach outside of §10 (e.g., the deployment spec attaches at §14, §15.7; an observability spec attaches at §15.4–§15.5). If the registry lives inside §10, it reads as "runtime companion specs only." A top-level section (e.g., §21 "Companion specifications and integration-boundaries registry," inserted after §20 "Final canonical picture") would be visible to all companion spec types. The case for §10.14 is simplicity — the primary companion spec (runtime realization) attaches primarily at §10 boundaries, and the registry can forward-reference §14 and §15.7 for deployment/control-plane boundaries. Decision: recommend §10.14 with a forward reference noting that future companion specs (deployment, observability) will attach at additional boundaries (§14, §15.7) documented in their respective companion sections. The orchestrator should ask the user whether a top-level section is preferred.

**Edge case 2: Whether to enumerate all six harnesses in the registry row or give them separate rows.**
The current draft merges all six harnesses into one "Harness and native boundary" row with runtime-spec §21 as the owner. Alternative: six rows (one per harness: Elysia, Inngest, OCLIF, Web, Agent/OpenShell, Desktop), each pointing to runtime-spec §21.1–§21.6. The six-row form is more precise for companion harness spec authors (each harness spec knows exactly which row is theirs), but it makes the table long. Decision: keep merged row for now; add note that "§21.1–§21.6 define per-harness contracts; a companion harness spec attaches at the specific §21.x subsection for its harness." This is a judgement call the orchestrator can adjust.

**Edge case 3: Whether PortableRuntimePlanArtifact belongs in the SDK derivation row or the control-plane row.**
`PortableRuntimePlanArtifact` is produced by SDK derivation (§15.7) but consumed by control-plane/deployment touchpoints. It appears in both the "SDK derivation handoff" row (as a produced artifact) and the "Control-plane and deployment interface" row (as the formal interface). This is correct — the same artifact bridges two boundaries. The duplication is intentional and should be preserved in the draft, with a note that it is the bridge artifact connecting SDK derivation to control-plane consumption.

**Edge case 4: The "naming owner" column — does the arch-spec own the phase NAMES or also the phase BOUNDARIES?**
The arch-spec says it "fixes" the runtime realization lifecycle (L17), which suggests it owns not just the names but the boundary conditions of each phase. But per the user heuristic, the runtime spec is authoritative on runtime concerns including phase mechanics. Resolution: the arch-spec owns the canonical phase names and the invariant that there are exactly seven phases (plus finalization as non-phase behavior). The arch-spec does NOT own the triggering conditions, internal sequencing within phases, or diagnostic codes per phase — those belong to the runtime spec. The registry's "naming owner / mechanics owner" column split formalizes this.

**Edge case 5: Should the "attachment protocol" include an explicit prohibition on re-defining arch-spec ontology nouns?**
Currently the protocol rule #6 says "companion specs do not redefine the canonical ontology." This could be more specific: companion specs must not add new lifecycle phases, must not rename canonical role names, must not change the RAWR-vs-Effect control split. The attachment protocol could include a "prohibited actions" list. This would make the protocol more robust but also longer. Recommend: keep the current general form; let the orchestrator decide whether to add a prohibited-actions subsection based on the cross-locus reconcile.

---

## 6. Cross-locus implications

**lifecycle-naming-vs-mechanics-authority:** That locus's output will produce replacement language for arch-spec L9–L22 (softening "fixes the runtime realization lifecycle" to "names the lifecycle phases and boundary vocabulary; defers mechanics to the runtime realization specification"). The registry's "Lifecycle vocabulary" row formalizes exactly this carve-out — the two outputs are complementary and must use consistent language. The registry row should use whatever revised naming comes from that locus's committed position.

**inngest-integration-mode-architecture-level:** That locus will produce an integration-level paragraph about Inngest serve-mode vs connect-worker mode. The registry's "Harness and native boundary" row (and specifically the §21.2 sub-pointer for Inngest) must be consistent with that paragraph. If the Inngest locus recommends naming both modes at the architecture level, the registry's Inngest row should note mode-selection as a profile-level concern (consistent with runtime-spec L4287–L4291).

**harness-mount-interface-contract-named-types:** That locus will produce the actual named types (CompiledSurfacePlan, FunctionBundle, HarnessDescriptor, StartedHarness, oRPC route payloads, command payloads) for each harness. This is exactly what populates the "Named interface contract types" column in the registry's "Harness and native boundary" row. The two loci are tightly coupled: the harness-mount locus produces the type names; the registry locus provides the table that hosts them. Cross-locus reconcile should ensure the type names in this registry match what the harness-mount locus recommends.

**provisioning-kernel-inventory-depth-reduction:** That locus will produce replacement text for arch-spec L1712–L1722 (provisioning kernel primitive list) compressing it into a high-level statement. The registry's "Bootgraph and provisioning kernel" row must be consistent with whatever that locus recommends as the arch-spec-level statement. If the depth-reduction locus produces a one-sentence summary, the registry row's "Named interface contract types" column should point to `Bootgraph` and `ProvisionedProcess` as the named types (already in the draft above) without enumerating Effect internals.

**platform-external-interfaces-table:** That locus will produce a 4-row platform external interfaces table (PortableRuntimePlanArtifact, RuntimeCatalog, RuntimeDiagnostic, RuntimeTelemetry) for arch-spec §15.7 or §10.13. The registry must be consistent: the "Control-plane and deployment interface" and "Diagnostics, telemetry, and observation" rows in the registry should use the same type names and consumer descriptions as that locus's table. The two deliverables are complementary — the registry is higher-level (names the boundary, points to runtime-spec section); the platform-external-interfaces table is lower-level (names each artifact, names consumers). Both should appear in the arch-spec; they don't conflict.

---

## 7. Committed position

The arch-spec needs a NET-NEW section — `§10.14 Companion specifications and integration-boundaries registry` — inserted immediately after §10.13, containing: (1) a formal named pointer to the runtime realization specification as the current canonical companion document; (2) a master registry table of eleven integration boundaries (lifecycle vocabulary, SDK derivation handoff, runtime compiler, bootgraph/kernel, runtime access, service binding, workflow dispatcher, surface adapter lowering, harness/native boundary, control-plane/deployment interface, diagnostics/telemetry/observation) with columns for arch-spec section, runtime-spec section, naming owner, mechanics owner, named interface contract types, and companion-spec consumers; (3) a six-rule attachment protocol that any future companion spec must follow; and (4) a worked example using the runtime realization spec itself as the canonical companion. The registry's shape must be table-primary with per-boundary subsections (hybrid), not table-only, because the attachment protocol and worked example require prose that cannot fit in a table row. The single most important edit to the arch-spec before the registry section is added is upgrading arch-spec L24 from a promise to a pointer: replace "the integration points where deeper subsystem blueprints attach" with "the integration points where deeper subsystem blueprints attach, enumerated in §10.14."

- **Position:** The arch-spec must add a table-primary-with-protocol hybrid NET-NEW section `§10.14 Companion specifications and integration-boundaries registry` immediately after §10.13, and upgrade L24 from a promise to a pointer to that section.
- **Confidence:** high — the gap is unambiguous (no registry exists; the promise is stated at L24 but unoperationalized; the runtime spec is a demonstrable companion with no formal acknowledgment); the shape choice follows directly from the evidence (eleven attachment points are clearly enumerable from runtime-spec §15–§22; hybrid table+protocol is the only shape that serves both scanning and authoring needs; the worked example is grounded in specific runtime-spec line refs).
- **Boundary conditions:** This position applies to the current state of the arch-spec (one companion spec, one in-progress reserved boundary — OpenShell — and several TBD companion specs for deployment and observability). If the platform had zero companion specs in progress, the registry would be premature. If it had five mature companion specs, the registry would need per-companion-spec subsections (not just a "TBD" column). The current state is exactly the right moment to add the registry — one mature companion spec (runtime realization) as the worked example, several TBD.
- **What would change this position:** If the user's intent is for the arch-spec to remain silent on companion spec attachment (i.e., the registry is a runtime-spec concern, not an arch-spec concern), this position would not hold. The user's explicit request — "be explicit about integration points: interfaces, boundaries, conditions, rules — whatever the system needs to make companion subsystem documents plug in cleanly" — strongly implies the arch-spec must own the registry. If the user clarifies that companion spec attachment is a separate governance document's responsibility (not the arch-spec's), the recommendation changes from a new §10.14 to a one-sentence pointer in §10.1 referencing a separate governance document.
- **Evidence weight:** arch-spec L24 (one direct promise requiring operationalization); runtime-spec L1–L5, §15–§22, §23.5, §29 (demonstrable attachment at 11 named boundaries; reserved detail boundary protocol); contradiction-graph clusters `companion-spec-attachment-points-not-enumerated`, `harness-mount-interface-contract-undefined`, `portable-plan-artifact-as-control-plane-interface-missing` (all pointing to the same gap); source-analysis-arch-spec.md §4d, §6.7, §8 (committed position supporting same gap diagnosis). Zero sources contradict the recommendation. The only uncertainty is the shape choice (table-only vs hybrid), which is medium-confidence — both forms would address the gap, but the hybrid form is better evidence-supported given the complexity of the attachment protocol.

**Specific sentence-level wording for arch-spec L24 upgrade:**

Current: "...the integration points where deeper subsystem blueprints attach."

Recommended replacement: "...the integration points where deeper subsystem blueprints attach (enumerated with their attachment protocol in §10.14)."

And, separately, replace the last sentence of §1 (arch-spec L24, full sentence):

Current: "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach."

Recommended replacement: "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at named integration boundaries enumerated in §10.14. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach. The runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`) is the current canonical companion document for all runtime concerns; it is authoritative on mechanics within each integration boundary this specification names."

---

## 8. Open questions

- Should the registry live at §10.14 (inside the runtime realization section) or become a new top-level section after §20 (Final canonical picture), making it visible to all companion spec types including deployment and observability? The §10.14 location keeps it near the lifecycle/runtime content but may be missed by deployment spec authors. A top-level section is more discoverable but disrupts the existing 20-section structure. Recommend user input.

- The "attachment protocol" rule #4 (reserved detail boundaries) references runtime-spec §23.5 as the model. Does the user want the arch-spec to reproduce the reserved detail boundary concept from §23.5, or merely reference it? Reproducing it in the arch-spec would make the protocol self-contained but create mild duplication with the runtime spec. Referencing it keeps the arch-spec lean but requires readers to cross-reference.

- Should the registry's "known companion-spec consumers" column name specific future companion specs (e.g., "TBD: deployment spec," "TBD: OpenShell companion spec") or remain generic ("future companion specs")? Naming specific TBD specs makes the forward-looking nature concrete but creates a maintenance burden.

- The worked example (§10.14 attachment example using the runtime realization spec) mentions several places where the arch-spec is currently incorrect (e.g., §10.5 enumerates the validation list at runtime-internal depth). Should the worked example call out the current arch-spec violations explicitly, or only describe the correct attachment pattern? Calling out violations makes the example more useful as a diff but may be confusing if the draft section is published before the arch-spec amendments are applied.

---

## Sources

1. [[rawr-canonical-architecture-spec-source]] — arch-spec L24, L9–L22, §10.2, §10.4–§10.13, §13, §15.7, §17.12
2. [[rawr-effect-runtime-realization-system-canonical-spec-source]] — runtime-spec L1–L5, L37–L47, §15, §15.7, §16, §17, §18, §19, §20, §21, §22, §23.5, §27, §29
3. [[source-analysis-rawr-canonical-architecture-specification]] — §4d, §6.7, §8 (committed position: structural gap diagnosis)
4. [[source-analysis-rawr-runtime-realization-system-canonical-spec]] — §6 (10 runtime-driven additions), §4.1–§4.15 (integration boundaries the runtime spec exposes)
5. `contradiction-graph.json:companion-spec-attachment-points-not-enumerated`
6. `contradiction-graph.json:harness-mount-interface-contract-undefined`
7. `contradiction-graph.json:portable-plan-artifact-as-control-plane-interface-missing`
8. `contradiction-graph.json:lifecycle-naming-vs-mechanics-authority`
