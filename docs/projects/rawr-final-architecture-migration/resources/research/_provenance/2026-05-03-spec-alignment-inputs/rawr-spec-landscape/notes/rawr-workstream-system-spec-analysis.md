---
title: RAWR Workstream System — spec analysis
id: rawr-workstream-system-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:38:58.599962Z'
updated: '2026-05-01T21:10:19.474432Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Workstream_System_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Workstream_System_Canonical_Spec.md
- runtime_authority: no

## Scope and purpose

This spec defines RAWR's **Workstream System** — the canonical reframing from sessions/threads/workflows to **workstreams** as the durable, stateful, reactive coordination object that owns long-running agentic work. It fixes the ontology, the typed input/evidence/control model, the plan-revision-and-run model, the context engine's role as a "compiler for work-ready context," lifecycle states, integration seams with the RAWR shell + async stewards + tensions, and the invariants/forbidden patterns that keep the model honest. It deliberately does NOT fix storage backend, notebook block syntax, exact step taxonomy beyond required categories, ranking algorithms, UI, mappings to Linear/Jira/Slack, or the workflow engine implementation underneath durable runs.

## Concern coverage

Concerns this spec addresses, in its own terms:

- **Ontology / vocabulary discipline**: distinguishes `session / thread / workstream / run / workflow / worktree / project / initiative / artifact`, with explicit "session != thread != workstream != run != workflow != worktree" invariant.
- **Lifecycle / state machine**: explicit states (`open / active / waiting / paused / blocked / resolved / abandoned`) with a Mermaid state diagram.
- **Hand-offs and continuity**: workstream survives sessions, model swaps, shell restarts; "two stewards can attach without sharing one giant prompt" (§29).
- **Audit / decision tracking**: relatedTensionIds, relatedDecisionIds, controlEvents, plan-revision lineage, immutable history once execution begins.
- **Plan revision / replanning model**: notebook -> compiled revision -> runs pinned to revision; replanning produces a new revision rather than mutating execution history.
- **Run model**: typed RunStatus and RunRecord, attribution to revision, worktree refs, artifact emission.
- **Typed input model**: opening / evidence / control inputs, with the rule "most interaction is evidence; only typed control changes governance or progression."
- **Output contract / completion semantics**: OutputSpec/OutputContract types, `completionRule: "all-required" | "explicit-close-decision"`, both code and non-code outputs.
- **Charter / scope / governance posture**: WorkstreamCharter, WorkstreamScope (services, plugins, apps, roles, surfaces, runtimeScopes, externalSystems), GovernanceProfile.
- **Context engine**: dedicated section reframing it as a "compiler for work-ready context" producing target-typed packs (`open / plan / run / review / handoff / human-summary`); persist refs not blobs; provenance stamping.
- **Thread projection model**: zero-or-many threads per workstream; comments default to evidence; only typed control commands mutate state.
- **Reactive opening**: tensions, observations, decisions, follow-on workstreams, human requests, shell delegations can all open or advance work.
- **Event model**: explicit WorkstreamEvent union (opened, evidence-added, control-issued, plan-revised, run-started, run-finished, artifact-emitted, status-changed, thread-updated).
- **Capability suite layout in RAWR**: `services/workstreams/`, `packages/workstream-{types,context,plan}/`, projections under `plugins/{server,async,web,cli,agent}/.../workstreams`.
- **Human + agent participation model**: mixed participants, durable inspect/steer surfaces.
- **Shell vs steward authority split**: shell opens/inspects/summarizes/routes/steers; async stewards plan/execute/replan/mutate state/emit artifacts.
- **Worktree relationship**: workstream/run -> 0..n worktrees; "filesystem does not get to define the coordination topology."
- **Project/initiative orthogonality**: projects-to-workstreams is many-to-many; no forced hierarchy.
- **Forbidden-pattern catalog and invariants**: ontology, ownership, lifecycle, projection, RAWR integration invariants are each enumerated.

Concerns NOT addressed (intentionally listed in §1 and §32 as out of scope): storage backend, notebook syntax, plan IR compilation format, UI, exact mapping to Linear/Jira/Slack, workflow engine, exact event bus, exact thread vendor adapters, exact artifact storage, loadout suggestion model.

## Platform-level signal

**Primary level: Governance.** The Workstream System sits explicitly *above* execution and *below* portfolio planning. It is the durable coordination object through which signals (human request, tension threshold, decision follow-on, observation) become governed work. The spec frames it as "the durable coordination object between shell and async stewards" (§23.2), and its invariants are governance-flavored: explicit events, attributable revisions, no silent mutation, control vs evidence typing, projections-do-not-own-truth.

