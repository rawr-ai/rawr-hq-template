# Phase Two Production-Critical Scenario And Claim Ledger

Status: closed Phase Two coordination input; retained for post-Phase-Two handoff.
Owner: Phase Two DRA.

This document defines the representative lab-contained scenario and claim
ledger that Phase Two child workstreams burn down. It is not runtime
architecture authority, not proof authority, not production topology, and not a
final public API design.

Use this as Phase Two evidence provenance and next-phase source-mining input,
not as active scope for the next phase.

## Scenario Frame

Phase Two uses one tightly related scenario pair:

1. **Server request path:** a selected server API projection receives a
   contained oRPC-native request/callback path and, only if honestly installed
   and exercised, an Elysia mount/request path. Each path delegates through
   adapter-lowered payloads into `ProcessExecutionRuntime`, runs a `RawrEffect`
   service boundary through the runtime-owned Effect kernel, observes
   provider/resource/config behavior, and emits redacted diagnostics,
   telemetry, and catalog records.
2. **Async workflow path:** a selected async workflow projection receives a
   contained Inngest-facing function/serve/step callback, runs pre-derived
   async step descriptors through `ProcessExecutionRuntime`, and is triggered
   or observed through a server/internal dispatcher seam without turning
   durable Inngest semantics into RAWR-owned proof.

The pair shares one lab app/profile/process story:

- one import-safe app selection;
- one runtime profile with representative provider selections and redacted
  config/secret inputs;
- one provider/resource spine for a store-like resource, a clock-like resource,
  and a telemetry/logging-like resource or provider;
- one server surface and one async surface;
- one process runtime assembly, execution registry, process execution runtime,
  service binding cache, and runtime-owned Effect execution path;
- one redacted observation lane for diagnostics, telemetry/logging, HyperDX or
  OTLP proof, catalog summaries, and control-plane packet candidates.

Representative names inside later fixtures should be lab-local. They must not
copy production package topology, runtime-prod generated syntax, provider ids,
or app host code.

## Lifecycle Coverage Rule

Every promoted Phase Two claim must identify its lifecycle phase:

1. Definition.
2. Selection.
3. Derivation.
4. Compilation.
5. Provisioning.
6. Mounting.
7. Observation.

If a claim spans phases, the focused child workstream must name the exact phase
boundary it proves and the exact phase boundary it leaves fenced.

## Claim Ledger

