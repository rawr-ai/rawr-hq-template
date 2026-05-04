# RAWR Spec Landscape — A Four-Tier Map of a Platform That Refuses to Own What It Manages

Status: current research input / informative / not canonical specification authority.

This report is the broad corpus audit for the next spec-update phase. Use it as a map of cross-spec gaps and follow-up candidates; do not treat it as the active edit plan for any one canonical spec.

## Executive Summary and Landscape Map

RAWR's specification corpus reads, on careful inspection, as a constitution: thirteen documents in which exactly one — the Effect Runtime Realization System spec — claims runtime authority through a `runtime_authority: yes` declaration, and twelve subordinate themselves explicitly through `runtime_authority: no`, identical vocabulary, and disciplined deferrals [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] [[rawr-system-architecture-spec-analysis]]. The corpus decomposes into four engineering-coherent platform tiers — Core Runtime, Coordination, Semantic-Composition, and Governance — each anchored by specs whose membership reflects a distinct primary engineering concern rather than a generic architectural label. Per spec, the corpus grades close to A: twelve of the thirteen documents land at A or A−, the architectural separations are crisp, and the standing-on-shoulders-of-giants posture is articulated as a precise ten-rule descriptor-first checklist that every per-vendor integration satisfies in principle [[rawr-service-package-effect-vendor-integration-shape-reference]]. Per system, the corpus grades B+ — held back from a clean A by exactly three integration-law seams that cross spec boundaries unrealized, plus a small cluster of operational-substrate gaps that any production deployment will surface.

The three integration-law seams the system-level grade docks for in the runtime spec proper are precise and confined to its reserved-boundaries section; a parallel set of operational-substrate gaps (registry/signing, MFA/step-up, OTel propagation, idempotency conventions, MAWE profile-manifest tabulation) lives outside the runtime spec entirely and is enumerated in §10. The three runtime seams are:

1. **Inngest connect worker as bootgraph-integrated Effect Layer** — asserted by the Async Runtime spec but not yet absorbed as a typed `BootResourceModule` [[rawr-async-runtime-spec-analysis]].
2. **Per-role direct `WorkflowDispatcher` emission rights for the `agent` role** — authorized in OpenShell §8.3 and §14.4 but not yet enumerated per role in the runtime spec's §19 [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]].
3. **Auth-specific compiler-gate closure** — the Authentication subsystem contributes a mandatory checklist that the runtime compiler section does not yet absorb or delegate [[rawr-authentication-subsystem-spec-analysis]].

None of these are revisions to subordinate specs; all three are next-section additions to the authoritative runtime spec.

Beyond the three integration-law seams, the corpus carries roughly fourteen real coverage gaps and eight bookmarked deferrals. A bookmarked deferral has a named seam, named owner, and named trigger condition; a real gap is missing one or more. The 8:14 ratio reads as roadmap rather than drift, but weighted enough toward gaps that the next two operational slices need specific spec deltas. Top-priority next specifications: bundle signing and registry; an Inngest event-interface companion; OTel/HyperDX cross-process propagation; MFA / step-up / refresh / JIT auth flows; MAWE profile-to-manifest normative mapping; plus the three runtime-spec additions closing the integration-law seams.

The vendor-integration story is the clearest place RAWR's posture pays off. The standing-on-shoulders principle is universal across the corpus: every named vendor is bound to its zone of strength, every seam is descriptor-first, every vendor's lifecycle authority is forbidden in authoring, every vendor's import surface is wrapped, every vendor's error contract is mapped at the boundary, and every vendor's telemetry is split into runtime, semantic, and product-analytics layers.

But the seam topologies are irreducibly bespoke per vendor, because each vendor's zone of strength is structurally different. There is no `defineVendorIntegration` macro in the corpus. The Inngest case is the diagnostic worked example proving the two axes' independence — Grade A on used-at-strength because durability, retry, replay, history, schedules, and durable queues are entirely Inngest-owned; Grade B on integration-cashed because the event-interface boundary disciplines (auth-on-emit, signing rotation, idempotency conventions, dead-letter, schema evolution, OTel propagation across emit) are unspecified.

The high-level shape, as a tier × anchor-spec map:

| Tier | Anchor specs | Per-tier grade |
|---|---|---|
| **Core Runtime / Mechanical Substrate** | Effect Runtime Realization (gospel); Service Package Effect (shape reference); Habitat SDK Layers (META, draft); System Architecture (META) | **A** per-spec, **A−** system |
| **Coordination** | Authentication, Deployment, Async Runtime, OpenShell, Managed Agent Workspace Execution, Workstream System | **A−/B+** per-spec, **B+** system |
| **Semantic-Composition** | Authoring Classifier, Factory Bundle Export, Habitat SDK Layers L2 + L9 | **A−/B+** per-spec, **B+** system |
| **Governance** | Workstream Review, Workstream System (governance posture), future Tensions/RFDs/Decisions canon | **A−** per-spec, **B** system |

The remainder of this report walks each tier at depth, grades vendor integration on two axes, separates bookmarked deferrals from real gaps using the three-part rubric, renders two heatmaps that make the per-spec / per-seam asymmetry visible, and ranks open gaps as P0/P1/P2 with named owners, trigger conditions, and acceptance criteria.

## Methodology — Authoritative vs. Shape-Correct Specs and Grading Rubric

The thirteen specs split cleanly into three rigorous classes:

- **Authoritative-on-runtime** (a class of one): the Effect Runtime Realization System spec, which self-marks `runtime_authority: yes`, locks the seven-phase realization lifecycle (`definition → selection → derivation → compilation → provisioning → mounting → observation`), and supersedes all older runtime/effect documents through its §29 lock-authority coda [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]].
- **Shape-correct** (a class of eleven): specs that carry `runtime_authority: no`, restate runtime law without redefining it, and use authoritative-spec vocabulary — `RuntimeResource`, `ProviderSelection`, `ProcessRuntimeAccess`, `ServiceBindingCacheKey`, `Bootgraph`, `RawrEffect` — verbatim: System Architecture, Habitat SDK Layers, Async Runtime, Authentication, Deployment, Workstream, Workstream Review, MAWE, Authoring Classifier, Factory Bundle Export, and OpenShell [[rawr-system-architecture-spec-analysis]] [[habitat-sdk-layers-spec-analysis-draft]] [[rawr-async-runtime-spec-analysis]] [[rawr-authentication-subsystem-spec-analysis]] [[rawr-deployment-subsystem-spec-analysis]] [[rawr-workstream-system-spec-analysis]] [[rawr-workstream-review-subsystem-spec-analysis]] [[rawr-managed-agent-workspace-execution-spec-analysis]] [[rawr-authoring-classifier-system-spec-analysis]] [[rawr-factory-bundle-export-spec-analysis]] [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]].
- **Vendor-integration shape reference** (a class of one): the Service Package Effect spec, which self-marks as a snapshot proposal — not authoritative over runtime boundaries, not the final canonical specification — and serves as the worked example of how the descriptor-first pattern reifies for the oRPC × Effect pair [[rawr-service-package-effect-vendor-integration-shape-reference]].

The methodological consequence is sharp. A shape-correct spec can make a runtime-shaped claim that the authoritative spec has not yet absorbed, and the asymmetry counts as an integration-law residual rather than a contradiction or bug. Each shape-correct claim falls into one of four states:

- **(a)** already realized in the authoritative spec
- **(b)** implied but not realized
- **(c)** outside scope by construction
- **(d)** deferred work with named owner

The three integration-law seams below are all state (b): the Async Runtime spec's Inngest connect-worker placement is un-cashed until a `BootResourceModule` shape blesses it; OpenShell's agent-role direct durable emission is un-cashed until §19's `WorkflowDispatcher` enumerates per-role emission rights; the auth subsystem's compiler-gate checklist is un-cashed until the runtime compiler section absorbs or delegates the gates. A fourth (b)-state residual folds into Seam 1: the Workstream Review spec's `EvaluatorSpec.kind = "system-command"` gate runner and 16-event durable event model both need runtime realization (gate-runner as a bootgraph module, event outbox as a first-class primitive) — concerns that overlap structurally with the connect-worker bootgraph question and the durable-event-bus question P0.1 closes [[rawr-workstream-review-subsystem-spec-analysis]]. None of these are revisions to subordinate specs; all are next-section additions to the authoritative spec.

The grading rubric the rest of this report uses operates on **two scopes**, because per-spec coverage and cross-spec seam closure are different things and a corpus can be A on the first while sitting at B+ on the second without contradiction:

- **Per-spec coverage** asks whether a spec exhaustively addresses its declared scope, names reserved seams with locked owners and trigger conditions, and contains no exploratory residue.
  - **A** — complete.
  - **A−** — substantively complete with one or two minor named gaps the spec or sibling already flags.
  - **B+** — structurally complete with one or two integration-point silences that would surface as a runtime concern under stress.
  - **B** — complete in shape but thin enough on integration-point disciplines that an implementer would have to invent.
