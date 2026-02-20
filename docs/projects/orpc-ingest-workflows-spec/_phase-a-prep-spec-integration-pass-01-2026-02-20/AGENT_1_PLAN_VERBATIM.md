# Agent 1 Research Plan (Verbatim)

1. Confirm protocol/order constraints and output boundaries for this pass.
2. Initialize and continuously maintain a timestamped scratchpad for findings, decisions, and rationale.
3. Introspect all required skill references before substantive packet edits:
   - information-design
   - solution-design
   - system-design
   - domain-design
   - api-design
   - team-design
   - orpc
   - inngest
   - rawr-hq-orientation
   - docs-architecture
4. Read canonical packet authorities and current structure:
   - ARCHITECTURE.md
   - DECISIONS.md
   - README.md
   - CANONICAL_EXPANSION_NAV.md
   - existing axes docs (especially 10/11/12)
5. Design and author a new canonical axis:
   - axes/13-distribution-and-instance-lifecycle-model.md
   capturing bake-now decisions vs defer-later details in one centralized location.
6. Integrate D-016 into DECISIONS.md as a locked decision that references Axis 13 and preserves D-005..D-015 intent.
7. Update ARCHITECTURE.md, README.md, and CANONICAL_EXPANSION_NAV.md minimally for authority coherence and discoverability of Axis 13 / D-016.
8. Validate no policy drift against existing locked decisions and ensure defer details remain centralized in Axis 13.
9. Produce final report with required sections:
   - Skills Introspected (exact file paths)
   - Evidence Map with absolute file refs + line anchors
   - Assumptions
   - Risks
   - Unresolved Questions
   - concise changed-files list with rationale.
