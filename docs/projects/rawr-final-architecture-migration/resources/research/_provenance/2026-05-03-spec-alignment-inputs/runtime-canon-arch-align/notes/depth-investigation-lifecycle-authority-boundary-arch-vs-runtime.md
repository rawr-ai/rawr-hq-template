---
title: 'Depth investigation: lifecycle authority boundary (arch vs runtime)'
id: depth-investigation-lifecycle-authority-boundary-arch-vs-runtime
tags:
- runtime-canon-arch-align
- locus-lifecycle-naming-vs-mechanics-authority
created: '2026-05-02T21:20:05.335758Z'
status: draft
type: interim
deprecated: false
summary: Arch-spec must reword L9-L22 to split 'fixes the runtime realization lifecycle'
  into vocabulary ownership (arch-spec) vs mechanics authority (runtime-spec), with
  explicit named cross-reference; downstream §10.4, §10.5, §10.6, §17.6 must compress
  runtime-internal enumerations; new §4.3a principle statement formalizes the carve-out.
---

# Interim report: lifecycle-naming-vs-mechanics-authority

**Locus question:** Where exactly does the architecture spec's authority end and the runtime realization spec's authority begin on lifecycle, substrate, and process-local mechanics — and what is the precise scope-language rewrite the arch-spec needs at L9-L22 to formalize that boundary?
**Flavor:** dialectical

---

## What the corpus already said

Before this investigation, the loci-analyst had identified the core tension precisely: arch-spec L9-L22 lists "the runtime realization lifecycle" (L17) and "the process-local runtime substrate" (L12) as things it "fixes," while runtime-spec L1-L5 declares canonical authority over the full runtime realization scope including "bootgraph ordering, Effect-backed provisioning and process-local execution, process runtime binding, process execution, adapter lowering, harness mounting, diagnostics, telemetry, and deterministic finalization." The contradiction-graph cluster `lifecycle-naming-vs-mechanics-authority` [[rawr-canonical-architecture-spec-source]] noted this is "genuine but resolvable" under a names-vs-mechanics carve-out, but concluded that the user heuristic only tells us WHICH spec wins the mechanics dispute — it does NOT tell us WHAT the arch-spec must say instead. The source analysis [[source-analysis-rawr-canonical-architecture-specification]] §1 confirmed that the arch-spec's scope statement "claims this as its own territory" on both points, and that "the runtime realization spec asserts canonical authority over runtime realization (runtime-spec L1-L5) and explicitly supersedes older documents (runtime-spec L5)." Three adjacent clusters (`provisioning-kernel-primitive-inventory`, `sdk-derivation-artifact-list-depth`, `runtime-compiler-validation-list-depth`) each show the same pattern downstream of the root scope claim: the arch-spec asserts at runtime-internal depth in §10.4, §10.5, §10.6, and §17.6 because the scope claim at L9-L22 licenses it to do so.

---

## What the new sources say

This locus is closed-corpus: both specs are fully indexed and no external fetches are needed or budgeted. All evidence below is drawn from direct line references in the two canonical spec sources.

**Arch-spec source [[rawr-canonical-architecture-spec-source]]:**

L9-L22 (the "It fixes" list, verbatim):
- "the durable ontology" (L9)
- "the semantic authoring model" (L10)
- "the package, resource, service, plugin, app, SDK, compiler, bootgraph, process runtime, adapter, harness, diagnostics, and topology seams" (L11)
- "the role and surface model" (L12)
- "the service-boundary and runtime-resource ownership model" (L13)
- "the public SDK posture" (L14)
- "the app composition and entrypoint model" (L15)
- **"the runtime realization lifecycle"** (L17) — the contested claim
- **"the process-local runtime substrate"** (L18) — the contested claim
- "the relationship between the `agent` role and the `async` role" (L19)
- "the operational mapping on service-centric platforms" (L20)
- "the default topology and growth model" (L21)
- "the enforcement orientation" (L22)

L24: "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach."

