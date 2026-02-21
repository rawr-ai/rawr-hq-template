# AGENT_1 Research Plan (Verbatim)

## Mission
Produce a decision-complete Phase C (C0-C7) architecture + slice ordering packet that is implementer-ready, forward-only, and explicitly preserves route-family constraints, manifest authority, D-013 hard deletion, and D-016 seam-now posture.

## Non-negotiable constraints
- Planning-only edits: write only the three required AGENT_1 artifacts under the pass root.
- Ground conclusions only after reading the required corpus.
- Use explicit evidence anchors (absolute path + line) for every key architectural or ordering claim.
- Treat C4 as conditional-only with explicit trigger criteria and explicit no-trigger disposition path.

## Execution steps
1. Complete required introspection (skills + workflow prompts) and capture the key operating invariants that govern planning quality and sequencing.
2. Create and maintain a timestamped scratchpad with:
   - introspection evidence,
   - grounding corpus evidence,
   - extracted invariants/constraints,
   - candidate ordering options,
   - final decisions + rationale.
3. Read required grounding corpus in full:
   - README
   - ARCHITECTURE
   - DECISIONS
   - PHASE_EXECUTION_WORKFLOW
   - axis 13 distribution/lifecycle model
   - B6 Phase C readiness
4. Build a dependency and ownership model for C0-C7:
   - prerequisite graph,
   - ownership boundaries by subsystem/domain,
   - must-do-now vs defer decisions,
   - drift risks and mitigation hooks,
   - seam preservation checks for D-013 / D-016 and manifest authority.
5. Define C4 conditional branch:
   - trigger criteria (positive path),
   - no-trigger disposition (explicitly documented path that proceeds without C4 execution),
   - reintegration constraints if C4 later activates.
6. Write final architecture + ordering document with mandatory sections:
   - Skills Introspected,
   - Evidence Map (absolute paths + line anchors),
   - Assumptions,
   - Risks,
   - Unresolved Questions,
   plus the full Phase C slice ordering and dependency narrative.
7. Run a completeness pass:
   - every C0-C7 slice represented,
   - ordering is implementer-ready,
   - must-do-now vs defer called out per slice,
   - ownership and drift risk explicit,
   - all claims traceable to evidence anchors.

## Deliverables
- AGENT_1_PLAN_VERBATIM.md (this file)
- AGENT_1_SCRATCHPAD.md (continuously updated, timestamped notes)
- AGENT_1_FINAL_PHASE_C_ARCHITECTURE_AND_ORDERING.md (final decision packet)
