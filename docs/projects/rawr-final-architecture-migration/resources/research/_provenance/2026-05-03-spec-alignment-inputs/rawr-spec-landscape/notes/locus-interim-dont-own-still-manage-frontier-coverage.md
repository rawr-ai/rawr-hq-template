---
title: Locus interim — dont-own-still-manage-frontier-coverage
id: locus-interim-dont-own-still-manage-frontier-coverage
tags:
- rawr-spec-landscape
- locus-dont-own-still-manage-frontier-coverage
- runtime-canon-arch-align
created: '2026-05-01T20:51:22.546352Z'
updated: '2026-05-01T21:10:16.661975Z'
status: draft
type: interim
tier: institutional
deprecated: false
---

# Interim report: dont-own-still-manage-frontier-coverage

**Locus question:** Across the thirteen specs, where is integration-point ownership crisply named vs. silently leaning on a vendor — and which silences are conscious deferrals (cleanly bookmarked) vs. coverage gaps that the landscape map should flag as 'addressed only at the policy layer, not at the integration-law layer'?
**Flavor:** synthesis

---

## What the corpus already said

The eight must-read source analyses collectively establish that RAWR operates a consistent "don't-own-still-manage" posture across vendor integrations, but with wildly uneven integration-point specificity. The authoritative runtime spec [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] names the execution-ownership law explicitly: "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering." The service-package spec [[rawr-service-package-effect-vendor-integration-shape-reference]] provides a ten-rule gold-standard checklist that operationalizes this law for the oRPC × Effect triad. Auth [[rawr-authentication-subsystem-spec-analysis]] and Deployment [[rawr-deployment-subsystem-spec-analysis]] exhibit the same discipline — each names its vendor seams, integration-point owners, and reserved items with fixed owners. By contrast, Factory Bundle Export [[rawr-factory-bundle-export-spec-analysis]], Async Runtime [[rawr-async-runtime-spec-analysis]], Authoring Classifier [[rawr-authoring-classifier-system-spec-analysis]], and Workstream Review [[rawr-workstream-review-subsystem-spec-analysis]] each contain silences that are not bookmarked — the spec leans on a vendor's capability without naming the integration-point owner, the credential/key management posture, or the schema/protocol that RAWR must own even though it doesn't own the vendor.

---

## What the new sources say

This investigation is corpus-only (no new fetches needed — the eight must-read notes are dense and directly answer the locus). The locus is fully answerable from the vault.

---

## Evidence synthesis

### The gold standard: Service-Package-Effect's 10-rule descriptor-first checklist

The service-package spec [[rawr-service-package-effect-vendor-integration-shape-reference]] articulates the canonical benchmark for all vendor integrations. Condensed as ten laws:

1. **Identify zone of strength** — pick exactly what the vendor is best in the world at.
2. **Author native inside that zone** — service code reads like the vendor's docs.
3. **Wrap the import surface** — re-export native types from `@rawr/sdk/<vendor>`; omit lifecycle authority.
4. **Forbid lifecycle authority in authoring** — no vendor-runtime construction in services/plugins/apps.
5. **Compile to descriptors, not to vendor calls** — authoring produces declarative descriptors; runtime lowers them.
6. **One canonical terminal per execution mode** — explicit, named facades (`.handler` vs `.effect`; `.promise` vs `.effect` clients).
7. **Boundary errors = vendor's contract; internal errors = diagnostics by default** — map failure channels explicitly.
8. **Telemetry split** — runtime owns lifecycle/correlation telemetry; vendor authoring owns semantic span enrichment; product analytics is explicit.
9. **Cross-service collaboration goes through bound clients, not vendor primitives.**
10. **Type/import/runtime gates** — static enforcement in CI, not just convention.

Every integration-point rating below measures against this checklist. A spec earns Grade A if it satisfies all ten; Grade B if it covers the integration posture (rules 1–5) but is thin on enforcement/error-bridge (rules 6–10); Grade C if it names the vendor and defers integration-point ownership without any integration law; Grade D if it leans on a vendor silently.

---

### Per-concern rating table

