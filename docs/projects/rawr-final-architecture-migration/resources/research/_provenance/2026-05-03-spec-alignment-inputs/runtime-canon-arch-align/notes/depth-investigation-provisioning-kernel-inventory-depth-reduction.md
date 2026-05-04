---
title: 'Depth investigation: provisioning kernel inventory depth reduction'
id: depth-investigation-provisioning-kernel-inventory-depth-reduction
tags:
- runtime-canon-arch-align
- locus-provisioning-kernel-inventory-depth-reduction
created: '2026-05-02T21:21:21.114659Z'
status: draft
type: interim
deprecated: false
summary: Compress arch-spec §10.4–§10.6 mechanism-level enumerations to integration-level
  statements with cross-references to runtime-spec §15, §16, §14/§17.3; rewrite §17.6
  primitive list as category pointer; preserve RAWR-plans/Effect-executes split verbatim
  as irreducible boundary
---

# Interim report: provisioning-kernel-inventory-depth-reduction

**Locus question:** What is the precise replacement text for arch-spec L1712–L1722 (provisioning kernel primitive list) and L2668–L2678 (bootgraph/provisioning invariants) that compresses runtime-internal detail into a high-level integration statement while preserving the architectural ownership claim?
**Flavor:** technical

---

## 1. Locus Framing

This locus consolidates three contradiction-graph clusters that all express the same underlying failure mode: the canonical architecture spec enumerates mechanism-level lists in §10.4, §10.5, and §10.6 that the runtime realization spec owns at greater authority and depth.

**Cluster 1 — `provisioning-kernel-primitive-inventory`**
Arch-spec L1712–L1722 lists process-local Effect mechanics (queues, pubsub, refs, schedules, caches, fibers, semaphores) as if they are the arch-spec's ownership inventory. Runtime-spec §17.3 (L3719–L3722) classifies these precisely: "Effect local fibers, queues, schedules, pubsub, refs, streams, and caches are process-local runtime mechanics. They do not become durable workflow ownership." The arch-spec is describing at runtime-internal depth what the runtime-spec already owns authoritatively.

**Cluster 2 — `sdk-derivation-artifact-list-depth`**
Arch-spec L1673–L1683 lists 9 artifacts the SDK produces. Runtime-spec §15 (L3213–L3437) defines the actual canonical SDK derivation outputs with named types, portability splits, producers, and consumers. The arch-spec's prose list lacks the `ExecutionDescriptorTable`/portability distinction that the runtime-spec treats as normative (runtime-spec §15.2, L3267–L3270), and uses descriptive labels that diverge from the named types (`NormalizedAuthoringGraph`, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `PortableRuntimePlanArtifact`, etc.).

**Cluster 3 — `runtime-compiler-validation-list-depth`**
Arch-spec L1691–L1713 lists 8 validation checks and 9 emission sections for the runtime compiler. Runtime-spec §16 (L3439–L3621) owns the complete normative compiler contract — inputs, validation rules, outputs, diagnostic codes, and the full `CompiledProcessPlan` type — at exhaustive depth. The arch-spec's list is a stale shadow of what the runtime-spec owns authoritatively.

---

## 2. Irreducible Architecture vs Runtime-Internal Classification

### 2a. §10.4 SDK Derivation (arch-spec L1669–L1685)

| Clause | Classification | Arch-spec line | Runtime-spec line |
|---|---|---|---|
| "The SDK derives explicit artifacts from compact authoring declarations" | **Integration-surface** — names the SDK's architectural role | L1671 | L3233 (complementary) |
| "The SDK does not acquire resources, execute providers, construct managed runtime roots, mount harnesses" | **Integration-surface** — defines what the SDK CANNOT do (boundary rule) | L1685 | L3263 (complementary) |
| 9-item artifact list (normalized authoring graph; canonical identities; resource requirements; normalized provider selections; service binding plans; surface runtime plan descriptors; workflow dispatcher descriptors; portable plan artifacts; derivation diagnostics) | **Runtime-internal depth** — these should be named types not prose labels, and the arch-spec omits the critical portability split (`ExecutionDescriptorTable` is non-portable; only refs are portable, runtime-spec §15.2 L3267) | L1673–L1683 | §15 L3213–L3437 |

