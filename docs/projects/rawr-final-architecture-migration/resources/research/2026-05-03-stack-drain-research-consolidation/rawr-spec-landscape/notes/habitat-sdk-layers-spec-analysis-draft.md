---
title: Habitat SDK Layers — spec analysis (DRAFT)
id: habitat-sdk-layers-spec-analysis-draft
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:35:40.752612Z'
updated: '2026-05-01T21:10:17.164041Z'
source: /Users/mateicanavra/Documents/projects/RAWR/Habitat_SDK_Layers_Draft_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/Habitat_SDK_Layers_Draft_Spec.md
- runtime_authority: no
- status_flag: **DRAFT** — filename literally contains "Draft" and the spec self-labels "Draft canonical proposal" (Section header). It is shape-correct and load-bearing for layer-boundary thinking, but explicitly not finalized. Date stamp 2026-04-29.

## Scope and purpose

This spec proposes the canonical layered shell for the **Habitat SDK** — the SDK for "AI-native software habitats" — and defines the layer split that prevents the SDK from "swallowing governance." It fixes a 9-layer model (L0 Runtime realization through L8 Governance, with optional L9 Foundry export), the package topology implied by that split, the ownership matrix per layer, canonical type sketches and flows for each layer, and the forbidden patterns that keep layers from merging into each other. Crucially it draws the line between **SDK ownership** (geometry, signals, shell, context, query) and **coordination/review/governance** (composed above the SDK). It explicitly does not fix exact package names, vendor choices, governance thresholds, schema, or universal grammar machinery.

## Naming context: "Habitat" as the working dir

The user's working directory is `rawr-hq-template` — i.e., RAWR HQ is itself an instance of a "habitat." This spec uses "Habitat SDK" as the reference name for what was previously talked about as "RAWR SDK." The branding shift (RAWR → Habitat) is observable in package paths: `@habitat/sdk`, `@habitat/runtime`, `@habitat/workstreams`, `@habitat/agent-runtime`, `@habitat/rawr-governed`. Note "rawr-governed" is the only governance-layer package that retains the RAWR name — RAWR is positioned as the *governance flavor* atop Habitat physics, not synonymous with Habitat itself. This is a meaningful conceptual move.

## Concern coverage

The 9-layer stack covers the following concerns (one per layer, by design):

- **L0 Runtime realization** — process realization: compiler, provider coverage, bootgraph, Effect-backed provisioning, service binding, adapter lowering, harness handoff, runtime catalog, telemetry, finalization. Explicitly defers to the canonical Effect Runtime Realization spec (the gospel doc).
- **L1 Geometry SDK** — authoring grammar: packages, resources, providers, services, plugins, apps, roles, surfaces, profiles, entrypoints, public deps. The canonical software ontology.
- **L2 Graph/query/diagnostics** — topology classification, graph extraction, rule engine, query engine, gates, blast-radius analysis, runtime catalog read model.
- **L3 Signals** — `HabitatSignal` envelope, sources, sinks, correlation IDs, authority metadata, provenance, normalization.
- **L4 Interaction shell** — agent channels, shell routing, tools, shell gateway, session correlation, shell policy, direct vs durable delegation.
- **L5 Context substrate** — context sources, packs, provenance, redaction, target-specific compilation, freshness metadata.
- **L6 Workstreams (Coordination)** — durable work objects, charters, output contracts, plan revisions, runs, artifacts, lifecycle, workstream events.
- **L7 Review** — review graphs, criteria, evaluator specs, evidence adapters, harnesses, attempts, verdicts, repair, invalidation, waivers.
- **L8 Governance** — tensions, stewards, RFDs/decisions, autonomy thresholds, human escalation, governance profiles, policy over waivers.
- **L9 Foundry export (optional)** — capability bundles, target profiles, retargeting workstreams, destination verification.

Cross-cutting: hooks, diagnostics, provenance, authority, correlation appear at multiple layers but each layer "exposes typed hooks to the surrounding layers" (§2).

## Platform-level signal

This spec is the **architectural skeleton** of the entire RAWR/Habitat platform. It does not live in one platform level — it is the spec that *defines* the platform levels. Mapping to the user's three-tier framing:

- **Core/Runtime/Mechanical** = L0 + L1 + L2 (Habitat SDK core: runtime realization + geometry + graph)
- **Coordination/Sensory** = L3 + L4 + L5 + L6 (signals, shell, context, workstreams — how the platform receives/processes signals from the world and turns them into durable work)
- **Governance** = L7 + L8 (review acceptance + authority/adaptation)
- **Cross-cutting/optional** = L9 Foundry export

The spec's own three-line summary maps cleanly: "Habitat SDK owns the nervous system. Coordination owns the ongoing work. Governance owns authority and adaptation." (§1)

## Vendor integrations declared

The spec is **deliberately vendor-light** — that is part of its discipline. It explicitly defers vendor selection to lower or adjacent specs:

