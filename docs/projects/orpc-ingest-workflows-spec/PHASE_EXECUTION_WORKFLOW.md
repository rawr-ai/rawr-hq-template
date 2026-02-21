# Phase Execution Workflow (Reusable Loop)

## Purpose
Reusable execution loop for remaining phases (B+), grounded in what actually worked in Phase A.

## Invariant Core (Drift Guard)
1. Runtime semantics must stay on `rawr.kind` + `rawr.capability` + manifest registration; legacy metadata keys are not runtime semantics.
2. Route-family boundaries remain explicit and tested:
   - `/rpc` first-party/internal
   - `/api/orpc/*` published OpenAPI
   - `/api/workflows/<capability>/*` capability-first caller boundary
   - `/api/inngest` signed runtime ingress only
3. `rawr.hq.ts` is composition authority; host code consumes manifest-owned seams.
4. Shared authority belongs in package-owned seams; app/plugin-local code should be adapters and composition glue.
5. Forward-only convergence: short compatibility bridges are allowed only with explicit retirement criteria.

## Core Loop (Per Phase)

### 0) Grounding + Workspace Prep
1. Create a stacked child branch + dedicated worktree for the phase.
2. Agent sweep: close stale agents; reuse only with `/compact` and direct topic continuity.
3. Reconfirm canonical corpus and phase entrypoint docs.
4. Write orchestrator plan/scratch immediately in phase pass root.

### 1) Phase Packet Hardening (Planning Mode)
1. Produce an execution packet with explicit slices, owners, dependencies, touched paths, acceptance gates.
2. Separate `do now` vs `defer` in one place.
3. Ensure every high-impact decision has one authoritative location (no split authority).

### 2) Slice Implementation (Execution Mode)
1. Implement in slice order with strict ownership boundaries.
2. Keep each slice branch minimal and submit each branch when complete.
3. Avoid parallel writes in same files; parallelize only non-overlapping ownership.

### 3) Verification Loop (After Each Slice)
1. Run smallest affected suite first.
2. Run required phase gates for impacted contracts.
3. Record command + result in orchestrator scratchpad.
4. If failures: fix in-slice before moving on.

### 4) Independent Review + Fix Loop
1. Run independent review after core slices are landed.
2. Require severity-ranked findings with file/line anchors and concrete fixes.
3. Route findings back to owning slice agent(s).
4. Re-run impacted tests/gates.
5. Re-review until no unresolved blocking/high findings remain.

### 5) Canonical Docs + Cleanup Loop
1. Align canonical spec/runbook docs to as-landed behavior (no policy drift).
2. Keep normative docs normative; put operational snapshots in phase execution docs.
3. Remove superseded scratch/review artifacts; keep only canonical/final lineage outputs.

### 6) Post-Land Realignment Loop
1. Reconcile remaining packet assumptions for next phase kickoff.
2. Publish explicit readiness (`ready`/`not-ready`) with blockers, owners, order.
3. Do not over-plan downstream phases; tighten only where landed outcomes changed assumptions.

## Agent Preparation Standard

### Agent Setup Checklist
1. Required skills per role (design + domain-specific).
2. Required corpus paths (spec + current implementation + prior phase report).
3. Mandatory output contract:
   - plan verbatim
   - timestamped scratchpad
   - final report with skills/evidence/assumptions/risks/questions
4. Explicit ownership boundary (files/areas they own; areas they must not touch).

### Agent Management Rules
1. Use default agents for reasoning-heavy work.
2. `/compact` before reassigning an agent after major topic shifts.
3. Keep active agent count below hard cap; close completed agents.
4. If cross-agent contradictions appear, arbitrate in one integrated disposition doc.

## Verification and Fix Loops (Why They Worked)
1. Layered gates caught policy drift early (not just compile/test breakage).
2. Independent review found boundary mismatches that green tests missed.
3. Mandatory fix loop + re-review prevented “known issue carry-forward.”
4. Re-running full phase exit gates after major fixes prevented local false-greens.

## Phase A Repeatables (Keep Doing)
1. Branch-per-slice with immediate `gt submit --ai --no-edit` after slice closure.
2. Independent reviewer as a real gate, not a formality.
3. Tight “do now vs defer” decisions during review-fix cycles to prevent scope snowball.
4. Short structural refactors only when they reduce future drift in the next phase.
5. Canonical docs alignment immediately after review closure, not deferred to later phases.

## Minimal Artifact Set Per Phase
Keep:
1. `PHASE_<X>_EXECUTION_REPORT.md`
2. `FINAL_PHASE_<X>_HANDOFF.md`
3. Review disposition + cleanup manifest + next-phase readiness doc
4. Canonical spec updates

Delete/Archive:
1. scratchpads, interim review drafts, superseded plans, duplicate agent notes once integrated.

## Definition of Done (Per Phase)
1. Slice branches are submitted and map cleanly to planned slice boundaries.
2. Blocking/high review findings are closed and re-verified.
3. Phase exit gates are green on landed branch state.
4. Canonical docs align to landed behavior and remain structurally clear.
5. Workspace is clean and focused on forward execution.
