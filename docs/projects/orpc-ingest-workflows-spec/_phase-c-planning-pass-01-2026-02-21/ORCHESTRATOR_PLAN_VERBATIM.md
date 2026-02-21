# Phase C End-to-End Runbook (Planning + Implementation, Continuous Wave, Forward-Only)

## Summary
1. This runbook is the locked source of truth for Phase C from planning through implementation closure.
2. Locked choices:
   1. `C4` is conditional.
   2. Planning and implementation run in one continuous wave with per-slice Graphite submissions.
   3. Before implementation starts, run a grounding + steward drift-check checkpoint and fix any detected drift.
3. In Plan Mode this is a non-mutating spec; execution begins when implementation mode is invoked.

## Execution Base
1. Parent branch: `codex/phase-c-prep-grounding-runbook`.
2. Planning branch: `codex/phase-c-planning-packet`.
3. Planning worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet`.
4. Implementation root branch: `codex/phase-c-runtime-implementation`.
5. Implementation worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation`.
6. Slice branches:
   1. `codex/phase-c-c1-storage-lock-redesign`
   2. `codex/phase-c-c2-telemetry-contract-expansion`
   3. `codex/phase-c-c3-distribution-lifecycle-mechanics`
   4. `codex/phase-c-c4-decision-tightening` (conditional)
   5. `codex/phase-c-c5-review-fix-closure`
   6. `codex/phase-c-c5a-structural-assessment`
   7. `codex/phase-c-c6-docs-cleanup`
   8. `codex/phase-c-c7-phase-d-readiness`
7. Graphite rule: `gt sync --no-restack` only; submit each closed slice branch via `gt submit --ai`.
8. End-state rule: no dirty worktrees.

## Team Design (Default Agents Only, Max 6 Active)
1. `P1` Planning architecture + slice ordering.
2. `P2` Interfaces/types + file-level map.
3. `P3` Verification/gates planning.
4. `P4` Steward/arbitration reviewer.
5. `I1` C1 + C4 runtime implementation owner.
6. `I2` C2 + C3 implementation owner.
7. `I3` Gate/test implementation owner.
8. `I4` Independent TypeScript + oRPC review owner.
9. `I4A` Structural assessment owner (TypeScript + solution-design + system-design perspective).
10. `I5` Canonical docs/cleanup owner.
11. `I6` Phase-D readiness/realignment owner.

## Mandatory Agent Protocol
1. Each agent must introspect required skills before substantive work.
2. Each agent must write:
   1. `AGENT_<N>_PLAN_VERBATIM.md`
   2. `AGENT_<N>_SCRATCHPAD.md` (timestamped)
   3. `AGENT_<N>_FINAL_<OBJECTIVE>.md`
3. Each final must include:
   1. `Skills Introspected`
   2. `Evidence Map` with absolute file paths + line anchors
   3. `Assumptions`
   4. `Risks`
   5. `Unresolved Questions`
4. Reassignment after a major topic shift requires `/compact` first.
5. Any blocking/high review finding must be fixed in-run and re-verified.

## Required Grounding Corpus (All Agents)
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/README.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md`

## Workflow Introspection Requirement
1. `P1` and `I4` must introspect:
   1. `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
   2. `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
2. If `dev-spec-2-milestone` exists, treat it as equivalent guidance and log mapping in scratchpad.

## Orchestrator Outputs
1. Planning pass root:
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21`
2. Planning artifacts:
   1. `ORCHESTRATOR_PLAN_VERBATIM.md`
   2. `ORCHESTRATOR_SCRATCHPAD.md`
   3. `PHASE_C_EXECUTION_PACKET.md`
   4. `PHASE_C_IMPLEMENTATION_SPEC.md`
   5. `PHASE_C_ACCEPTANCE_GATES.md`
   6. `PHASE_C_WORKBREAKDOWN.yaml`
   7. `PHASE_C_REVIEW_DISPOSITION.md`
   8. `PHASE_C_PLANNING_HANDOFF.md`