**Irreducible ownership claim:** The SDK is the public authoring boundary; SDK output is the input to the runtime compiler. One sentence names the two critical artifact categories: portable plan artifacts (for control-plane/deployment) and a non-portable execution descriptor table (for the process runtime only). Everything else is runtime-spec §15 territory.

### 2b. §10.5 Runtime Compiler (arch-spec L1687–L1715)

| Clause | Classification | Arch-spec line | Runtime-spec line |
|---|---|---|---|
| "turns a normalized authoring graph plus entrypoint selection into one CompiledProcessPlan" | **Integration-surface** — states the compiler's architectural role precisely | L1689 | L3461 (complementary) |
| "does not acquire resources, bind live services, construct native functions, mount harnesses" | **Integration-surface** — boundary rule for the compiler | L1715 | §16 (implicit) |
| 8-item validation list (selected roles/surfaces, topology/builder agreement, provider coverage, provider dependency closure, service dependency closure, service binding DAG shape, harness targets, surface adapter targets) | **Runtime-internal depth** — runtime-spec §16 owns the complete validation rules with diagnostic codes; the arch-spec list is partial and uses different vocabulary | L1691–L1700 | §16 L3623–L3636 |
| 9-item emission list (compiled process plan; provider dependency graph; compiled resource plans; compiled service binding plans; compiled surface plans; compiled workflow dispatcher plans; harness plans; bootgraph input; topology seed; runtime diagnostics) | **Runtime-internal depth** — runtime-spec §16 owns `CompiledProcessPlan` with exact field types; the arch-spec's list is a partial and imprecise shadow | L1702–L1713 | §16 L3491–L3534 |

**Irreducible ownership claim:** The runtime compiler validates coverage and dependency closure against architectural invariants and emits one compiled process plan plus diagnostics. Compilation precedes provisioning; a compilation failure aborts startup before harness mounting. Mechanism and full validation/emission list belong to runtime-spec §16.

### 2c. §10.6 Bootgraph and Provisioning Kernel (arch-spec L1717–L1741)

| Clause | Classification | Arch-spec line | Runtime-spec line |
|---|---|---|---|
| "Bootgraph is the RAWR lifecycle graph above Effect layer composition. It owns stable lifecycle identity, deterministic ordering, dedupe, rollback, reverse finalization order" | **Integration-surface** — irreducible architectural statement about RAWR's control over the lifecycle graph | L1719 | §17.1 L3621 (more detail) |
| "The Effect provisioning kernel is the runtime-owned substrate beneath bootgraph" | **Integration-surface** — places the kernel in the stack | L1721 | §17.3 L3693 |
| RAWR-plans/Effect-executes control split (L1723–L1727) | **Integration-surface — IRREDUCIBLE** — this is the canonical ownership boundary; arch-spec L1726–L1727 must be preserved verbatim | L1726–L1727 | §17.3 L3720 (parallel statement) |
| "one root managed runtime per started process" | **Integration-surface** — single-kernel guarantee; invariant-level claim | L1732 | §17.3 L3697 |
| "process scope and role child scopes" | **Integration-surface** — lifetime-scoping guarantee (ties to §10.7) | L1733 | §17.3 L3720 |
| "resource acquisition and release from compiled provider plans" | **Integration-surface** — states the provisioning mechanism at integration level | L1734 | §17 (general) |
| "config loading, validation, and redaction" | **Integration-surface** — policy guarantee (config is validated/redacted before use) | L1735 | §23.1 L4576 |
| "structured runtime errors" | **Integration-surface** — architectural guarantee that provisioning errors are typed, not raw exceptions | L1736 | §22.4 (diagnostic classes) |
| **"runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores as process-local mechanics"** | **RUNTIME-INTERNAL** — Effect-internal primitives; runtime-spec §17.3 L3722 explicitly classifies these as process-local runtime mechanics owned by Effect; the arch-spec must not enumerate them | L1737 | §17.3 L3722 |
| "runtime annotations, spans, lifecycle telemetry, and provider acquisition telemetry" | Partially integration-surface (telemetry exists), partially runtime-internal (the specific telemetry types are runtime-spec territory) — can be compressed to "lifecycle and provider acquisition telemetry" | L1738 | §22 |
| "reverse-order deterministic disposal" | **Integration-surface** — guaranteed finalization order is an architectural property | L1739 | §17.1 L3718 |
| "Process-local coordination primitives do not become durable workflow ownership" | **Integration-surface** — the non-durability boundary; critical for distinguishing process-local coordination from Inngest | L1741 | §14 L3067 |

