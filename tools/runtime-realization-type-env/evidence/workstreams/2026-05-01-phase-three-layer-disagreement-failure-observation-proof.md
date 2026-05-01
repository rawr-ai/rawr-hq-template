# Phase Three Layer Disagreement Failure Observation Proof

Status: `closed`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `pending`.

This report is the active child-4 workstream for Phase Three. It is not runtime
architecture authority, final public API/DX authority, product observability
proof, durable async proof, production migration authorization, or permission
to implement production host paths.

## Current State

| Field | Value |
| --- | --- |
| Program state | Phase Three open. |
| Child state | Child 4 closed as contained `simulation-proof`; child 5 accepted as next. |
| Workstream type | Executable contained proof slice. |
| Proof result | Contained `simulation-proof` for layer-disagreement preservation across the scoped mini-runtime paths. |
| Active question | Can the contained mini-runtime preserve and project layer-specific disagreement across vendor envelopes, RAWR runtime outcomes, harness/boundary records, telemetry/export status, and control-plane summaries without collapsing them into false-green runtime readiness? |
| Blocked claims | Production migration readiness, production host lifecycle, real Elysia serving, durable Inngest semantics, live HyperDX product visibility, RuntimeCatalog persistence, native host telemetry/error mapping, public API/DX law, and final Nx/generator ratchet. |

## Frame

Objective:

- Convert child 3's semantics ledger into the next executable proof.
- Prove that live-passage evidence does not flatten native/vendor, runtime,
  harness, boundary, telemetry, and control-plane states into one status.
- Exercise representative failure and observation paths that matter for
  migration-decision confidence while staying fully inside the mini-runtime lab.
- Promote only the exact contained behavior that passes focused gates.

Containment boundary:

- Source/test edits must stay inside `tools/runtime-realization-type-env/**`.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`,
  `plugins/*`, root exports, deployment topology, and final Nx/generator
  ratchets remain out of scope.

## Opening Packet

Prior stages consumed:

- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`
- `2026-05-01-phase-three-started-passage-vendor-integration-reference.md`
- `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`

Authority inputs:

- manifest-pinned runtime spec:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- architecture context:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- active DRA workflow reference:
  `../phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`
- `2026-05-01-phase-three-program-workstream.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../effect-integration-map.md`
- `../vendor-fidelity.md`
- `../phased-agent-verification-workflow.md`

Local telemetry/integration docs to keep available:

- `docs/projects/orpc-ingest-domain-packages/resources/spec/TELEMETRY_DESIGN.md`
- `docs/projects/orpc-ingest-domain-packages/resources/spec/DECISIONS.md`
- `docs/projects/orpc-ingest-domain-packages/resources/spec/guidance.md`
- `docs/system/quarantine/TELEMETRY.md`
- `docs/system/quarantine/telemetry/orpc.md`
- `docs/system/quarantine/telemetry/hyperdx.md`
- `docs/system/quarantine/telemetry/hq-runtime.md`
- `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`

Selected skill lenses:

- `team-design`: non-overlapping review and verification lanes.
- `target-authority-migration`: proof ceilings and residual routing.
- `architecture`: runtime/vendor/host/product boundary separation.
- `testing-design`: falsifier-first executable oracle.
- `orpc`: oRPC RPCHandler and telemetry idioms.
- `inngest`: Inngest serve/function/step/failure idioms.
- `elysia`: only if a real contained Elysia mount is intentionally considered.

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `yes`: oRPC and Inngest directly; OpenTelemetry/OTLP and HyperDX as observation/export semantics; Elysia only as residual unless intentionally opened. |
| Required skill introspection | `orpc`, `inngest`; `elysia` only if Elysia scope is opened. Effect/OTEL/HyperDX skills are `none found` unless later discovery finds them. |
| Official-docs lane | Required before source/test edits and before any vendor-related proof promotion. DRA accepts child 3's broad-to-deep official-docs lane as the starting packet, but child 4 must run a targeted refresh for the exact oRPC/Inngest/OTel/HyperDX semantics used by the executable slice. No vendor-related claim promotes until that lane closes with DRA disposition. |
| Golden integration exemplar | Required as reference-only input for native-fit author surface vs RAWR-owned operational seams. |
| Integration Exemplar Reconciliation | Runtime spec wins. The service-package Effect/oRPC snapshot supplies principles, not boundary authority. Stale `.handler(...)` / `.effect(...)` split remains rejected. |
| Durable report disposition | If this child discovers new normative vendor integration rules, update or create a labeled vendor/reference report. Otherwise keep findings inside this child report. |

## Output Contract

Required executable proof outputs:

- A focused mini-runtime test or test cluster that proves representative layer
  disagreement preservation across:
  - HTTP transport status;
  - vendor protocol/body operation;
  - RAWR runtime invocation result;
  - adapter boundary events;
  - harness records;
  - telemetry projection records;
  - telemetry export result;
  - migration/control-plane packet correlation or explicitly modeled status
    summary.
- Any required source changes inside mini-runtime adapters/projection code.
- Updated proof manifest/focus log/diagnostic maps as applicable.
- DRA disposition for each claim promoted or fenced.
- Layered review result with at least one overall-program-health lane.

Candidate proof cases:

- Runtime failure inside an otherwise matched vendor boundary path.
- True runtime-failure-inside-successful-Inngest-envelope case:
  an HTTP `206` response with protocol body `StepRun` and `data.status:
  "failure"` must preserve the runtime/harness failure separately from the
  transport status and must not rely only on the existing post-stop
  `StepError` case.
- Inngest protocol/body failure where HTTP transport alone would be misleading.
- Pre-runtime protocol rejection that must not become a RAWR runtime failure.
- Protocol/body survival case:
  the proof must either persist protocol operation/runtime-status facts in
  boundary records or state and test that the raw response body is the protocol
  layer while boundary records are mapped observations only.
- Control-plane status/correlation case:
  the proof must not imply that the migration/control-plane packet preserves
  per-layer status. This child keeps the packet as run/source/name/export
  summary only; status disagreement is preserved in boundary and telemetry
  records, while the packet remains correlation/index metadata.
- Telemetry projection case:
  projected records must preserve runtime/boundary disagreement in redacted
  observation attributes before any export result is considered.
- Telemetry export failure that must stay observation-plane and must not rewrite
  runtime invocation outcome or control-plane correlation.
- Redaction/containment of failure bodies and secret-like details across
  boundary, telemetry, and control-plane projection.

Proof ceiling:

- Passing this child can promote only contained `simulation-proof`.
- It cannot prove production host lifecycle, durable Inngest scheduling/retry/
  replay/idempotency/run history, live HyperDX product visibility, real Elysia
  serving, or production migration readiness.

Focused gates:

- targeted mini-runtime behavior gate selected during the plan step;
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

## Plan

1. Gather current source/test evidence for oRPC, Inngest, runtime invocation,
   telemetry export, redaction, and migration/control-plane observation.
2. Assimilate child 3's layer taxonomy and decide the smallest high-leverage
   executable slice that proves disagreement preservation.
3. Lay down the concrete test oracle before behavior edits.
4. Implement only the mini-runtime behavior needed to satisfy the oracle.
5. Run leaf verification first: focused tests, structural/report checks, and
   redaction checks.
6. Run parent/judgment review across non-overlapping axes:
   proof honesty, architecture/authority, testing/oracle, vendor fidelity,
   telemetry semantics, coordination/program health, and information design.
7. Reconcile findings with DRA accept/reject/revise decisions.
8. Promote only earned `simulation-proof`; fence residuals with owners and
   re-entry triggers.
9. Close with next packet and clean repo/Graphite state.

Stop conditions:

- Stop if proof requires production host mutation.
- Stop if a green assertion depends on collapsing HTTP/protocol/runtime/
  telemetry/control-plane layers.
- Stop if product HyperDX visibility, durable async, public API/DX, or real
  Elysia hosting enters as incidental work.
- Stop if a source change would leak secret-like values into telemetry,
  control-plane summaries, or reports.

## Discovery Log

Opening verification:

- Child 3 closed as ledger-only coordination and selected this workstream.
- The manifest/focus state was moved to child 4 before implementation.
- Source/test edits stayed inside `tools/runtime-realization-type-env/**`.

Agent lanes:

| Lane | Status | Output |
| --- | --- | --- |
| Official vendor docs | complete | oRPC, Inngest, OpenTelemetry/OTLP, and HyperDX docs were refreshed as vendor-docs evidence only. Public Inngest docs did not establish the exact `206`/`StepRun`/payload shape, so installed package source/behavior remained required. |
| Installed package/source evidence | complete | Installed versions inspected: `@orpc/server@1.13.5`, `@orpc/contract@1.13.5`, `inngest@3.51.0`, `effect@3.21.2`. Inngest source shows step responses can return HTTP `206` with operation body, and public docs remain non-authoritative for RAWR payload status. |
| Runtime/source evidence | complete | The scoped implementation changed `src/mini-runtime/adapters/inngest-async.ts` only for Inngest response observation and clarified `migration-control-plane-observation.ts` comments. |
| Testing/oracle design | complete | New focused test `test/mini-runtime/phase-three-layer-disagreement-failure-observation.test.ts` asserts the actual layer split. |
| Telemetry semantics | complete | Status disagreement is preserved in boundary and telemetry records; the migration/control-plane packet remains run/source/name/export summary only. |
| Program health | complete | Review accepted contained Elysia host passage as the next highest-leverage live-runtime-passage child after child 4. |

Implemented slice:

- oRPC case: contained Fetch/RPCHandler returns HTTP `200`, while the RAWR
  response body, runtime events, adapter events, harness records, and boundary
  record preserve failure.
- Inngest case: contained Bun serve/function/step returns HTTP `206` with
  protocol operation `StepRun`, while the nested RAWR payload carries
  `status: "failure"` and boundary observation records
  `protocolPayloadRuntimeStatus: "failure"`.
- Telemetry case: projected records preserve failure-bearing runtime, adapter,
  harness, oRPC, and Inngest statuses before OTLP export is considered.
- Export case: injected OTLP export failure stays observation-plane and does
  not rewrite runtime or boundary outcomes.
- Control-plane case: packet summarizes run/source/name/export correlation
  only; it does not embed per-layer status attributes, OTLP payloads, failed
  export bodies, or live handles.

Gate record before closeout:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/phase-three-layer-disagreement-failure-observation.test.ts`: passed after review repairs.
- `bunx nx run runtime-realization-type-env:typecheck`: passed.
- `bunx nx run runtime-realization-type-env:mini-runtime`: passed after review repairs.
- `bunx nx run runtime-realization-type-env:structural`: passed after review repairs.
- `bunx nx run runtime-realization-type-env:report`: passed and reported
  current experiment `phase-three.contained-elysia-host-passage`.
- `bunx nx run runtime-realization-type-env:gate`: passed after removing the
  invalid aggregate gate name from the manifest entry.
- `bun run runtime-realization:type-env`: passed; this invokes the same
  `runtime-realization-type-env:gate`.

## Review Result

Layered review status:

| Axis | Owner | Exclusion boundary | Verdict | Material findings | DRA disposition |
| --- | --- | --- | --- | --- | --- |
| Proof honesty / authority | Wegener `019de1c2-1674-7803-8aa3-0b628ce814a6` | Proof category, authority order, and false-green risk only. | Accepted with repair. | Manifest/report still `todo`; control-plane wording too broad; vendor lane pending in report. | Repaired by promoting only after closeout, narrowing control-plane to summary/correlation, and recording vendor lane disposition. |
| Mini-runtime behavior / oracle | Euler `019de1c2-16b9-7860-ad55-c8411a4873e9` | Test oracle only. | Accepted with repair. | Telemetry assertions did not prove failure status preservation for adapter/harness/oRPC records; control-plane proof must be correlation-only if not modeled. | Repaired by projecting adapter events through `recordEvent(...)`, adding telemetry status assertions, and narrowing control-plane claim. |
| Vendor fidelity | Descartes `019de1c2-176b-7c30-81a5-42097ef7c0dc` | Vendor/installed/docs distinction only. | Accepted with repair. | `protocolStepStatus` misnamed RAWR payload status as vendor protocol status; manual oRPC body must not become public client guidance. | Repaired by renaming to `protocolPayloadRuntimeStatus`; oRPC request remains installed/lab-contained Fetch evidence only. |
| Telemetry/control-plane semantics | Dewey `019de1c2-6c48-75f1-85d8-c08f1608e635` | Telemetry and control-plane only. | Accepted with clarification. | Packet event names can imply status; live handles in free-form packet attributes are redacted, not rejected. | Repaired wording: packet keeps source/name/export metadata, not normalized status; deployment authority fields are rejected while free-form candidate/report attributes are sanitized. |
| Coordination / overall program health | Cicero `019de1c2-6c81-7f03-9b3a-31506ad1522c` | Program direction only. | Accepted. | Child 4 is aligned once artifacts close; next child should be contained Elysia host passage. | Accepted as child 5 control decision. |
| Mechanical / information design | Ampere `019de1c2-6cde-71c2-95d6-8b4d03bfcd5f` | Status consistency and resume usability only. | Accepted with repair. | Report, manifest, vendor lane, and snapshot shape were stale mid-closeout. | Repaired by completing this report, manifest/focus/program updates, deferred inventory, next packet, and gate record. |

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None. | None. | N/A | Findings were repaired or proof language was narrowed. | N/A | N/A |

Invalidations:

- Invalidated: `protocolStepStatus` as a field name. The nested `StepRun`
  `data.status` is RAWR callback payload status, not Inngest protocol status.
- Invalidated: any child 4 wording that says the control-plane packet preserves
  per-layer status disagreement. It preserves run/source/name/export summary
  correlation only.
- Invalidated: any use of manual oRPC `{ json: ... }` test request shape as
  public client guidance. It is lab-contained installed RPCHandler evidence.

Repair demands:

- Rename Inngest nested status observation to `protocolPayloadRuntimeStatus`.
- Strengthen telemetry assertions for adapter/harness/oRPC status preservation.
- Narrow manifest/report proof wording to control-plane summary/correlation.
- Update current-state artifacts and open the next child only after proof
  promotion gates pass.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| Vendor protocol status and RAWR payload status are easy to conflate when the vendor operation carries user callback data. | Field names can over-promote vendor semantics. | Future vendor-boundary proofs must distinguish vendor operation status from RAWR payload/runtime status in field names and report text. | Phase Three DRA; child 5 and later vendor children. |
| Control-plane summaries can sound more authoritative than they are. | Summary packets can be mistaken for status, persistence, or placement proof. | Future control-plane mentions must state whether they are correlation/index metadata, normalized status summary, persistence, or placement authority. | Phase Three DRA; future control-plane child if opened. |
| Telemetry projection loses attributes if event-shaped values are passed without an `attributes` wrapper. | A test can see event names while silently dropping status fields. | Tests that project non-telemetry records must use `recordEvent(...)` or an equivalent attribute-preserving wrapper. | Phase Three DRA; future telemetry tests. |

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| The child earns contained proof that transport/protocol envelopes can disagree with RAWR runtime outcomes without being collapsed into a false-green boundary record. | Focused child4 test; Inngest adapter observation; oRPC and Inngest boundary records. | Promote contained `simulation-proof` only. | High |
| Status disagreement is preserved in telemetry projection before export. | Telemetry assertions now check failure status on runtime, adapter, harness, oRPC, and Inngest records. | Promote as mini-runtime telemetry projection proof only. | High |
| OTLP export failure remains observation-plane. | Injected failed export returns failed result while server/async runtime bodies remain failure. | Promote as contained export-separation proof only. | High |
| Migration/control-plane packet does not preserve per-layer status. | Packet omits `protocolPayloadRuntimeStatus`, OTLP payload, and failed export body while keeping run/source/name/export summary. | Do not promote status-preservation proof for control-plane. | High |
| Real Elysia host passage is now the next highest-leverage server-side gap. | Program health review; diagnostic and vendor-fidelity residuals. | Open child 5 as contained Elysia host passage. | High |

## Report

Proof promotions:

- `audit.p3.layer-disagreement-failure-observation-proof` promotes from `todo`
  to contained `simulation-proof`.
- The earned claim is narrow: inside the mini-runtime lab, representative oRPC
  and Inngest boundary responses preserve layer-specific disagreement across
  HTTP transport, vendor operation/body, RAWR runtime result, adapter/harness
  records, boundary records, telemetry projection, OTLP export result, and
  migration/control-plane summary correlation.

Proof non-promotions:

- Production runtime passage.
- Production host lifecycle.
- Real Elysia serving.
- Durable Inngest scheduling, retry, replay, idempotency, or run history.
- Live HyperDX product visibility, dashboard, query, retention, or alerting.
- RuntimeCatalog persistence.
- Control-plane topology, placement, storage, or status authority.
- Native host telemetry/error mapping.
- Public API/DX law.
- Final Nx/generator ratchet.

Diagnostic changes:

- `runtime-spine-verification-diagnostic.md` now records child 4 as additional
  contained layer-disagreement evidence in server/async/telemetry rows while
  leaving host, durable async, HyperDX product, persistence, and production
  migration residuals yellow/fenced.
- `spine-audit-map.md` now records child 4 as `Simulation proof plus expected
  fail`.
- `vendor-fidelity.md` now records that Inngest `StepRun` can carry RAWR
  payload status in the lab, but this is not durable Inngest status semantics.

Spec feedback:

- None. The child did not hit a runtime spec design wall.

Test-theater removals or downgrades:

- Control-plane status preservation was downgraded to summary/correlation
  evidence rather than modeled by implication.
- Manual oRPC request construction remains a lab request helper, not public
  oRPC client grammar.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Contained Elysia host passage | `todo` | Child 4 proved Fetch/RPCHandler and Inngest layer disagreement, not real Elysia app/mount/request lifecycle. | Runtime spec host/surface-adapter sections; `vendor-fidelity.md`; child 5 opening packet. | Child 5 opens with Elysia skill/docs/source lanes and contained lab proof target. | Any server-host claim needs more than oRPC Fetch boundary evidence. | `2026-05-01-phase-three-contained-elysia-host-passage.md` | `lab` |
| Durable Inngest semantics | `xfail` | Child 4 uses contained Inngest serve/function/step behavior and installed source, not managed backend scheduling/retry/replay/idempotency/run history. | Runtime spec async sections; Inngest official docs; future durable async packet. | A durable async child or externality phase accepts product/backend risk. | Migration planning needs durable run semantics. | Durable async externality/design child or later phase. | `spec/migration-only` |
| HyperDX product visibility | `xfail` | Child 4 uses deterministic OTLP payload/export failure only. | Telemetry residual entries; HyperDX docs. | A product-visible ingest/query/dashboard/retention gate is accepted. | A proof tries to claim product observability. | HyperDX/product observability externality child. | `spec/migration-only` |
| Control-plane status/persistence/topology | `xfail` | Packet is run/source/name/export summary and candidate-only placement hint. | Migration/control-plane residual entries. | A control-plane child accepts normalized status, persistence, topology, or placement authority. | A later proof depends on durable packet state or placement decisioning. | Control-plane decision packet or later phase. | `spec/migration-only` |
| Native host telemetry/error mapping | `xfail` | Boundary records are lab observations and do not define public/native host error law. | Runtime spec diagnostics/adapter sections; child 3 semantics ledger. | A host child or decision packet accepts final mapping. | Elysia or production host work needs public error mapping. | Elysia host passage may consume; final mapping likely later. | `lab/spec` |
| Public API/DX law | `xfail` | Child 4 uses internal lab helpers and does not settle final authoring grammar. | Runtime spec; service-package integration snapshot as reference only. | A child cannot proceed without accepted public law. | Author-facing syntax becomes blocker. | Public API/DX decision packet. | `spec` |
| Final Nx/generator ratchet | `out-of-scope` | Live-passage proof is still being deepened. | Phase Three program and closeout trajectory. | Phase Three closeout says live-passage uncertainty is small enough. | All live-passage children close or are fenced. | Later structure/Nx/generator phase. | `lab/out-of-scope` |

## Pattern Decisions

| Pattern | Local fix | Structural remediation | Passive absorption target | DRA disposition |
| --- | --- | --- | --- | --- |
| Vendor operation bodies can carry RAWR payload facts that look like vendor status. | Renamed `protocolStepStatus` to `protocolPayloadRuntimeStatus`. | Require vendor-boundary proofs to name vendor operation status and RAWR payload/runtime status separately. | Child opening packet review axis and future vendor proof reports. | Accepted. |
| Telemetry projection can silently drop top-level event fields. | Project adapter events through `recordEvent(...)` and assert failure statuses. | Tests projecting non-telemetry records must wrap them into `attributes` before projection. | Future telemetry/oracle checklist. | Accepted. |
| Control-plane summaries can be overread as status/persistence authority. | Narrowed child 4 claim to run/source/name/export summary correlation only. | Control-plane claims must label correlation/index metadata vs normalized status vs persistence vs placement. | DRA workflow proof language and future control-plane packets. | Accepted. |
| Mid-closeout artifacts look stale until review findings are integrated. | Completed closeout report, manifest/focus updates, and next packet after review. | Mechanical review should distinguish mid-closeout stale state from committed stale state, but still require repair before proof promotion. | Review result disposition. | Accepted. |

## Final Output

Artifacts:

- `src/mini-runtime/adapters/inngest-async.ts`
- `src/mini-runtime/migration-control-plane-observation.ts`
- `test/mini-runtime/phase-three-layer-disagreement-failure-observation.test.ts`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/spine-audit-map.md`
- `evidence/vendor-fidelity.md`
- `evidence/workstreams/2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`
- `evidence/workstreams/2026-05-01-phase-three-contained-elysia-host-passage.md`

Verification run:

- Focused child4 test: passed.
- `runtime-realization-type-env:typecheck`: passed.
- `runtime-realization-type-env:mini-runtime`: passed.
- `runtime-realization-type-env:structural`: passed.
- `runtime-realization-type-env:report`: passed.
- `runtime-realization-type-env:gate`: passed.
- `bun run runtime-realization:type-env`: passed.

Repo/Graphite state:

- In-flight dirty until the child4 closeout and child5 opening checkpoint is
  committed via Graphite.

Current focus after closeout:

- Active child id: `phase-three.contained-elysia-host-passage`.
- Accepted next child:
  `2026-05-01-phase-three-contained-elysia-host-passage.md`.

## Next Workstream Packet

Recommended next workstream:

- `2026-05-01-phase-three-contained-elysia-host-passage.md`

Why this is next:

- Child 4 deepened boundary/failure/observation proof around contained oRPC
  Fetch and Inngest paths. The largest remaining server-side live-passage gap
  is a real contained Elysia app/mount/request/error/lifecycle passage around
  the existing server boundary, without mutating production code or claiming
  production HTTP readiness.

Required first reads:

- `../phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`
- `2026-05-01-phase-three-program-workstream.md`
- this report
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../vendor-fidelity.md`
- local `elysia` skill and official Elysia docs
- `src/mini-runtime/adapters/orpc-server.ts`
- `src/mini-runtime/harnesses.ts`
- `test/mini-runtime/server-orpc-boundary.test.ts`

First commands:

- `git status --short --branch`
- `gt status --short`
- `bunx nx show project runtime-realization-type-env --json`
- `bun test tools/runtime-realization-type-env/test/mini-runtime/phase-three-layer-disagreement-failure-observation.test.ts`

Deferred items to consume:

- Real Elysia host passage is now the active child.
- Durable Inngest, HyperDX product visibility, control-plane persistence,
  public API/DX law, and final Nx/generator ratchet remain fenced unless a DRA
  control decision changes sequence.

## Final Output

Pending.