| Concern | Vendor named? | Integration-point owner named? | Policy-only or integration-law? | Grade | Rationale |
|---|---|---|---|---|---|
| API management / oRPC | Yes — oRPC named with precision | Yes — RAWR owns descriptor-first posture, lane lowering, error bridge, import containment | Integration-law | **A** | Runtime spec §1 names the execution-ownership law; service-package spec gives 10-rule checklist, static gates, descriptor-first compile target, error bridge rule, client facades. The integration seam is fully specified from authoring to invocation. |
| Runtime concurrency / Effect | Yes — Effect named with precision | Yes — RAWR owns single ManagedRuntimeHandle, `ProcessExecutionRuntime` as sole invocation path, raw-Effect-import ban, forbidden detached fibers | Integration-law | **A** | Runtime spec §3.3 ownership matrix, §5 raw-effect-import-ban, §18.4 ProcessExecutionRuntime rules. Forbidden patterns are enumerated. Service-package spec adds curated Effect subset, forbidden namespace list. Bootgraph owns rollback/finalization. |
| Durable orchestration / Inngest | Yes — Inngest named as primary | Yes — RAWR owns WorkflowDispatcher, async lowering chain, FunctionBundle, defineAsyncStepEffect, step-local descriptors; Inngest owns retry/replay/history | Integration-law (core RAWR side) + Gap (event/schema/signing side) | **B** | Runtime spec §19, §12.7 establish the RAWR → Inngest seam cleanly. Async Runtime spec [[rawr-async-runtime-spec-analysis]] confirms `connect` worker posture. BUT: event-key/signing-key rotation, event-auth (who may emit which event from server role), idempotency-key conventions, schema evolution of event payloads, and dead-letter/poison-event handling beyond Inngest defaults are all silences with no integration-point owner named. The four-point constraint (connect, mode-invariant, no-second-queue, single-control-plane) is law; the event interface disciplines are gaps. |
| Auth / IdP | No specific IdP named (deliberate) | Yes — RAWR owns AuthVerifierResource contract, provider families, VerifiedPrincipal shape, surface admission split, invocation carriage, async ActorSnapshot | Integration-law | **A** | Auth spec [[rawr-authentication-subsystem-spec-analysis]] is "the strongest example of don't-own-still-manage discipline in the corpus." The §26 final-rule is a nine-verb integration law. Named provider families (jwt-jwks, opaque-token, session-cookie, api-key, github-app, gateway, dev-user, test-principal) are abstract but the ownership at each seam is explicit. Token library silence is a conscious deferral to profile-level. |
| Deployment target / Railway + Railpack | Yes — Railway and Railpack named with precision | Yes — RAWR owns DeploymentPlan as source of truth, placement bindings, build strategy refs, source-change policy, env/secret/resource binding refs, generated artifacts; Railway owns supervision | Integration-law | **A** | Deployment spec [[rawr-deployment-subsystem-spec-analysis]] §18.1: "Railway does not decide app membership, role composition, process-shape identity, or provider selection." Ten reserved seams with named owners. The spec's §30 is a clean reserved-detail boundary table, not a gap list. |
| Code sandbox / MAWE providers | Partial — Managed Agent Workspace Execution spec exists but is not a must-read; provider families not named from corpus notes | Not named from must-read corpus | Policy-only | **C** | The corpus notes reference MAWE [[rawr-managed-agent-workspace-execution-spec-analysis]] obliquely; the classifier spec names `exportable-capability` as an intent class that hooks the foundry model. But none of the must-read notes name sandbox provider families, execution isolation mechanics, or RAWR's integration-point ownership over code sandbox invocation. The concern is mentioned by name but unanalyzed at the integration-law level in the notes in scope. |
| Registry + signing for bundles | Not named | Not named | Neither — fully absent | **D** | Factory Bundle Export spec [[rawr-factory-bundle-export-spec-analysis]] explicitly acknowledges: "No registry/hosting story. No signing/integrity story. No version negotiation/compatibility story. No transport/fetch semantics." `ArtifactRef` is a typed alias for `string` with no resolution protocol. The spec calls these the "natural seam where Deployment Subsystem, Habitat SDK Layers, and any future 'registry/signing' spec would have to land." This is a coverage gap, not a conscious deferral with a named owner. |
| Observability vendor / HyperDX | Named in runtime spec (OTel bootstrap via `logger.openTelemetry`, standard providers); HyperDX not named explicitly | Partial — `RuntimeTelemetry` interface shape, telemetry chain order, label policy, and layering (runtime / service semantic / product analytics) are owned by RAWR | Integration-law (layering) + Gap (backend binding, HyperDX-specific config) | **B** | Runtime spec names `RuntimeTelemetry` as the correlation boundary. Service-package spec rule 8 ("telemetry split") is explicit. But Async Runtime spec notes "no observability/telemetry binding (HyperDX or otherwise) for Inngest run traces — surprising omission given Inngest already has tracing." HyperDX product analytics layer is not explicitly bound to a resource/provider shape in any corpus note. The telemetry *architecture* is law; the telemetry *backend binding* to HyperDX is a gap. |
| Classifier LLM call | Not named | Not named | Policy-only (contract shape exists; integration mechanism unowned) | **C** | Authoring Classifier spec [[rawr-authoring-classifier-system-spec-analysis]] explicitly disowns: "a single LLM provider for intent parsing / the exact prompt / the exact scoring model." The spec describes an IntentParse contract shape but the runtime authority for that callable (credentials, rate limits, fallback, retry) is unspecified. Classification is called "may use an LLM. It may use deterministic extraction." The integration-point is a black box callable. No resource/provider/profile integration; no import facade; no error bridge to the RAWR error model. This is a coverage gap. |
| Durable event bus | Inngest named as durable signal plane; event envelope shapes in Async Runtime spec | Partial — bus existence and connect worker posture is law; event-name registry, schema, signing, auth-on-emit are gaps | Policy-only (bus selection) + Gap (event interface) | **C** | Workstream Review spec [[rawr-workstream-review-subsystem-spec-analysis]] names ~16 event kinds implying a durable event bus/outbox but does not bind them to a runtime primitive. Async Runtime spec names Inngest as the durable signal plane but has no event-name registry, signing model, or auth-on-emit rule. Factory Bundle Export spec [[rawr-factory-bundle-export-spec-analysis]] uses a typed event envelope in Appendix A but does not specify how events are routed, signed, or authenticated. |
| Idempotency / dead-letter | Not named in any must-read note | Not named | Not addressed | **D** | Async Runtime spec notes this explicitly: "no idempotency-key conventions / no story for dead-letter/poison-event handling beyond Inngest defaults." This is not a reserved-detail boundary with a named owner; it is simply absent. No spec in the must-read corpus defines what RAWR owns at the idempotency-key authoring boundary, how dead-letter queues are modeled, or what the re-queue policy is. Given that Inngest owns durability, the integration-point question is: what does RAWR own to make idempotent event emission safe? That question is unanswered. |

