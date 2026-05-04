---
title: RAWR Authoring Classifier System — spec analysis
id: rawr-authoring-classifier-system-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:35:15.553870Z'
updated: '2026-05-01T21:10:17.869901Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Authoring_Classifier_System_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Authoring_Classifier_System_Canonical_Spec.md
- runtime_authority: no

## Scope and purpose

This spec defines the canonical "Intent, Authoring, and Capability Realization Classifier System" for RAWR. It owns the front-end of the authoring pipeline: turning a human/business request into a typed, narrowed, generator-ready capability realization plan that downstream RAWR machinery (SDK derivation, runtime compiler, generators, harnesses) can consume without re-discovering the RAWR ontology each time. It is explicitly upstream of code generation and runtime realization. It is non-authoritative on runtime behavior and explicitly defers durable coordination to the workstream system, runtime semantics to the canonical Effect Runtime Realization spec, app composition to apps via `defineApp(...)`, and provisioning to the runtime provisioning kernel. It separates intent classification (business meaning) from operational classification (RAWR ontology placement) and treats the classifier as a narrowing engine — not a generator, not a runtime, not a service.

## Concern coverage

- Intent parsing (LLM- or deterministic-based fact extraction; explicitly does not assign RAWR ownership)
- Intent classification (canonical intent class taxonomy: `data-capture`, `domain-state`, `analytics-read-model`, `workflow-automation`, `schedule-automation`, `event-consumption`, `surface-dashboard`, `surface-api`, `surface-agent-tool`, `surface-cli`, `integration-client`, `notification-output`, `governed-implementation`, `exportable-capability`)
- Capability decomposition into candidate kinds (`semantic-capability`, `projection-only-capability`, `support-capability`, `runtime-capability`, `app-composition-change`, `workflow-capability`, `read-model-capability`, `external-integration-capability`)
- Operational classification (truth ownership, projection lanes, resource needs, provider needs, auth posture, app/profile/entrypoint impact, generator targets, verification gates, rejected alternatives)
- Ontology rule packs with enforcement consequences (rule classes: `ownership`, `projection`, `resource`, `provider`, `auth`, `app-selection`, `process`, `generator`, `verification`, `forbidden-pattern`)
- Constraint graph and monotone narrowing law
- Auth classification vertical (trust boundary, caller kind, actor kind, credential kind, verifier resource, surface admission owner, actor mapping owner, domain authorization owner, async authority continuity)
- Persistence/data-ownership classification (shared dbPool allowed; shared write ownership rejected; service-owned migrations required)
- Async classification vertical (schedules, workflows, consumers, dispatcher needs, ambient request auth forbidden)
- Surface classification (web app, server api, server internal, async, cli, agent tools, agent shell/channels, desktop menubar/windows/background)
- Generator recipe emission and Nx generator family catalog (`@rawr/nx:service`, `:resource`, `:provider`, `:plugin-server-api`, `:plugin-async-workflow`, `:plugin-async-schedule`, `:plugin-async-consumer`, `:plugin-web-app`, `:plugin-cli-command`, `:plugin-agent-tool`, `:plugin-desktop-*`, `:app-membership`, `:runtime-profile-provider-selection`, `:verification-gates`, `:capability-doc`)
- Plan validation (ownership closure, provider selection visibility, auth posture completeness, generator dependency ordering, forbidden pattern rejection)
- Implementation packet handoff (generated artifacts, business logic tasks, verification tasks, handoff notes)
- Workstream integration (artifact attachment under `classification/*.json`)
- CLI surface (`rawr classify intent|capabilities|operational`, `rawr plan explain|validate|emit-generators|generate|implementation-packet`)
- MCP tool surface (`rawr.intent.parse`, `rawr.intent.classify`, `rawr.capabilities.*`, `rawr.plan.*`)
- Verification plan emission (static, generator, SDK derivation, runtime compiler, auth, service, plugin, workflow, e2e, diagnostics)
- Metrics taxonomy (token reduction, invalid plan rate, provider coverage gaps, auth posture omission rate)
- Forbidden patterns (classifier-as-truth, intent-to-folder shortcut, dashboard-only for domain state, workflow-as-public-api, service reads raw auth, internal-means-unauthenticated, shared-repository-root, agent-tool-bypass, service-selects-provider, decorative rules)
- End-to-end "Revenue Operations Command Center" worked example (request → frame → parse → intent classes → decomposition → ownership → projections → resources → auth → generator recipe → topology → business logic tasks → verification → launch → observation)

