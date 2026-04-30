# Focus Log

This is a lightweight marker for the lab's current experiment. It is not a project tracker.

## Current Experiment

- ID: `lab-v2.adapter-callback-async-bridge-lowering`
- Focus: use the contained runtime realization lab to verify native-shaped
  server callback payloads and async step bridge payloads that consume
  pre-derived refs/artifacts and delegate through `ProcessExecutionRuntime`
  without mounting native hosts, deciding durable async semantics, or claiming
  production adapter readiness.
- Related manifest entries:
  - `accepted.effect-only-authoring`
  - `accepted.curated-effect-public-surface`
  - `audit.p0.async-step-membership`
  - `audit.p1.effect-managed-runtime-substrate`
  - `audit.p1.process-local-coordination-resources`
  - `audit.p1.dispatcher-access`
  - `audit.p1.runtime-resource-access`
  - `vendor.effect.runtime-substrate`
  - `vendor.effect.process-local-coordination`
  - `vendor.boundary.typebox-runtime-schema`
  - `vendor.boundary.orpc-native-shape`
  - `vendor.boundary.inngest-handoff-shape`
  - `simulation.middle-spine-derivation-compiler`
  - `simulation.bootgraph-catalog-finalization`
  - `simulation.service-binding-cache-runtime-access`
  - `simulation.mini-runtime-registry-invocation`
  - `simulation.dispatcher-descriptor-operation-inventory`
  - `simulation.async-step-owner-membership-artifacts`
  - `simulation.server-route-derivation-import-safety`
  - `simulation.adapter-callback-delegation`
  - `simulation.adapter-callback-bridge-lowering`
  - `simulation.deployment-handoff`
  - `audit.p1.provider-effect-plan-shape`
  - `audit.p1.provider-effect-plan-lowering`
  - `audit.p1.effect-boundary-policy-matrix`
  - `audit.p1.safe-effect-composition-surface`
  - `audit.p2.server-route-derivation`
  - `audit.p2.adapter-effect-callback-lowering`
  - `audit.p2.async-effect-bridge-lowering`
  - `audit.p2.runtime-profile-config-redaction`

## Status Meanings

- `proof`: checked by the current type, negative, structural, or report gate.
- `vendor-proof`: checked against installed vendor package behavior or types.
- `simulation-proof`: checked by the miniature runtime or compatibility simulation.
- `xfail`: architecture gap is known and intentionally fenced. It is not automatically a TypeScript failure.
- `todo`: planning input or future fixture not yet part of the gate.
- `out-of-scope`: relevant to migration safety, but not a type-spine proof.

When the focus changes, update this file and `proof-manifest.json` together. Do not add owners, dates, kanban states, or migration tasks here.
