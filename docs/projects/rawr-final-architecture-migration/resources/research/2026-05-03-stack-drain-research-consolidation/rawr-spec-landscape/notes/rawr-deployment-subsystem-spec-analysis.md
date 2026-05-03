---
title: RAWR Deployment Subsystem — spec analysis
id: rawr-deployment-subsystem-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:35:41.330701Z'
updated: '2026-05-01T21:10:18.105193Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Deployment_Subsystem_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Deployment_Subsystem_Canonical_Spec.md
- runtime_authority: no

## Scope and purpose

The RAWR Deployment Subsystem spec defines how runtime-realizable process shapes are placed on operational targets, built into runnable artifacts, translated to platform-specific configuration, and observed through deployment catalogs and diagnostics. It owns the bridge from runtime shape to platform workload — placement, build, platform translation, source-change policy, ingress posture, env/secret/resource bindings, and handoff diagnostics — without owning service truth, plugin projection, app composition, runtime provisioning, or runtime execution. It deliberately stays a "control plane" subsystem rather than a new semantic layer, and pins itself as **shape-correct** (not authoritative) on any runtime semantics it touches by deferring to the Effect Runtime Realization spec.

## Concern coverage

- **Deployment lifecycle phases**: definition → target selection → runtime handoff resolution → placement compilation → build realization → artifact emission → platform handoff → observation (eight phases, all named and assigned producers/consumers/gates).
- **Build pipeline / packaging**: Railpack (default OCI builder), Dockerfile, prebuilt image, platform-native, scripted; Railpack modes platform-native / prepare-plan / buildkit-frontend / cli-build; image sharing law (one image, many process shapes via command).
- **Deployment targets**: Railway (canonical default remote), Docker Compose, generic OCI, local-process, desktop-bundle, Fly (optional), Kubernetes (optional), custom.
- **Environment management & config bindings**: `EnvBinding`, `SecretBinding`, `PlatformResourceBinding`, runtime-profile/deployment-profile separation, platform resource → binding → runtime config → provider chain.
- **Secrets**: secret names yes, values never; build-secret vs runtime-secret separation; secret leak diagnostic class; secret manager vendor reserved as a seam.
- **Cutover / rollback / promotion**: explicitly **reserved** ("Release promotion", "Blue/green/canary rollout") — phase-deferred to platform adapter / deployment observation when "rollout semantics become product-visible." Rollback appears as observation status (`rolled-back`) but its mechanics are not specified.
- **Healthchecks**: `DeploymentHealthcheckPolicy` with http / tcp / command / none kinds; required for public server/web placements; explicit "none" with reason allowed for workers.
- **Process startup / lifecycle (shape-correct touch)**: the spec describes process-shape `defaultCommand`, `gracefulShutdownSeconds`, `singleton`, `localAuthority`, `longRunning`, restart policy — but is careful: deployment "does not start a RAWR process," does not call `startApp(...)`, does not assemble runtime. These touches are reconciled to runtime realization via `ProcessBoundaryMetadata` (a deployment-safe read model) and `CompiledProcessPlanSnapshot` (compile-only).
- **Observability bootstrap**: `DeploymentTelemetry`, `DeploymentDiagnostic`, `DeploymentCatalog`, `DeploymentObservation` with redaction; runtime catalog correlation after startup.
- **Source-change policy**: `SourceChangePolicy` for redeploy triggers (watch/ignore, lockfiles, runtime profile, process catalog, deployment profile inclusion).
- **Ingress / trust posture / network**: `IngressPolicy` (public/private/internal/none × public/trusted-first-party/trusted-operator/internal-system/durable-steward/local-dev), `NetworkPolicy`, integration law with auth subsystem.
- **Scale**: `ReplicaPolicy` (min/max/fixed/regions/autoscale-by-metric); singleton/local-authority safety diagnostics.
- **Predeploy / migration tasks**: `PredeployTask` (deployment-control concern; does not own migration truth).
- **Repository topology**: `packages/core/deployment/*`, `packages/core/sdk/src/deployment/*`, `apps/<app>/deployment/profiles/*`, generated artifacts under `.rawr/deployment/<app>/<profile>/*`.
- **Public SDK surface**: `@rawr/sdk/deployment`.
- **Authority planes**: 9 named planes (authoring, selection, runtime handoff, planning, build realization, platform translation, platform operation, observation, classification axes).

## Platform-level signal

Primarily **Coordination / Cross-cutting** — specifically the *control plane between runtime realization and platform operation*. It is not Core Runtime (it explicitly does not own runtime), and it is not Governance (it does not own decisions over time). It coordinates: it consumes app composition, runtime profile selection, process catalog, runtime compiler compile-only output, and target/adapter selection, and produces a deployment plan handed off to vendor-owned platforms (Railway, Compose, OCI, Fly, K8s, local supervisors, desktop packagers). It also straddles Cross-cutting because it must integrate with the auth subsystem (trust boundary), runtime subsystem (handoff), service subsystem (predeploy task migration commands), and observability (catalog correlation).

## Vendor integrations declared