3. Runtime pass root:
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21`
4. Runtime artifacts:
   1. `PHASE_C_EXECUTION_REPORT.md`
   2. `C5_REVIEW_DISPOSITION.md`
   3. `C6_CLEANUP_MANIFEST.md`
   4. `C7_PHASE_D_READINESS.md`
   5. `FINAL_PHASE_C_HANDOFF.md`

## Ordered Execution Flow

### Stage 0: Preflight + Agent Sweep
1. Confirm clean status on parent branch and all worktrees.
2. Perform active-agent sweep:
   1. classify each as `aligned` or `stale`,
   2. close stale agents,
   3. reuse aligned agents only with `/compact`.
3. Enforce max six active agents.

### Stage 1: Planning Pass (C0)
1. Run `P1`, `P2`, `P3` in parallel.
2. Integrate into one packet draft.
3. Run `P4` independent review.
4. Fix planning-level blocking/high findings before marking planning packet `ready`.
5. Submit planning branch after closure.

### Stage 1.5: Grounding + Steward Drift Check Before Implementation
1. Pause and re-ground on:
   1. current branch topology,
   2. final planning packet,
   3. current repo state.
2. Ask steward (`P4` or re-compacted equivalent) for explicit “how are we looking” drift readout:
   1. invariant compliance,
   2. slice overlap risk,
   3. hidden ambiguity.
3. If drift is found, run a mini realignment fix on planning docs before writing implementation code.
4. Only then open runtime implementation root branch.

### Stage 2: Core Runtime Implementation

#### C1: Cross-Instance Storage-Lock Redesign (I1)
1. Objective: make repo-local state writes deterministic and collision-safe across concurrent operations while preserving instance-local authority.
2. Primary files:
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts`
   2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/index.ts`
   3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/hq/src/install/state.ts`
   4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/hq/test/install-state.test.ts`
   5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/plugins/cli/plugins/test/install-state.test.ts`
3. Acceptance:
   1. concurrent writes do not corrupt `.rawr/state/state.json`,
   2. instance-local default authority remains unchanged,
   3. global-owner fallback stays explicit-only.

#### C2: Telemetry/Diagnostics Expansion (I2 + I3)
1. Objective: move from optional telemetry scaffold to a required structural contract for core lifecycle flows.
2. Primary files:
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/coordination-observability/src/events.ts`
   2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/coordination-observability/test/observability.test.ts`
   3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/scripts/phase-a/verify-gate-scaffold.mjs`
   4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/package.json`
3. Acceptance:
   1. telemetry gate is structural and hard-fail for required contracts,
   2. no route-family policy drift,
   3. existing phase gate chain remains green.

#### C3: Distribution/Lifecycle Mechanics (I2)
1. Objective: implement deferred D-016 mechanics that improve operational UX without changing runtime semantics.
2. Primary files:
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/scripts/dev/install-global-rawr.sh`
   2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/scripts/dev/activate-global-rawr.sh`
   3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/cli/src/commands/doctor/global.ts`
   4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/cli/test/doctor-global.test.ts`
3. Acceptance:
   1. alias/instance seam is explicit in tooling behavior,
   2. Channel A and Channel B remain command surfaces only,
   3. no singleton-global assumptions are introduced.

#### C4: Conditional Decision Tightening (I1, only if triggered)
1. Trigger criteria:
   1. C1-C3 introduces heavy middleware chains without explicit dedupe-marker clarity, or
   2. C2 introduces finished-hook side effects requiring stricter guardrails.
2. If triggered, update:
   1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
   2. relevant middleware/runtime files and tests.
3. If not triggered, record explicit defer disposition in `C7_PHASE_D_READINESS.md`.

### Stage 3: Independent Review + Fix Closure (C5)
1. `I4` performs full review from TypeScript + oRPC lenses.
2. Required review input:
   1. original packet docs,
   2. Phase C execution packet,
   3. all Phase C runtime diffs.
