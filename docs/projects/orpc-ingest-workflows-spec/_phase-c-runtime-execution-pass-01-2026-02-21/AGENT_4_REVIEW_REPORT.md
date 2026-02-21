# AGENT 4 Review Report (C5 Independent Review)

## Scope
- Branch: `codex/phase-c-c3-distribution-lifecycle-mechanics`
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation`
- Cumulative diff reviewed: `20b2659..HEAD` (C1 + C2 + C3)
- Review lenses: TypeScript design quality, oRPC boundary correctness

## Verdict
`not_ready`

Rationale: one high-severity correctness risk remains in the C1 state-lock implementation.

## Findings

### Blocking
- None.

### High
1. **Stale-lock takeover can break single-writer guarantee under long-held active locks**
   - **Location:** `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts:93`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts:96`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts:143`
   - **Impact:** lock reclamation is based only on `mtime` age, without validating lock-holder liveness/ownership. If a legitimate lock holder runs longer than `staleLockMs` (default 60s), a second process can delete the active lock and enter a concurrent write path. This undermines the core atomicity guarantee introduced by C1 and can cause lost updates or interleaved state writes.
   - **Concrete fix recommendation:** keep stale-lock recovery, but gate deletion on ownership/liveness proof. Parse lock metadata (`pid`, `acquiredAt`) and only reclaim when holder is confirmed dead (e.g., `process.kill(pid, 0)` fails with `ESRCH`) or metadata is invalid/unreadable and lock age exceeds threshold. Also make stale reclaim opt-in for external callers, or set a conservative default (`staleLockMs` >= max expected critical-section duration) with explicit documentation.

### Medium
- None.

### Low
1. **New ingress observability test leaks temp directories**
   - **Location:** `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/server/test/ingress-signature-observability.test.ts:19`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/server/test/ingress-signature-observability.test.ts:62`
   - **Impact:** repeated runs leave temporary directories under OS temp space, adding avoidable noise and eventually slowing local CI environments.
   - **Concrete fix recommendation:** mirror the cleanup pattern used in adjacent new tests (`tempDirs[]` + `afterEach` + `fs.rm(..., { recursive: true, force: true })`).

## oRPC Boundary Assessment
- No direct oRPC route composition/source changes were introduced in C1+C2+C3 runtime code.
- Boundary-related additions are regression tests and gate scripts; these strengthen route-family and ingress-signature expectations.
- No blocking/high oRPC boundary violations were found in changed route-facing logic.

## Explicit High/Blocking Statement
- Blocking findings: **none**.
- High findings: **present (1)**.

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`

## Evidence Map
- Branch/diff mapping:
  - `git log --oneline --reverse 20b2659..HEAD`
  - `git diff --name-status 20b2659..HEAD`
  - `git diff --stat 20b2659..HEAD`
- Primary code reviewed:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/types.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/index.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/coordination-observability/src/events.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/cli/src/commands/doctor/global.ts`
  - New C1/C2/C3 regression tests and phase-c verifier scripts in diff set
- Runtime verification observed:
  - `phase-c:c1:quick` chain completed successfully during this pass.
  - Combined `phase-c:c1:quick && phase-c:c2:quick && phase-c:c3:quick` run was user-interrupted mid-C2 rerun; C2/C3 completion was not re-observed in the interrupted run.

## Assumptions
- C1+C2+C3 review baseline is `20b2659..HEAD` from this branch.
- `mutateRepoStateAtomically` is a supported public API (it is exported), so safety analysis includes non-test consumers.
- Lock critical section may, in realistic future usage, exceed `staleLockMs`.

## Risks
- If stale-lock reclaim remains mtime-only, correctness can regress under prolonged lock holds or clock/FS timing anomalies.
- Incomplete rerun of C2/C3 quick chains in this pass leaves a residual verification confidence gap (mitigated by static review and partial prior gate output).

## Unresolved Questions
1. Should stale-lock takeover be allowed by default, or only when a caller explicitly opts in?
2. What maximum lock hold duration is acceptable in production for state mutations?
3. Is PID-liveness checking acceptable across all target OS/runtime environments for this repository?
