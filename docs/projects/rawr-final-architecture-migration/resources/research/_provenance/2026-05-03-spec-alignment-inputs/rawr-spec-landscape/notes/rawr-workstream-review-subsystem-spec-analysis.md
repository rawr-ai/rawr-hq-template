---
title: RAWR Workstream Review Subsystem — spec analysis
id: rawr-workstream-review-subsystem-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:39:55.604310Z'
updated: '2026-05-01T21:10:19.252161Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Workstream_Review_Subsystem_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Workstream_Review_Subsystem_Canonical_Spec.md
- runtime_authority: no

## Scope and purpose

This spec defines the canonical **Review Subsystem** of RAWR as a *component* of the Workstream System (not a sibling service, not a workflow engine, not the governance layer itself). It fixes the typed primitives, lifecycle, evidence pipe, and invariants that turn "is this work acceptable enough to advance, repair, escalate, waive, or close?" into durable, inspectable, governed state. It explicitly does *not* fix DB schema, scoring algorithms, UI design, gate runner implementation, vendor choices, the human approval surface, or the future name of the broader governance layer.

The strongest one-line framing the spec gives itself: **"A review graph is the active form of a workstream output contract."** The spec sits at the *governance* level of the platform — it is the acceptance-control component of workstreams, where decisions about "done" become durable.

## Concern coverage

- **Acceptance / "done" semantics**: review graph as active form of output contract; explicit closure rule that "no workstream advances because an actor says it is done."
- **Review lifecycle**: pending → eligible → active → satisfied / failed / blocked / invalidated / escalated / waived; full state machine with event model.
- **Multi-altitude verification**: low (typecheck, unit, contract fixtures), middle (projection composition, persistence, providers, integration), high (behavioral, architectural, governance, human approval).
- **Decision capture**: ReviewVerdict, ReviewRepairDemand, ReviewWaiver, ReviewInvalidation as first-class typed records; events for every state transition.
- **Fix-review loop**: typed `ReviewRepairDemand` narrows next attempt; replan vs retry distinction; invalidation cascades.
- **Evidence ingestion ("don't own, still manage")**: external tools (CI, Playwright, Serenity/JS, Stagehand, evals, surveys, support tickets, analytics) flow through `AcceptanceEvidenceHarness` → `ReviewEvidenceAdapter` → canonical `ReviewEvidence`.
- **Multi-agent coordination / judge separation**: builder may produce evidence but not judge high-level acceptance; composite evaluators with steward independence and human-final rules; reward-hacking and self-approval are explicitly forbidden.
- **Governance gates**: human approval, waiver authority, score-vs-verdict separation, escalation policy, trust hints on harnesses.
- **Tension / structural failure feedback**: repeated review failures emit tension evidence (review feeds tensions, does not replace them).
- **Plan revision / artifact relationship**: graphs attach to plan revisions and artifacts; supersession; historical inspectability.
- **Async / shell separation**: shell may inspect/request; async stewards execute governed review and repair; durable truth lives in workstream service.
- **Retargeting / portability**: portable / mappable / destination-local verifier classes are runnable as review loops (revenue forecast → FastAPI example).
- **Repository topology / API surface**: review lives under `services/workstreams/src/modules/review/`, with async/agent/web projections; sketch of `WorkstreamReviewContract`.
- **Closure semantics**: workstream closure requires output-contract satisfaction AND active review graph satisfied/waived AND no blocking governance review.
- **Customer feedback / post-launch reopening**: feedback can reopen behavioral loops via policy.

Notably *uncovered* (deliberately deferred): exact DB schema, exact scoring algorithms for non-deterministic evaluators, exact UI, exact gate runner, exact vendor choices, the future governance umbrella name, and the eventual extraction boundary if review earns a separate service.

## Platform-level signal

**Governance** (primary). Justification: the spec defines acceptance authority, decision durability, waiver mechanics, judge independence, escalation, and the bridge to the future governance layer ("review answers: is this work acceptable enough to advance? governance answers: what authority is allowed to decide that?"). It is explicitly *not* the runtime, *not* a workflow engine, and *not* the whole governance layer — it is the acceptance-control sub-component of governance, embedded in the Workstream System's coordination object. It is **cross-cutting into Coordination** because it is implemented as a module of `services/workstreams` and projects through async/agent/web/server, but its *concerns* are governance concerns.

## Vendor integrations declared

The spec is unusually explicit that vendors are evidence sources, never RAWR primitives.

- **GitHub Actions / CI/CD**: ingested as `gate-report`, `test-report`, `command-output` via `ci-report-adapter`.
- **Playwright**: trace/screenshot/HTML report → `browser-trace-adapter` → behavioral loops.
- **Serenity/JS (Screenplay pattern)**: actor/goal/task/question/artifact mapped through `screenplay-acceptance-adapter` to `acceptance-scenario-report` evidence.
- **Stagehand (AI browser automation)**: act/extract/observe transcripts → `stagehand-browser-adapter`; explicitly lower-trust by default ("may require human or steward confirmation before satisfying high-risk loops").
- **LLM eval platforms**: rubric/model-judge scores → `eval-report` evidence; "score is never a verdict by itself."
- **Customer feedback / support / analytics**: feedback notes, tickets, satisfaction scores, product analytics → `feedback adapter` → `customer-feedback`, `satisfaction-score`, `product-analytics` evidence.
- **Survey tools**, **manual review packets**, **external systems**: same pipe via `manual-ingest` mode.