- **Per-seam closure** asks whether a cross-spec seam has a named owner, a named trigger, and a specified protocol on both sides.
  - **A** — the seam is named with owner, trigger, and protocol on both sides.
  - **B+** — the seam is named with owner and trigger but the receiving-side protocol (typically the authoritative runtime spec's compiler or bootgraph section) has not yet absorbed or delegated the contribution.
  - **B** — the seam is implied through shared vocabulary but neither protocol is specified.

The deferral-versus-gap test the rubric needs is a three-part audit applied to every silence: a **named seam** (the silence has a typed handle — a resource shape, a contract slot, a reserved-detail entry), a **named owner** (a specific spec or future spec is the locked owner of closing the silence), and a **named trigger condition** (an operational condition that fixes "no later than" — the first slice that needs it, the first product surface that requires it, the first dedicated spec that lands). All three present means the silence is a bookmarked deferral and is legal; any one missing means the silence is a real coverage gap and must be flagged on the heatmap. The deferral-to-gap ratio is itself a quality signal — a corpus where every silence is bookmarked grades A− on system-level discipline, and a corpus where most silences are unowned grades C.

The strict per-seam test is a deliberate methodological choice. A defensible counter-position grades the corpus A on a "no contradictions" test: across the eleven shape-correct specs the runtime vocabulary is used verbatim, `runtime_authority: no` is honored uniformly, and no two specs make incompatible claims about the same seam. This report adopts the stricter per-seam closure test instead, because integration-law residuals — claims asserted on one side but not absorbed on the other — predict production friction the no-contradictions test does not catch. The system-level B+ verdict should be read as docking grade against a stricter rubric, not as identifying defects in the shape-correct discipline.

A worked example illustrates the two scopes operating independently on the same spec. The Authentication subsystem's `AuthVerifierResource` cell scores A on per-spec coverage — provider families enumerated, surface-admission versus domain-authorization split clean, error model exhaustive, conformance gates listed, redaction discipline specified — and A on per-seam closure, because the seam to the runtime is named (`RuntimeResource` shape), the owner is named (verifier provider chosen via runtime profile), and the protocol is specified end-to-end as `RuntimeResource → provider implementation → VerifiedPrincipal → service middleware via provided.authz` [[rawr-authentication-subsystem-spec-analysis]].

The same spec's MFA / step-up cell scores A− on per-spec coverage (the assurance field is declared and hooked correctly) but B on per-seam closure (no step-up flow, no re-authentication trigger, no consent-flow pattern, no short-lived capability-token issuance protocol). One spec, two cells, two different grades on two different axes — and the methodology accepts both as correct.

The vendor-integration assessment in §7 uses a parallel two-axis grading: **used-at-strength** (does the integration honor the vendor's zone of strength?) by **integration-cashed** (is the RAWR-side ownership at the seam fully specified — facade, forbidden set, lifecycle owner, compiler gate, error bridge, telemetry split, authoring law?). The two axes are independent, which is precisely why they need to be drawn separately, and the Inngest case is the diagnostic worked example.

## Committed Platform-Level Decomposition

The user's framing offered three tiers (mechanical, coordination, governance) tentatively and invited adjustment. This report commits **four tiers** — Core Runtime / Mechanical Substrate, Coordination, Semantic-Composition, and Governance — and defends the commitment against the three-tier reading on team-topology grounds, on forbidden-pattern grounds, and on what the corpus's nine-layer Habitat SDK model actually says.

The three-tier reading deserves a fair statement before being defeated. Both META specs offer three-tier summaries that, read selectively, support the user's original proposal. Habitat SDK Layers §1 collapses its nine-layer model into three lines: "Habitat SDK owns the nervous system. Coordination owns the ongoing work. Governance owns authority and adaptation" [[habitat-sdk-layers-spec-analysis-draft]]. System Architecture §4.11 uses a three-line authority law: "the shell drives what / the stewards drive how / governance decides whether" [[rawr-system-architecture-spec-analysis]]. A defensible collapse folds Semantic-Composition into either an SDK-adjacent build-time sub-region of Core Runtime or into pre-runtime governance inside Governance. Either collapse matches the META specs' visible summaries and keeps the tier count rememberable.

The four-tier commitment carries roughly 70% confidence; a skilled engineer could reasonably collapse Semantic-Composition into Core Runtime by reading the classifier and Factory Bundle Export as SDK-adjacent build-time tooling. That collapse would be defensible but imprecise on three grounds.

First, the team-topology test breaks under the three-tier collapse. The Authoring Classifier is structurally not a runtime mechanic — its job is to turn a human intent into a typed, narrowed, generator-ready realization plan via static rule packs. Its primary engineering concern is encoding canonical RAWR ontology law as enforceable rule packs, with the locked law that "rule packs must have enforcement consequences" [[rawr-authoring-classifier-system-spec-analysis]]. This is not runtime mechanics, not signal routing, and not governance authority — it is authoring narrowing, a third thing. Forcing the classifier into Core Runtime makes the runtime spec's body cohabit with rule-pack DSL design, classifier metric tuning, and Nx generator catalog evolution; that is not one engineering concern.

The Factory Bundle Export is similarly distinct: its job is to package verified capabilities into transferable `CapabilityBundle`s with proof packs, then drive a retargeting workstream that lands them in foreign destinations — "RAWR is not only a runtime architecture. It is also a manufacturing environment for canonical capability bundles" [[rawr-factory-bundle-export-spec-analysis]]. Classifier engineers tune ontology rules and confidence-scoring; bundle-export engineers tune verifier harnesses, semver compatibility, and signing/attestation; RFD authors and steward-authority designers tune autonomy thresholds and escalation policy. Three different teams, three different cadences, three different metrics. Two of those teams cohabit naturally as Semantic-Composition. The third is unambiguously Governance. They do not collapse.

Second, the forbidden-pattern test fails the three-tier reading. The Habitat SDK Layers spec's §8 forbidden-pattern catalog is built around preventing layer collapse: "installing @habitat/sdk creates tension ledgers, steward identities, RFDs, and workstream DBs" is forbidden, because that would be the SDK reaching upward into governance [[habitat-sdk-layers-spec-analysis-draft]]. If Semantic-Composition were collapsed into Core Runtime, the classifier — which encodes ontology law that downstream tiers must respect — would be claiming authority that the runtime spec's forbidden-pattern catalog does not grant the SDK. The clean way to honor both the SDK's forbidden patterns and the classifier's enforcement law is to give Semantic-Composition its own tier, where it can hold authority over canonical ontology without claiming runtime authority and without absorbing governance.

Third, the Habitat SDK Layers nine-layer model itself draws the boundary. The four-tier reading reconciles cleanly with L0–L9:

- **Core Runtime** maps to L0 (runtime realization) plus L1 (geometry SDK) plus L2's runtime-spec-facing portion.
- **Semantic-Composition** maps to L2's classifier-facing portion (topology classification, rule engine, query engine, gates) plus L9 (Foundry export — capability bundles, target profiles, retargeting workstreams).
- **Coordination** maps to L3 (signals) plus L4 (interaction shell) plus L5 (context substrate) plus L6 (workstreams as durable coordination object).
- **Governance** maps to L7 (review) plus L8 (governance authority).

The Habitat SDK spec deliberately distinguishes L2 from L0–L1 and from L6–L8 — that is L2's point of existence, and a reading that ignores its own source's nine-layer technical decomposition in favor of its source's three-line summary misreads granularity.

The boundary condition is honest: if the Authoring Classifier were scoped only as a CLI tool, or Factory Bundle Export a deployment-time artifact, three tiers would suffice. The four-tier commitment is conditional on the canonical-subsystem-with-enforcement-authority status both currently hold — enforceable rule packs, manufactured proof packs, signed capability bundles, retargeting workstreams — and is required by the team-topology and forbidden-pattern tests so long as that authority stands. The verdict's half-life is bounded by Habitat SDK Layers landing at A; the four-tier commitment will then be re-validated as a downstream consequence rather than re-argued from scratch. An open question: a fifth tier separating operational placement (the Deployment Subsystem's control plane) from signal routing inside Coordination is plausible enough that a future report may need to draw it.

Per-spec self-location under the four-tier commitment is unambiguous:

| Spec | Tier | Justification |
|---|---|---|
| Effect Runtime Realization (gospel) | Core Runtime | The seven-phase realization engine [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] |
| System Architecture (META) | Cross-cutting | Defines all tiers via authority law [[rawr-system-architecture-spec-analysis]] |
| Habitat SDK Layers (META, draft) | Cross-cutting | Defines all tiers via nine-layer model [[habitat-sdk-layers-spec-analysis-draft]] |
| Service Package Effect | Core Runtime | Vendor-integration shape reference for service authoring [[rawr-service-package-effect-vendor-integration-shape-reference]] |
| Authoring Classifier System | Semantic-Composition | Authoring narrowing engine [[rawr-authoring-classifier-system-spec-analysis]] |
| Factory Bundle Export | Semantic-Composition | Manufacturing of transferable capability bundles [[rawr-factory-bundle-export-spec-analysis]] |
| Authentication Subsystem | Coordination | Surface admission, signal-from-outside-world identity [[rawr-authentication-subsystem-spec-analysis]] |
| Deployment Subsystem | Coordination | Control plane between runtime and platform [[rawr-deployment-subsystem-spec-analysis]] |
| Async Runtime | Coordination | Durable signal ingress and steward activation [[rawr-async-runtime-spec-analysis]] |
| OpenShell Agent Runtime | Coordination | Trusted-operator signal intake [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]] |
| Managed Agent Workspace Execution | Coordination | Provider-backed agent execution under workstream governance [[rawr-managed-agent-workspace-execution-spec-analysis]] |
| Workstream System | Coordination (with Governance overlap) | Durable coordination object owning long-running work [[rawr-workstream-system-spec-analysis]] |
| Workstream Review Subsystem | Governance | Acceptance metabolism — review owns whether the work may advance [[rawr-workstream-review-subsystem-spec-analysis]] |

