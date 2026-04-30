# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `lab-v2.semantic-runtime-documentation-harvest`
- Focus: harvest high-signal semantic JSDoc/comments from contained runtime
  realization seams for future production migration copy/paste guidance without
  treating comments as proof, runtime authority, final public API/DX, or
  production readiness.
- Related manifest entries:
  - `accepted.effect-only-authoring`
  - `accepted.curated-effect-public-surface`
  - `audit.p1.effect-managed-runtime-substrate`
  - `audit.p1.process-local-coordination-resources`
  - `audit.p1.dispatcher-access`
  - `audit.p1.runtime-resource-access`
  - `vendor.effect.runtime-substrate`
  - `vendor.effect.process-local-coordination`
  - `simulation.middle-spine-derivation-compiler`
  - `simulation.bootgraph-catalog-finalization`
  - `simulation.service-binding-cache-runtime-access`
  - `simulation.mini-runtime-registry-invocation`
  - `simulation.dispatcher-descriptor-operation-inventory`
  - `simulation.async-step-owner-membership-artifacts`
  - `simulation.server-route-derivation-import-safety`
  - `simulation.adapter-callback-delegation`
  - `simulation.adapter-callback-bridge-lowering`
  - `simulation.first-server-async-harness-mounts`
  - `simulation.deployment-handoff`
  - `audit.p1.provider-effect-plan-shape`
  - `audit.p1.provider-effect-plan-lowering`
  - `audit.p1.effect-boundary-policy-matrix`
  - `audit.p1.effect-boundary-policy-matrix.residual`
  - `audit.semantic-runtime-jsdoc-harvest`
  - `audit.telemetry.hyperdx-observation`
  - `audit.p1.safe-effect-composition-surface`
  - `audit.p2.server-route-derivation`
  - `audit.p2.adapter-effect-callback-lowering`
  - `audit.p2.async-effect-bridge-lowering`
  - `audit.p2.production-harness-mounting`
  - `audit.p2.runtime-profile-config-redaction`

## Status Meanings

- `proof`: checked by the current type, negative, structural, or report gate.
- `vendor-proof`: checked against installed vendor package behavior or types.
- `simulation-proof`: checked by the miniature runtime or compatibility simulation.
- `xfail`: architecture gap is known and intentionally fenced. It is not automatically a TypeScript failure.
- `todo`: planning input or future fixture not yet part of the gate.
- `out-of-scope`: relevant to migration safety, but not a type-spine proof.

When the focus changes, update this file and `proof-manifest.json` together. Do not add owners, dates, kanban states, or migration tasks here.
