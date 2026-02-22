# AGENT FIX C Final Report

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`

## Evidence Map
- Pass-1 baseline/alignments (already applied):
  - Replaced legacy `templateRole` and role-based enable expectations with hard-delete semantics in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/stubs.test.ts`.
  - Updated assertions to `kind` + `capability`, and non-web enable failure to `PLUGIN_KIND_MISMATCH`.
- Pass-2 required fixes completed:
  - Added timeout to remaining flaky list test in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/stubs.test.ts:46` and also `tools export` in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/stubs.test.ts:38` (same root cause: subprocess runtime > default 5s).
  - Reconciled command-surface cutover tests in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts`:
    - Added explicit timeouts for slow integration tests at `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts:69`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts:80`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts:129`.
    - Added isolated sync env helper at `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts:36` to pin `CODEX_HOME`/`CODEX_MIRROR_HOME`/`CLAUDE_PLUGINS_LOCAL` to temp dirs and avoid host-home conflict drift.
    - Updated dry-run variant command args at `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts:85` to run deterministic codex-only dry-run (`--agent codex`, `--codex-home`, `--no-cowork`, `--no-install-reconcile`) consistent with Channel A/B policy and hard-delete behavior.
- Runtime evidence behind the status mismatch fix:
  - `plugins sync plugins --dry-run --json` on default host env returned exit 1 with `SYNC_CONFLICTS` due target home conflicts.
  - Same command with isolated target homes returned exit 0 and stable JSON payload.

## Assumptions
- CLI subprocess tests in this suite are integration-style and may legitimately exceed Vitest’s default 5s timeout.
- Isolating sync destination env is the correct test strategy because host-level Codex/Claude homes are external state and not part of the test contract.
- Channel surface policy remains command-surface-only; tests should verify command behavior, not legacy runtime role/channel metadata.

## Risks
- If sync command defaults change again (e.g., conflict handling/exit semantics), dry-run assertions may need another contract update.
- If global security scanning cost increases, even 30-45s per-test timeouts may become tight on constrained CI runners.
- Existing unrelated repo changes remain in working tree; not touched by this scope.

## Unresolved Questions
- Should these subprocess-heavy CLI tests adopt a shared higher default timeout instead of per-test overrides?
- Should more sync tests isolate target homes by default to eliminate host-environment nondeterminism?

## Commands And Results
- Required validation:
  - `bunx vitest run apps/cli/test/stubs.test.ts` -> **pass** (6/6).
  - `bunx vitest run apps/cli/test/plugins-command-surface-cutover.test.ts` -> **pass** (4/4).
- Key diagnostic probes used to reconcile status mismatch:
  - `bun src/index.ts plugins sync plugins --dry-run --json` -> exit 1 (`SYNC_CONFLICTS`) in host env.
  - `bun src/index.ts plugins sync plugins --dry-run --json --agent codex --codex-home <temp> --no-cowork --no-install-reconcile` (isolated env) -> exit 0.

## Pass-3 Micro-Fix (A7 Closure)
- Scoped change only in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/cli/test/plugins-command-surface-cutover.test.ts`:
  - Added explicit timeout override to the first test:
    - `it("exposes web/cli/scaffold/sync under plugins topic", { timeout: 30000 }, ...)`
- No behavioral assertion changes and no non-test code edits.

### Pass-3 Validation
- `bunx vitest run apps/cli/test/plugins-command-surface-cutover.test.ts` -> **pass** (4/4).
