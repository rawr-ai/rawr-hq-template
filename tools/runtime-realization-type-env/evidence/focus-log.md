# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `phase-two.async-inngest-boundary`
- Focus: prove a contained Inngest-facing Bun serve/function/step path can
  delegate through the async harness into `ProcessExecutionRuntime` while
  keeping durable semantics and production worker topology fenced.
- Related manifest entries:
  - `accepted.effect-only-authoring`
  - `accepted.invocation-bound-clients`
  - `vendor.boundary.inngest-handoff-shape`
  - `audit.p1.effect-boundary-policy-matrix`
  - `audit.p1.effect-boundary-policy-matrix.residual`
  - `audit.p1.runtime-resource-access`
  - `audit.p2.adapter-effect-callback-lowering`
  - `audit.p2.async-effect-bridge-lowering`
  - `audit.p2.production-harness-mounting`
  - `audit.p2.provider-effect-process-spine`
  - `audit.p2.async-inngest-function-step-boundary`
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
