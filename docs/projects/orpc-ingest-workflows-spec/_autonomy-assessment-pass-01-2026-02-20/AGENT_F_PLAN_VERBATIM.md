# Agent F Research Plan (Verbatim)

1. Confirm protocol constraints, output boundaries, and required deliverables.
2. Read and extract decision heuristics from required skills:
   - solution-design
   - system-design
   - domain-design
   - api-design
   - team-design
   - typescript
3. Inventory packet evidence under `docs/projects/orpc-ingest-workflows-spec/`, with emphasis on D-013 (metadata migration) and D-015 (testing blast-radius).
4. Inventory runtime anchors in:
   - `apps/server`
   - `packages/coordination*`
   - `packages/core`
   - `packages/hq`
   - `plugins/cli/plugins`
5. Build an evidence map with absolute file paths and line anchors linking architecture claims to source text/code.
6. Develop at least three alternatives:
   - Conservative incremental
   - Balanced bridge
   - Robust greenfield-like
7. Evaluate alternatives against explicit decision criteria (delivery risk, migration risk, operability, correctness, team/cognitive load, testability, extensibility).
8. Produce a recommendation and phased plan (0/1/2/3) including guardrails, migration sequencing, and decision gates.
9. Capture assumptions, risks, and unresolved questions.
10. Deliver final report in `AGENT_F_FINAL_ALTERNATIVES_AND_RECOMMENDATION.md`.
