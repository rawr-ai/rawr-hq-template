---
title: Locus interim — operational-substrate-gaps
id: locus-interim-operational-substrate-gaps
tags:
- rawr-spec-landscape
- locus-operational-substrate-gaps
- runtime-canon-arch-align
created: '2026-05-01T20:50:52.527332Z'
updated: '2026-05-01T21:10:16.418609Z'
status: draft
type: interim
tier: institutional
deprecated: false
---

# Interim report: operational-substrate-gaps

**Locus question:** Where in the corpus are real-world operational substrate concerns silent or thin: registry hosting, signing/attestation, transport/fetch, bundle-version compatibility, idempotency conventions, dead-letter handling, observability vendor binding, multi-tenant isolation specifics, secrets manager binding, testing-discipline reference, MFA/step-up, refresh-token rotation, JIT user provisioning, profile→manifest mapping detail, cost/budget enforcement, multi-agent handoff semantics?
**Flavor:** synthesis

---

## What the corpus already said

The seven spec-analysis notes provide a rich but uneven picture of operational substrate coverage. The Factory Bundle Export spec [[rawr-factory-bundle-export-spec-analysis]] explicitly lists its own omissions: "signing, registry hosting, package-format byte layout, immutability storage, transport security, key management, semver/version negotiation across bundle revisions, GC of stale bundles, supply-chain attestation specifics." The Async Runtime spec [[rawr-async-runtime-spec-analysis]] surfaces silences on idempotency-key conventions, dead-letter/poison-event handling, event-key/signing-key rotation, schema evolution across modes, and auth-on-emit. The Authentication spec [[rawr-authentication-subsystem-spec-analysis]] is the strongest of the seven on coverage but is explicitly thin on MFA/step-up, sign-up/account-creation lifecycle, refresh-token rotation, JIT user provisioning from external IdPs, and cross-tenant federation. The Deployment spec [[rawr-deployment-subsystem-spec-analysis]] names its reserved seams (registry authentication, secret manager vendor, blue/green/canary rollout, release promotion) in a dedicated §30 section titled "Reserved detail boundaries." The Managed Agent Workspace spec [[rawr-managed-agent-workspace-execution-spec-analysis]] flags cost/budget enforcement, provider observability propagation (OTel/HyperDX across the boundary), and multi-agent handoff semantics as implicit or unspecified. The Workstream Review spec [[rawr-workstream-review-subsystem-spec-analysis]] defers scoring/rubric details, the human-approval product surface, and the comment-thread-to-review-event projector. The Authoring Classifier spec [[rawr-authoring-classifier-system-spec-analysis]] explicitly parks LLM provider credentials/rate-limit/fallback, classification-record storage durability, and the rule expression language as refinement seams.

## What the new sources say

No external sources were fetched for this locus. The locus is a synthesis task over the seven corpus notes — the gaps enumerated above are directly documented in those notes' "Completeness signals," "Don't-own-still-manage frontier," and "Silences" sections. All evidence below comes from those documents.

## Evidence synthesis

### Per-concern rating table