**Irreducible ownership claim:** RAWR plans; Effect executes. One root managed runtime per process. Bootgraph: deterministic ordering, dedupe, rollback, reverse finalization. Provisioning kernel: scoped acquisition/release, validated/redacted config, structured runtime errors, lifecycle telemetry, reverse disposal. Process-local coordination is non-durable. The named RAWR-owned coordination resources and the Effect-internal substrate primitives are defined in runtime-spec §14 and §17.3.

### 2d. §17.6 Bootgraph and Provisioning Invariants (arch-spec L2687–L2696)

| Invariant | Classification |
|---|---|
| "bootgraph is process-local only" | **Integration-surface invariant** — keep |
| "bootgraph owns process and role acquisition ordering" | **Integration-surface invariant** — keep |
| "startup failure is fatal for the selected process shape" | **Integration-surface invariant** — keep |
| "rollback applies to already-started components in the failed startup subset" | **Integration-surface invariant** — keep |
| "finalizers run deterministically in reverse order" | **Integration-surface invariant** — keep |
| "each started process owns one root managed runtime" | **Integration-surface invariant** — keep |
| "process, role, invocation, and call-local remain distinct runtime lifetimes" | **Integration-surface invariant** — keep (this is owned by arch-spec §10.7) |
| **"runtime-local queues, pubsub, schedules, refs, fibers, and caches are process-local mechanics"** | **RUNTIME-INTERNAL** — drop and replace with pointer; runtime-spec §14 owns the RAWR-level resources; §17.3 owns the Effect-internal classification |

---

## 3. Draft: Replacement Text for Arch-Spec §10.4 (SDK Derivation, L1669–L1685)

### BEFORE (arch-spec L1669–L1685)

```
### 10.4 SDK derivation

The SDK derives explicit artifacts from compact authoring declarations.

The SDK owns:

- normalized authoring graph;
- canonical identities;
- resource requirements;
- normalized provider selections;
- service binding plans;
- surface runtime plan descriptors;
- workflow dispatcher descriptors;
- portable plan artifacts;
- derivation diagnostics.

The SDK does not acquire resources, execute providers, construct managed runtime roots, construct native harness payloads, mount harnesses, or define native framework semantics.
```

### AFTER (replacement)

```
### 10.4 SDK derivation

The SDK derives structured plan artifacts and an in-process execution descriptor table from compact authoring declarations. SDK derivation is the public authoring boundary: SDK output is the sole input to the runtime compiler.

The SDK does not acquire resources, execute providers, construct managed runtime roots, construct native harness payloads, mount harnesses, or define native framework semantics.

The specific artifact types, their portability classification, and the producer/consumer contract for each artifact are defined in the runtime realization specification, §15.
```

**Preservation rationale:** The replacement keeps the architectural ownership claim ("public authoring boundary; SDK output is the sole input to the runtime compiler"), keeps the what-the-SDK-does-NOT-do boundary rule (integration-surface), and compresses the 9-item prose list to a single sentence naming the two architectural categories (structured plan artifacts + in-process execution descriptor table). The two categories match runtime-spec §15's fundamental portability split. The cross-reference to runtime-spec §15 delegates the named types.

**Note on PortableRuntimePlanArtifact:** The portable plan artifacts category is the integration surface for control-plane/deployment touchpoints (runtime-spec §15.7 L3429–L3455). The arch-spec should also name `PortableRuntimePlanArtifact` in its platform external interfaces table (a separate locus handles this), but it need NOT name it inside §10.4's mechanism description. The single "portable plan artifacts" category word is sufficient here; the named type belongs in the interfaces table.

---

