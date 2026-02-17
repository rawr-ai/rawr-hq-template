# SESSION_019c587a — Agent P Integration Plan (Verbatim)

## Mission
Produce a decision-complete integration diff that merges the recommendation into the canonical posture spec without editing the canonical spec in this phase.

## Locked Inputs
1. Canonical posture spec:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
2. Integrated recommendation:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`
3. Required skill context:
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`

## Phase Constraint
Analysis-only.
- Do not edit canonical spec docs in this phase.
- Create only the three Agent P artifacts.

## Decision Rules (Locked)
1. Recommendation is authoritative on direct conflicts.
2. Non-conflicting canonical content is retained.
3. Integration plan must be section-targeted; no full-document rewrite.
4. Output must be implementation-ready without interpretation.

## Required Artifacts
1. Plan (this file):
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_P_INTEGRATION_PLAN_VERBATIM.md`
2. Scratchpad:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_P_INTEGRATION_SCRATCHPAD.md`
3. Integration diff (final analysis output):
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_P_POSTURE_RECOMMENDATION_INTEGRATION_DIFF.md`

## Deliverable Contract for Artifact #3
Artifact #3 must include all of the following:
1. Matrix with exact columns:
`Area | Current Spec | Recommendation | Action | Keep/Replace/Merge | Evidence`
2. Explicit application of conflict rule:
- recommendation authoritative on conflicts
- retain non-conflicting complementary canonical content
3. Explicit carryover list of unique examples/snippets/fixtures to integrate.
4. “Do not rewrite whole spec” guardrail plus targeted edit plan by section.
5. Exact section-level patch order for implementation phase.

## Working Method
1. Extract section map from both docs.
2. Identify overlap, conflict, and additive deltas per area.
3. Classify each area as Keep/Replace/Merge with evidence anchors.
4. Produce carryover inventory of unique recommendation content not present in canonical spec.
5. Produce exact patch sequence that can be executed directly in implementation phase.

## Done Criteria
1. Every material recommendation delta is mapped.
2. Every retained canonical section is justified.
3. Implementation phase can execute from artifact #3 alone with no interpretation step.
