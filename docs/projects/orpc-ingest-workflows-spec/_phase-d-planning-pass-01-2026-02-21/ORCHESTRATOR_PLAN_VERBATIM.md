# Phase D End-to-End Runbook (Planning + Implementation, Continuous Wave, Forward-Only)

## Summary
1. This runbook is the locked source of truth for Phase D.
2. Phase D runs as one continuous wave: planning packet, steward drift checkpoint, runtime slices, review/fix, structural assessment, docs/cleanup, readiness handoff.
3. Scope focus for Phase D is middleware/ingress hardening and decision closure candidates around D-009 and D-010, while preserving all locked route/manifest/runtime invariants.
4. Structural quality is a mandatory gate, not optional.
5. Per-slice Graphite submission is mandatory to keep work sliced and reviewable.

## In-Memory Lock (What Must Stay True)
1. Runtime semantics remain `rawr.kind + rawr.capability + manifest registration`.
2. Route-family boundaries remain unchanged:
   1. `/rpc` internal first-party.
   2. `/api/orpc/*` published OpenAPI boundary.
   3. `/api/workflows/<capability>/*` workflow caller boundary.
   4. `/api/inngest` signed runtime ingress only.
3. `rawr.hq.ts` remains composition authority.
4. Package-owned seams plus host-owned concrete wiring remains locked.
5. Channel A and Channel B remain command surfaces only, never runtime metadata semantics.
6. Forward-only posture is mandatory: no rollback playbook track.

## Execution Base
1. Parent branch: `codex/phase-d-prep-grounding-runbook`.
2. Planning branch: `codex/phase-d-planning-packet`.
3. Planning worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet`.
4. Runtime root branch: `codex/phase-d-runtime-implementation`.
5. Runtime worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation`.
6. Runtime slice branches:
   1. `codex/phase-d-d1-middleware-dedupe-hardening`
   2. `codex/phase-d-d2-inngest-finished-hook-guardrails`
   3. `codex/phase-d-d3-ingress-middleware-structural-gates`
   4. `codex/phase-d-d4-decision-tightening` (conditional)
   5. `codex/phase-d-d5-review-fix-closure`
   6. `codex/phase-d-d5a-structural-assessment`
   7. `codex/phase-d-d6-docs-cleanup`
   8. `codex/phase-d-d7-phase-e-readiness`
7. Graphite rule: `gt sync --no-restack` only.
8. Submission rule: submit each closed slice branch immediately via `gt submit --ai --no-edit`; if branch is untracked, run `gt track <branch> -p <parent>` first.
9. End-state rule: no dirty worktrees.

## Team Design (Default Agents Only, Max 6 Active)
1. Planning wave:
   1. `P1` architecture and slice ordering.
   2. `P2` interfaces/types and file-level map.
   3. `P3` verification/gates.
   4. `P4` steward and arbitration reviewer.
2. Runtime wave:
   1. `I1` D1 + D4 implementation owner.
   2. `I2` D2 + D3 implementation owner.
   3. `I3` gate/test implementation owner.
   4. `I4` independent TypeScript + oRPC review owner.
   5. `I4A` structural assessment owner (TypeScript + solution/system design).
   6. `I5` docs/cleanup owner.
   7. `I6` Phase E readiness owner.
3. Active concurrency target is 3 to 4 agents.
4. Reuse policy: reuse only with direct continuity and `/compact` first.

## Mandatory Agent Protocol
1. Each agent introspects required skills before substantive work.
2. Each agent writes:
   1. `AGENT_<N>_PLAN_VERBATIM.md`
   2. `AGENT_<N>_SCRATCHPAD.md` (timestamped)
   3. `AGENT_<N>_FINAL_<OBJECTIVE>.md`
3. Each final includes:
   1. `Skills Introspected`
   2. `Evidence Map` with absolute paths and line anchors
   3. `Assumptions`
   4. `Risks`
   5. `Unresolved Questions`
4. Blocking or high review findings must be fixed in-run and re-verified.
5. No agent starts implementation until planning packet is steward-approved.