## 4. Draft: Replacement Text for Arch-Spec §10.5 (Runtime Compiler, L1687–L1715)

### BEFORE (arch-spec L1687–L1715)

```
### 10.5 Runtime compiler

The runtime compiler turns a normalized authoring graph plus entrypoint selection into one `CompiledProcessPlan`.

It validates:

- selected roles and surfaces;
- topology and builder agreement;
- provider coverage;
- provider dependency closure;
- service dependency closure;
- service binding DAG shape;
- harness targets;
- surface adapter targets.

It emits:

- compiled process plan;
- provider dependency graph;
- compiled resource plans;
- compiled service binding plans;
- compiled surface plans;
- compiled workflow dispatcher plans;
- harness plans;
- bootgraph input;
- topology seed;
- runtime diagnostics.

The runtime compiler does not acquire resources, bind live services, construct native functions, mount harnesses, or write final runtime catalog state.
```

### AFTER (replacement)

```
### 10.5 Runtime compiler

The runtime compiler consumes SDK-derived artifacts plus the entrypoint's selected app, profile, and harness configuration, validates coverage and dependency closure against architectural invariants, and emits one `CompiledProcessPlan` plus diagnostics.

Compilation precedes provisioning and harness mounting. A compilation failure aborts startup before any resource is acquired.

The runtime compiler does not acquire resources, bind live services, construct native functions, mount harnesses, or write final runtime catalog state.

The complete validation rules, emission contract, and `CompiledProcessPlan` shape are defined in the runtime realization specification, §16.
```

**Preservation rationale:** The replacement keeps: (a) the architectural chain ("consumes SDK-derived artifacts"), (b) the high-level function ("validates coverage and dependency closure"), (c) the critical lifecycle invariant ("compilation precedes provisioning; failure aborts startup before any resource is acquired"), and (d) the what-the-compiler-does-NOT-do boundary rule. The 8-item validation list and 9-item emission list are compressed to a summary phrase and delegated to runtime-spec §16. The named type `CompiledProcessPlan` is preserved because it names the integration handoff artifact (bootgraph and process runtime consume it — arch-spec L1656).

---

## 5. Draft: Replacement Text for Arch-Spec §10.6 (Bootgraph and Provisioning Kernel, L1717–L1741)

### BEFORE (arch-spec L1717–L1741)

```
### 10.6 Bootgraph and provisioning kernel

Bootgraph is the RAWR lifecycle graph above Effect layer composition. It owns stable lifecycle identity, deterministic ordering, dedupe, rollback, reverse finalization order, and typed context assembly for process and role lifetimes.

The Effect provisioning kernel is the runtime-owned substrate beneath bootgraph.

The control split is fixed:

```text
RAWR plans identity, order, dependency, lifetime, and boundary policy.
Effect executes scoped acquisition, release, runtime ownership, and process-local coordination.
```

The provisioning kernel owns:

- one root managed runtime per started process;
- process scope and role child scopes;
- resource acquisition and release from compiled provider plans;
- config loading, validation, and redaction;
- structured runtime errors;
- runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores as process-local mechanics;
- runtime annotations, spans, lifecycle telemetry, and provider acquisition telemetry;
- reverse-order deterministic disposal.

Process-local coordination primitives do not become durable workflow ownership.
```

### AFTER (replacement)

```
### 10.6 Bootgraph and provisioning kernel

Bootgraph is the RAWR lifecycle graph above Effect layer composition. It owns stable lifecycle identity, deterministic ordering, dedupe, rollback, reverse finalization order, and typed context assembly for process and role lifetimes.

The Effect provisioning kernel is the runtime-owned substrate beneath bootgraph.

The control split is fixed:

```text
RAWR plans identity, order, dependency, lifetime, and boundary policy.
Effect executes scoped acquisition, release, runtime ownership, and process-local coordination.
```

The provisioning kernel owns one root managed runtime per started process; process and role lifetime scopes; scoped resource acquisition and release from compiled provider plans; validated and redacted config loading; structured runtime errors; lifecycle and provider acquisition telemetry; and reverse-order deterministic disposal.

Process-local coordination is not durable workflow ownership. The named RAWR-owned process-local coordination resources and the Effect-internal substrate primitives they wrap are defined in the runtime realization specification, §14 and §17.3.
```

