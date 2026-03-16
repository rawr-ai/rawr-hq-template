# Canonical Shell Build Plan

This file is the execution plan for building the canonical shell document in this phase.

## Goal

Produce a complete canonical shell document at:

`work/docs/canonical/RAWR Future Architecture.md`

This document should define the future-facing architecture destination for RAWR HQ. It should absorb the strongest settled conclusions from the current snapshot, the host memo, and the supporting canonical docs without updating the snapshot itself in this phase.

## Source set

Primary source docs:

- `work/docs/source/RAWR Semantic Architecture Snapshot.md`
- `work/docs/source/RAWR HQ Model Architecture Memo.md`

Supporting source docs:

- `work/docs/source/RAWR HQ Internal Structure.md`
- `work/docs/source/Inngest Plugin API Strategy.md`
- `work/generated/canonicality-summary.md`

## Shell requirements

The shell must:

- define the higher-order ontology
- define the host bundle and runtime role model
- define the relationship between `packages`, `services`, `plugins`, and `apps/hosts`
- place NanoClaw / stewards / the agent host in the model
- explain how the system scales from `n = 1` to larger deployment shapes
- preserve the rationale that explains what the architecture optimizes for and what it unlocks
- avoid volatile implementation details
- remain distinct from the snapshot, which will be updated later

## Stepwise slices

1. Preflight and create scratch artifacts.
2. Extract canonical claims, conflicts, and rationale from the source docs.
3. Lock the shell contract and final outline.
4. Draft the shell section by section.
5. Consolidate terminology and section flow.
6. Run correctness and information-design review passes.
7. Finalize the shell and stop without updating the snapshot.

## Agent workflow

Use a small orchestrator-plus-specialists team:

- orchestrator: sole author and DRI
- rationale extractor: mines durable rationale
- conflict mapper: identifies missing claims and terminology drift
- correctness reviewer: checks completeness and contradictions
- information-design reviewer: checks hierarchy, scent, and durability

Rules:

- default agents only
- no more than two sidecar agents at once
- every agent keeps a scratch doc
- agent outputs feed the orchestrator scratch, not the final doc directly

## Stop condition

Stop when `work/docs/canonical/RAWR Future Architecture.md` is complete and coherent.

Do not update the snapshot in this phase.
