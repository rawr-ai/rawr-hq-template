# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `lab-v2.runtime-telemetry-hyperdx-observation`
- Focus: prove contained telemetry projection/export for already-redacted
  mini-runtime records, including local OTLP/HyperDX ingest smoke, without
  promoting product observability, query policy, catalog persistence, or durable
  async semantics.
- Related manifest entries:
  - `audit.p1.effect-boundary-policy-matrix`
  - `audit.telemetry.hyperdx-observation`
  - `audit.telemetry.hyperdx-observation.residual`
  - `simulation.first-server-async-harness-mounts`
  - `simulation.service-binding-cache-runtime-access`
  - `audit.p2.runtime-profile-config-redaction`
  - `audit.canonical-spec-authority-refresh`

## Status Meanings

- `proof`: checked by the current type, negative, structural, or report gate.
- `vendor-proof`: checked against installed vendor package behavior or types.
- `simulation-proof`: checked by the miniature runtime or compatibility simulation.
- `xfail`: architecture gap is known and intentionally fenced. It is not automatically a TypeScript failure.
- `todo`: planning input or future fixture not yet part of the gate.
- `out-of-scope`: relevant to migration safety, but not a type-spine proof.

When the focus changes, update this file and `proof-manifest.json` together. Do not add owners, dates, kanban states, or migration tasks here.
