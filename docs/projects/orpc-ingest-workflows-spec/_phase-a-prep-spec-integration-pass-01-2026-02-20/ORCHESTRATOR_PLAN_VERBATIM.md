# Two-Agent Plan: Phase-A Spec Integration + Review (Manifest, Lifecycle, Distribution)

## Summary
This run updates the ORPC+Inngest specification to **bake in now** the distribution/manifest/lifecycle decisions we agreed on, then performs an independent spec-level review for structure, scope, and defer-clarity.

Locked choices for this run:
1. Distribution commitment: **Target default now** (instance-kit/no-fork-repeatability as default in spec), with rollout mechanics explicitly deferred.
2. Information structure: **new packet axis doc** plus minimal canonical updates/cross-links.
3. Execution base: **current child branch/worktree** (`codex/orpc-inngest-autonomy-assessment` in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment`).

## Team Topology and Agent Reuse
1. Reuse prior aligned agents:
   - Agent 1 (primary spec integration): reuse prior **Agent F** (`019c7c59-c7e4-75a1-95da-bd09e6ed8ffb`) for alternatives/distribution context continuity.
   - Agent 2 (review): reuse prior **Agent A** (`019c7c59-bb2a-7442-8185-ef16d38cbeac`) for packet integrity/policy consistency context.
2. Before assignment:
   - Send `/compact` to reused agents.
   - Close prior non-reused agents (B/C/D/E) to keep active set clean and avoid context leakage.
3. Fallback:
   - If either reused agent cannot resume, spawn a new specialist with the same charter and file ownership.

## Artifact Root and Required Outputs
Use:
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/_phase-a-prep-spec-integration-pass-01-2026-02-20`

Required orchestrator files:
1. `ORCHESTRATOR_PLAN_VERBATIM.md`
2. `ORCHESTRATOR_SCRATCHPAD.md`
3. `REVIEW_DISPOSITION.md`
4. `FINAL_SPEC_UPDATE_SUMMARY.md`

Required Agent 1 files:
1. `AGENT_1_PLAN_VERBATIM.md`
2. `AGENT_1_SCRATCHPAD.md`
3. `AGENT_1_FINAL_SPEC_INTEGRATION_REPORT.md`

Required Agent 2 files:
1. `AGENT_2_PLAN_VERBATIM.md`
2. `AGENT_2_SCRATCHPAD.md`
3. `AGENT_2_REVIEW_REPORT.md`

## Non-Negotiable Protocol (Both Agents)
1. Write plan immediately and verbatim to `AGENT_<N>_PLAN_VERBATIM.md`.
2. Maintain timestamped scratchpad continuously in `AGENT_<N>_SCRATCHPAD.md`.
3. Introspect required skills before doing substantive work.
4. Include in final doc:
   - `Skills Introspected` with exact skill file paths.
   - `Evidence Map` with absolute file paths + line anchors.
   - `Assumptions`, `Risks`, `Unresolved Questions`.
5. Work autonomously with judgment authority; avoid rigid checklist tunnel vision.

## Skills to Introspect

Agent 1 required:
1. `/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
8. `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
9. `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`
10. `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`

Agent 2 required:
1. `/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
8. `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
9. `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`

## Agent 1 Charter (Spec Integration)
Objective:
Integrate “bake now” manifest/lifecycle/distribution decisions coherently into canonical packet docs, while centralizing defer-later items.

Scope:
1. Read full packet and relevant system/process docs needed for coherence.
2. Decide final info shape using information-design judgment.
3. Implement updates with minimal drift and clear authority boundaries.

Expected document strategy:
1. Create new axis doc:
   - `docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md`
2. Add canonical cross-links/authority updates in:
   - `docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
   - `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md` (add `D-016` lock)
   - `docs/projects/orpc-ingest-workflows-spec/README.md`
   - `docs/projects/orpc-ingest-workflows-spec/CANONICAL_EXPANSION_NAV.md`
3. Add one centralized deferral section in the new axis doc, and reference it from `D-016`.

Required semantic outcomes:
1. Lock target distribution default in spec:
   - Template upstream remains engineering source of truth.
   - Default consumer distribution model is instance-kit/no-fork-repeatability.
   - Long-lived fork model is maintainer path, not default consumer path.
2. Keep manifest-first authority explicit:
   - `rawr.hq.ts` as composition authority remains canonical.
3. Keep lifecycle semantics explicit:
   - Runtime semantics by `rawr.kind` + `rawr.capability`.
   - Legacy runtime metadata fields remain non-runtime.
4. Add “do now vs defer” boundary:
   - Bake-now: policy locks, seams, and invariants.
   - Defer: full alias UX, packaging mechanics, migration ergonomics.
5. Include explicit “multi-owner invariant now, full feature later” language:
   - no new singleton-global assumptions.
   - alias/instance seam required by contract, detailed UX deferred.

Guardrails:
1. Do not disturb D-005..D-015 intent.
2. Do not over-specify implementation details that are intentionally deferred.
3. Keep defer information centralized, not scattered.

## Agent 2 Charter (Review)
Objective:
Review Agent 1 updates for packet coherence, scope correctness, and defer clarity.

Review scope:
1. Whole-packet consistency check, not isolated doc linting.
2. Confirm that bake-now additions are appropriately scoped.
3. Verify deferred items are explicit, centralized, and non-contradictory.
4. Confirm no regression to existing locked decisions.

Review output format:
1. Findings ordered by severity.
2. Each finding includes:
   - affected file + line anchors,
   - why it matters,
   - concrete fix recommendation.
3. Explicit conclusion:
   - `approve`,
   - `approve_with_changes`,
   - or `not_ready`.

Constraint:
Agent 2 does not create an alternative spec plan; it performs review-only evaluation and recommendations.

## Orchestrator Execution Flow
1. Initialize pass artifacts at new pass root.
2. Resume/compact selected agents (F -> Agent 1, A -> Agent 2), close non-reused prior agents.
3. Run Agent 1 to completion.
4. Run Agent 2 review on Agent 1 output and changed packet docs.
5. If review has blocking findings:
   - Send focused fix cycle to Agent 1.
   - Send quick re-review to Agent 2.
6. Produce `REVIEW_DISPOSITION.md` with accepted/rejected findings.
7. Produce `FINAL_SPEC_UPDATE_SUMMARY.md` with:
   - changed files,
   - net new decisions,
   - defer register summary,
   - phase-A readiness status.

## Important Changes/Additions to Public APIs/Interfaces/Types (Spec-Level, Not Code)
1. New policy interface (spec contract): `D-016 Distribution and Instance Lifecycle Model`.
2. New composition/lifecycle seam requirements (spec contract):
   - instance-aware CLI binding seam (alias/instance identity contract),
   - explicit prohibition on new singleton-global assumptions.
3. No runtime code API/type changes in this pass; this pass is specification-only.

## Test Cases and Scenarios for This Spec Pass
1. Coherence scenario:
   - New axis + D-016 do not contradict D-005..D-015.
2. Scope scenario:
   - Bake-now items are policy/seam-level only.
   - Deferred items are not accidentally specified as immediate implementation mandates.
3. Distribution scenario:
   - Instance-kit default and non-default fork posture are explicit and unambiguous.
4. Manifest/lifecycle scenario:
   - `rawr.hq.ts` authority and `rawr.kind/rawr.capability` runtime semantics remain canonical.
5. Defer containment scenario:
   - Deferred list is centralized and cross-linked from decision authority.
6. Review quality scenario:
   - Agent 2 findings are actionable, line-anchored, and severity-ranked.

## Assumptions and Defaults
1. Work happens on:
   - branch `codex/orpc-inngest-autonomy-assessment`,
   - worktree `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment`.
2. This is a docs/spec mutation pass only; no runtime code changes.
3. Distribution default is locked now at policy level; rollout mechanics are deferred.
4. Information-architecture decision is locked to a new packet axis + minimal canonical updates.
5. Reuse of prior aligned agents is preferred for continuity; fallback spawn is allowed if reuse fails.