**Preservation rationale:** The replacement:
- **Preserves verbatim** the RAWR-plans/Effect-executes control-split text block (arch-spec L1726–L1727) — this is the irreducible architectural statement
- **Preserves** "one root managed runtime per started process" (single-kernel guarantee)
- **Preserves** the high-level provisioning kernel ownership in compressed prose: scoped acquisition/release, validated/redacted config, structured errors, telemetry, reverse disposal
- **Removes** the primitive enumeration "queues, pubsub, refs, schedules, caches, fibers, and semaphores" — delegating to runtime-spec §14 (RAWR-owned resources) and §17.3 (Effect-internal substrate)
- **Preserves** the non-durability boundary ("Process-local coordination is not durable workflow ownership") — rephrased for clarity
- **Adds** an explicit cross-reference to runtime-spec §14 and §17.3

---

## 6. Draft: Replacement Text for Arch-Spec §17.6 (Bootgraph and Provisioning Invariants, L2687–L2696)

### BEFORE (arch-spec L2687–L2696)

```
### 17.6 Bootgraph and provisioning invariants

- bootgraph is process-local only;
- bootgraph owns process and role acquisition ordering;
- startup failure is fatal for the selected process shape;
- rollback applies to already-started components in the failed startup subset;
- finalizers run deterministically in reverse order;
- each started process owns one root managed runtime;
- process, role, invocation, and call-local remain distinct runtime lifetimes;
- runtime-local queues, pubsub, schedules, refs, fibers, and caches are process-local mechanics.
```

### AFTER (replacement)

```
### 17.6 Bootgraph and provisioning invariants

- bootgraph is process-local only;
- bootgraph owns process and role acquisition ordering;
- startup failure is fatal for the selected process shape;
- rollback applies to already-started components in the failed startup subset;
- finalizers run deterministically in reverse order;
- each started process owns one root managed runtime;
- process, role, invocation, and call-local remain distinct runtime lifetimes;
- RAWR-owned process-local coordination resources are defined in the runtime realization specification, §14; their underlying Effect-internal primitives are runtime substrate detail and are not enumerated in this invariant set.
```

**Preservation rationale:** Six of the seven original invariants are unchanged (they are all integration-surface). The eighth invariant ("runtime-local queues, pubsub, schedules, refs, fibers, and caches are process-local mechanics") is replaced by a statement that:
- Acknowledges the category exists (RAWR-owned process-local coordination resources)
- Delegates the enumeration to runtime-spec §14
- Explicitly classifies Effect-internal primitives as runtime substrate detail not subject to enumeration at this level

This change removes the staleness vector: if the runtime-spec evolves its coordination resource set, the arch-spec invariant cannot become stale because it no longer lists specifics.

---

## 7. Should the Arch-Spec Name the Four Coordination Resources?

**Committed judgement: NO — do not name ProcessQueueHubResource and siblings in arch-spec §10.6 or §17.6.**

**Reasoning:**

The four named RAWR-owned coordination resources — `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource` — are runtime-spec §14 entities. They are RAWR-owned first-class resources with specific type shapes, use patterns, and forbidden responsibilities that the runtime-spec owns at normative depth (runtime-spec §14.1–§14.5, L3065–L3229). Naming them in the arch-spec would create exactly the depth problem this locus is resolving: the arch-spec would then need to define what they are, or risk being incomplete relative to the runtime-spec.

What the arch-spec SHOULD acknowledge (and the AFTER text above does) is the *category*: "process-local coordination resources" as a named class of RAWR-owned resources, with the non-durability boundary rule. This gives companion-spec authors the concept and the boundary without enumerating the specific resource names.

**Exception:** If the platform-external-interfaces-table locus (a sibling locus in this pipeline) determines that the arch-spec needs to list `PortableRuntimePlanArtifact` and `RuntimeCatalog` as the platform's formal external interfaces, those should appear in the interfaces table (arch-spec §15.7 or a new §10.13-adjacent section), NOT in §10.4 or §10.6. That is the separate locus's deliverable.

