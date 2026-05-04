---
title: RAWR System Architecture — spec analysis
id: rawr-system-architecture-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:39:58.210543Z'
updated: '2026-05-01T21:10:15.695518Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_System_Architecture_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_System_Architecture_Canonical_Spec.md
- runtime_authority: no
- meta_spec: yes (this is the umbrella architecture spec — the "table of contents" and ontology root for the rest of the corpus)

## Scope and purpose

This is the umbrella/META architecture spec for RAWR HQ and apps built on the same shell. It fixes the durable ontology, the public SDK posture, the role/surface model, the runtime realization lifecycle, the operational mapping on service-centric platforms, the relationship between the human-facing `agent` role and the durable steward execution role on `async`, and the enforcement orientation. It explicitly positions itself as "the canonical integrated plug-and-play architecture layer" to which subsystem specifications attach at explicit integration boundaries — so it is not authoritative on runtime semantics in the deep sense (the Effect Runtime Realization spec is), but it IS authoritative on architectural shape, vocabulary, ownership law, and where every subsystem is allowed to plug in. Among all twelve specs in the corpus this is the one that names where everything else slots in, and it is also the closest peer/companion to the runtime spec at the architectural layer.

## Concern coverage (in the spec's own terms)

- Top-level decomposition into 5 canonical repository roots: `packages`, `resources`, `services`, `plugins`, `apps`.
- Stable semantic nouns: package, resource, provider, service, service family, plugin, app, app composition, manifest, role, surface, repository, entrypoint.
- Runtime realization nouns: SDK derivation, runtime compiler, bootgraph, provisioning kernel, process runtime, surface adapter, harness, RuntimeAccess / ProcessRuntimeAccess / RoleRuntimeAccess, RuntimeCatalog, process, machine, platform service.
- Resource/provider/profile model: `RuntimeResource`, `ResourceRequirement`, `ResourceLifetime`, `RuntimeProvider`, `ProviderSelection`, `RuntimeProfile`, process resource, role resource, invocation context, call-local value.
- Service-boundary lanes: `deps`, `scope`, `config`, `invocation`, `provided`.
- Agent subsystem nouns: channel surface, shell surface, tool surface, steward, trusted operator boundary, shell gateway.
- Service model: posture, ownership, non-ownership, dependency helpers (`resourceDep`, `serviceDep`, `semanticDep`), `defineService`, procedure contracts, golden service shell, repository/db/policy seams, cross-service calls, shared-DB rules.
- Plugin model: factory shape, lane index (topology+builder agreement), public API vs trusted internal projection, async projection lowering, CLI/web/agent/desktop projection.
- App model: composition file, `defineApp`, runtime profiles, entrypoints, `startApp`, service-centric platform mapping.
- Runtime realization: lifecycle phases (definition → selection → derivation → compilation → provisioning → mounting → observation), import safety, SDK derivation, runtime compiler, bootgraph, provisioning kernel, runtime-owned lifetimes, runtime access, service binding, workflow dispatcher, surface adapter lowering, harness boundary, RuntimeCatalog/diagnostics/telemetry.
- Roles & surfaces: `server`, `async`, `web`, `cli`, `agent`, `desktop` (peer roles, not subtypes), shell-vs-stewards split, ingress/execution law, trusted operator boundary rule.
- Agent shell & steward activation: OpenShell posture, canonical runtime binding table, shell activation flow, internal/product-triggered activation, direct-vs-delegated work, default shell posture.
- Stack binding: oRPC, Elysia, Inngest, OCLIF, web hosts, OpenShell, desktop hosts, shell gateway — with explicit harness postures per role.
- Operational mapping & growth: default topology, baseline local posture, trusted shell placement, optional cohosted dev mode, service-centric production default ("one platform service per long-running role"), desktop operational mapping, growth model (split at app boundary).
- Schema/config/diagnostics/policy: `RuntimeSchema` facade, schema ownership split table, config and secrets rules, diagnostics taxonomy, telemetry layering, policy primitives, cache and control-plane boundaries.
- Mechanical enforcement: canon → graph → proof → ratchet.
- Canonical invariants (12 sub-classes), forbidden patterns, what remains flexible, final canonical picture (Mermaid).

## Platform-level signal — explicit naming of layers/levels

The user's research query proposes three platform levels: mechanical/operational, coordination, governance. **This spec does NOT use those exact names**, but it DOES explicitly name a small fixed set of architectural separations and layers that map cleanly onto the three-level question:

- **Three durable separations** (verbatim): "semantic separation", "realization separation", "authority separation for the human-facing agent subsystem".
- **The stable architecture layer** (verbatim): `app -> app composition -> role -> surface`.
- **The runtime realization lifecycle** (verbatim, 7 phases): `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`.
- **The operational mapping** (verbatim): `entrypoint -> platform service -> replica(s)` — explicitly described as "an operational mapping, not a core ontology layer".
- **The load-bearing platform chain** (verbatim): `bind -> project -> compose -> realize -> observe`.
- **Shell-vs-steward authority law** (verbatim): "the shell drives what / the stewards drive how / governance decides whether".

Mapping to the user's proposed three levels:

| User's proposed level | Spec's natural counterpart |
|---|---|
| Mechanical / operational / runtime / core platform | Runtime realization lifecycle (7 phases) + operational mapping (`entrypoint -> platform service -> replica(s)`) + the stack-binding chapter naming oRPC/Elysia/Inngest/OCLIF/web/OpenShell/desktop |
| Coordination (signals from outside world) | The ingress and execution law (Section 4.10): "external product ingress enters through server / external conversational ingress enters through agent / durable system work runs on async" — plus shell gateway, channels, agent role |
| Governance (decisions over time) | Shell-vs-steward law (Section 4.11), trusted operator boundary rule, control-plane invariant, policy primitives table, mechanical enforcement orientation (canon → graph → proof → ratchet) |

The spec's own primary layer-cake is **support / truth / projection / app-selection / SDK derivation / runtime realization / native harness boundaries** (visible in the Section 20 final Mermaid). That cuts somewhat orthogonally to the user's three levels — the spec's primary axis is *what owns this concern*, while the user's axis is *which platform tier does this concern live in*. Both fit; the spec's axis is finer-grained and slightly different.

The spec is explicit that some lines are NOT layers: "That last line [`entrypoint -> platform service -> replica(s)`] is an operational mapping, not a core ontology layer."

## Vendor integration philosophy at the system level

This spec NAMES the "stand on shoulders of giants" pattern as a canonical principle, even though it doesn't use that exact phrase. The exact framings are:

- **Section 10.1 Runtime realization stance** (verbatim): "RAWR owns semantic meaning. Effect owns provisioning mechanics inside runtime. Boundary frameworks keep their jobs."
- **Section 13 Stack binding** (verbatim): "Effect stays inside runtime realization. oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, and OpenShell keep their jobs."
- **Section 4.9 Harness and substrate choice are downstream** (verbatim): "harness choice != semantic meaning / substrate choice != semantic meaning. Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts are native interiors behind RAWR-shaped boundaries. They are not peer semantic owners."

Each vendor is named with its job:

| Vendor | RAWR-named job |
|---|---|
| Effect | Process-local provisioning substrate beneath bootgraph and process runtime; "scoped acquisition, release, runtime ownership, and process-local coordination". Quarantined inside runtime/provider/harness implementation boundaries. |
| oRPC | Default local-first callable boundary for services and synchronous callable surfaces; "owns procedure and transport mechanics; the service owns the meaning". |
| Elysia | Default HTTP harness for server runtime composition; "owns HTTP host lifecycle and request routing". |
| Inngest | Default durable async harness for workflow execution and steward activation; "owns durable async execution semantics". |
| OCLIF | Default CLI command harness; "owns command execution semantics". |
| OpenShell | Default runtime substrate and policy envelope beneath the shell-facing part of the `agent` role. |
| Web hosts | "Own rendering, bundling, routing, and browser-native behavior inside their boundary". |
| Desktop hosts | "Own native desktop interiors". |

The integration pattern is uniform: native mechanics live in the vendor; semantic meaning, app membership, provider selection, and runtime provisioning stay RAWR-side.

## Don't-own-still-manage frontier

This spec **explicitly names** the "don't own / still manage" stance as a system-level architectural law. Strongest single statement (Section 4.1, verbatim):

> "RAWR owns boundaries and runtime handoffs. Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads."

The spec also names the management-from-the-integration-point pattern through:
- Surface adapters as the only layer that translates compiled surface plans into native payloads.
- Harnesses as the only consumers of mounted surface runtimes or adapter-lowered payloads.
- The stack-binding sections (13.1–13.6) where every harness posture is the same shape: services → plugins → AppDefinition → startApp → SDK → compiler → bootgraph → provisioning → process runtime → surface adapter → vendor harness.
- The forbidden pattern "harnesses consuming SDK graphs or compiler plans directly" — i.e., the integration point is policed by RAWR.

