# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `review.runtime-simulation-and-lab-instrumentation`
- Focus: harden the lab against false confidence by making registry/runtime simulation, provider closure checks, vendor-facade limits, and proof status visible.
- Related manifest entries:
  - `accepted.effect-only-authoring`
  - `accepted.invocation-bound-clients`
  - `accepted.provider-not-execution-plan`
  - `audit.p1.provider-effect-plan-shape`
  - `audit.p2.server-route-derivation`

## Status Meanings

- `proof`: checked by the current type, negative, structural, or simulation gate.
- `xfail`: architecture gap is known and intentionally fenced. It is not automatically a TypeScript failure.
- `todo`: planning input or future fixture not yet part of the gate.
- `out-of-scope`: relevant to migration safety, but not a type-spine proof.

When the focus changes, update this file and `proof-manifest.json` together. Do not add owners, dates, kanban states, or migration tasks here.