## Required Grounding Corpus (All Agents)
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/README.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PROJECT_STATUS.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md`
7. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
8. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
9. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md`
10. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md`

## Workflow Introspection Requirement
1. `P1` and `I4` must introspect:
   1. `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
   2. `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
2. If `dev-spec-2-milestone` exists, treat as equivalent and log mapping in scratchpad.

## Gate-by-Gate Flow (What I Must Remember at Each Gate)

### Gate G0: Preflight and Agent Sweep
1. Confirm clean status and correct branch/worktree in root and active worktree.
2. Sweep active agents and classify `aligned` or `stale`.
3. Close stale agents immediately.
4. Reuse aligned agents only with `/compact`.
5. Write orchestrator plan and scratch first in the pass root before dispatching implementation work.

### Gate G1: Planning Packet
1. Run `P1`, `P2`, `P3` in parallel.
2. Integrate into one packet with explicit slices, owners, dependencies, touched files, gates, and failure triggers.
3. Run `P4` independent steward review.
4. Fix all blocking/high planning findings before runtime kickoff.
5. Submit planning branch when planning packet is closed.

### Gate G1.5: Steward Drift Check Before Runtime
1. Re-ground on final planning packet and current repo topology.
2. Request explicit steward readout on:
   1. invariant compliance,
   2. slice overlap risk,
   3. hidden ambiguities.
3. If drift exists, fix planning docs first.
4. Only open runtime root branch after this gate is green.

### Gate G2: Runtime Slices
1. D1 then D2 then D3 in order, with non-overlapping parallel work only.
2. D4 runs only if trigger criteria are met.
3. After each slice:
   1. run quick gates,
   2. run full slice suite,
   3. log results in orchestrator scratchpad,
   4. submit slice branch.
4. No new runtime slice starts with unresolved red gates from previous slice.

### Gate G3: Independent Review and Fix Closure
1. `I4` reviews full diff from TypeScript and oRPC perspectives.
2. Findings must be severity-ranked and line-anchored.
3. Blocking/high findings are fixed in-run by owning slice agents.
4. Re-run impacted quick/full gates.
5. Re-review until disposition is `approve`.

### Gate G4: Structural Assessment
1. `I4A` performs taste and structure pass.
2. Focus on naming, boundaries, duplication, domain clarity.
3. No architecture pivots allowed.
4. Any accepted structural refactor must pass impacted gates before closure.

### Gate G5: Canonical Docs and Cleanup
1. `I5` updates canonical docs and runbooks to as-landed behavior.
2. Remove superseded scratch and intermediate artifacts.
3. Retain only closure-critical outputs.
4. Publish cleanup manifest with per-path rationale.

### Gate G6: Post-Land Realignment
1. `I6` reconciles packet for Phase E kickoff.
2. Publish explicit readiness posture with blockers, owners, and order.
3. Close and submit final readiness slice branch.

## Phase D Slice Objectives
1. D1 Middleware dedupe hardening:
   1. enforce explicit context-cached dedupe markers for heavy middleware chains where repeated execution risk exists;
   2. add structural assertions to prevent silent drift.
2. D2 Inngest finished-hook guardrails:
   1. enforce idempotent/non-critical finished-hook side-effect contract;
   2. add runtime and verifier coverage for non-exactly-once semantics.
3. D3 Ingress and middleware structural gates:
   1. strengthen anti-spoof and ownership assertions for ingress/middleware behavior;
   2. ensure gate contract catches drift beyond happy-path tests.
4. D4 Conditional decision tightening:
   1. trigger only if D1/D2 evidence meets threshold for locking D-009 and/or D-010;
   2. if not triggered, write explicit defer disposition and carry forward watchpoint.
5. D5 Review/fix closure.
6. D5A Structural assessment.
7. D6 Docs/cleanup.
8. D7 Phase E readiness.

## Orchestrator Outputs
1. Planning pass root:
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21`
2. Planning artifacts:
   1. `ORCHESTRATOR_PLAN_VERBATIM.md`
   2. `ORCHESTRATOR_SCRATCHPAD.md`
   3. `PHASE_D_EXECUTION_PACKET.md`
   4. `PHASE_D_IMPLEMENTATION_SPEC.md`
   5. `PHASE_D_ACCEPTANCE_GATES.md`
   6. `PHASE_D_WORKBREAKDOWN.yaml`
   7. `PHASE_D_REVIEW_DISPOSITION.md`
   8. `PHASE_D_PLANNING_HANDOFF.md`