## Platform-level signal

Primarily **Cross-cutting / Authoring-time governance**, with strong tendrils into **Coordination** (it is the choreography between human request and the RAWR operational ontology). It is *not* runtime realization and not durable coordination. It sits at the **authoring lifecycle / governance** seam: pre-runtime, post-request. It complements the workstream system (which owns durable coordination of authoring work) and the canonical Effect Runtime Realization spec (which owns runtime). It is the "narrowing engine" before the SDK derivation phase. If the platform model is Core Runtime / Coordination / Governance, this spec is the **Governance** layer's mechanical implementation: it encodes canonical RAWR law as enforceable rule packs and routes capability decisions through them. Its physical location is `packages/core/authoring-classifier` plus generator packages plus CLI/agent/internal-server plugin projections.

## Vendor integrations declared

The spec is deliberately vendor-agnostic on most axes — that is one of its design tenets. Concrete vendor mentions:

- **Nx generators** (first-class): the entire generator recipe catalog is named `@rawr/nx:*`. Generator lowering is implemented as Nx generators. This is the strongest vendor coupling.
- **LLM provider for intent parsing**: spec explicitly names this as out of scope ("It does not fix: a single LLM provider for intent parsing"). The parser "may use an LLM. It may use deterministic extraction."
- **Inngest**: surfaces as `resources/inngest` and `rawr.inngest` — the async harness/resource that schedules and workflows depend on. Provider selection is explicit (e.g., `inngest.cloud`).
- **Postgres / SQL**: surfaces as `rawr.sql.pool` resource with provider selection (`sql.postgres`).
- **JWT/JWKS auth verifier**: surfaces as `rawr.auth.verifier` resource with example provider `auth-verifier.jwt-jwks`.
- **CRM (Hubspot, Salesforce)**: surfaces as `rawr.crm.client` resource with provider families `hubspot`, `salesforce`, `mock-dev` — used as illustrative end-to-end example, not a baked-in dependency.
- **Email/notification**: mentioned as a resource family but explicitly deferred ("notification provider resource ... if not already selected").
- **Workstream system**: declared as the durable coordination owner; classifier attaches artifacts there.
- **Effect, oRPC, Bun, Elysia, Drizzle, HyperDX**: NOT named in this spec. The classifier abstracts over them through the resource/provider/profile model and the runtime compiler. This is a deliberate "stand on shoulders of giants but never name them at the classifier layer" posture.

The "stand on shoulders of giants" pattern is implicit: vendors are pushed into the resource+provider seam (where they are selected by app runtime profiles), and the classifier owns only the ontology of "you need a provider here, and the profile must select one." The classifier never picks a provider.

## Don't-own-still-manage frontier

This is where the spec's "shape-correct, non-authoritative on runtime" posture is strongest and where the silences are most informative.

