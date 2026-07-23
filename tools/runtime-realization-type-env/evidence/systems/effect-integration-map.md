# Effect Integration Map

This map records Effect-native integration evidence for the runtime realization
spine. It is evidence for future spec/runtime work, not architecture truth by
itself.

## How To Read This

| Need | Read |
| --- | --- |
| Vendor facts and package behavior | `../vendors/effect.md` |
| Runtime-spine placement | `runtime-spine-evidence-map.md` |
| Proof ledger entries | `../proof-manifest.json` |
| Current proof boundary | `../current-lab-state.md` |

## Integration Cards

### Managed Runtime Substrate

- What it is: Effect runtime ownership, `ManagedRuntime`, `Layer`, `Scope`,
  finalization, interruption, and disposal.
- Current evidence: real `effect@4.0.0-beta.100` behavior is proven in the vendor lane;
  the lab has a process-owned managed runtime wrapper.
- System impact: grounds RAWR-owned runtime execution and finalization.
- Proof ceiling: final RAWR-owned runtime substrate names, public/internal
  contract, and lifecycle ownership remain unresolved.

### Process-Local Coordination Resources

- What it is: process-local queues, pub/sub, refs, deferreds, schedules,
  streams, caches, and limiters as runtime infrastructure.
- Current evidence: real `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, and
  `Stream` behavior is exercised through the lab's RAWR-owned process-local
  resource probe.
- System impact: keeps coordination resources local runtime infrastructure
  instead of durable async/domain truth.
- Proof ceiling: final RAWR resource contracts, backpressure/shutdown policy,
  cache/semaphore API, and method law remain open.

### Provider Plan Lowering

- What it is: provider acquire/release hooks lowering into runtime-owned
  provisioning and bootgraph execution.
- Current evidence: lab-internal provider acquire/release hooks lower through
  Oracle bootgraph/provisioning with real Effect execution, graph diagnostics,
  dependency ordering, rollback, reverse finalization, release-failure records,
  and redacted catalog records.
- System impact: de-risks provider execution mechanics without exposing final
  public API shape.
- Proof ceiling: final public `ProviderEffectPlan` producer/consumer fields,
  typed config binding, provider policy metadata, and production bootgraph
  integration remain open.

### Boundary Policy Matrix

- What it is: executable/provider boundary records for timeout metadata,
  retry-attempt declaration, interruption, Exit/Cause classification,
  telemetry metadata, and redaction.
- Current evidence: contained boundary records preserve exact boundary kind and
  record-only policy metadata without scheduling retries or choosing production
  policy.
- System impact: gives future host/error/telemetry work a stable observation
  boundary.
- Proof ceiling: final public policy API/DX, production retry/backoff, durable
  async policy, native host error mapping, HyperDX export/query, and catalog
  persistence remain open.

### Safe Effect Composition Surface

- What it is: the curated `@rawr/sdk/effect` facade and authoring helpers.
- Current evidence: `RawrEffect` is backed by real Effect, root `pipe` and
  value `.pipe(...)` are verified, and raw runtime constructors remain hidden
  from authoring fixtures.
- System impact: preserves native-feeling Effect authoring without leaking
  runtime construction authority.
- Proof ceiling: final helper list, overloads, and exact parity with vendor
  utility names remain open.

### Adapter Callback And Async Bridge Lowering

- What it is: server/internal/async host callbacks delegating into
  `ProcessExecutionRuntime` instead of executing Effect directly.
- Current evidence: contained callback/bridge payloads preserve refs, reject
  wrong-boundary metadata, avoid executable descriptors in payloads, and
  delegate through the Oracle.
- System impact: keeps host adapters as boundary delegates, not independent
  execution engines.
- Proof ceiling: real production oRPC/Elysia/Inngest/OCLIF/web/agent/desktop
  adapter implementations remain unproven.

### Runtime Profile Config And Redaction

- What it is: runtime-profile config validation, redaction, diagnostic safety,
  and provider config handling.
- Current evidence: contained provider config validates through
  `RuntimeSchema`, fails closed before provider build/acquire, and redacts
  config snapshots, provisioning traces, telemetry projections, and observation
  packet summaries.
- System impact: keeps config/secret facts out of runtime evidence and
  telemetry.
- Proof ceiling: production config source precedence, platform secret binding,
  secret-store policy, persisted observation, and arbitrary free-form diagnostic
  DLP remain open.

## Golden Integration Pattern

Reference:
`docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`.

Use this as a native-fit integration exemplar: keep the author-facing surface
vendor-native where that improves DX, while RAWR owns lifecycle, runtime
construction, import law, diagnostics, telemetry correlation, policy, context
projection, and finalization seams.

It is not authority over runtime boundaries, runtime lifecycle, public runtime
SDK names, adapter lowering, provider acquisition/finalization, proof
categories, or Parent-Repo Migration authorization. The manifest-pinned runtime
realization spec wins conflicts. Its older `.handler(...)` / `.effect(...)`
terminal split is superseded by current runtime-realization authority: RAWR
`.effect(...)` remains the canonical execution terminal for
runtime-realization service/plugin authoring.

## Evidence Pointer Matrix

| Integration area | Manifest entries | Primary phase/source pointers |
| --- | --- | --- |
| Managed runtime substrate | `vendor.effect.runtime-substrate`, `audit.p1.effect-managed-runtime-substrate` | `../vendors/effect.md`, `../../test/vendor/effect-runtime.test.ts`, `../../src/vendor/effect/runtime.ts` |
| Process-local coordination resources | `vendor.effect.process-local-coordination`, `audit.p1.process-local-coordination-resources` | `../vendors/effect.md`, `../../test/vendor/effect-runtime.test.ts` |
| Provider plan lowering | `audit.p1.provider-effect-plan-lowering`, `audit.p2.provider-effect-process-spine` | `../../phases/phase-one/workstreams/workstream-2026-04-30-phase-one-provider-effect-plan-bootgraph-provisioning-lowering.md`, `../../phases/phase-two/workstreams/workstream-2026-04-30-phase-two-provider-config-effect-spine.md` |
| Boundary policy matrix | `audit.p1.effect-boundary-policy-matrix`, `audit.p1.effect-boundary-policy-matrix.residual` | `../../phases/phase-one/workstreams/workstream-2026-04-30-phase-one-boundary-policy-matrix.md` |
| Safe authoring facade | `accepted.curated-effect-public-surface`, `accepted.effect-only-authoring` | `../vendors/effect.md`, `../../src/sdk/effect.ts`, `../../fixtures/inline-negative/authoring-contracts.ts` |
| Adapter callback and async bridge lowering | `simulation.adapter-callback-bridge-lowering`, `audit.p2.adapter-effect-callback-lowering`, `audit.p2.async-effect-bridge-lowering` | `runtime-spine-evidence-map.md`, `../../phases/phase-one/workstreams/workstream-2026-04-30-phase-one-real-adapter-callback-async-bridge-lowering.md` |
| Runtime profile config and redaction | `audit.p2.runtime-profile-config-redaction`, `audit.p2.provider-effect-process-spine` | `../../phases/phase-one/workstreams/workstream-2026-04-30-phase-one-provider-diagnostics-runtime-profile-config-redaction.md`, `../../test/oracle/harness/provider-provisioning.test.ts` |
