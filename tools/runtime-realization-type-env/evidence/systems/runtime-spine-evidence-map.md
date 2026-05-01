# Runtime Spine Evidence Map

This map organizes runtime-spine evidence by subsystem. It explains what each
cluster of evidence points to, why it matters, what it impacts, and where the
proof ceiling remains.

## How To Read This

| Need | Read |
| --- | --- |
| Current proof boundary | `../current-lab-state.md` and `../proof-manifest.json` |
| Migration-risk status | `../runtime-spine-verification-diagnostic.md` |
| Runtime subsystem evidence | `Evidence Cards` below |
| Vendor-specific facts | `../vendors/README.md` |
| Phase-specific detail | `../../phases/<phase>/workstreams/` |

Status terms (`proof`, `vendor-proof`, `simulation-proof`, `xfail`, `todo`,
`out-of-scope`) mean exactly what `../../guidance/guardrails-design.md`
defines.

## Evidence Cards

### Authoring, Descriptor Refs, And Portable Artifacts

- What it is: the facade and artifact layer that lets declarations compile
  into ref-addressable runtime material without carrying executable closures in
  portable artifacts.
- Current claim: `.effect(...)` is the runtime-realization execution terminal;
  descriptor refs are discriminated; portable artifacts carry refs only.
- System impact: keeps authoring, descriptor tables, registries, and deployment
  handoff separated.
- Evidence pointers: `accepted.effect-only-authoring`,
  `accepted.descriptor-ref.discriminated`, `accepted.portable-artifacts.refs-only`.
- Proof ceiling: type/shape proof only; production SDK extraction remains
  separate.

### Derivation And Compiler Spine

- What it is: explicit lab declarations and cold server route factories flowing
  into normalized graph artifacts, descriptor table inputs, service binding
  plans, route descriptors, dispatcher inventory, async owner-to-step artifacts,
  compiled plans, provider graph diagnostics, and bootgraph input.
- Current claim: derivation/compilation can preserve identity and produce
  compile-time artifacts without executing descriptor bodies or mounting hosts.
- System impact: defines the middle spine that later runtime-in-a-folder work
  can reuse or supersede deliberately.
- Evidence pointers: `simulation.middle-spine-derivation-compiler`,
  `simulation.dispatcher-descriptor-operation-inventory`,
  `simulation.async-step-owner-membership-artifacts`,
  `simulation.server-route-derivation-import-safety`.
- Proof ceiling: contained simulation; final public route import law, async
  membership syntax, dispatcher access policy, and production SDK extraction
  remain open.

### Provider, Bootgraph, Runtime Access, And Service Binding

- What it is: provider selection/coverage, provider acquire/release lowering,
  bootgraph startup/rollback/finalization, runtime resource access, and service
  binding cache behavior.
- Current claim: the Oracle proof harness can validate provider coverage/config,
  lower acquire/release through real Effect, order dependencies, roll back and
  finalize safely, pass provider-started values through sanctioned runtime
  access, and validate/cache service bindings by construction-time identity.
- System impact: de-risks the runtime-owned resource/provisioning spine while
  keeping public provider/runtime-access law fenced.
- Evidence pointers: `accepted.provider-not-execution-plan`,
  `accepted.provider-profile-closure`, `audit.p1.provider-effect-plan-lowering`,
  `simulation.bootgraph-catalog-finalization`,
  `simulation.service-binding-cache-runtime-access`,
  `audit.p2.provider-effect-process-spine`.
- Proof ceiling: contained simulation; final public `ProviderEffectPlan`,
  `RuntimeResourceAccess`, production config precedence, platform secret-store
  integration, refresh/retry policy, and production bootgraph integration
  remain open.

### Boundary Policy And Layer Disagreement

- What it is: records that preserve boundary kind, timeout metadata, retry
  declarations, interruption classification, Effect Exit/Cause classification,
  redaction, and disagreement between HTTP/vendor/RAWR/runtime layers.
- Current claim: contained oRPC and Inngest failure paths can preserve layer
  disagreement without turning transport success into false-green runtime
  success.
- System impact: protects future error/telemetry/public API design from
  collapsing distinct layers into one status bit.
- Evidence pointers: `audit.p1.effect-boundary-policy-matrix`,
  `audit.p3.layer-disagreement-failure-observation-proof`.
- Proof ceiling: contained record-only proof; final public policy API/DX,
  production retry/backoff, durable async policy, native host error mapping,
  product observability, and catalog persistence remain open.

### Server Host, oRPC, Elysia, And Harness Passage

- What it is: server route identity crossing adapter lowering, oRPC Fetch,
  Elysia app/request handling, Elysia/Bun local listen lifecycle, started server
  harnesses, and process-runtime delegation.
- Current claim: the contained lab can route a real local network request
  through Elysia -> oRPC Fetch -> Oracle server harness ->
  `ProcessExecutionRuntime`, stop that path, and reject post-stop delegation.
- System impact: de-risks the server-side host passage inside containment.
- Evidence pointers: `audit.p2.server-orpc-fetch-boundary`,
  `audit.p3.contained-elysia-host-passage`,
  `audit.p3.contained-elysia-listen-lifecycle-passage`,
  `audit.p3.integrated-live-passage-rehearsal-closeout`.
- Proof ceiling: no production HTTP serving, deployment/process supervision,
  TLS/proxy/load-balancer behavior, auth/logging policy, OpenAPI/product API
  policy, native host telemetry/error mapping, or Parent-Repo Migration
  readiness.