- **LLM provider for intent parsing**: explicitly disowned ("It does not fix: a single LLM provider for intent parsing... the exact prompt used for natural-language extraction... the exact scoring model used for ambiguous classification"). The classifier *manages* the IntentParse contract shape but does not own the model, prompt, scoring, or vendor. **Silence**: no integration-point ownership story for LLM credentials, rate limits, fallback, or retry — it is treated as a black-box callable. The runtime authority for that callable is unspecified.
- **Storage of classification records**: explicitly deferred ("the final storage backend for classification records"). Currently parked as workstream artifacts; "a future `services/authoring-plans` service may be earned only if classification records acquire durable semantic truth." **Silence**: how artifact storage interacts with the runtime spec's durability model is not described.
- **Provider selection truth**: explicitly disowned. The classifier *predicts* provider needs but app runtime profiles select. The integration point is the `runtime-profile-provider-selection` generator — that is the seam.
- **Runtime compiler validity**: explicitly disowned. The classifier may *predict* runtime compiler findings but "may not suppress them." The integration point is the verification plan's `runtimeCompilerChecks` array.
- **Durable orchestration (Inngest)**: the classifier names `rawr.inngest` as a resource and emits async workflow/schedule/consumer plugins, but defers all durable execution semantics to the runtime spec and the workflow harness. **Silence**: no ownership of step replay, retry, idempotency keys, or durable state — it is delegated to async plugins and the harness.
- **Auth verifier crypto/network behavior**: classifier emits the verifier resource requirement and provider selection requirement but disowns the verification mechanism itself.
- **Workstream coordination**: explicitly "not classifier truth" — workstream owns durable coordination, classifier attaches artifacts.
- **App composition truth**: classifier emits an `AppSelectionPlan` but apps own membership through `defineApp(...)`. The generator `app-membership` edits the file.
- **Domain semantic truth**: services own; "Generators must not pretend domain policy is complete unless it was explicitly authored and verified."

The pattern is consistent: **the classifier owns the contract shape and the integration-point requirements, but never the integration mechanism**. Where this leans hardest on inferred runtime/storage/AI vendor without explicit ownership: (1) the LLM call itself, (2) classification record storage durability, (3) the scoring/confidence model.

## Completeness signals

Explicit deferrals (Section 1, "It does not fix"):
- single LLM provider for intent parsing
- exact prompt for NL extraction
- exact scoring model for ambiguous classification
- final storage backend for classification records
- every generator option name
- every future vertical classifier
- every possible business-domain intent class
- UI for reviewing plans
- exact benchmark suite for token reduction and invalid-generation reduction
- export-mode retargeting beyond integration seam

Explicit "likely-to-change" surface (Section 30, refinement seams table):
- Exact CLI spelling
- Exact MCP operation names
- Scoring/confidence model
- Rule expression language
- Generator option names
- Storage of classification records ("may remain workstream artifacts or earn a service")
- Benchmark formulas
- Target-profile/export integration
- UI plan review

"Locked foundations" (also Section 30):
- intent != operational classification
- classifier narrows, generators scaffold, runtime validates
- rule packs must have enforcement consequences
- ownership precedes projection precedes app selection
- resources/providers/profiles remain separate
- auth remains vertical and uncollapsed
- workstreams coordinate
- generators lower plans but do not own truth

Cross-spec dependency hints that the spec leans on but does not duplicate:
- "canonical RAWR architecture and runtime specifications" (Section 4) — does not reopen the ontology
- "auth subsystem's placement of verifier, provider, profile, plugin policy, invocation actor, service authorization, async authority, and diagnostics"
- "workstream model's separation between durable coordination, threads, sessions, runs, workflows, and artifacts"
- "foundry model's separation between native-mode capability authoring and export-mode retargeting"

The intent class list is "intentionally not complete. It is the first locked intent surface." Future classes are allowed when they change downstream consequences.

The spec carries no `TBD`/`TODO` strings but has many `Exactness: illustrative` markers on TypeScript shapes — meaning field intent is normative but exact spelling is not. This is a design choice, not a gap.

The spec is **authoritative-feeling** on the spine (laws, separations, forbidden patterns, decision order, ontology nouns, lifecycle phases) and **exploratory-feeling** on (LLM integration, scoring, storage, benchmark, UI, export retargeting, exact rule expression syntax).

## Cross-spec dependencies