3. Findings must be severity-ranked and line-anchored.
4. Blocking/high findings must be fixed in-run and re-reviewed.

### Stage 4: Structural Assessment (C5A)
1. `I4A` runs taste/structure review:
   1. naming,
   2. file boundaries,
   3. duplication,
   4. domain clarity.
2. Constraint: no fundamental architecture shifts.
3. Any accepted refactor must pass impacted quick/full gates before merge.

### Stage 5: Docs + Cleanup (C6)
1. Update canonical docs to as-landed behavior.
2. Prune superseded scratch/review artifacts; keep only closure-critical outputs.
3. Publish `C6_CLEANUP_MANIFEST.md` with path-by-path rationale.

### Stage 6: Post-Land Realignment (C7)
1. Reconcile remaining packet for Phase D kickoff.
2. Publish `C7_PHASE_D_READINESS.md` with:
   1. posture (`ready` or `not-ready`),
   2. blockers,
   3. owners,
   4. ordering.
3. Submit final closure branch.

## Verification and Gates
1. Quick suite on each implementation commit (slice-local tests + impacted gate scripts).
2. Full suite at:
   1. end of each slice,
   2. after blocking/high fixes,
   3. before review,
   4. before phase exit.
3. Required gate baseline:
   1. `bun run phase-a:gates:completion`
   2. `bun run phase-a:gates:exit`
   3. targeted server matrix tests in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/server/test/`
4. Add/upgrade Phase C-specific structural gate scripts in `package.json` during C2/C3 where needed.

## Important Changes or Additions to Public APIs/Interfaces/Types
1. State/lifecycle interface additions:
   1. explicit storage-lock behavior for repo state writes,
   2. lock-conflict/error signaling contract where relevant.
2. Telemetry interface additions:
   1. required observability event shape coverage for coordination lifecycle,
   2. stricter gate contract for telemetry conformance.
3. Distribution/tooling interface additions:
   1. explicit alias/instance-aware global CLI wiring mechanics in scripts/doctor paths.
4. No route topology changes:
   1. `/rpc`,
   2. `/api/orpc/*`,
   3. `/api/workflows/<capability>/*`,
   4. `/api/inngest`
   remain semantically unchanged.

## Test Cases and Scenarios
1. Concurrent state mutation scenario: parallel enable/disable operations do not corrupt repo state.
2. Instance authority scenario: workspace-root remains default canonical authority; explicit fallback behavior is preserved.
3. Alias seam scenario: alias-aware global CLI mechanics work without reintroducing singleton assumptions.
4. Channel semantics scenario: Channel A and Channel B remain command surfaces only, not runtime semantics.
5. Telemetry contract scenario: required lifecycle telemetry assertions pass and optional-no-op behavior is removed where Phase C mandates coverage.
6. Boundary integrity scenario: route-family and caller restrictions remain unchanged.
7. Review closure scenario: blocking/high findings resolved and re-reviewed.
8. Structural quality scenario: non-topology improvements validated with no architecture drift.
9. Cleanup scenario: artifact roots retain only closure-critical records.
10. Phase readiness scenario: explicit, actionable Phase D kickoff posture.

## Assumptions and Defaults
1. Execution is forward-only and excludes rollback playbooks.
2. This phase allows scoped structural refactors but forbids architecture pivots.
3. `C4` executes only when trigger criteria are met.
4. Graphite submissions happen per closed slice branch, not batched.
5. If workflow prompt variant names differ, equivalent local prompt is used and logged.
6. Steward arbitration authority order:
   1. `ARCHITECTURE.md`
   2. `DECISIONS.md`
   3. Phase C execution packet
   4. Specialist proposals
7. Final completion requires:
   1. all mandatory slices closed,
   2. review + structural loops closed,
   3. docs/cleanup complete,
   4. Phase D readiness published,
   5. clean git state.