Silences / under-specified frontiers (where the spec leans on a vendor without naming the integration-point ownership in detail):
- Web host integration (Section 13.4): minimal — RAWR hands payloads to "selected web host" without specifying the contract shape for SSR vs CSR vs RSC, deployment lifecycle, or how routes/clients are projected.
- Desktop harness integration (Section 13.6): the desktop hosts' "native desktop interiors" are explicitly out of scope; menubar/window/background contracts are sketched but the IPC surface is "implementation detail".
- Shell gateway (channel side): named as "trusted-operator ingress and delivery boundary above the shell runtime" but channel vendor implementations are listed under "what remains flexible".
- AuthN/AuthZ at the API edge: appears as a plugin-server-API responsibility ("authentication and authorization policy at the API boundary") but is not given its own integration ownership.
- Persistence / Drizzle / database: named only as `services/<service>/src/db/{schema,migrations,repositories}` — generic SQL helpers are allowed in `packages/` but the Drizzle/PG/connection-pool integration ownership at the system level is not detailed (presumably handled in subsystem specs).
- Telemetry vendor (HyperDX, OTEL backends): named only as "telemetry backend/export protocol" under "what remains flexible".

So the frontier IS named at the architectural-principle level, but the spec deliberately punts vendor-specific integration depth to subsystem specs. This is consistent with its self-positioning as the "integrated plug-and-play architecture layer" with "explicit integration boundaries" where subsystem specs attach.

## Where the spec touches runtime — flag as shape-correct

Sections 10 (Runtime realization), 11 (Runtime roles and surfaces), 12 (Agent shell and steward activation), 13 (Stack binding), and several invariant subsections (17.6 Bootgraph and provisioning, 17.7 Service binding, 17.8 Runtime subsystem) cover runtime concerns extensively. Per the search plan, these are SHAPE-CORRECT, not authoritative — the Effect Runtime Realization spec is the gospel for runtime semantics. This spec's runtime content is consistent with the gospel (uses identical lifecycle phase names, identical lifetime taxonomy, identical RuntimeCatalog/RuntimeAccess vocabulary, identical bootgraph-vs-Effect-substrate split) but speaks at an architectural-shape level rather than at the precise compiled-plan / proof-obligation / law level.

Identified runtime-touching sections in this spec:
- 3.3 Runtime realization nouns
- 3.4 Resource and boundary nouns
- 4.3 Stable architecture vs runtime realization
- 4.5 bind/project/compose/realize/observe law
- 4.6 Projection and assembly law
- 4.9 Harness and substrate choice are downstream
- Section 7 (Resource, provider, and profile model) entire
- Section 10 (Runtime realization) entire
- Section 11 (Runtime roles and surfaces) entire
- Section 12 (Agent shell and steward activation) entire
- Section 13 (Stack binding) entire
- 15.1, 15.2 Schema, 15.3 Config, 15.4 Diagnostics, 15.5 Telemetry, 15.7 Cache and control plane
- 17.6, 17.7, 17.8 Runtime invariants

## Relationship to Habitat SDK Layers

This spec and the Habitat SDK Layers spec are likely heavy peers. This spec defines the SDK *posture* (Section 5.1 lists the canonical public SDK surfaces under `@rawr/sdk/...`) and the SDK *role* in derivation (Section 10.4), but defers the layer composition mechanics to the Habitat SDK Layers draft. The 12 listed SDK public surfaces (`@rawr/sdk/app`, `/service`, `/plugins/{server,async,cli,web,agent,desktop}`, `/runtime/{resources,providers,profiles,schema}`) form the contract this architecture spec assumes the SDK exposes; the Habitat SDK Layers spec presumably specifies how those surfaces are layered, what their composition rules are, and how `RuntimeSchema` fits in.

## Cross-spec dependencies

This spec implicitly references / is the umbrella for:
- RAWR Effect Runtime Realization System Canonical Spec — explicitly named in the spec's runtime substrate ("Effect-backed provisioning kernel"); this is the runtime authority below this spec's architectural shape.
- RAWR Authentication Subsystem — implicitly the authority for plugin-server-API auth (Section 8.5).
- RAWR Async Runtime Canonical Spec — runtime semantics for the `async` role and Inngest harness (Sections 11.3, 13.2).
- RAWR Deployment Subsystem — explicitly carved out: "Deployment and control-plane architecture own multi-process placement policy" (Section 15.7).
- RAWR OpenShell Agent Runtime + Steward Activation Spec Final — directly named as the substrate beneath `agent` (Section 12.1) and as the source of shell activation flow (12.3).
- RAWR Managed Agent Workspace Execution — implicitly the authority for steward-scoped worktrees on `async`.
- Habitat SDK Layers Draft — implicit peer for SDK derivation mechanics.
- RAWR Factory Bundle Export — implicit referent for "selected generated artifacts" and `FunctionBundle` (named in 8.7).
- RAWR Workstream / Workstream Review subsystems — named conceptually as "stewards" / "governed steward execution" / "RFD state" (Sections 11.8, 12.5) but without owning their semantics.
- RAWR Authoring Classifier System — implicitly the authority for "topology plus builder agreement" classification (Section 5.5, 8.3).