§4.3 (L447-L476) contains the concrete process stack:
```
entrypoint -> @rawr/sdk derivation -> runtime compiler -> bootgraph -> Effect provisioning kernel -> process runtime -> surface adapters -> harnesses -> process -> machine
```
This is an integration-level diagram, not a mechanics description — it shows the chain without internals.

§10.6 (L1719-L1739) lists what the provisioning kernel owns, including: "runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores as process-local mechanics." This is the load-bearing contested text — it enumerates Effect-internal substrate primitives at a depth the runtime spec explicitly claims.

§17.6 (L2689-L2696) repeats in invariant form: "runtime-local queues, pubsub, schedules, refs, fibers, and caches are process-local mechanics." Same depth problem in invariant form.

**Runtime-spec source [[rawr-effect-runtime-realization-system-canonical-spec-source]]:**

L1-L5: "Status: Canonical / Scope: Runtime realization, selected authoring declarations, SDK derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning and process-local execution, process runtime binding, process execution, adapter lowering, harness mounting, diagnostics, telemetry, and deterministic finalization / Authority note: once locked, this document supersedes older indexed runtime/effect documents for runtime realization."

L10-L12: "Runtime realization makes execution explicit without creating a second public semantic architecture. It owns the bridge from selected declarations to a running process. It does not own service domain authority, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors." — This is the runtime-spec's own self-limiting statement, showing what it explicitly excludes.

L37-L47 (execution ownership law): "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe."

§14 (L3047-L3211): Defines exactly FOUR named process-local coordination resources: `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource` — replacing the arch-spec's informal list of "queues, pubsub, refs, schedules, caches, fibers, and semaphores."

§17.3 (L3675-L3703): "The Effect provisioning/execution kernel creates one root managed runtime per started process." Defines `ProvisionedProcess` precisely. L3703-L3704 treats Effect-internal primitives (fibers, refs, etc.) as "process-local runtime mechanics" the kernel WRAPS — not a vocabulary the arch-spec should be enumerating.

§29 (L5260-L5264): "once locked, this document supersedes older indexed runtime/effect documents for runtime realization."

---

## Evidence synthesis

### Position A: Arch-spec asserts wider authority — the strongest case

The arch-spec's scope claim at L9-L22 is doing important architectural work that would be lost if softened carelessly. The claim to "fix the runtime realization lifecycle" is not merely semantic overreach — it is the arch-spec's mechanism for asserting that the 7-phase lifecycle (`definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`) is an ARCHITECTURAL invariant, not a runtime implementation detail that could change between versions. If the arch-spec merely "references" the lifecycle rather than "fixes" it, the lifecycle becomes a runtime concern that the runtime spec could change unilaterally — potentially invalidating the arch-spec's §4.3 process stack diagram, its §10.2 lifecycle table (L1651-L1659), its §17.8 invariants, and every downstream companion spec that cites lifecycle phase names. The arch-spec is the document that makes phase names durable vocabulary. The runtime spec's own §22.1 uses these exact phase names for `RuntimeDiagnostic` phase classification — meaning the runtime spec IS consuming the arch-spec's vocabulary, even if the runtime spec claims to "own" the lifecycle.

Similarly, the claim to "fix the process-local runtime substrate" at L18 is the arch-spec's basis for §4.3's "Effect provisioning kernel" entry in the process stack, for §10.6's RAWR-vs-Effect control split ("RAWR plans identity, order, dependency, lifetime, and boundary policy. Effect executes scoped acquisition, release, runtime ownership, and process-local coordination" — L1725-L1728), and for §17.6's invariants. These are integration-level claims: they tell companion spec authors WHICH layer owns process-local execution, even if they don't describe HOW that layer works internally. Softening these claims risks making the arch-spec's integration contracts feel tentative — companion spec authors need to know the substrate is Effect-backed as an invariant, not merely as a current runtime implementation choice.

The cost of softening: if the arch-spec rewrites L17 and L18 to say merely "names and defers to," the lifecycle phases and substrate choice become runtime-spec-internal decisions that could evolve separately from the arch-spec's integration model. This is politically uncomfortable because the arch-spec is supposed to be the durable document.

