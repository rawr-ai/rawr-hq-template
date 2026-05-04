---
title: Locus interim — platform-level-shape
id: locus-interim-platform-level-shape
tags:
- rawr-spec-landscape
- locus-platform-level-shape
- runtime-canon-arch-align
created: '2026-05-01T20:50:25.593082Z'
updated: '2026-05-01T21:10:16.184410Z'
status: draft
type: interim
tier: institutional
deprecated: false
---

# Interim report: platform-level-shape

**Locus question:** Does RAWR's landscape decompose into three levels (user's mechanical/coordination/governance), four levels (with a distinct semantic/composition layer between coordination and governance), or differently — and what does each spec's self-located level imply for the committed structural take?

**Flavor:** dialectical

---

## The user's three proposed levels (brief restatement)

The research query proposes — tentatively, inviting adjustment — three platform levels:

1. **Mechanical / operational / runtime / core platform** — the engine that turns declarations into running processes: Effect, bootgraph, runtime compiler, harnesses, provider provisioning.
2. **Coordination** — systems that enable the platform to receive and process signals from the outside world: ingress, async, shell, durable work objects.
3. **Governance** — how decisions get made over time: authority, decisions, policy, review, escalation.

The query explicitly says "those may not be correct" and requests adjustment to "the concrete sets of engineering concerns that actually group well together."

---

## How the two META specs internally decompose

### Habitat SDK Layers (L0–L8 + L9): nine precise layers

The Habitat SDK Layers draft spec (DRAFT, 2026-04-29) proposes an explicit 9-layer model:

- **L0 Runtime realization** — compiler, bootgraph, Effect-backed provisioning, process assembly, harness handoff, RuntimeCatalog.
- **L1 Geometry SDK** — authoring grammar: packages, resources, providers, services, plugins, apps, roles, surfaces, entrypoints.
- **L2 Graph / query / diagnostics** — topology classification, graph extraction, rule engine, query engine, gates, blast-radius.
- **L3 Signals** — `HabitatSignal` envelope, sources, sinks, correlation IDs, authority metadata, provenance.
- **L4 Interaction shell** — agent channels, shell routing, tools, shell gateway, session correlation, shell policy.
- **L5 Context substrate** — context sources, packs, provenance, redaction, freshness.
- **L6 Workstreams (Coordination)** — durable work objects, charters, output contracts, plan revisions, runs, artifacts.
- **L7 Review** — review graphs, criteria, evaluator specs, evidence adapters, verdicts, repair, waivers.
- **L8 Governance** — tensions, stewards, RFDs/decisions, autonomy thresholds, human escalation, governance profiles.
- **L9 Foundry export (optional)** — capability bundles, target profiles, retargeting workstreams.

The spec's own one-line summary (§1): "Habitat SDK owns the nervous system. Coordination owns the ongoing work. Governance owns authority and adaptation." That maps L0–L5 to SDK, L6 to Coordination, L7–L8 to Governance — which is already a *three-tier frame* underneath a nine-layer technical model.

### System Architecture META (ownership-axis decomposition)

The RAWR System Architecture spec (umbrella/META, grade A) does not use numbered layers. Its primary structural axis is **ownership**: "Services own truth. Plugins project. Apps select. Resources declare capability contracts. Providers implement capability contracts. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe." (§4.1)

It names three durable separations: semantic separation, realization separation, authority separation. Its runtime realization lifecycle is a seven-phase chain: `definition → selection → derivation → compilation → provisioning → mounting → observation`. Its canonical authority law (§4.11): "the shell drives what / the stewards drive how / governance decides whether." Like the Habitat SDK Layers spec, the System Architecture spec's *implicit* three-tier frame maps onto the query's proposal — but with a richer taxonomy internal to each tier.

---

## Per-spec self-location

The following maps each of the thirteen corpus specs to its primary platform level, with a one-sentence justification.

