# AGENT 2 Plan Verbatim (P2: Phase C Interfaces/Types + File-Level Map)

## Scope Ownership
- Own Phase C interfaces/types deltas and file-level blueprint by slice: C1, C2, C3, C4, and C5 input handoff.
- Deliver implementer-ready contract changes, boundary impacts, and test mapping.

## Non-Negotiable Constraints
- Do not introduce runtime semantics from legacy metadata.
- Do not introduce route-family drift.
- Keep changes pragmatic and minimal for forward progress.

## Execution Plan
1. Confirm required skill introspection completed and record skills used.
2. Create/maintain timestamped working log in `AGENT_2_SCRATCHPAD.md` with evidence breadcrumbs.
3. Read required grounding corpus documents in full before conclusions:
   - `README.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `PHASE_EXECUTION_WORKFLOW.md`
   - `axes/13-distribution-and-instance-lifecycle-model.md`
   - `_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md`
4. Ground against required runtime code/tests and scripts:
   - state repo/install state, tests, observability events, gate scaffold, doctor global command, global install script.
5. Extract concrete current contracts and boundaries:
   - Type exports, function signatures, event payload surfaces, path ownership, and slice-relevant test assertions.
6. Produce delta map by slice (C1-C4 + C5 inputs):
   - Exact interface/type additions/changes/removals.
   - Owning files and proposed touch points.
   - Boundary impact analysis (callers/consumers/producers).
   - Test plan mapping (unit/integration/contract).
7. Build final evidence map with absolute file paths and line anchors for every non-trivial claim.
8. Write final deliverable:
   - `AGENT_2_FINAL_PHASE_C_INTERFACES_AND_FILE_MAP.md`
   - Required sections: Skills Introspected, Evidence Map, Assumptions, Risks, Unresolved Questions.
9. Validate outputs for implementer readiness:
   - Slice completeness, no policy drift, no legacy semantic leakage, explicit unresolveds.

## Deliverables
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/AGENT_2_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/AGENT_2_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/AGENT_2_FINAL_PHASE_C_INTERFACES_AND_FILE_MAP.md`
