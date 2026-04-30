# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `lab-v2.migration-control-plane-observation`
- Focus: prove a contained, non-persistent migration/control-plane observation
  packet can summarize already-safe deployment handoff, in-memory catalog,
  redacted telemetry records, export status, and placement candidates without
  promoting storage, placement, query policy, or production migration readiness.
- Related manifest entries:
  - `audit.migration.control-plane-observation`
  - `audit.migration.control-plane-observation.residual`
  - `simulation.deployment-handoff`
  - `audit.telemetry.hyperdx-observation`
  - `audit.telemetry.hyperdx-observation.residual`
  - `audit.source-hygiene`

## Status Meanings

- `proof`: checked by the current type, negative, structural, or report gate.
- `vendor-proof`: checked against installed vendor package behavior or types.
- `simulation-proof`: checked by the miniature runtime or compatibility simulation.
- `xfail`: architecture gap is known and intentionally fenced. It is not automatically a TypeScript failure.
- `todo`: planning input or future fixture not yet part of the gate.
- `out-of-scope`: relevant to migration safety, but not a type-spine proof.

When the focus changes, update this file and `proof-manifest.json` together. Do not add owners, dates, kanban states, or migration tasks here.
