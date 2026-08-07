# Primary Authorities

Status: ready for migration planning.
Scope: conflict-winning sources for migration planning.

Primary authority does not mean every document is authoritative in the same way. Each source has a lane.

## Authority Order

| Order | Source | Authority Lane | Current Status |
| ---: | --- | --- | --- |
| 1 | `docs/system/HABITAT_ARCHITECTURE.md` | Top-level ontology, ownership laws, system geometry, terminology, subsystem boundaries, and integration points | Canonical Habitat architecture authority. |
| 2 | `docs/system/HABITAT_RUNTIME_REALIZATION.md` | Runtime realization topology, lifecycle, SDK/runtime split, resource/provider/profile model, runtime compiler/provisioning/process runtime, live access, diagnostics, and finalization | Canonical Habitat runtime authority. |
| 3 | Current repo audit for M2 runtime realization migration | Starting-state truth: what exists, what imports what, what tests/gates exist, what must be moved, mined, replaced, or deleted | To be produced during planning. Current repo reality is not target authority. |
| 4 | Regenerated M2 migration plan, milestone, and issues | Migration container, sequencing expectations, milestone vocabulary, and slice boundaries | Not produced yet. Generate during migration planning. |

## Conflict Rules

If target architecture conflicts with current repo reality, the target wins unless the conflict reveals a genuine defect or missing decision in the target spec.

If this M2 packet or any quarantined milestone, issue, plan, audit, or guardrail language conflicts with the finalized architecture/runtime specs, treat the packet document as stale provenance.

If an older migration plan conflicts with the finalized architecture/runtime specs, do not preserve the older plan by default. Mine it for useful sequencing history only.

If a secondary reference suggests extra work, record it as a future lane or hook unless the primary authorities explicitly require it for M2.

## Why These Are Primary

These sources separate destination, starting material, and proof:

- the final integrated architecture tells the team what the system is;
- the runtime realization spec tells the team what runtime substrate must exist;
- the repo audit tells the team what must change;
- regenerated M2 docs will bound the migration and prove convergence.

That separation prevents scope creep while still giving implementers enough grounding to plan real slices instead of writing a high-level wish list.
