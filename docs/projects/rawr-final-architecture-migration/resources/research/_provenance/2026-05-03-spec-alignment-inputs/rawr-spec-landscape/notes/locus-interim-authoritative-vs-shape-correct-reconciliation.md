---
title: Locus interim — authoritative-vs-shape-correct-reconciliation
id: locus-interim-authoritative-vs-shape-correct-reconciliation
tags:
- rawr-spec-landscape
- locus-authoritative-vs-shape-correct-reconciliation
- runtime-canon-arch-align
created: '2026-05-01T20:51:24.511203Z'
updated: '2026-05-01T21:10:15.911591Z'
status: draft
type: interim
tier: institutional
deprecated: false
---

# Interim report: authoritative-vs-shape-correct-reconciliation

**Locus question:** How much un-cashed reconciliation work remains across the eleven shape-correct specs vs. the authoritative Effect Runtime Realization spec — specifically the runtime-shaped claims those specs make (auth's ServiceBindingCacheKey, OpenShell's direct-emission, Async-Runtime's missing Effect Layer for Inngest connect worker, MAWE's provider-boundary law, durable-event-bus ownership)?
**Flavor:** dialectical

## What the corpus already said

The width sweep had already flagged the core tension: the Effect Runtime Realization spec [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] is the sole runtime authority and it explicitly names reserved boundaries (§23.5), while the shape-correct specs — including [[rawr-authentication-subsystem-spec-analysis]], [[rawr-async-runtime-spec-analysis]], [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]], [[rawr-managed-agent-workspace-execution-spec-analysis]], [[rawr-workstream-review-subsystem-spec-analysis]], and [[rawr-service-package-effect-vendor-integration-shape-reference]] — carry `runtime_authority: no` metadata and each claims to subordinate themselves to the authoritative spec. The structural subordination language is present everywhere. What the width sweep had not resolved was whether that subordination language is load-bearing or merely decorative: do the shape-correct specs make runtime-shaped claims that the authoritative spec actually realizes, or do they push into territory the authoritative spec leaves unresolved?

## Policy-level subordination vs. integration-law-level reconciliation

Every shape-correct spec carries explicit `runtime_authority: no` and restates the subordination contract. This is **policy-level subordination**: a governance claim about who owns what. It is necessary but not sufficient for system-level coherence. The harder question is **integration-law-level reconciliation**: does the authoritative spec actually export the runtime primitives the shape-correct specs invoke, and does the spec's behavior match what the shape-correct specs assume?

The distinction matters because:
- A shape-correct spec can be internally perfect (A grade per spec) and yet invoke a runtime primitive the authoritative spec has reserved but not yet locked.
- When that happens, the runtime claim in the shape-correct spec hangs in the air — it is shape-correct as a vocabulary usage, but it is not yet realized as a runtime contract.

## Reconciliation surface inventory

### AUTH: `ServiceBindingCacheKey` exclusion claim

**Claim (auth spec §10.1):** "AuthInvocation is not a process resource. It is not a role resource. It never participates in `ServiceBindingCacheKey`."

**Authoritative spec status:** The runtime spec defines `ServiceBindingCacheKey` as part of the `Service runtime boundary` section (§ service-binding-cache). The runtime spec explicitly covers construction-bound vs invocation-bound clients and that the service binding cache "excludes invocation." The auth spec's claim is **consistent** with and supported by the runtime spec's behavior.

**Classification: (a) already in runtime spec.** The runtime spec owns this exclusion; the auth spec restates it correctly.

### AUTH: `AuthVerifierResource` lifetime declarations (`defaultLifetime: "process"`, `allowedLifetimes: ["process", "role"]`)

**Claim (auth spec §8.1):** Resource lifetime semantics — "process" or "role" — are declared by the auth spec for a runtime resource.

**Authoritative spec status:** The runtime spec defines the resource/provider/profile model and explicitly covers `defineRuntimeResource`, `ResourceRequirement`, and the `ProviderSelection` machinery. Resource lifetime scoping is a runtime spec concern. The auth spec's shape is **implied** by the runtime spec's vocabulary but the authoritative spec does not enumerate per-resource lifetime policy for named subsystem resources.

**Classification: (b) implied but not realized.** The runtime spec's vocabulary supports this; the runtime spec does not canonically fix auth resource lifetimes. This is a gap at integration-law level, not a contradiction.

### AUTH: Compiler enforcement contributions (§22)

**Claim (auth spec §22):** Lists auth-specific checks the runtime compiler must perform: provider coverage, public-by-omission detection, redaction coverage, explicit auth policy on callable surfaces.

