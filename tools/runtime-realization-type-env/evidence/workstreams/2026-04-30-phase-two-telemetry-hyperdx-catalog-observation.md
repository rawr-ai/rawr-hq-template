# Phase Two Telemetry HyperDX Catalog Observation

Status: `closed`.
Branch: `codex/runtime-phase-two-telemetry-hyperdx-catalog-observation`.
PR: `none`.
Commit: branch head after closeout commit.

This report is informative continuity for the runtime-realization lab. It is
not architecture authority.

## Frame

Objective:

- Strengthen the Phase Two observation spine now that provider/config/Effect,
  server/oRPC, and async/Inngest contained boundary proofs exist.
- Prove repeatable redacted runtime observation across provider, server, async,
  execution, finalization, catalog, OTLP/HyperDX export, and
  migration/control-plane packet summaries without claiming product
  observability or persistence.

Containment boundary:

- Changes stay inside `tools/runtime-realization-type-env/**`.
- HyperDX/Docker usage is local lab infrastructure only. It is not production
  provisioning, product observability policy, or an accepted deployment shape.
- Any new evidence must consume already-redacted records or explicitly redact
  before export/packet creation.

Non-goals:

- Do not claim production observability readiness.
- Do not decide dashboards, query semantics, alerts, retention, production
  OpenTelemetry bootstrap, RuntimeCatalog persistence, control-plane storage,
  deployment placement, native host telemetry/error mapping, durable async run
  history, platform secret-store precedence, or arbitrary DLP policy.
- Do not turn local HyperDX ingest success into product/query/persistence
  authority.

## Opening Packet

Opening input:

- Child workstream 5 closed with contained Inngest Bun serve/function/step
  boundary proof.
- Child workstream 6 consumes claim rows `p2.telemetry.redacted-records`,
  `p2.hyperdx.provider-proof`, and `p2.catalog.control-plane`.
- User control input requires the DRA loop to continue through the whole Phase
  Two program, not stop after this child.

Runtime/proof authority inputs:

- `../../RUNBOOK.md`
- `../design-guardrails.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../focus-log.md`

Coordination inputs:

- `../dra-phase-two-level-zero-workflow.md`
- `2026-04-30-phase-two-production-readiness-program-workstream.md`
- `2026-04-30-phase-two-provider-config-effect-spine.md`
- `2026-04-30-phase-two-server-orpc-elysia-boundary.md`
- `2026-04-30-phase-two-async-inngest-boundary.md`
- `../phase-two-production-critical-claim-ledger.md`
- `README.md`
- `TEMPLATE.md`

Evidence inputs:

- Canonical runtime spec pinned by the manifest.
- `../vendor-fidelity.md`
- `../../src/mini-runtime/telemetry-export.ts`
- `../../src/mini-runtime/migration-control-plane-observation.ts`
- `../../src/mini-runtime/catalog.ts`
- `../../src/mini-runtime/provider-lowering.ts`
- `../../src/mini-runtime/harnesses.ts`
- `../../src/mini-runtime/adapters/orpc-server.ts`
- `../../src/mini-runtime/adapters/inngest-async.ts`
- `../../test/mini-runtime/telemetry-export.test.ts`
- `../../test/mini-runtime/migration-control-plane-observation.test.ts`
- `../../test/mini-runtime/server-orpc-boundary.test.ts`
- `../../test/mini-runtime/inngest-async-boundary.test.ts`
- Prior telemetry/control-plane workstream reports as provenance and proof
  context, not Phase Two completion by themselves.

Excluded or stale inputs:

- Product dashboards/query/retention/alerting decisions remain out of scope.
- Production OpenTelemetry bootstrap, native host instrumentation, and
  production control-plane topology remain out of scope.
- Local Docker/HyperDX availability is supporting lab evidence only.
- Runtime-prod telemetry lessons remain cautionary anti-theater inputs only.

Control inputs:

- Continue autonomously unless a documented Level Zero stop condition fires.

Selected skill lenses:

- `graphite`: branch/stack workflow in this Graphite-owned repo.
- `nx-run-tasks`: focused and composed verification through Nx targets.
- `testing-design`: falsifiable telemetry/redaction/export/packet oracles.

Refresher:

- Research program refreshed: `skipped`; Phase Two anchors are the active
  sequence authority.
- Phased workflow refreshed: `yes`.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-phase-two-async-inngest-boundary.md`

Prior final output accepted or rejected:

- Accepted: `audit.p2.provider-effect-process-spine`,
  `audit.p2.server-orpc-fetch-boundary`, and
  `audit.p2.async-inngest-function-step-boundary` provide contained records
  that an observation workstream may consume.
- Rejected as observability proof: those child proofs do not prove OTLP export,
  HyperDX ingest, product dashboard/query policy, RuntimeCatalog persistence,
  or control-plane topology.

Deferred items consumed:

- `p2.telemetry.redacted-records`
- `p2.hyperdx.provider-proof`
- `p2.catalog.control-plane`

Deferred items explicitly left fenced at opening:

- Product observability policy, dashboard/query/retention/alerting semantics.
- Production OpenTelemetry bootstrap and native host instrumentation.
- RuntimeCatalog storage, indexing, retention, rehydration, and control-plane
  topology.
- Durable async run history and native Inngest host telemetry.
- Platform secret-store precedence and arbitrary free-form diagnostic DLP.

Repair demands consumed:

- None from child workstream 5.

Next packet changes:

- Child workstream 7 may consume this work only as contained observation
  evidence for integrated rehearsal; it must not use it as production
  observability, catalog persistence, or product query proof.

Invalidations from prior assumptions:

- None at opening.

## Output Contract

Required outputs:

- A focused Phase Two observation proof that projects provider, server, async,
  execution, finalization, and catalog records into redacted telemetry records.
- OTLP/HyperDX-shaped export evidence with a repeatable injected-fetch gate and
  a separate local HyperDX ingest smoke if the container is reachable.
- Migration/control-plane packet evidence that summarizes deployment,
  catalog, telemetry/export, and placement candidates without copying OTLP
  payload bodies or becoming storage/placement authority.
- Manifest/focus/diagnostic/spine/vendor-fidelity updates that promote only
  earned contained observation proof and keep product/persistence residuals
  fenced.
- Workstream closeout and next packet for Integrated Runtime-Spine Rehearsal.

Optional outputs:

- A lab-only scenario helper or focused test that composes existing
  provider/server/async boundary records into one observation packet.

Target proof strength:

- `simulation-proof` for contained observation/export/packet evidence.
- Local HyperDX ingest remains supporting lab observation evidence only.
- Product/query/dashboard/retention/persistence/topology remains
  `xfail`/non-promotion.

Expected gates:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash actual-vs-expected check
- focused telemetry/catalog observation test
- optional live HyperDX/OTLP smoke when Docker container is reachable
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`

Stop/escalation conditions:

- Stop only if honest observation proof requires a production telemetry API,
  dashboard/query/retention policy, catalog persistence/storage design,
  production host instrumentation, deployment/control-plane topology, durable
  async run-history policy, or unredacted provider/config/runtime payloads.

## Acceptance / Closure Criteria

This workstream may close only when:

- focused observation proof passes or is honestly fenced;
- local HyperDX/OTLP lane is either recorded as successful supporting evidence
  or explicitly non-proof due environment;
- product/query/persistence/topology residuals are explicitly non-promoted;
- proof/non-proof status is reflected in manifest, diagnostic, spine map,
  focus log, and vendor-fidelity notes where relevant;
- leaf and parent reviews are recorded;
- focused and composed gates are recorded;
- scratch documents are absent or disposed;
- repo/Graphite state is clean or explicitly blocked;
- child workstream 7 has a usable next packet.

## Workflow

Preflight:

- Opened on `codex/runtime-phase-two-telemetry-hyperdx-catalog-observation`.
- Verified clean repo/Graphite state, Nx project truth, and manifest-pinned
  spec hash.
- `docker ps` showed local `rawr-hq-hyperdx` exposing `4318` and `8080`.

Investigation lanes:

