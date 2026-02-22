# Agent Fix 1 Final (C5 Findings Closure)

## Outcome
Both C5 findings were addressed.

1. High finding closed: stale-lock reclamation now requires lock-holder non-liveness (PID check) before reclaiming stale-aged lock files.
2. Low finding closed: ingress observability tests now clean temporary directories in `afterEach`.

## Implemented Fixes
1. Added lock metadata parsing + PID liveness checks and gated stale lock cleanup on `canReclaimStaleLock`.
2. Added state tests for:
   - reclaim when stale lock holder PID is dead,
   - no reclaim and timeout when stale-aged lock holder PID is still alive.
3. Added temp-dir tracking and `afterEach` cleanup to ingress observability tests.

## Verification Run
1. `bunx vitest run --project state packages/state/test/repo-state.concurrent.test.ts`
2. `bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts`
3. `bun run phase-c:gate:c1-storage-lock-runtime`

All passed.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`

## Evidence Map
1. Lock metadata + PID liveness guardrails: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts:93`
2. Stale cleanup now gated by reclaimability check: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts:142`
3. Dead-PID reclaim and active-PID non-reclaim tests: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/test/repo-state.concurrent.test.ts:75`
4. Ingress test temp-dir cleanup via `afterEach`: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/server/test/ingress-signature-observability.test.ts:17`

## Assumptions
1. PID metadata written to lock files remains authoritative enough for intra-host lock ownership checks.
2. Lock reclaim should remain conservative: no reclaim if lock-holder process appears alive.

## Risks
1. PID reuse edge cases can still exist on long-lived systems, though reclaim still requires stale-age threshold plus non-liveness at check time.
2. External non-conforming lock writers (without JSON metadata) are treated as reclaimable when stale-aged.

## Unresolved Questions
1. None blocking for C5 closure.
