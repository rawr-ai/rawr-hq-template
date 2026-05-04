---
title: RAWR Authentication Subsystem — spec analysis
id: rawr-authentication-subsystem-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:35:02.051057Z'
updated: '2026-05-01T21:10:17.638172Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Authentication_Subsystem_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Authentication_Subsystem_Canonical_Spec.md
- runtime_authority: no

## Scope and purpose

This spec defines the canonical Authentication and Authorization Subsystem for RAWR. It fixes the meaning of authentication, authorization, actor identity, caller identity, and authority propagation; the canonical placement of external IdPs, token verifiers, session stores, API key verifiers, external policy engines, and gateway-backed trust; the invocation model that carries verified actor identity into services; the distinction between surface admission and domain authorization; and the way auth is realized through the runtime realization lifecycle. It explicitly does NOT fix a single IdP, RBAC data model, session backend, token format, permission vocabulary, or policy-engine vendor. Its central question: "how verified identity and authority enter RAWR without turning runtime resources, plugins, harnesses, or services into the wrong kind of owner."

## Concern coverage

- Identity: actor kinds (anonymous/user/service/steward/operator/system), caller identity (separate from actor), trust boundaries (public/trusted-first-party/trusted-operator/internal-system/durable-steward/local-dev).
- Authentication: AuthVerifierResource as a runtime resource, provider families (jwt-jwks, opaque-token, session-cookie, api-key, github-app, gateway, dev-user, test-principal), VerifiedPrincipal shape with claims/scopes/audience/assurance.
- Authorization: separation of surface admission (plugin) from domain authorization (service); AuthSurfacePolicy descriptors; service middleware for `provided.authz`; access-control service ownership of memberships, roles, grants, entitlements.
- Sessions: optional SessionStoreResource (redis/postgres/memory/noop providers), explicit non-ownership of identity truth.
- Token issuance: optional TokenIssuerResource for first-party tokens, gateway assertions, service-to-service credentials, short-lived capability tokens, steward authority tokens.
- Multi-tenant isolation: tenantId/workspaceId on AuthInvocation; requiredTenant/requiredWorkspace on policy descriptors.
- Secrets: provider config redaction, secret redaction in diagnostics, redaction-class on policy.
- MFA: implicitly via VerifiedPrincipal `assurance` ("low"/"medium"/"high") and `authMethod`; not explicitly named as MFA.
- SSO: via jwt-jwks, opaque-token, session-cookie provider families plus optional services/identity for external identity links.
- Agent identity (humans + bots): explicit actor kinds for user, service, steward, operator, system; caller kinds covering server-api, server-internal, async-workflow, agent-shell, agent-tool, cli-command, desktop-surface, web-client, service.
- Service-to-service auth: service actor kind, service-account policy descriptor, internal-system trust boundary, gateway assertions, mTLS peer credential material.
- Async authority: ActorSnapshot, AuthorityBasis (verified-principal/session/scope/grant/operator-gateway/workflow-continuation), workflow-continuation as audit basis (not blanket permission), fresh authorization rechecks.
- Trusted-operator shell: shell gateway authentication, GatewayAssertionProvider, agent tool policy, governed repo mutation routed through stewards via async.
- Diagnostics/audit: redacted runtime catalog auth posture, RedactedAuthDiagnostic codes, audit classes, denial reason codes, subject hashes (not identity truth).
- Error model: 9 layered error kinds (UNAUTHENTICATED, CREDENTIAL_MALFORMED/EXPIRED, INSUFFICIENT_SCOPE, TRUST_BOUNDARY_VIOLATION, FORBIDDEN, AUTH_PROVIDER_UNAVAILABLE, AUTH_POLICY_MISSING, AUTH_REDACTION_FAILURE), each owned by a specific layer.
- Compiler enforcement: explicit auth policy on callable surfaces, provider coverage, public-by-omission detection, redaction coverage.

## Platform-level signal

Cross-cutting, with strong placement in Coordination (the layer that mediates outside-world signals into platform action). Auth verification, surface admission, and gateway-backed trust are the literal "signal-from-the-outside-world" concerns. However, durable RBAC truth and identity ownership land squarely in the product/service layer (services/identity, services/access-control). And the runtime realization integration (resources, providers, profiles, bootgraph) ties auth into the Core Runtime layer. The spec is deliberately structured so each layer owns a different slice; thus no single platform level "owns" auth, but Coordination is the dominant home.

## Vendor integrations declared

