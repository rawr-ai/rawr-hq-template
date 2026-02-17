# Session 019c587a — Agent N ORPC Sanity Check Plan

## Scope

Perform an independent sanity-check of the latest integrated ORPC contract/router recommendation and new illustration against prior consensus docs and optional runtime files.

## Steps

1. Read required docs and extract explicit claims about:
   - contract location,
   - router/implementation shape,
   - internal vs external package asymmetry,
   - API plugin file structure granularity.
2. Compare latest integrated recommendation to prior consensus-bearing docs (L, M, posture spec, debate integration, H).
3. Verify (lightly) against runtime reality (`apps/server/src/orpc.ts`, `apps/server/src/rawr.ts`) and, if needed, oRPC official docs on contract-first/router-first patterns.
4. Evaluate user concerns explicitly:
   - unnecessary churn vs justified separation,
   - over-fragmentation risk,
   - simpler least-churn alternative viability.
5. Produce final recommendation with:
   - verdict (match vs drift),
   - minimal structure proposal,
   - internal operations guidance (keep/drop/conditional),
   - file tree + concise code pattern notes,
   - tradeoffs.

## Output Artifacts

- Plan: this file
- Scratchpad: `SESSION_019c587a_AGENT_N_ORPC_SANITY_CHECK_SCRATCHPAD.md`
- Final review: `SESSION_019c587a_AGENT_N_ORPC_SANITY_CHECK_RECOMMENDATION.md`
