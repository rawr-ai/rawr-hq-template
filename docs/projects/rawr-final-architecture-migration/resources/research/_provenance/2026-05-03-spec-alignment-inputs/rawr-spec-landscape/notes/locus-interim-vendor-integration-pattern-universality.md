---
title: Locus interim — vendor-integration-pattern-universality
id: locus-interim-vendor-integration-pattern-universality
tags:
- rawr-spec-landscape
- locus-vendor-integration-pattern-universality
- runtime-canon-arch-align
created: '2026-05-01T20:50:55.292208Z'
updated: '2026-05-01T21:10:16.911840Z'
status: draft
type: interim
tier: institutional
deprecated: false
---

# Interim report: vendor-integration-pattern-universality

**Locus question:** Is the oRPC x Effect x RAWR descriptor-first / standing-on-shoulders pattern a universal template applied uniformly, or do vendors get bespoke shapes sharing principles but varying in implementation?
**Flavor:** synthesis

## What the corpus already said

[[rawr-service-package-effect-vendor-integration-shape-reference]] established the canonical meta-rule explicitly: "Use native idioms inside each boundary. Use RAWR constraints only at ownership/lifecycle seams." and "Do not teach a custom RAWR mini-language where a native technology already has a clear idiom. Wrap the import surface and ownership seams instead." The note also extrapolated generalizations for Inngest, Bun/Elysia, Drizzle, and HyperDX as interpretive extensions of the same pattern. [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] confirmed the pattern at runtime level by enumerating every vendor and naming exactly what RAWR owns vs. delegates — with per-vendor precision that already diverges in shape (Inngest gets a WorkflowDispatcher abstraction; Elysia gets a harness post-lowering; OCLIF gets command dispatch via adapter; Effect gets a curated facade + forbidden set). The other subsystem specs ([[rawr-authentication-subsystem-spec-analysis]], [[rawr-deployment-subsystem-spec-analysis]], [[rawr-managed-agent-workspace-execution-spec-analysis]], [[rawr-factory-bundle-export-spec-analysis]], [[rawr-async-runtime-spec-analysis]], [[rawr-authoring-classifier-system-spec-analysis]]) each instantiate the principle differently without the spec ever naming "universal template" as such.

## The 10-rule descriptor-first / standing-on-shoulders checklist (from Service-Package-Effect)

Extracted from [[rawr-service-package-effect-vendor-integration-shape-reference]] Sections 3, 4, 5, 11, 12, 14, 18:

1. **Identify zone of strength.** Name exactly what the vendor is best at and scope integration to that zone only.
2. **Author native inside that zone.** Service/plugin/app code reads like the vendor's own docs, not a RAWR DSL.
3. **Wrap the import surface.** Re-export from `@rawr/sdk/<vendor>`; mirror native names where safe; omit lifecycle authority.
4. **Forbid lifecycle authority in authoring.** No vendor-runtime construction in services/plugins/apps; the runtime substrate owns one of each.
5. **Compile to descriptors, not to vendor calls.** Authoring produces cold declarative descriptors; the runtime lowers them to vendor invocations.
6. **One canonical terminal per execution mode.** Explicit, named facades — no ambiguous default call shape inside RAWR execution contexts.
7. **Boundary errors = vendor's contract; internal errors = diagnostics by default.** Map vendor failure channels explicitly into the declared boundary error type.
8. **Telemetry split.** Runtime owns lifecycle/correlation; vendor authoring owns semantic span enrichment; product analytics is an explicit declared resource.
9. **Cross-service collaboration goes through bound clients, not vendor primitives.** Authors cannot reach across service internals via raw vendor mechanisms.
10. **Type/import/runtime gates enforce rules in CI, not just convention.** Static allowlists/blocklists plus runtime behavior gates close the loop.

## Per-vendor analysis