## Verbatim load-bearing definitions and claims

1. (§1 Scope) "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries."
2. (§1) "scale changes placement, not semantic meaning"
3. (§1) "make execution explicit / without introducing a second public semantic architecture"
4. (§2) "bind -> project -> compose -> realize -> observe"
5. (§2) "definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation"
6. (§4.1) "Services own truth. Plugins project. Apps select. Resources declare capability contracts. Providers implement capability contracts. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe."
7. (§4.1) "RAWR owns boundaries and runtime handoffs. Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads."
8. (§4.7) "shared infrastructure != shared semantic ownership"
9. (§4.8) "namespace != owner"
10. (§4.9) "harness choice != semantic meaning / substrate choice != semantic meaning"
11. (§4.10) "external product ingress enters through server / external conversational ingress enters through agent / durable system work runs on async"
12. (§4.11) "the shell drives what / the stewards drive how / governance decides whether"
13. (§10.1) "RAWR owns semantic meaning. Effect owns provisioning mechanics inside runtime. Boundary frameworks keep their jobs."
14. (§10.6) "RAWR plans identity, order, dependency, lifetime, and boundary policy. Effect executes scoped acquisition, release, runtime ownership, and process-local coordination."
15. (§13) "Effect stays inside runtime realization. oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, and OpenShell keep their jobs."
16. (§14.6) "one platform service per long-running role"
17. (§16) "canon -> graph -> proof -> ratchet"
18. (§17.12) "There is no generic shadow control-plane layer by default. The shell is not the control plane."

## Completeness signals

- **Authoritative-feeling**: ontology, ownership law, role/surface model, runtime realization lifecycle vocabulary, operational mapping, forbidden patterns, canonical invariants, RuntimeCatalog/RuntimeAccess split, shell-vs-steward authority law, ingress/execution law. These read as locked.
- **Exploratory or deferred-to-subsystem**: web host integration internals, desktop IPC and security policy details, shell gateway implementation, channel vendor implementations, OpenShell policy adapters, code generation around route/registry collection, RuntimeCatalog persistence backend, runtime telemetry export protocol, exact bootgraph internal decomposition, exact `RuntimeSchema` module decomposition.
- **No explicit TBD/TODO markers**. The spec uses Section 19 "What remains flexible" as the explicit deferral zone, listing 21 items where details may vary "without reopening the architecture". This is more polished than typical TBD-laden drafts.
- **No Phase N / Milestone M markers**. The spec is timeless rather than phased.
- **Cross-references implicit, not explicit**. The spec leans on subsystem specs (Effect Runtime Realization, OpenShell, Authentication, Deployment, Async Runtime, etc.) without naming them by file path. A reader needs the corpus map to find the authoritative downstream spec for any given concern.
- **Authoritative-feeling on architecture, exploratory on implementation**: the canonical posture is locked, but every "exact …" detail is allowed to vary. This is the spec's deliberate design: it is the META spec, so it codifies vocabulary and authority while leaving mechanics to subsystem specs.

## Estimated completeness grade — A

Justification: For its claimed scope (the canonical integrated plug-and-play architecture layer that names the ontology, the laws, and the integration boundaries where subsystem specs attach), this spec is essentially complete and self-consistent. It names every load-bearing noun, every ownership law, every forbidden pattern, every invariant, and every vendor integration role. It explicitly carves out what is "flexible" (Section 19) and what is "forbidden" (Section 18). It does not pretend to be the runtime authority — that role belongs to the Effect Runtime Realization spec — but at the architectural-shape level it covers all six roles, all stack-binding postures, the agent/steward authority split, the operational mapping for both service-centric platforms and desktop, and the mechanical enforcement orientation. The few weaknesses (no explicit cross-references to subsystem specs by path, web/desktop integration depth deferred, AuthN/Z and persistence vendor integration only sketched) are appropriate for a META spec and do not damage its claimed scope.