The Workstream System sits at the seam between Coordination and Governance. Its runtime touches — plugin layout, async stewards executing runs, durable event emission — bind it more tightly to Coordination than to authority adjudication, but its review subsystem is a governance component embedded inside the coordination object. The right answer is to treat it as Coordination-primary while explicitly visible in both tiers.

## Level I — Core Runtime / Mechanical Substrate: Concerns and Coverage

The Core Runtime tier is the most complete part of the corpus and the only tier with a single canonical authoritative source. The Effect Runtime Realization spec is exhaustive within its declared scope, every silence inside it is a §23.5 reserved boundary with locked owner and trigger ("Reserved does not mean unknown. It means the seam is named and the owner is fixed"), and all eleven shape-correct specs subordinate themselves correctly using its vocabulary without redefining it. The tier scores per-spec A and system A−; the half-grade deduction reflects three runtime-shaped claims asserted by shape-correct specs not yet realized in the gospel spec (see §8).

| Concern | Anchor | Per-spec | Per-seam | Notes |
|---|---|---|---|---|
| Lifecycle phases (7) | Runtime Realization §1 | A | A | `definition → selection → derivation → compilation → provisioning → mounting → observation`; deterministic finalization not an 8th phase; locked law |
| Bootgraph | Runtime Realization §17 | A | A | `BootResourceKey`/`Module`, deterministic ordering, dedupe, rollback, reverse finalization |
| ManagedRuntime ownership | Runtime Realization §9.5, §10.3 | A | A | One `ManagedRuntime` per process; raw construction forbidden in authoring |
| Resource / Provider / Profile | Runtime Realization §7 | A | A | `defineRuntimeResource`, `defineRuntimeProvider`, `ProviderSelection`, `providerFx` |
| RawrEffect / curated facade | Runtime Realization §5; Service Package §6 | A | A | `TaggedError`, generator-native `.effect(function*)`, `EffectExecutionDescriptor` |
| Process-local coordination | Runtime Realization §8 | A | A | `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource` — explicitly process/role-local, not durable |
| Compiler / `CompiledProcessPlan` | Runtime Realization §15 | A | B+ | Validators (provider coverage/closure/cycle, topology/builder, execution policy, import law) complete; **does not yet absorb auth-specific compiler gates** [[rawr-authentication-subsystem-spec-analysis]] |
| Service binding cache | Runtime Realization §13 | A | A | `ServiceBindingCacheKey` explicitly excludes invocation; lifetime correct |
| WorkflowDispatcher | Runtime Realization §19 | A | B+ | Materialization clean; **per-role emission rights not enumerated** — OpenShell §8.3/§14.4 authorizes agent-role direct emission without runtime-spec blessing [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]] |
| Diagnostics / telemetry / catalog | Runtime Realization §22 | A | A | `RuntimeDiagnostic` phase + boundary + severity, `RuntimeTelemetry` spans/events/annotations, `RuntimeCatalog` read model, ~50 diagnostic codes |
| Reserved boundaries | Runtime Realization §23.5 | A | A | ~14 reserved-detail boundaries with locked owners and integration hooks |
| Forbidden patterns | Runtime Realization §5, §10.3, §25 | A | A | Raw Effect imports, `ManagedRuntime` in authoring, detached fibers, Promise terminals — enumerated and CI-gated |
| Inngest connect worker as bootgraph Effect Layer | Async claims, runtime silent | — | B+ | **Integration-law debt #1** — async spec asserts placement; runtime spec defines harness but not which `BootResourceModule` realizes the connect worker |
| Habitat SDK public DX surface | Habitat SDK Layers (draft) | A− | A− | Authoritative on layer boundaries; exploratory on package paths and vendor adapters; "Draft" tag is calibration, not damning [[habitat-sdk-layers-spec-analysis-draft]] |

The verdict for Core Runtime: gospel-grade per-spec (A across nine concerns), near-gospel per-seam (B+ on three integration-point completions, no contradictions). The only completeness debts are next-section additions absorbing or delegating shape-correct contributions from sibling specs. None reopens the ontology.

## Level II — Coordination: Concerns and Coverage

The Coordination tier is the broadest and most uneven in the corpus. It contains six specs that mediate signals between the platform and the world: Authentication, Deployment, Async Runtime, OpenShell, MAWE, and the Workstream System (in its coordination-object posture). Five of six are A or A−; Async Runtime is B+ because of integration-point silences at the Inngest event interface. The system-axis grade is B+, dragged down primarily by the Inngest event interface gap and secondarily by the un-cashed agent-role direct-emission seam.

| Concern | Anchor spec | Per-spec | Per-seam | Notes |
|---|---|---|---|---|
| Identity / actor model (anonymous/user/service/steward/operator/system) | Authentication | A | A | [[rawr-authentication-subsystem-spec-analysis]] |
| Authentication (verifier resource + 8 provider families) | Authentication | A | A | jwt-jwks, opaque-token, session-cookie, api-key, github-app, gateway, dev-user, test-principal |
| Surface admission vs. domain authorization | Authentication §4.4 | A | A | Plugin admits caller class; service authorizes domain |
| Sessions + token issuance | Authentication | A | A | Provider implementations: redis/postgres/memory/noop |
| Async authority propagation | Authentication §4.8 | A | A | `ActorSnapshot`, `AuthorityBasis`, fresh-authorization rechecks |
| MFA / step-up / refresh / JIT | Authentication | A− | B | Assurance field declared; **step-up flow, refresh-token rotation, JIT provisioning all unspecified** |
| Multi-tenant DB-level enforcement | Authentication declares tenantId; no spec | C | C | Real gap — auth declares the field; no spec specifies row-level enforcement |
| Auth-specific compiler gates | Authentication §22 | A | B+ | **Integration-law debt #3** — auth contributes mandatory compiler checklist; runtime compiler does not commit it |
| Deployment lifecycle (8 phases) | Deployment | A | A | "Deployment may compile and inspect process plans / deployment may not provision, bind, lower, mount, or execute runtime plans" [[rawr-deployment-subsystem-spec-analysis]] |
| Build chain (Railpack default, Dockerfile, prebuilt, platform-native, scripted) | Deployment §15 | A | A | "Railpack does not make Railway the platform target" |
| Deployment targets (Railway default + 7 alternates) | Deployment §18 | A | A | "Railway does not decide app membership, role composition, process-shape identity, or provider selection" |
| Healthchecks / ingress / source-change / network / scale | Deployment §10 | A | A | `DeploymentHealthcheckPolicy` + `IngressPolicy` with explicit trust-boundary integration |
| Cutover / rollback / blue-green-canary | Deployment §30 | A | A★ | Bookmarked deferral with named owner ("platform adapter"); trigger condition explicit |
| Registry auth / secret-manager binding / managed DB provisioning | Deployment §30 | A | A★ | Bookmarked deferrals with named owners |
| Durable async substrate (Inngest hard-pin) | Async Runtime | A | A | "HQ's durable async runtime is always Inngest-backed, and HQ's async worker is always `connect`-based" [[rawr-async-runtime-spec-analysis]] |
| `connect` worker transport, mode parity | Async Runtime | A | A | Dev / Cloud / Self-hosted invariant locked |
| Steward activation as a workflow class | Async Runtime | A | A | Local-first authority vs. deployable projection |
| Inngest event interface (auth-on-emit, signing rotation, idempotency, dead-letter, schema evolution, OTel propagation, multi-tenant app IDs) | Async Runtime (silence) | B+ | B | **Real gap cluster** — six integration-point silences |
| OpenShell conversational ingress (gateway + session continuity) | OpenShell | A− | A− | Gateway, session continuity, read-side inspection, governance frontier all named [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]] |
| OpenShell channel-vendor adapter plane (WhatsApp / Telegram / Discord / local control UI) | OpenShell silence | B | B+ | Per-channel transport, webhook plumbing, and auth tokens pushed entirely into per-channel adapter plugins; no canonical adapter contract — distinct gap class from the shell-brain LLM silence above |
| OpenShell session continuity, read-side inspection, special-action tools, governance frontier | OpenShell | A | A | "Broad read / narrow write / no direct governed repo mutation" |
| OpenShell shell brain (LLM / agent-SDK binding) | OpenShell silence | C | D | **Graded as gap, classified by source as posture.** [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]] frames this as the spec's "strongest don't-own implicit silence" — model providers, prompts, and tool-calling protocol left unspecified by design, parallel to Auth's IdP silence and MAWE's sandbox-vendor silence (both graded kindly). This row applies the stricter rubric: posture-only silences without a typed seam, named owner, and named trigger fail the three-part deferral test even when the silence is intentional. Re-reading it as an A★ deferral becomes legal once a `ShellBrainResource` (or equivalent) and an owning sibling spec are named. |
| OpenShell sandbox / isolation posture | OpenShell §16.5, §17.4 | B+ | B+★ | Posture-only — bound to no specific isolation tool |
| Agent-role direct durable-event emission | OpenShell asserts; runtime silent | A | B+ | **Integration-law debt #2** — claimed but not blessed by runtime spec |
| MAWE workspace lifecycle (ensure-agent → prepare → start/attach → stream → drain → snapshot → close) | MAWE | A | A | [[rawr-managed-agent-workspace-execution-spec-analysis]] |
| MAWE provider abstraction (10 named providers: openai-agents-sdk, claude-managed-agents, cloud-sandbox-agent, runloop, e2b, daytona, modal, vercel, local-noop, custom) | MAWE | A | A | `ProviderCapabilitySet` validation + preflight rejection |
| MAWE policy + snapshot recovery + outcome envelope | MAWE | A | A | Five-step recovery order; act/propose/escalate steward decision |
| MAWE cost / budget enforcement | MAWE silence | C | C | Real gap — declared as policy field; no integration with billing |
| MAWE multi-agent handoff semantics | MAWE silence | C | C | Real gap — capability flag without elaboration |
| MAWE provider observability / OTel propagation | MAWE silence | C | C | Real gap — `traceId` in event base but exact propagation contract unspecified |
| MAWE profile→manifest mapping (8 canonical profiles) | MAWE (sketchy) | B+ | B | Real gap — illustrative not normative; a provider implementer cannot produce a conformant adapter from the spec, so each new adapter is independent invention and conformance cannot be audited |
| Signal envelope / sources / sinks / correlation / authority metadata (Habitat L3) | Habitat SDK Layers (DRAFT) | B+ | B | "Signal = something happened. Coordination event = this signal changes durable work state. Governance event = this signal changes authority, escalation, or policy." L-named without anchor spec; no descriptor-first compiler analog and no concrete vendor binding [[habitat-sdk-layers-spec-analysis-draft]] |
| Context substrate / packs / redaction / freshness (Habitat L5) | Habitat SDK Layers (DRAFT) | B+ | B | "Context compiler = assembler. Truth remains in truth-owning services and artifacts." Layer named and a compiler shape sketched; no canonical Context Substrate spec authored |
| Workstream ontology + lifecycle | Workstream System | A | A | session ≠ thread ≠ workstream ≠ run ≠ workflow ≠ worktree [[rawr-workstream-system-spec-analysis]] |
| Plan-revision-and-run + typed input/evidence/control split | Workstream System | A | A | The corpus's signature governance discipline — "most interaction is evidence; only typed control changes governance or progression"; replanning produces a new revision rather than mutating execution history |
| Charter / scope / `GovernanceProfile` / context engine | Workstream System | A− | A− | Context engine is named but its compilation contract is shape-only |
| Reactive opening + `WorkstreamEvent` union + thread projection | Workstream System | A | A | Tensions, observations, decisions, follow-on workstreams, human requests, shell delegations |
| Workstream storage backend / notebook syntax / Linear-Jira-Slack mapping | Workstream §1 | A | A | Honest non-goals (out-of-scope by §1) |

