# Phase Three Native Boundary Observation And Failure Semantics Ledger

Status: `open`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `pending`.

This report is the active child-3 workstream for Phase Three. It is not
runtime architecture authority, final public API/DX authority, product
observability proof, durable async proof, production migration authorization, or
permission to implement production host paths.

## Current State

| Field | Value |
| --- | --- |
| Program state | Phase Three open. |
| Child state | Child 3 active. |
| Workstream type | Semantics ledger and scope decision before further implementation. |
| Proof target | No runtime behavior proof yet; this child may recommend a contained proof slice, decision packet, or clean deferral. |
| Active question | What native boundary failure, telemetry, and observation semantics must Phase Three understand before it can honestly deepen oRPC, Inngest, Elysia, OpenTelemetry, and HyperDX claims? |
| Blocked claims | Production migration readiness, production host lifecycle, durable Inngest semantics, product HyperDX visibility, RuntimeCatalog persistence, native host telemetry/error mapping, public API/DX law, and final Nx/generator ratchet. |

## Frame

Objective:

- Consume the child-2 finding that native vendor protocols can encode failure
  outside simple HTTP status, especially Inngest `StepError` inside HTTP `206`.
- Decide what boundary observation and failure semantics Phase Three needs
  before it deepens server, async, telemetry, or vendor claims.
- Produce a durable ledger that separates vendor-native envelope, RAWR runtime
  outcome, telemetry/status projection, public/native host error mapping, and
  product observability.
- Recommend exactly one next move for DRA disposition: executable contained
  proof, decision packet, or clean deferral.

Containment boundary:

- Source/test edits stay inside `tools/runtime-realization-type-env/**` only if
  this child later proves an executable contained gate is the right output.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`, `plugins/*`,
  root exports, deployment topology, and final Nx/generator ratchets remain out
  of scope.

## Opening Packet

Prior stage consumed:

- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`
- `2026-05-01-phase-three-started-passage-vendor-integration-reference.md`

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

Local telemetry/integration docs to mine:

- `docs/projects/orpc-ingest-domain-packages/resources/spec/TELEMETRY_DESIGN.md`
- `docs/projects/orpc-ingest-domain-packages/resources/spec/DECISIONS.md`
- `docs/projects/orpc-ingest-domain-packages/resources/spec/guidance.md`
- `docs/system/quarantine/TELEMETRY.md`
- `docs/system/quarantine/telemetry/orpc.md`
- `docs/system/quarantine/telemetry/hyperdx.md`
- `docs/system/quarantine/telemetry/hq-runtime.md`
- `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`

Selected skill lenses:

- `team-design`: review topology and non-overlapping discovery/review lanes.
- `target-authority-migration`: authority ceilings, clean deferrals, and
  negative-space routing.
- `architecture`: runtime/host/product/author-DX boundary separation.
- `testing-design`: falsifier-first boundary oracle design.
- `orpc`: oRPC boundary and telemetry idioms.
- `inngest`: Inngest function/step/failure envelope idioms.
- `elysia`: required if the child considers any real Elysia host semantics.

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `yes`: oRPC, Inngest, Elysia if considered, OpenTelemetry/OTLP, HyperDX. |
| Required skill introspection | `orpc`, `inngest`, `elysia`; Effect/OTEL/HyperDX skills are `none found` unless later discovery finds them. |
| Official-docs lane | Required. Dedicated docs lane must start broad-to-deep from docs hubs/navigation/sitemaps before narrow pages. |
| Golden integration exemplar | Required as reference-only input for native-fit author surface vs RAWR-owned operational seams. |
| Integration Exemplar Reconciliation | Authority label: `reference-only`; principle extracted: native author-facing grammar plus RAWR-owned lifecycle/runtime/telemetry seams; runtime-spec conflict check required; stale details rejected: old `.handler(...)` / `.effect(...)` terminal split; proof ceiling: ledger only unless a later executable gate is accepted. |
| Durable report disposition | Reuse and update `2026-05-01-phase-three-started-passage-vendor-integration-reference.md` or create a successor reference if this child discovers durable new vendor semantics. |

## Output Contract

Required outputs:

- Boundary semantics matrix covering at least:
  oRPC Fetch/RPCHandler, Inngest Bun serve/function/step, Elysia if considered,
  OpenTelemetry/OTLP, and HyperDX.
- Failure envelope taxonomy:
  HTTP status, protocol body, vendor operation status, RAWR runtime invocation
  result, harness record, boundary record, telemetry projection, and public/native
  host mapping.
- Observation projection rules:
  what can be recorded now, what must remain vendor-native, what can enter
  mini-runtime telemetry, what must stay product-observability residual.
- Proof/non-proof boundaries and residual routing owners.
- Recommended next move with one of:
  executable contained proof slice, decision packet, or clean deferral.
- Layered review results with overall-program-health lane before DRA control
  decision.

Proof ceiling:

- This child is a ledger/scoping child until it opens an executable proof gate.
- Vendor docs can support `vendor-proof` only.
- A later contained adapter/runtime gate may support `simulation-proof`.
- No production-readiness claim is possible here.

Focused gates:

- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

If this child adds source/test behavior, it must select focused behavior gates
before implementation.

## Plan

1. Gather evidence from prior child reports, vendor fidelity, telemetry docs,
   runtime authority, and official vendor docs.
2. Separate facts by layer:
   vendor envelope, RAWR runtime result, host adapter observation, telemetry
   projection, product observability, public/native host error mapping.
3. Decide this child's real output:
   ledger-only, executable proof, decision packet, or clean deferral.
4. If executable proof is selected, lay down the focused oracle and gates before
   implementation.
5. Run layered review:
   vendor fidelity, architecture/proof honesty, testing/oracle design,
   telemetry semantics, information design/coordination, and
   overall-program-health.
6. Close with DRA accept/reject/revise recommendation for the next child.

Stop conditions:

- Stop if the proof requires production host mutation.
- Stop if vendor docs or local telemetry docs are promoted into runtime
  authority without DRA disposition.
- Stop if a failure/status claim can only be true by ignoring a vendor-native
  envelope.
- Stop if product HyperDX visibility, durable async semantics, public API/DX,
  or Elysia production hosting tries to enter as incidental work.

## Discovery Log

Opening verification:

- Child 2 closed with full `runtime-realization-type-env:gate` passing.
- Manifest current experiment and focus log were moved to this child at opening.
- Worktree contains DRA-owned Phase Three edits that must be committed before
  this child closes.

Agent lanes:

| Lane | Status | Output |
| --- | --- | --- |
| Official vendor docs | pending | Required broad-to-deep docs lane. |
| Local telemetry semantics | pending | Required mining of parent-app and mini-runtime telemetry docs. |
| Runtime/source surface | pending | Required inspection of current oRPC/Inngest/Elysia-adjacent mini-runtime source and tests. |
| Testing/oracle design | pending | Required if this child recommends executable proof. |

## Review Result

Pending.

## Final Output

Pending.
