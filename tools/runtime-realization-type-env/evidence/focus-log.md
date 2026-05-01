# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `phase-three.contained-elysia-host-passage`
- Focus: open the contained Elysia host passage:
  prove inside the mini-runtime lab whether a real Elysia app/mount/request
  layer can wrap or delegate into the contained server runtime boundary while
  preserving host, oRPC if crossed, RAWR runtime, harness/boundary, telemetry,
  and control-plane observation layers without claiming production HTTP
  readiness while keeping production migration readiness, production host
  lifecycle, durable Inngest semantics, live HyperDX product visibility,
  RuntimeCatalog persistence, native host telemetry/error mapping, public
  API/DX law, and final structure/Nx/generator ratchet fenced.
- Related manifest entries:
  - `audit.p3.contained-elysia-host-passage`
  - `audit.p3.layer-disagreement-failure-observation-proof`
  - `audit.p3.native-boundary-observation-failure-semantics-ledger`
  - `audit.p3.started-process-assembly-stop-finalization-passage`
  - `audit.p3.live-runtime-passage-scope-claim-ledger`
  - `audit.p3.phase-three-program-workstream`
  - `accepted.effect-only-authoring`
  - `accepted.invocation-bound-clients`
  - `simulation.middle-spine-derivation-compiler`
  - `audit.telemetry.hyperdx-observation`
  - `audit.telemetry.hyperdx-observation.residual`
  - `audit.migration.control-plane-observation`
  - `audit.migration.control-plane-observation.residual`
  - `vendor.boundary.inngest-handoff-shape`
  - `audit.p1.effect-boundary-policy-matrix`
  - `audit.p1.effect-boundary-policy-matrix.residual`
  - `audit.p1.runtime-resource-access`
  - `audit.p2.adapter-effect-callback-lowering`
  - `audit.p2.async-effect-bridge-lowering`
  - `audit.p2.production-harness-mounting`
  - `audit.p2.provider-effect-process-spine`
  - `audit.p2.server-orpc-fetch-boundary`
  - `audit.p2.async-inngest-function-step-boundary`
  - `audit.p2.telemetry-integrated-observation-spine`
  - `audit.p2.integrated-runtime-spine-rehearsal`
  - `audit.p2.phase-two-program-closeout`
  - `simulation.async-step-owner-membership-artifacts`
  - `simulation.adapter-callback-bridge-lowering`
  - `simulation.first-server-async-harness-mounts`
  - `simulation.mini-runtime-registry-invocation`

## Status Meanings

- `proof`: checked by the current type, negative, structural, or report gate.
- `vendor-proof`: checked against installed vendor package behavior or types.
- `simulation-proof`: checked by the miniature runtime or compatibility simulation.
- `xfail`: architecture gap is known and intentionally fenced. It is not automatically a TypeScript failure.
- `todo`: planning input or future fixture not yet part of the gate.
- `out-of-scope`: relevant to migration safety, but not a type-spine proof.

When the focus changes, update this file and `proof-manifest.json` together. Do not add owners, dates, kanban states, or migration tasks here.
