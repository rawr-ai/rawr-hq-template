# Primary Authorities

Status: initial preview
Scope: conflict-winning sources for migration planning.

Primary authority does not mean every document is authoritative in the same way. Each source has a lane.

## Authority Order

| Order | Source | Authority Lane | Current Status |
| ---: | --- | --- | --- |
| 1 | RAWR canonical architecture spec | Top-level ontology, ownership laws, system geometry, terminology, subsystem boundaries, and integration points | Final repo path: `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`. |
| 2 | `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` | Runtime realization topology, lifecycle, SDK/runtime split, resource/provider/profile model, runtime compiler/provisioning/process runtime, live access, diagnostics, and finalization | Accepted runtime authority. |
| 3 | Current repo audit for M2 runtime realization migration | Starting-state truth: what exists, what imports what, what tests/gates exist, what must be moved, mined, replaced, or deleted | To be produced during planning. Current repo reality is not target authority. |
| 4 | `docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md` | Migration container, sequencing expectations, milestone vocabulary, and slice boundaries | Use only after checking for drift against the final specs. |
| 5 | `docs/projects/rawr-final-architecture-migration/resources/spec/m2-guardrails-and-enforcement.md` | Verification posture, guardrail expectations, and enforcement baseline | Use for proof requirements, not for overriding target architecture. |

## Conflict Rules

If target architecture conflicts with current repo reality, the target wins unless the conflict reveals a genuine defect or missing decision in the target spec.

If M2 milestone or guardrail language conflicts with the finalized architecture/runtime specs, treat the M2 document as stale until repaired.

If an older migration plan conflicts with the finalized architecture/runtime specs, do not preserve the older plan by default. Mine it for useful sequencing history only.

If a secondary reference suggests extra work, record it as a future lane or hook unless the primary authorities explicitly require it for M2.

## Why These Are Primary

These sources separate destination, starting material, and proof:

- the final integrated architecture tells the team what the system is;
- the runtime realization spec tells the team what runtime substrate must exist;
- the repo audit tells the team what must change;
- M2 and guardrail docs bound the migration and prove convergence.

That separation prevents scope creep while still giving implementers enough grounding to plan real slices instead of writing a high-level wish list.