| Operational substrate concern | Spec(s) that touch it | Depth | Classification | Recommended next step |
|---|---|---|---|---|
| Registry hosting / image distribution | Deployment [[rawr-deployment-subsystem-spec-analysis]] | policy-only — "generic OCI / registries (e.g. ghcr.io)" named as a target but registry auth is a reserved seam | Conscious deferral — §30 names "registry authentication" as a fixed reserved seam | Specify registry auth adapter: credential source (Vault/env), token refresh lifecycle, multi-registry support |
| Signing / attestation / supply-chain | Factory Bundle Export [[rawr-factory-bundle-export-spec-analysis]] | silent — "signing, supply-chain attestation specifics" explicitly listed as out of scope | Real gap — bundle provenance is described but cryptographic signing is not modeled at all | Design a signing/attestation seam on `CapabilityBundle` (cosign / sigstore style); spec the verifier harness for consumers |
| Transport / fetch semantics | Factory Bundle Export, Deployment | silent — `ArtifactRef` is opaque; transport security not modeled | Real gap — no spec owns fetch-time security, TLS pinning, integrity check, or retargeter pull protocol | Add a transport security contract to the Bundle Export spec: fetch protocol, integrity verification, TLS posture |
| Bundle-version compatibility / semver negotiation | Factory Bundle Export [[rawr-factory-bundle-export-spec-analysis]] | silent — "semver/version negotiation across bundle revisions, GC of stale bundles" explicitly listed as not covered | Real gap — no compatibility matrix, no deprecation signal, no consumer version pinning story | Introduce `CapabilityBundle` semver contract and a compatibility policy (min-version, max-version, breaking-change annotation) |
| Idempotency conventions | Async Runtime [[rawr-async-runtime-spec-analysis]] | silent — "idempotency-key authoring conventions for steward activation events" identified as a "don't-own-still-manage" integration silence | Real gap — Inngest provides step-level idempotency but caller-side key authoring conventions are absent | Write idempotency-key naming convention for Inngest events emitted from `server` surface; add to async plugin contract |
| Dead-letter / poison-event handling | Async Runtime [[rawr-async-runtime-spec-analysis]] | silent — "dead-letter/poison-event handling beyond Inngest defaults" named explicitly | Conscious deferral — Inngest owns retry/cancellation, but RAWR owns the boundary when an event exhausts retries | Add dead-letter policy to async plugin contract: max-retry, failure-event emission, alerting seam |
| Observability vendor binding (HyperDX/OTel) | Async Runtime (gap), MAWE (gap), Deployment (bootstrap only) | policy-only in Deployment; silent in Async/MAWE — "no observability/telemetry binding (HyperDX or otherwise) for Inngest run traces" and "provider-side observability propagation is implied via traceId but exact propagation contract unspecified" | Real gap — traces cross process boundaries (server→async→managed-agent→provider) with no specified propagation contract | Specify OTel context propagation contract: W3C TraceContext headers, HyperDX exporter config, trace-id injection at Inngest event envelope |
| Multi-tenant isolation specifics | Auth [[rawr-authentication-subsystem-spec-analysis]] (tenantId/workspaceId on AuthInvocation), MAWE (per-tenant workspace isolation policy) | policy-only — tenant/workspace fields are declared on invocation and workspace manifest but row-level isolation, cross-tenant query guards, and DB-level tenant enforcement are not specified | Real gap — the auth spec declares the field; no spec specifies the enforcement mechanism at the DB/storage layer | Spec a multi-tenancy enforcement contract in the service-package pattern: required filter predicate, query-guard lint rule, row-level security posture |
| Secrets manager vendor binding | Deployment [[rawr-deployment-subsystem-spec-analysis]] | policy-only — `SecretBinding` shape is stable; "secret manager vendor reserved as a seam" (§30) | Conscious deferral — seam named, owner fixed at deployment adapter layer | Document the adapter contract: how `SecretBinding` resolves at runtime for Railway native secrets vs external Vault/1Password |
| Testing-discipline reference | Async Runtime, Authoring Classifier, Workstream Review | thin — Dev Server named but "contract-level test patterns are not" in async; classifier emits verification gates but testing idioms per plugin kind are not given; review spec defers gate-runner implementation | Real gap — no cross-cutting testing guide specifying: unit harness per plugin kind, Inngest Dev Server usage pattern, integration test shape, snapshot/restore test discipline | Write a testing-discipline reference spec (or §) covering: per-plugin-kind test harness, Inngest local Dev Server patterns, MAWE sandbox-noop provider test profile |
| MFA / step-up authentication | Auth [[rawr-authentication-subsystem-spec-analysis]] | silent — `assurance` field ("low/medium/high") hints at MFA but "MFA, step-up authentication, and consent flows are not explicitly modeled" | Real gap — the assurance field is the hook but there is no step-up flow, re-authentication trigger, or consent-redirect model | Add step-up authentication section to Auth spec: trigger conditions (assurance < required), re-auth redirect, consent-flow pattern, short-lived capability token issuance |
| Refresh-token rotation | Auth [[rawr-authentication-subsystem-spec-analysis]] | silent — "refresh-token rotation policy" named as a thin area | Real gap — TokenIssuerResource covers issuance but rotation/revocation lifecycle is unspecified | Specify refresh-token rotation in Auth spec: rotation-on-use, revocation propagation to SessionStore, audit event on rotation |
| JIT user provisioning | Auth [[rawr-authentication-subsystem-spec-analysis]] | silent — "JIT provisioning of users from external IdPs" named as thin | Real gap — no on-first-login account creation flow, no IdP attribute mapping to RAWR actor, no provisioning hook in AuthVerifier | Add JIT provisioning section: first-login handler, IdP attribute→actor mapping contract, services/identity write path |
| Profile→manifest mapping detail | MAWE [[rawr-managed-agent-workspace-execution-spec-analysis]] | thin — "8 canonical profiles ... sketched rather than fully tabulated"; profile-to-manifest field mapping (openai-agents-sdk, e2b, daytona, modal, etc.) is illustrative | Real gap — a provider implementer cannot build a conformant adapter without knowing the exact field mappings | Tabulate profile→manifest mapping for each of the 8 canonical providers; promote to normative (locked) status in MAWE spec |
| Cost / budget enforcement | MAWE [[rawr-managed-agent-workspace-execution-spec-analysis]] | thin — cost/budget declared as policy field; "no integration with a billing/cost service is described" | Real gap — RAWR declares the field but no spec owns the enforcement seam (provider quota vs. platform billing vs. internal accounting) | Specify cost enforcement seam: provider quota check at workspace prepare, budget-exceeded error class, billing event emission to services/accounting |
| Multi-agent handoff semantics | MAWE [[rawr-managed-agent-workspace-execution-spec-analysis]] | thin — `multi-agent-handoff` appears as a `ProviderCapabilitySet` flag; "cross-agent coordination semantics inside a single provider session are not specified" | Real gap — capability flag without protocol: no handoff envelope, no context-transfer contract, no trust propagation between agents | Specify multi-agent handoff contract in MAWE: handoff envelope shape, context/artifact transfer, trust propagation, provider-side capability requirement |
| Auth on event emit (server→async boundary) | Async Runtime [[rawr-async-runtime-spec-analysis]] | silent — "who is allowed to emit which event, especially from public server into the privileged HQ worker" | Real gap — the integration point exists (server emits, async consumes) but the authorization check on that boundary is unspecified | Spec auth-on-emit in async plugin contract: allowed caller kinds per event, event signing key usage, server-side pre-emit authorization check |
| Schema evolution of event payloads | Async Runtime [[rawr-async-runtime-spec-analysis]] | silent — "schema evolution of event payloads across mode boundaries" named | Real gap — no versioning strategy, no backward-compat rule, no migration path for Inngest event schema changes | Add event schema evolution section to async spec: semver on event types, backward-compat invariant, migration step pattern |

