# AGENT 4 Re-Review Plan (C5 Fix Closure)

## Scope
- Branch: `codex/phase-c-c3-distribution-lifecycle-mechanics`
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation`
- Re-review target: closure status for two prior findings from `AGENT_4_REVIEW_REPORT.md` only.

## Required Introspection
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`

## Execution Steps
1. Confirm branch/worktree state and locate prior AGENT 4 review findings.
2. Inspect stale-lock reclaim implementation in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts` and related tests.
3. Inspect temp-dir lifecycle in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/server/test/ingress-signature-observability.test.ts`.
4. Run targeted regression tests for both finding areas.
5. Determine per-finding status: `closed` or `still_open`.
6. Write re-review report with evidence (absolute paths + line anchors) and final disposition (`approve` / `approve_with_changes` / `not_ready`).