**Authoritative spec status:** The runtime compiler section (§ runtime-compiler) defines validators including "provider coverage/closure/cycle, topology/builder, execution policy, import law." Auth-specific compiler checks are NOT enumerated in the authoritative spec — they are implied by the framework but the specific auth gate families are a shape-correct spec contribution.

**Classification: (b) implied but not realized.** The authoritative spec owns the compiler; the auth spec contributes a checklist the compiler must execute. The handoff is clean in intent but the authoritative spec does not actually commit the auth-specific gate logic.

### OPENSHELL: Direct durable-event-emission claim (§8.3, §14.4)

**Claim (OpenShell spec §8.3, §14.4):** "external conversational ingress enters through agent / external product ingress enters through server / durable system work runs on async." And: "The shell does not need a fake synchronous server route just to create work." This implies the `agent` role can emit durable events directly into the Inngest plane without proxying through `server`.

**Authoritative spec status:** The runtime spec defines "process-local coordination resources" (`ProcessQueueHubResource`, `ProcessPubSubHubResource`) as explicitly "NOT durable." It defines the `WorkflowDispatcher` as the RAWR-owned durable async interop. But who may emit durable events — which roles, which surfaces, which plugins — is NOT explicitly enumerated. The runtime spec defers "durable workflow semantics" outward to Inngest and names the async harness integration; it does not enumerate per-role emission rights.

**Classification: (b) implied but not realized / potential (d) deferred work.** The OpenShell spec asserts a direct-emission capability the authoritative spec's `WorkflowDispatcher` semantics must bless. Whether `agent` role plugins can call `WorkflowDispatcher` operations directly vs. only indirectly via the `server` role is not canonically locked. This is the strongest reconciliation gap on the OpenShell side.

### ASYNC: Missing Effect Layer for `connect` worker (the Inngest connect worker bridge)

**Claim (Async Runtime spec):** The Inngest `connect` outbound WebSocket worker is described as running inside the async entrypoint under bootgraph lifecycle. The spec says "open connect worker inside the async entrypoint" without specifying the Effect-native integration point (no `Layer`, `EffectRuntimeAccess`, or `ManagedRuntimeHandle` reference).

**Authoritative spec status:** The runtime spec §19 defines `WorkflowDispatcherDescriptor` and `WorkflowDispatcher` as the async surface integration. The async harness is named. But the Inngest `connect` worker lifecycle — specifically: is it a `BootResourceModule` in the bootgraph? does it acquire via `providerFx.acquireRelease`? — is not locked in the authoritative spec. The Inngest harness section covers `FunctionBundle` construction and `defineAsyncStepEffect`, not the connect worker lifecycle itself.

**Classification: (b) implied but not realized.** The runtime spec provides the vocabulary; the connect worker's Effect Layer/bootgraph integration is unstated in both specs. This is a missing seam — the async spec says it happens inside the bootgraph and the runtime spec says the Inngest harness handles mounting, but the bridge is not drawn.

### MAWE: Provider-boundary law and runtime compiler preflight

**Claim (MAWE spec §11, §29):** "Runtime compiler / workflow preflight rejects unsupported profiles before run start; silent degradation forbidden." And `ProviderCapabilitySet` validation happens at compilation time.

**Authoritative spec status:** The runtime spec defines the compiler with "provider coverage/closure/cycle" validators. A `ProviderCapabilitySet` validation pass at compilation is consistent with this but not specifically enumerated. The runtime spec does not name `ManagedAgentWorkspaceResource` or MAWE-specific compiler checks.

**Classification: (b) implied but not realized.** The MAWE spec asserts a compiler gate that the authoritative spec's framework supports but does not enact.

### MAWE: Provider-boundary law on service credential access (§21.5)

**Claim (MAWE spec §21.5):** "Managed agent workspaces do not receive ambient service credentials. If a managed agent needs to call a RAWR service, access must flow through an explicit tool, MCP connector, server/internal API, or product tool bridge that carries actor context and respects service authorization."

**Authoritative spec status:** The runtime spec's service binding cache section explicitly states it "excludes invocation" — service bindings are construction-bound. The law that managed agent workspaces cannot access service credentials directly is **implied** by the service binding model but not stated as a managed-agent-specific rule in the authoritative spec.

**Classification: (a) already in runtime spec** via the service binding cache law, though not named for the managed-agent case specifically. Not a gap but worth naming.

### OPENSHELL/ASYNC: Durable event bus ownership

**Claim (OpenShell spec §23.4):** "there is one durable orchestration layer; shell, server, schedules, and observations all feed the same durable event plane; shell requests do not introduce a second queue or a synchronous proxy chain just to create work."

**Claim (Async Runtime spec §2 goals):** "The architecture must not introduce a second queue in front of the workflow runtime. Durable orchestration belongs to one system."