### Bookmarked deferrals vs. real gaps

**Silences that are bookmarked deferrals with named reserved seams** (the spec knows it omits them, names the owner, and holds the shape stable):

1. **Registry authentication** — Deployment §30 explicitly reserves it with `SecretBinding` shape stable.
2. **Secret manager vendor binding** — Deployment §30 reserves it; adapter contract is the next step.
3. **Blue/green/canary rollout / release promotion** — Deployment §30 reserves; "platform adapter" is the named owner.
4. **Fly / Kubernetes adapters** — reserved with condition ("add when earned").
5. **Classification-record storage** — Classifier reserves as "workstream artifact today, service when earned."
6. **Rule expression language** — Classifier flags as a refinement seam.
7. **DB schema / scoring algorithms / gate runner** — Workstream Review explicitly defers these.
8. **Managed DB provisioning / cost/region policy** — Deployment reserves.

**Silences that are real gaps the landscape would feel** (no reserved seam, no named owner, operational behavior is undefined):

1. **Signing/attestation** — no seam, no model, no verifier harness. A consumer retargeting a bundle cannot verify provenance.
2. **Bundle-version compatibility / semver** — no version negotiation contract. A destination receiving an updated bundle has no compatibility signal.
3. **Idempotency-key conventions** — Inngest provides the mechanism; no RAWR convention governs key authoring, making event deduplication behavior unpredictable in practice.
4. **Dead-letter handling** — Inngest defaults handle retry exhaustion but RAWR defines no failure-event, alerting hook, or poison-event quarantine.
5. **OTel/HyperDX propagation across process boundaries** — traces are emitted per-service but no propagation contract exists across the server→async→MAWE provider chain.
6. **MFA / step-up / consent flows** — `assurance` field is declared but the step-up trigger, re-auth redirect, and short-lived capability token issuance path do not exist.
7. **Refresh-token rotation** — TokenIssuerResource covers issuance; rotation/revocation lifecycle is absent.
8. **JIT user provisioning** — first-login handler, IdP attribute mapping, and services/identity write path are unspecified.
9. **Profile→manifest mapping** — 8 canonical MAWE provider profiles are sketched; a provider implementer cannot produce a conformant adapter from the current spec.
10. **Cost/budget enforcement seam** — field declared, enforcement boundary (provider quota? platform billing? internal?) unspecified.
11. **Multi-agent handoff protocol** — capability flag without semantics.
12. **Auth-on-emit (server→async)** — the authorization check on event emission into the privileged worker is unspecified.
13. **Multi-tenant DB enforcement** — tenant field declared on invocation; no spec owns the DB-layer enforcement contract.
14. **Testing-discipline reference** — no cross-cutting guide; per-plugin-kind test patterns are absent.

## Committed position

