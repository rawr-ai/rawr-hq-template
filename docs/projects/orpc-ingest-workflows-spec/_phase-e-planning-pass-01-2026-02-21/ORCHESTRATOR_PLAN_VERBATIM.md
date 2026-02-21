# Phase E End-to-End Runbook (Planning + Implementation, Continuous Wave, Forward-Only)

## Summary
1. This runbook is the locked source of truth for Phase E.
2. Locked choices from this planning turn:
   1. **Phase goal:** evidence-close now for `D-009` and `D-010` (close if criteria met, otherwise explicit deferred disposition with hardened watchpoints).
   2. **Wave shape:** single continuous wave (planning through implementation closure).
   3. **Submission posture:** Graphite-first only; all new branches must be explicitly tracked in-stack before submit.
3. As soon as you approve this plan, I will immediately write the runbook verbatim to orchestrator artifacts and start execution with proactive agent management.

## Execution Base
1. Parent branch: `codex/phase-e-prep-grounding-runbook`.
2. Planning branch: `codex/phase-e-planning-packet`.
3. Planning worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-planning-packet`.
4. Runtime root branch: `codex/phase-e-runtime-implementation`.
5. Runtime worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation`.
6. Runtime slice branches:
   1. `codex/phase-e-e1-dedupe-policy-hardening`
   2. `codex/phase-e-e2-finished-hook-policy-hardening`
   3. `codex/phase-e-e3-structural-evidence-gates`
   4. `codex/phase-e-e4-decision-closure`
   5. `codex/phase-e-e5-review-fix-closure`
   6. `codex/phase-e-e5a-structural-assessment`
   7. `codex/phase-e-e6-docs-cleanup`
   8. `codex/phase-e-e7-phase-f-readiness`
7. Graphite rules:
   1. `gt sync --no-restack` only.
   2. Immediately after creating each branch, run `gt track <branch> -p <parent>`.
   3. Submit each closed slice with `gt submit --ai --no-edit`.
   4. If submit fails, repair tracking/parentage first; do not batch slices.
8. End-state rule: no dirty worktrees.

## Invariants (Must Not Drift)
1. Runtime semantics remain `rawr.kind + rawr.capability + manifest registration`.
2. Route-family boundaries remain unchanged:
   1. `/rpc` internal first-party.
   2. `/api/orpc/*` published OpenAPI boundary.
   3. `/api/workflows/<capability>/*` workflow caller boundary.
   4. `/api/inngest` signed runtime ingress only.
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts` remains composition authority.
4. Channel A/B remain command surfaces only, not runtime metadata semantics.
5. Forward-only posture remains mandatory.

## Team Design (Default Agents Only, Max 6 Active)
1. Planning wave:
   1. `P1` architecture + slice ordering.
   2. `P2` interfaces/types + file-level map.
   3. `P3` verification/gates design.
   4. `P4` steward/arbitration review.
2. Runtime wave:
   1. `I1` E1 + E4 owner.
   2. `I2` E2 owner.
   3. `I3` E3 owner.
   4. `I4` independent TypeScript + oRPC review owner.
   5. `I4A` structural assessment owner (TypeScript + solution/system design).
   6. `I5` docs/cleanup + readiness owner.
3. Concurrency target: 3-4 active agents.
4. Reuse policy: reuse only with direct continuity and `/compact`; otherwise fresh spawn.

## Mandatory Agent Protocol
1. Each agent introspects required skills before substantive work.
2. Each agent writes:
   1. `AGENT_<N>_PLAN_VERBATIM.md`
   2. `AGENT_<N>_SCRATCHPAD.md` (timestamped)
   3. `AGENT_<N>_FINAL_<OBJECTIVE>.md`
3. Each final includes:
   1. `Skills Introspected`
   2. `Evidence Map` (absolute paths + line anchors)
   3. `Assumptions`
   4. `Risks`
   5. `Unresolved Questions`
4. Blocking/high findings must be fixed in-run and re-verified.

## Orchestrator Protocol
1. Immediately on approval, write:
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-e-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md`
   2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-e-planning-pass-01-2026-02-21/ORCHESTRATOR_SCRATCHPAD.md`
2. Maintain orchestrator scratchpad continuously with gate outcomes, arbitration decisions, and branch tracking checks.
3. Maintain explicit agent registry in scratchpad:
   1. agent id
   2. scope
   3. current branch
   4. status
   5. compact/close decision.
4. Before every slice handoff, verify branch + worktree context and tracked-parent state.

## Required Grounding Corpus (All Agents)
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/README.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_E_PREP_NOTE.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21/D7_PHASE_E_READINESS.md`
7. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md`
8. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
9. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
10. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md`