- Host read Level Zero, Phase Two program workstream, child 5 report, claim
  ledger, existing telemetry/control-plane files, prior telemetry reports,
  manifest, diagnostic, spine map, focus log, and HyperDX/local OTLP evidence.

Phase teams:

- `telemetry-inventory`: one Explorer agent for existing telemetry/HyperDX/
  catalog evidence and local Docker availability.
- `proof-review`: one default reasoning agent for proof adequacy,
  false-green risks, required oracles, and product/persistence residual
  fencing.

Agent scratch documents:

- Not used at opening. The lanes are bounded; if either lane becomes deep
  enough to need scratch, it must be integrated and disposed before closeout.

Design lock:

- Locked to a focused Phase Two observation scenario that composes already
  earned contained provider, oRPC server, and Inngest async boundary evidence.
- The proof target is integrated redacted observation, OTLP/HyperDX-shaped
  export, and non-persistent migration/control-plane packet evidence.
- The proof does not add a public observability API, product dashboard/query
  semantics, RuntimeCatalog persistence, production OpenTelemetry bootstrap, or
  deployment/control-plane topology.

Implementation summary:

- Added `test/mini-runtime/phase-two-observation-spine.test.ts`.
- The focused test provisions a provider through runtime-owned Effect,
  finalizes it, enters a contained oRPC Fetch request boundary, enters a
  contained Inngest Bun serve/function/step boundary, projects provider/server/
  async/harness/boundary/catalog records into runtime telemetry records, exports
  a stable OTLP trace payload through injected fetch, and creates a
  migration/control-plane observation packet.
- The test asserts provider/server/async/config/execution/resource/packet
  secrets and live handles are absent from OTLP payloads, exporter bodies, and
  packet summaries. It also asserts packet summaries do not copy OTLP payloads
  or export response bodies and that placement remains candidate-only.
- Updated `proof-manifest.json`, `focus-log.md`, `runtime-spine-verification-
  diagnostic.md`, `spine-audit-map.md`, `vendor-fidelity.md`, and
  `phase-two-production-critical-claim-ledger.md` to record the new proof
  without promoting product observability, persistence, topology, durable async,
  or production migration readiness.

Semantic JSDoc/comment trailing pass:

- Passed with no code comments added.
- Files reviewed:
  `test/mini-runtime/phase-two-observation-spine.test.ts`,
  `src/mini-runtime/telemetry-export.ts`, and
  `src/mini-runtime/migration-control-plane-observation.ts`.
- The new focused test is explicit enough without explanatory comments, and
  existing implementation comments already fence telemetry/control-plane
  product semantics. Comments remain migration substrate only, not proof.

Verification:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/phase-two-observation-spine.test.ts`: passed, 1 test, 62 assertions.
- Local HyperDX support smoke: `rawr-hq-hyperdx` container exposed `4318` and
  `8080`; `GET http://127.0.0.1:8080/` returned `200`; `POST
  http://127.0.0.1:4318/v1/traces` returned `200`.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`: passed.
- `bunx nx run runtime-realization-type-env:gate`: passed.

Review loops:

- Leaf loops and parent loops completed below. No waiver or invalidation was
  required.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| The strongest honest Phase Two observation promotion is a new contained integrated observation spine entry, not an upgrade to production observability. | `phase-two-observation-spine.test.ts`, `audit.p2.telemetry-integrated-observation-spine`, and local HyperDX smoke. | Promote as `simulation-proof`; keep product/query/retention/persistence residuals fenced. | High |
| OTLP/HyperDX evidence crosses export and local ingest boundaries, but not dashboard/query/product policy boundaries. | Injected-fetch assertion for `/v1/traces`; local `POST /v1/traces` returned `200`; `vendor-fidelity.md` HyperDX/OTLP section. | Record local ingest as supporting lab evidence only. | High |
| Migration/control-plane packet evidence is useful for migration review but remains non-persistent and candidate-only. | Packet assertions reject copied OTLP/export bodies and candidate placement decision is `candidate-only`. | Preserve `audit.migration.control-plane-observation.residual` and related diagnostic residuals. | High |
| Records without `telemetryRunId` would be weaker run-correlation evidence. | Reviewer note; current projection creates `telemetryRunId` on all projected records consumed by the packet. | No repair needed for this test; integrated rehearsal should preserve telemetry run correlation in its falsification matrix. | Medium |

