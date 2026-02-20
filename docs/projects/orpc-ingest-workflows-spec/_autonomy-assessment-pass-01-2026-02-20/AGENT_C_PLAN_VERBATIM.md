# Agent C Research Plan (Verbatim)

1. Confirm the assessment scope and constraints from the assignment, including allowed output files and required sections.
2. Introspect the six mandated skills by reading each `SKILL.md`, extracting evaluation lenses relevant to API/context quality, and recording citation-ready notes.
3. Read all scope anchor architecture/axes documents plus implementation files (`apps/server/src/orpc.ts`, `apps/cli/src/lib/coordination-api.ts`, and `apps/web/src/lib/orpc-client.ts` if present).
4. Build an evidence map with absolute paths and line anchors for every material claim.
5. Assess API design quality across contracts, transport, error model, caller model, middleware boundaries, workflow/API boundaries, and context envelope propagation.
6. Explicitly judge consumer model fitness (external clients, internal services, CLI, web) and API evolution posture (versioning strategy, compatibility guardrails, migration ergonomics).
7. Identify assumptions, risks, and unresolved questions, separating observed facts from inferences.
8. Maintain timestamped working notes in `AGENT_C_SCRATCHPAD.md` throughout analysis.
9. Produce `AGENT_C_FINAL_API_CONTEXT_ASSESSMENT.md` with required sections: Skills Introspected, Evidence Map, Assumptions, Risks, Unresolved Questions, plus concrete recommendations.
10. Verify no edits were made outside the three assigned artifact files.
