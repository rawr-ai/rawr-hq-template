# Official Plan: Phase A Implementation Planning Run (Forward-Only)

## Summary
This run produces a decision-complete, execution-ready **Phase A implementation plan** for the ORPC + Inngest specification.  
This run is planning-only (no runtime implementation changes), and is explicitly **forward-only**: pragmatic engineering controls are included, but rollback-heavy planning is intentionally excluded.

## Scope
1. Build a complete Phase A implementation plan with concrete slices, file-level impact, interfaces, tests, gates, and ownership.
2. Reconcile Phase A against the full spec so downstream phases are sequenced clearly without over-planning them now.
3. Resolve only Phase A-blocking ambiguities; defer non-blocking mechanics to later phases per D-016.
4. Keep posture aligned to early-stage platform development (fast convergence, low ceremony, high clarity).

## Out of Scope
1. Runtime code implementation.
2. Enterprise rollback programs, rollback matrices, rollback playbooks.
3. Full detailed plans for all later phases beyond what is required for Phase A sequencing integrity.

## Execution Base
1. Branch: `codex/orpc-inngest-autonomy-assessment`.
2. Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment`.
3. Pass root: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/_phase-a-implementation-planning-pass-01-2026-02-20`.
4. Graphite rule: `gt sync --no-restack` only; no global restack actions.

## Agent Hygiene and Team Setup
1. Close all currently active agents not assigned to this run.
2. Spawn fresh agents for this run to ensure clean grounding and avoid stale context bleed.
3. Use four agents: three planning specialists plus one independent reviewer.
4. Keep orchestrator as integrator/arbitrator only.

## Team Topology
| Agent | Objective | Required Skills to Introspect | Required Output Files |
|---|---|---|---|
| Agent 1 | Phase A migration architecture and slice ordering (D-013 + D-016 seam-now posture) | `solution-design`, `system-design`, `domain-design`, `team-design`, `typescript`, `orpc`, `inngest`, `rawr-hq-orientation` | `AGENT_1_PLAN_VERBATIM.md`, `AGENT_1_SCRATCHPAD.md`, `AGENT_1_FINAL_PHASE_A_MIGRATION_PLAN.md` |
| Agent 2 | Phase A runtime/interface delta map and file-level implementation blueprint | `solution-design`, `system-design`, `domain-design`, `api-design`, `typescript`, `orpc`, `inngest` | `AGENT_2_PLAN_VERBATIM.md`, `AGENT_2_SCRATCHPAD.md`, `AGENT_2_FINAL_PHASE_A_INTERFACE_AND_FILE_MAP.md` |
| Agent 3 | Phase A verification, gates, observability, and forward-only control model (non-rollback) | `solution-design`, `system-design`, `domain-design`, `api-design`, `typescript`, `inngest`, `docs-architecture` | `AGENT_3_PLAN_VERBATIM.md`, `AGENT_3_SCRATCHPAD.md`, `AGENT_3_FINAL_PHASE_A_VERIFICATION_AND_GATES.md` |
| Agent 4 | Independent decision-completeness review of integrated Phase A plan | `information-design`, `solution-design`, `system-design`, `domain-design`, `api-design`, `docs-architecture`, `team-design` | `AGENT_4_PLAN_VERBATIM.md`, `AGENT_4_SCRATCHPAD.md`, `AGENT_4_REVIEW_REPORT.md` |

## Mandatory Agent Protocol (All Agents)
1. Introspect required skills before substantive analysis.
2. Immediately write plan verbatim to `AGENT_<N>_PLAN_VERBATIM.md`.
3. Continuously append timestamped notes to `AGENT_<N>_SCRATCHPAD.md`.
4. Read full required corpus before conclusions.
5. Final document must include: `Skills Introspected`, `Evidence Map` (absolute file paths + line anchors), `Assumptions`, `Risks`, `Unresolved Questions`.
6. Use judgment/autonomy; avoid tunnel-vision checklist execution.
7. Keep recommendations Phase A-scoped and implementable.

## Required Grounding Corpus (All Agents)
1. Full spec packet:
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/README.md`
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/CANONICAL_EXPANSION_NAV.md`
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`
all files under `axes/` and `examples/`.
2. Prior assessment anchors:
`.../_autonomy-assessment-pass-01-2026-02-20/EXECUTIVE_SUMMARY.md`
`.../_autonomy-assessment-pass-01-2026-02-20/INTEGRATED_ASSESSMENT.md`
`.../_autonomy-assessment-pass-01-2026-02-20/ALTERNATIVES_COMPARISON.md`.
3. Runtime reality files:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/coordination.ts`
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts`
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/*`.

## Agent Charters

### Agent 1 Charter: Migration Architecture and Slice Ordering
1. Define exact Phase A scope boundaries, with explicit “must-do now” vs “defer later”.
2. Produce ordered implementation slices with dependencies and owner assignment.
3. Time-box compatibility bridge mechanics and include explicit shim-removal checkpoints.
4. Keep plan forward-only; include visibility checkpoints, not rollback playbooks.