## Report

Proof promotions:

- Added `audit.p2.telemetry-integrated-observation-spine` as
  `simulation-proof`.
- The promotion is limited to contained provider/server/async/catalog record
  projection, redacted OTLP export, local HyperDX-shaped endpoint evidence, and
  non-persistent migration/control-plane packet summaries.

Proof non-promotions:

- Product observability/query/dashboard/retention/alerting policy,
  RuntimeCatalog persistence, production OpenTelemetry bootstrap, native host
  telemetry/error mapping, durable async run history, and production migration
  readiness remain non-promotions.
- Local HyperDX ingest success is not product query/dashboard proof.
- Packet serializability is not RuntimeCatalog persistence proof.
- Candidate placement facts are not placement policy or orchestration proof.

Diagnostic changes:

- Updated the diagnostic observation row to name the Phase Two integrated
  observation gate.
- Updated the deployment/control-plane row to record packet body-stripping and
  candidate-only placement evidence.

Spec feedback:

- None requiring a spec patch from this workstream. Product observability,
  catalog persistence, control-plane topology, and durable async policy remain
  intentional residual/decision lanes.

Test-theater removals or downgrades:

- None. The new test does not treat local HyperDX smoke as product semantics
  proof and does not treat packet JSON as storage.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product observability/query/dashboard/retention/alerting policy | `xfail` | Contained OTLP/HyperDX export cannot define product semantics. | `p2.hyperdx.provider-proof`; `audit.telemetry.hyperdx-observation.residual`; diagnostic observation row. | Product observability policy is intentionally opened and accepted. | Any green claim depends on dashboard/query/retention/alerting behavior. | Later product observability decision packet or production migration workstream | `spec/migration` |
| RuntimeCatalog persistence/storage/index/retention/rehydration | `xfail` | In-memory catalog and packet summaries do not choose storage. | `p2.catalog.control-plane`; `audit.migration.control-plane-observation.residual`; diagnostic catalog row. | RuntimeCatalog persistence design is intentionally opened and gated. | Any migration packet treats contained catalog summaries as durable storage. | Phase Three or production migration workstream | `spec/migration` |
| Production OpenTelemetry bootstrap and native host telemetry/error mapping | `xfail` | The workstream proves lab-local projection/export and contained boundary records only. | `audit.telemetry.hyperdx-observation.residual`; diagnostic observation row. | Production host instrumentation and error mapping policy are opened and gated. | Any claim requires native host telemetry or production bootstrap behavior. | Production migration workstream or dedicated host telemetry decision packet | `migration-only` |
| Durable async run history and native Inngest host telemetry | `xfail` | The async evidence crosses a local serve/function/step boundary, not durable scheduling or run-history storage. | `audit.p2.async-inngest-function-step-boundary`; `audit.telemetry.hyperdx-observation.residual`; async diagnostic row. | Durable async semantics are intentionally opened with a real durable boundary. | Any integrated claim depends on retry/replay/idempotency/run-history behavior. | Later async durability decision packet or production migration workstream | `spec/migration` |
| Platform secret-store precedence and arbitrary free-form DLP | `xfail` | Current redaction is scoped/key-based and contained; platform source order and arbitrary DLP policy are not selected. | `audit.migration.control-plane-observation.residual`; `audit.telemetry.hyperdx-observation.residual`; diagnostic config/observation rows. | Secret-store precedence and diagnostic DLP policy are accepted and gated. | Any claim needs platform secret source ordering or arbitrary unstructured diagnostic redaction. | Production config/secret policy workstream | `spec/migration` |

## Review Result

Leaf loops:

- Containment: passed; changes stayed under
  `tools/runtime-realization-type-env/**` and did not mutate production
  packages, root workspace config, topology, or Phase Three Nx/generator work.
