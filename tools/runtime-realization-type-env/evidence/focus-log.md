# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `phase-two.integrated-runtime-spine-rehearsal`
- Focus: prove the earned Phase Two provider, server, async, telemetry,
  catalog, derivation, and compilation claims compose in one contained
  runtime-spine rehearsal with executable falsifiers, while keeping production
  migration readiness and Phase Three topology/Nx/generator work fenced.
- Related manifest entries:
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