### Position B: Runtime-spec asserts canonical mechanics — the strongest case

The runtime-spec's supersession claim (L5) is unambiguous: "once locked, this document supersedes older indexed runtime/effect documents for runtime realization." The scope declaration (L1-L4) explicitly covers "bootgraph ordering, Effect-backed provisioning and process-local execution, process runtime binding, process execution, adapter lowering, harness mounting." These are not "runtime concerns adjacent to the lifecycle" — they ARE the lifecycle's mechanical execution. Under the user's stated heuristic, the runtime spec wins on all of these.

The critical problem with the arch-spec's current L9-L22 language is not that it names the lifecycle (appropriate) — it is that the word "fixes" implies the arch-spec is the source of truth for the lifecycle's definition, not merely the place where lifecycle phase names are published for integration vocabulary purposes. The runtime-spec §22.1 defines the canonical `RuntimeDiagnostic` phase enum — which is the actual authoritative enumeration. The arch-spec's L1651-L1659 lifecycle table has a "Producer" and "Consumer" column — that table is not authoring the lifecycle, it is describing the integration handoffs. But the scope claim at L17 says the arch-spec "fixes" the lifecycle, which is a stronger claim than the table's actual content supports.

More concretely: the runtime-spec §14 defines EXACTLY FOUR named process-local coordination resources (`ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource`). The arch-spec §10.6 (L1737) lists "queues, pubsub, refs, schedules, caches, fibers, and semaphores" — an informal enumeration that is both imprecise (mixing RAWR-owned coordination resources with Effect-internal substrate primitives) and stale-prone. If the runtime-spec adds or renames coordination resources, the arch-spec's enumeration silently becomes wrong. This is the exact staleness risk the user's query is asking to eliminate.

The cost of NOT softening: the arch-spec's current depth on runtime mechanics creates a silent staleness vector. When the runtime-spec evolves (adding named coordination resources, changing Effect kernel internals, adding sub-phases to provisioning), the arch-spec does not update atomically. The arch-spec becomes a third source of truth for runtime internals — behind the runtime-spec and (eventually) the implementation itself. Companion spec authors who read only the arch-spec will operate on stale runtime models.

Additionally: the arch-spec currently never names the runtime realization specification by reference (confirmed by source analysis). L24 says "Subsystem specifications attach to it at explicit integration boundaries" — but there is no pointer to the runtime spec. This means the arch-spec is asserting runtime mechanics WITHOUT acknowledging the document that actually owns those mechanics. This is architecturally inconsistent with the user's intent that the arch-spec be the "core integration document that explains how the entire platform works at a system level."

---

## Resolution under the user heuristic

The user heuristic ("runtime realization specification is authoritative on runtime concerns") resolves the following clearly:

**Resolved by the heuristic:**
- Who owns the mechanics of each lifecycle phase: runtime-spec wins
- Who owns the Effect kernel internals (fibers, refs, semaphores, etc.): runtime-spec wins
- Who owns the named process-local coordination resource catalogue (`ProcessQueueHubResource` and siblings): runtime-spec wins
- Who owns the SDK derivation artifact contract (`NormalizedAuthoringGraph`, `ExecutionDescriptorTable`, etc.): runtime-spec wins
- Who owns the runtime compiler's validation list and emission contract: runtime-spec wins

**NOT resolved by the heuristic — requires explicit scope-language rewrite:**
- What words should the arch-spec use instead of "fixes the runtime realization lifecycle" to accurately describe what the arch-spec owns (the canonical phase names and integration-boundary vocabulary) while deferring mechanics?
- What words should the arch-spec use instead of "fixes the process-local runtime substrate" to accurately describe the substrate naming boundary while deferring its internal composition?
- Does the arch-spec retain authority over the RAWR-vs-Effect control split statement (L1725-L1728) — since this IS an integration-level claim, not a mechanics claim?
- How should arch-spec §10.6, §10.4, §10.5, and §17.6 be reworded to compress runtime-internal enumerations into high-level integration statements with cross-references to the runtime spec?
- Does arch-spec L24's "subsystem specifications attach at explicit integration boundaries" require naming the runtime realization specification explicitly to be logically consistent?