### Agent 2 Charter: Interfaces and File-Level Blueprint
1. Produce file-level change map for Phase A implementation.
2. Define contract and type deltas for manifest authority, metadata semantics, route/caller boundaries, and context seams.
3. Specify per-slice implementation units and touched paths.
4. Identify non-overlap work that should remain deferred.

### Agent 3 Charter: Verification and Gates
1. Define Phase A acceptance gates and CI checks.
2. Define required route-family negative assertions and metadata contract assertions.
3. Define lightweight observability/diagnostic requirements for forward progress.
4. Exclude rollback orchestration; focus on correctness and quick detection of drift.

### Agent 4 Charter: Independent Review
1. Review integrated Phase A plan for decision completeness and execution clarity.
2. Confirm no unresolved implementer decisions remain.
3. Confirm deferred items are explicit and centralized.
4. Issue disposition: `approve`, `approve_with_changes`, or `not_ready`.

## Orchestrator Protocol
1. Write `ORCHESTRATOR_PLAN_VERBATIM.md` immediately.
2. Maintain `ORCHESTRATOR_SCRATCHPAD.md` continuously.
3. Run Agents 1–3 in parallel.
4. Integrate outputs into unified Phase A plan package.
5. Run Agent 4 review on integrated plan.
6. If blocking findings exist, run focused fix cycle with owning agent and re-review.
7. Publish final artifacts and review disposition.

## Required Orchestrator Outputs
1. `ORCHESTRATOR_PLAN_VERBATIM.md`
2. `ORCHESTRATOR_SCRATCHPAD.md`
3. `PHASE_A_EXECUTION_PLAN.md`
4. `PHASE_A_WORKBREAKDOWN.yaml`
5. `PHASE_A_INTERFACE_DELTAS.md`
6. `PHASE_A_ACCEPTANCE_GATES.md`
7. `PHASE_SEQUENCE_RECONCILIATION.md`
8. `REVIEW_DISPOSITION.md`
9. `FINAL_PHASE_A_PLANNING_SUMMARY.md`

## Important Changes/Additions to Public APIs/Interfaces/Types (Planned, Not Implemented in This Pass)
1. Runtime identity contract hardening: `rawr.kind` + `rawr.capability` as runtime-authoritative keys; legacy fields removed from runtime semantics.
2. Manifest authority contract: `rawr.hq.ts` as canonical composition source for runtime/boundary surfaces.
3. Route contract clarification for Phase A sequencing: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest` role guarantees and test obligations.
4. Context seam contract clarification: request-scoped boundary context vs durable runtime context responsibilities.
5. Verification interface contract: mandatory route-family negative assertions and required conformance gates.

## Test Cases and Scenarios (Planning Validation + Planned Execution Coverage)
1. Metadata migration scenario: legacy runtime semantic use is fully replaced by target contract.
2. Route semantics scenario: caller/transport boundaries are preserved and explicitly testable.
3. Manifest composition scenario: route and runtime composition authority is deterministic and file-mapped.
4. Context propagation scenario: boundary/runtime context seams are defined without ambiguity.
5. Plugin lifecycle/discovery scenario: Phase A treatment of current plugin metadata/tooling is explicit and implementable.
6. D-016 seam-now scenario: no singleton-global assumptions; alias/instance seam requirements are represented at contract/test level.
7. Forward-only execution scenario: compatibility shims are time-boxed with concrete removal criteria.
8. End-to-end plan completeness scenario: each slice has owner, dependencies, acceptance gates, and touched paths.

## Forward-Only Delivery Posture (Non-Negotiable)
1. No rollback playbook deliverables.
2. No defensive multi-track release choreography.
3. Use pragmatic visibility only: test gates, invariant checks, and targeted diagnostics.
4. Prefer direct convergence; allow only short-lived compatibility bridges with explicit retirement criteria.

## Acceptance Criteria for This Planning Run
1. Final Phase A plan is implementer-ready with no unresolved high-impact decisions.
2. Every implementation slice has owner, sequence, dependencies, touched files, and acceptance criteria.
3. Public interface/type deltas are explicit and phase-scoped.
4. Deferred items are centralized and clearly non-blocking for Phase A.
5. Independent review disposition is `approve` (or `approve_with_changes` with resolved mandatory items).

## Cleanup Plan (End of Run)
1. Keep final planning artifacts listed in “Required Orchestrator Outputs”.
2. Delete pass-local scratch/review artifacts only:
`AGENT_*_PLAN_VERBATIM.md`, `AGENT_*_SCRATCHPAD.md`, intermediate review drafts, temporary integration notes superseded by final docs.
3. Do not delete non-info-design or unrelated pass artifacts.
4. End with clean git state on the working branch.

## Assumptions and Defaults
1. Planning run is docs/planning only; no runtime code changes in this run.
2. Current canonical spec state (including D-016 lock and info-design improvements) is the source of truth.
3. D-009 and D-010 remain non-blocking unless analysis proves they block a specific Phase A slice.
4. Distribution mechanics UX/packaging details remain deferred per Axis 13; Phase A only plans seam-level obligations.
5. Team posture is early-stage platform development, producer/consumer internal, forward-only.