The RAWR spec corpus is architecturally mature — its layering, ownership separations, and don't-own-still-manage discipline are genuinely sophisticated — but it has a structural pattern of stopping at the seam declaration without specifying the integration-point protocol on the other side of the seam. The eight "bookmarked deferrals" above are acceptable gaps: the shape is stable, the owner is named, and an implementer knows exactly where to pick up. The fourteen "real gaps" are not acceptable at operational maturity: they would each surface as a runtime incident, a security audit failure, or a platform integration stall. The corpus's strongest gap pattern is the "field-without-protocol" failure mode — assurance declared without step-up flow, multi-agent-handoff flagged without envelope, cost/budget declared without enforcement seam, idempotency-key referenced without naming convention. These are not missing specs for new subsystems; they are missing integration-point completions for subsystems that already exist.

**Position:** The RAWR spec landscape is operationally incomplete in a specific, bounded, and fixable way: 14 integration-point protocols are declared at the seam but not specified through the seam, leaving a conformant implementer unable to produce a correct adapter without invention.

**Confidence:** high — all 14 gaps are directly documented in the spec-analysis notes' "Silences" and "Completeness signals" sections; none are interpretive.

**Boundary conditions:** This applies to the seven specs analyzed here plus the canonical Effect Runtime Realization spec as their authority. If additional specs exist (e.g., a Workstream System canonical spec, an OpenShell Agent Runtime spec, a Habitat SDK Layers spec not yet analyzed) they may close some gaps — particularly testing discipline, multi-tenant enforcement, and multi-agent handoff.

**What would change this position:** If a Workstream System canonical spec or a Service Package Effect spec explicitly specifies the multi-tenancy DB enforcement contract, testing discipline reference, and auth-on-emit authorization check, the count of real gaps would drop from 14 to approximately 11. The signing/attestation, bundle-version compatibility, and refresh-token rotation gaps are the least likely to be closed by currently known sibling specs.

**Evidence weight:** 7 spec-analysis notes, all synthesized directly from their "Silences," "Don't-own-still-manage frontier," "Completeness signals," and "Estimated completeness grade" sections. No external sources fetched (synthesis locus, budget not required). 0 contradictions; all silences are either explicitly named by the original analyst or directly inferable from the stated reserved seams.

**Top 5 gaps to fill next (ranked by operational consequence):**

1. **Signing/attestation on CapabilityBundle** — without this, bundle provenance is an honor system; supply-chain attacks are undetectable. Spec a cosign/sigstore seam on `CapabilityBundle` with a verifier harness for consumers.
2. **OTel/HyperDX propagation contract across process boundaries** — without this, distributed traces break at every service boundary; production debugging is blind across the server→async→MAWE chain. Spec W3C TraceContext injection at the Inngest event envelope and across the MAWE provider boundary.
3. **MFA/step-up authentication flow** — the `assurance` field hook exists; without the step-up flow, high-assurance surfaces cannot enforce re-authentication. Spec the trigger condition, re-auth redirect, and short-lived capability token issuance path in the Auth spec.
4. **Idempotency-key naming convention + dead-letter policy** — without these, Inngest event deduplication and retry-exhaustion behavior are unpredictable in production. Add both to the async plugin contract as normative requirements.
5. **Profile→manifest mapping for MAWE canonical providers** — without tabulated mappings, each provider adapter is an independent invention; conformance cannot be audited. Promote the 8 canonical provider profile mappings from illustrative to normative in the MAWE spec.

## Open questions

- Does the Workstream System Canonical Spec (not yet analyzed) specify the multi-tenancy DB enforcement contract or the auth-on-emit authorization check?
- Does the OpenShell Agent Runtime spec specify multi-agent handoff semantics at the shell/HQ level that could inform MAWE's handoff protocol?
- Does the Habitat SDK Layers spec define the testing-discipline reference across plugin kinds?
- Does the Service Package Effect Spec (referenced in the query) specify the refresh-token rotation or JIT provisioning lifecycle?
- Is there a cost/accounting service spec or a billing adapter spec that would close the cost/budget enforcement gap?

## Sources

1. [[rawr-factory-bundle-export-spec-analysis]] — RAWR Factory Bundle Export spec analysis
2. [[rawr-async-runtime-spec-analysis]] — RAWR Async Runtime spec analysis
3. [[rawr-authentication-subsystem-spec-analysis]] — RAWR Authentication Subsystem spec analysis
4. [[rawr-managed-agent-workspace-execution-spec-analysis]] — RAWR Managed Agent Workspace Execution spec analysis
5. [[rawr-deployment-subsystem-spec-analysis]] — RAWR Deployment Subsystem spec analysis
6. [[rawr-workstream-review-subsystem-spec-analysis]] — RAWR Workstream Review Subsystem spec analysis
7. [[rawr-authoring-classifier-system-spec-analysis]] — RAWR Authoring Classifier System spec analysis