**My answer to the unresolved part:** The arch-spec must reword L9-L22 to formalize a names-vs-mechanics carve-out. The specific wording matters: the arch-spec retains authority over canonical NAMES and integration-boundary VOCABULARY (the phase names, the substrate name "Effect-backed," the control-split statement); the runtime-spec retains authority over MECHANICS within each phase (what happens inside compilation, what the provisioning kernel does internally, what coordination resources exist). This carve-out is compatible with both specs' scope claims and resolves the silent staleness problem.

---

## Draft: precise scope-language rewrite for arch-spec L9-L22

**BEFORE (current arch-spec L9-L22):**

```text
It fixes:

- the durable ontology;
- the semantic authoring model;
- the package, resource, service, plugin, app, SDK, compiler, bootgraph, process runtime, adapter, harness, diagnostics, and topology seams;
- the role and surface model;
- the service-boundary and runtime-resource ownership model;
- the public SDK posture;
- the app composition and entrypoint model;
- the runtime realization lifecycle;
- the process-local runtime substrate;
- the relationship between the `agent` role and the `async` role;
- the operational mapping on service-centric platforms;
- the default topology and growth model;
- the enforcement orientation.
```

**AFTER (proposed replacement for arch-spec L9-L22):**

```text
It fixes:

- the durable ontology;
- the semantic authoring model;
- the package, resource, service, plugin, app, SDK, compiler, bootgraph, process runtime, adapter, harness, diagnostics, and topology seams;
- the role and surface model;
- the service-boundary and runtime-resource ownership model;
- the public SDK posture;
- the app composition and entrypoint model;
- the canonical lifecycle phase vocabulary and integration-boundary handoffs for runtime realization
  (definition → selection → derivation → compilation → provisioning → mounting → observation);
  phase mechanics, sub-sequencing, artifact shapes, and substrate internals are defined in the
  canonical runtime realization specification (RAWR_Effect_Runtime_Realization_System_Canonical_Spec);
- the canonical name and ownership split of the process-local runtime substrate
  (RAWR plans identity, order, dependency, lifetime, and boundary policy;
  Effect executes scoped acquisition, release, runtime ownership, and process-local coordination);
  substrate internals, named coordination resources, and kernel mechanics are defined in the
  canonical runtime realization specification;
- the relationship between the `agent` role and the `async` role;
- the operational mapping on service-centric platforms;
- the default topology and growth model;
- the enforcement orientation.
```

**Rationale for each change:**
1. "the runtime realization lifecycle" → "the canonical lifecycle phase vocabulary and integration-boundary handoffs for runtime realization" — preserves the arch-spec's ownership of the phase NAMES and the producer/consumer handoff table (§10.2), but removes the implication that the arch-spec is the source of truth for mechanics.
2. Added the lifecycle phase sequence inline — ensures the arch-spec retains visible canonical ownership of phase names.
3. Added explicit deference sentence with runtime spec name — closes the gap identified in L24 (companion specs attach at integration boundaries, but the runtime spec is never named).
4. "the process-local runtime substrate" → "the canonical name and ownership split of the process-local runtime substrate" — preserves the RAWR-vs-Effect control split statement (the most load-bearing integration claim in §10.6), but removes the implication that the arch-spec owns the substrate internals.
5. Added the control split inline — keeps "RAWR plans identity, order... Effect executes..." visible in scope, since this IS an integration claim, not a runtime mechanics claim.
6. Added deference sentence for substrate internals, naming the runtime spec explicitly.

---

## Draft: principle statement

**Proposed addition to arch-spec §4.3 (Stable architecture versus runtime realization) or as a new §4.3a:**

