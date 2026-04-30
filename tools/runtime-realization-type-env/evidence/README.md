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

## Active Phase Two Coordination

- `dra-phase-two-level-zero-workflow.md`: Level Zero DRA checkpoint and
  compaction-recovery workflow.
- `phase-two-production-critical-claim-ledger.md`: representative Phase Two
  scenario and claim ledger consumed by child workstreams.
- `workstreams/2026-04-30-phase-two-production-readiness-program-workstream.md`:
  Level 2 Phase Two program workstream.
- `phased-agent-verification-workflow.md`: repeatable phased review workflow.
- `workstreams/README.md` and `workstreams/TEMPLATE.md`: workstream lifecycle
  and report contract.

## Completed Continuity

- `runtime-realization-research-program.md`: closed prior program continuity.
- `dra-runtime-research-program-workflow.md`: closed/default workflow
  continuity.
- `workstreams/*.md`: completed workstream reports and next-packet history.

These files may explain how the lab got here, but current work should enter
through the Level Zero workflow and the Phase Two program workstream.

## Archive

- `_archive/`: historical provenance moved out of the active evidence surface.

Archive indexes explain why files moved. Do not make archived files required
reading for Phase Two.
