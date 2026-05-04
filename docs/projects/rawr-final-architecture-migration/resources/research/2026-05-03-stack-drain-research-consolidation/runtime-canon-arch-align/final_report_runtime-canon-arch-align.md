# Aligning the canonical architecture specification with the runtime realization specification

The canonical architecture specification ([[rawr-canonical-architecture-spec-source]]) and the runtime realization specification ([[rawr-effect-runtime-realization-system-canonical-spec-source]]) have grown in lockstep, but only the runtime spec has been formalized to the level of a normative subsystem document. The arch-spec promises a registry of integration boundaries it has not yet enumerated, asserts ownership of "the runtime realization lifecycle" and "the process-local runtime substrate" at runtime-internal depth, and stays silent on integration surfaces — companion-spec attachment points, named harness-mount boundary types, the platform's external-interfaces table, the Inngest harness mode, the canonical execution-ownership law in compact form — that the runtime spec hands it on a plate. The realignment is not a contest of authority; it is the operationalization of a single rule that both documents already accept: **the arch-spec owns canonical names and integration-boundary vocabulary for runtime realization; the runtime realization specification owns mechanics within each phase.** Applied per name, the rule reconciles two edits that look like opposites — adding harness-mount type names to the arch-spec and removing Effect-kernel primitive names from the arch-spec — into two applications of one classification. Seven specific recommendations follow. The first four (lifecycle scope rewrite, companion-spec attachment-points registry, named harness-mount types, platform external interfaces table) are the structural cohort that establishes the rule and gives companion subsystem documents formal attachment points. The remaining three (Inngest mode amendment, compression of §10.4–§10.6 and §17.6 enumerations, promotion of the execution-ownership law to a single compact statement) are the cleanup cohort that applies the rule to the existing arch-spec sections that currently violate it. Six discrete user-decision items in Section 5 cannot be silently resolved by the heuristic "runtime realization spec is authoritative on runtime concerns" and must be confronted before the alignment release ships.

## 1. Document scope and structural diff

The two normative documents under review are the **RAWR Effect Runtime Realization System Canonical Specification** ([[rawr-effect-runtime-realization-system-canonical-spec-source]], 5,264 lines, ~25,400 words, ~80 ToC headings: 1 H1 + 14 H2 + 65 H3) and the **RAWR Canonical Architecture Specification** ([[rawr-canonical-architecture-spec-source]], 2,955 lines, ~15,000 words, ~119 ToC headings: 1 H1 + 20 H2 + ~99 H3). The runtime spec is roughly 1.7× longer and far denser on mechanics; the arch-spec is shorter but has nearly twice the heading count, reflecting its role as a system-integration index rather than a mechanical pipeline.

Both documents are self-declared canonical within their stated scopes ([[source-analysis-rawr-runtime-realization-system-canonical-spec]], [[source-analysis-rawr-canonical-architecture-specification]]). The runtime spec opens with "Status: Canonical / Scope: Runtime realization, selected authoring declarations, SDK derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning and process-local execution, process runtime binding, process execution, adapter lowering, harness mounting, diagnostics, telemetry, and deterministic finalization" (runtime-spec L1–L4) and follows immediately with an authority note: "once locked, this document supersedes older indexed runtime/effect documents for runtime realization" (runtime-spec L5). It then declares its non-ownership list — "service domain authority, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors" (runtime-spec L7–L11).

