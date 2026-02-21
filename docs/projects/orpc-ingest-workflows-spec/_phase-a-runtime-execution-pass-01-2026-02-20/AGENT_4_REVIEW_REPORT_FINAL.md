# Agent 4 A7 Final Quick Re-Review Report

## Scope
Final verification on `codex/phase-a-a6-hard-delete` latest state to confirm closure of prior unresolved high finding (`/rpc` unlabeled default-allow), check for new blocking/high issues, and validate latest gate/test evidence.

## Evidence Map
- Code reviewed:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/rawr.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/stubs.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts`
- Commands executed:
  - `bun run phase-a:gates:exit` (pass)
  - `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts` (pass)
  - `bunx vitest run --project server apps/server/test/rawr.test.ts` (pass)
  - `bunx vitest run apps/cli/test/stubs.test.ts` (pass)
  - `bunx vitest run apps/cli/test/plugins-command-surface-cutover.test.ts` (failed twice; first test timeout)
- Supplemental runtime check:
  - `bun src/index.ts plugins --help` (exit 0, ~4.67s in isolated HOME; near 5s timeout threshold)

## Previous Findings Status (1..5)
1. `/rpc` external deny correctness: **resolved**.
   - Default-deny now enforced when caller surface header is absent: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts:92`.
   - Explicit unlabeled external-style negative assertion added: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts:179`.
2. `/api/inngest` signature verification pre-dispatch: **resolved**.
   - Signature verification runs before handler dispatch: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:227`.
   - Invalid signature test enforced: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/rawr.test.ts:69`.
3. Manifest-owned composition seam alignment: **resolved**.
   - Manifest seams consumed in host composition: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:217`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:225`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:258`.
4. Route-negative assertion fidelity: **resolved**.
   - Matrix enforces external and unlabeled `/rpc` rejection plus ingress negative assertions: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts:160`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts:179`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts:227`.
5. Downstream CLI test drift closure: **resolved** (original drift scope), with one **new** non-blocking test stability issue (below).

## Findings (Severity Ranked)

### 1) Medium — `plugins-command-surface-cutover` first test is timeout-fragile at default 5s
- Evidence:
  - First test has no explicit timeout override and repeatedly times out at ~5.1s on `runRawr(["plugins", "--help"])`: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts:56`.
  - Adjacent tests already use explicit higher timeouts (`{ timeout: 45000 }`), indicating this suite already expects potentially slow command startup: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts:69`.
- Why it matters:
  - Produces intermittent red validations unrelated to command-surface semantics, weakening gate reliability and reviewer confidence.
- Concrete fix recommendation:
  1. Add an explicit timeout to the first test (for parity with the rest of the suite), e.g. `{ timeout: 15000 }`.
  2. Optionally optimize CLI cold-start path for `plugins --help` to reduce wall time variance.

## Assumptions
- A7 acceptance treats blocking/high findings as release-gating; medium findings can proceed with follow-up.
- Current review target is working-tree state on `codex/phase-a-a6-hard-delete`.

## Risks
- No remaining blocking/high boundary correctness risk found in this pass.
- Residual risk is CI noise from timeout-sensitive CLI test execution.

## Unresolved Questions
1. Should CLI command-surface tests standardize per-test timeout policy to avoid environment-dependent flakes?

## Disposition
`approve_with_changes`

Rationale: prior high `/rpc` boundary finding is resolved and no new blocking/high issues were found; one medium test-stability issue should be addressed in follow-up.