**Authoritative spec status:** The runtime spec names Inngest as durable async and defines `WorkflowDispatcher` as the RAWR-owned interop. Whether the durable event bus is a runtime-spec primitive (a first-class `BootResourceModule`) or simply the Inngest connection the async harness manages is not locked. The runtime spec reserves "durable workflow semantics" to Inngest and defers the async surface adapter to the harness — but who owns the event key/schema registry, the emit path from `agent`, and the signing model are all silent.

**Classification: (d) deferred work named in runtime spec.** The authoritative spec explicitly reserves the async surface semantics outward to companion specs. The two shape-correct specs provide the claimed invariant but no spec closes the event-key/signing-key/schema-evolution loop.

## Cross-spec consistency verdict

### Position A: Per-spec A grades transfer to system-level A grade

The strongest argument for system-level A: every shape-correct spec has explicit `runtime_authority: no`, restates the runtime law verbatim, uses the authoritative spec's vocabulary, and subordinates its runtime-shaped claims to the authoritative spec. The policy subordination is universal and explicit. The shape-correct specs do not contradict the authoritative spec on any claim found in the corpus notes — there are no contradictions, only silences. If the test for system-level A is "no conflicts," the corpus passes.

**Best evidence for this side:** Auth spec §10.1's `ServiceBindingCacheKey` exclusion claim is internally consistent with the runtime spec's service binding cache definition. MAWE spec's resource lifetime declarations use runtime vocabulary correctly. OpenShell spec §1's explicit subordination list names the runtime chain and explicitly says "does not redefine." The service package shape reference even enumerates twelve known drift points and labels each (boundary pollution / accidental drift / intentional migration / etc.), showing active reconciliation work in progress.

### Position B: Per-spec A grades, system-level B grade

The strongest argument for system-level B: the shape-correct specs invoke runtime-shaped claims that the authoritative spec has not yet locked. The test for system-level A is not "no contradictions" but "complete integration law across all seams." On that test, the corpus fails on at least three load-bearing seams:

1. **Inngest connect worker as Effect Layer** — neither spec closes this seam. The async worker exists, uses the bootgraph, but its Effect-native realization is unspecified.
2. **Agent role's direct durable-event-emission rights** — the OpenShell spec asserts it; the authoritative spec does not canonically grant or deny it. The WorkflowDispatcher section covers how dispatching works, not who may dispatch.
3. **Auth-specific compiler gate list** — the auth spec contributes a list of compiler checks; the compiler is runtime-spec territory; the handoff is not formally locked in the runtime spec.

**Best evidence for this side:** The Async Runtime spec analysis explicitly names the missing Effect bridge as "the biggest reconciliation owed to the Effect Runtime Realization spec." The OpenShell spec's direct-emission claim is a runtime-authority question the spec itself acknowledges by saying "must be canonically blessed." The service package shape reference lists itself as "not reconciled on twelve axes."

## Evidence synthesis

Six vault notes were read. All six shape-correct specs carry the correct subordination metadata and language. No shape-correct spec directly contradicts the authoritative spec. The reconciliation surface is not contradiction-shaped — it is **gap-shaped**: the shape-correct specs invoke runtime-adjacent claims the authoritative spec has reserved or left as integration hooks without locking the specific behavior.

The five named items in the locus (auth's `ServiceBindingCacheKey`, OpenShell's direct-emission, Async-Runtime's missing Effect Layer, MAWE's provider-boundary law, durable-event-bus ownership) break down as follows:

- **Auth's `ServiceBindingCacheKey`**: already realized in the authoritative spec. Not a gap.
- **OpenShell's direct-emission**: implied but not realized. The WorkflowDispatcher section exists; per-role emission rights are not locked.
- **Async-Runtime's missing Effect Layer for connect worker**: implied but not realized. The async harness section exists; the connect worker's bootgraph/Effect bridge is unstated.
- **MAWE's provider-boundary law**: implied but not realized at the level of named compiler gates. The framework supports it; the gate is not committed.
- **Durable-event-bus ownership**: deferred work explicitly named in the runtime spec (Inngest harness + async surface reserved outward).

Of the five, three are genuine integration-law gaps (OpenShell direct-emission, connect worker Effect Layer, durable-event-bus closure); one is cleanly realized (ServiceBindingCacheKey); one is framework-implied but not committed (MAWE compiler gate).

The Workstream Review spec [[rawr-workstream-review-subsystem-spec-analysis]] introduces a fourth gap: its `EvaluatorSpec.kind = "system-command"` gate runner and its 16-event durable event model both need runtime realization (gate-runner as a bootgraph module? event outbox as a first-class primitive?) that neither the workstream review spec nor the authoritative spec has locked.

## Committed position

