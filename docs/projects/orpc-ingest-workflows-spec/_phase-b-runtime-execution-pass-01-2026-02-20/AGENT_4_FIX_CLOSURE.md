# AGENT 4 FIX CLOSURE

## What changed
- Hardened `/rpc` auth classification in `apps/server/src/auth/rpc-auth.ts` by removing heuristic trust signals from allow decisions.
- Removed `cookie`-based session fallback, `authorization` prefix fallback, and `user-agent` fallback from `resolveRpcAuthEvidence`.
- Kept host trust and caller-surface gating behavior intact; only auth evidence derivation changed.
- Added regression tests to prove spoof-style evidence does not authorize `/rpc`.

## Findings closed (reference HIGH-01)
- `HIGH-01` is closed for this pass:
  - `/rpc` allow-path no longer accepts spoofable request-shape heuristics (`cookie`, `authorization` prefix, `user-agent`) as auth evidence.
  - Caller class authorization now requires explicit auth evidence fields (`x-rawr-session-auth`, `x-rawr-service-auth`, `x-rawr-cli-auth`) plus existing host/caller-surface constraints.

## Commands run + results
- `bunx vitest run --project server apps/server/test/rpc-auth-source.test.ts apps/server/test/route-boundary-matrix.test.ts apps/server/test/orpc-handlers.test.ts apps/server/test/rawr.test.ts`
  - Result: pass (`4` test files, `28` tests).

## Evidence map (absolute paths + line anchors)
- Heuristic fallbacks removed; explicit evidence-only auth classification:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:135`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:138`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:145`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:147`
- Host trust + caller-surface rules still enforced in classifier:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:151`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:158`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:159`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:161`
- `/rpc` route guard unchanged and still enforced at route boundary:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/orpc.ts:94`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/orpc.ts:109`
- Spoof-regression unit coverage:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/test/rpc-auth-source.test.ts:105`
- Spoof-regression route-level coverage:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/test/rawr.test.ts:105`

## Residual risks
- Explicit `x-rawr-*-auth` fields are still request headers. If upstream infrastructure does not sanitize/overwrite these headers at trust boundaries, header spoofing remains possible.
- This closure intentionally stayed narrow (HIGH-01 scope) and did not introduce a new server-owned auth context object or topology changes.