3. Runtime pass root:
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21`
4. Runtime artifacts:
   1. `PHASE_D_EXECUTION_REPORT.md`
   2. `D5_REVIEW_DISPOSITION.md`
   3. `D5A_STRUCTURAL_DISPOSITION.md`
   4. `D6_CLEANUP_MANIFEST.md`
   5. `D7_PHASE_E_READINESS.md`
   6. `FINAL_PHASE_D_HANDOFF.md`
5. Conditional artifacts:
   1. `D4_TRIGGER_EVIDENCE.md`
   2. `D4_DISPOSITION.md`

## Important Changes or Additions to Public APIs/Interfaces/Types
1. Middleware interface hardening:
   1. explicit dedupe marker contract for heavy middleware paths.
2. Workflow lifecycle interface hardening:
   1. finished-hook side-effect guardrail contract emphasizing idempotent/non-critical behavior.
3. Verification interface hardening:
   1. new structural gate assertions for middleware/ingress ownership and side-effect safety.
4. Decision register updates:
   1. D-009 and/or D-010 move to locked only if D4 trigger evidence justifies it.
5. No route topology or caller-surface changes are planned for Phase D.

## Verification and Gates
1. Quick suite on every implementation commit.
2. Full suite at:
   1. end of each runtime slice,
   2. after blocking/high fixes,
   3. before independent review,
   4. before phase exit.
3. Baseline drift-core remains mandatory from prior phases.
4. Phase D adds structural gates for:
   1. middleware dedupe marker presence and placement,
   2. finished-hook guardrail conformance,
   3. ingress and boundary anti-spoof assertions.
5. Final phase exit gate requires all mandatory slices plus review/structural/docs/readiness closure.

## Test Cases and Scenarios
1. Heavy middleware dedupe scenario:
   1. repeated nested route calls do not repeat expensive middleware checks.
2. Middleware ordering scenario:
   1. dedupe behavior does not alter locked boundary/mount semantics.
3. Finished-hook idempotency scenario:
   1. duplicate finished lifecycle invocations do not produce critical side-effect divergence.
4. Ingress boundary scenario:
   1. `/api/inngest` remains signed runtime ingress only with no caller-surface leakage.
5. Route-family invariance scenario:
   1. `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest` semantics unchanged.
6. Channel semantics scenario:
   1. Channel A/B remain command surfaces only.
7. Review closure scenario:
   1. all blocking/high TypeScript and oRPC findings are fixed and re-reviewed.
8. Structural quality scenario:
   1. naming and module boundaries improve without architecture shifts.
9. Cleanup scenario:
   1. superseded scratch/intermediate artifacts are pruned and closure artifacts remain coherent.
10. Readiness scenario:
   1. explicit and actionable Phase E readiness posture is published.

## Assumptions and Defaults
1. Phase D runs forward-only and excludes rollback playbooks.
2. Runtime execution begins only after planning packet closure and G1.5 drift-check pass.
3. D4 is conditional and evidence-driven; no forced decision locking without trigger evidence.
4. D-016 broad UX/productization mechanics remain deferred unless they become a direct blocker to a Phase D locked slice.
5. Per-slice branch submission is mandatory and immediate.
6. Default agents are used for all planning/review/implementation tasks.
7. Final completion requires:
   1. mandatory slices closed,
   2. review/fix and structural loops closed,
   3. docs/cleanup complete,
   4. Phase E readiness published,
   5. clean git/worktree state.