- Effect / RAWR runtime — not named, but the spec uses the canonical RAWR runtime resource/provider/profile/bootgraph vocabulary verbatim ("defineRuntimeResource", "RuntimeSchema", "ProcessRuntimeAccess", "ServiceBindingCacheKey", "serviceDep", "resourceDep").
- Elysia — named in §20.7 ("Elysia/server harness extracts headers, cookies, IP, user agent") as the server harness providing native ingress extraction.
- JWT/JWKS — first-class verifier provider family; production examples use `authVerifier.jwtJwks({ configKey: "auth.issuer.primary", ... })`.
- Redis / Postgres / in-memory — named SessionStoreResource provider implementations.
- GitHub App — first-class verifier provider family for installation/webhook identities used as auth.
- mTLS — named credential material kind for peer authentication.
- External policy engine — modeled as ExternalPolicyResource with explicit non-ownership rule; the spec lets you wrap an OPA-/Cedar-style external engine as a runtime resource without letting it own RAWR service truth.
- Inngest — implied as the durable-async backbone (workflow runId/eventId, async workflow invocation reconstruction), but not named.
- Specific IdPs (Auth0, Clerk, Keycloak, WorkOS, etc.) — NOT named. The spec is explicitly vendor-agnostic on identity provider choice and treats any IdP as an instance of the jwt-jwks/opaque-token/session-cookie provider family.
- Token libraries (jose, oslo, lucia, etc.) — NOT named. The spec stops at the AuthVerifier interface contract.

The "stand on shoulders of giants" pattern is respected at the architectural level: token verification is delegated to a verifier provider (which is expected to wrap a battle-tested library); session persistence is delegated to a session-store provider (Redis/Postgres); external policy is delegated to an external policy engine; identity-link semantics are delegated to a first-party identity service. RAWR explicitly avoids inventing a new RBAC vocabulary or a new token format. However, the spec stops short of naming concrete vendor libraries — it names provider families but not specific implementations.

## Don't-own-still-manage frontier

The spec is unusually explicit about this frontier and is the strongest example of don't-own-still-manage discipline in the corpus. Each integration point has clear ownership:

- Token verification: RAWR does not own the cryptographic verification; it owns the AuthVerifierResource contract, provider selection (runtime profile), and result-shape (VerifiedPrincipal). The provider implementation may wrap any vendor library.
- Identity store: RAWR does not own external IdP identity; an optional services/identity owns first-party identity links and account semantics, and the spec is explicit that "if the external policy engine owns application roles ... RAWR services must still model the dependency explicitly and define how external decisions map into service policy."
- Session replication: RAWR does not own Redis/Postgres clustering; the SessionStoreResource contract names it as a capability, with explicit non-ownership of identity truth.
- RBAC truth: RAWR may or may not own this; the spec accommodates both cases. If RAWR owns it, services/access-control is the canonical service. If an external policy engine owns it, ExternalPolicyResource is the integration point and services must still model the dependency.
- Gateway trust: RAWR does not own the shell channel transport; it owns the GatewayAssertionProvider that converts gateway assertions into VerifiedPrincipals.

Silences: the spec does not name specific token libraries (jose vs oslo vs node-jose), specific IdPs, or specific session backends beyond category. This is intentional — vendor selection is profile-level — but a reader looking for "which library should we wrap" will not find it here. MFA, step-up authentication, and consent flows are not explicitly modeled (only the `assurance` field hints at them).

## Where the spec touches runtime semantics (flagged: shape-correct, NOT authoritative)

- §7 "Runtime realization lifecycle for auth" — names the seven canonical phases (definition/selection/derivation/compilation/provisioning/mounting/observation). This is the runtime spec's vocabulary; the auth spec re-uses it. Authoritative on auth's placement WITHIN that lifecycle, not on the lifecycle itself.
- §8.1 AuthVerifierResource defines `defaultLifetime: "process"`, `allowedLifetimes: ["process", "role"]`. Lifetime semantics are runtime-spec territory; auth spec is shape-correct in declaring which lifetimes are appropriate.
- §10.1 explicitly states `AuthInvocation` "is not a process resource. It is not a role resource. It never participates in `ServiceBindingCacheKey`." This is a runtime-semantic claim the auth spec asserts but the runtime spec must enforce.
- §16.2 GatewayAssertionProvider uses `defineRuntimeProvider` — this is runtime-spec API surface; auth spec is illustrative on spelling.
- §22 Compiler/SDK enforcement requirements — names checks the runtime compiler must perform on auth (provider coverage, dependency closure, policy explicitness). The compiler is owned by the runtime spec; this spec contributes the auth-specific check list.

These are all "shape-correct, not authoritative" — the runtime realization spec is the source of truth on resource lifetimes, ServiceBindingCacheKey, the bootgraph, and the compiler. The auth spec writes its layer in the runtime spec's vocabulary but does not redefine that vocabulary.

## Completeness signals

- No explicit TBD/TODO markers.
- No "Phase N" or "Milestone M" deferred-work sections; spec is presented as fully canonical.
- §1 "It does not fix" is an explicit non-goal list — not deferred work, but acknowledged out-of-scope choices left to apps and profiles.
- §23 "Minimum implementation sequence" lists 12 ordered steps to build the subsystem; this is constructional, not a deferral.
- The spec references but does not define: the runtime realization lifecycle (defers to its own spec), Elysia harness internals, the workstream/governance model behind stewards, the durable-async substrate (Inngest), and the exact `services/identity` schema.
- The spec is authoritative-feeling throughout — strong "must/must not", explicit invariants (§24), explicit forbidden patterns (§25).
- Strong areas: invocation model, layer separation, async actor snapshot, diagnostics redaction posture, error layering.
- Thinner areas: MFA / step-up authentication, consent flows, sign-up / account creation lifecycle, password reset, refresh-token rotation policy, session revocation propagation, cross-tenant federation, JIT provisioning of users from external IdPs.

