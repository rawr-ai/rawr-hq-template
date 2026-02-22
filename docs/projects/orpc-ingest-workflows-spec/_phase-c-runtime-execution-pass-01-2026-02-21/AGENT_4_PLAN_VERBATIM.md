# AGENT 4 Plan (Verbatim)

## Mission
Perform C5 independent review of cumulative Phase C (C1+C2+C3) implementation on branch `codex/phase-c-c3-distribution-lifecycle-mechanics` with focus on TypeScript design quality and oRPC boundary correctness.

## Steps
1. Confirm repository/worktree state, active branch, and review scope baseline.
2. Introspect required skill and prompt documents before code review:
   - `~/.codex-rawr/skills/typescript/SKILL.md`
   - `~/.codex-rawr/skills/orpc/SKILL.md`
   - `~/.codex-rawr/skills/solution-design/SKILL.md`
   - `~/.codex-rawr/skills/system-design/SKILL.md`
   - `~/.codex-rawr/prompts/dev-spec-to-milestone.md`
   - `~/.codex-rawr/prompts/dev-harden-milestone.md`
3. Maintain timestamped review scratchpad throughout execution.
4. Identify cumulative Phase C diff set (C1+C2+C3), inspect changed files, and evaluate against review lenses.
5. Record findings by severity with path+line anchors, impact, and concrete fix recommendations.
6. Write final report with verdict (`approve`, `approve_with_changes`, or `not_ready`) plus required sections.
7. Validate report path contract and provide concise completion summary.