| Claim id | Next workstream | Lifecycle phase | Claim to burn down | Current evidence | Phase Two proof target | Likely gate/oracle | Rejection/failure oracle | Non-proof boundary | Authority home / re-entry |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `p2.scenario.identity` | Scenario ledger | Definition / selection | A single scenario pair can cover provider, server, async, telemetry, catalog, and integrated-readiness proof without becoming production migration. | Program workstream gap ledger and spec flows 24.3, 24.4, 24.6. | Coordination only: a bounded scenario and claim ledger. | Structural/report plus workstream review. | Reject any later claim that lacks a row here or tries to use scenario wording as proof. | No runtime proof by scenario wording. | This document; child workstream 2 closeout. |
| `p2.authoring.import-safety` | Effect/provider, server, async | Definition / derivation | Scenario fixtures must preserve import-safe declarations, cold Effect terminals, and RAWR DX posture. | `proof` entries for descriptor refs, Effect-only authoring, portable refs-only artifacts. | Keep existing proof in force while later fixtures add scenario coverage. | Typecheck/negative gates for any new fixtures. | Fail if scenario authoring adds raw Effect run calls, public `.handler(...)`, runtime-bound closure capture, or accidental public syntax. | Does not prove production SDK extraction or final public API design. | Manifest proof entries; diagnostic definition/derivation rows. |
| `p2.dx.posture` | Effect/provider, server, async | Definition / derivation | Scenario changes preserve one-way-per-kind authoring, inference-friendly RAWR facades, and idiomatic vendor boundaries without public API drift. | Program parent review requires DX/API/TypeScript review; existing proof covers only some type laws. | Each implementation child records a DX/API/TypeScript parent review before promotion. | Workstream review gate. | Fail review if proof requires awkward duplicate authoring, raw vendor syntax in ordinary authoring, or hidden public API decisions. | Does not accept final public API/DX; design walls still escalate or become decision packets. | This ledger; child workstream reports. |
| `p2.derivation.no-body-execution` | Server / async | Derivation | Server route factories and async step descriptors must derive refs and tables without executing descriptor bodies. | Simulation proof for server route derivation and async owner-to-step artifacts. | Focused server/async tests must fail if bodies execute during derivation. | Middle-spine plus focused server/async gates. | Fail if a canary descriptor body runs during derivation or if workflow `run(...)` parsing is required for step discovery. | Final public route import-safety law and async membership syntax stay fenced. | `audit.p2.server-route-derivation`, `audit.p0.async-step-membership`. |
| `p2.compiler.provider-coverage` | Effect/provider | Compilation | Runtime compiler validates provider coverage, provider dependency closure, and service closure before provisioning. | Contained provider coverage and compiler simulation proof. | Representative scenario provider selections must be checked before acquire. | Provider/provisioning tests and manifest/report consistency. | Fail on missing, ambiguous, cyclic, role/lifetime/instance mismatched, or provider-as-execution-plan coverage. | Production provider catalog ids and topology stay fenced. | `accepted.provider-profile-closure`, `audit.p2.first-resource-provider-cut`. |
| `p2.provider.config-secret` | Effect/provider | Provisioning / observation | Providers receive validated config, may use secret-bearing values only inside acquire/release, and emit redacted diagnostics/catalog/telemetry. | Simulation proof for provider lowering and runtime-profile config redaction. | Representative provider proof with dependency matching, acquire, release, rollback, failure, redaction, and no live-handle leakage. | Mini-runtime provider tests plus negative fixtures for raw secrets/live handles. | Fail if invalid config reaches acquire, raw secrets appear in records, live handles appear in portable/catalog output, or release/finalization is skipped. | Production config precedence and platform secret-store integration stay fenced. | `audit.p1.provider-effect-plan-lowering`, `audit.p2.runtime-profile-config-redaction`. |
| `p2.effect.boundary-policy` | Effect/provider, server, async | Provisioning / mounting | Runtime-owned Effect execution applies boundary policy, interruption/finalization/error classification, and record-only telemetry metadata across provider, server, and async boundaries. | Vendor Effect proof and contained boundary-policy simulation proof. | Later provider/server/async work must exercise Effect through runtime-owned access, not direct raw Effect execution. | Focused mini-runtime/vendor-effect gates; regression if raw Effect bypasses runtime. | Fail if raw Effect execution bypasses `EffectRuntimeAccess`, if boundary kind is lost, or if server/async policy records are not attributable to the invoked boundary. | Final public policy API/DX, retry/backoff, durable async policy, and native host error mapping stay fenced. | `vendor.effect.runtime-substrate`, `audit.p1.effect-boundary-policy-matrix`, residual entry. |
| `p2.process-runtime.binding-access` | Effect/provider, server, async | Mounting | Process runtime owns service binding, runtime access scoping, execution registry, and process execution runtime assembly. | Simulation proof for runtime access, service binding cache, registry/invocation. | Later live-boundary paths must delegate through `ProcessExecutionRuntime` and preserve invocation-bound clients. | Mini-runtime/process-runtime gates and focused adapter/harness gates. | Fail if an adapter or harness executes descriptors directly, consumes compiler plans directly, or leaks broad runtime access into invocation code. | Final `RuntimeAccess` method law and dispatcher public DX stay fenced. | `audit.p1.runtime-resource-access`, `audit.p1.dispatcher-access`. |
| `p2.server.orpc-live-boundary` | Server oRPC/Elysia | Mounting / observation | A contained oRPC-native request/callback path crosses the real oRPC boundary where feasible and delegates through runtime-owned execution. | oRPC vendor shape proof; contained adapter callback/harness simulation. | Live request/callback path or honest narrowed non-promotion if native request cannot be exercised. | Focused server/oRPC gate with request or native callback, delegation, diagnostics, and redaction oracle. | Fail if proof only constructs oRPC shapes, bypasses `ProcessExecutionRuntime`, loses ref identity, or emits unredacted request/provider data. | Product API publication, OpenAPI policy, production route topology, and production server migration stay fenced. | `vendor.boundary.orpc-native-shape`, `audit.p2.adapter-effect-callback-lowering`, `audit.p2.production-harness-mounting`. |
| `p2.server.elysia-mount` | Server oRPC/Elysia | Mounting / observation | Elysia proof exists only if a real Elysia mount/request lifecycle is installed and exercised in the lab. | No current Elysia vendor proof is recorded. | Either add honest contained Elysia proof with vendor-fidelity update or keep Elysia explicit `xfail`/non-promotion. | Optional Elysia gate only if dependency and mount lifecycle are real. | Fail if Elysia is mentioned as green without installed dependency, real mount/request, vendor-fidelity note, and regression gate. | Elysia host semantics, production HTTP serving, OpenAPI publication, and production server migration stay fenced. | Child workstream 4 report and diagnostic residual if not exercised. |
| `p2.async.inngest-handoff` | Async/Inngest | Mounting | Inngest client/function/serve shape remains vendor-boundary evidence unless consumed by RAWR lowering. | Inngest handoff vendor proof plus contained Inngest-facing boundary proof. | Keep constructibility as vendor-proof and label RAWR-consumed Inngest-facing boundary separately. | Vendor-boundary gate plus focused Inngest async boundary gate. | Fail if constructibility alone is described as RAWR async runtime integration. | Durable semantics and production worker deployment stay fenced. | `vendor.boundary.inngest-handoff-shape`, `audit.p2.async-inngest-function-step-boundary`. |
| `p2.async.callback-step` | Async/Inngest | Mounting / observation | A contained Inngest-facing callback/step path crosses the boundary where feasible and delegates through runtime-owned execution. | Contained async bridge/harness simulation plus focused Inngest Bun serve/function/step proof. | Callback/step bridge proof with explicit non-promotion of durable semantics. | Focused async gate with callback, step descriptor, delegation, diagnostics, and redaction oracle. | Fail if workflow bodies hide executable steps, if callbacks bypass `ProcessExecutionRuntime`, or if raw FunctionBundle/native clients are authored manually. | Final async membership syntax and production worker/serve topology stay fenced. | `audit.p2.async-inngest-function-step-boundary`, `audit.p2.async-effect-bridge-lowering`, `audit.p2.production-harness-mounting`, `audit.p0.async-step-membership`. |
| `p2.async.durable-residual` | Async/Inngest | Observation / policy | Durable scheduling, retry, replay, idempotency, run history, and worker deployment remain Inngest-owned unless actually exercised and scoped. | Vendor notes and child-5 focused proof explicitly deny durable semantics proof. | Record residuals precisely; do not promote durable behavior from local callback tests. | Workstream review and residual ledger. | Fail if a green async claim depends on durable semantics without a real durable boundary and accepted policy. | Durable Inngest semantics are not RAWR-owned proof. | `audit.p2.async-effect-bridge-lowering`, `audit.p2.async-inngest-function-step-boundary`, async workstream residuals. |
| `p2.telemetry.redacted-records` | Telemetry/logging | Observation | Provider, server, async, execution, rollback, finalization, and catalog records emit redacted runtime observation. | Contained telemetry projection/export and catalog/control-plane observation proof; Phase Two now adds an integrated provider/server/async/catalog observation gate. | Repeatable redaction and projection checks across the scenario pair. | Telemetry/export mini-runtime tests plus `phase-two-observation-spine.test.ts` scenario-level record inspection. | Fail if records include secrets, live handles, provider values, descriptor bodies, runtime access objects, or unredacted diagnostic strings beyond scoped policy. | Arbitrary DLP, product analytics, retention, and dashboards stay fenced. | `audit.telemetry.hyperdx-observation`, `audit.p2.telemetry-integrated-observation-spine`, residual entry. |
| `p2.hyperdx.provider-proof` | Telemetry/logging | Observation | HyperDX/OTLP proof is labeled by the actual boundary crossed. | Local ingest smoke is recorded evidence; standing gates are typecheck/mini-runtime projection/export; Phase Two adds injected-fetch OTLP export evidence for the integrated observation scenario. | Preserve HyperDX/OTLP as contained export/ingest evidence and do not promote product/query semantics. | Injected-fetch export gate plus optional local ingest smoke only if stable and scoped. | Fail if local OTLP/HyperDX success is used to green dashboard/query/retention/product policy or catalog persistence. | Query, dashboard, retention, alerting, production bootstrap, and durable observation semantics stay fenced. | `audit.p2.telemetry-integrated-observation-spine`, `audit.telemetry.hyperdx-observation.residual`. |
| `p2.catalog.control-plane` | Telemetry/logging, integrated rehearsal | Observation | RuntimeCatalog/control-plane summaries remain redacted, non-live, and migration-decision inputs only. | Non-persistent migration/control-plane observation packet simulation proof; Phase Two now verifies packet summaries over the integrated observation scenario. | Scenario summaries must reject live handles, provider values, runtime access, raw secrets, copied OTLP payload bodies, and export response bodies. | Mini-runtime control-plane observation gate plus `phase-two-observation-spine.test.ts`. | Fail if packet summaries become storage, placement, query, orchestration, or control-plane topology authority. | RuntimeCatalog storage/indexing/retention/rehydration and deployment placement stay fenced. | `audit.migration.control-plane-observation`, `audit.p2.telemetry-integrated-observation-spine`, residual entry. |
| `p2.integrated.rehearsal` | Integrated rehearsal | All phases | Earned provider, server, async, telemetry, catalog, and runtime access claims compose without hiding missing focused gates. | Separate contained proofs across prior workstreams; child 7 now adds an integrated rehearsal gate. | End-to-end contained rehearsal with falsification matrix and focused-gate references. | `phase-two-integrated-runtime-spine-rehearsal.test.ts`; integrated gate cannot promote claims missing focused gates. | Fail if integrated proof passes only a happy path, lacks one falsifier per promoted boundary, hides waived focused gates, or turns contained proof into production migration readiness. | Still not production migration readiness. | `audit.p2.integrated-runtime-spine-rehearsal`; child workstream 7 closeout. |
| `p2.phase-three.handoff` | Closeout | Coordination | Final Phase Two closeout hands Phase Three explicit inputs for final structure, Nx enforcement, generators, and ratchet/lock mechanics. | Phase Three boundary in program workstream plus `2026-04-30-phase-two-closeout-phase-three-handoff.md`. | Closed coordination handoff only; no new runtime behavior proof. | Closeout review plus full lab gate. | Fail if Phase Two starts root Nx generators, final topology ratchet, or production package mutation. | No Phase Three implementation during Phase Two. | `audit.p2.phase-two-program-closeout`; child workstream 8 closeout; reopen in Phase Three program. |