| Spec | Primary Level | Justification |
|------|--------------|---------------|
| **Effect Runtime Realization System** (authoritative) | **Core Runtime** | It IS the seven-phase engine — bootgraph, Effect kernel, compilation, provisioning, harness mounting — the mechanical truth all other specs defer to. |
| **Async Runtime** | **Coordination (with Core Runtime overlap)** | Its job is routing durable signals (events, schedules, webhooks) from outside RAWR into steward execution; it specializes the `async` role of the runtime. |
| **Deployment Subsystem** | **Coordination / Cross-cutting** | It is the control plane between runtime realization and platform operation — consuming compiled process plans and producing platform-native placement artifacts — not runtime authority and not governance. |
| **OpenShell Agent Runtime** | **Coordination** | The canonical signal-intake layer for trusted operators: it converts conversational human signals into governed delegations, explicitly not runtime and not governance authority. |
| **Managed Agent Workspace Execution** | **Core Runtime (with Coordination hooks)** | It defines a runtime capability resource (`ManagedAgentWorkspaceResource`) that lives in the realization plane; its Coordination hooks are mediated through async steward runs. |
| **Authentication Subsystem** | **Cross-cutting (Coordination-dominant)** | Auth verification and surface admission are the literal "signal-from-outside-world" gatekeepers; durable RBAC truth lands in product services; runtime realization integration ties it to Core Runtime. |
| **Authoring Classifier System** | **Semantic / Composition** | It turns human requests into typed, narrowed, generator-ready capability realization plans — operating at the authoring lifecycle seam *between* ontology expression and runtime derivation; no other tier correctly describes this work. See below. |
| **Factory Bundle Export** | **Semantic / Composition (+ Coordination for retargeting workflow)** | It packages verified capabilities as transferable `CapabilityBundle`s and manages retargeting workstreams; this is manufacturing-of-semantic-artifacts, not runtime, not governance. |
| **Habitat SDK Layers** | **Cross-cutting (defines all tiers)** | This spec *is* the platform-level skeleton — it defines all nine layers and therefore all tiers; it is the spec that names the levels, not a resident of any one. |
| **System Architecture** | **Cross-cutting (defines all tiers)** | Same as above; the umbrella META spec names ownership laws, not tier residents. |
| **Workstream System** | **Governance** | The spec self-locates explicitly: "A workstream is a durable, stateful, reactive coordination object that owns the lifecycle of producing one or more outputs under evolving evidence and governance." Durable governance of ongoing work. |
| **Workstream Review Subsystem** | **Governance** | "Review owns whether the work may advance." This is acceptance authority — the governance verdict machine embedded in workstream coordination. |
| **Service Package Effect** | **Core Runtime (pattern illustration)** | It illustrates the "stand on shoulders of giants" vendor integration shape for the oRPC × Effect × RAWR triad; lives at the runtime service authoring layer. |

---

## What the corpus already said

Before this investigation, the corpus self-located all specs via "Platform-level signal" sections in each digest ([[habitat-sdk-layers-spec-analysis-draft]], [[rawr-system-architecture-spec-analysis]], [[rawr-authoring-classifier-system-spec-analysis]], [[rawr-factory-bundle-export-spec-analysis]], [[rawr-managed-agent-workspace-execution-spec-analysis]], [[rawr-workstream-system-spec-analysis]], [[rawr-workstream-review-subsystem-spec-analysis]], [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]]). The digests converge on three broad regions: Core Runtime, Coordination, and Governance. However, two specs — Authoring Classifier and Factory Bundle Export — resist clean placement in that three-tier frame. The Authoring Classifier was called "cross-cutting / authoring-time governance" by its own digest, but that label is imprecise: governance in that spec's sense means "encoding RAWR law as enforceable rule packs," not "decisions over time" — the user's definition of governance. The Factory Bundle Export was called "cross-cutting / coordination with governance overtone," also imprecise. Both specs operate at a different granularity than the three proposed tiers capture.

---

## Evidence synthesis

### What the three-tier frame does well

The three-tier frame (Core Runtime / Coordination / Governance) cleanly captures eight of thirteen specs. The Effect Runtime Realization spec is unambiguously Core Runtime. The Workstream System and Workstream Review are unambiguously Governance. The Async Runtime, Deployment Subsystem, and OpenShell Agent Runtime are unambiguously Coordination. The two META specs (System Architecture, Habitat SDK Layers) are definitionally cross-cutting. The Service Package Effect is a pattern illustration for Core Runtime.

The Habitat SDK Layers spec's own §10 summary supports the three-tier reading: "Habitat SDK = enforceable software habitat + sensory/context/shell primitives. Workstreams = durable coordination. Review = acceptance control. Governance = authority and adaptation." And the System Architecture spec's law: "external product ingress enters through server / external conversational ingress enters through agent / durable system work runs on async" — a coordination-tier statement.

### Where the three-tier frame breaks

Two specs do not cleanly fit:

