# Phase D Planning Runbook (Draft)

## Purpose
Prepare a decision-complete Phase D planning packet that can be executed in a single forward-only wave with strict slice discipline and no architecture drift.

## Invariant Core
1. Runtime semantics remain `rawr.kind + rawr.capability + manifest registration` only.
2. Route-family boundaries remain unchanged:
   - `/rpc` internal/first-party only
   - `/api/orpc/*` published OpenAPI boundary
   - `/api/workflows/<capability>/*` caller workflow boundary
   - `/api/inngest` signed runtime ingress only
3. `rawr.hq.ts` remains composition authority.
4. Package-owned seams and host-owned concrete wiring remain locked.
5. Forward-only posture: no rollback playbook track.

## Preflight and Grounding
1. Create a stacked child planning branch + dedicated planning worktree from the current Phase C closure tip.
2. Run agent sweep:
   - close stale agents,
   - reuse only with `/compact` and direct continuity,
   - keep active count at or below six.
3. Re-ground all planning agents on canonical packet docs:
   - `README.md`
   - `ARCHITECTURE.md`
   - `DECISIONS.md`
   - `PHASE_EXECUTION_WORKFLOW.md`
   - `PROJECT_STATUS.md`
   - `_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md`
4. Require planning steward to issue a drift readout before slice drafting begins.

## Team Shape (Planning)
1. `D1 Planner`: slice architecture and ordering.
2. `D2 Planner`: interface/type deltas and file-level map.
3. `D3 Planner`: verification/gates and review/fix closure design.
4. `D4 Steward`: invariant enforcement, contradiction arbitration, readiness decision.

## Mandatory Agent Outputs
1. `AGENT_<N>_PLAN_VERBATIM.md`
2. `AGENT_<N>_SCRATCHPAD.md` (timestamped)
3. `AGENT_<N>_FINAL_<OBJECTIVE>.md`
4. Every final includes:
   - `Skills Introspected`
   - `Evidence Map` (absolute paths + line anchors)
   - `Assumptions`
   - `Risks`
   - `Unresolved Questions`

## Planning Loops

### Loop 1: Draft
1. D1-D3 produce independent planning outputs in parallel.
2. Orchestrator integrates into one Phase D planning packet.

### Loop 2: Steward Review and Fix
1. D4 performs independent review with severity-ranked findings.
2. Blocking/high findings are fixed in-run.
3. Re-review until disposition is `approve`.

### Loop 3: Structural Clarity
1. Run a dedicated planning-doc structural pass (information quality and implementability).
2. Improve naming/grouping and reduce ambiguity without changing locked architecture semantics.

### Loop 4: Closure and Readiness
1. Publish final Phase D planning outputs.
2. Prune superseded scratch/intermediate planning artifacts.
3. Publish explicit implementation kickoff posture.

## Phase D Planning Outputs
1. `PHASE_D_EXECUTION_PACKET.md`
2. `PHASE_D_IMPLEMENTATION_SPEC.md`
3. `PHASE_D_ACCEPTANCE_GATES.md`
4. `PHASE_D_WORKBREAKDOWN.yaml`
5. `PHASE_D_REVIEW_DISPOSITION.md`
6. `PHASE_D_PLANNING_HANDOFF.md`

## Exit Criteria
1. No unresolved blocking/high planning ambiguities.
2. Each Phase D slice has owner, dependencies, touched paths, gates, and failure triggers.
3. Deferred items are explicit, centralized, and non-blocking for kickoff.
4. Planning branch/worktree are clean and submitted.