- **Railway**: canonical default remote service-centric adapter; `ProcessShapeDefinition → Railway service placement`, `PlacementBinding.command → Railway start command`, `BuildStrategySelection → Railway builder/Dockerfile/image strategy`, `SourceChangePolicy → Railway watch paths`, `IngressPolicy → Railway public/private networking posture`. Railway is positioned as a *target adapter* not a runtime authority — Railway "does not decide app membership, role composition, process-shape identity, or provider selection." Native strength: managed service supervision, networking, scaling, healthchecks.
- **Railpack**: canonical default image builder for TypeScript/JavaScript apps; **explicitly de-coupled from Railway** ("Railpack does not make Railway the platform target"). Used in platform-native (Railway invokes), prepare-plan (RAWR emits `railpack-plan.json` + `railpack-info.json`), buildkit-frontend (BuildKit/buildctl consumes plan), and cli-build modes.
- **Docker / BuildKit / Dockerfile / Docker Compose / buildx / bake**: explicit build strategies and adapters; Compose is a local/self-hosted target; Dockerfile is preferred when OS-level/native/security/multi-stage is required.
- **Generic OCI / registries (e.g. ghcr.io)**: image + command + env + secrets + ingress + replicas as the canonical handoff packet.
- **Fly, Kubernetes**: optional adapters when "earned"; reserved seams.
- **CI / GitHub Actions-style workflows**: handoff modes (manual/cli/api/ci/registry/local); generated CI workflow snippets allowed as platform artifacts.
- **Local process supervisors / desktop packagers**: canonical local-process and desktop-bundle adapters.
- **Effect / Runtime compiler**: deployment defers to runtime compiler for compile-only `CompiledProcessPlanSnapshot` and `ProcessBoundaryMetadata`. Strict invariant: deployment "may compile and inspect process plans; may not provision, bind, lower, mount, or execute runtime plans."
- **Auth subsystem**: integration law — "deployment declares exposure and trust boundary; harness normalizes native ingress; auth verifier verifies credential material; plugin admits caller class; invocation carries actor context; service authorizes domain action."
- **Runtime catalog**: bidirectional correlation references (deployment plan id → runtime catalog ref and vice versa), but observation only, not authority transfer.

The "stand on shoulders of giants" pattern is explicit in §4.1, §17–§18, and §15: each vendor is used at its native strength (Railway = service supervision, Railpack = image inference, Docker = explicit OS-level builds, BuildKit = OCI assembly, Compose = local multi-process, OCI registries = image distribution).

## Don't-own-still-manage frontier

This spec is one of the cleanest examples in the RAWR corpus of the "don't own, still manage" frontier:

- **RAWR does not own** platform supervision, image build execution, registry authentication, autoscaling algorithms, blue/green rollout mechanics, region/cost policy, secret manager vendor selection, managed database provisioning, K8s/Fly/Railway internals, or the actual dashboard configuration in vendor UIs.
- **RAWR still manages** all of these from the integration POV via: target refs (`DeploymentTargetRef`), placement bindings (`PlacementBinding`), build strategy refs, source-change policy, env/secret/resource binding refs, ingress/network/replica/health policy, generated artifacts, observation correlation, and platform-specific config files generated as projections of `DeploymentPlan` (never source of truth).

Notable acknowledged silences / "reserved seams":
- Exact Railway API automation reserved (config artifact emission and CLI/API handoff both valid).
- Exact Fly / K8s adapters reserved (add when needed).
- Managed database provisioning reserved (bind outputs into runtime config; do not make platform DB service truth).
- Registry authentication reserved.
- Release promotion reserved (no environment-progression mechanics).
- Blue/green/canary rollout reserved.
- Autoscaling algorithm reserved (`ReplicaPolicy` only names intent).
- Cost/region policy reserved.
- Secret manager vendor reserved (`SecretBinding` shape stable).

The spec also explicitly defers exact persistence/storage/indexing/retention of `DeploymentCatalog` and exact CI executor implementations.

## Completeness signals

- **Phase markers / deferred work**: §30 "Reserved detail boundaries" enumerates 10 named reserved seams with fixed owners — this is a strong completeness boundary, not a gap. The spec is explicit that "Reserved does not mean unknown. It means the seam is named and the owner is fixed."
- **Status: Canonical** (frontmatter), so spec presents itself as authoritative on deployment shape.
- **No explicit TBD/TODO markers** found in body.
- **Runtime authority deferral**: Wherever runtime semantics are touched (process startup, lifecycle, healthchecks, graceful shutdown, restart policy, harness mounting, provider acquisition), the spec carefully bounds itself to declarative metadata and delegates execution truth to Effect Runtime Realization. This is a deliberate authoritative-on-shape / non-authoritative-on-runtime stance.
- **Authoritative-feeling**: §1–§13 (purpose, ownership matrix, separations, topology, authoring contracts, planner outputs, lifecycle), §15–§18 (Railpack and Docker postures, platform adapter model, Railway adapter), §29 (enforcement rules), §32 (canonical picture).
- **Exploratory-feeling**: none. The spec is consistently normative or explicitly reserved.
- **Cross-spec dependency thinness**: the spec implicitly depends on a rich Effect Runtime Realization spec (for `PortableRuntimePlanArtifact`, `CompiledProcessPlanSnapshot`, `ManagedRuntimeHandle`, `ExecutionRegistry`, harness plans) and on an Auth Subsystem spec (for verifier providers, admission, actor context). Both are referenced but not summarized; quality of integration depends on those specs being complete.
- **Coverage of its own scope**: thorough — every phase has named producer/consumer/gate, every artifact has owner/placement/diagnostics, every separation has a normative law, and every reasonable misuse pattern has a diagnostic code.