The Coordination tier shows the corpus's most visible per-seam debt. Authentication is its strongest citizen — every cell A or A−, every seam closed with named owner and protocol — and its own analysis identifies it as "the strongest example of don't-own-still-manage discipline in the corpus" [[rawr-authentication-subsystem-spec-analysis]]. The structural reason is the §26 nine-verb integration law (`verify` / `project` / `carry` / `decide` / `provision` / `select` / `mount` / `normalize` / `observe`): each verb names seam ownership exactly, closing the boundary nine ways rather than one. The async authority propagation contract (`ActorSnapshot`, `AuthorityBasis`, fresh-authorization rechecks) is the cleanest don't-own-still-manage worked example: the IdP owns verification crypto, RAWR owns the propagation contract.

Async Runtime is the clearest per-spec-strength-meeting-per-seam-debt case — internally complete, six integration-point silences unprotocoled at the Inngest event interface. OpenShell carries the same pattern at the shell-substrate boundary: constitution written, LLM/agent-SDK binding a structural TODO, channel adapters essentially unwritten. Deployment is internally exhaustive and discharges most silences as bookmarked deferrals with named owners. MAWE is internally exhaustive on lifecycle and provider abstraction but carries four operational-substrate gaps blocking production multi-tenant deployment. None of these per-seam debts are contradictions; all are next-section completions in either the authoritative runtime spec or a companion spec the corpus already names.

## Level IV — Semantic-Composition: Concerns and Coverage

The Semantic-Composition tier is the inserted tier the four-tier reading commits. It owns intent classification, capability decomposition, ontology rule packs, and the manufacturing of transferable capability bundles. It is anchored by the Authoring Classifier (intent → typed plans via static rule packs) and the Factory Bundle Export spec (verified capabilities as transferable `CapabilityBundle`s with proof packs and retargeting workstreams). Habitat SDK Layers' L2 and L9 map here, with L9 marked Optional. The tier scores B+ per-spec and B+ per-seam, held back by classifier-LLM call shape and bundle registry/signing absence.

| Concern | Anchor spec | Per-spec | Per-seam | Notes |
|---|---|---|---|---|
| Intent classification + capability decomposition | Authoring Classifier | A− | A− | "intent classification understands what is being asked / operational classification decides where it belongs / rule packs narrow the legal geometry / generators write the skeleton / services own the business truth" [[rawr-authoring-classifier-system-spec-analysis]] |
| Operational classification + ontology rule packs with enforcement | Authoring Classifier | A | A | "rule packs must have enforcement consequences" — locked law (not stylistic preference); the corpus's primary defense of a separate Semantic-Composition tier |
| Generator recipe emission + plan validation handoff to runtime compiler | Authoring Classifier | A | A | The seam between Semantic-Composition and Core Runtime: classifier emits typed plans; SDK derives; runtime compiler validates; generators write skeletons; services own the business truth |
| Implementation packet handoff + verification plan emission + classification-record durability | Authoring Classifier | A | A− | Five-stage chain locked; classification-record storage is workstream-artifact-today, service-when-earned (deferral) |
| Classifier LLM call (Resource+Provider+Profile abstraction) | Future `services/authoring-plans` | C | D | **Real gap** — black-box callable; no Resource+Provider abstraction; no descriptor-first terminal; no import gate |
| Classification-record storage durability | Future `services/authoring-plans` | C | C★ | Bookmarked deferral — "workstream artifact today, service when earned" |
| Rule expression language | Authoring Classifier §30 | B+ | B+★ | Refinement seam with named owner; rule expression syntax exploratory |
| Capability bundle model + proof pack | Factory Bundle Export | A | A | "The transferable unit is not just source files. It is a structured capability bundle." "A bundle is a capability plus its proof pack" [[rawr-factory-bundle-export-spec-analysis]] |
| Three-part verification (portable / mappable / destination-local) | Factory Bundle Export | A | A | Portable = source-side certainty; mappable = the bundle's typed surface re-types at the destination; destination-local = retargeting workstream burns destination uncertainty down |
| Retargeting workstream lifecycle | Factory Bundle Export | A | A | Dedicated workstream class for cross-environment landing |
| Benchmark epoch (frozen frame) | Factory Bundle Export | A | A | Benchmark-frozen acceptance criteria |
| Bundle signing / attestation | (None) | D | D | **P0 real gap** — `ArtifactRef` is a bare string with no resolution protocol or signing model |
| Bundle registry hosting | (None) | D | D | **P0 real gap** |
| Bundle transport / fetch semantics | (None) | D | D | **P0 real gap** |
| Bundle-version compatibility / semver negotiation | (None) | C | C | Real gap — `version` field exists; compatibility matrix absent |

The verdict for Semantic-Composition: structurally complete on the law side, thin on the operational substrate. The Authoring Classifier grades A− because the LLM-as-classifier shape has no Resource+Provider abstraction and classification-record storage is a "workstream artifact today, service when earned" deferral. The Factory Bundle Export grades B+ on shape and laws but thin on operational substrate by design — registry hosting, signing/attestation, transport/fetch, bundle-version compatibility, and immutability enforcement are silent. This is the corpus's most pressing real gap cluster.

## Level III — Governance: Concerns and Coverage

The Governance tier owns durable acceptance ("is this work allowed to advance?"), durable authority ("who is allowed to decide?"), durable adaptation ("what changes the policies and thresholds over time?"), and the durable record of decisions, escalations, waivers, and revisions. It is currently small — one canonical spec (Workstream Review) plus a future-spec footprint (Tensions / RFDs / Decisions / Steward Authority canon). The system-axis weakness is that the review machinery leans heavily on a future governance umbrella not yet authored. The tier scores A− per-spec on Workstream Review and B per-seam overall [[rawr-workstream-review-subsystem-spec-analysis]].