The exclusion list is structurally important, but non-ownership is not equivalent to attachment-seam: the list contains at least three distinct categories. Some excluded concerns are vendor-downstream-of-runtime (durable workflow semantics is owned by Inngest after the runtime hands it `FunctionBundle`); some are companion-spec territory (deployment placement is the deployment companion spec's domain); some are sealed-host-interiors the arch-spec also doesn't expose (native host interiors, desktop-native behavior, web framework semantics). Only the second category cleanly maps to integration surfaces the arch-spec must own. This sharpens the per-name classification rule and prevents a naive "every excluded concern needs an arch-spec attachment point" reading.

The arch-spec opens with a different, broader claim: "This specification defines the canonical integrated architecture for RAWR HQ and for apps built on the same shell" (arch-spec L4) and then enumerates the things it "fixes" — including "the runtime realization lifecycle" and "the process-local runtime substrate" (arch-spec L17, L12). It closes the scope statement with the companion-spec promise: "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries" (arch-spec L24).

That last sentence — `arch-spec L24` — is the structural pivot for this entire alignment exercise. The runtime spec has finished its self-definition; it knows what it owns and what it does not. The arch-spec promises a registry of integration boundaries it has not yet enumerated, never names the runtime realization spec by reference, and never invokes the reserved-detail-boundaries protocol the runtime spec codifies at §23.5 (runtime-spec L4637). The asymmetry between a fully bounded runtime spec and a partially specified arch-spec is the structural diff this report operates against.

### The §10 overlap is the principal alignment surface

Of the arch-spec's twenty H2 sections, exactly one — §10 "Runtime realization" (arch-spec L1577–L1825) — is the high-overlap region with the runtime spec ([[source-analysis-rawr-canonical-architecture-specification]] §3). The rest of the arch-spec covers material the runtime spec explicitly disclaims: apps and identity, plugin lanes, repo topology, role semantics, OpenShell posture, deployment topology, schema and telemetry boundaries, the canonical mermaid picture. The runtime spec, conversely, has fourteen H2 chapters that all sit inside what the arch-spec's §10 attempts to cover in 248 lines.

Inside arch-spec §10, three sub-sections specifically have accreted runtime-internal depth that the runtime spec now owns canonically.

- **§10.4 SDK derivation** (arch-spec L1655–L1665) enumerates nine specific SDK output artifacts that runtime-spec §15 owns at greater depth — and the arch-spec's prose enumeration loses runtime-spec §15.2's portability classification (the `ExecutionDescriptorTable` is non-portable; only refs are portable).
- **§10.5 Runtime compiler** (arch-spec L1673–L1695) lists eight validation checks and nine emission sections that runtime-spec §16 owns at exhaustive depth (runtime-spec L3439–L3617).
- **§10.6 Bootgraph and provisioning kernel** (arch-spec L1708–L1722) names "runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores as process-local mechanics" — Effect-internal substrate primitives that runtime-spec §17.3 explicitly classifies as kernel-wrapped substrate the arch-spec has no business enumerating, and that runtime-spec §14 (L3047–L3211) replaces with a named four-resource catalogue of RAWR-owned coordination resources. The same primitive enumeration repeats in invariant form at §17.6 (arch-spec L2668–L2678).

### Where the documents agree

The two specs use **identical canonical phase names** (definition → selection → derivation → compilation → provisioning → mounting → observation; arch-spec L1633–L1641, runtime-spec §22.1 L4336–L4390) and identical chain names (bind → project → compose → realize → observe; arch-spec §4.5 L492–L505, runtime-spec L21–L29). They agree on nineteen settled claims spanning the seven-phase lifecycle, the `startApp(...)` verb, topology+builder projection classification, vendor-as-native-interior posture, the four runtime-owned lifetimes, the schema ownership split, the six runtime roles, the agent/OpenShell reserved boundary, the RAWR-vs-Effect control split, the diagnostics minimum shape, the cohosting model, and the public SDK rooted at `@rawr/sdk/*` ([[source-analysis-rawr-canonical-architecture-specification]], [[source-analysis-rawr-runtime-realization-system-canonical-spec]]). Where they overlap on names, they are univocal.

### Where they diverge

Of ten ranked contradiction-graph fight clusters, six resolve cleanly under the user heuristic and four are gaps in the arch-spec the heuristic does not resolve. The four gaps are: the companion-spec attachment points; the harness-mount interface contract; the Inngest integration mode; and the portable-plan-artifact-as-control-plane interface. These four gaps are not resolved by deferring to the runtime spec; they require **additions** to the arch-spec at the integration-surface level, sourced from material the runtime spec already defines. The cleanly resolvable disputes (the six clusters where the runtime spec wins) translate into compressions and pointer-swaps in the arch-spec.

The structural conclusion is that the arch-spec's content has migrated to the wrong side of the boundary in two directions at once: depth that should be deferred has accreted in §10.4–§10.6 and §17.6, and integration vocabulary that should have surfaced has not been written. The realignment rebalances both directions in one pass — depth out, integration vocabulary in. The synthesis is that compressions and additions are two halves of one operation: the names-vs-mechanics rule applied per name. Some names move to runtime-spec territory; some names enter arch-spec vocabulary for the first time; and a few canonical names (lifecycle phases, the public SDK paths) stay where they are because they are arch-spec vocabulary by virtue of being the integration surface companion-spec authors must reference.

That per-name framing carries forward into the rest of this report.

### Vendor-verification scoping for this alignment

Three vendors were verified against their current API surfaces during this alignment work:

- **Inngest 4.2.6** ([[vendor-verification-inngest-integration-mode-2]], https://registry.npmjs.org/inngest/4.2.6) — load-bearing for Recommendation #5 because the two-mode integration shape (serve-mode vs connect-worker) is the basis for the proposed §13.2 amendment.
- **Effect 3.21.2** ([[vendor-verification-effect-v3-api-surface-2]], https://raw.githubusercontent.com/Effect-TS/effect/main/packages/effect/src/index.ts) — load-bearing only for the minor `Effect.Service` → `Context.Tag` correction at arch-spec L2775–L2776 folded into Rec #7.
- **oRPC** ([[vendor-verification-orpc-context-lanes-and-local-first-callable-boundary-2]]) — the dep/scope/config/invocation/provided context lanes are RAWR semantics layered above oRPC's context system, not native oRPC features, sharpening the §10.14 worked example for the service-binding row but not driving any specific recommendation.

**Vendors named in the specs but not load-bearing for any of the seven recommendations: OCLIF, Elysia, Bun, web-host technologies, desktop-host technologies, OpenShell.** OCLIF/Elysia/Bun integration shapes are univocal between both specs — neither vendor's API surface drives an alignment edit. Web-host and desktop-host integration shapes were examined in the source-analysis notes and no claim about either rose to load-bearing for the seven recommendations; OpenShell is the one native-host case that does, and it is correctly escalated to §5 user decision #2. The vendor-verification scoping decision is therefore: Inngest got the most attention because mode choice is an architecture-level integration vocabulary question; the other six vendor classes were considered and found non-load-bearing for any alignment recommendation.

## 2. Integration surface the canonical architecture spec must own

If the canonical architecture spec is to be "the core integration document that explains how the entire platform works at a system level," the per-name classification rule is the mechanism that decides what belongs inside that integration vocabulary. **Names exposed to companion subsystem authors and vendor integration authors live in the arch-spec; names consumed only inside the runtime-spec's mechanical pipeline live in the runtime-spec.** This rule has two columns of consequences for the arch-spec's existing integration-surface coverage.

### Column 1: canonical names the arch-spec already owns and must keep owning

The arch-spec correctly carries (and the runtime spec correctly defers to) the following:

1. **The seven canonical lifecycle phase names** (arch-spec L1633–L1641; runtime-spec §22.1 L4336–L4390 uses them verbatim). Companion specs reference phases by these names; the names belong in arch-spec vocabulary regardless of where the mechanics are defined.
2. **The bind → project → compose → realize → observe platform chain** (arch-spec §4.5 L492–L505; runtime-spec L21–L29).
3. **The public SDK import surface table** at arch-spec §5.1 L715–L733, which enumerates twelve `@rawr/sdk/*` paths with owner columns. The table is integration vocabulary — applications consume the imports; companion specs (e.g., a future `@rawr/sdk/desktop` companion) will add rows to it.
4. **The plugin lane index table** at arch-spec §8.3 L1293–L1314, which states the topology-path-and-builder agreement that determines projection classification ([[source-analysis-rawr-canonical-architecture-specification]]).
5. **The schema ownership split table** at arch-spec §15.1–§15.2 L2451–L2481 (services own procedure schemas; runtime owns RuntimeSchema).
6. **The telemetry layer ownership table** at arch-spec §15.4 L2526–L2536 and the policy primitives table at arch-spec §15.5 L2539–L2553.
7. **The canonical-picture mermaid diagram** at §20 L2824–L2895, which is a coordination artifact future companion specs will cross-reference.

These are integration-surface names: the arch-spec owns the naming, the runtime spec implements the mechanics where applicable, and companion specs must conform to the names. None of the seven items above need to move.

### Column 2: pointers the arch-spec is missing and must add

The same rule reveals the gaps. Each of these is an integration-surface concept that companion specs and vendor integration authors need to attach to but that the arch-spec currently does not name or names too thinly:

1. **A formal companion-spec attachment-points registry** ([[depth-investigation-companion-spec-attachment-points-registry]]). Arch-spec L24 promises that "subsystem specifications attach to it at explicit integration boundaries" but the registry itself does not exist. The runtime realization spec is the canonical example of a companion attaching at multiple boundaries (lifecycle vocabulary §22.1, SDK derivation §15, runtime compiler §16, bootgraph + Effect kernel §17, runtime access §18, service binding §18.5, workflow dispatcher §19, surface adapter lowering §20, per-harness mount §21, diagnostics/telemetry §22), but it is never named by reference in the arch-spec. This is the user's primary structural complaint and the load-bearing structural improvement.

2. **Named harness-mount boundary types** ([[depth-investigation-harness-mount-interface-contract-named-types]]). Arch-spec L2272–L2273 says "Harnesses consume mounted surface runtimes or adapter-lowered payloads" but never names the types. Companion harness specs and vendor integration authors have no formal attachment point. Runtime-spec §20 (L4151–L4239) and §21 (L4241–L4333) already name the per-harness inputs and outputs precisely — `CompiledSurfacePlan`, `FunctionBundle`, `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, `StartedHarness`, `ExecutionRegistry`, `PortableRuntimePlanArtifact` — and the arch-spec's role is to elevate the seven that companions reference into integration vocabulary.

3. **A platform external interfaces table** ([[depth-investigation-platform-external-interfaces-table]]). The arch-spec mentions `RuntimeCatalog`, `RuntimeDiagnostic`, and `RuntimeTelemetry` briefly at §10.13 (L1813–L1823) and references "control-plane touchpoints" at §15.7 (L2568–L2569), but it does not name `PortableRuntimePlanArtifact` at all. Yet `PortableRuntimePlanArtifact` is the runtime spec's explicit integration surface for "runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints" (runtime-spec L3409–L3437). Without it named at the architecture level, deployment, observability, and control-plane companion specs have no consolidated table to read.

4. **An Inngest integration-mode statement** ([[depth-investigation-inngest-integration-mode-at-architecture-level]]). The arch-spec's async stack diagram (arch-spec L2189) terminates at `FunctionBundle → Inngest harness` with no mode annotation. Yet the runtime spec at §21.2 (L4287–L4291) declares both modes ("connected worker or serve-mode runtime ingress"), and vendor verification ([[vendor-verification-inngest-integration-mode-2]]) confirms Inngest 4.2.6 (https://registry.npmjs.org/inngest/4.2.6) ships both modes via separate SDK entry points (`inngest/bun` for serve-mode, https://raw.githubusercontent.com/inngest/inngest-js/main/packages/inngest/src/bun.ts; `inngest/connect` for connect-worker mode, https://raw.githubusercontent.com/inngest/inngest-js/main/packages/inngest/src/components/connect/index.ts). Connect-worker mode is implemented by the `WebSocketWorkerConnection` class with `isolateExecution`, `maxWorkerConcurrency`, and `gatewayUrl` configuration. Mode choice changes the network topology of an async-role process — it is an architecture-level fact, not a mechanical detail.

5. **The execution ownership law as a single compact statement.** Runtime-spec L37–L47 publishes the canonical law in nine sentences: "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe." The arch-spec covers the same content diffusely across §4.1, §4.9, §13, §13.7, §16, §17, §18 and never compacts it into one place. The closest single-statement form (arch-spec L2153–L2154: "Effect stays inside runtime realization. oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, and OpenShell keep their jobs.") is half the content. Companion specs need a single architectural statement to cite.

6. **`traceId` as a named integration invariant.** Runtime-spec L1193 / L1211 requires `EffectBoundaryContext.traceId` at every RAWR-owned executable invocation boundary. Runtime-spec L1211 (verbatim): "If the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`." The arch-spec is silent on this requirement. A companion harness spec written to a native host that does not natively trace would silently violate the invariant. The depth investigation classifies `EffectBoundaryContext.traceId` as a **named integration invariant** field rather than a type — the field name is the integration vocabulary the arch-spec must carry, not the surrounding type shape.

7. **Phase-transition trigger conditions.** The arch-spec lifecycle table at L1633–L1641 names phases, producers, and consumers but never states the conditions under which phases transition (eager vs lazy, sync vs async gaps, what triggers compilation vs derivation, whether the chain is strictly linear). Runtime-spec §24 (End-to-end assembly flows L4645–L4887) specifies the canonical handoff sequence; the arch-spec needs at least one integration-level sentence stating that the seven phases are strictly sequential, that each phase's start gate is the validated availability of the prior phase's output, and that mechanics of triggering and async/sync handoff are defined in runtime-spec §24 ([[source-analysis-rawr-canonical-architecture-specification]] §6.4).

8. **Error propagation and failure behavior across phase boundaries.** No arch-spec section defines an error-propagation contract spanning phase boundaries — the arch-spec describes startup failure in §17.6 but never says whether diagnostics are the only error channel, whether phases throw exceptions to the entrypoint, or whether SDK derivation failure produces a partial plan to the compiler. Runtime-spec §17 specifies rollback-on-failure, no-harness-mounting on provisioning failure, and reverse-finalization order. Runtime-spec §22 specifies the diagnostic minimum shape. The arch-spec should carry an integration-level statement that error propagation across phase boundaries flows through `RuntimeDiagnostic` as the structured channel and rollback as the lifecycle response (mechanics deferred to runtime-spec §17 + §22). This becomes an annotation on the §10.14 registry's "lifecycle vocabulary" row ([[source-analysis-rawr-canonical-architecture-specification]] §6.5).

9. **Service runtime boundary lane audit (5 context lanes).** Runtime-spec §11 (L1569–L2113) specifies five context lanes — `deps`, `scope`, `config`, `invocation`, `provided` — with tight semantics: `provided` is initialized empty by runtime and populated only by service middleware; `invocation` is per-call and never participates in `ServiceBindingCacheKey`. Arch-spec §6 (L859–L1085) and the dependency helpers at L237–L244, L2929–L2934 already name the lanes, but the alignment between runtime-spec §11.3–§11.7's lane semantics and arch-spec §6's coverage is never audited in this report. Add an audit row in the cleanup cohort: arch-spec §6 lane definitions should be checked against runtime-spec §11.3–§11.7 for drift, and the §10.14 registry's "service binding" row should explicitly enumerate the five lanes as integration vocabulary.

10. **RuntimeAccess scoping invariant.** Runtime-spec §18.1 defines RuntimeAccess scoping ("services do not receive broad RuntimeAccess; only their declared deps") as an architectural security boundary. Arch-spec §10.8 (L1753–L1768) names `ProcessRuntimeAccess` and `RoleRuntimeAccess` as public integration surface names but does not formalize the scoping invariant. The §10.14 registry's "runtime access" row should call out the scoping invariant as integration vocabulary, and arch-spec §17.8 should carry the scoping invariant verbatim from runtime-spec §18.1 ([[source-analysis-rawr-runtime-realization-system-canonical-spec]] §3).

### The bridge

The structural cohort of recommendations in Section 4 below populates Column 2 of this section's list. Recommendation #2 introduces the registry; Recommendation #3 names the harness-mount types and the `traceId` invariant; Recommendation #4 introduces the platform external interfaces table; Recommendation #5 amends the Inngest harness paragraph. The cleanup cohort applies the same rule retroactively to compress the existing arch-spec sections (§10.4–§10.6, §17.6) where the arch-spec is currently asserting at runtime-internal depth, and to promote the execution-ownership law to a single compact form.

This split — what the arch-spec keeps owning, what it must additionally own, what it must stop owning — treats the arch-spec not as a competing authority on runtime mechanics but as the **naming and boundary layer** that subordinate runtime mechanics specs (and future deployment, observability, and OpenShell companion specs) attach to.

## 3. Runtime-driven additions the canonical architecture spec is missing

Ten distinct additions surface from the runtime spec that the arch-spec either lacks or carries too thinly to serve its integration-document role. To make the cohort sequencing in Section 4 visible, each addition is tagged below as **STRUCTURAL** (belongs in the structural cohort, Recs #1–#4) or **CLEANUP** (belongs in the cleanup cohort, Recs #5–#7) or **SETTLED** (already at consensus depth in the arch-spec; needs only a registry-row cross-reference).

### Structural-cohort additions

1. **Lifecycle scope language: arch-spec must reword §1 L9–L22 to formalize the names-vs-mechanics carve-out.** [STRUCTURAL — drives Rec #1.] The arch-spec currently asserts it "fixes... the runtime realization lifecycle" (arch-spec L17) and "the process-local runtime substrate" (arch-spec L12). Both claims overstate ownership. The runtime spec is canonical on runtime realization (runtime-spec L1–L5), and the M2 migration packet ([[source-analysis-rawr-canonical-architecture-specification]]) already informally adopts the authority order this rewrite formalizes. Source: [[depth-investigation-lifecycle-authority-boundary-arch-vs-runtime]].

2. **A companion-spec attachment-points registry** ([[depth-investigation-companion-spec-attachment-points-registry]]). [STRUCTURAL — drives Rec #2.] An eleven-row table mapping each integration boundary to the runtime-spec section that owns the contract, plus a six-rule attachment protocol, plus a worked example using the runtime realization spec as the canonical companion at every row. The runtime spec already implicitly attaches at all eleven boundaries; the arch-spec just needs to name the registry and upgrade L24 from a promise to a pointer.

3. **Named harness-mount boundary types in arch-spec §10.12 plus per-harness contract paragraphs in §13.1–§13.6** ([[depth-investigation-harness-mount-interface-contract-named-types]]). [STRUCTURAL — drives Rec #3.] Seven boundary type names enter arch-spec vocabulary (`CompiledSurfacePlan`, `FunctionBundle`, `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, `StartedHarness`, `ExecutionRegistry`, `PortableRuntimePlanArtifact`) plus the `EffectBoundaryContext.traceId` invariant. Five other types stay runtime-internal (`CompiledExecutionPlan`, `CompiledProcessPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `CompiledExecutionRegistryInput`). This is the per-name rule's (§6) first concrete application.

4. **A platform external interfaces table at new arch-spec §15.8** ([[depth-investigation-platform-external-interfaces-table]]). [STRUCTURAL — drives Rec #4.] Four rows: `PortableRuntimePlanArtifact` (control-plane / deployment planning consumer), `RuntimeCatalog` (diagnostic readers / control-plane observation consumer), `RuntimeDiagnostic` (structured failure surface), `RuntimeTelemetry` (chain context surface). Each row has consumer-class, producer, owning runtime-spec section, and integration constraints columns. This populates the "control-plane / diagnostics" cells of the §10.14 registry.

### Cleanup-cohort additions

5. **Inngest integration-mode amendment in arch-spec §13.2 plus §17.8 invariant** ([[depth-investigation-inngest-integration-mode-at-architecture-level]]). [CLEANUP — drives Rec #5.] Add one paragraph naming both modes; annotate the §13.2 stack diagram with `Inngest harness [serve-mode | connect-worker mode]`; add the §17.8 mutual-exclusion-per-process invariant. Vendor verification ([[vendor-verification-inngest-integration-mode-2]]) confirms both modes are live in Inngest 4.2.6. Whether to declare a default mode is a Section 5 user decision.

6. **Compression of arch-spec §10.4 (SDK-derivation 9-item artifact list), §10.5 (runtime-compiler 8-item validation list and 9-item emission list), §10.6 (provisioning-kernel primitive enumeration), and §17.6 (invariant primitive enumeration)** ([[depth-investigation-provisioning-kernel-inventory-depth-reduction]]). [CLEANUP — drives Rec #6.] These are the sections where the arch-spec currently asserts at runtime-internal depth. Applying the per-name rule (§6), the named coordination resources (`Process*HubResource` types) and the Effect-internal primitives (queues, pubsub, refs, schedules, caches, fibers, semaphores) are runtime-spec territory; only the integration-level statement ("RAWR plans, Effect executes; one managed runtime per process; non-durable; reverse-order disposal") belongs in the arch-spec.

7. **Restating the execution ownership law as a single compact statement near arch-spec §4** ([[source-analysis-rawr-runtime-realization-system-canonical-spec]]; runtime-spec L37–L47). [CLEANUP — drives Rec #7.] The runtime spec gives the canonical compact form at L37–L47. The arch-spec covers the same content diffusely across §4.1, §4.9, §13.7, §16, §17, §18 with no equivalent compact restatement. Promoting it gives companion-spec authors one paragraph to cite when defending their boundary.

### Settled / no-op additions

8. **Cohosting model statement** (arch-spec §14.4 L2334–L2353 + §14.9 L2424–L2448). Already at consensus depth ([[source-analysis-rawr-canonical-architecture-specification]]). The cleanup pass should verify the cross-reference back to the new §10.14 registry's "scale continuity" row. **Companion edit:** elevate runtime-spec §28's closing principle — "RAWR stays scale-continuous because semantic identity and runtime placement remain separate" — into arch-spec §4.13 (or a new §4.0a) as the canonical underlying rule from which scale continuity, cohosting, and the growth model derive ([[source-analysis-rawr-runtime-realization-system-canonical-spec]]). This gives companion deployment specs one canonical sentence to cite for the architectural rationale of scale continuity.

9. **`traceId` invariant.** [STRUCTURAL — folded into Rec #3 as part of the harness-mount boundary contract.] Listed separately above for clarity.

10. **Workflow dispatcher as async-to-server bridge** (runtime-spec §19.1, §12.6, §24.4; [[source-analysis-rawr-runtime-realization-system-canonical-spec]]). Already at consensus depth via arch-spec §10.10 L1789–L1795. The cleanup pass should add a §10.14 registry-row cross-reference.

The classification above is not arbitrary. The structural-cohort additions establish the per-name classification rule and the registry that codifies it. The cleanup-cohort additions apply the rule to existing arch-spec sections that currently violate it. Doing the cleanup before the structural would compress sections without an articulated principle to justify the compression — which is also why the four "gaps" identified in Section 1 must be closed in the structural cohort: those are the additions that give the cleanup compressions their principled basis.

## 4. Recommended changes to the canonical architecture specification

This section presents seven recommendations in two cohorts. The cohort sequencing is itself a recommendation; one-release adoption of all seven is also valid when the user has appetite for a single larger change.

The argument for splitting is that the structural cohort delivers the integration-surface improvements the user explicitly asked for (registry, named boundary types, external interfaces table) and creates the principled framework that justifies the cleanup compressions; the cleanup cohort then applies that framework to the §10 sections that currently overreach. The argument for shipping all seven at once is that the recommendations form a dependency lattice rather than seven independent moves: shipping any subset leaves the arch-spec internally inconsistent at intermediate states (shipping #1 alone makes §10.4–§10.6 contradict the new scope language; shipping #6 alone makes the compressions look opportunistic; shipping #2 alone produces a registry citing types the arch-spec body does not yet name). Both presentations are defensible; the user's appetite for change-set size is the deciding factor.

### Structural cohort (ship first)

#### Recommendation #1 — Lifecycle scope rewrite

**Source:** [[depth-investigation-lifecycle-authority-boundary-arch-vs-runtime]]. **Confidence:** high.

**Target lines:** arch-spec L17 and L12.

**BEFORE (arch-spec L17):**
> `- the runtime realization lifecycle;`

**AFTER:**
> `- the canonical lifecycle phase vocabulary and integration-boundary handoffs for runtime realization (definition → selection → derivation → compilation → provisioning → mounting → observation); phase mechanics, sub-sequencing, artifact shapes, and substrate internals are defined in the canonical runtime realization specification (RAWR_Effect_Runtime_Realization_System_Canonical_Spec);`

**BEFORE (arch-spec L12):**
> `- the process-local runtime substrate;`

**AFTER:**
> `- the canonical name and ownership split of the process-local runtime substrate (RAWR plans identity, order, dependency, lifetime, and boundary policy; Effect executes scoped acquisition, release, runtime ownership, and process-local coordination); substrate internals, named coordination resources, and kernel mechanics are defined in the canonical runtime realization specification;`

**Companion edit:** add a §4.3a (or amend §4.3) carve-out principle paragraph (verbatim from `[[depth-investigation-lifecycle-authority-boundary-arch-vs-runtime]]`):

> **Names-versus-mechanics carve-out.** The canonical architecture specification owns the durable integration vocabulary for runtime realization: the lifecycle phase names, the canonical RAWR-vs-Effect control split, the role and surface taxonomy, and the producer/consumer handoff contract at each phase boundary. It does not own the mechanics within each phase — phase implementation, sub-sequencing, artifact type shapes, named substrate primitives, and kernel internals are owned by the canonical runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`). When a companion subsystem specification needs to understand what a lifecycle phase does, the arch-spec provides the boundary vocabulary; the runtime spec provides the contract. A change to mechanics within a phase does not require updating the arch-spec; a change to phase names, their order, or their integration handoffs requires updating both specifications in concert.

The closing operational rule — "a change to mechanics within a phase does not require updating the arch-spec; a change to phase names, their order, or their integration handoffs requires updating both specifications in concert" — is the rule companion-spec authors and spec maintainers need at hand. It tells them when an arch-spec amendment is required and when a runtime-spec amendment alone is sufficient.

The M2 migration packet's existing authority order ([[source-analysis-rawr-canonical-architecture-specification]]) is the precedent: "arch-spec is authority #1 with lane 'Top-level ontology, ownership laws, system geometry, terminology, subsystem boundaries, and integration points'; runtime-spec is authority #2 with lane 'Runtime realization topology, lifecycle, SDK/runtime split, resource/provider/profile model, runtime compiler/provisioning/process runtime, live access, diagnostics, and finalization.'" The recommendation turns an informal practice already adopted in the migration packet into a formal scope statement in the arch-spec itself. Caveat: the M2 packet's authority order is a **global** ranking, while the user heuristic ("runtime realization spec authoritative on runtime concerns") is a **scoped** ordering. The two are compatible only under the names-vs-mechanics carve-out Rec #1 introduces; absent that carve-out, they conflict on overlapping runtime sections. Frame the precedent as "compatible with the recommendations under the carve-out" rather than as straightforward precedent for them.

**Downstream audit list (seven sections requiring follow-on tightening).** Rec #1's scope rewrite at L17 + L12 addresses the headline scope claims. The rewrite also requires consistency edits in seven downstream arch-spec sections, four of which are folded into Rec #6 (§10.4, §10.5, §10.6, §17.6) and three of which are not yet covered elsewhere:

- **§10.2 lifecycle table — Derivation row fix.** Current "Derivation" row's Required output cell lists "Normalized authoring graph, service binding plans, surface runtime plans, workflow dispatcher descriptors, portable plan artifacts" — omitting `ExecutionDescriptorTable` (the runtime-spec §15.2 non-portable SDK output) and conflating portable and non-portable artifacts. Required change: simplify the cell to "Normalized authoring graph, portable plan artifacts, non-portable execution descriptor table, service binding plans, surface runtime plans, workflow dispatcher descriptors — artifact shapes defined in the canonical runtime realization specification, §15."
- **§17.8 runtime subsystem invariants — terminal cross-reference invariant.** The current invariant set correctly names the lifecycle, access nouns, and harness law but never cross-references the runtime spec. Add a terminal invariant: "All runtime mechanics, artifact shapes, named coordination resources, and substrate internals are defined in the canonical runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`); the arch-spec owns the vocabulary and invariant statements, not the mechanic implementations."
- **L24 companion-spec attachment assertion.** Augment with "The canonical runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`) is the primary attached subsystem specification and is authoritative on all runtime realization concerns per the names-versus-mechanics carve-out in §4.3a." (This is partially covered by Rec #2's L24 upgrade; the §4.3a cross-reference is the consistency hook with Rec #1.)

#### Recommendation #2 — Companion-spec attachment-points registry

**Source:** [[depth-investigation-companion-spec-attachment-points-registry]]. **Confidence:** high on content; medium on placement (see Section 5 user decision #1).

**Insertion point (recommended):** new arch-spec §10.14 "Companion specifications and integration-boundaries registry" — inserted immediately after §10.13 (RuntimeCatalog, diagnostics, and telemetry) and before the divider that closes §10. **Alternative:** new top-level arch-spec §21.

**Contents:** an eleven-row registry table mapping each integration boundary to the arch-spec section that establishes the boundary, the runtime-spec section that owns the mechanics, which side owns naming and which owns mechanics, the named interface contract types the arch-spec carries, and the companion specifications currently attaching there. The full proposed table:

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

If Section 5 user decision #2 selects the "formally defer OpenShell" option (recommended), the registry has twelve rows — the additional row is the OpenShell placeholder, marked `reserved-detail-boundary; locks no later than the first implementation slice that triggers its need`.

**Plus** the six-rule attachment protocol (reproduced verbatim in Section 6 below with concrete worked examples for each rule) and a worked example using the runtime realization specification as the canonical companion at every row. The eleven worked-example bullets — one per boundary — show what correct attachment looks like: e.g., for the Lifecycle vocabulary row, "runtime-spec §24.2 uses the identical seven phase names established in arch-spec §10.2, adds per-phase required output, producer, consumer, and gate — extending, not replacing, the arch-spec's phase vocabulary"; for the Bootgraph row, "Arch-spec §10.6 names the RAWR-vs-Effect control split; the arch-spec must NOT enumerate the Effect-internal primitives (queues, pubsub, refs, fibers, semaphores) — those belong in runtime-spec §17"; for the Harness boundary row, "Arch-spec §10.12 must name `HarnessDescriptor` and `StartedHarness` as the formal interface types at the boundary"; for the Control-plane row, "Correct attachment requires the arch-spec to add `PortableRuntimePlanArtifact` to its control-plane boundary section as the formal named interface."

**Plus** upgrade arch-spec L24 from a promise to a pointer:
> `Subsystem specifications attach to it at named integration boundaries enumerated in §10.14. The runtime realization specification (RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md) is the current canonical companion document for all runtime concerns; it is authoritative on mechanics within each integration boundary this specification names.`

#### Recommendation #3 — Harness-mount named types and per-harness contracts

**Source:** [[depth-investigation-harness-mount-interface-contract-named-types]]. **Confidence:** high.

**Target sections:** arch-spec §10.11 (Surface adapter lowering, L1796–L1812), §10.12 (Harness and native boundary), and §13.1–§13.6 (per-harness stack diagrams and contracts).

**Names to add to arch-spec §10.12:** `CompiledSurfacePlan`, `FunctionBundle`, `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, `StartedHarness`, `ExecutionRegistry`, `PortableRuntimePlanArtifact`. Plus the `EffectBoundaryContext.traceId` invariant: "EffectBoundaryContext.traceId is required for RAWR-owned executable invocation boundaries; if the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`" (paraphrased from runtime-spec L1193).

**Names to NOT add** (kept runtime-internal): `CompiledExecutionPlan`, `CompiledProcessPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `CompiledExecutionRegistryInput`.

**Proposed §10.12 replacement (AFTER block):**
```markdown
### 10.12 Harness and native boundary

Harnesses own native mounting after runtime realization and adapter lowering. Every harness implementation must satisfy the `HarnessDescriptor` interface defined in the runtime realization specification, §21.

**Integration contract.** Each harness receives:
- `MountedSurfaceRuntimeRecord[]` — the set of adapter-lowered surface records assembled by the process runtime from compiled surface plans and lowered native payloads;
- `ProcessRuntimeAccess` — scoped process-level access (no raw Effect internals, no provider internals, no unredacted config);
- `RuntimeTelemetry` — the telemetry carrier for tracing across the mounting phase.

Each harness returns a `StartedHarness` that carries mount identity, topology records, and an optional `stop()` finalizer invoked by rollback and finalization in reverse mount order.

**Inngest harness exception.** The Inngest harness receives a `FunctionBundle` (the async surface adapter's lowered artifact) rather than generic `MountedSurfaceRuntimeRecord` entries. `FunctionBundle` is defined in the runtime realization specification, §19.3.

**traceId integration invariant.** `EffectBoundaryContext.traceId` is required at every RAWR-owned executable invocation boundary. Runtime-spec L1211 (verbatim): "If the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`." Adapters resolve executable boundaries through `ExecutionRegistry`; they do not independently pair compiled execution plans with descriptors. See runtime realization specification, §9.2 and §18.3.

**Boundary rule.** RAWR hands harnesses runtime-realized payloads; native framework interiors own native execution semantics from that point. Harnesses must not consume raw authoring declarations, SDK graphs, or compiler plans directly. Per-harness integration contracts are specified in §13.1–§13.6 below; the complete per-harness input/output and boundary rules are defined in the runtime realization specification, §21.
```

**Per-harness contract paragraphs.** For §13.1 (server / Elysia + oRPC), §13.2 (async / Inngest), §13.3 (cli / OCLIF), §13.4 (web), §13.5 (agent / OpenShell), §13.6 (desktop), add a paragraph naming the harness's input type, output type, and owning runtime-spec section. The two highest-traffic exemplars (verbatim from the depth investigation):

> **§13.1 Elysia harness (verbatim insertion):** "The Elysia harness receives `MountedSurfaceRuntimeRecord[]` carrying adapter-lowered oRPC/Elysia route payloads, server harness configuration, and process access. It must return a `StartedHarness`. RAWR owns compiled surface plans, route payload closures, and delegation to `ProcessExecutionRuntime` at invocation time; Elysia owns HTTP host lifecycle and request routing. The complete input/output contract is defined in the runtime realization specification, §21.1."

> **§13.2 Inngest harness (verbatim insertion):** "The Inngest harness receives a `FunctionBundle` (runtime-spec §19.3) — not `MountedSurfaceRuntimeRecord` entries — along with the selected Inngest runtime resource and async harness mode. It must return a `StartedHarness`. Mode choice is profile-selected: serve-mode requires an inbound HTTP listener; connect-worker mode requires an outbound persistent connection to Inngest. A single process binds exactly one mode. RAWR owns async surface plan compilation, FunctionBundle derivation, and workflow dispatch semantics; Inngest owns durable async execution semantics. The complete contract and mode specifications are defined in the runtime realization specification, §21.2."

The four remaining harnesses (OCLIF §13.3, web §13.4, agent/OpenShell §13.5, desktop §13.6) follow the same pattern and are drafted in `[[depth-investigation-harness-mount-interface-contract-named-types]]` — each paragraph names input boundary type (`MountedSurfaceRuntimeRecord` for all five non-Inngest cases), output type (`StartedHarness`), what RAWR owns vs what the native host owns, and a cross-reference to runtime-spec §21.x.

**Plus a new §13.8 "Companion harness attachment requirements" subsection** drafted as five lettered requirements companion harness specifications must satisfy: (a) implement against named boundary types only — `HarnessDescriptor<TPayload>`, `MountedSurfaceRuntimeRecord<TPayload>`, `StartedHarness` — never against SDK derivation artifacts or compiler-internal artifacts; (b) the `mount(...)` method may not acquire providers, construct service bindings, or access raw Effect internals; (c) emit `RuntimeDiagnostic`-conforming findings for all mount failures; (d) respect `EffectBoundaryContext.traceId` as the required invocation correlation field — "this requirement is non-negotiable and cannot be deferred to a native host that does not support tracing"; (e) resolve executable boundaries through `ExecutionRegistry`, not by independently pairing compiled execution plans with descriptors.

**Minimal-viable subset (fallback):** if the user wants a smaller change set, ship only `HarnessDescriptor`, `StartedHarness`, `FunctionBundle`. This is Section 5 user decision #4.

#### Recommendation #4 — Platform external interfaces table

**Source:** [[depth-investigation-platform-external-interfaces-table]]. **Confidence:** high.

**Insertion point:** new arch-spec §15.8 "Platform external interfaces" (after the existing §15.7 "Cache and control-plane boundaries").

**Contents:** a four-row table with columns `interface name | role/purpose | producer | consumer class | owning runtime-spec section | integration constraints`. The full proposed §15.8 table:

| Interface name | Role / purpose | Producer | Consumer class | Owning runtime-spec section | Integration constraints |
|---|---|---|---|---|---|
| `PortableRuntimePlanArtifact` | Pre-runtime planning artifact for deployment and control-plane inspection | SDK derivation | "Runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints" (runtime-spec L3437, verbatim) | Runtime spec §15.7 (L3409–L3437) | Portable: holds `ExecutionDescriptorRef` entries only — no live resources, no executable closures. Produced at derivation phase; consumed before or independently of process startup |
| `RuntimeCatalog` | Post-runtime diagnostic read model of full lifecycle topology (selected, derived, compiled, provisioned, bound, projected, executed, mounted, observed, stopped) | Runtime and diagnostics subsystem (`packages/core/runtime/topology/`) | Diagnostic readers; control-plane observation tooling | Runtime spec §22.3 (L4470–L4511) | Storage backend, indexing, and retention are reserved (runtime-spec L4511); minimum record sections are normative; not a live access surface; not a source of truth |
| `RuntimeDiagnostic` | Structured runtime finding, violation, status, or lifecycle event; names the violated boundary or failed phase | All runtime layers (SDK, compiler, bootgraph, process runtime, adapters, harnesses) | Diagnostics pipeline; `RuntimeCatalog` aggregation; observability tooling | Runtime spec §22.1 (L4336–L4388) | Emitted across all seven lifecycle phases. "Diagnostics name the violated boundary or failed lifecycle phase. They explain; they do not compose." (runtime-spec L4388, verbatim) |
| `RuntimeTelemetry` | Runtime-owned span, event, annotation, and lifecycle telemetry chain for process and provisioning correlation | Runtime and harness integrations | Observability exporters (telemetry backend); diagnostic correlation | Runtime spec §22.2 (L4392–L4468) | Telemetry chain ordering is normative (entrypoint → derivation → compiler → bootgraph → provisioning → binding → adapter → harness → finalization). Telemetry backend is configurable (reserved). Service semantic observability is service-owned and does not flow through this interface |

**Plus** amend arch-spec §17.12 (Control-plane invariant) to name all four artifacts. The proposed verbatim replacement for the third sentence of §17.12: "The diagnostic/control seam lives in four named platform interfaces — `PortableRuntimePlanArtifact` (pre-runtime planning), `RuntimeCatalog` (post-runtime observation read model), `RuntimeDiagnostic` (structured findings), and `RuntimeTelemetry` (correlation chain) — each specified in the runtime realization specification and tabulated in §15.8." This converts an abstract phrase ("explicitly owned control-plane touchpoints") into a normative artifact enumeration.

**Note on overlap with runtime-spec §27.** Runtime-spec §27 already provides a comprehensive component contract summary table covering every component/artifact with owner, placement, producer, consumer, phase, and diagnostics. The §15.8 table is a deliberate four-row subset filtered to **externally consumed** integration interfaces only — companion deployment, observability, and control-plane spec authors need a one-screen registry of the platform's external surface, not the full runtime-internal component catalogue. The arch-spec subset and the runtime-spec full table coexist by scoping: arch-spec §15.8 is the integration registry; runtime-spec §27 is the mechanics catalogue.

**Plus** add a cross-reference from §10.13 to §15.8.

**Open question (Section 5 user decision #5):** whether to add `RuntimeDiagnosticContributor` as a fifth row. Recommendation: omit — it is resource-authored, not system-authored.

**Borderline-case caveat for `PortableRuntimePlanArtifact`.** Per Section 6's per-name rule, "borderline cases default to the runtime spec until a companion spec actually emerges that needs the name promoted." `PortableRuntimePlanArtifact` has no current external (non-runtime) consumer — there is no deployment companion spec, no control-plane companion spec, and no observability companion spec in existence today; only the runtime spec itself consumes it. Strictly applied, the rule says: leave `PortableRuntimePlanArtifact` named only in runtime-spec §15.7, and add the §15.8 row when a deployment/control-plane companion spec actually triggers the need.

Rec #4 instead promotes the name now, defending the promotion on two grounds: (a) the runtime spec at L3437 already explicitly lists the consumer class as "runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints" — the external consumer surface is named in the canonical runtime spec even if companion specs implementing those consumers do not yet exist; and (b) the §15.8 table's purpose is to be the integration registry future companion deployment/observability/control-plane specs attach to — pre-naming is the table's function. A reader who weighs the per-name rule's "wait for the companion spec" guard more strictly may prefer downgrading Rec #4 to "name `RuntimeCatalog` only; reserve `PortableRuntimePlanArtifact` pending deployment companion spec." The recommendation as written treats this as a borderline case that crosses the line because the consumer class is already named in runtime-spec L3437.

### What the structural cohort changes about the platform's overall integration shape

After Recs #1–#4 ship, the arch-spec is structurally complete as an integration document. Reading the arch-spec from §1 to §20, a companion-spec author sees: (a) a scope statement that declares the names-vs-mechanics carve-out and names the runtime realization spec by reference; (b) a §10.14 registry that enumerates the eleven (or twelve) attachment boundaries and the six-rule attachment protocol; (c) named boundary types in §10.12 and per-harness contracts in §13; (d) a platform external interfaces table at §15.8. These four changes give the arch-spec everything it needs to be the **core integration document** the user described: explicit about "interfaces, boundaries, conditions, rules — whatever the system needs to make companion subsystem documents plug in cleanly."

None of the structural-cohort changes touch the runtime-internal sections of the arch-spec (§10.4–§10.6, §17.6) where the spec currently asserts at runtime-internal depth. Those are the cleanup cohort's job. The structural cohort can ship without the cleanup cohort and the arch-spec is alignment-improved; the cleanup cohort cannot ship cleanly without the structural cohort, because the principle that justifies the compressions is the carve-out introduced in Rec #1.

**Alternate sequencing for shipping speed.** A cleanup-first ordering is also defensible: the compressions in §10.4–§10.6 and §17.6 can be justified directly by the user heuristic + runtime-spec canonical status (runtime-spec L1–L5: "Status: Canonical / supersedes older indexed runtime/effect documents") without the full per-name classification framework, because the runtime spec is already canonical and supersedes older runtime documents. Under that ordering the cleanup cohort ships first as a minimal alignment pass, and the structural cohort follows. This trades framework coherence for shipping speed; the recommended order trades shipping speed for framework coherence. Both orderings are legitimate, and the choice depends on whether the user wants the alignment principle visible in the arch-spec before the cuts, or wants the cuts to happen quickly with the principle codified afterward.

### Cleanup cohort (defer to follow-up pass, or ship in the same release)

Before presenting the cleanup recommendations, it is worth engaging the strongest argument against compressing the arch-spec's existing enumerations. The minimalist counter-position holds that the arch-spec's §10.4–§10.6 enumerations ARE the integration document's value: they let a reader orient to the runtime realization layer without context-switching into a 5,264-line companion spec. Under the user's own framing — "core integration document that explains how the entire platform works at a system level" — readers reasonably need self-contained explanation, not pointer-chasing. A cross-reference is not a substitute for in-place explanation when the arch-spec is the entry point. Under this reading, compressing §10.4–§10.6 makes the arch-spec a less effective standalone integration document, and the recommendation to compress is a contestable tradeoff weighing staleness-prevention against in-place readability rather than a strict win.

A reader who weighs the discoverability defense more heavily than the staleness-prevention benefit should ship Recs #1–#4 only and skip Rec #6 (and probably Rec #7). Recs #1–#4 are pure additions — they grow the arch-spec's integration vocabulary without removing anything. Recs #6–#7 are the contested cuts. Both ship-orderings are defensible.

The cleanup-cohort recommendations as written preserve the integration-level statements that carry the discoverability load (the lifecycle table at L1633–L1641 stays; the "RAWR plans, Effect executes" code block stays verbatim; the "one managed runtime per process" rule stays; the non-durability boundary stays) and only drop the primitive-level enumerations that the runtime spec now owns canonically. The discoverability cost is a paragraph or two; the staleness-prevention benefit is that the arch-spec stops drifting whenever the runtime spec adds, removes, or renames a coordination resource. Without the compressions, every runtime-spec amendment to §14, §15, §16, or §17.3 silently invalidates an arch-spec invariant. With them, the arch-spec stays a thin integration layer and the runtime spec stays the mechanical authority — and the cross-reference tells a reader exactly where to find the depth they need.

#### Recommendation #5 — Inngest mode amendment

**Source:** [[depth-investigation-inngest-integration-mode-at-architecture-level]] and [[vendor-verification-inngest-integration-mode-2]]. **Confidence:** high.

This sits at the boundary between cohorts. The Inngest mode amendment is structurally small (one paragraph + one diagram annotation + one invariant) but it depends on the §13.2 stack diagram and the §17.8 invariant section already existing. Ship it with the structural cohort if convenient; defer to the cleanup pass otherwise.

**Target sections:** arch-spec §13.2 (L2178–L2192) and §17.8 (new invariant).

**Paragraph to add to §13.2:**
> `The async harness operates in one of two modes — serve-mode (HTTP listener via inngest/bun or other framework adapters) or connect-worker mode (outbound persistent connection via inngest/connect). Mode choice changes the process's ingress topology (inbound HTTP vs outbound WebSocket) and is a harness-selection fact at process-start time. Mechanics for both modes are defined in the runtime realization specification, §21.2.`

**Diagram annotation:** change `FunctionBundle -> Inngest harness` to `FunctionBundle -> Inngest harness [serve-mode | connect-worker mode]`.

**Invariant for §17.8:**
> `An async role process binds exactly one Inngest harness mode per started process; serve-mode and connect-worker mode are mutually exclusive within a single process.`

Whether to declare serve-mode the default at architecture level is Section 5 user decision #3. Recommended option: do **not** declare a default at architecture level — mode-selection is a profile/deployment concern that belongs in a future deployment companion spec.

#### Recommendation #6 — Compress §10.4–§10.6 plus §17.6 enumerations

**Source:** [[depth-investigation-provisioning-kernel-inventory-depth-reduction]]. **Confidence:** high.

This is the largest cleanup operation. Four target sections:

**§10.4 SDK derivation (arch-spec L1655–L1665).** The current 9-item artifact prose list loses the runtime spec's portability classification (`ExecutionDescriptorTable` is non-portable; only refs are portable; runtime-spec §15.2).

**BEFORE:**
```markdown
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

**AFTER:**
```markdown
### 10.4 SDK derivation

The SDK derives structured plan artifacts and an in-process execution descriptor table from compact authoring declarations. SDK derivation is the public authoring boundary: SDK output is the sole input to the runtime compiler.

The SDK does not acquire resources, execute providers, construct managed runtime roots, construct native harness payloads, mount harnesses, or define native framework semantics.

The specific artifact types, their portability classification, and the producer/consumer contract for each artifact are defined in the runtime realization specification, §15.
```

**§10.5 runtime compiler (arch-spec L1673–L1695).** The 8-item validation list and 9-item emission list duplicate runtime-spec §16's normative interface.

**BEFORE:**
```markdown
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

**AFTER:**
```markdown
### 10.5 Runtime compiler

The runtime compiler consumes SDK-derived artifacts plus the entrypoint's selected app, profile, and harness configuration, validates coverage and dependency closure against architectural invariants, and emits one `CompiledProcessPlan` plus diagnostics.

Compilation precedes provisioning and harness mounting. A compilation failure aborts startup before any resource is acquired.

The runtime compiler does not acquire resources, bind live services, construct native functions, mount harnesses, or write final runtime catalog state.

The complete validation rules, emission contract, and `CompiledProcessPlan` shape are defined in the runtime realization specification, §16.
```

**§10.6 provisioning kernel (arch-spec L1708–L1722).** The primitive enumeration ("queues, pubsub, refs, schedules, caches, fibers, semaphores") is at runtime-internal depth. The "RAWR plans, Effect executes" code block is preserved verbatim as the irreducible architectural statement.

**BEFORE:**
```markdown
### 10.6 Bootgraph and provisioning kernel

Bootgraph is the RAWR lifecycle graph above Effect layer composition. It owns stable lifecycle identity, deterministic ordering, dedupe, rollback, reverse finalization order, and typed context assembly for process and role lifetimes.

The Effect provisioning kernel is the runtime-owned substrate beneath bootgraph.

The control split is fixed:

​```text
RAWR plans identity, order, dependency, lifetime, and boundary policy.
Effect executes scoped acquisition, release, runtime ownership, and process-local coordination.
​```

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

**AFTER:**
```markdown
### 10.6 Bootgraph and provisioning kernel

Bootgraph is the RAWR lifecycle graph above Effect layer composition. It owns stable lifecycle identity, deterministic ordering, dedupe, rollback, reverse finalization order, and typed context assembly for process and role lifetimes.

The Effect provisioning kernel is the runtime-owned substrate beneath bootgraph.

The control split is fixed:

​```text
RAWR plans identity, order, dependency, lifetime, and boundary policy.
Effect executes scoped acquisition, release, runtime ownership, and process-local coordination.
​```

The provisioning kernel owns one root managed runtime per started process; process and role lifetime scopes; scoped resource acquisition and release from compiled provider plans; validated and redacted config loading; structured runtime errors; lifecycle and provider acquisition telemetry; and reverse-order deterministic disposal.

Process-local coordination is not durable workflow ownership. The named RAWR-owned process-local coordination resources and the Effect-internal substrate primitives they wrap are defined in the runtime realization specification, §14 and §17.3.
```

Do **not** name `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, or `ProcessCacheHubResource` in the arch-spec — those names default to runtime-spec territory under the per-name rule (§6). (Borderline: these four are RAWR-owned coordination resources, distinct from the Effect-internal substrate; if a future deployment companion spec materializes that maps process-local queues to deployment-platform queues, that companion spec may need to reference these names — at which point the borderline-default-to-runtime rule fires the other direction and the names get promoted into arch-spec §10.14. The current "do NOT name" recommendation is the borderline-default position, not an obvious cut.)

**§17.6 invariant (arch-spec L2668–L2678).** Apply the same compression: preserve the seven integration-level invariants and replace the eighth (primitive enumeration) with a category pointer.

**BEFORE:**
```markdown
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

**AFTER:**
```markdown
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

The synthesis with Recommendation #3 is critical here: the arch-spec is **adding** named harness-mount types in §10.12 while **removing** named Effect-kernel primitives from §10.6. Both edits apply the same per-name rule (§6). The §10.14 registry (Rec #2) is the structural anchor that makes the asymmetry coherent.

#### Recommendation #7 — Promote execution-ownership law to a single compact statement

**Source:** runtime-spec L37–L47 ([[source-analysis-rawr-runtime-realization-system-canonical-spec]]). **Confidence:** medium.

**Target:** insert a new subsection at the top of arch-spec §4 (Canonical laws), e.g., §4.0 "Execution ownership law", or consolidate arch-spec §4.1 + §4.9 + §13.7 into a single compact "Vendor ownership and execution-layer law" subsection.

**Recommended content (verbatim from runtime-spec L37–L47):**
> `RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe.`

This is the most compact, most memorable, most normative integration statement in either document. Companion specs should be able to point at one paragraph in the arch-spec and read the ownership split. The current arch-spec form (distributed across §4.1, §4.9, §13.7, §16, §17, §18; closest single-statement form at L2153–L2154: "Effect stays inside runtime realization. oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, and OpenShell keep their jobs.") is accurate but not as readily usable.

**Drift-risk objection (and how to address it).** This recommendation is in tension with Rec #6's reasoning: copying runtime-spec L37–L47 verbatim into arch-spec §4.0 creates the same staleness/drift failure mode Rec #6 cites as the reason to compress §10.4–§10.6. If runtime-spec L37–L47 is later amended (a new vendor row, refined "Diagnostics observe" wording), the arch-spec drifts silently. Two ways to defuse the tension: (a) lower Rec #7's confidence and explicitly mark it as in tension with Rec #6's principle, accepting the duplication as the cost of the compactness gain; or (b) flip the citation direction — the arch-spec authors its own compact ownership statement at §4.0, and the runtime spec L37–L47 cross-references the arch-spec as the canonical source rather than the other direction. Option (b) inverts the source-of-truth: arch-spec owns the law as integration vocabulary; runtime-spec quotes it as context. This is the cleaner long-term posture and aligns with the Rec #1 carve-out ("arch-spec owns canonical names and integration-boundary vocabulary"). The recommendation as written takes option (a); the user may prefer (b).

**Companion edit (negative form, from runtime-spec §25.7).** Rec #7 carries the **positive** statement of vendor ownership; arch-spec §4.9 should additionally carry the **negative** form from runtime-spec §25.7 verbatim: "Effect/oRPC/Elysia/Inngest/OCLIF are native interiors behind RAWR-shaped boundaries, not peer semantic owners." This phrasing is the enforcement back-stop for the per-name rule (§6) — it tells future companion vendor-integration spec authors what they may NOT claim. Companion to this: the §10.14 registry should cross-reference arch-spec §18's forbidden-patterns list (which forbids raw `Layer` / `Context.Tag` / `ManagedRuntime` / `Scope` / `FiberRef` authoring at L2775–L2776) as the operational enforcement of the negative form. (Minor naming correction: the arch-spec lists `Effect.Service` in the forbidden-pattern list, but Effect v3.21.2 has no standalone `Effect.Service` module — the correct service-pattern name is `Context.Tag` ([[vendor-verification-effect-v3-api-surface-2]], https://raw.githubusercontent.com/Effect-TS/effect/main/packages/effect/src/index.ts). Replace `Effect.Service` with `Context.Tag` in arch-spec L2775–L2776 alongside this Rec #7 amendment.)

### What the cleanup cohort changes about the platform's overall integration shape

After Recs #5–#7 ship, the arch-spec stops asserting at runtime-internal depth and reads as a coherent integration document end-to-end. The §10 chapter becomes thinner but more navigable; the §4 canonical laws section grows by one compact paragraph that companion-spec authors can quote. The arch-spec's overall length probably drops by 100–200 lines despite the Section 4 additions, because the compressions in §10.4–§10.6 and §17.6 outweigh the new §10.14 + §15.8 + §13.x paragraphs.

### Existing precedent

The M2 migration planning packet at `.context/M2-migration-planning-packet/01-primary-authorities.md` already informally establishes the authority order Recommendations #1 + #2 formalize ([[source-analysis-rawr-canonical-architecture-specification]]). The arch-spec gets the lane "Top-level ontology, ownership laws, system geometry, terminology, subsystem boundaries, and integration points"; the runtime spec gets "Runtime realization topology, lifecycle, SDK/runtime split, resource/provider/profile model, runtime compiler/provisioning/process runtime, live access, diagnostics, and finalization." A second small precedent: the quarantined `m2-guardrails-and-enforcement.md` doc still references the OLD runtime spec name (`RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md`) — a small real-world example of the cost of not having a formal registry, and a strengthening argument for Rec #2.

## 5. Flagged contradictions requiring user resolution

The user heuristic ("runtime realization spec is authoritative on runtime concerns") cleanly resolves six of the ten ranked contradiction-graph fight clusters. The remaining four are not technical contradictions — they are deferred design choices that no amount of further evidence resolves. They cannot be silently picked.

This section lists each user-decision item with its question, option set with pros/cons, recommended option, why the user heuristic does not resolve it, and how the decision affects the cohort sequencing.

### User decision #1 — Registry placement (§10.14 vs new top-level §21)

**Question:** Should the new companion-spec attachment-points registry sit at **arch-spec §10.14** (as a closing subsection of the Runtime realization chapter) or at **a new top-level section** (e.g., §21, after the closing canonical-picture diagram)?

**Option A — §10.14 (recommended for now).** Pro: keeps the registry next to the runtime-realization material that comprises most of its rows (ten of the eleven rows are runtime-realization-adjacent); reads naturally as the closing subsection of the runtime-realization chapter; smaller diff against the existing arch-spec ToC. Con: positions the registry as runtime-realization-adjacent, which is misleading once future deployment, observability, or OpenShell companion specs need rows that don't sit naturally in §10.

**Option B — new top-level §21.** Pro: signals that the registry governs ALL future companion specs — not just runtime-realization-adjacent ones; more visible to a reader scanning the table of contents; scales cleanly when companion specs proliferate. Con: larger ToC diff; positions the registry as a global concept independent of any chapter, which is structurally heavier.

**Why the user heuristic does not resolve it:** the heuristic only resolves disputes where the runtime spec is authoritative; placement of an arch-spec section is purely structural.

**Effect on cohort sequencing:** §10.14 placement is the conservative choice and supports shipping the structural cohort with minimal disruption. If the user picks Option B, the structural cohort grows slightly but the cleanup cohort is unchanged.

**Recommended option:** §10.14 unless the platform expects multiple non-runtime-realization companion specs to materialize within the next two release cycles, in which case top-level placement is the better long-term structure.

### User decision #2 — OpenShell vendor status

**Question:** Is OpenShell (a) RAWR-internal, (b) third-party, or (c) formally deferred to a forthcoming OpenShell companion specification?

**Evidence:** Both specs converge on "reserved boundary with locked integration hooks" but neither resolves vendor status. arch-spec L1398–L1399: "Agent/OpenShell governance is a reserved boundary with locked integration hooks." arch-spec L2022–L2046: OpenShell named as "default runtime substrate and policy envelope beneath the shell-facing part of the agent role" without API surface, integration model, or vendor-status declaration. runtime-spec L4322 (§21.5): same "reserved boundary with locked integration hooks" phrasing. runtime-spec L7–L11 verbatim exclusion: "It does not own service domain authority, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, **shell governance**, desktop-native behavior, web framework semantics, or native host interiors." Shell governance is structurally outside the runtime spec's scope, which is why the runtime spec cannot resolve OpenShell's vendor status on its own.

**Option A — Declare OpenShell RAWR-internal.** Pro: simplifies the integration story (OpenShell is one more RAWR package); avoids third-party-vendor governance complexity. Con: commits the platform to building and maintaining OpenShell internally; would require an internal-spec at `packages/core/runtime/harnesses/agent/openshell/` and a §10.14 registry row noting OpenShell's internal scope.

**Option B — Declare OpenShell third-party with a vendor integration contract.** Pro: parallels the treatment of Inngest, oRPC, Effect, Elysia, OCLIF, Bun; forces a clean integration-shape definition. Con: requires a third-party-vendor governance contract that doesn't exist yet; requires identifying or building the third-party OpenShell vendor.

**Option C — Formally defer to a forthcoming OpenShell companion spec (recommended, but borderline).** Pro: honors the runtime-spec L4637 reserved-detail-boundaries pattern ("lock no later than the first implementation slice that makes the dedicated specification trigger true"); lets the §10.14 registry carry an explicit placeholder row noting reserved-detail-boundary status; matches what both specs already do informally. Con: defers the decision (but the decision was already deferred — this just makes the deferral formal). **Stronger con:** OpenShell is the named substrate beneath the agent role, which is one of six canonical RAWR roles. Deferring its vendor status is more load-bearing than deferring "telemetry sink choice" or "RuntimeCatalog storage backend" — the §23.5 reserved-detail-boundary pattern was designed for implementation-slice-triggered details, not for whole substrates beneath named top-level roles. The arch-spec ships an integration document with a structurally undefined substrate beneath one of its six canonical roles. This makes the choice between Option A and Option C genuinely close — a reader who weighs "no role ships with a placeholder substrate" more heavily than "respect the reserved-detail-boundary pattern" should prefer Option A.

**Why the user heuristic does not resolve it:** the runtime spec correctly excludes "shell governance" from its scope. Neither spec has authority to decide OpenShell's vendor status.

**Effect on cohort sequencing:** Option C means the §10.14 registry has **twelve rows instead of eleven** in the structural cohort (one additional placeholder row). Options A or B require additional content in the arch-spec (an internal-OpenShell sub-section or a third-party-vendor integration contract section) that would push the structural cohort into a larger change.

**Recommended option:** Option C — formally defer, list as a placeholder row in §10.14, lock when a concrete OpenShell implementation triggers the lock.

### User decision #3 — Inngest mode default

**Question:** Should the arch-spec declare serve-mode the default Inngest integration mode? Lab uses only serve-mode; production examples in the corpus use serve-mode via `inngest.cloud(...)` ([[vendor-verification-inngest-integration-mode-2]], Inngest 4.2.6).

**Option A — Declare serve-mode the default.** Pro: matches current lab and production usage; gives downstream consumers a default to assume. Con: locks the architecture into a topology assumption (inbound HTTP) that may change; defaults at architecture level pre-empt profile/deployment companion-spec authority.

**Option B — Declare no default; mode-selection is a profile/deployment concern (recommended).** Pro: keeps the architecture mode-neutral; leaves the default-selection question to the future deployment companion spec where it naturally belongs. Con: requires the arch-spec to be explicit that there is no default ("mode is a process-start harness-selection fact"), which is a slightly heavier sentence.

**Option C — Declare serve-mode the architecture default with connect-worker reserved as a locked-future alternative under the §23.5 reserved-detail-boundary pattern.** Pro: matches the runtime-spec's reserved-detail-boundary discipline ("lock no later than the first implementation slice that triggers"), which favors locking to what implementation slices have proven; the lab is currently on `inngest 3.51.0` with `inngest/bun` (serve-mode) used exclusively in Phase Two/Three proof work, and connect-worker mode is unproven in the lab to date — so serve-mode is the only mode under proof. Con: defaults at architecture level still pre-empt profile/deployment companion-spec authority; choosing this means the architecture commits to a topology assumption that the future deployment spec must inherit.

**Lab-version evidence.** The lab is currently on `inngest 3.51.0`, not 4.x. Connect-worker mode (`inngest/connect`, `WebSocketWorkerConnection` class with `isolateExecution`, `maxWorkerConcurrency`, `gatewayUrl` configuration) is an Inngest 4.x feature ([[vendor-verification-inngest-integration-mode-2]], https://registry.npmjs.org/inngest/4.2.6). Choosing Option A or Option B is risk-free under the current lab state because both keep serve-mode operative; choosing Option C explicitly commits the architecture to the lab's current proven mode but does not require a version bump immediately. Choosing a "no default but both modes named" Option B style commits to a future Inngest 4.x version bump and connect-worker validation cycle once a downstream consumer requests it.

**Why the user heuristic does not resolve it:** the runtime spec specifies both modes as first-class. Choosing a default is an architectural-vocabulary choice, not a runtime-mechanics choice.

**Effect on cohort sequencing:** Option B is the cleaner cleanup-cohort outcome. If Option A is chosen, the structural cohort's §13.2 paragraph (Rec #5) needs to add a default-mode declaration, and the future deployment companion spec needs to reckon with the default at definition time.

**Recommended option:** Option B — do not declare a default at architecture level. Defer to the future deployment companion spec.

### User decision #4 — Minimal-viable harness-mount types subset (3 vs 7)

**Question:** Should arch-spec §10.12 name the **full 7-type subset** (`CompiledSurfacePlan`, `FunctionBundle`, `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, `StartedHarness`, `ExecutionRegistry`, `PortableRuntimePlanArtifact`) or the **3-type minimum** (`HarnessDescriptor`, `StartedHarness`, `FunctionBundle`)?

**Option A — Full 7-type subset (recommended).** Pro: gives companion harness specs and vendor integration authors the full integration vocabulary; aligns with the per-name classification rule's commitment that all integration-surface names belong in the arch-spec; the four additional types (`CompiledSurfacePlan`, `MountedSurfaceRuntimeRecord`, `ExecutionRegistry`, `PortableRuntimePlanArtifact`) are all already runtime-spec named and documented. Con: seven names is more spec-vocabulary surface than three.

**Option B — 3-type minimum.** Pro: smaller change set; easier for a first reader to absorb. Con: leaves four named types in runtime-spec territory that companion specs probably still need to reference, creating a recurring "is this name in arch-spec or not?" ambiguity.

**Why the user heuristic does not resolve it:** the heuristic only resolves disputes; subset size is an editorial choice.

**Recommended option:** full 7-type subset.

### User decision #5 — `RuntimeDiagnosticContributor` row in §15.8

**Question:** Should arch-spec §15.8 add `RuntimeDiagnosticContributor` as a fifth row in the platform external interfaces table?

**Option A — Add as 5th row.** Pro: completeness. Con: `RuntimeDiagnosticContributor` is resource-authored, not system-authored; adding it conflates two categories of named entity.

**Option B — Omit (recommended).** Pro: keeps the 4-row table coherent (all four rows are system-produced, system-consumed external interfaces); matches the depth investigator's recommendation.

**Effect on cohort sequencing:** trivial — Option B is the structural-cohort default.

**Recommended option:** Option B — omit.

### User decision #6 — Runtime-spec §29 supersession scope

**Question:** Does the runtime-spec §29 supersession clause's scope ("older indexed runtime/effect documents") include the arch-spec on runtime mechanics?

**Evidence:** runtime-spec L5: "once locked, this document supersedes older indexed runtime/effect documents for runtime realization." The arch-spec is an **adjacent** canonical document, not an **older** one — both are in active development. The arch-spec is not strictly a "runtime/effect document" — it is a system-architecture document that contains runtime sections.

**Option A — Supersession includes arch-spec runtime sections.** Pro: gives the runtime spec unambiguous authority over runtime content even where the arch-spec contradicts it. Con: collapses the names-vs-mechanics distinction; effectively says the runtime spec supersedes the arch-spec on every shared name.

**Option B — Supersession excludes arch-spec; arch-spec defers via its own scope language (recommended).** Pro: aligns with Recommendation #1; the arch-spec's reworded §1 explicitly defers mechanics; the runtime spec doesn't need to supersede; keeps both documents as living canonical specs at their respective levels. Con: requires Rec #1 to ship before this question is moot.

**Effect on cohort sequencing:** Option B is the natural consequence of shipping Rec #1. If the user picks Option A, Rec #1 still ships but the runtime-spec §29 supersession clause needs to be amended to clarify scope ("does not include the canonical architecture spec, which defers via its own §1 scope language").

**Recommended option:** Option B — clarify the arch-spec's scope (Rec #1) and let the runtime-spec §29 clause naturally not apply to it.

---

These six decisions shape the alignment trajectory but do not change the discipline future companion specs will inherit. The next section codifies that discipline — the per-name classification rule, the six-rule attachment protocol, and the reserved-detail-boundaries pattern — so that companion specs developed after this alignment ships have a single canonical reference for how to attach.

## 6. Division-of-responsibility guidance for companion subsystem documents

This section carries the material future companion subsystem specifications will reference: the per-name classification rule, the six-rule attachment protocol, the reserved-detail-boundaries pattern from runtime-spec §23.5 / L4637, and a forward-looking enumeration of the companion specs the platform should expect to develop.

### The per-name classification rule (canonical statement)

> **Rule.** Names exposed to companion subsystem authors and vendor integration authors live in the arch-spec's integration vocabulary. Names consumed only inside the runtime-spec's mechanical pipeline live in the runtime-spec.

This rule is the synthesis between Recommendation #3 ("add named harness-mount types to arch-spec §10.12") and Recommendation #6 ("remove the named Effect-kernel primitives from arch-spec §10.6"). Without the rule, the two recommendations look like opposite edits — one adds names, the other removes them.

With the rule, they are two applications of one classification: the harness-mount types are exposed (companion harness specs and vendor integration authors must reference them) so they belong in arch-spec vocabulary; the Effect-kernel primitives are not exposed (only the runtime-spec's mechanical pipeline consumes them) so they belong in runtime-spec mechanics.

### Worked examples

Three pairs make the rule concrete:

**Example 1 — `FunctionBundle` (arch-spec) vs `ProcessQueueHubResource` (runtime-spec).** `FunctionBundle` is the input contract for the Inngest harness ([[depth-investigation-harness-mount-interface-contract-named-types]]; runtime-spec §21.2). Companion async-spec authors and Inngest integration authors must reference it. Therefore arch-spec §10.12 names it. `ProcessQueueHubResource` is one of four named process-local coordination resources ([[depth-investigation-provisioning-kernel-inventory-depth-reduction]]; runtime-spec §14 L3047–L3211). Only the runtime-spec's mechanical pipeline consumes it. Therefore arch-spec §10.6 acknowledges the category ("process-local coordination resources exist; non-durable; lifetime is per-process or per-role") without naming the four types.

**Example 2 — `PortableRuntimePlanArtifact` (arch-spec names; runtime-spec owns shape).** `PortableRuntimePlanArtifact` is the integration surface for "runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints" ([[depth-investigation-platform-external-interfaces-table]]; runtime-spec L3409–L3437). Deployment, observability, and control-plane companion specs must reference it. Therefore arch-spec §15.8 names it as a row in the platform external interfaces table. The **field shape** of `PortableRuntimePlanArtifact` (its TypeScript type, its serialization, its portability classification per §15.2) stays in the runtime spec. The arch-spec names; the runtime spec defines.

**Example 3 — `CompiledExecutionPlan` (runtime-spec only).** `CompiledExecutionPlan` is consumed by the runtime compiler's emission step ([[depth-investigation-harness-mount-interface-contract-named-types]]; runtime-spec §16). No companion spec consumes it; no vendor integration author consumes it; only the runtime-spec's compiler stage produces and consumes it. Therefore arch-spec does **not** name it.

The classification is not aesthetic — it is functional. Each named entity gets evaluated against the question "does any companion subsystem author or vendor integration author need to reference this name?" If yes: arch-spec. If no: runtime-spec. Borderline cases default to the runtime spec until a companion spec actually emerges that needs the name promoted.

### The 6-rule attachment protocol

These six rules govern how companion subsystem specifications attach to the architecture spec. They become part of the §10.14 registry section per Recommendation #2.

1. **Companion specs reference boundary names from the §10.14 registry, not internal aliases.** A companion deployment spec must call the deployment integration interface `PortableRuntimePlanArtifact` (the registry name), not `RuntimeDeploymentBlueprint` (an internal alias).
2. **Companion specs do not redefine boundary types; they refer by name to the owning runtime-spec section.** A companion observability spec must point at runtime-spec §22.2 for the `RuntimeTelemetry` field shape; it does not redefine `RuntimeTelemetry`.
3. **Companion specs do not duplicate mechanics covered by another spec.** A companion deployment spec should not enumerate the runtime compiler's validation list; it should cross-reference runtime-spec §16.
4. **Companion specs declare their own reserved-detail boundaries at lock time per the runtime-spec L4637 model.** A companion observability spec that defers, say, "telemetry sink choice" to a future implementation slice must declare that boundary as reserved at lock time.
5. **Companion specs do not use "fixes" language on mechanics they do not own — only on their own integration vocabulary.** A companion deployment spec may "fix" deployment placement vocabulary; it may not "fix" the runtime compiler's validation list.
6. **Arch-spec vocabulary is the canonical naming source; companion-spec names that conflict must yield.** If a companion spec invents a name that collides with an arch-spec name, the arch-spec name wins.

### The reserved-detail-boundaries pattern (runtime-spec §23.5 / L4637)

The runtime spec at L4637 codifies a pattern this report recommends propagating to the arch-spec via the §10.14 attachment protocol:

> Runtime spec §23.5 lists reserved detail boundaries (config precedence, provider refresh mechanics, call-local memoization, generic cache resources, process-local coordination provider details, runtime telemetry backend, RuntimeCatalog storage backend, etc.) and states each "must be locked no later than the first implementation slice that makes its dedicated specification trigger true."

This pattern lets the platform defer detail decisions without losing structural coherence. A companion deployment spec can defer "which deployment platform" to the first implementation slice that actually targets a deployment platform; until then, the boundary is reserved with locked integration hooks.

For the §10.14 registry, this means each row can carry a `reserved-detail-boundary` annotation indicating that the row's mechanics are not yet fully specified. The OpenShell row (per Section 5 user decision #2 Option C) is the first such annotation: it carries a placeholder until OpenShell's vendor status is locked.

### The companion subsystem spec roster the platform should expect to develop

The runtime realization spec is the only existing canonical companion subsystem spec ([[source-analysis-rawr-runtime-realization-system-canonical-spec]]). Other docs in the repo (`RAWR_Canonical_Testing_Plan.md`, `RAWR_Architecture_Migration_Plan.md`, `M2-guardrails-and-enforcement.md`, M2 milestone docs) are subordinate or migration-specific. Future companion specs the platform should expect:

1. **Deployment companion spec.** Owns: process placement on platform services, profile-to-deployment-target mapping, Inngest mode default selection, service binding to deployment-platform queues. Attaches to: §10.14 row 11 (control-plane and deployment), §15.8 row 1 (`PortableRuntimePlanArtifact`), the §17.8 Inngest-mode invariant. Reserved-detail boundaries: deployment-platform vendor (Vercel? Cloudflare? AWS? bare metal?).
2. **Observability companion spec.** Owns: telemetry backend, diagnostic-reader integrations, RuntimeCatalog storage backend, error reporting. Attaches to: §10.14 row 10 (RuntimeCatalog/diagnostics/telemetry), §15.8 rows 2–4 (`RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`). Reserved-detail boundaries: telemetry backend choice (OTLP? proprietary?).
3. **OpenShell companion spec** (per Section 5 user decision #2 Option C). Owns: OpenShell governance model, agent-role substrate, policy envelope. Attaches to: §10.14 row 9 (harness and native boundary), arch-spec §12 (OpenShell posture). Reserved-detail boundaries: OpenShell vendor status.
4. **Additional vendor harness companion specs** as new harnesses materialize. Each new vendor harness gets a §13.x stack diagram, a §10.12 named-types row addition, and a §10.14 registry-row reference.
5. **Profile companion spec.** Owns: profile catalogue, profile-to-runtime-context mapping, environment-to-profile resolution. Attaches to: §10.14 row 1 (lifecycle vocabulary, specifically the `definition` and `selection` phases), arch-spec §10.2 (App definition + entrypoint). Reserved-detail boundaries: environment-resolution mechanics.

For each future companion spec, the §10.14 registry can absorb the attachment via the per-row "boundary name → owning runtime-spec section" pattern. The pattern scales: a new companion spec adds (a) a row to the registry pointing at its dedicated section in the companion-spec file, (b) annotations on existing registry rows where the new spec extends them, and (c) reserved-detail-boundary declarations at lock time.

### Forward-looking implication for spec evolution

The names-vs-mechanics carve-out plus the §10.14 registry plus the six-rule attachment protocol plus the reserved-detail-boundaries pattern give the platform a **spec-evolution discipline** that scales as the canonical spec footprint grows. Each new companion spec is bounded by the same rules; each amendment to a companion spec triggers a cross-check against the registry; each new boundary the platform identifies (a new vendor integration, a new deployment target) gets a row added to the registry rather than a new chapter of the arch-spec.

Without this discipline, every runtime-spec amendment risks silently breaking the arch-spec — the kind of staleness already visible in the quarantined `m2-guardrails-and-enforcement.md` doc that points at the OLD runtime spec name. With it, the arch-spec stays a thin integration layer that companion specs attach to and the runtime spec stays the mechanical authority for runtime concerns.

The user framed the architecture spec's role as "the core integration document that explains how the entire platform works at a system level" and asked it to be "explicit about integration points: interfaces, boundaries, conditions, rules — whatever the system needs to make companion subsystem documents plug in cleanly." The seven recommendations and Section 5's six user-decision items together give the arch-spec exactly that posture; the discipline this section codifies is what keeps it there as future companion specs attach.