**Authoring Classifier System.** This spec's job is to turn a human/business request into a typed, narrowed, generator-ready capability realization plan. It is not runtime (it is explicitly pre-runtime, upstream of SDK derivation). It is not coordination in the "receiving signals from outside world" sense (it doesn't route signals; it *classifies* authoring intent). It is not governance in the "decisions over time" sense (it encodes *static* law into rule packs, not durable authority). Its own digest concedes it is "authoring lifecycle / governance seam: pre-runtime, post-request." The Habitat SDK Layers spec indirectly locates it at L2 (topology classification, graph extraction, rule engine) — the "Graph / query / diagnostics" layer. This is the software ontology knowledge layer: understanding what something IS in RAWR terms before deciding what to do with it.

**Factory Bundle Export.** This spec defines how manufactured capabilities — verified native-mode products of Core Runtime — are packaged as `CapabilityBundle`s with proof packs and transferred to foreign destinations via retargeting workstreams. It is not Core Runtime (it sits *above* runtime, after verification). It is not Coordination (retargeting workstreams are coordination-flavored but the bundle itself is a semantic artifact, not a signal). It is not Governance (frozen benchmark epochs and acceptance discipline *inform* governance but are not the authority layer). The Habitat SDK Layers spec locates it at L9 — the optional Foundry export tier. This is the capability-manufacturing and semantic-packaging concern: the ability to treat RAWR outputs as portable artifacts, not just processes.

Both specs operate at what can be called the **Semantic / Composition** tier: the layer where RAWR's ontology is *expressed*, *classified*, *packaged*, and *transferred* — distinct from how it is *mechanically realized* (Core Runtime) or *externally received* (Coordination) or *governed over time* (Governance).

### Position A: Three tiers suffice — Classifier and Factory are edge governance concerns

The strongest case for three tiers is the Habitat SDK Layers spec's own summary: "Habitat SDK owns the nervous system. Coordination owns the ongoing work. Governance owns authority and adaptation." Under this reading, the Authoring Classifier is pre-runtime governance tooling (it encodes governance law), and the Factory Bundle Export is post-governance packaging (it exports governed artifacts). Both can be stretched into the governance tier without distortion — they are both about "how decisions get made" at the authoring and export seams. The three-tier frame retains conceptual clarity: operators understand mechanical engineering concerns, coordination concerns, and governance concerns as intuitive separations.

### Position B: Four tiers better — a distinct Semantic / Composition layer is load-bearing

The strongest case for four tiers begins with what the Authoring Classifier and Factory Bundle Export *actually do* versus what Governance does. The Workstream System and Workstream Review are about durable decisions over *running work* — they are reactive, state-machine-governed, driven by signals at runtime. The Authoring Classifier is about *structuring intent* before any work runs — it is a pre-execution ontological classification engine, not a runtime authority and not a work-lifecycle governor. The Factory Bundle Export is about *semantic packaging* — producing a transferable unit with proof — not about authority or policy. Collapsing these into Governance confuses two distinct engineering concerns: (a) "what is this thing in RAWR's ontology and how should it be structured" (semantic/composition), and (b) "who is allowed to advance this thing and under what authority" (governance).

More critically: the Habitat SDK Layers spec uses nine distinct layers precisely because the boundary between L2 (graph/query/ontology tools), L6 (workstreams), L7 (review), and L8 (governance) is *load-bearing*. L2 is not governance; it is the understanding layer. L6 is not governance; it is the coordination object. L7 is acceptance mechanics. Only L8 is authority/adaptation. The four-tier frame respects these distinctions at a level of granularity that the three-tier frame loses.

The concrete engineering test: an Authoring Classifier team and a Workstream Governance team have fundamentally different concerns. The classifier team owns ontology, rule packs, intent taxonomy, generator emission, and plan validation — these are semantic engineering concerns. The governance team owns tensions, RFDs, authority thresholds, escalation policy, and waiver authority — these are organizational/authority concerns. Grouping them in one tier produces a misleadingly large "governance" bucket that hides the semantic engineering discipline.

---

## Test cases: what each candidate scheme does well and fails at

