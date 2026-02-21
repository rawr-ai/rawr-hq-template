## Agent D Research Plan (Verbatim)

1. Establish baseline context in the assigned worktree (branch/status only) without modifying non-assigned files.
2. Introspect and extract applicable heuristics from the required skills:
   - solution-design
   - system-design
   - domain-design
   - team-design
3. Read all scope anchors and capture line-anchored evidence about:
   - domain ownership boundaries
   - authority/decision rights
   - overlap and coupling risk
   - import and composition direction constraints
   - team autonomy implications
4. Cross-check implementation surfaces (`packages/hq/...` and `plugins/cli/...`) against the architecture/spec documents to detect drift between intended and actual authority boundaries.
5. Build a domain-authority model with explicit single-owner recommendations and identify overlap zones, import-direction violations (or weak guarantees), and autonomy blockers.
6. Maintain timestamped working notes in `AGENT_D_SCRATCHPAD.md` throughout the assessment.
7. Produce `AGENT_D_FINAL_DOMAIN_AUTHORITY_ASSESSMENT.md` with required sections:
   - Skills Introspected
   - Evidence Map (absolute file paths with line anchors)
   - Assumptions
   - Risks
   - Unresolved Questions
8. Validate that only the three assigned Agent D output files were edited in the artifact root.