The "stand on shoulders of giants" pattern is named explicitly: harnesses run real engineering tools (CI, browser automation, evals); RAWR only owns the *evidence interface*. Trust hints on harnesses (`low | medium | high`, `requiresHumanConfirmation`, `allowedLoopKinds`) gate which loops a given source can satisfy.

No native runtime vendor (Effect, oRPC, Inngest, Bun, Elysia, Drizzle, HyperDX) is invoked at the *review semantics* level — that is correct, because review semantics are governance semantics. The runtime projections this spec gestures at (server API, async workflows, agent tools, web app) are stated as workstream projections that must already exist.

## Don't-own-still-manage frontier

This spec is essentially a treatise on the don't-own-still-manage frontier — that is its dominant contribution. Concretely:

- **CI/CD pipelines (GitHub Actions etc.)**: RAWR does not own them; it owns the adapter that turns their output into canonical evidence and the policy that decides whether their result is sufficient for a given loop.
- **Browser automation (Playwright, Stagehand)**: RAWR does not own them; it owns trust policy, evidence kind, and whether their evidence can satisfy behavioral or architectural loops.
- **Acceptance frameworks (Serenity/JS Screenplay)**: RAWR does not own them; it owns the actor/goal/task/question/artifact mapping into evidence.
- **Eval platforms**: RAWR does not own them; it owns the score-vs-verdict separation and threshold policy.
- **Customer feedback / support / analytics**: RAWR does not own these channels; it owns the policy by which they reopen review or open follow-on workstreams.
- **Comment / threading systems (Slack, etc.)**: forbidden as review state; thread actions must project into typed review events. Spec is silent on *who owns the projector* and *which thread vendor is canonical*.
- **AI providers (model-judge, rubric scoring)**: only as evidence producers behind adapters; no vendor named, billing/rate-limit/audit unaddressed.
- **Human approval product surface**: explicitly deferred — a real frontier.
- **Survey / customer-satisfaction product**: deferred.

Silences worth flagging: PII / retention / redaction at the adapter layer is treated only as `redactSecrets: boolean` on artifact policy — thin.

## Runtime touches — flagged

The spec is *non-authoritative on runtime semantics* and stays mostly at the governance/data-model level, but it does touch runtime concerns at these points:

- **Async projection**: `plugins/async/workflows/workstreams/` review-runner, scheduler, evidence-collector, evidence-ingest, repair-dispatcher, invalidation-handler. Stated as where "governed review and repair" execute. Implies durable workflow primitives (Inngest in RAWR's stack) but does not name them.
- **Shell vs async separation**: explicit rule that "shell may inspect and request review; async stewards execute governed review and repair; workstream records durable truth." This mirrors the runtime realization spec's shell-vs-async posture and so is shape-correct.
- **EvaluatorSpec.kind = "system-command"** with a `runner: string` and **gate-runner** evaluators imply a process-execution surface and a gate-runner family that the runtime must provide. The spec does not bind these to the runtime catalog.
- **Adapter `normalize` function** is "illustrative — may be a service procedure, async workflow step, or adapter module." Runtime placement is intentionally unfixed.
- **Context engine / context packs**: review-attempt / repair / human-approval packs assume a context engine subsystem exists and can scope/retrieve evidence and artifacts.
- **Event model**: ~16 event kinds (`review.graph.generated`, `review.loop.opened`, `review.loop.verdict.recorded`, `review.evidence.recorded`, etc.) imply a durable event bus / outbox; not bound to a runtime primitive.

None of these touch points contradict the runtime realization spec; they all need to be *realized* by it.

## Completeness signals

- **Explicit out-of-scope list** (Section 1): DB schema, scoring algorithms, UI design, test/gate runner implementation, vendor choices, human approval product surface, future governance umbrella name, eventual extraction boundary. The spec is honest about what it defers.
- **No TBD/TODO markers** in the structural sense — the spec presents itself as canonical and decision-complete on its own scope.
- **"Future extraction may be earned"** clause (Section 5) — explicitly deferred trigger conditions for promoting review out of `services/workstreams/`.
- **Section 6 ("Relationship to the future governance layer")** is the largest dependency on missing work: governance, RFDs, steward trust/policy, human escalation as durable subsystems are *referenced but not yet specified*.
- **`scorePolicy?` and `scoreIsVerdict: false`** is a load-bearing constraint but the actual scoring/threshold semantics ("rubric-judgment", "score-threshold") are exploratory — actual rubric DSL and minScore norms are not given.
- **Async workflow sketch** (Section 51) reads as authoritative on shape but exploratory on naming (`review.scheduler`, `evidence.collector`, etc., are described prose-style, not bound to Inngest function definitions).
- **Service API sketch** (Section 50) is "illustrative shape" — the contract is canonical in *intent* but the procedure list is acknowledged as a sketch.
- **Cross-spec dependencies are heavy**: assumes Workstream System spec, Authoring Classifier spec, tensions/decisions/RFDs (future), context engine, async steward execution, runtime resources/providers — none of these are inlined.
- **Authoritative-feeling vs exploratory-feeling**: governance posture, separations (Section 7), invariants (Section 52), forbidden patterns (Section 53), and the evidence-pipe philosophy *feel canonical*. Specific vendor adapter shapes, score policy details, and async event names *feel exploratory but well-shaped*.

## Cross-spec dependencies

- **Workstream System Canonical Spec** — this spec is explicitly a *component of* it; assumes Workstream, OutputContract, PlanRevision, Run, Artifact, EvidenceRef, ParticipantRef, ProvenanceRecord, ArtifactRef, RuntimeSchemaRef.
- **Authoring Classifier System Canonical Spec** — assumes `ClassificationResult`, `WorkstreamKind`, `WorkstreamScope`, `RiskProfile`, `GovernanceProfile` types feed `ReviewSelector`.
- **Tensions / future governance layer** — review failures emit tension evidence; governance decides authority; both deferred to other specs / future work.
- **Effect Runtime Realization spec** (authoritative-on-runtime) — implicit dependency for `EvaluatorSpec.kind = "system-command"`, gate-runners, async workflow primitives, runtime resources/providers, and the shell-vs-async lifecycle posture.
- **Async Runtime Canonical Spec / Managed Agent Workspace spec / OpenShell spec** — the async/agent/shell projections section presumes these exist.
- **Deployment Subsystem spec** — touched indirectly via "destination-local acceptance," "deployment readiness checked," and the retargeting example.
- **Factory Bundle Export spec** — directly invoked in the retargeting example (Section 48): "Workstream source: CapabilityBundle revenue-forecast-dashboard, target: Python FastAPI."
- **Authentication, Habitat SDK, System Architecture specs** — not directly referenced.

The spec consistently *defers to* other specs rather than redefining them. No supersession claims.

## Verbatim load-bearing definitions / claims

1. (§2 Canonical decision) "**Review loops are the active acceptance machinery of a workstream output contract.**"
2. (§2) "the workstream owns the work / review owns whether the work may advance"
3. (§4 Canonical thesis) "**A review graph is the active form of a workstream output contract.** The output contract says what must exist. The review graph says what must become true before the system believes it exists well enough."
4. (§4.1) "no workstream advances because an actor says it is done / it advances because review state says the required loops are satisfied, waived, or escalated according to policy"
5. (§4.2) "The review system should not become a new test runner, browser automation framework, CI system, eval product, survey product, or customer-feedback product. It should provide one canonical pipe for their outputs"
6. (§4.5) "builder may produce evidence / reviewer judges evidence / policy decides authority / workstream records state"
7. (§4.6) "review turns heterogeneous proof into governed workstream state"
8. (§6) "review answers: is this work acceptable enough to advance? / governance answers: what authority is allowed to decide that?"
9. (§7.5) "evidence != verdict"
10. (§7.8) "score != verdict"
11. (§7.10) "repair demand != retry instruction"
12. (§7.11) "waiver != pass"
13. (§22.5 selector) "The classifier does not merely identify the work. It generates the review geometry required to believe the work."
14. (§35.7) "The review graph should make this explicit through criteria and evaluator policy."
15. (§53.11 Forbidden) "Serenity/JS, Playwright, Stagehand, GitHub Actions, or any eval product becomes a RAWR review primitive ... vendors remain evidence harnesses behind adapters; RAWR owns the evidence interface"
16. (§ Final posture) "review is the workstream's acceptance metabolism"
17. (§4.3) "A failing review loop should not merely say 'try again.' It should narrow the next move."
18. (§52.6) "human approval criteria require actual human approval unless governance explicitly delegates / builder and final high-level reviewer should be separated when risk is material"

## Estimated completeness grade (initial impression)

**A−**. Justification: For its *claimed scope* — fixing the canonical review primitives, lifecycle, evidence pipe, separations, invariants, and forbidden patterns — the spec is exceptionally complete, internally consistent, and operationally specific. It correctly bounds itself out of DB/UI/runner/vendor specifics, names its dependencies on adjacent specs, and the governance/coordination/runtime separations are crisp. The minor downgrade from A is because (a) it leans heavily on a future governance layer that does not yet exist, (b) the score / rubric / model-judge semantics are gestural rather than canonical (the most likely place for under-specification to bite), and (c) the human-approval product surface and the comment-thread → review-event projector are real frontiers that are deferred without naming who owns them. The cross-spec coverage matrix in step 6 should refine this — particularly checking whether the Workstream System and Classifier specs supply the types this spec assumes.
