# Phase C Planning Runbook (Draft)

## Purpose
Prepare and execute a decision-complete Phase C planning pass using the same closure discipline that worked in Phase B, while staying forward-only and avoiding architecture drift.

## Phase C Planning Objectives
1. Produce an implementer-ready Phase C execution packet with explicit slices, owners, dependencies, touched paths, acceptance gates, and failure signals.
2. Keep all planning decisions aligned to locked contracts in `ARCHITECTURE.md` and `DECISIONS.md`.
3. Classify all unresolved items as `blocking` vs `non-blocking` for Phase C implementation start.

## Preflight Preparation
1. Create a stacked child planning branch + dedicated worktree from the current Phase B tip.
2. Confirm Graphite tracking and submit discipline (`gt submit --ai` per closed slice branch).
3. Run agent sweep:
   - close stale agents,
   - reuse only with `/compact` and direct continuity,
   - keep active count below cap.
4. Reconfirm canonical corpus and current status before any planning output:
   - `README.md`
   - `ARCHITECTURE.md`
   - `DECISIONS.md`
   - `PHASE_EXECUTION_WORKFLOW.md`
   - `PROJECT_STATUS.md`
   - `_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md`

## Team Design for Phase C Planning
1. Agent C1 (slice architecture + ordering)
   - Focus: decomposition, dependency order, owner boundaries.
2. Agent C2 (interfaces + file map)
   - Focus: contract/type deltas and concrete touched-path blueprint.
3. Agent C3 (verification + gates)
   - Focus: gate cadence, anti-drift checks, review/fix closure contract.
4. Agent C4 (steward reviewer)
   - Focus: invariant enforcement, contradiction arbitration, go/no-go disposition.

## Mandatory Agent Grounding Contract
1. Introspect role-relevant skills before conclusions.
2. Write plan verbatim + timestamped scratchpad + final output.
3. Use evidence map with absolute file paths + line anchors.
4. Include assumptions, risks, unresolved questions.
5. Read full required corpus before proposing decisions.

## Workflow Loops for Phase C Planning

### Loop 1: Planning Draft Loop
1. C1-C3 produce independent outputs in parallel.
2. Orchestrator integrates into one Phase C packet draft.
3. Normalize terminology and authority boundaries.

### Loop 2: Review + Fix Loop
1. C4 runs independent review on integrated draft.
2. Severity-ranked findings required with line-anchored evidence.
3. Blocking/high findings must be fixed in-run.
4. Re-review until disposition is `ready`.

### Loop 3: Structural Quality Loop (Planning Docs)
1. Run a focused structural clarity pass on planning artifacts.
2. Improve naming/grouping/flow without changing approved semantics.
3. Ensure packet is executable, not reference-only prose.

### Loop 4: Cleanup + Handoff Loop
1. Remove superseded planning scratch/intermediate artifacts.
2. Keep only canonical planning outputs and final disposition docs.
3. Publish final Phase C planning handoff with next commandable entrypoint.

## Drift Guards (Must Hold)
1. Runtime semantics remain `rawr.kind + rawr.capability + manifest registration`.
2. Route-family boundaries remain unchanged (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`).
3. Manifest-first composition authority remains fixed.
4. Legacy metadata does not re-enter runtime semantics.
5. No “misc refactor” bucket in planning; all work must map to explicit slices.

## Output Targets (Planning Pass)
1. `PHASE_C_EXECUTION_PACKET.md`
2. `PHASE_C_IMPLEMENTATION_SPEC.md`
3. `PHASE_C_ACCEPTANCE_GATES.md`
4. `PHASE_C_WORKBREAKDOWN.yaml`
5. `PHASE_C_REVIEW_DISPOSITION.md`
6. `PHASE_C_PLANNING_HANDOFF.md`

## Exit Criteria
1. Phase C plan is implementer-ready with no unresolved blocking/high decisions.
2. Every slice has owner, dependency, touched paths, acceptance gates, and failure triggers.
3. Deferred items are centralized and explicitly non-blocking.
4. Review disposition is `ready`.
5. Planning worktree is clean and branch is submitted.