---

## 8. Cross-Locus Implications

### Interaction with lifecycle-naming-vs-mechanics-authority

That locus establishes the principle: the arch-spec owns canonical NAMES and integration-boundary vocabulary; the runtime-spec owns mechanics within each phase. This locus implements that principle for §10.4–§10.6. The AFTER texts above compress mechanism lists to integration-level statements and add cross-references. The revised §10.6 text is the proof-of-concept for what "name the lifecycle and its boundaries; defer mechanics to runtime-spec" looks like in practice.

Specifically: the RAWR-plans/Effect-executes split (arch-spec L1726–L1727) is the canonical name for the lifecycle ownership boundary. The arch-spec owns that sentence. The runtime-spec §17.3 owns what "Effect executes" means in terms of actual primitives (`ManagedRuntime`, `Scope`, `FiberRef`, fibers, queues, etc.).

### Interaction with platform-external-interfaces-table

The §10.4 AFTER text replaces the 9-item artifact list with a one-sentence description of two categories ("structured plan artifacts and an in-process execution descriptor table"). The `PortableRuntimePlanArtifact` name and its role as the deployment/control-plane touchpoint surface are NOT dropped from the arch-spec — they need to be surfaced in the platform-external-interfaces-table (arch-spec §15.7 or new section). That locus handles the naming of `PortableRuntimePlanArtifact` and `RuntimeCatalog` as formal external interfaces. This locus only ensures §10.4 no longer carries a redundant and imprecise mechanism-level list.

---

## Evidence Synthesis

The evidence from the three source documents converges without ambiguity. The arch-spec's §10.4–§10.6 lists are mechanism-level inventories written at a depth the runtime-spec owns more precisely and authoritatively. The contradiction-graph clusters are correctly identified: all three (sdk-derivation-artifact-list-depth, runtime-compiler-validation-list-depth, provisioning-kernel-primitive-inventory) resolve under the user heuristic ("for runtime concerns, runtime-spec is authoritative").

The critical finding is the two-tier classification in runtime-spec §17.3: Effect-internal primitives (fibers, queues, schedules, pubsub, refs, streams, caches) are "process-local runtime mechanics" the kernel WRAPS, not a RAWR vocabulary the arch-spec should enumerate. The arch-spec's §10.6 and §17.6 are at precisely the wrong level: they enumerate the wrapped primitives as if they are a RAWR-owned vocabulary list, which they are not (they are Effect's implementation detail). Runtime-spec §14 defines the four RAWR-owned coordination resources, which is the integration-level vocabulary.

The irreducible architecture for §10.6 is the control split ("RAWR plans; Effect executes"), the single-kernel guarantee ("one root managed runtime per process"), and the high-level provisioning lifecycle guarantees (scoped acquisition/release, validated config, structured errors, deterministic disposal). These do NOT change when the runtime-spec evolves its coordination resource catalogue or Effect version. The primitive list in §10.6 and §17.6 is precisely what would go stale.

---

## Committed Position

The arch-spec §10.4, §10.5, and §10.6 are each enumerated at runtime-internal depth that the runtime-spec owns with greater authority and precision. The fix is surgical and non-controversial: compress each section's enumeration to an integration-level summary statement (preserving the irreducible ownership claim and any boundary rules), add a one-sentence cross-reference to the corresponding runtime-spec section, and restate the §17.6 invariant about process-local primitives as a category pointer rather than a named list. No architectural ownership is surrendered by this compression: the arch-spec retains the RAWR-plans/Effect-executes split, the single-managed-runtime-per-process guarantee, and the non-durability boundary. What it gives up is the responsibility to track which specific primitives Effect provides internally — responsibility it should never have claimed in the first place, because those primitives are Effect-version-dependent and RAWR-version-independent.