## Ordering Constraints

1. Child workstream 3 must burn down provider/config/secret/Effect execution
   before server or async live-boundary work depends on representative
   resources.
2. Child workstreams 4 and 5 may proceed in either order after the provider
   spine is strong enough, but each must preserve its own focused oracle.
3. Child workstream 6 follows provider/server/async evidence so telemetry and
   catalog observation can inspect real scenario records instead of isolated
   projection fixtures.
4. Child workstream 7 cannot promote an integrated claim unless the matching
   focused claim from child workstreams 3-6 has an oracle and named gate.
5. Child workstream 8 closes the program only after every green/yellow/red
   claim has an authority home, unblock condition, re-entry trigger, next
   eligible workstream, and lane.

## Stop And Decision-Packet Triggers

Stop or emit a decision packet if a child workstream must choose:

- final public `ProviderEffectPlan` shape;
- final `RuntimeAccess` method law;
- dispatcher access public DX;
- async membership authoring syntax;
- route import-safety law beyond the current spec;
- retry/backoff/timeout/native host error-mapping policy;
- durable Inngest semantics as RAWR-owned behavior;
- product observability, query, dashboard, retention, or alerting policy;
- RuntimeCatalog storage/indexing/retention/persistence;
- control-plane topology, deployment placement, production package topology,
  root Nx generators, or migration sequence.

If the issue can be fenced honestly without weakening downstream proof, record
it as a residual and continue.
