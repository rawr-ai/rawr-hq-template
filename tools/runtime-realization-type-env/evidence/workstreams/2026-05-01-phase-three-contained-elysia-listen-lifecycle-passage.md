# Phase Three Contained Elysia Listen Lifecycle Passage

Status: `open`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `pending`.

This report is the active child-6 workstream for Phase Three. It is not runtime
architecture authority, final public API/DX authority, production HTTP proof,
production migration authorization, or permission to mutate production app code.

## Current State

| Field | Value |
| --- | --- |
| Program state | Phase Three open. |
| Child state | Child 6 active. |
| Workstream type | Executable contained proof slice. |
| Proof target | `simulation-proof` only if source/tests/gates prove a real local Elysia listener lifecycle around the contained Elysia -> oRPC -> runtime path. |
| Active question | Can the lab start a real local Elysia listener on an ephemeral port, send a real network request through it into the contained Elysia -> oRPC -> runtime path, record start/request/stop/finalization behavior, and prove post-stop requests do not delegate into runtime without claiming production HTTP readiness? |
| Blocked claims | Production HTTP serving, deployment topology, auth/logging policy, OpenAPI/product API policy, native host telemetry/error mapping, production migration readiness, durable async semantics, live HyperDX product visibility, RuntimeCatalog persistence, public API/DX law, and final Nx/generator ratchet. |

## Frame

Objective:

- Cross the remaining server-host lifecycle gap after child 5's
  `Elysia.handle(new Request(...))` proof.
- Determine how much of a real local listener start/request/stop passage can be
  proven inside the mini-runtime lab without touching production `apps/*`.
- Preserve separate Elysia listener, Elysia route-forwarding host, oRPC,
  RAWR runtime, harness, telemetry, and control-plane evidence layers.

Containment boundary:

- Source/test edits must stay inside `tools/runtime-realization-type-env/**`.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`,
  `plugins/*`, root exports, deployment topology, and final Nx/generator
  ratchets remain out of scope.
- Root/lab dependency changes are allowed only if discovery proves they are
  necessary for contained listener proof and do not add the tool to workspaces.

Non-goals:

- Do not claim production HTTP readiness or production server lifecycle.
- Do not settle final public API/DX, OpenAPI publication, auth/logging,
  product API policy, native host telemetry/error mapping, or deployment
  topology.
- Do not open durable Inngest, HyperDX product visibility, RuntimeCatalog
  persistence, or Nx/generator work.

## Opening Packet

Opening input:

- DRA accepted child 5 as contained `simulation-proof` and accepted this
  narrow listen/lifecycle proof as the next executable child.

Prior stages consumed:

- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`
- `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`
- `2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`
- `2026-05-01-phase-three-contained-elysia-host-passage.md`

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
- `../vendor-fidelity.md`
- `../phased-agent-verification-workflow.md`

Selected skill lenses:

- `team-design`: non-overlapping review and verification lanes.
- `target-authority-migration`: proof ceilings and residual routing.
- `architecture`: listener/runtime/vendor/product boundary separation.
- `testing-design`: falsifier-first executable oracle.
- `elysia`: Elysia listen/server lifecycle, request, and stop idioms.
- `orpc`: only because the listener must route through the existing contained
  oRPC Fetch boundary.

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `yes`: Elysia listener lifecycle directly; oRPC remains crossed through the existing Fetch boundary; telemetry/control-plane only as observation. |
| Required skill introspection | `elysia`, `orpc`; Effect/OTEL/HyperDX skills are `none found` unless later discovery finds them. |
| Official-docs lane | Required before source/test edits and before any Elysia listen/lifecycle proof promotion. The lane must start broad-to-deep from Elysia docs/navigation before selecting listen/server lifecycle pages. |
| Golden integration exemplar | Reference-only if author-facing integration shape or vendor-native surface design becomes relevant. Runtime spec wins boundary/lifecycle/proof authority. |
| Durable report disposition | If this child discovers useful Elysia listener integration rules for later runtime design, update `vendor-fidelity.md` or create a labeled reference report. Otherwise keep findings inside this child report. |

## Output Contract

Required executable proof outputs:

- A focused mini-runtime test or test cluster that proves the selected local
  listener lifecycle passage.
- Any required lab-contained source changes for Elysia listener start/stop
  adaptation.
- Clear separation of:
  - listener start/stop status;
  - Elysia route-forwarding host status;
  - oRPC/RPCHandler status;
  - RAWR runtime invocation result;
  - harness and boundary records;
  - telemetry projection/export observations;
  - control-plane summary/correlation.
- Updated proof manifest/focus log/diagnostic/vendor maps as applicable.
- Layered review result with an overall-program-health lane.

Candidate proof cases:

- Real Elysia listener starts on an ephemeral or local port.
- A real network request crosses the listener into the existing contained
  Elysia route-forwarding host, oRPC boundary, server harness, and process
  runtime.
- Listener stop/finalization is recorded.
- Post-stop network request behavior does not delegate into oRPC/runtime.
- Redaction prevents request/resource/execution secrets and live handles from
  leaking into responses, telemetry, or packet summaries.

Proof ceiling:

- Passing this child can promote only contained `simulation-proof`.
- It cannot prove production HTTP serving, deployment lifecycle, OpenAPI/product
  policy, auth/logging, native host telemetry/error mapping, or production
  migration readiness.

Focused gates:

- targeted Elysia listen/lifecycle passage test selected during the plan step;
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

## Plan

1. Gather current child5 host adapter/test evidence and Elysia package/listen
   evidence.
2. Assimilate child 5's review repairs and proof boundaries.
3. Decide the exact listener lifecycle proof question before source edits.
4. Run dedicated Elysia official-docs lane and installed-package/source
   inspection for listen/stop behavior.
5. Lock the executable oracle and stop rules.
6. Implement only the lab-contained listener lifecycle needed for the oracle.
7. Run leaf verification first, then parent/judgment review across proof
   honesty, architecture/authority, vendor fidelity, testing/oracle,
   telemetry/control-plane, coordination/program health, and mechanical
   information design.
8. Promote only earned `simulation-proof`; fence residuals.
9. Close with next packet and clean repo/Graphite state.

Stop conditions:

- Stop if proof requires production `apps/*` mutation.
- Stop if Elysia listen semantics require deployment/auth/logging/API policy
  decisions to make the contained proof green.
- Stop if a green test can pass without a real local listener.
- Stop if production readiness wording appears before production migration.

## Discovery Log

Opening verification:

- Child 5 accepted this child as the next live-runtime-passage domino.
- No child-6 runtime behavior has been implemented yet.

Agent lanes:

| Lane | Status | Output |
| --- | --- | --- |
| Elysia official docs | pending | Read local skill and official docs broad-to-deep for listen/server lifecycle before implementation. |
| Installed package/source evidence | pending | Verify current `elysia@1.4.24` listener/start/stop behavior from installed package and docs. |
| Runtime/source evidence | pending | Inspect child5 adapter/test and decide whether listener lifecycle wraps existing host or composes beside it. |
| Testing/oracle design | pending | Lock exact listener start/request/stop/post-stop assertions. |
| Program health | pending | Confirm this child remains bounded to contained listener lifecycle and does not drift into production host work. |

## Review Result

Pending.

## Final Output

Pending.