- **Position:** Compress arch-spec §10.4, §10.5, and §10.6 mechanism-level enumerations to integration-level summary statements with cross-references to runtime-spec §15, §16, and §14/§17.3 respectively; rewrite arch-spec §17.6's primitive list as a category pointer to runtime-spec §14.
- **Confidence:** High (>85%) — all three clusters resolve cleanly under the user heuristic; the runtime-spec's two-tier classification (RAWR-owned resources in §14 vs Effect-internal in §17.3) precisely targets what the arch-spec is conflating; the irreducible ownership claims are unambiguously identifiable.
- **Boundary conditions:** This position applies to arch-spec §10.4, §10.5, §10.6, and §17.6 specifically. The RAWR-plans/Effect-executes control-split text (arch-spec L1726–L1727) must be preserved verbatim — it is not a mechanism list, it is the irreducible architectural boundary statement. The four named coordination resources (`ProcessQueueHubResource` and siblings) must NOT be added to the arch-spec — they belong exclusively to runtime-spec §14. Outside §10 and §17.6, the arch-spec does not enumerate similar mechanism-level lists, so no additional sections require this treatment under this locus.
- **What would change this position:** If the runtime-spec's §14 or §17.3 were found to be incomplete or non-normative (e.g., the four resources had been deprecated and no replacement was named), then the arch-spec's list might be the only remaining authority, and removing it would create a vacuum. This is not the case: runtime-spec §14.1–§14.5 is fully normative (code blocks are marked "Exactness: normative for process-local [semantics]"). If the user explicitly decides the arch-spec should enumerate RAWR-owned coordination resources by name (accepting the maintenance burden), the §17.6 replacement should add the four names while still delegating their shapes to runtime-spec §14.
- **Evidence weight:** 3 contradiction-graph clusters directly support this position; source-analysis-arch-spec §5.1–§5.3 independently identifies all three as duplication risks; source-analysis-runtime-spec §5 (items 6–8: NormalizedAuthoringGraph breakdown, CompiledProcessPlan section breakdown, BootResourceModule fields) confirms these are runtime-internal concepts the arch-spec must not duplicate; 0 counter-evidence.

---

## Open Questions

- The arch-spec §10.4 lifecycle table (L1651–L1659) row for "Derivation" lists artifacts using prose labels. Should the lifecycle table itself be updated to use the runtime-spec type names (`NormalizedAuthoringGraph`, `PortableRuntimePlanArtifact`) at the integration level? This is a minor amendment the orchestrator may want to evaluate — the table is integration-level by design but currently uses inconsistent vocabulary relative to runtime-spec §15.
- The arch-spec §10.2 lifecycle table producer for the Derivation row says "`@rawr/sdk`" — is this the right integration-level name? Runtime-spec §15 refers to "SDK derivation" as the phase. This is consistent. No change needed, but worth flagging.
- Should the compressed §10.5 text preserve `CompiledProcessPlan` as a named integration artifact (as proposed in the AFTER text), or should that name also be delegated to the cross-reference? Judgement: the named type should be preserved in the arch-spec because it is the handoff artifact between phases (bootgraph and process runtime consume it — arch-spec L1656), and companion specs need to reference it by name at the integration level.

---

## Sources

1. [[source-analysis-rawr-canonical-architecture-specification]] — arch-spec §5.1 (provisioning kernel inventory duplication, L1712–L1722), §5.2 (compiler validation list duplication, L1673–L1695), §5.3 (SDK artifact list duplication, L1655–L1665), §3 (§10 per-section judgements)
2. [[source-analysis-rawr-runtime-realization-system-canonical-spec]] — runtime-spec §14 (process-local coordination resources, L3047–L3211), §15 (SDK derivation, L3213–L3437), §16 (runtime compiler, L3439–L3617), §17.3 (Effect provisioning kernel, L3693–L3722), §5 (runtime-internal concepts arch-spec must not duplicate)
3. [[rawr-canonical-architecture-spec-source]] — direct reading of arch-spec L1669–L1741 (§10.4–§10.7), L2687–L2696 (§17.6)
4. [[rawr-effect-runtime-realization-system-canonical-spec-source]] — direct reading of runtime-spec L3065–L3229 (§14), L3231–L3455 (§15), L3457–L3621 (§16), L3693–L3748 (§17.3–§17.4)
5. `contradiction-graph.json` clusters: `provisioning-kernel-primitive-inventory`, `sdk-derivation-artifact-list-depth`, `runtime-compiler-validation-list-depth`
