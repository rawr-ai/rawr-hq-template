# Runtime Realization Evidence Surface

This directory is the evidence surface for the contained runtime-realization
lab. Use this file as the mental rulebook for what matters now, what is
coordination only, and what is provenance only.

## Simple Rulebook

1. Runtime authority lives in the manifest-pinned canonical runtime spec.
2. Proof/status authority lives in the manifest, diagnostic, spine map, focus
   log, guardrails, and earned source/tests/gates.
3. Program/workstream documents coordinate order and continuity. They do not
   override runtime/proof authority.
4. Archived files are historical provenance. Do not use them as required
   reading or current instructions unless an active workstream explicitly
   reopens them as source-mining inputs.
5. If a file feels stale, do not patch navigation into it. Move or classify it
   topologically and update the visible authority surface instead.

## Active Authority And Status

- `proof-manifest.json`: proof entries, current spec pointer, proof categories,
  and named gates.
- `runtime-spine-verification-diagnostic.md`: living red/yellow/green spine
  status derived from the spec, manifest, source, fixtures, tests, and gates.
- `spine-audit-map.md`: runtime spine audit map.
- `focus-log.md`: current experiment and recent focus state.
- `design-guardrails.md`: proof categories, violation categories, review
  categories, and test-theater rules.
- `vendor-fidelity.md`: vendor-boundary honesty notes.

## Global Integration Maps

- `effect-integration-map.md`: long-running Effect integration map for the
  runtime spine. Keep it top-level unless it becomes phase-specific.
- `spine-audit-map.md`: long-running runtime-spine audit map.
- `runtime-spine-verification-diagnostic.md`: current diagnostic map and
  residual ledger.

## Reusable Workflow And Reports

- `phased-agent-verification-workflow.md`: reusable phased review workflow.
- `workstreams/README.md` and `workstreams/TEMPLATE.md`: workstream lifecycle
  and report contract.
- `workstreams/*.md`: completed workstream reports and next-packet history.

Workstream reports are chronological continuity artifacts. They are not active
runtime authority, and closed phase coordination should not stay at evidence
root once the phase has closed.

## Phase Containers

- `phases/`: phase-level coordination artifacts that are still worth keeping
  visible but should not crowd the active authority root.
- `phases/phase-two/`: closed Phase Two coordination artifacts, including the
  Level Zero DRA workflow and the Phase Two production-critical claim ledger.

Phase containers explain how a phase was coordinated. They do not promote a
phase result beyond the proof categories recorded in the manifest, diagnostic,
spine map, source, fixtures, tests, and gates.

## Handoffs

- `handoffs/`: pasteable reorientation snapshots for future agents and teams.
- `handoffs/2026-05-01-post-phase-two-runtime-reframe.md`: current
  post-Phase-Two reframe for designing the next phase without prematurely
  locking its scope.
- `handoffs/2026-05-01-post-phase-three-live-proof-reframe.md`: current
  post-Phase-Three correction for designing the next phase around layered live
  proof instead of another broad micro-lab modeling pass.

Handoffs are orientation, not proof authority and not implementation scripts.

## Archive

- `_archive/`: historical provenance moved out of the active evidence surface.

Archive indexes explain why files moved. Do not make archived files required
reading for future phases unless an active workstream explicitly reopens them
as source-mining input.