| Test case | Three-tier result | Four-tier result |
|-----------|------------------|-----------------|
| Route "Authoring Classifier System" to a team | Sent to Governance team (odd fit — classifier engineers don't own authority decisions) | Sent to Semantic/Composition team (correct — these are ontology and rule-pack engineers) |
| Route "Factory Bundle Export" to a team | Sent to Governance or Coordination (neither feels right — bundle packaging is artifact manufacturing) | Sent to Semantic/Composition team (correct — proof-pack manufacture is semantic work) |
| Explain to a new engineer what "Coordination" does | Clean: ingress, async, shell, deployment — all signal-routing work | Clean: same |
| Explain to a new engineer what "Governance" does | Bloated: includes classifier, bundle, workstreams, review, tensions, RFDs, stewards, escalation | Precise: tensions, RFDs, decisions, stewards, escalation, authority thresholds |
| Map Habitat SDK Layers L2 (graph/query/classifier tools) | Goes to Core Runtime or Governance (neither is correct) | Goes to Semantic/Composition (correct) |
| Does the tier boundary prevent the "swallowing governance" failure mode? | Weak — classifier is in Governance and could claim authority it doesn't have | Strong — classifier is separate from Governance; forbidden patterns are easier to enforce |
| Count of cross-cutting specs | 2 (System Architecture, Habitat SDK Layers) | 2 (same) |
| Unused tiers | None | None (all four have multiple residents) |

---

## Committed position

The evidence from thirteen specs compels a **four-tier structural decomposition**, not three. The correct tier names, derived from the corpus's own vocabulary rather than imposed from outside:

1. **Core Runtime** — the process realization engine: compiler, bootgraph, Effect kernel, provider provisioning, harness mounting, diagnostics. Authority spec: Effect Runtime Realization. Residents: runtime-realization, managed-agent-workspace, service-package-effect (pattern illustration).

2. **Semantic / Composition** — the ontology expression, classification, and artifact packaging layer: SDK geometry grammar, graph/query/topology tools, authoring classifier, capability bundle export, and the static law encoded in rule packs that governs what is *structurally* legal before runtime. Authority specs: System Architecture (ontology), Habitat SDK Layers (layer boundaries), Authoring Classifier (classification engine), Factory Bundle Export (foundry packaging). Residents: authoring-classifier, factory-bundle-export, and (partially) habitat-sdk-layers and system-architecture as the spec-defining artifacts of this tier.

3. **Coordination** — the signal-routing and durable-work-activation layer: receiving outside-world signals (HTTP, async events, shell, deployment triggers), routing them into durable steward execution, managing the lifecycle of ongoing work as coordination objects (workstreams), and managing the operational placement of runtime processes. Authority specs: Async Runtime, OpenShell Agent Runtime, Deployment Subsystem, Workstream System (the durable work object). Residents: async-runtime, openshell-agent-runtime, deployment-subsystem, workstream-system, authentication (dominant home).

4. **Governance** — the authority and adaptation layer: who is allowed to decide what, under what conditions, with what escalation, waiver, and review machinery. Durable decisions, tensions, RFDs, steward authority, and acceptance control. Authority specs: Workstream Review Subsystem (acceptance machinery), and the future governance spec referenced by Workstream Review. Residents: workstream-review-subsystem, and the unnamed future governance/tensions/RFDs spec.

The load-bearing reason to prefer four over three is this: the Authoring Classifier and Factory Bundle Export are *semantic engineering concerns* — they are about what things ARE in RAWR's ontology and how they are packaged — not about who has authority to advance work (Governance) or how outside signals reach inside execution (Coordination). Forcing them into Governance produces a tier with incoherent membership: classifier engineers, bundle packaging engineers, RFD authors, and steward authority designers do not share a primary engineering concern. A four-tier model produces coherent team topology, cleaner forbidden-pattern enforcement (the classifier cannot claim authority it doesn't have; the foundry does not own deployment semantics), and correctly honors the Habitat SDK Layers spec's own L2/L6/L7/L8 distinctions which map precisely onto Semantic, Coordination, Review, and Governance sub-levels.

**Position:** RAWR's platform decomposes into four tiers — Core Runtime, Semantic/Composition, Coordination, and Governance — because the Authoring Classifier and Factory Bundle Export constitute a distinct semantic engineering tier that is structurally separate from both runtime mechanics and governance authority, and collapsing this tier into Governance produces an incoherent engineering grouping that obscures the platform's actual team and concern topology.

**Confidence:** Medium-high (~70%). The four-tier reading is strongly supported by the per-spec self-location analysis and the Habitat SDK Layers spec's nine-layer model, which forces distinction between L2 (ontology tools), L6 (coordination), L7 (review), and L8 (governance). It is weakened by the fact that the Habitat SDK Layers spec's own §1 summary uses a three-line framing ("SDK / Coordination / Governance") and both META specs endorse three broad regions in their summary statements. A counter-reading by a skilled engineer could reasonably collapse Semantic/Composition into Core Runtime (treating classifier and factory bundle as "SDK-adjacent build-time tooling") — that reading would be defensible but imprecise.

