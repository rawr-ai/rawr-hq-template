# Agent 3 Plan (Verbatim)

## Slice
- B3: verification structural hardening for Phase B anti-drift guarantees.

## Execution Plan
1. Introspect required skills and workflow-structure prompts before changing code.
2. Read the full grounding corpus (README, ARCHITECTURE, DECISIONS, Phase B packet/spec/gates) and extract explicit invariants for ownership and seam boundaries.
3. Inspect current gate scripts and related tests to identify brittle string-shape checks and route-negative coverage gaps.
4. Replace brittle checks with structural assertions for:
   - manifest ownership and import direction;
   - no app-internal seam leakage across declared boundaries;
   - stronger negative route matrix expectations where needed.
5. Keep implementation forward-only and avoid rollback machinery.
6. Run impacted verification scripts/tests and capture exact command outcomes.
7. Write a final implementation report with required sections, evidence anchors, assumptions, risks, and unresolved questions.
8. Leave branch state coherent with repo workflow and no architecture/policy drift.