## Cross-spec dependencies

- **Defers to**: RAWR Effect Runtime Realization System Canonical Spec (runtime authority — provisioning, process runtime assembly, harness mounting, bootgraph, `ManagedRuntimeHandle`, `ExecutionRegistry`, RawrEffect, provider acquisition).
- **References**: RAWR Authentication Subsystem (verifier providers, trust boundary integration), RAWR App Composition (`defineApp`, `startApp`, plugin projection), RAWR Service Package (service truth, migrations, predeploy task targets), RAWR Async Runtime / OpenShell Steward (durable worker, steward-local process shape), RAWR System Architecture (canonical topology baseline).
- **Supersedes**: nothing explicitly, but it reframes any prior implicit "deployment = Railway config" thinking by introducing `DeploymentPlan` as source of truth and Railway/Compose/etc. as adapter targets.
- **Companion to**: Workstream / Workstream Review / Authoring Classifier / Managed Agent Workspace / Factory Bundle Export specs (deployment carries their process shapes but does not define them).

## Verbatim load-bearing definitions / claims

1. **§1 Purpose** — "The RAWR Deployment Subsystem turns selected, deployable RAWR process shapes into platform placement, build artifacts, generated platform configuration, handoff payloads, and deployment observations."
2. **§1 Non-ownership** — "It does not own service truth, plugin projection meaning, app identity, runtime provisioning, raw execution, harness mounting, durable async semantics, public API meaning, shell governance, desktop-native behavior, web framework semantics, or provider implementation."
3. **§1 Lifecycle order** — "definition -> target selection -> runtime handoff resolution -> placement compilation -> build realization -> artifact emission -> platform handoff -> observation".
4. **§1 Platform chain** — "bind -> project -> compose -> realize -> deploy -> observe".
5. **§3 Canonical thesis** — "apps declare what belongs and which process shapes may start / runtime proves what can be realized in one process / deployment places those process shapes on operational targets / builders produce runnable artifacts / platforms supervise instances / diagnostics correlate what was planned, emitted, handed off, and started".
6. **§3 Core invariant** — "service truth stays upstream / plugin projection stays upstream / app composition stays upstream / runtime realization stays process-local / deployment placement stays operational / platform artifacts stay generated projections".
7. **§3 Status** — "Deployment is a control-plane subsystem. It is not a new semantic layer."
8. **§5.4 Build strategy != target** — "Railpack, Dockerfile, prebuilt image, platform-native, and scripted build are build strategies. Railway, Docker Compose, generic OCI, local process, desktop bundle, Fly, Kubernetes, and custom targets are target families."
9. **§5.5 Image not process shape** — "One shared image may run many RAWR process shapes when each platform service supplies a different command."
10. **§5.11 Generated artifact not truth** — "generated platform artifacts are projections of DeploymentPlan".
11. **§11.3 Runtime handoff law** — "deployment may compile and inspect process plans / deployment may not provision, bind, lower, mount, or execute runtime plans".
12. **§15.1 Railpack posture** — "Railpack may be used wherever RAWR needs an inferred OCI image build plan / Railpack does not make Railway the platform target / Railpack detection does not own process-shape truth".
13. **§18.1 Railway mapping** — "Railway does not decide app membership, role composition, process-shape identity, or provider selection."
14. **§20.3 Auth/deployment law** — "deployment declares exposure and trust boundary / harness normalizes native ingress / auth verifier verifies credential material / plugin admits caller class / invocation carries actor context / service authorizes domain action".
15. **§32 Final rule** — "app declares what belongs / entrypoint selects what starts / runtime proves what can be realized / deployment chooses where it runs / builder produces what can be run / adapter emits how the platform sees it / platform supervises instances / diagnostics correlate what happened".

## Estimated completeness grade (initial impression)

**A** — The spec is exhaustive and disciplined within its declared scope. Every phase, artifact, separation, vendor adapter, and failure class has a named owner, normative law, and diagnostic code. Reserved seams (§30) are enumerated with named owners rather than left ambiguous. Where it touches runtime semantics, it explicitly cedes authority to the Effect Runtime Realization spec. The only reasons it isn't unambiguously perfect for the "don't-own-still-manage" frontier: rollout semantics (blue/green/canary), release promotion, and managed-DB provisioning binding details are reserved rather than specified — but they are *named* reservations with fixed owners, which is the spec's explicit completeness contract. Treat as authoritative on deployment-shape and as deferring correctly to Effect Runtime Realization on any runtime semantics.