> **Names-versus-mechanics carve-out.** The canonical architecture specification owns the durable integration vocabulary for runtime realization: the lifecycle phase names, the canonical RAWR-vs-Effect control split, the role and surface taxonomy, and the producer/consumer handoff contract at each phase boundary. It does not own the mechanics within each phase — phase implementation, sub-sequencing, artifact type shapes, named substrate primitives, and kernel internals are owned by the canonical runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`). When a companion subsystem specification needs to understand what a lifecycle phase does, the arch-spec provides the boundary vocabulary; the runtime spec provides the contract. A change to mechanics within a phase does not require updating the arch-spec; a change to phase names, their order, or their integration handoffs requires updating both specifications in concert.

This principle can be placed in §4.3 (which already draws the stable-architecture vs. runtime-realization distinction, L447-L476) as a terminal paragraph, or added as a new §4.3a. It should be cited whenever arch-spec sections compress runtime-internal detail (§10.6, §10.4, §10.5, §17.6) to explain why the compression is correct.

---

## Audit list: every other arch-spec section requiring follow-on language tightening

The following arch-spec sections contain language that asserts at runtime-internal depth and must be tightened to respect the names-vs-mechanics principle. Each entry names the section, the current problem, and the required change.

**1. §10.4 SDK derivation (L1669-L1685) — artifact list compression**
Current: Lists 9 SDK-owned artifacts by prose description ("normalized authoring graph; canonical identities; resource requirements; normalized provider selections; service binding plans; surface runtime plan descriptors; workflow dispatcher descriptors; portable plan artifacts; derivation diagnostics").
Problem: The runtime-spec §15 names these artifacts precisely with portability classification (`ExecutionDescriptorTable` is non-portable; refs only are portable via `PortableRuntimePlanArtifact`) — distinctions the arch-spec list loses.
Required change: Replace L1675-L1684 artifact list with: "The SDK derives portable plan artifacts and a non-portable execution descriptor table, together with the normalized authoring graph, service binding plans, surface runtime plans, and workflow dispatcher descriptors consumed by the runtime compiler. The complete artifact catalogue and portability classification are defined in the canonical runtime realization specification, §15."

**2. §10.5 Runtime compiler (L1687-L1715) — validation and emission list compression**
Current: Lists 8 validation items (L1691-L1700) and 9 emission items (L1703-L1713).
Problem: Runtime-spec §16 defines the actual compiler inputs, validation rules, and output (`CompiledProcessPlan` with named sections) at greater precision. The arch-spec's list is partially stale (missing `ExecutionDescriptorTable` availability as a compiler input, missing named output sections like `executionPlans`, `executionRegistryInput`, `bootgraphInput`, `topologySeed`).
Required change: Compress L1691-L1713 to: "The runtime compiler consumes SDK-derived artifacts and the entrypoint's selected app, profile, and roles; validates provider coverage, dependency closure, service binding DAG shape, topology and builder agreement, and harness targets against the canonical invariants; and emits one compiled process plan plus diagnostics. The complete input contract, validation list, and compiled plan shape are defined in the canonical runtime realization specification, §16. The compiler does not acquire resources, bind live services, construct native functions, mount harnesses, or write final runtime catalog state."

**3. §10.6 Bootgraph and provisioning kernel (L1717-L1741) — primitive enumeration compression**
Current: Provisioning kernel ownership list at L1730-L1739 includes "runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores as process-local mechanics."
Problem: This enumeration mixes RAWR-owned coordination resources (named precisely in runtime-spec §14 as four `ProcessXxxHubResource` types) with Effect-internal substrate primitives (fibers, refs, semaphores). The arch-spec's informal list is both imprecise and stale-prone.
Required change: Replace L1730-L1739 with: "The provisioning kernel owns one root managed runtime per started process; process scope and role child scopes; resource acquisition and release from compiled provider plans; config loading, validation, and redaction; structured runtime errors; a named catalogue of process-local coordination resources; runtime annotations, spans, lifecycle telemetry, and provider acquisition telemetry; and reverse-order deterministic disposal. The named process-local coordination resource catalogue and Effect-internal substrate primitives are defined in the canonical runtime realization specification, §14 and §17."

**4. §17.6 Bootgraph and provisioning invariants (L2687-L2696) — primitive enumeration compression**
Current: Last bullet at L2696 reads: "runtime-local queues, pubsub, schedules, refs, fibers, and caches are process-local mechanics."
Problem: Same issue as §10.6 — this enumeration is at runtime-internal depth and mixes two tiers of primitives.
Required change: Replace the last bullet with: "process-local coordination resources (named in the canonical runtime realization specification, §14) and Effect-internal substrate primitives are process-local mechanics and do not become durable workflow ownership."

**5. §10.2 Runtime realization lifecycle table (L1651-L1659) — producer/consumer column review**
Current: The table names producers and consumers per phase. The "Derivation" row lists "Normalized authoring graph, service binding plans, surface runtime plans, workflow dispatcher descriptors, portable plan artifacts" as required output.
Problem: The derivation output row omits `ExecutionDescriptorTable` (which the runtime-spec §15.2 names as a distinct non-portable SDK output) and conflates portable and non-portable artifacts.
Required change: The "Derivation" row's Required output cell should be simplified to: "Normalized authoring graph, portable plan artifacts, non-portable execution descriptor table, service binding plans, surface runtime plans, workflow dispatcher descriptors — artifact shapes defined in the canonical runtime realization specification, §15."

**6. §17.8 Runtime subsystem invariants (L2710-L2718) — add cross-reference**
Current: Invariants correctly name the lifecycle, access nouns, and harness law. No cross-reference to runtime spec.
Required change: Add a terminal invariant: "All runtime mechanics, artifact shapes, named coordination resources, and substrate internals are defined in the canonical runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`); the arch-spec owns the vocabulary and invariant statements, not the mechanic implementations."

