# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `review.effect-native-integration-todo-coverage`
- Focus: make remaining Effect-native integration categories visible as fenced TODO/xfail evidence without turning the lab into the runtime substrate.
- Related manifest entries:
  - `accepted.effect-only-authoring`
  - `accepted.curated-effect-public-surface`
  - `audit.p1.effect-managed-runtime-substrate`
  - `audit.p1.process-local-coordination-resources`
  - `audit.p1.provider-effect-plan-shape`
  - `audit.p1.provider-effect-plan-lowering`
  - `audit.p1.effect-boundary-policy-matrix`
  - `audit.p1.safe-effect-composition-surface`
  - `audit.p2.adapter-effect-callback-lowering`
  - `audit.p2.async-effect-bridge-lowering`
  - `audit.p2.runtime-profile-config-redaction`

## Status Meanings

- `proof`: checked by the current type, negative, structural, or simulation gate.
- `xfail`: architecture gap is known and intentionally fenced. It is not automatically a TypeScript failure.
- `todo`: planning input or future fixture not yet part of the gate.
- `out-of-scope`: relevant to migration safety, but not a type-spine proof.

When the focus changes, update this file and `proof-manifest.json` together. Do not add owners, dates, kanban states, or migration tasks here.