- **Effect** — referenced as the provisioning kernel ("Effect-backed provisioning kernel" §L0) and as the procedure DSL (`.effect(function* ({ input, deps }) {...})` §L1). Effect is implicit infrastructure, not vendor-as-feature.
- **Nx** — referenced negatively: "exact implementation of topology extraction or Nx integration" is out of scope for this spec (§3). So Nx is acknowledged as the build/topology vendor without committing to integration mechanics here.
- **TypeScript** — implicit; all type sketches are TS. No version pin.
- **oRPC** — not named directly. The procedure shape (`.input/.output/.effect`) is consistent with oRPC contracts but the spec stays grammar-level.
- **Mermaid** — used for diagrams (documentation tool, not runtime).
- **Shell channels, context indexing, evidence harnesses, evals** — all listed as out-of-scope for vendor selection (§3): "concrete vendors for shell channels, context indexing, evidence harnesses, or evals" deferred.

This is a "stand on shoulders of giants by *not naming the giants yet*" pattern — the SDK fixes the seams; vendors fill the seams.

## Don't-own-still-manage frontier

The spec is unusually explicit about this frontier. The "Layer X does not own" subsection appears for every layer, and the forbidden-patterns section (§8) is built around it. Specific don't-own-still-manage points:

- **Native framework semantics after adapter handoff** (§L0 "does not own"): runtime stops at the adapter; what Elysia/Inngest/etc do natively is theirs. RAWR manages the *handoff*, not the native plane.
- **Workflow engine semantics** (§L6): "Layer 6 does not own ... workflow engine semantics" — Inngest/Temporal/etc are the durable execution vendor. Workstreams sit *above* and reference run IDs.
- **External tool semantics** (§L7): evidence harnesses are external (CI, browser, evals); RAWR owns the *adapter* that produces canonical evidence, not the tool.
- **Public product caller authority** (§L4): the shell is for trusted operators; product API authority is *not* the shell's. Public API plugin authority lives elsewhere (likely an authentication subsystem).
- **Worktree contents** (§L6): git/worktree mechanics are the developer-tooling vendor's; the workstream just references artifact IDs.
- **Database schema** (§3 explicit non-goal): persistence is a vendor concern below the SDK.

Silences worth flagging:
- **Authentication / identity** appears as `SignalAuthority` and `AuthorityRef` types but no auth subsystem is specified — the Authentication Subsystem spec is its peer. The SDK exposes the seam (`callerKind`, `authScope`, `trustBoundary`, `policyRef`).
- **Deployment** is not addressed at all here; the Deployment Subsystem spec is its peer.
- **Async runtime** (durable execution) is referenced as "async durable plane" but not specified — the Async Runtime spec is its peer.
- **OpenShell agent steward activation** is referenced as L4 + L8 cooperation but the OpenShell spec owns the details.

## Relationship to Effect Runtime Realization spec

This is the central question. **Habitat SDK Layers is the public DX surface ON TOP of the Effect Runtime Realization spec, AND it positions runtime realization as L0 — the bottom layer.** Specifically:

- L0's scope list ("runtime compiler; provider coverage validation; provider dependency closure; bootgraph ordering; Effect-backed provisioning kernel; process runtime assembly; service binding and binding cache; workflow dispatcher materialization; adapter lowering; harness handoff; runtime catalog; diagnostics, telemetry, finalization") is essentially the table of contents of the Effect Runtime Realization canonical spec.
- The Habitat SDK Layers spec **is the SDK shell**; runtime realization is the engine the SDK shell sits on. The split is deliberate: this spec authors the *public promise* (geometry, signals, shell, context), while the runtime spec owns the *mechanical truth* (how `startApp(...)` actually compiles and runs).
- L1's `defineService`, `defineApp`, etc., are the public DX. L0 makes them executable.

**So: Habitat SDK = public DX surface; Effect Runtime Realization = authoritative engine spec the DX compiles into.** They are complements, not competitors.

## Completeness signals

- **Status: "Draft canonical proposal"** — explicit draft tag at top of file.
- **§3 explicit non-goals** — exact package names, generic spelling, DB schema, vendor choices, governance thresholds, Nx integration, universal grammar are all deferred. This is a *shape* spec, not an *implementation* spec.
- **Layer 9 marked "Optional"** — Foundry export/retargeting is conditional, not core path.
- **§5 Package topology** — labeled "Recommended" not "Required"; "Public distribution can collapse this into fewer packages at first."
- **§9 Adoption sequence** — explicitly staged 1→9; "Each stage is valuable without forcing the next." The sequence itself signals that L4–L8 are not all built yet.
- **References to peer specs are implicit** — no explicit cross-spec reference list. Reader must know the surrounding RAWR spec corpus to fill in: Authentication, Deployment, Async Runtime, Authoring Classifier, OpenShell, Workstream System, Workstream Review, Service Package Effect, Factory Bundle Export, System Architecture.
- **No TBD/TODO markers** in the body. Despite the Draft tag, the prose is confident and tight. Draft status applies to *finalization* (naming, packaging) more than to *shape*.
- **No Phase/Milestone deferrals inline** beyond the §9 staging.
- **Confidence flavor**: authoritative-feeling on layer boundaries and forbidden patterns; exploratory-feeling on concrete package paths and vendor adapters.