| Vendor | Zone of strength used | Integration shape | RAWR ownership boundary | Grade |
|---|---|---|---|---|
| **oRPC** | Callable contracts, procedure mechanics, OpenAPI generation, transport | Native `.handler`/`.effect` terminals; native contract/implementer/middleware/context authoring; descriptor-first capture of `EffectExecutionDescriptor`; SDK-contained effect-oRPC adapter | Error bridge, lane lowering into initial/execution context, descriptor capture, binding cache, import surface facade | **A** |
| **Effect** | Typed effectful composition, structured concurrency, scoped acquire/release, typed failure channel | Curated `Effect` facade exposed; generator-native `.effect(function*)` bodies; `RawrEffect<T,E>` return type; `TaggedError` for typed failures; forbidden raw runtime construction | One `ManagedRuntime.make(layer)` per process in substrate only; `EffectRuntimeAccess`/`ProcessExecutionRuntime` as execution bridge; forbidden set enforced by gates | **A** |
| **Inngest** | Durable orchestration, retry, replay, history, schedules, durable queues | Cold `WorkflowDispatcherDescriptor`/`FunctionBundle` definitions; `defineAsyncStepEffect` for step-local descriptors; `stepEffect(ctx).run(descriptor)` for step execution; native `run(ctx)` function is pure Inngest interop | Workflow/schedule/consumer definition (cold shape), `WorkflowDispatcher` integration, async lowering chain; Inngest owns all durability/retry/replay | **A** |
| **Bun/Elysia** | Fast JS runtime host + HTTP request routing/plugin middleware | Elysia harness consumes adapter-lowered oRPC/Elysia route payloads; native Elysia routing/plugin middleware inside harness; harness owns native interior post-lowering | Adapter lowering coordination, harness lifecycle, process lifecycle; Elysia owns HTTP host lifecycle and routing post-handoff; Bun is implicit JS runtime host below substrate | **B** (Bun below-substrate implicit ownership means it has no explicit integration shape; Elysia is well-specified as harness) |
| **OCLIF** | CLI command dispatch semantics | OCLIF harness mounts adapter-lowered command payloads; native command dispatch happens inside harness post-lowering | Adapter lowering, harness handoff, CLI surface plan compilation | **B** (named but shallow — command-specific descriptor shapes not fully specified in corpus beyond harness handoff) |
| **Drizzle** | SQL DSL authoring, query composition | Drizzle slots in as provider implementation under `resources/sql/providers/*`; repository methods return `RawrEffect<T, RepositoryError>` over `Effect.tryPromise(() => drizzle.query(...))`; raw Drizzle never escapes a service module | `SqlPoolResource` as the resource abstraction; `sql.postgres({ configKey })` provider selector; raw Drizzle confined inside provider boundary | **B** (Drizzle not explicitly named in runtime spec — referenced only abstractly via `SqlPoolResource`; no named facade, no explicit forbidden set beyond "raw Drizzle never escapes") |
| **HyperDX / OTel** | Telemetry export, observability product | OTel bootstrap is runtime-owned; `logger.openTelemetry({ configKey: "telemetry" })` provider selector; HyperDX is a provider implementation; services emit semantic spans via `telemetry.span(...)` | Runtime-owned OTel bootstrap, correlation, provider selector; service-side semantic observability enrichment only | **B** (HyperDX not explicitly named in runtime spec; integration shape is correct in principle but treated as an OTel provider detail, not a first-class integration) |
| **Auth provider (JWT/JWKS, opaque-token, session, API key, etc.)** | Identity verification mechanics per provider family | `AuthVerifierResource` as the runtime resource abstraction; provider families (`jwt-jwks`, `opaque-token`, `session-cookie`, `api-key`, `github-app`, `gateway`, `dev-user`, `test-principal`); `VerifiedPrincipal` as output shape; surface admission vs. domain authorization split | Auth resource/provider lifecycle; `VerifiedPrincipal` type; service middleware receives verified identity via `provided.authz`; no single IdP, RBAC model, session backend, or token format owned | **A** (auth is the cleanest resource/provider pattern: multiple provider families under one resource abstraction, each authored natively, all producing a normalized output type) |
| **Deployment target (Railway + Railpack + OCI)** | Platform-native build, artifact production, workload placement | `DeploymentTargetProfile` selects Railway/Compose/OCI/local-process/etc.; Railpack is the default OCI builder; `TargetProfile` compiles placement plans; platform handoff is the seam | Deployment definition → target selection → placement compilation → build realization → artifact emission; platform adapter owns native interior post-handoff | **A** (clear target selection abstraction with named provider families, bespoke per-target but well-specified seam) |
| **MAWE provider (e.g., model-driven agent workspace)** | Provider-managed autonomous agent execution environments | `ManagedAgentWorkspaceResource` as resource abstraction; `ManagedAgentWorkspaceProvider` as provider; `ManagedAgentWorkspaceManifest` as workspace descriptor; two canonical seams: async steward run substrate and product-app agent harness | Workspace lifecycle, run event normalization, artifact drain, outcome envelope; provider manages native interior (filesystem, network, execution policy) | **B** (two canonical integration seams are well-specified; but provider families for MAWE are not enumerated to the same depth as auth or deployment — it is more of a framework spec than a multi-provider integration) |
| **Factory Bundle TargetProfile** | Capability export, retargeting into foreign destinations | `CapabilityBundle` as export unit; `TargetProfile` as destination descriptor; `Retargeter` as the bridge; three-part verification split (portable/mappable/destination-local) | Source-side certainty manufacture, bundle shape, provenance; destination environment is not colonized — retargeter burns down destination-side uncertainty | **B** (principle is correct but the TargetProfile-per-destination integration shape is less prescriptive than harness integrations; destinations are open-ended by design) |
| **Authoring Classifier LLM caller** | Intent parsing and classification inference (LLM or deterministic) | LLM is used as a classification inference engine; output is typed `IntentClassification` facts; the classifier is a narrowing engine, not a generator, not a runtime; LLM-backed vs deterministic backends are interchangeable at the classification seam | Classifier owns the classification → RAWR-ontology-placement pipeline; LLM provider is a backend detail; classified output feeds SDK derivation and generators | **C** (LLM-as-classifier is the weakest integration in the corpus: no explicit resource/provider abstraction for the LLM backend, no descriptor-first terminal, no import gate; the "stand on shoulders" principle applies in spirit — use LLM at inference, own the ontology mapping — but the integration shape is implicit, not specified) |