**Boundary conditions:** The four-tier model applies to the RAWR/Habitat platform as specified in the current corpus (thirteen specs). If the Authoring Classifier were scoped only as a CLI tool (not a canonical subsystem with locked rule packs and enforcement consequences), its weight would not justify a separate tier. If Factory Bundle Export were scoped as a deployment artifact (an output of Deployment Subsystem) rather than a semantic packaging concern, it could fall into Coordination. Under those narrow scopes, three tiers would suffice. The four-tier model specifically holds because the Authoring Classifier is a *canonical platform subsystem with enforcement authority* and the Factory Bundle Export is a *proof-pack manufacturing concern* — not a delivery mechanism.

**What would change this position:** If a revised Habitat SDK Layers spec explicitly mapped both the Authoring Classifier and Factory Bundle Export into L6 (Coordination) or L8 (Governance) rather than into L2/L9, that would constitute direct evidence from the defining architecture spec that four tiers are not warranted. Alternatively, if a future "semantic layer" spec existed and was found to have the same concerns as Coordination or Governance, that would indicate over-decomposition. Currently, no such evidence exists in the corpus.

**Evidence weight:** 8 primary spec digests read in full, 5 additional spec digests read (authentication, async-runtime, deployment, openshell, service-package-effect). 2 META specs (Habitat SDK Layers, System Architecture) provide the skeletal decomposition. 2 specs (Authoring Classifier, Factory Bundle Export) are the contested boundary cases. 11 of 13 specs cleanly self-locate in one of the four proposed tiers. 2 META specs are by design cross-cutting. Zero specs produce evidence contradicting the four-tier model; the tension is only between three-tier (summary-level) and four-tier (detail-level) framings of the same corpus.

---

## Open questions

- Does a future "Governance" spec (tensions, RFDs, stewards, escalation, autonomy thresholds) confirm that Governance is a distinct-enough tier to remain separate from the Workstream Review Subsystem, or will it merge the two?
- Does the Habitat SDK Layers spec, when finalized, update its §1 summary to match its nine-layer model's richer decomposition, or does it intentionally collapse to three for communicability?
- The Service Package Effect spec is a vendor-integration shape reference, not a tier resident — should the final report treat it as a cross-cutting pattern rather than placing it in Core Runtime?
- Is there a fifth tier implied by the operational deployment concerns (Railway, Railpack, OCI, replica placement) that the Deployment Subsystem's "control plane between runtime realization and platform operation" framing suggests? This investigation's four-tier model absorbs Deployment into Coordination, but the operational placement concern is distinct from signal-routing — a future report could argue for separating them.

---

## Sources

1. [[habitat-sdk-layers-spec-analysis-draft]] — Habitat SDK Layers draft spec analysis; the nine-layer model and tier-boundary evidence.
2. [[rawr-system-architecture-spec-analysis]] — System Architecture META spec analysis; ownership-axis decomposition and canonical authority laws.
3. [[rawr-authoring-classifier-system-spec-analysis]] — Authoring Classifier spec analysis; semantic/composition tier evidence.
4. [[rawr-factory-bundle-export-spec-analysis]] — Factory Bundle Export spec analysis; foundry/packaging tier evidence.
5. [[rawr-managed-agent-workspace-execution-spec-analysis]] — Managed Agent Workspace Execution spec analysis; Core Runtime placement.
6. [[rawr-workstream-system-spec-analysis]] — Workstream System spec analysis; Governance tier placement.
7. [[rawr-workstream-review-subsystem-spec-analysis]] — Workstream Review Subsystem spec analysis; Governance acceptance tier.
8. [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] — Effect Runtime Realization System canonical spec analysis; Core Runtime authority.
9. [[rawr-async-runtime-spec-analysis]] — Async Runtime spec analysis; Coordination tier placement.
10. [[rawr-authentication-subsystem-spec-analysis]] — Authentication Subsystem spec analysis; cross-cutting/Coordination placement.
11. [[rawr-deployment-subsystem-spec-analysis]] — Deployment Subsystem spec analysis; Coordination/control-plane placement.
12. [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]] — OpenShell Agent Runtime spec analysis; Coordination signal-intake placement.
13. [[rawr-service-package-effect-vendor-integration-shape-reference]] — Service Package Effect vendor integration shape reference; Core Runtime pattern illustration.
