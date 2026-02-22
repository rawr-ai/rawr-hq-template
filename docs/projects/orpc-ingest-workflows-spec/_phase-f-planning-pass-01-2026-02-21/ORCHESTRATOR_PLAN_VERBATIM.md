# Phase F End-to-End Runbook (Planning + Implementation + Closure, Continuous Wave, Forward-Only)

## Summary
1. This is the in-memory locked runbook for Phase F.
2. It is an adjustment-forward continuation of the A→E method, preserving the same closure order and quality bar.
3. The wave is continuous: planning kickoff through full implementation, verification, independent review/fix, structural quality pass, docs cleanup/alignment, readiness, and final handoff.
4. The first mutating step after your approval is to write/update orchestrator runbook artifacts, then execute this runbook exactly in order.

## Posture and Objective
1. **Posture:** forward-only, Graphite-first, decision-explicit, evidence-driven, quality-first.
2. **Objective:** deliver Phase F as a complete, audit-safe closure cycle with no unresolved blocking/high findings and no drift in locked architecture invariants.
3. **Quality bar:** high-signal TypeScript/oRPC correctness, explicit disposition language, strong structural taste (naming/boundaries/duplication/domain clarity), and cleanup-safe verification.

## R0 — First Action (Write/Update Runbook Artifacts)
1. Respect current safety condition: while your current merge is in progress, remain read-only.
2. Immediately after merge completion confirmation, write/update:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-planning-pass-01-2026-02-21/ORCHESTRATOR_SCRATCHPAD.md`
3. Mirror this runbook verbatim as the initial orchestrator source-of-truth before delegating agents.

## Execution Base
1. Parent branch default: `codex/phase-f-prep-grounding-runbook`.
2. Planning branch: `codex/phase-f-planning-packet`.
3. Runtime root branch: `codex/phase-f-runtime-implementation`.
4. Runtime closure branches:
   - `codex/phase-f-f5-review-fix-closure`
   - `codex/phase-f-f5a-structural-assessment`
   - `codex/phase-f-f6-docs-cleanup`
   - `codex/phase-f-f7-next-phase-readiness`
5. Runtime core branches:
   - `codex/phase-f-f1-<runtime-slice-1>`
   - `codex/phase-f-f2-<runtime-slice-2>`
   - `codex/phase-f-f3-<runtime-slice-3>`
   - `codex/phase-f-f4-decision-closure`
6. Base-branch selection rule:
   - If Phase E closure branch is merged to trunk, branch Phase F from `main`.
   - If not merged, branch Phase F from the topmost Phase E closure branch.
7. End-state rule: clean worktree and stable Graphite stack state.

## Locked Invariants (Must Not Drift)
1. Runtime semantics: `rawr.kind + rawr.capability + manifest registration`.
2. Route families unchanged:
   - `/rpc` internal/first-party.
   - `/api/orpc/*` published OpenAPI boundary.
   - `/api/workflows/<capability>/*` workflow caller boundary.
   - `/api/inngest` signed runtime ingress only.
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts` remains composition authority.
4. Channel A/B remain command surfaces only, never runtime metadata semantics.
5. No architecture pivot after `G1.5` unless explicitly reopened in steward arbitration with disposition artifact.

## Team Design (Default Agents Only, Max 6 Active)
1. Planning wave:
   - `P1`: architecture + slice ordering.
   - `P2`: interfaces/types + file-level ownership map.
   - `P3`: verification/gates design.
   - `P4`: independent steward/arbitration review.
2. Runtime wave:
   - `I1`: F1 + F4 owner (runtime core + decision closure).
   - `I2`: F2 owner.
   - `I3`: F3 owner (durable evidence/gates).
   - `I4`: independent TypeScript + oRPC review owner.
   - `I4A`: structural/taste assessment owner.
   - `I5`: docs/cleanup/readiness/report/handoff owner.
3. Active concurrency target: 3-4 agents.
4. Reuse rule: only with direct continuity and `/compact`; otherwise fresh spawn.
5. Agent sweep rule: close stale threads before each new gate boundary.

## Skills Loadout by Role
1. `P1`: `architecture`, `team-design`, `decision-logging`, `typescript`, `orpc`, `graphite`.
2. `P2`: `typescript`, `orpc`, `api-design`, `architecture`, `decision-logging`.
3. `P3`: `architecture`, `typescript`, `orpc`, `docs-architecture`, `graphite`, `decision-logging`.
4. `P4`: `team-design`, `information-design`, `architecture`, `decision-logging`, `graphite`.
5. `I1`: `typescript`, `orpc`, `architecture`, `decision-logging`, `graphite`.
6. `I2`: `typescript`, `orpc`, `architecture`, `decision-logging`, `graphite`.
7. `I3`: `typescript`, `architecture`, `decision-logging`, `graphite`.
8. `I4`: `typescript`, `orpc`, `architecture`, `decision-logging`.
9. `I4A`: `information-design`, `architecture`, `decision-logging`, `typescript`.
10. `I5`: `docs-architecture`, `information-design`, `graphite`, `decision-logging`.

## Mandatory Agent Protocol
1. Every agent must introspect required skills before substantive work.
2. Every agent must write:
   - `AGENT_<N>_PLAN_VERBATIM.md`
   - `AGENT_<N>_SCRATCHPAD.md` (timestamped)
   - `AGENT_<N>_FINAL_<OBJECTIVE>.md`
3. Every final must include:
   - `Skills Introspected`
   - `Evidence Map` (absolute paths + line anchors)
   - `Assumptions`
   - `Risks`
   - `Unresolved Questions`
4. Every runtime/review/steward final must include executed verification commands and outcomes.
5. Blocking/high findings are mandatory in-run fixes, followed by re-verification and re-review.

## Orchestrator Protocol
1. Maintain a continuous orchestrator scratchpad log with:
   - gate outcomes,
   - arbitration decisions,
   - command results,
   - branch tracking checks,
   - agent registry.
2. Agent registry fields:
   - agent id,
   - scope,
   - current branch,
   - status,
   - compact/close decision.
3. Before each slice handoff:
   - verify branch/worktree context,
   - verify tracked parent linkage,
   - verify clean local state.
4. No runtime kickoff before `G1` complete and `G1.5` approved.

## Required Grounding Corpus (All Agents)
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/README.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md`
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PROJECT_STATUS.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_B_EXECUTION_PACKET.md`
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_C_EXECUTION_PACKET.md`
8. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_D_EXECUTION_PACKET.md`
9. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_E_EXECUTION_PACKET.md`
10. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E7_PHASE_F_READINESS.md`
11. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/PHASE_E_EXECUTION_REPORT.md`
12. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/FINAL_PHASE_E_HANDOFF.md`
13. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md`
14. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
15. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
16. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md`
17. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/GRAPHITE.md`
18. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/runbooks/STACK_DRAIN_LOOP.md`

## Workflow Introspection Requirement
1. `P1` and `I4` must introspect:
   - `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
   - `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
2. If `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` exists, map it explicitly in scratchpad and treat equivalently.

## Gate-by-Gate Flow (Same Order as Prior Successful Phases)

### G0 — Preflight + Agent Sweep
1. Confirm clean status.
2. Confirm stack/tracking health with `gt log --show-untracked`.
3. Confirm safe sync posture with `gt sync --no-restack`.
4. Close stale agents.
5. Initialize orchestrator plan/scratchpad.
6. Stop immediately on any stack anomaly until parentage/tracking is repaired.

### G1 — Planning Packet (Phase F)
1. Run `P1`, `P2`, `P3` in parallel.
2. Integrate one authoritative planning packet:
   - `PHASE_F_EXECUTION_PACKET.md`
   - `PHASE_F_IMPLEMENTATION_SPEC.md`
   - `PHASE_F_ACCEPTANCE_GATES.md`
   - `PHASE_F_WORKBREAKDOWN.yaml`
3. Run `P4` independent steward review.
4. Fix all blocking/high planning findings.
5. Publish:
   - `PHASE_F_REVIEW_DISPOSITION.md`
   - `PHASE_F_PLANNING_HANDOFF.md`
6. Submit planning branch.

### G1.5 — Steward Drift Check Before Runtime
1. Re-ground on final planning packet, current stack topology, and locked invariants.
2. Require explicit steward readout for:
   - invariant compliance,
   - overlap/collision risk,
   - hidden ambiguity.
3. Resolve drift before opening runtime root branch.

### G2 — Core Runtime Slices
1. Execute strictly in packet-defined dependency order:
   - `F1` runtime core implementation slice.
   - `F2` runtime/policy interface hardening slice.
   - `F3` structural evidence/gates hardening slice.
   - `F4` decision closure/disposition slice.
2. Every slice must have:
   - explicit owner,
   - explicit touched paths,
   - quick/full gate pass,
   - submitted branch.
3. `F4` rules:
   - if trigger criteria met, publish trigger evidence and close decisions with explicit status transition.
   - if not triggered, publish explicit deferred rationale and hardened watchpoints.
4. No overlapping-file concurrent edits across active runtime agents.

### G3 — Independent Review + Fix Closure (F5)
1. `I4` performs independent TypeScript + oRPC review.
2. Inputs:
   - canonical packet docs,
   - Phase F planning packet,
   - full runtime diff chain.
3. Blocking/high findings must be fixed by owning slice agents in-run.
4. Re-review required to `approve` state before proceeding.

### G4 — Structural Assessment + Taste Gate (F5A)
1. `I4A` performs structural quality pass:
   - naming,
   - module boundaries,
   - duplication,
   - domain clarity.
2. No architecture pivots.
3. Any accepted refactor must pass impacted quick/full gates.

### G5 — Docs + Cleanup + Canonical Alignment (F6)
1. Align canonical docs to as-landed behavior.
2. Remove superseded intermediate artifacts.
3. Keep closure-critical artifacts only.
4. Publish cleanup manifest with per-path rationale.
5. Re-run disposition and exit gates after cleanup changes.
6. Ensure verification does not depend on ephemeral scratch docs.

### G6 — Readiness + Final Handoff (F7)
1. Publish next-phase readiness with:
   - posture,
   - blockers,
   - owners,
   - ordered kickoff sequence.
2. Publish final execution report and final handoff.
3. Submit final closure slice.
4. Confirm clean stack/worktree end-state.

## Graphite Operational Contract (Good Patterns Only)
1. Allowed mutation flow:
   - `gt create` / `gt track` / per-slice submit / `gt sync --no-restack`.
2. Required cadence per slice:
   - branch create,
   - immediate parent track,
   - implement,
   - quick/full verification,
   - submit,
   - sync,
   - untracked check.
3. Prohibited during Phase F execution:
   - broad restacks,
   - ad-hoc git history rewrites on Graphite branches,
   - manual branch deletion as cleanup.
4. On metadata mismatch:
   - repair only the specific edge or metadata mismatch,
   - re-run `gt sync --no-restack`,
   - re-check with `gt log --show-untracked`,
   - continue only when clean.

## Orchestrator Outputs

### Planning Pass Root
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-planning-pass-01-2026-02-21`

### Planning Artifacts
1. `ORCHESTRATOR_PLAN_VERBATIM.md`
2. `ORCHESTRATOR_SCRATCHPAD.md`
3. `PHASE_F_EXECUTION_PACKET.md`
4. `PHASE_F_IMPLEMENTATION_SPEC.md`
5. `PHASE_F_ACCEPTANCE_GATES.md`
6. `PHASE_F_WORKBREAKDOWN.yaml`
7. `PHASE_F_REVIEW_DISPOSITION.md`
8. `PHASE_F_PLANNING_HANDOFF.md`

### Runtime Pass Root
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21`

### Runtime Artifacts
1. `PHASE_F_EXECUTION_REPORT.md`
2. `F4_DISPOSITION.md`
3. `F4_TRIGGER_EVIDENCE.md` (conditional)
4. `F5_REVIEW_DISPOSITION.md`
5. `F5A_STRUCTURAL_DISPOSITION.md`
6. `F6_CLEANUP_MANIFEST.md`
7. `F7_NEXT_PHASE_READINESS.md`
8. `FINAL_PHASE_F_HANDOFF.md`

## Important Changes or Additions to Public APIs / Interfaces / Types
1. No public topology change is allowed unless explicitly declared in `PHASE_F_EXECUTION_PACKET.md` during `G1`.
2. Any public interface/type delta must include:
   - explicit contract declaration in implementation spec,
   - runtime and structural verification coverage,
   - migration/compatibility note,
   - canonical docs update.
3. Undeclared public-surface changes discovered in review are blocking.

## Verification and Gate Contract
1. Quick suite on every implementation commit.
2. Full suite at:
   - end of each runtime slice,
   - after blocking/high fix sets,
   - before independent review,
   - after structural edits,
   - after docs/cleanup edits,
   - before phase exit.
3. Baseline chain must include drift-core and Phase F slice gates.
4. Exit gate requires:
   - all mandatory slices closed,
   - review/fix closure approved,
   - structural disposition approved,
   - docs/cleanup complete,
   - readiness published,
   - clean stack/worktree state.

## Test Cases and Scenarios
1. Runtime identity invariance scenario (`rawr.kind + rawr.capability + manifest registration`).
2. Route-family invariance scenario (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`).
3. Runtime slice functional correctness scenario for each F1/F2/F3 scope item.
4. Decision trigger integrity scenario for F4 triggered/deferred outcomes.
5. Disposition durability scenario after cleanup.
6. Independent review closure scenario with blocking/high fix-and-rereview loop.
7. Structural quality scenario with no architecture drift.
8. Cleanup integrity scenario preserving closure-critical artifacts only.
9. Readiness scenario with explicit next-phase kickoff posture.

## Assumptions and Defaults
1. Execution starts after your explicit implementation trigger.
2. This is one continuous wave from planning to final handoff.
3. Default agents are mandatory for reasoning-heavy work.
4. Maximum active agents remains 6, target active concurrency 3-4.
5. Graphite remains mandatory for stack operations.
6. Done-done default means:
   - all mandatory artifacts published,
   - all mandatory gates green,
   - no unresolved blocking/high findings,
   - clean stack/worktree state,
   - closure readiness artifact published for next phase.