- Mechanical: passed; spec hash matched, Nx project truth loaded, and the
  branch stayed on the Phase Two stack.
- Type/negative: passed through `typecheck`, `negative`, and the full gate.
- Semantic JSDoc/comments: passed with no new comments needed.
- Vendor: passed for the claim made. OTLP/HyperDX is labeled by injected export
  plus local ingest smoke; product query/dashboard semantics remain fenced.
- Mini-runtime: passed; `mini-runtime` included the focused observation test
  and all prior provider/server/async/runtime tests.
- Manifest/report: passed; `report` lists
  `audit.p2.telemetry-integrated-observation-spine` as `simulation-proof` and
  leaves residuals as `xfail`.

Parent loops:

- Architecture: passed; the proof follows definition/selection evidence from
  prior children into provisioning, mounting, and observation without adding a
  second execution model.
- Migration derivability: passed; the result gives migration-planning evidence
  about what can be observed in the contained runtime spine, not production
  readiness.
- DX/API/TypeScript: passed; no public API, package export, or authoring syntax
  changed.
- Workstream lifecycle/process: passed; opening packet, agent lanes, gates,
  proof deltas, residuals, closeout, and next packet are recorded.
- Adversarial evidence honesty: passed; false-green risks around HyperDX
  product semantics, packet persistence, candidate placement, and durable async
  history remain fenced.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None |  |  |  |  |  |

Invalidations:

- None.

Repair demands:

- None.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| None requiring workflow repair | N/A | N/A | N/A |

## Final Output

Artifacts:

- `test/mini-runtime/phase-two-observation-spine.test.ts`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/spine-audit-map.md`
- `evidence/vendor-fidelity.md`
- `evidence/phase-two-production-critical-claim-ledger.md`
- `evidence/workstreams/2026-04-30-phase-two-telemetry-hyperdx-catalog-observation.md`

Verification run:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/phase-two-observation-spine.test.ts`: passed.
- `docker ps --format '{{.Names}} {{.Ports}}' | rg 'rawr-hq-hyperdx|4318|8080' || true`: local container exposed `4318` and `8080`.
- `curl -s -o /tmp/runtime-hyperdx-ui.out -w '%{http_code}' http://127.0.0.1:8080/`: `200`.
- `curl -s -o /tmp/runtime-hyperdx-otlp.out -w '%{http_code}' -X POST http://127.0.0.1:4318/v1/traces -H 'content-type: application/json' --data '{"resourceSpans":[]}'`: `200`.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`: passed.
- `bunx nx run runtime-realization-type-env:gate`: passed.

Repo/Graphite state:

- To be clean after the closeout commit. Pre-commit dirty state is limited to
  this workstream's lab-contained files.

## Next Workstream Packet

Recommended next workstream:

- Phase Two child workstream 7: Integrated Runtime-Spine Rehearsal.

Why this is next:

- Provider/config/Effect, server/oRPC, async/Inngest, and telemetry/catalog/
  control-plane observation now each have focused contained gates.
- The next child should compose the earned proofs into an integrated rehearsal
  while preserving each child proof's independent oracle and residual boundary.

Required first reads:

- Level Zero workflow.
- Phase Two program workstream.
- This report.
- `phase-two-production-critical-claim-ledger.md`.
- `proof-manifest.json`, `runtime-spine-verification-diagnostic.md`,
  `spine-audit-map.md`, and `focus-log.md`.
- Focused tests for child workstreams 3-6:
  `provider-effect-spine-scenario.test.ts`,
  `server-orpc-boundary.test.ts`,
  `inngest-async-boundary.test.ts`, and
  `phase-two-observation-spine.test.ts`.

First commands:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash actual-vs-expected check

Deferred items to consume:

- Integrated rehearsal must not promote a child claim whose focused gate is
  missing, waived, or invalidated.
- Include at least one representative falsifier or rejection path per promoted
  child boundary.
- Preserve non-promotions for Elysia, production HTTP/worker hosts, durable
  async semantics, product observability, RuntimeCatalog persistence,
  control-plane topology, native host telemetry/error mapping, platform secret
  stores, and production migration readiness.