**7. L24 — companion-spec attachment assertion (requires companion-spec locus for full resolution)**
Current: "Subsystem specifications attach to it at explicit integration boundaries." No named runtime spec.
Required change (partial, complementary to companion-spec-attachment-points-registry locus): Add after L24: "The canonical runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`) is the primary attached subsystem specification and is authoritative on all runtime realization concerns per the names-versus-mechanics carve-out in §4.3a."

---

## Open user-decision items (flag for terminal section 5)

**Item 1: Does the arch-spec retain authority over the RAWR-vs-Effect control split statement as a canonical invariant?**
Under the proposed names-vs-mechanics principle, the control split statement ("RAWR plans identity, order, dependency, lifetime, and boundary policy. Effect executes scoped acquisition, release, runtime ownership, and process-local coordination") is an INTEGRATION-BOUNDARY claim — it tells companion spec authors WHICH layer to address for which concern. This is arch-spec territory. But the runtime spec §17.3 also states this split. If the runtime-spec ever changes the control split (e.g., introduces a third execution layer), which spec wins? The user heuristic says runtime-spec wins on runtime concerns — but a change to the RAWR-vs-Effect control split changes the arch-spec's integration model, not just runtime mechanics. This requires user resolution.

**Item 2: Does the arch-spec retain authority over the 7-phase lifecycle if the runtime-spec adds sub-phases?**
The proposed rewrite says the arch-spec owns phase NAMES and ORDER. But if the runtime-spec defines a new sub-phase within "provisioning" (e.g., separating "pre-provisioning validation" from "Effect-backed acquisition"), does the arch-spec need to update? The proposed principle says no — mechanics are runtime-spec territory. But users of the arch-spec who only read the arch-spec will not see the sub-phase. The user must decide: does the arch-spec remain at the 7-phase vocabulary, or does it mirror sub-phases when the runtime-spec defines them?

**Item 3: Process-local coordination resource naming at integration level**
The runtime-spec §14 defines four named coordination resources by type name. The arch-spec's proposed compressed text ("a named catalogue of process-local coordination resources") does not name them. Should the arch-spec name `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource` at the integration level (as the `platform-external-interfaces-table` locus recommends for `PortableRuntimePlanArtifact` and `RuntimeCatalog`)? Or are these runtime-internal? The user heuristic does not resolve this — it is a depth-of-integration-vocabulary question.

---

## Cross-locus implications

