# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `phase-two.provider-config-effect-spine`
- Focus: prove the contained provider/config/secret/Effect spine can provision
  representative resources into runtime-owned process invocation access without
  promoting production provider policy.
- Related manifest entries:
  - `accepted.provider-profile-closure`
  - `vendor.effect.runtime-substrate`
  - `audit.p1.provider-effect-plan-shape`
  - `audit.p1.provider-effect-plan-lowering`
  - `audit.p1.effect-boundary-policy-matrix`
  - `audit.p1.effect-boundary-policy-matrix.residual`
  - `audit.p1.runtime-resource-access`
  - `audit.p2.runtime-profile-config-redaction`
  - `audit.p2.provider-effect-process-spine`
  - `audit.p2.server-route-derivation`
  - `audit.p2.adapter-effect-callback-lowering`
  - `audit.p2.async-effect-bridge-lowering`
  - `audit.p2.production-harness-mounting`
  - `audit.p2.first-resource-provider-cut`
  - `simulation.service-binding-cache-runtime-access`
  - `simulation.mini-runtime-registry-invocation`

## Status Meanings

- `proof`: checked by the current type, negative, structural, or report gate.
- `vendor-proof`: checked against installed vendor package behavior or types.
- `simulation-proof`: checked by the miniature runtime or compatibility simulation.
- `xfail`: architecture gap is known and intentionally fenced. It is not automatically a TypeScript failure.
- `todo`: planning input or future fixture not yet part of the gate.
- `out-of-scope`: relevant to migration safety, but not a type-spine proof.

When the focus changes, update this file and `proof-manifest.json` together. Do not add owners, dates, kanban states, or migration tasks here.