---

### Classification of silences

| Silence | Classification | Rationale |
|---|---|---|
| Token library selection (jose vs oslo vs node-jose) | Conscious deferral | Auth spec explicitly defers to profile-level; provider families are abstract; this is by-design. |
| Specific IdP (Auth0, Clerk, Keycloak) | Conscious deferral | Auth spec explicitly out-of-scope; vendor selection is profile-level. Named reservation in §1 non-goals. |
| Railway/Railpack specific API automation | Conscious deferral | Deployment spec §30 named reserved seam with fixed owner. |
| Blue/green/canary rollout | Conscious deferral | Deployment spec §30 explicitly names it as reserved; "rollout semantics become product-visible" is the trigger. |
| Registry + bundle signing | Coverage gap | Factory Bundle Export spec acknowledges the absence but does NOT name a fixed owner or trigger condition for the reserved spec. No integration-law exists. |
| Inngest event-key / signing-key rotation | Coverage gap | Async Runtime spec notes this as a "hand-wave on" — not a named reservation; no fixed owner, no integration-point spec exists. |
| Auth-on-emit (who may emit which Inngest event) | Coverage gap | Async Runtime spec acknowledges the concern but neither it nor the Auth spec names the integration-point owner. The server → async event boundary is unowned. |
| Idempotency-key conventions | Coverage gap | Not present in any spec. Inngest owns step durability but RAWR owns event emission; the ownership at the key-authoring boundary is absent. |
| Dead-letter / poison-event handling | Coverage gap | Async Runtime spec names this as a gap. No fixed owner, no integration-law, not a named reserved boundary. |
| Classifier LLM call integration | Coverage gap | Authoring Classifier spec explicitly disowns but does NOT name a dedicated spec or future service as owner. The runtime authority for the callable is an open hole. |
| HyperDX backend binding / Inngest trace binding | Coverage gap | Runtime spec names OTel layering but HyperDX as a named backend is absent from the integration-law layer. Async Runtime spec specifically calls out the missing Inngest trace binding. |
| Durable event bus event-name registry + schema | Coverage gap | Workstream Review and Async Runtime specs both imply a durable event bus but neither names RAWR's integration-point ownership over event names, schemas, or protocol. |
| Managed Agent Workspace Execution / code sandbox providers | Out-of-scope by design (for this locus) | MAWE spec exists and was not a must-read; the corpus notes reference it obliquely. This is a scope limitation of this investigation, not necessarily a gap in the spec. |

---

## Committed position