**companion-spec-attachment-points-registry** — foundational dependency. The names-vs-mechanics carve-out DEFINES what the arch-spec must own in the companion-spec registry. Every row in the registry that touches lifecycle, substrate, or provisioning must use the arch-spec-owns-vocabulary/runtime-spec-owns-mechanics framing. The registry's "naming side" belongs to the arch-spec; its "mechanics side" belongs to the runtime spec. The proposed §4.3a principle must be cited in the registry section header.

**provisioning-kernel-inventory-depth-reduction** — direct downstream. This locus's entire mandate (compress arch-spec L1712-L1722 and L2668-L2678) flows from the names-vs-mechanics carve-out established here. The specific replacement text I propose for §10.6 and §17.6 above is the resolution for that locus. The two loci should be reconciled so the provisioning-kernel locus uses this locus's principle statement, not an independent rationale.

**sdk-derivation-artifact-list-depth and runtime-compiler-validation-list-depth** — same dependency. The compression I propose for §10.4 and §10.5 is justified by the names-vs-mechanics principle established here. Those loci should cite §4.3a in their replacement text.

**harness-mount-interface-contract-named-types** — compatible but orthogonal. That locus is about ADDING type names at the integration level (naming `CompiledSurfacePlan`, `FunctionBundle`, `HarnessDescriptor`, `StartedHarness`); this locus is about REMOVING runtime-internal depth from the scope claim and mechanics enumerations. They pull in opposite directions at the surface level but are consistent: the arch-spec should name integration-boundary types (harness-mount locus) while deferring mechanics enumerations (this locus). Both are licensed by the same underlying principle.

**inngest-integration-mode-architecture-level** — compatible. Adding Inngest serve-mode vs. connect-worker paragraph to §13.2 is an integration-vocabulary addition, not a mechanics assertion. It falls on the "arch-spec owns" side of the carve-out.

**platform-external-interfaces-table** — compatible. Naming `PortableRuntimePlanArtifact` and `RuntimeCatalog` at the integration level is vocabulary, not mechanics — arch-spec territory. The platform-external-interfaces locus should note that its justification flows from the same principle.

---

## Committed position

The arch-spec must reword L9-L22 to formally adopt the names-vs-mechanics carve-out: replacing "fixes the runtime realization lifecycle" with "fixes the canonical lifecycle phase vocabulary and integration-boundary handoffs for runtime realization, deferring phase mechanics and substrate internals to the canonical runtime realization specification," and replacing "fixes the process-local runtime substrate" with "fixes the canonical name and ownership split of the process-local runtime substrate (RAWR plans; Effect executes), deferring substrate internals and named coordination resources to the canonical runtime realization specification." This rewrite does not weaken the arch-spec — it corrects an overclaim that licenses downstream sections (§10.4, §10.5, §10.6, §17.6) to enumerate runtime-internal detail, creating a silent staleness vector against the runtime-spec. The load-bearing reason: the arch-spec's word "fixes" on L17 and L18 is doing two different things simultaneously — asserting ownership of phase vocabulary (correct) AND asserting mechanics authority (incorrect). Splitting these into one sentence each, with an explicit named cross-reference to the runtime spec, eliminates the staleness risk without compromising the arch-spec's role as the durable integration vocabulary document. The three adjacent depth-contradiction clusters (`provisioning-kernel-primitive-inventory`, `sdk-derivation-artifact-list-depth`, `runtime-compiler-validation-list-depth`) are all downstream symptoms of the same root L9-L22 overclaim; fixing the root fixes all three.

**Position:** The arch-spec must reword L9-L22 to split "fixes the runtime realization lifecycle" into a two-part statement: (a) "names the canonical lifecycle phases (definition → selection → derivation → compilation → provisioning → mounting → observation) and their integration-boundary handoffs" as arch-spec territory; (b) "defers all phase mechanics, sub-sequencing, artifact shapes, and substrate internals to the canonical runtime realization specification (RAWR_Effect_Runtime_Realization_System_Canonical_Spec)" as runtime-spec territory — and must do the same for "the process-local runtime substrate."