## Cross-spec dependencies

Implicit but unmistakable:

- **RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md** — L0 IS this spec's territory. Habitat SDK Layers references it conceptually but does not name it.
- **RAWR_Authoring_Classifier_System_Canonical_Spec.md** — L2 classifier work; cited indirectly via "topology classification."
- **RAWR_Authentication_Subsystem_Canonical_Spec.md** — fills the `SignalAuthority`/`AuthorityRef` seams in L3 and L4.
- **RAWR_Async_Runtime_Canonical_Spec.md** — fills the "async durable plane" referenced in L4 and L6.
- **RAWR_Deployment_Subsystem_Canonical_Spec.md** — process realization meets deployment somewhere between L0 and the platform host.
- **RAWR_OpenShell_Agent_Runtime_and_Steward_Activation_Spec_Final.md** — fills L4 (shell, channels, tools) and L8 (steward activation).
- **RAWR_Managed_Agent_Workspace_Execution_Canonical_Spec.md** — adjacent to L6 runs / L7 review for agent execution.
- **RAWR_Workstream_System_Canonical_Spec.md** — IS L6.
- **RAWR_Workstream_Review_Subsystem_Canonical_Spec.md** — IS L7.
- **RAWR_Factory_Bundle_Export_Spec.md** — IS L9.
- **RAWR_System_Architecture_Canonical_Spec.md** — likely the umbrella for all of the above.
- **RAWR_Service_Package_Effect_Spec.md** — concrete vendor-shape pattern for L1 service packages on Effect.

This spec is essentially the **map** that all the others fit into.

## Verbatim load-bearing definitions / claims

1. (§1) `"Habitat SDK is the SDK for AI-native software habitats. It is not, at this stage, a universal SDK for arbitrary agent worlds."`
2. (§1) `"Habitat SDK owns the nervous system. Coordination owns the ongoing work. Governance owns authority and adaptation."`
3. (§1, canonical split) `"SDK owns: geometry, authoring, derivation, rules, signals, shell surfaces, context substrate, queries, diagnostics, hooks."`
4. (§2) `"Each layer solves exactly one layer of the problem and exposes typed hooks to the surrounding layers."`
5. (§4) `"L0 Runtime realization @habitat/runtime compiler / bootgraph / process runtime / harnesses"` (the L0 boundary).
6. (§L0) `"Turn selected app composition into one started, typed, observable, stoppable process per startApp(...) invocation."`
7. (§L0 does-not-own) `"native framework semantics after adapter handoff."`
8. (§L1) `"Agents need stable nouns and legal moves. If a system only offers folders and conventions, the agent must infer ownership and composition every session."`
9. (§L3 distinction) `"Signal = something happened. Coordination event = this signal changes durable work state. Governance event = this signal changes authority, escalation, or policy. Layer 3 only owns the first."`
10. (§L4 distinction) `"Shell drives what. Stewards drive how. Governance decides whether."`
11. (§L5 distinction) `"Context compiler = assembler. Truth remains in truth-owning services and artifacts. Layer 5 compiles. It does not own the world."`
12. (§L7 distinctions) `"evidence != verdict / review loop != run / test != review loop / score != verdict / waiver != satisfaction / verdict != workstream closure"`
13. (§L8 distinction) `"Coordination asks: what work exists and where is it in its lifecycle? Review asks: is the work acceptable enough to advance? Governance asks: who is allowed to decide, and under what authority?"`
14. (§8.1 forbidden) `"installing @habitat/sdk creates tension ledgers, steward identities, RFDs, and workstream DBs"` — explicitly forbidden.
15. (§8.6 forbidden) `"Habitat SDK promises arbitrary ontology authoring before a second grammar is proven"` — explicitly forbidden.
16. (§10 final picture) `"Habitat SDK = enforceable software habitat + sensory/context/shell primitives. Workstreams = durable coordination. Review = acceptance control. Governance = authority and adaptation."`

## Estimated completeness grade (initial impression)

**B+** for shape and architectural thinking; **draft status separately flagged**.

Justification: The spec is exceptionally clear on layer boundaries, ownership, and forbidden patterns. The 9-layer stack is internally consistent and the "does not own" + "forbidden patterns" discipline is rare and load-bearing. However, it is explicitly DRAFT, defers all concrete vendor/package/schema decisions to peer specs, contains no implementation detail beyond type sketches, and has no explicit cross-spec reference list — reader must reconstruct the dependency graph. As a *shape* spec it grades A-; as a *complete* spec it grades C; the blended impression is B+. The Draft status is a non-fatal flag — the architectural skeleton here is the most reusable artifact in the corpus for landscape mapping.

**Identity restated: runtime_authority: no.** This spec defers runtime semantics to the Effect Runtime Realization canonical spec. Its authority is over *layer boundaries and SDK shape*, not runtime mechanics.