## Workflow Introspection Requirement
1. `P1` and `I4` must introspect:
   1. `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
   2. `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
2. If `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` exists, treat as equivalent and log mapping in scratchpad.

## Gate-by-Gate Flow

### G0 — Preflight + Agent Sweep
1. Confirm clean status in all active worktrees.
2. Verify stack health and tracked status before dispatch:
   1. run `gt log --show-untracked`
   2. ensure all new branches are tracked.
3. Close stale agents; `/compact` reuse only for direct continuity.
4. Write orchestrator plan/scratch in planning pass root before delegating.

### G1 — Planning Packet (Phase E)
1. Run `P1`, `P2`, `P3` in parallel.
2. Integrate into one Phase E planning packet.
3. Run `P4` independent steward review.
4. Fix all blocking/high planning findings before runtime kickoff.
5. Submit planning branch.

### G1.5 — Steward Drift Check Before Runtime
1. Re-ground on:
   1. final planning packet
   2. current stack topology
   3. locked invariants.
2. Require explicit steward readout:
   1. invariant compliance
   2. overlap/collision risk
   3. hidden ambiguity.
3. Fix planning drift before opening runtime root branch.

### G2 — Core Runtime Slices

#### E1 — Dedupe Policy Hardening (I1)
1. Objective: produce evidence-grade hardening for D-009 on heavy middleware dedupe marker policy.
2. Primary touched paths (expected):
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/apps/server/src/workflows/context.ts`
   2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/apps/server/src/orpc.ts`
   3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/apps/server/test/middleware-dedupe.test.ts`
   4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-e/verify-e1-dedupe-policy.mjs`
3. Acceptance:
   1. explicit marker behavior is structural and test-verified for heavy chains
   2. no route-family drift
   3. no channel semantics regression.

#### E2 — Finished-Hook Policy Hardening (I2)
1. Objective: produce evidence-grade hardening for D-010 around idempotent/non-critical finished-hook side effects.
2. Primary touched paths (expected):
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/packages/coordination-inngest/src/adapter.ts`
   2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/packages/coordination/src/types.ts`
   3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts`
   4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-e/verify-e2-finished-hook-policy.mjs`
3. Acceptance:
   1. contract and runtime behavior align on non-exactly-once/idempotent/non-critical policy
   2. no ingress/caller-boundary regression.

#### E3 — Structural Evidence Gates (I3)
1. Objective: harden evidence + disposition gates so closure survives cleanup and does not depend on ephemeral scratch docs.
2. Primary touched paths (expected):
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-e/_verify-utils.mjs`
   2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-e/verify-e3-evidence-integrity.mjs`
   3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-d/verify-d4-disposition.mjs` (only if bridging is required)
   4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/package.json`
3. Acceptance:
   1. disposition/evidence gates depend on durable closure artifacts
   2. cleanup cannot break phase-exit verification.