**Confidence:** High (>80%). Both specs' own text supports this resolution. The runtime-spec §14 proves the arch-spec's §10.6 primitive enumeration is at the wrong depth. The arch-spec's L24 companion-spec claim proves the runtime spec must be named. The user heuristic aligns with this direction. Only the exact wording of the rewrite requires user review.

**Boundary conditions:** This position holds for all arch-spec sections that describe runtime realization mechanics. It does not apply to arch-spec sections that describe the semantic authoring model, the role/surface taxonomy, or the durable ontology — those are unambiguously arch-spec territory regardless of runtime-spec evolution. It also does not apply to arch-spec integration-boundary type names (naming `RuntimeCatalog`, `WorkflowDispatcher`, `RuntimeAccess` by name is arch-spec vocabulary territory, not mechanics). The scope of the rewrite is L9-L22 plus the downstream sections identified in the audit list above.

**What would change this position:** If the user decides that the arch-spec should remain the primary reference for the lifecycle and defer to the runtime spec ONLY for mechanics sub-detail (keeping "fixes the runtime realization lifecycle" but adding a mechanics-deference footnote), this position would shift to a weaker "add a note" recommendation rather than a "reword the scope claim" recommendation. Evidence that would change the position: a user statement that the arch-spec is INTENDED to be the source of truth for lifecycle phase names independently of the runtime spec (not just as vocabulary for integration documents). Evidence of this would be a design decision that the arch-spec and runtime spec must be independently readable, in which case the arch-spec retaining "fixes the lifecycle" is acceptable at the cost of accepting staleness risk.

**Evidence weight:** 2 primary sources (both specs) analyzed at line-reference depth; 3 contradiction-graph clusters confirming downstream depth violations; 1 consensus-claims set confirming the lifecycle phase names are settled (which implies both specs ARE already using the same vocabulary, validating the names-vs-mechanics split). No empirical studies or external sources — closed corpus. All evidence is internal to the two spec documents.

---

## Open questions

- What is the runtime-spec's sub-phase or sub-sequencing structure within the "provisioning" phase? The runtime-spec §17 (L3619-L3731) describes bootgraph and Effect kernel — are there implicit sub-phases (pre-validation → Effect acquisition → ProvisionedProcess assembly) that the arch-spec is unaware of? If so, the arch-spec's invariant at §17.6 (L2689: "startup failure is fatal for the selected process shape") may be under-specified. Could not determine from corpus whether the runtime-spec defines a sub-phase sequence or treats provisioning as atomic.
- Does the runtime-spec's "reserved detail boundaries" list (§23.5, L4637-L4643) contain any items that the arch-spec currently describes as fixed? If so, those items are over-specified in the arch-spec relative to the runtime-spec's own deference model.
- The runtime-spec's §29 supersession clause says it supersedes "older indexed runtime/effect documents." Does it also supersede the arch-spec on runtime mechanics? The user heuristic implies yes, but the runtime-spec's text says it supersedes "older... documents" — the arch-spec is not older. This subtle point is unresolved.

---

## Sources

1. [[rawr-canonical-architecture-spec-source]] — arch-spec source, L1-L2955
2. [[rawr-effect-runtime-realization-system-canonical-spec-source]] — runtime-spec source, L1-L5264
3. [[source-analysis-rawr-canonical-architecture-specification]] — arch-spec analysis (contradiction-graph and source analysis)
4. [[source-analysis-rawr-runtime-realization-system-canonical-spec]] — runtime-spec analysis
5. `contradiction-graph.json:lifecycle-naming-vs-mechanics-authority` — primary cluster
6. `contradiction-graph.json:provisioning-kernel-primitive-inventory` — adjacent cluster
7. `contradiction-graph.json:sdk-derivation-artifact-list-depth` — adjacent cluster
8. `contradiction-graph.json:runtime-compiler-validation-list-depth` — adjacent cluster
9. `consensus-claims.json:lifecycle-7-phase-names` — settled vocabulary claim
10. `consensus-claims.json:rawr-vs-effect-control-split` — settled integration-boundary claim
