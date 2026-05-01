# Phase Three Contained Elysia Host Passage

Status: `open`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `pending`.

This report is the active child-5 workstream for Phase Three. It is not runtime
architecture authority, final public API/DX authority, production HTTP proof,
production migration authorization, or permission to mutate production app code.

## Current State

| Field | Value |
| --- | --- |
| Program state | Phase Three open. |
| Child state | Child 5 active. |
| Workstream type | Executable contained proof slice. |
| Proof target | `simulation-proof` only if source/tests/gates prove a real contained Elysia host passage around the mini-runtime server boundary. |
| Active question | Can the lab mount a real Elysia app/route around the contained server runtime boundary, send a real request through that host layer, preserve lifecycle/error/observation records, and still avoid production HTTP readiness claims? |
| Blocked claims | Production HTTP serving, production host lifecycle, OpenAPI/product API policy, auth/logging policy, native host telemetry/error mapping, production migration readiness, durable async semantics, live HyperDX product visibility, RuntimeCatalog persistence, public API/DX law, and final Nx/generator ratchet. |

## Frame

Objective:

- Cross the server-host gap that remains after contained oRPC Fetch and
  layer-disagreement proofs.
- Determine how much of a real Elysia host/mount/request lifecycle can be
  proven inside the mini-runtime lab without touching production `apps/*`.
- Keep oRPC, RAWR runtime, Elysia host, telemetry, and control-plane evidence
  in separate proof layers.

Containment boundary:

- Source/test edits must stay inside `tools/runtime-realization-type-env/**`.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`,
  `plugins/*`, root exports, deployment topology, and final Nx/generator
  ratchets remain out of scope.

Non-goals:

- Do not claim production HTTP readiness or production Elysia lifecycle.
- Do not settle final public API/DX, OpenAPI publication, auth/logging,
  product API policy, native host telemetry/error mapping, or deployment
  topology.
- Do not open durable Inngest, HyperDX product visibility, RuntimeCatalog
  persistence, or Nx/generator work.

## Opening Packet

Prior stages consumed:

- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`
- `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`
- `2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`

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
- `architecture`: host/runtime/vendor/product boundary separation.
- `testing-design`: falsifier-first executable oracle.
- `elysia`: Elysia host, route, mount, request, and error idioms.
- `orpc`: only if the child routes oRPC through Elysia rather than a minimal
  host adapter probe.

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `yes`: Elysia directly; oRPC if the proof mounts an oRPC Fetch/RPCHandler path under Elysia; telemetry/control-plane only as observation. |
| Required skill introspection | `elysia`; `orpc` if oRPC is crossed; Effect/OTEL/HyperDX skills are `none found` unless later discovery finds them. |
| Official-docs lane | Required before source/test edits and before any Elysia-related proof promotion. The lane must start broad-to-deep from Elysia docs/navigation before selecting exact pages. |
| Golden integration exemplar | Reference-only if author-facing integration shape or vendor-native surface design becomes relevant. Runtime spec wins boundary/lifecycle/proof authority. |
| Durable report disposition | If this child discovers useful Elysia integration rules for later runtime design, update `vendor-fidelity.md` or create a labeled reference report. Otherwise keep findings inside this child report. |

## Output Contract

Required executable proof outputs:

- A focused mini-runtime test or test cluster that proves the selected Elysia
  host passage.
- Any required lab-contained source changes for Elysia host/mount adaptation.
- Clear separation of:
  - Elysia host/request status;
  - oRPC/RPCHandler status if crossed;
  - RAWR runtime invocation result;
  - harness and boundary records;
  - telemetry projection/export observations;
  - control-plane summary/correlation.
- Updated proof manifest/focus log/diagnostic/vendor maps as applicable.
- Layered review result with an overall-program-health lane.

Candidate proof cases:

- Real Elysia app handles a real `Request` through its fetch interface.
- Elysia route or mounted handler delegates into the existing contained server
  boundary instead of executing descriptors directly.
- Runtime failure and host-level status/error behavior remain distinct.
- Missing route or invalid method rejects before runtime delegation.
- Redaction prevents request/resource/execution secrets and live handles from
  leaking into responses, telemetry, or packet summaries.

Proof ceiling:

- Passing this child can promote only contained `simulation-proof`.
- It cannot prove production HTTP serving, production host lifecycle,
  OpenAPI/product policy, auth/logging, native host telemetry/error mapping, or
  production migration readiness.

Focused gates:

- targeted Elysia host passage test selected during the plan step;
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

## Plan

1. Gather current server boundary, harness, oRPC, and Elysia package evidence.
2. Assimilate child 4's layer-disagreement proof and residual routing.
3. Decide the exact Elysia host proof question before source edits.
4. Run dedicated Elysia official-docs lane and installed-package/source
   inspection.
5. Lock the executable oracle and stop rules.
6. Implement only the lab-contained host passage needed for the oracle.
7. Run leaf verification first, then parent/judgment review across proof
   honesty, architecture/authority, vendor fidelity, testing/oracle,
   telemetry/control-plane, coordination/program health, and mechanical
   information design.
8. Promote only earned `simulation-proof`; fence residuals.
9. Close with next packet and clean repo/Graphite state.

Stop conditions:

- Stop if proof requires production `apps/*` mutation.
- Stop if Elysia evidence starts implying production HTTP readiness.
- Stop if final public API/DX, OpenAPI publication, auth/logging, host-native
  error mapping, product observability, or deployment topology becomes required
  to make the proof green.
- Stop if a green assertion can pass without crossing a real Elysia host layer.

## Discovery Log

Opening verification:

- Child 4 accepted this child as the next live-runtime-passage domino.
- No child-5 runtime behavior has been implemented yet.

Agent lanes:

| Lane | Status | Output |
| --- | --- | --- |
| Elysia official docs | pending | Read local skill and official docs broad-to-deep before implementation. |
| Installed package/source evidence | pending | Verify whether Elysia is root-resolvable in this workspace and how to import/exercise it from the lab. |
| Runtime/source evidence | pending | Inspect current server boundary/harness shape and decide adapter/mount strategy. |
| Testing/oracle design | pending | Lock the exact Elysia request/error/lifecycle assertions. |
| Program health | pending | Confirm this child remains bounded to contained host passage and does not drift into production host work. |

## Review Result

Pending.

## Final Output

Pending.