The corpus **fails the system-level A grade test** on integration-law grounds, not on contradiction grounds. Each shape-correct spec is individually well-formed and internally consistent — the per-spec grades (A, A-, B+) are warranted. But three reconciliation items are not yet closed as integration law, which means the corpus is a B+ system: excellent policy-level alignment, incomplete execution-seam closure. The top three blocking items are: **(1) Inngest connect worker as a bootgraph-integrated Effect Layer** — the Async Runtime spec asserts it lives in the bootgraph, the runtime spec defines the async harness, but the bridge (which `BootResourceModule`, which `providerFx.acquireRelease` or equivalent, which Layer scope) is unstated in both specs, creating a genuine mount-time seam that cannot be implemented without interpretation; **(2) agent-role direct durable-event-emission rights** — the OpenShell spec's "shell does not need a fake synchronous server route just to create work" asserts `WorkflowDispatcher` access from the `agent` role, but the runtime spec's `WorkflowDispatcher` section does not enumerate per-role emission rights, leaving a runtime-authority question answered only by the shape-correct spec that lacks the authority to answer it; **(3) auth-specific compiler gate closure** — the auth spec contributes a gate list (provider coverage, public-by-omission detection, redaction coverage) that the runtime compiler must execute, but this list is not locked in the compiler section of the authoritative spec, meaning the compiler contract is incomplete until the authoritative spec either absorbs these gates or explicitly delegates them to a locked companion. The durable-event-bus ownership gap is real but is correctly classified as deferred work already named in the runtime spec — it is scheduled, not missing. `ServiceBindingCacheKey` is cleanly realized. System-level A requires closing all three blocking items in the authoritative runtime spec before the landscape can be graded at grade level across every seam.

- **Position:** The RAWR spec corpus is per-spec A/A-/B+ but system-level B+ because three integration-law seams (connect worker Effect Layer, agent-role emission rights, auth compiler gates) are shape-asserted by shape-correct specs but not yet locked in the authoritative runtime spec.
- **Confidence:** high — the evidence is direct (every gap named above is traceable to an explicit silence in the authoritative spec note vs. an explicit claim in the shape-correct spec note).
- **Boundary conditions:** This position applies to the spec corpus as of the current vault snapshot. If the authoritative runtime spec has been updated since the corpus analysis was locked (e.g., §19 expanded to enumerate per-role WorkflowDispatcher access, or the bootgraph section expanded to name the connect worker module), the gaps narrow. The position holds for the corpus as analyzed.
- **What would change this position:** (a) Evidence that the authoritative runtime spec §19 enumerates per-role WorkflowDispatcher/durable-event-emission rights — that would close gap 2. (b) Evidence that the bootgraph section of the authoritative spec commits a named `BootResourceModule` for the Inngest connect worker — that would close gap 1. (c) Evidence that the compiler section of the authoritative spec incorporates the auth-specific gate list by reference or absorbs it — that would close gap 3. If all three are closed, the system-level grade rises to A.
- **Evidence weight:** 6 vault notes read (1 authoritative, 5 shape-correct). 3 explicit integration-law gaps confirmed; 1 item (ServiceBindingCacheKey) found to be already realized; 1 item (durable-event-bus) confirmed as scheduled deferred work. No contradictions found across all six notes. The service package shape reference separately confirms 12 open reconciliation axes between itself and the runtime spec, corroborating the general pattern.

## Open questions

- Does the authoritative runtime spec's §19 WorkflowDispatcher section enumerate per-role emission rights, or is that assumed implicit? (Source not read at full depth on this subsection.)
- Does the bootgraph section (§17) of the authoritative spec name any named Inngest-connect `BootResourceModule`, or is that entirely inside the harness section?
- The Workstream Review spec's gate-runner (`EvaluatorSpec.kind = "system-command"`) implies a process-execution surface. Is that a runtime-spec primitive, a harness, or a service-level concern? Not resolved.
- Are the 12 reconciliation axes named in the service package shape reference tracked anywhere as a formal reconciliation backlog? If not, they are invisible to the cross-spec review process.
- Does the factory bundle export spec or the system architecture spec add additional runtime-shaped claims not covered here?

## Sources

1. [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] — authoritative runtime spec note (ground truth)
2. [[rawr-authentication-subsystem-spec-analysis]] — auth subsystem spec note
3. [[rawr-async-runtime-spec-analysis]] — async runtime spec note
4. [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]] — OpenShell spec note
5. [[rawr-managed-agent-workspace-execution-spec-analysis]] — MAWE spec note
6. [[rawr-workstream-review-subsystem-spec-analysis]] — workstream review spec note
7. [[rawr-service-package-effect-vendor-integration-shape-reference]] — service package shape reference note