The RAWR spec landscape shows **two-tier integration-point ownership maturity**: the core mechanical layer (Effect runtime, oRPC API management, auth, deployment) has reached integration-law grade — all ten descriptor-first rules are satisfied, vendor seams are owned by RAWR, forbidden patterns are enumerated, and even reserved items carry named owners. The coordination / durable-async layer (Inngest-backed durable bus, async event interface, idempotency, dead-letter) and the authoring-time intelligence layer (classifier LLM call) have reached only policy-layer grade — RAWR names the vendor, makes a high-level ownership claim, and then falls silent on the integration disciplines that actually prevent failure at the seam. The three gaps that the landscape map must flag as "addressed only at the policy layer, not at the integration-law layer" are: **(1) the Inngest event interface** (event auth, signing, schema registry, idempotency-key conventions, dead-letter policy) — Inngest is named as owner of durability but RAWR's ownership at the event-emission boundary is unspecified; **(2) the classifier LLM call** — no resource/provider/profile integration, no import facade, no error bridge, no credential/rate-limit owner; and **(3) bundle registry and signing** — `ArtifactRef` is a bare string and no integration-law exists for how bundles are addressed, transported, or verified. The silences in Auth (token library) and Deployment (rollout mechanics) are conscious deferrals with named owners and trigger conditions; they do not need to be flagged. The silences in Async Runtime, Authoring Classifier, and Factory Bundle Export are coverage gaps — the spec leans on a vendor or mechanism without owning the seam, and no reserved-boundary record exists to prevent these gaps from compounding.

**Position:** The RAWR spec landscape has gold-standard integration-point ownership at the core mechanical layer (Effect, oRPC, auth, deployment — all Grade A) and a systematic gap at the durable-async event interface, classifier AI call, and bundle registry/signing seams, which are addressed only at the policy layer and represent real integration-law debt.

**Confidence:** High (>80%) — the rating is based on direct textual evidence from eight spec analysis notes, each explicitly naming what it owns and what it defers. The gap claims are drawn from explicit acknowledgements within the specs themselves, not inferred absence.

**Boundary conditions:** This position holds for the thirteen specs in their current form. It does not account for the MAWE spec (not in must-read corpus for this locus), which may partially address code-sandbox integration. The conclusion applies to integration-law completeness as of the spec corpus, not to codebase implementation.

**What would change this position:** If the Async Runtime spec or a companion spec names RAWR's integration-point ownership for event signing, idempotency-key conventions, and dead-letter policy with the same precision as the Runtime spec's WorkflowDispatcher section, the Inngest event interface gap would close to a conscious deferral. If the Authoring Classifier spec earns a `services/authoring-plans` service spec with a `LLMProviderResource` carrying the same resource/provider/profile structure as `AuthVerifierResource`, the classifier LLM gap would close. If the Factory Bundle Export spec adds a `CapabilityRegistry` spec with a signing model (sigstore/cosign-shaped) and a resolution protocol, the bundle gap would close.

**Evidence weight:** 4 specs at Grade A (Effect runtime, oRPC, Auth, Deployment) — full integration-law with enforcement; 2 specs at Grade B (Inngest durable orchestration core, HyperDX observability layering) — integration posture established but event-interface/backend-binding disciplines missing; 3 concerns at Grade C (MAWE code sandbox, classifier LLM call, durable event bus) — policy-only, vendor named but integration mechanism unowned; 2 concerns at Grade D (bundle registry/signing, idempotency/dead-letter) — fully absent, no law, no deferral record.

---

## Open questions

- Does the MAWE spec cover code-sandbox provider integration (resource/provider/profile shape)? If yes, the Grade C for that concern upgrades.
- Does the Habitat SDK Layers spec contain the registry/signing story for bundles? The Factory Bundle Export spec suggests it "would have to land" there.
- Is there a forthcoming "event schema registry" spec or Async Runtime companion that closes the Inngest event interface gap?
- Does the Workstream System spec name the durable event bus integration more explicitly than the Workstream Review spec's gestures at ~16 event kinds?
- The Authoring Classifier spec mentions a future `services/authoring-plans` service — has that been drafted anywhere in the corpus?

---

## Sources

1. [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] — RAWR Effect Runtime Realization System spec analysis (authoritative)
2. [[rawr-service-package-effect-vendor-integration-shape-reference]] — RAWR Service Package Effect — vendor-integration shape reference (gold standard)
3. [[rawr-authentication-subsystem-spec-analysis]] — RAWR Authentication Subsystem spec analysis
4. [[rawr-deployment-subsystem-spec-analysis]] — RAWR Deployment Subsystem spec analysis
5. [[rawr-factory-bundle-export-spec-analysis]] — RAWR Factory Bundle Export spec analysis
6. [[rawr-authoring-classifier-system-spec-analysis]] — RAWR Authoring Classifier System spec analysis
7. [[rawr-async-runtime-spec-analysis]] — RAWR Async Runtime spec analysis
8. [[rawr-workstream-review-subsystem-spec-analysis]] — RAWR Workstream Review Subsystem spec analysis
