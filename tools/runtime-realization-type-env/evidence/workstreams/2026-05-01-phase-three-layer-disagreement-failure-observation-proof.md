# Phase Three Layer Disagreement Failure Observation Proof

Status: `open`.
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
| Child state | Child 4 active. |
| Workstream type | Executable contained proof slice. |
| Proof target | `simulation-proof` only if source/tests/gates prove layer-disagreement preservation inside the mini-runtime lab. |
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
  the proof must either add an explicit status-preservation summary to the
  migration/control-plane packet or downgrade the control-plane claim to
  correlation-only so status disagreement cannot be silently lost.
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
- The current manifest/focus state was moved to this child.
- No child-4 runtime behavior has been implemented yet.

Agent lanes:

| Lane | Status | Output |
| --- | --- | --- |
| Runtime/source evidence | pending | Inspect current adapters, harness, runtime, telemetry, redaction, and control-plane code before edits. |
| Testing/oracle design | pending | Confirm the exact disagreement cases and expected assertions. |
| Vendor fidelity | pending | Reuse DRA-accepted child 3 official-docs findings as opening context, then refresh the exact vendor facts needed for the executable slice before source/test edits or proof promotion. |
| Telemetry semantics | pending | Ensure mini-runtime telemetry remains distinct from parent-app telemetry and HyperDX product proof. |
| Program health | pending | Confirm the child stays on the Phase Three domino and does not drift into later phases. |

## Review Result

Pending.

## Final Output

Pending.
