# Phase Three Integrated Live-Passage Rehearsal And Closeout

Status: `open`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `pending`.

This is the active child-7 workstream for Phase Three. It is the integration
and closeout container for the contained live-runtime-passage program. It is
not runtime architecture authority, production migration authorization, product
observability authority, final public API/DX authority, or final Nx/generator
ratchet authorization.

## Current State

| Field | Value |
| --- | --- |
| Program state | Phase Three open; child 7 active. |
| Workstream type | Integrated rehearsal decision, possible executable proof, and program closeout. |
| Proof target | `simulation-proof` only if an integrated contained rehearsal is implemented and gated. Otherwise this child remains coordination/closeout evidence only. |
| Active question | Can the earned Phase Three proof slices compose into one inspectable contained runtime passage, or must Phase Three close with focused proofs plus an explicit non-closeable integration finding? |
| Blocked claims | Production migration readiness, production HTTP/worker lifecycle, durable Inngest semantics, live HyperDX product visibility, RuntimeCatalog persistence, production control-plane topology, final public API/DX law, and final Nx/generator ratchet. |

## Frame

Objective:

- Reconcile child 1 through child 6 into one Phase Three program judgment.
- Decide whether an integrated executable rehearsal can honestly add proof
  beyond the focused slices.
- If it can, execute the smallest contained integrated rehearsal that increases
  proof depth without hiding missing focused gates.
- If it cannot, close Phase Three explicitly with the focused proof set and a
  precise reason the integrated claim remains fenced.
- Produce a final Phase Three closeout packet that a zero-context agent can use
  to start the next phase without chat memory.

Containment boundary:

- Work stays inside `tools/runtime-realization-type-env/**`.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`, `plugins/*`,
  deployment topology, product observability, and final Nx/generator ratchets
  remain out of scope unless explicit control input changes the program.
- Existing focused proof tests may be composed or referenced; do not weaken
  their falsifiers to make integration easy.

Non-goals:

- Do not migrate production code.
- Do not decide final public API/DX law unless a real closeout blocker requires
  a decision packet.
- Do not claim durable async, product HyperDX, RuntimeCatalog persistence,
  production host lifecycle, or production migration readiness.

## Opening Packet

Opening input:

- Child 6 closed as contained `simulation-proof` for local Elysia/Bun
  listen/request/stop lifecycle.
- The child-6 program-health reviewer recommended opening an integrated
  rehearsal/closeout workstream rather than a broad externality ledger.
- The DRA accepted that recommendation because focused server, async,
  stop/finalization, failure-observation, telemetry/control-plane, and local
  listener slices now exist inside containment.

Prior stages to assimilate:

- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`
- `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`
- `2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`
- `2026-05-01-phase-three-contained-elysia-host-passage.md`
- `2026-05-01-phase-three-contained-elysia-listen-lifecycle-passage.md`

Authority inputs:

- manifest-pinned runtime spec:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- architecture context:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- active program:
  `2026-05-01-phase-three-program-workstream.md`
- active DRA workflow:
  `../phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../vendor-fidelity.md`
- `../focus-log.md`
- `../phased-agent-verification-workflow.md`

Selected skill lenses:

- `team-design`: review lanes and program-health feedback loop.
- `architecture`: integration boundaries and no hidden second execution model.
- `target-authority-migration`: proof ceiling, residual routing, and next-phase
  handoff.
- `testing-design`: whether an integrated rehearsal has a falsifiable oracle.
- `information-design`: closeout and handoff shape.

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `unknown at opening`: this child will at least reconcile existing Elysia, oRPC, Inngest, Effect, OTLP/telemetry evidence. It may touch vendor behavior only if an executable integrated rehearsal is accepted. |
| Required skill introspection | Reuse prior skill/vendor evidence for unchanged behavior; introspect relevant vendor skills again before adding or changing any Elysia, oRPC, Inngest, Effect, OTLP, OpenTelemetry, or HyperDX behavior. |
| Official-docs lane | Required only if this child investigates new vendor behavior or changes vendor-facing proof claims. Existing official-docs reports remain evidence for unchanged focused slices. |
| Telemetry mining | Required if the integrated rehearsal changes telemetry/control-plane shape: mine `TELEMETRY_DESIGN.md`, `TELEMETRY.md`, and discovered related telemetry docs as source material, not uncontested authority. |
| Golden integration exemplar | Reference-only unless author-facing integration shape becomes a design topic. Runtime spec remains boundary/proof authority. |
| Durable report disposition | Any new useful vendor/integration insight must update `vendor-fidelity.md` or create a clearly labeled reference report. Pure closeout synthesis stays in this report. |

## Output Contract

Required outputs:

- Prior-child assimilation ledger for children 1 through 6.
- Integrated-rehearsal decision: executable, closeout-only, or split required.
- If executable: a focused plan, source/test changes, falsifiable oracle, and
  gates that prove something not already covered by isolated child tests.
- If closeout-only: an evidence-backed explanation of why an integrated
  executable claim would overstate the lab proof.
- Final Phase Three proof/non-proof reconciliation.
- Residual inventory grouped by next likely container:
  externality/design, final structure/Nx/generator, production migration, or
  deliberately abandoned.
- Layered review across mechanical, proof honesty, architecture, leverage,
  information design, coordination/program health, and adversarial false-green
  axes.
- Program closeout and next-phase handoff.

Proof ceiling:

- Integrated executable proof can promote only contained `simulation-proof`.
- Closeout synthesis is coordination evidence and cannot promote behavior by
  itself.

Expected gates:

- focused integrated target if one is accepted;
- `jq empty tools/runtime-realization-type-env/evidence/proof-manifest.json`;
- manifest spec hash check;
- `bunx nx run runtime-realization-type-env:typecheck`;
- `bunx nx run runtime-realization-type-env:mini-runtime`;
- `bunx nx run runtime-realization-type-env:structural`;
- `bunx nx run runtime-realization-type-env:report`;
- `bunx nx run runtime-realization-type-env:gate`;
- `git diff --check`;
- `git status --short --branch`;
- `gt status --short`.

## Plan

1. Gather current proof/status authority and all closed Phase Three child
   reports.
2. Assimilate child outputs, residuals, review repairs, pattern decisions, and
   gates.
3. Decide the real proof question for this child: executable integrated
   rehearsal, closeout-only reconciliation, or split.
4. If executable, lock a minimal falsifiable oracle before edits.
5. If closeout-only, write the non-promotion rationale before closeout.
6. Execute the accepted path inside containment.
7. Run leaf gates first, then parent/judgment review.
8. Promote only earned proof; fence every residual.
9. Close Phase Three with next-phase handoff and clean repo/Graphite state.

Stop conditions:

- Stop if integration would weaken focused child falsifiers.
- Stop if the only way to produce an integrated green claim is to imply
  production readiness.
- Stop if integration requires production `apps/*`, deployment topology,
  product HyperDX, durable Inngest, RuntimeCatalog persistence, or final
  Nx/generator work.
- Stop if residuals cannot be authority-homed with re-entry triggers.

## Discovery Log

Pending. First action is prior-child assimilation and integrated-rehearsal
decision, not implementation.

## Review Result

Pending.

## Final Output

Pending.