| Concern | Anchor spec | Per-spec | Per-seam | Notes |
|---|---|---|---|---|
| Acceptance / "done" semantics — "review graph is the active form of a workstream output contract" | Workstream Review | A | A | Multi-altitude verification (low/middle/high) [[rawr-workstream-review-subsystem-spec-analysis]] |
| Review lifecycle (pending/eligible/active/satisfied/failed/blocked/invalidated/escalated/waived) | Workstream Review | A | A | First-class typed records and events for every state transition |
| Decision capture (`ReviewVerdict`, `ReviewRepairDemand`, `ReviewWaiver`, `ReviewInvalidation`) | Workstream Review | A | A | Fix-review loop: typed demand narrows next attempt |
| Evidence harness ownership | Workstream Review §53.11 | A | A | "Vendors remain evidence harnesses behind adapters; RAWR owns the evidence interface" — Serenity/JS, Playwright, Stagehand, GitHub Actions never become RAWR review primitives |
| Multi-agent coordination / judge-vs-builder separation | Workstream Review | A | A | Trust hints: `low / medium / high` + `requiresHumanConfirmation` + `allowedLoopKinds` |
| Governance gates (human approval, waiver authority, score-vs-verdict separation, escalation policy) | Workstream Review | A | A | Score-vs-verdict separation with `scorePolicy?` and `scoreIsVerdict: false` |
| Tension / structural-failure feedback | Workstream Review | A | A | Review feeds tensions; does not replace them |
| Closure semantics + customer feedback / post-launch reopening | Workstream Review | A | A | |
| Scoring algorithms / rubric DSL | Workstream Review | B+ | B+★ | Bookmarked — gestural rather than canonical |
| Human approval product surface | (None) | C | D | Real gap — explicitly deferred without named owner |
| Comment-thread → review-event projector | (None) | C | D | Real gap — silent on who owns the projector |
| Steward-authority law | System Architecture §4.11 | A | A | "the shell drives what / the stewards drive how / governance decides whether" [[rawr-system-architecture-spec-analysis]] |
| Tensions / RFDs / Decisions canon | Future spec | D | D★ | Bookmarked deferral — heavily referenced but not authored; passes the three-part test (named seam in Workstream Review §53; named owner — a future Governance / RFDs / Tensions canonical spec, peer to Workstream and Workstream Review; named trigger — when steward autonomy thresholds, RFD state machines, or waiver-authority policy become product-visible) |
| Steward authority / autonomy thresholds | Future spec (L8) | D | D | Real gap — referenced as L8 in Habitat SDK Layers but no spec exists |
| Governance profile / RFD state machine / waiver-policy authority | Future spec | D | D | Real gap |

The verdict for Governance: strong per-spec on the work-coordination side (Workstream A; Review A−) and thin per-spec on the authority-adaptation side. Workstream Review is structured to accept the future governance layer cleanly — it distinguishes "review answers: is this work acceptable enough to advance? / governance answers: what authority is allowed to decide that?" The seam to the future governance spec is named, the owner is named (a future Governance / RFDs / Tensions canonical spec, peer to Workstream and Workstream Review), and the trigger is named (when steward autonomy thresholds, RFD state machines, or waiver-authority policy become product-visible). The deferral is bookmarked at the seam level even though the future spec body is missing; the Tensions/RFDs/autonomy cell is the highest-priority new spec after the bundle-signing/event-interface pair.

## Vendor Integration Assessment — Standing on the Shoulders of Giants

The standing-on-shoulders pattern is the single most load-bearing architectural principle in the corpus. The runtime spec's §1 execution-ownership law states it normatively: "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering" [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]]. The System Architecture spec's §4.1 echoes it: "RAWR owns boundaries and runtime handoffs. Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads" [[rawr-system-architecture-spec-analysis]]. The Service Package Effect shape reference §3 phrases it as the meta-rule: "Use native idioms inside each boundary. Use RAWR constraints only at ownership/lifecycle seams" [[rawr-service-package-effect-vendor-integration-shape-reference]].

Every named vendor satisfies a precise ten-rule descriptor-first checklist:

1. Identify the vendor's zone of strength.
2. Let authors write the vendor the way its own docs teach inside that zone.
3. Wrap the import surface through a RAWR-owned facade.
4. Forbid lifecycle/runtime construction in authoring.
5. Compile authoring to descriptors rather than vendor calls.
6. Route invocation through one canonical terminal per execution mode.
7. Map vendor failure channels into the boundary error type while keeping internal errors as diagnostics.
8. Split telemetry into runtime, semantic, and product-analytics layers.
9. Route cross-service collaboration through bound clients rather than vendor primitives.
10. Enforce the rules in CI through type/import/runtime gates.

Native idioms inside the boundary; RAWR constraints only at ownership and lifecycle seams.

The shapes, however, are bespoke because each vendor's zone of strength is structurally different. Walking the seams concretely shows why:

- **Authentication's seam** is `AuthVerifierResource` (process or role lifetime) plus eight provider families plus `VerifiedPrincipal` as the per-invocation result plus the surface-admission-vs-domain-authorization split — there is no descriptor compilation here, there is a verifier resource and a profile selection.
- **Deployment's seam** is `DeploymentTargetProfile` plus build-strategy-vs-target separation plus `EnvBinding` / `SecretBinding` / `PlatformResourceBinding` plus a `CompiledProcessPlanSnapshot` consumed compile-only — there is no `WorkflowDispatcherDescriptor` or `EffectExecutionDescriptor`, there is a placement plan and a build strategy.
- **Inngest's seam** is `WorkflowDispatcherDescriptor` plus async lowering into `FunctionBundle` plus `defineAsyncStepEffect` for step-local descriptors plus `stepEffect(ctx).run(descriptor)` for step execution; the native `run(ctx)` function is pure Inngest interop, and durable retries are forbidden as a local-Effect concern.
- **MAWE's seam** is `ManagedAgentWorkspaceManifest` plus `ProviderCapabilitySet` plus a 17-class error model plus the snapshot recovery order plus the artifact-drain protocol — there is no `WorkflowDispatcher` here, there is a managed workspace abstraction over ten provider families.
- **Effect's seam** is the curated facade at `@rawr/sdk/effect` plus the single `ManagedRuntime.make(layer)` per process plus the `RawrEffect<T,E>` opacity rule plus the forbidden-set; authors get generator-native `.effect(function*)` bodies, and the runtime owns the bridge to `EffectRuntimeAccess`.

Five distinct seam topologies across five vendor classes.

A counter-reading — that the descriptor-first pattern is a *universal template* rather than a *universal principle* — is rejected by the spec-only evidence at the seam-shape level. A universal-template reading would imply a `defineVendorIntegration({ resource, facade, forbiddenSet, descriptor, gate })` macro that all integrations use without per-vendor customization. No such macro exists. Two qualifications: this is a spec-only investigation, so the corpus is silent on whether a higher-order abstraction exists in the codebase; and the Service Package Effect spec is itself a partial template for the oRPC × Effect pair [[rawr-service-package-effect-vendor-integration-shape-reference]]. Forcing a single seam shape would violate the standing-on-shoulders principle by imposing a RAWR DSL where each vendor already has a native idiom. What is identical across integrations is the shape of the discipline — the ten rules — not the shape of the seam.

The two-axis grading the user's framing requires is **used-at-strength** by **integration-cashed**. Used-at-strength asks whether the vendor lives where its native power is, with its native idioms. Integration-cashed asks whether the boundary protocol on RAWR's side is fully specified — facade, forbidden set, lifecycle owner, compiler gate, error bridge, telemetry split, authoring law. The two axes are independent, and the Inngest case is the diagnostic worked example proving the independence:

| Vendor | Zone of strength | Used-at-strength | Integration-cashed | Composite |
|---|---|---|---|---|
| **Effect** | Typed effectful composition; structured concurrency; scoped acquire/release; typed failure channel | A | A | **A** |
| **oRPC** | Callable contracts; procedure mechanics; OpenAPI generation | A | A | **A** |
| **Auth providers** (jwt-jwks, opaque-token, session-cookie, api-key, github-app, gateway, dev-user, test-principal) | Identity verification per provider family | A | A | **A** |
| **Deployment targets** (Railway, Compose, OCI, local-process, desktop-bundle, Fly, K8s, custom) | Platform-native build, artifact production, workload placement | A | A | **A** |
| **Inngest** | Durable orchestration; retry / replay / history; schedules; durable queues | **A** | **B** | **B+** (the diagnostic case) |
| **Elysia** | HTTP host lifecycle and request routing | A | A | **A** |
| **OCLIF** | CLI command dispatch | A | A− | **A−** |
| **MAWE provider chain** (e2b, daytona, modal, runloop, openai-agents-sdk, etc.) | Provider-managed agent execution | A | B+ | **A−** (cost / observability / multi-agent gaps) |
| **Bun** | Fast JS host runtime | A | B | **B** (below-substrate implicit ownership — no explicit integration shape, no facade, no forbidden set; Elysia is well-specified as harness on top) |
| **Drizzle** | SQL DSL authoring; query composition | A (implicit) | C | **B** (referenced abstractly via `SqlPoolResource` only — no named facade, no forbidden set beyond "raw Drizzle never escapes," no compiler gate) |
| **HyperDX / OTel** | Telemetry export; observability product | A | B | **B** (HyperDX not named in runtime spec; integration shape is correct in principle but treated as an OTel provider detail, not a first-class integration; no propagation contract across server→async→MAWE) |
| **Tailscale** | Private-network operator reachability | A | B | **B+** (mode separation correct — Funnel explicitly disqualified; `RuntimeResource` shape unspecified, defensibly because [[rawr-async-runtime-spec-analysis]] classifies Tailscale as operator infrastructure rather than a runtime resource — the missing shape may be deliberate posture rather than gap) |
| **Factory Bundle TargetProfile** | Foreign-destination capability landing zones | A | B | **B+** (registry/signing/transport silent) |
| **Web hosts** (Next.js / React Router / chosen web host) | SSR/CSR/RSC rendering, bundling, routing, browser-native behavior | A | B | **B+** (System Architecture §13.4 carves out web hosts as harness-owned interiors; SSR-vs-CSR-vs-RSC contract not specified at the harness boundary) [[rawr-system-architecture-spec-analysis]] |
| **Desktop hosts** (Tauri / Electron / native shell) | Native desktop interiors — IPC, menubar, window, background workers | A | C | **B** (System Architecture §13.6 names the desktop role; IPC surface is "implementation detail" — no canonical adapter contract for menubar/window/background) [[rawr-system-architecture-spec-analysis]] |
| **Authoring Classifier LLM caller** | Intent extraction from natural language | C | D | **D** (within-pattern reading) / **outside scope** (structurally-different reading) — see §7 prose for the conditional commit |

The Inngest case earns diagnostic status because a single vendor scores A on used-at-strength and B on integration-cashed simultaneously. The vendor is used exactly where strongest — durability, retry, replay, history, schedules, durable queues — with zero second-queue ambiguity ("the architecture must not introduce a second queue in front of the workflow runtime") [[rawr-async-runtime-spec-analysis]]. RAWR contributes `WorkflowDispatcher` compilation and async lowering into `FunctionBundle` but never competes with Inngest's durability model.

The integration on RAWR's side is only partially cashed: the connect-worker as a bootgraph-integrated Effect Layer is named in the async spec but un-realized in the runtime spec; auth-on-emit is policy-only; signing-key rotation, idempotency conventions, dead-letter handling, schema evolution, and OTel propagation across the server→async boundary are unspecified.

The Drizzle-versus-Authentication contrast is the second diagnostic. Authentication is A on both axes because the integration shape is named exhaustively. Drizzle is B on both because no facade, no forbidden set, and no compiler gate exist in the corpus — the integration is implicitly correct (raw Drizzle confined to provider boundary; repository methods return `RawrEffect` over `Effect.tryPromise`) but unspecified at the boundary disciplines that would let an implementer build a conformant new SQL provider without invention. The classifier-LLM caller is the most ambiguous integration: as a within-pattern violation it scores D (black-box callable with no resource/provider abstraction); as a structurally-different concern it sits outside the runtime-vendor rubric — the classifier is an upstream planning inference tool, not a runtime vendor. This report commits to the gap-grade conditionally: once the classifier demands runtime-grade integration (credential rotation, rate-limit enforcement, fallback chains becoming product-visible), the integration shape becomes load-bearing. The `services/authoring-plans` future spec is the named owner; that conditional is the trigger.

## The Don't-Own-Still-Manage Frontier

The "don't-own-still-manage" frontier is RAWR's load-bearing architectural posture, where per-spec / per-seam asymmetry shows up most concretely. RAWR refuses to own categories of underlying behavior — callable transport, runtime concurrency, durable orchestration, HTTP listening, secret backend implementation, identity-provider crypto, registry hosting, CI/CD, browser automation, eval platforms — but must still manage every one from the integration point of view:

- Typing the boundary
- Owning the lifecycle handoff
- Classifying authority
- Mapping errors
- Splitting telemetry
- Enforcing forbidden patterns
- Naming reserved seams

Done right, this is the highest-leverage posture available; done wrong, it leaves silences that look like coverage but are integration-law debt.

The integration-point ownership matrix shows the policy-versus-integration-law split:

| Concern | RAWR doesn't own | RAWR still manages | Status |
|---|---|---|---|
| Effect runtime | `ManagedRuntime` / `Layer` / `Fiber` semantics | One `ManagedRuntime` per process; descriptor compilation; finalization order | **Closed** |
| oRPC transport | Contract / router / middleware / client mechanics | Lane lowering; descriptor capture; binding cache; invocation forwarding | **Closed** |
| `effect-orpc` | `.effect(...)` syntax / typing | SDK-internal-only; never exported; descriptor-first wrapping | **Closed** |
| SQL / IO via Promise | Underlying DB / SDK Promise mechanics | `Effect.tryPromise` boundary; tagged repository errors | **Closed** |
| Product analytics | Analytics SDK shape | Explicit declared `resourceDep(AnalyticsSinkResource)`; not hidden | **Closed** |
| Durable async retries | Inngest retry / durability | Forbidden as local-Effect concern; declared as Inngest's job | **Closed** |
| Auth verification | Token-library cryptography | `AuthVerifierResource` contract; provider selection in runtime profile | **Closed** |
| Deployment target | Railway / Fly supervision | `TargetProfile`; build-strategy / target separation; reserved seams | **Closed** |
| Project trackers | Linear / Jira / GitHub semantics | `ExternalRef` linkage; no forced hierarchy | **Closed** |
| Browser automation | Playwright / Stagehand mechanics | `AcceptanceEvidenceHarness`; trust hints; evidence kind | **Closed** |
| CI/CD platform | GitHub Actions semantics | `ci-report-adapter` → canonical evidence | **Closed** |
| LLM eval platforms | Rubric / model-judge mechanics | Score-vs-verdict separation; threshold policy | **Closed** |
| OTel / HyperDX | Bootstrap & exporter wiring | Runtime-owned bootstrap; service-side semantic spans; correlation linkage | **Partial** — propagation contract across server→async→MAWE absent |
| Inngest worker transport | `connect` protocol | "the bootgraph continues to own only process-local lifecycle" | **Partial** — connect-worker as bootgraph Effect Layer un-realized in runtime spec |
| Inngest event interface | Inngest event signing / idempotency mechanics | Policy-only — auth-on-emit, signing rotation, idempotency conventions, dead-letter, schema evolution all unspecified | **Real gap** |
| Auth advanced flows | IdP-specific MFA / refresh / JIT mechanics | Assurance field hook exists; step-up flow / refresh rotation / JIT provisioning unspecified | **Real gap** (companion spec) |
| Code sandbox | e2b / daytona / modal / runloop runtime | `ManagedAgentWorkspaceManifest`; `ProviderCapabilitySet` validation | **Partial** — profile→manifest mapping illustrative not normative |
| Bundle export | Foreign destination platform | `CapabilityBundle` + `TargetProfile` + three-part verification | **Real gap** — registry hosting, signing/attestation, transport silent |
| Authoring classifier LLM | LLM provider mechanics | Out of scope (intent parser may be LLM or deterministic) | **Ambiguous** — no Resource+Provider abstraction even though spec disowns LLM choice |

Applying the deferral-versus-gap rubric — named seam plus named owner plus named trigger — separates the silences cleanly. The corpus carries roughly **eight bookmarked deferrals** that pass all three tests:

- **Token-library selection** (Auth — vendor-agnostic at the verifier layer)
- **Specific IdP** (Auth — provider families exist; specific IdPs are profile-level decisions)
- **Railway/Railpack API automation** (Deployment §30 reserved with named handoff modes)
- **Blue/green/canary rollout mechanics** (Deployment §30 reserved; trigger: "when rollout semantics become product-visible")
- **Release promotion** (Deployment §30 reserved)
- **Registry authentication** (Deployment §30 reserved)
- **Secret-manager vendor binding** (Deployment §30 reserved; `SecretBinding` shape stable)
- **Catalog persistence backend** (Runtime §23.5 reserved; locked minimum sections)

Each entry has a named seam, a named owner, and a named trigger condition.

The corpus also carries roughly **fourteen real coverage gaps** that fail one or more of the three tests:

- Bundle signing/attestation
- Bundle registry hosting and transport/fetch
- Bundle-version compatibility / semver negotiation
- Inngest event-key / signing-key rotation
- Inngest idempotency-key conventions
- Inngest dead-letter / poison-event handling
- Inngest event-payload schema evolution across modes
- Inngest auth-on-emit (overlaps with Seam 2)
- OTel / HyperDX cross-process propagation
- Classifier LLM call as Resource+Provider+Profile
- Multi-tenant DB-level enforcement
- MFA / step-up / refresh-token / JIT-provisioning
- MAWE cost/budget enforcement
- MAWE multi-agent handoff semantics