## Evidence synthesis

The evidence across all nine corpus notes resolves a clear answer: the pattern is **principle-consistent but implementation-bespoke**. The tri-zone structure (vendor zone of strength, RAWR seam ownership, descriptor-first compile target) appears in every integration, but the concrete shape of each seam differs substantially. oRPC's seam is an import-contained `EffectExecutionDescriptor` capture with error bridging. Inngest's seam is a `WorkflowDispatcher` / `FunctionBundle` lowering chain. Elysia's seam is a post-adapter-lowering harness handoff. Auth's seam is a `RuntimeResource` abstraction with normalized `VerifiedPrincipal` output. Deployment's seam is a `TargetProfile` compilation chain. MAWE's seam is a `ProviderCapabilitySet` with two named attachment points. Factory Bundle's seam is a `Retargeter` + three-part verification model.

The strongest integrations (oRPC, Effect, Inngest, Auth) are strongest precisely because they name: (a) what the vendor cannot do for RAWR (runtime construction, durability semantics, identity truth), (b) what RAWR cannot delegate to the vendor (lifecycle ownership, seam compilation, error bridging), and (c) exactly what is forbidden in authoring (listed, gated in CI). The weaker integrations (Drizzle, HyperDX, Bun, Authoring-Classifier-LLM) are weaker not because they violate the principle but because the spec treats them with less precision — no explicit facade name, no forbidden set, no named import gate. The principle holds; the depth of instantiation varies.

One genuine tension: the Authoring Classifier LLM integration does not follow the descriptor-first compile pattern at all. Authors call the classifier to produce plans; those plans are not lowered by a runtime substrate. This is structurally different from every other integration because the classifier is upstream of authoring (not inside the runtime path), and the LLM is a tool used to power that upstream step. So the LLM is correctly absent from the runtime integration pattern — it is not a runtime vendor, it is a planning inference tool. This is not a violation of the principle; it is a different kind of concern that sits outside the pattern's scope. But the spec does not make this distinction explicit.

## Committed position