It is also strongly **Cross-cutting** because it integrates with every other RAWR subsystem (shell, async stewards, context, observation, tensions, decisions, topology, artifacts, identity). But the *primary* signal is governance: the Workstream is where decisions get made and adjudicated over time, where charters and output contracts adjudicate completion, where replanning is recorded as new revisions, and where typed control events advance lifecycle.

In the user's three-level framing (operational/coordination/governance), this spec is the canonical example of a **governance-level** object. It explicitly disclaims being the runtime authority ("It does not fix … the exact workflow engine implementation beneath durable runs") and explicitly disclaims being the truth owner for execution mechanics.

## Vendor integrations declared

The spec is deliberately vendor-agnostic at this layer; it names few concrete vendors directly and instead defers to RAWR's existing capability layout. Implicit vendor surfaces:

- **Inngest / durable workflow engine**: implied by "async stewards," `plugins/async/workflows/workstreams`, "workflow engine implementation beneath durable runs" (§1, §22, §23.2). Not named, but Inngest is RAWR's canonical durable engine elsewhere.
- **Linear / Jira / project trackers**: explicitly named as out-of-scope mapping concerns (§1: "the exact mapping to external planning products such as Linear, Jira, or Slack"). The spec keeps "projects" and "initiatives" *outside* the core ontology and links them many-to-many via `relatedProjectRefs: ExternalRef[]`.
- **Slack / chat platforms**: cited as a thread-projection vendor surface ("a thread may live in chat, Slack, a web UI, CLI output, an email-like channel"). Threads are explicitly not the system of record.
- **Git / code review hosts**: implicit through artifacts ("code change", "branch or PR") and worktrees, but no direct vendor binding. No mention of GitHub, GitLab, Graphite, or stacked-PR tooling.
- **AI agents / shell**: the RAWR shell and async stewards are first-class participants; LLM steps appear as a required step category (`llm`).
- **No mention of**: oRPC, Effect, Bun, Elysia, Drizzle, HyperDX, TypeBox. The spec sits above the vendor-binding layer.

The "stand on shoulders of giants" pattern shows up as a *negative* claim: the workstream system "does not need to absorb [observation, tensions, decisions, topology, artifact registries]. It needs to consume them coherently" (§23.3).

## Don't-own-still-manage frontier

This spec is a near-perfect exemplar of the user's "don't own, still manage" principle:

- **Project tracker (Linear)** — RAWR does not own project/initiative semantics; it links them many-to-many via `relatedProjectRefs: ExternalRef[]` and explicitly refuses to force one hierarchy. Manage-from-integration: `ExternalRef`. **Silent on**: bidirectional sync semantics, conflict resolution if Linear status diverges from workstream status, who is allowed to author what on which side.
- **Git / code review hosts** — Artifacts include "code change", "branch or PR", but the spec is silent on how a workstream binds to a Git host PR/issue, on stacked-PR (Graphite) interaction, or on whether artifact links carry Git refs. **Silent on**: integration-point ownership for Git/PR lifecycle; the artifact registry is referenced but not specified here.
- **Durable workflow engine (Inngest)** — Runs may "call a workflow engine" but the engine is explicitly out of scope (§1). The workstream owns lifecycle truth; the engine owns execution mechanics. Cleanly framed.
- **Chat platforms (Slack / web / CLI)** — Threads are projections; the spec defines the input rule ("comments default to evidence; only typed actions become control events") but leaves vendor adapter shape open.
- **Storage / database** — Spec defines semantic shape, leaves backend open.
- **Artifact storage** — Linked artifacts are part of workstream truth, but artifact *contents* live elsewhere; the registry vendor is unspecified.
- **AI model / LLM** — The `llm` step category is required; vendor binding is below this layer.

The strongest "manage but don't own" signal is the rule (§14.5):
> persist authoritative refs / compile minimal sufficient packs / do not persist one giant opaque context blob as truth

That is exactly the integration-point ownership posture the user described: ref-based linkage to externally-owned truth, internal compilation, no greedy absorption.

## Where the spec touches runtime — flag as shape-correct

The spec deliberately does not fix runtime semantics. It touches runtime only at integration seams:

- **Plugin layout** mirrors RAWR's runtime plugin convention (`plugins/server/api/...`, `plugins/async/workflows/...`, `plugins/web/app/...`, `plugins/agent/tools/...`, `plugins/agent/channels/...`). This shape must agree with the authoritative Effect Runtime Realization spec but is asserted, not derived.
- **Service law**: "the workstream is a service boundary because it owns durable semantic truth … it belongs under `services/`, owns its contracts and state, its plugins project it into runtime surfaces, its app membership is determined through manifests like any other service" (§23.1). This appeals to RAWR's service+plugin pattern without redefining it.
- **Step categories** (`llm`, `service`, `workflow`, `human-wait`, `gate`, `emit`) intersect runtime mechanisms but the spec stays at the IR level, not at execution semantics.
- **Run/RunRecord**: defines semantic shape only; "the exact execution backend may vary. The semantics may not."
- **Event emission**: defines event union but not bus/transport.