The two populations side-by-side, with the rubric test each silence passes or fails:

| Bookmarked Deferral (named seam + named owner + named trigger — passes all three) | Real Coverage Gap (one or more parts missing) |
|---|---|
| Token-library selection (Auth — verifier-layer vendor-agnostic) | Bundle signing/attestation (no seam, no owner, no signing model) |
| Specific IdP (Auth — provider families exist; specific IdPs are profile-level) | Bundle registry hosting (no seam, no owner) |
| Railway/Railpack API automation (Deployment §30 reserved; named handoff modes) | Bundle transport/fetch semantics (no protocol on either side) |
| Blue/green/canary rollout mechanics (Deployment §30 reserved; trigger named) | Bundle-version compatibility / semver negotiation (`version` field exists; matrix absent) |
| Release promotion (Deployment §30 reserved) | Inngest event-key / signing-key rotation (no contract) |
| Registry authentication (Deployment §30 reserved; `SecretBinding` shape stable) | Inngest idempotency-key conventions (no naming convention) |
| Secret-manager vendor binding (Deployment §30 reserved; adapter contract is next step) | Inngest dead-letter / poison-event handling (no policy beyond Inngest defaults) |
| Catalog persistence backend (Runtime §23.5 reserved; locked minimum sections) | Inngest event-payload schema evolution (named, not specified) |
|  | Inngest auth-on-emit (overlaps with Seam 2 — privilege boundary unowned) |
|  | OTel / HyperDX cross-process propagation (no contract across server→async→MAWE) |
|  | Authoring Classifier LLM call as Resource+Provider+Profile (no abstraction) |
|  | Multi-tenant DB-level enforcement (`tenantId` declared; no row-level enforcement spec) |
|  | MFA / step-up / refresh-token / JIT (assurance hook exists; flows unspecified) |
|  | MAWE cost/budget enforcement and multi-agent handoff semantics (declared as fields; no enforcement seam) |

The 8:14 ratio puts RAWR at B+ on the system axis with a clear path to A− — close the fourteen gaps via three small spec rounds, concentrated in operational substrate, no ontology revision required. The strongest gap pattern is **field-without-protocol**: assurance declared without step-up flow; multi-agent-handoff flagged without envelope; cost/budget declared without enforcement seam; idempotency-key referenced without naming convention. A two-tier integration-point maturity is visible: the core mechanical layer (Effect runtime, oRPC, Auth, Deployment) has reached integration-law grade; the coordination/durable-async layer (Inngest event interface, MAWE observability) and authoring-time intelligence layer (classifier LLM, classification-record storage) have reached only policy-layer grade.

A steelman counter-reading: all silences are bookmarked because the reserved-boundary discipline is mature enough that any silence with a sibling spec named in §23.5 counts as bookmarked. But the three-part test is more demanding: a silence counts as bookmarked only when the seam is *named at the boundary*, the owner is *specifically named*, and the trigger is *concretely named*. "Future event schema registry" satisfies the owner test but not the seam-at-boundary test until the runtime spec absorbs the connect-worker as a typed `BootResourceModule`. The 8:14 split applies the rubric strictly because applying it loosely excuses any silence with a hand-wave. At least two cells (dead-letter handling; cost/budget vs. managed-DB provisioning) admit defensible classification on either side — a different reader could land on 7:15 or 9:13 without bad faith. The ratio is directional, not exact, and the strict reading is auditable.

## Coverage Heatmap and Completeness Matrix

The landscape map renders most clearly as **two heatmaps**: per-spec coverage (inside-this-spec completeness) and per-seam closure (cross-spec completeness). The two axes are independent. A cell can be A on the first and B on the second. Both heatmaps use the same legend.

**Legend:**
- **A** — Exhaustive within scope; reserved seams have named owners and trigger conditions.
- **A−** — Substantively complete with one or two minor named gaps the spec or sibling already flags.
- **B+** — Structurally complete with one or two integration-point silences that would surface under stress.
- **B** — Complete in shape; thin enough on integration-point disciplines that an implementer would have to invent.
- **C** — Mentioned but unanalyzed at integration-law level.
- **D** — Silent or absent.
- **★** — Bookmarked deferral (legal — passes the three-part test).
- **▲** — Integration-law debt (real gap — fails one or more parts of the three-part test).

### Heatmap 1: Per-spec coverage

| Spec | Lifecycle / runtime | Coordination / signals | Governance / acceptance | Vendor seams | Operational substrate |
|---|---|---|---|---|---|
| Effect Runtime Realization | A | A− | — | A | A |
| System Architecture (META) | A | A | A | A | A− |
| Habitat SDK Layers (DRAFT) | B+ | B+ | B+ | B+ | B+ |
| Service Package Effect (shape ref) | A | — | — | A | A− |
| Async Runtime | — | B+ | — | A− | B+ |
| Authentication Subsystem | A | A | — | A | A |
| Deployment Subsystem | — | A | — | A | A |
| OpenShell Agent Runtime | — | B+ | — | B+ | B+ |
| Managed Agent Workspace Execution | A− | A− | A− | A− | B+ |
| Workstream System | — | — | A | — | A |
| Workstream Review Subsystem | — | — | A− | A− | A− |
| Authoring Classifier | — | A− | A− | B | A− |
| Factory Bundle Export | — | — | B+ | B+ | B |

### Heatmap 2: Per-seam closure

| Seam | Named owner | Trigger condition | Source-side protocol | Sink-side protocol |
|---|---|---|---|---|
| Inngest connect-worker Effect Layer | A | A | A | **B+▲** |
| Agent-role WorkflowDispatcher emission rights | A | A | A | **B+▲** |
| Auth-specific compiler gates | A | A | A | **B+▲** |
| Inngest event-interface disciplines | B+ | B+ | B | **B▲** |
| OTel/HyperDX cross-process propagation | A | B+ | A− | **B▲** |
| MFA / step-up / refresh / JIT | A | B+ | A− | **B▲** |
| MAWE profile→manifest mapping | A | A | A | **B▲** |
| CapabilityBundle signing/attestation/registry/transport | B | B | B | **B▲** |
| Authoring Classifier LLM call (Resource+Provider) | B | B | B | **B▲** |
| Multi-tenant DB enforcement | A | A | A− | **B▲** |
| Cost / budget enforcement (MAWE) | A | A | A− | **B▲** |
| Multi-agent handoff protocol (MAWE) | A | A | A− | **B▲** |
| Tensions / RFDs / autonomy thresholds | A | A | B | **B▲** |
| Engineering test discipline reference | B | B | B | **B▲** |

Reading the two heatmaps together resolves the apparent grade contradiction. **Heatmap 1** shows the corpus is per-spec near-A: every spec scores A, A−, or B+ on its claimed concerns. **Heatmap 2** shows the corpus is per-seam B+: named seams have named owners and triggers but the sink-side protocol is incomplete in fourteen cells. The system-level grade is B+ on integration-law and A on intra-spec — a decomposition, not a contradiction.

The tier roll-up:

| Tier | Per-spec average | System-axis | Composite |
|---|---|---|---|
| Core Runtime | A | A− (3 integration-law seams) | **A−** |
| Coordination | A−/B+ | B+ (Inngest event interface; auth thin spots; MAWE cost/observability; OpenShell brain) | **B+** |
| Semantic-Composition | A−/B+ | B (registry/signing/LLM gaps) | **B+** |
| Governance | A−/D | B (future governance umbrella missing) | **B** |
| **System** | **A−** | **B+** | **B+ → A−** |

**The composite reading:** the system is one P0 spec round (Event Schema Registry plus Bundle Registry & Signing) plus one P1 round (Authoring-Plans, OTel/HyperDX Propagation Contract, Governance/Tensions/RFDs canon) from a clean A−.

## Open Gaps and Recommended Next Specifications

The recommendation list derives strictly from the heatmap and the don't-own-still-manage classification. Every recommendation closes a flagged ▲ cell and does not reopen the ontology. Each entry names the gap, the recommended spec or section, the owner, trigger condition, and acceptance criteria. P0 items would surface as production incidents or supply-chain failures if open through the next deployment slice; P1 items would surface as integration stalls or audit failures; P2 items would surface as conformance ambiguity that slows new implementers without blocking shipped systems.

### P0 — must land before the next operational slice that exposes the seam

**P0.1 — Event Schema Registry / Inngest Event Interface companion spec.** Closes Inngest event-auth, idempotency-key conventions, dead-letter, schema evolution, signing-key rotation, and OTel propagation across the emit boundary; partly closes Seam 2 (per-role emission rights).