### Async/Inngest And Harness Passage

- What it is: async owner-to-step identity, Inngest client/function/Bun serve
  handoff, `step.run(...)` crossing, async bridge payloads, async harness
  lifecycle, and process-runtime delegation.
- Current claim: the contained lab can route a real Inngest Bun serve/function
  request through `step.run(...)` into the async harness and process runtime,
  including failure/status observation and post-stop rejection.
- System impact: gives a concrete async boundary passage to reason from while
  keeping durable workflow semantics outside the proof.
- Evidence pointers: `vendor.boundary.inngest-handoff-shape`,
  `audit.p2.async-inngest-function-step-boundary`,
  `audit.p3.started-process-assembly-stop-finalization-passage`,
  `audit.p3.integrated-live-passage-rehearsal-closeout`.
- Proof ceiling: no durable scheduling, retry, replay, idempotency, run
  history, production worker topology, final async membership syntax, or product
  async policy.

### Telemetry, Diagnostics, Catalog, And Control-Plane Observation

- What it is: redacted process/provider/catalog records, OTLP-shaped telemetry
  payloads, injected export, local HyperDX/OTLP ingest smoke, and
  non-persistent migration/control-plane packets.
- Current claim: contained records can be projected and exported without raw
  secrets/live handles and can correlate safe run/source/name/export summaries.
- System impact: de-risks observation shape and proof-boundary language before
  production telemetry/product observability decisions.
- Evidence pointers: `audit.telemetry.hyperdx-observation`,
  `audit.p2.telemetry-integrated-observation-spine`,
  `audit.migration.control-plane-observation`,
  `audit.p3.integrated-live-passage-rehearsal-closeout`,
  `systems/telemetry-observation-map.md`.
- Proof ceiling: no live HyperDX product query/dashboard/retention semantics,
  production OpenTelemetry bootstrap, persisted RuntimeCatalog, control-plane
  topology, production native-host telemetry, or arbitrary DLP.

### Deployment Handoff And Parent-Repo Migration Boundary

- What it is: refs-only portable artifacts, compiled process plans, deployment
  handoff validation, migration/control-plane packet summaries, and explicit
  residual routing.
- Current claim: contained handoff artifacts can reject live handles,
  descriptor tables, executable closures, raw secret fields, app-id drift, and
  telemetry run-id drift.
- System impact: keeps Parent-Repo Migration-decision evidence distinct from
  Parent-Repo Migration authorization.
- Evidence pointers: `simulation.deployment-handoff`,
  `audit.migration.control-plane-observation`,
  phase closeouts under `../../phases/phase-two/` and
  `../../phases/phase-three/`.
- Proof ceiling: no deployment placement policy, production control-plane
  storage/indexing/retention, orchestration, or Parent-Repo Migration authorization.

## Test-Theater Repairs Preserved

| Repaired item | Current handling |
| --- | --- |
| Native oRPC `.effect(...)` negative | Removed; RAWR `.effect(...)` is SDK authoring proof, not oRPC-native proof. |
| Standalone Bun existence test | Removed; Bun matters only through actual boundary handoff or listener use. |
| Direct raw Effect primitive demos | Removed as spine proof; raw primitives matter only through RAWR-owned wrappers or vendor notes. |
| oRPC `serverHasNativeHandler: false` assertion | Replaced by narrow native shape constructibility evidence. |

## Current Verdict

Current Oracle evidence is meaningful Parent-Repo Migration-decision evidence,
but it is not Lab-Production Proof or Parent-Repo Migration authorization.
Phase Two proved contained spine composition. Phase Three earned contained
Oracle live-passage simulation evidence and reconciled residuals. Future work
should open Reference Runtime/Lab-Production Proof gates or Parent-Repo
Migration workstreams for production host mounting, durable async behavior,
catalog persistence, product telemetry/query policy, native host error mapping,
deployment placement, control-plane topology, public API/DX laws,
config/secret-store policy, and the first production resource/provider catalog
cut.

## Evidence Pointer Matrix

| Subsystem | Pointer kind | What it proves or preserves | Detail path |
| --- | --- | --- | --- |
| Authoring/artifacts | Manifest entries | `.effect(...)` terminal, discriminated refs, refs-only portable artifacts | `../proof-manifest.json` |
| Derivation/compiler | Manifest entries and tests | Cold derivation/compilation artifacts without executing descriptor bodies | `../proof-manifest.json`, `../../test/conformance/middle-spine-derivation.test.ts` |
| Provider/runtime access | Manifest entries and tests | Contained provider coverage, bootgraph, runtime access, service binding behavior | `../proof-manifest.json`, `../../test/oracle/` |
| Boundary policy | Manifest entries and phase report | Contained layer-specific boundary policy and disagreement observation | `../proof-manifest.json`, `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md` |
| Server passage | Manifest entries and phase report | Elysia/oRPC/server-harness local contained passage and post-stop rejection | `../proof-manifest.json`, `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-contained-elysia-listen-lifecycle-passage.md` |
| Async passage | Manifest entries and phase report | Inngest Bun serve/function/step contained passage and async residuals | `../proof-manifest.json`, `../../phases/phase-two/workstreams/workstream-2026-04-30-phase-two-async-inngest-boundary.md` |
| Telemetry/control plane | System map | Redacted OTLP-shaped telemetry and non-persistent observation packets | `telemetry-observation-map.md` |