The evidence compels a verdict of **principle-with-bespoke-implementations**: the 10-rule standing-on-shoulders checklist is a genuine universal principle that every vendor integration instantiates, but the implementation shape of each seam is irreducibly bespoke because each vendor's zone of strength is structurally different (callable contracts vs. typed effectful composition vs. durable orchestration vs. HTTP routing vs. CLI dispatch vs. SQL DSL vs. identity verification vs. OCI build vs. agent execution). A "universal template" claim would be false — there is no single structural pattern you could copy-paste across vendors; the seam topology changes with the vendor's nature. But the *principle* — identify zone of strength, author native inside, wrap the import surface, forbid lifecycle authority, compile to descriptors, enforce via gates — is universal and is the actual load-bearing design law. The two vendor integrations that best exemplify the principle are **Effect** (deepest seam specification: curated facade, forbidden set, one ManagedRuntime owner, generator-native terminal, CI gates) and **Inngest** (cleanest delegation: RAWR owns cold definition + lowering chain; Inngest owns all durability/retry/replay with no confusion about which side owns what). The two that fall short are **Drizzle** (implicitly correct but unnamed — no facade, no forbidden set, no gate specification in the corpus) and **Authoring Classifier LLM** (sits outside the runtime pattern's scope; no resource abstraction, no descriptor-first terminal, no integration shape specified — the spec correctly omits it but leaves its integration posture ambiguous for future implementers).

- **Position:** The standing-on-shoulders pattern is a universal *principle* (10 rules, always applicable) instantiated in structurally bespoke per-vendor *shapes* (seam topology varies with vendor nature); "universal template" is too strong, "principles only" is too weak.
- **Confidence:** high (>85%) — every corpus note confirms the principle; the bespoke-shape observation is evident from comparing seam topologies across six named integrations in the runtime spec alone.
- **Boundary conditions:** This position holds for all runtime-path vendor integrations (Effect, oRPC, Inngest, Elysia, OCLIF, Auth providers, Deployment targets, MAWE providers). It does not cover upstream planning tools (Authoring Classifier LLM) or implicit infrastructure dependencies (Bun as JS host) where the principle applies in spirit but no integration shape is specified.
- **What would change this position:** Evidence that a single structural template (e.g., a `defineVendorIntegration({ resource, facade, forbiddenSet, descriptor, gate })` macro) exists or is specified that all vendor integrations actually use without per-vendor seam customization — that would make the universal-template reading correct. No such macro appears in the corpus.
- **Evidence weight:** 9 corpus notes analyzed; 8 confirm principle-with-bespoke-implementations; 0 contradict; Authoring Classifier is the sole ambiguous case (sits outside runtime pattern scope, not a violation).

## Open questions

- Does a `defineVendorIntegration(...)` macro or equivalent structural abstraction exist in the codebase (not spec) that would make the universal-template reading more accurate?
- Is the Drizzle integration specified at greater depth in the Service Package Effect spec's worked examples than the corpus note captures?
- Is the Authoring Classifier LLM intended to have a resource/provider abstraction in a future spec, or is it deliberately kept as an upstream planning tool with no runtime integration shape?
- What is the specified integration shape for Tailscale (mentioned in async spec as private operator access mechanism) — does it follow the resource/provider pattern?

## Sources

1. [[rawr-service-package-effect-vendor-integration-shape-reference]] — RAWR Service Package Effect: vendor-integration shape reference (grade A−; shape reference, not runtime authority)
2. [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] — RAWR Effect Runtime Realization System spec analysis: authoritative runtime spec with per-vendor integration declarations
3. [[rawr-system-architecture-spec-analysis]] — RAWR System Architecture Canonical Spec analysis: umbrella ontology and vocabulary root
4. [[rawr-authentication-subsystem-spec-analysis]] — RAWR Authentication Subsystem spec analysis: Auth provider integration shape (resource/provider/VerifiedPrincipal)
5. [[rawr-deployment-subsystem-spec-analysis]] — RAWR Deployment Subsystem spec analysis: TargetProfile / Railpack / Railway integration shape
6. [[rawr-managed-agent-workspace-execution-spec-analysis]] — RAWR Managed Agent Workspace Execution spec analysis: MAWE provider integration shape
7. [[rawr-factory-bundle-export-spec-analysis]] — RAWR Factory Bundle Export spec analysis: TargetProfile / Retargeter / CapabilityBundle integration shape
8. [[rawr-async-runtime-spec-analysis]] — RAWR Async Runtime spec analysis: Inngest durable orchestration integration shape
9. [[rawr-authoring-classifier-system-spec-analysis]] — RAWR Authoring Classifier System spec analysis: LLM-as-classifier upstream planning tool