- **Owner:** structurally co-owned. Async Runtime owns event shape (schema, signing, idempotency, dead-letter, evolution); Authentication owns the auth-on-emit privilege boundary [[rawr-authentication-subsystem-spec-analysis]]. The simplest landing is a single new sibling spec to Async Runtime declaring explicit dependency on the Auth actor/authority model; an alternative splits auth-on-emit into Auth-side P2.3 and keeps the registry spec focused on event mechanics.
- **Trigger:** first product surface emitting durable events from a non-`server` role — already triggered by OpenShell §8.3 and §14.4.
- **Acceptance:** every Inngest event has a typed schema; auth-on-emit specified per role; idempotency-key naming convention specified for `server`-emitted events; dead-letter policy specified beyond Inngest defaults; signing-key rotation contract specified; W3C TraceContext propagation specified at the emit boundary [[rawr-async-runtime-spec-analysis]].

Without signing/schema closure, supply-chain attacks at the event boundary are undetectable; without auth-on-emit, privileged events from `agent` and `async` roles cross the public/HQ boundary unchecked.

**P0.2 — Bundle Registry & Signing Spec.** Closes bundle signing/attestation, registry hosting, transport/fetch, and bundle-version compatibility/semver negotiation. Without signing, bundle provenance is an honor system and supply-chain attacks are undetectable. The acceptance criteria must integrate with Factory Bundle Export's three-part verification split (portable verification establishes source-side certainty; mappable verification establishes that the bundle's typed surface re-types at the destination; destination-local verification burns down destination-side uncertainty inside the retargeting workstream) — the registry/signing spec sits at the seam between portable and mappable.

- **Owner:** a new sibling spec to Factory Bundle Export, or a new §N inside it.
- **Trigger:** first cross-organization retargeting transfer or first product-user-visible capability bundle.
- **Acceptance:** `CapabilityBundle` carries a sigstore/cosign-shaped signature field; `CapabilityRegistry` resource defined with auth contract; `ArtifactRef` resolution protocol specified; transport security contract specified (TLS posture, integrity verification, fetch protocol); semver compatibility matrix on `CapabilityBundle` × `TargetProfile`; deprecation signal; consumer version pinning [[rawr-factory-bundle-export-spec-analysis]].

**P0.3 — Runtime spec §17 / §19 / compiler-section additions for the three integration-law seams.** Closes Seam 1 (Inngest connect worker as bootgraph-integrated Effect Layer), Seam 2 (per-role `WorkflowDispatcher` emission rights), and Seam 3 (auth-specific compiler-gate closure) inside the authoritative runtime spec itself.

- **Owner:** edits to the Effect Runtime Realization spec at §17 (bootgraph), §19 (`WorkflowDispatcher`), and the runtime compiler section.
- **Trigger:** this is overdue — closing P0.1 simultaneously is the natural sequencing because the seams interlock.
- **Acceptance:** §17 names the connect worker as a `BootResourceModule` with explicit lifetime, acquire/release pair, and finalization order; §19 enumerates per-role emission rights for the five canonical roles (`server`, `async`, `web`, `cli`, `agent`); the runtime compiler section either commits the auth-specific gates directly or specifies the typed contract by which the auth subsystem contributes them [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]].

Three gaps are least likely closed by known sibling specs and most likely to require dedicated new specs: bundle signing/attestation (no spec covers cryptographic provenance); bundle-version compatibility (no spec owns semver-on-bundles); and refresh-token rotation (the Auth subsystem reserves the field but no companion is named). Other P0/P1 items extend existing reserved seams.

### P1 — should land within the next two operational slices

**P1.1 — `services/authoring-plans` Spec (or LLM-call Resource+Provider+Profile shape).** Closes the classifier LLM call as a proper Resource + Provider + Profile triplet; closes classifier-LLM credential / rate-limit / fallback / retry ownership; closes classification-record storage durability.

- **Owner:** a new sibling spec to Authoring Classifier, or a new §N inside it.
- **Trigger:** classification records acquire durable semantic truth, OR an LLM credential rotation/secret-rotation event becomes product-visible.
- **Acceptance:** `LLMCallResource` (or equivalent) defined with provider families (claude / openai / azure / local / etc.); profile selection mechanism; `RawrEffect`-typed return; tagged-error model; rate-limit / retry policy declared at the resource boundary; classification-record storage backend specified or honestly named as deferral [[rawr-authoring-classifier-system-spec-analysis]].

**P1.2 — OTel / HyperDX Propagation Contract Spec.** Closes distributed tracing across the server → async → MAWE-provider chain; closes provider-side observability; closes W3C TraceContext header injection at all three boundaries. Without propagation, distributed traces break at every service boundary and production debugging is blind across the server → async → MAWE chain.

- **Owner:** a new sibling spec to Async Runtime, OR a §N inside the future Service Package Effect canonical spec when it lands.
- **Trigger:** first multi-process tracing requirement; first product-user-visible failure that requires correlation across process boundaries.
- **Acceptance:** trace-id injection at Inngest event envelope; W3C TraceContext propagation at `server` emit boundary; HyperDX exporter config; trace correlation through `ManagedAgentRunEvent.traceId` to provider; integration with `RuntimeTelemetry`.

**P1.3 — Governance / Tensions / RFDs / Decisions Canonical Spec.** Closes the future-governance-layer references in [[rawr-workstream-review-subsystem-spec-analysis]]; closes steward authority and autonomy thresholds; closes the RFD state machine; closes waiver-policy authority; closes the governance profile shape; closes the tension/decision model.

- **Owner:** a new META spec at the Governance tier, peer to Workstream and Workstream Review.
- **Trigger:** first steward autonomy threshold exceeded; first waiver requiring escalation; first RFD requiring durable state.
- **Acceptance:** `Tension`, `Decision`, `RFD`, `EscalationLadder` types defined; steward autonomy threshold model; waiver-authority policy; escalation paths; integration with Workstream Review's evidence pipe.

### P2 — quality-of-life and operational substrate

**P2.1 — Engineering Test Discipline Reference.** A skill/discipline document, not a canonical spec. Distributes the test patterns currently scattered across Workstream Review (acceptance), Runtime Realization (test mode + conformance gates), and Authoring Classifier (verification plans) into a single reference covering:

- Per-plugin-kind test harness
- Inngest local Dev Server patterns
- MAWE sandbox-noop provider test profile
- Contract-test patterns at vendor boundaries

Crucially this is a *reference document inside an existing META spec*, not a new subsystem with runtime authority — Workstream Review correctly owns acceptance metabolism, and a parallel `services/testing` would violate the discipline.

**P2.2 — MAWE Profile→Manifest Normative Mapping** for the eight named provider families. Promotes openai-agents-sdk, claude-managed-agents, cloud-sandbox-agent, runloop, e2b, daytona, modal, vercel, local-noop, and custom from illustrative to normative inside the MAWE spec. Trigger: first new MAWE provider implementation outside the in-house team [[rawr-managed-agent-workspace-execution-spec-analysis]].

**P2.3 — MFA / Step-Up / Refresh-Token / JIT-Provisioning Auth Companion Spec.** Closes the four named real gaps inside the Authentication subsystem. Trigger: first product surface with high-assurance requirements.

**P2.4 — Multi-tenant DB-level Enforcement Spec.** Names the row-level security posture, query-guard lint rule, and required filter predicate at the service-package layer. Owner: the future Service Package Effect canonical spec when it lands.

**P2.5 — Drizzle Integration Spec** (or §N inside Service Package Effect canonical). Names the facade, the forbidden set, and the CI gate that the corpus currently leaves implicit.

**P2.6 — OpenShell-vs-MAWE harness selection law.** Non-blocking residual: the runtime spec acknowledges agent harnesses as a category but does not name when an agent role plugin runs OpenShell-backed (trusted-local) versus MAWE-backed (sandboxed-managed). Owner: a runtime spec extension or a System Architecture clarification.

### Forward implications

Two product surfaces drive the trigger conditions for the P0 cluster:

- **Cross-organization capability bundle export** is gated by P0.2 (Bundle Registry & Signing) — without signing/attestation/registry, bundles cannot leave the source organization with provenance intact.
- **Production multi-tenant SaaS** is gated by P0.1 (Event Schema Registry) and P2.4 (Multi-tenant DB-level Enforcement) — without auth-on-emit and row-level enforcement, the public/HQ trust boundary leaks and tenant isolation is policy-only.

RAWR is past the design-completeness threshold; what remains is integration-cashing. Closing the three blocking runtime seams via P0.3 converts the system-axis grade from B+ to A− without any per-spec revision; closing the fourteen operational-substrate gaps brings it to A and unblocks both product surfaces.

The risk is symmetric. If RAWR ships those product surfaces before the gating specs land, Inngest event-interface conventions and bundle-signing semantics will harden in code, and any subsequent specification becomes migration rather than green-field design. The 8:14 ratio is a window, not a permanent state. The four-tier landscape is stable through every recommended spec — Event Schema Registry sits inside Coordination, Bundle Registry & Signing inside Semantic-Composition, Tensions/RFDs canon lands the missing META at Governance — none moves a tier boundary. The architecture is stable; the spec set is not. The corpus's load-bearing commitment is that there is no shortcut around this work: the descriptor-first principle is universal, the bespoke-shapes finding is correct, and the Inngest two-axis case proves "use a vendor at its strength" and "specify the integration completely" are independent properties each earned separately.