These touchpoints are shape-correct: they make claims about *where* runtime concerns plug in, not about *how* runtime executes them. The runtime-authoritative spec must validate that `services/`, `plugins/{server,async,web,cli,agent}/`, manifests, and the shell/steward split it describes match.

## Completeness signals

- **No TODO/TBD markers** in the body. The spec reads as canonical and finished.
- §1 explicitly lists **deliberate out-of-scope items** (storage, notebook syntax, step taxonomy beyond required, ranking, UI, Linear/Jira/Slack mapping, workflow engine impl). These are conscious omissions, not gaps.
- §32 ("What remains flexible") repeats the deliberate-flexibility list — also a completeness *signal*: the author has thought about variance points.
- §29 ("What the system must make possible") provides 10 falsifiable acceptance criteria — strong completeness marker.
- §30 (invariants) and §31 (forbidden patterns) are crisp and exhaustive-feeling.
- **Authoritative-feeling throughout**: declarative, opinionated, no hedging, named "Canonical Specification."
- **Cross-spec leans without thinness**: refers to RAWR shell, async stewards, tensions, decisions, observation, topology/catalog, artifact registries, identity. Each of those has its own spec elsewhere; this spec correctly stays out of their territory.
- **Implementation-detail silences (deliberate)**: notebook syntax, vendor adapters for threads, project-tracker bidirectional sync semantics. Reasonable to defer.
- **One implicit gap**: the *Workstream Review Subsystem* is presumed (review packets, review pack target) but defined in a sibling spec — not an internal gap.

## Cross-spec dependencies

Implicit references (not by file path) to other RAWR specs:

- **System Architecture / capability suite layout** — relies on the `packages / services / plugins / apps` law.
- **Effect Runtime Realization spec** — service boundaries, plugin projection, manifests, runtime roles map to that authoritative source.
- **Async Runtime / async stewards** — runs and replanning depend on it.
- **Workstream Review Subsystem** — the `review` context target and "review packet" artifact kind imply a separate review spec.
- **Tensions / Decisions / Observation / Topology / Catalog / Identity** — each named as a context source the workstream consumes without absorbing.
- **Authoring Classifier** — implicit via output kinds (rfd, decision, design memo).
- **Managed Agent Workspace Execution** — worktree semantics overlap.

## Verbatim load-bearing definitions / claims

1. (§1) "make long-running work a first-class system object instead of hiding it inside chat, tickets, or workflow runs"
2. (§3) "**A workstream is a durable, stateful, reactive coordination object that owns the lifecycle of producing one or more outputs under evolving evidence and governance.**"
3. (§4) "session = one bounded interaction slice / participation window … workstream = the durable stateful owner of ongoing work … run = one execution instance against a specific plan revision …"
4. (§6.6) "context engine != source of truth"
5. (§9) "the workstream stays singular / the projections multiply"
6. (§11.4) "most interaction is evidence / only typed control changes governance or progression"
7. (§14) "context engine = compiler for work-ready context"
8. (§14.5) "persist authoritative refs / compile minimal sufficient packs / do not persist one giant opaque context blob as truth"
9. (§15) "a workstream may adapt across revisions / a run is pinned to one revision"
10. (§15.6) "no silent mid-run mutation of the revision being executed"
11. (§17.4) "comments default to evidence or discussion / only explicit typed actions become control events"
12. (§21.1) "tension does not have to jump directly to RFD / it may first open or advance a workstream"
13. (§23.1) "the workstream is a service boundary because it owns durable semantic truth"
14. (§26) "projects and workstreams are orthogonal / link them many-to-many / do not force one hierarchy into the core execution model"
15. (§33) "sessions are ephemeral / threads are conversational / workflows execute / worktrees provide mutable workspace / workstreams own ongoing work"

## Estimated completeness grade (initial impression)

**Grade: A.** The spec is internally complete for its declared scope: a sharp ontology, falsifiable acceptance criteria (§29), exhaustive invariants and forbidden-pattern catalogs, typed input/control/event models, plan-revision-and-run discipline, a fully framed context engine, projection rules, and a clean RAWR integration map. Out-of-scope items are explicit and reasonable (storage, vendor adapters, workflow engine impl, project tracker mapping). Its restraint about runtime semantics is intentional and matches the shape-correct role. Genuine open frontier ("don't own, still manage") is the project-tracker and Git-host integration boundary, which is correctly delegated to integration-layer specs that this document declines to absorb.
