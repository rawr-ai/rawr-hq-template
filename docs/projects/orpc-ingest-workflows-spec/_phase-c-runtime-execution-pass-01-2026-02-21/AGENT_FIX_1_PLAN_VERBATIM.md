# Agent Fix 1 Plan (Verbatim)

## Objective
Close C5 review findings on branch `codex/phase-c-c3-distribution-lifecycle-mechanics` by:
1. Hardening stale-lock reclamation so active lock holders are not reclaimed.
2. Cleaning up temp directories in ingress observability tests.
3. Preserving existing public API behavior and deterministic stale-lock recovery.

## Required Skill Introspection
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`

## Findings to Fix
1. High: stale-lock reclamation currently uses only lock-file `mtime` and can reclaim active locks.
2. Low: ingress observability test leaves temp directories behind.

## Execution Plan
1. Inspect `packages/state/src/repo-state.ts` lock metadata/write/reclaim paths and determine minimal additive hardening.
2. Implement ownership/liveness-aware stale-lock reclaim:
   - Parse lock metadata (`pid`, `acquiredAt`) from lock file.
   - Reclaim only when stale-by-age and one of:
     - metadata invalid/unreadable, or
     - `pid` is dead (`process.kill(pid, 0)` => `ESRCH`).
   - Do not reclaim when `pid` appears alive or permission is denied (`EPERM`).
3. Keep lock acquisition contract stable (`mutateRepoStateAtomically`, `enablePlugin`, `disablePlugin`, etc.).
4. Add focused lock tests in `packages/state/test/repo-state.concurrent.test.ts`:
   - stale dead-pid lock is reclaimed.
   - stale active-pid lock is not reclaimed (times out without entering critical section).
5. Fix ingress temp-dir cleanup in `apps/server/test/ingress-signature-observability.test.ts` using tracked temp roots + `afterEach` cleanup.
6. Run verification:
   - state lock tests (`packages/state/test/repo-state.concurrent.test.ts`)
   - ingress observability test (`apps/server/test/ingress-signature-observability.test.ts`)
   - relevant C1 quick gate leg (`bun run phase-c:gate:c1-storage-lock-runtime`)
7. Write final report at `AGENT_FIX_1_FINAL.md` including required sections: Skills Introspected, Evidence Map, Assumptions, Risks, Unresolved Questions.

## Non-Goals
1. No change to route-family behavior or oRPC transport contracts.
2. No persisted repo-state schema changes.
3. No expansion beyond required C5 finding closure scope.