References / defers to:
- RAWR canonical architecture spec (top-level ontology, repo roots, ownership law)
- RAWR Effect Runtime Realization System spec (runtime lifecycle: definition → selection → derivation → compilation → provisioning → mounting → observation; runtime compiler; SDK derivation)
- RAWR Auth Subsystem spec (verifier, provider, profile, plugin policy, invocation actor, service authorization, async authority continuity, diagnostics)
- RAWR Workstream System spec (durable coordination, threads, sessions, runs, workflows, artifacts; classifier attaches `classification/*.json` artifacts here)
- RAWR Async Runtime spec (durable execution semantics; async plugin lanes)
- RAWR Foundry/Factory Bundle Export spec (native-mode capability authoring vs export-mode retargeting; "exportable-capability" intent class hooks here)
- Future `services/authoring-plans` service (refinement seam, not yet earned)

This spec is upstream of and feeds: SDK derivation, runtime compilation, app membership, runtime profile provider selection, verification gates.

## Verbatim load-bearing definitions / claims

1. (Section 2, canonical thesis) — `intent classification understands what is being asked / operational classification decides where it belongs / rule packs narrow the legal geometry / generators write the skeleton / services own the business truth / plugins project / apps select / the SDK derives / the runtime realizes / diagnostics observe`

2. (Section 2, core invariant) — `human request does not directly imply folders / intent does not directly imply generators / classification does not directly imply service truth / generator output does not directly imply runtime validity / runtime validity does not directly imply business correctness`

3. (Section 4, authoring law) — `The classifier narrows. / Generators scaffold. / Implementers fill truth. / Validators reject illegal realization.`

4. (Section 1, purpose) — "The subsystem exists to turn human business requests into typed, constrained, generator-ready capability realization plans without letting the agent rediscover the RAWR ontology every time it works."

5. (Section 1) — "The classifier proposes typed authoring plans. The SDK derives. The runtime compiler validates. Generators write skeletons. Humans or stewards fill business logic. Runtime realization still owns the transition from selected declarations to one running process."

6. (Section 7.4) — "A generated app membership edit or plugin skeleton must still pass SDK derivation and runtime compiler validation. The classifier may predict runtime compiler findings. It may not suppress them."

7. (Section 7.7) — "A classifier may be highly confident and still be rejected by a plan validator, generator, SDK derivation, runtime compiler, gate, or human review."

8. (Section 7.10) — "Reducing model tokens is a benefit, not the primary law. The classifier must reduce ambiguity while preserving canonical ownership. A shorter illegal path is worse than a longer legal one."

9. (Section 15.4, rule admissibility law) — `Do not add a classifier category or rule unless it changes: ownership, allowed dependencies, generated files, required schemas, resource/provider requirements, auth/trust posture, process/runtime shape, verification gates, or diagnostics.`

10. (Section 16.4, false ontology guard) — `A visible category is false ontology if it does not correspond to a real enforcement boundary. The classifier must reject false ontology as a planning basis.`

11. (Section 27.9, forbidden) — "Services must not select provider implementations."

12. (Section 27.5, forbidden) — "A service must not read raw headers, cookies, API keys, gateway assertions, or workflow credential material as domain facts."

13. (Section 23.3, business logic rule) — `Generators may create skeletons. / Generators may create safe defaults. / Generators may create failing tests. / Generators must not pretend domain policy is complete unless it was explicitly authored and verified.`

14. (Section 9, repository topology) — classifier subsystem lives at `packages/core/authoring-classifier/` with sibling `packages/core/nx-generators/`; "Durable classification records are stored as artifacts in the workstream system by default."

15. (Section 31, one-line summary) — "The classifier turns open-ended capability requests into narrowed, typed, generator-ready RAWR plans while preserving every canonical ownership boundary downstream."

## Estimated completeness grade (initial impression)

**A-** — The spec is unusually thorough on its claimed scope: it locks the spine (laws, separations, decision order, ontology, forbidden patterns), provides a complete worked end-to-end example, names every adjacent canonical spec it leans on, and is explicit about every deferral. The only reasons it is not a clean A: (1) the LLM integration story is a black box with no integration-point ownership for credentials/rate limits/fallback, (2) the classification-record storage story is explicitly parked at "workstream artifact today, maybe a service later," and (3) the rule expression language and scoring model are deferred to implementation pressure. None of these are fatal — they are explicitly named refinement seams — but they leave the classifier under-tested as an executable system.
