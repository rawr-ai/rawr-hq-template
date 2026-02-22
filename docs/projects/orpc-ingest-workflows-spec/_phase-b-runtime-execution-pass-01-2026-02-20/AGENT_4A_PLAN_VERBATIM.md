# Agent 4A Plan (Verbatim)

## Slice
- Slice: `B4A` structural assessment + tasteful refactor
- Branch: `codex/phase-b-b4a-structural-assessment`
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation`

## Intent
Apply maintainability-focused, non-architectural improvements to Phase B code with strict scope control:
- improve naming clarity,
- sharpen module boundaries,
- reduce local duplication,
- increase domain clarity,
- preserve route topology, authority seams, and policy behavior.

## Inputs to Ground Decisions
1. Required skills introspection:
   - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
2. Grounding corpus:
   - `docs/projects/orpc-ingest-workflows-spec/PHASE_B_EXECUTION_PACKET.md`
   - `docs/projects/orpc-ingest-workflows-spec/PHASE_B_IMPLEMENTATION_SPEC.md`
   - `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
3. Primary candidate area:
   - `scripts/phase-a/manifest-smoke.mjs`
   - `scripts/phase-a/verify-gate-scaffold.mjs`
   - `scripts/phase-a/verify-harness-matrix.mjs`
   - `apps/server/test/phase-a-gates.test.ts`

## Scope Guardrails
- No fundamental architecture changes.
- No route-family changes.
- No authority/policy shifts.
- No behavior shifts outside structural readability/maintainability.

## Execution Plan
1. Verify branch/worktree cleanliness and baseline state.
2. Inspect candidate files for naming ambiguity, duplication, weak boundary cues, and domain leakage.
3. Build a compact evidence map (file + lines + issue type + impact).
4. Decide no-op vs targeted refactor based on concrete maintainability ROI.
5. If refactor proceeds, apply small, reversible edits only:
   - rename confusing identifiers,
   - extract obvious local helpers,
   - simplify repetitive checks,
   - clarify intent with minimal comments where needed.
6. Run impacted verification/tests.
7. Record exact commands and outcomes.
8. Produce final assessment report with required sections:
   - Skills Introspected
   - Evidence Map
   - Assumptions
   - Risks
   - Unresolved Questions

## Validation Targets
- Candidate script execution where relevant.
- Candidate test execution:
  - `apps/server/test/phase-a-gates.test.ts`
- Any additional directly impacted checks.

## Output Artifacts
1. Plan: `AGENT_4A_PLAN_VERBATIM.md`
2. Scratch: `AGENT_4A_SCRATCHPAD.md` (timestamped notes during execution)
3. Final report: `AGENT_4A_FINAL_STRUCTURAL_ASSESSMENT.md`