## Cross-spec dependencies

- RAWR Effect Runtime Realization System Canonical Spec — auth depends on it for resource/provider/profile/bootgraph/compiler vocabulary; auth is a consumer of runtime semantics, not an authority over them.
- RAWR Async Runtime Canonical Spec — auth defines actor-snapshot propagation across async boundaries; depends on the async spec for durable execution semantics.
- RAWR System Architecture Canonical Spec — referenced by the layered ownership table; the auth spec slots into the architectural roles defined there.
- RAWR OpenShell Agent Runtime and Steward Activation Spec — the shell gateway, trusted operator boundary, and steward actor kind point at this spec for governance/activation semantics.
- RAWR Workstream / Workstream Review Subsystem Specs — implied via "durable steward" and "governed repo mutation routes through steward activation and governance."
- RAWR Deployment Subsystem Spec — implied via runtime profile selection (config sources, env, secrets).
- Service Package Effect Spec — implied by `defineService`, `serviceDep`, `resourceDep`, `provided.authz` patterns.

## Verbatim load-bearing definitions / claims

1. §1 (purpose.txt): "how verified identity and authority enter RAWR / without turning runtime resources, plugins, harnesses, or services into the wrong kind of owner".
2. §2 (canonical-placement.txt): "auth verifier/client = resource + provider / auth provider choice/config = app runtime profile / raw ingress extraction = harness or shell gateway / auth boundary policy = plugin projection / actor/principal = invocation context / domain authorization truth = service".
3. §2 (core-invariant.txt): "verification proves caller identity / projection decides whether this caller class may enter this surface / invocation carries the verified actor / services decide domain permission / runtime provisions the tools / apps select the implementation / harnesses mount and normalize native ingress / diagnostics observe without exposing secrets".
4. §4.1 (verifier-not-actor.txt): "AuthVerifierResource = process or role capability / VerifiedPrincipal = per-invocation verification result / Actor = per-invocation application identity".
5. §4.4 (admission-vs-domain.txt): "surface admission = may this caller class enter this projected surface? / domain authorization = may this actor perform this operation on this domain object?".
6. §4.5: "A runtime profile may select a JWT verifier, session store, token issuer, API-key verifier, external policy client, or dev-user provider. It does not own durable roles, memberships, grants, tenants, repo permissions, or domain-specific authority."
7. §4.8: "Async work does not inherit a live request. Durable work carries explicit actor snapshots, authority basis, correlation, and policy evidence. Services re-enforce domain authorization where required."
8. §5.2 (actor.ts): "export type Actor = | { kind: 'anonymous' } | { kind: 'user'; userId: string } | { kind: 'service'; serviceId: string } | { kind: 'steward'; stewardId: string } | { kind: 'operator'; operatorId: string } | { kind: 'system'; systemId: string };".
9. §10.1 (auth-invocation.ts): "AuthInvocation is not a process resource. It is not a role resource. It never participates in `ServiceBindingCacheKey`."
10. §10.2 (authority-basis.ts): "Authority basis is audit material. It is not automatically permission. A service may require a specific authority basis and still deny the action based on domain state."
11. §11.1: "A plugin must not: own durable roles or memberships; bypass service policy; reach into service repositories for authorization; treat provider claims as domain permission without mapping; mutate domain state as part of admission policy; make route policy invisible to SDK derivation or diagnostics."
12. §11.2: "A service must not: read raw HTTP headers or cookies; acquire auth providers directly; import plugin middleware; rely on app profile state for durable permission truth; treat caller identity as actor identity without explicit delegation policy."
13. §15.3: "A workflow continuation basis explains why the workflow is running. It does not guarantee the actor still has permission for every later operation."
14. §25 forbidden patterns include: "treating actor identity as a runtime resource; ... letting services parse HTTP headers or cookies; treating plugin middleware as the owner of domain authorization; ... collapsing identity, access control, session storage, and token verification into one untyped helper."
15. §26 (final-rule.txt): "resource verifies / profile selects / harness normalizes / plugin admits / invocation carries / service authorizes / async propagates / gateway protects operator ingress / diagnostics redact".

## Estimated completeness grade (initial impression)

**A**

Justification: The spec is fully canonical-feeling with no TBD markers, exhaustive layer ownership tables, explicit invariants, explicit forbidden patterns, layered error model, two end-to-end worked examples (collapsed and uncollapsed), an explicit minimum implementation sequence, and a final mermaid diagram. It defers correctly on what it should defer (specific IdPs, RBAC vocabulary, token libraries) while being normative on what it owns (the layered ownership of auth concerns within RAWR's runtime realization). Minor gaps in MFA/step-up, sign-up/account-creation lifecycle, and refresh-token rotation prevent a perfect grade, but for scope coverage of "how identity and authority enter RAWR" the spec is comprehensive and internally consistent.