#### E4 — Decision Closure (I1)
1. Objective: evidence-close `D-009` and `D-010` where justified.
2. Primary touched paths:
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
   2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md`
   3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
   4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
   5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_DISPOSITION.md`
   6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_TRIGGER_EVIDENCE.md` (if triggered)
3. Acceptance:
   1. each decision has explicit status transition or explicit deferred rationale with hardened watchpoints
   2. no ambiguous/no-op decision text.

### G3 — Independent Review + Fix Closure (E5)
1. `I4` performs independent review from TypeScript + oRPC lenses.
2. Required input:
   1. canonical packet docs
   2. Phase E planning packet
   3. full Phase E runtime diffs.
3. Blocking/high findings must be fixed in-run by owning slice agents and re-reviewed to `approve`.

### G4 — Structural Assessment (E5A)
1. `I4A` performs taste/structure pass:
   1. naming
   2. module boundaries
   3. duplication
   4. domain clarity.
2. No architecture pivots.
3. Accepted refactors must pass impacted quick/full gates.

### G5 — Docs + Cleanup (E6)
1. Align canonical docs to as-landed behavior.
2. Remove superseded scratch/intermediate artifacts.
3. Keep closure-critical outputs only.
4. Publish cleanup manifest with per-path rationale.
5. Re-run disposition/exit gates after cleanup edits.

### G6 — Post-Land Realignment (E7)
1. Publish explicit Phase F readiness:
   1. posture
   2. blockers
   3. owners
   4. ordering.
2. Publish final Phase E execution report and final handoff.
3. Submit final closure slice.

## Orchestrator Outputs

### Planning pass root
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-e-planning-pass-01-2026-02-21`

### Planning artifacts
1. `ORCHESTRATOR_PLAN_VERBATIM.md`
2. `ORCHESTRATOR_SCRATCHPAD.md`
3. `PHASE_E_EXECUTION_PACKET.md`
4. `PHASE_E_IMPLEMENTATION_SPEC.md`
5. `PHASE_E_ACCEPTANCE_GATES.md`
6. `PHASE_E_WORKBREAKDOWN.yaml`
7. `PHASE_E_REVIEW_DISPOSITION.md`
8. `PHASE_E_PLANNING_HANDOFF.md`

### Runtime pass root
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21`

### Runtime artifacts
1. `PHASE_E_EXECUTION_REPORT.md`
2. `E4_DISPOSITION.md`
3. `E5_REVIEW_DISPOSITION.md`
4. `E5A_STRUCTURAL_DISPOSITION.md`
5. `E6_CLEANUP_MANIFEST.md`
6. `E7_PHASE_F_READINESS.md`
7. `FINAL_PHASE_E_HANDOFF.md`
8. `E4_TRIGGER_EVIDENCE.md` (conditional)

## Important Changes or Additions to Public APIs / Interfaces / Types
1. Middleware policy interface hardening for heavy-chain dedupe marker contract (`D-009` closure candidate).
2. Finished-hook side-effect policy interface hardening for idempotent/non-critical contract (`D-010` closure candidate).
3. Verification interface hardening:
   1. disposition/evidence checks must rely on durable closure artifacts
   2. cleanup-safe gate semantics.
4. No route topology changes are planned.

## Verification and Gate Contract
1. Quick suite on every implementation commit.
2. Full suite at:
   1. end of each runtime slice
   2. after blocking/high fixes
   3. before independent review
   4. before phase exit.
3. Required baseline includes previous drift-core chain plus Phase E-specific E1/E2/E3/E4 gates.
4. Final phase-exit gate requires:
   1. all mandatory slices closed
   2. review/fix closure
   3. structural closure
   4. docs/cleanup complete
   5. readiness published.

## Test Cases and Scenarios
1. Heavy middleware dedupe scenario: explicit marker policy holds under repeated/nested execution.
2. Finished-hook idempotency scenario: duplicate finished lifecycle invocations do not cause critical divergence.
3. Disposition durability scenario: phase disposition verification still passes after scratch cleanup.
4. Route-family invariance scenario: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest` semantics unchanged.
5. Channel semantics scenario: Channel A/B remain command surfaces only.
6. Independent review scenario: all blocking/high findings are fixed and re-reviewed.
7. Structural quality scenario: naming/module-boundary clarity improves without architecture drift.
8. Cleanup integrity scenario: closure-critical artifact set remains coherent and minimal.
9. Readiness scenario: explicit and actionable Phase F kickoff posture is published.

## Assumptions and Defaults
1. Execution starts only after your explicit implementation trigger.
2. Phase E runs as one continuous wave (planning through implementation closure).
3. `D-009` and `D-010` are handled as evidence-close-now targets.
4. Graphite remains mandatory; every new branch is tracked before submit.
5. Default agents only; proactive sweep/compact/close management is required.
6. Forward-only posture remains mandatory.
7. Final completion requires clean git/worktree state and per-slice submitted branches.
