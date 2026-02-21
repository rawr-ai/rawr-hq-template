# Agent 1 Final Report - A6 Seam Assertions + Hard-Delete Closure

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`
- Milestone workflow prompts found/read:
  - `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
  - `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
  - `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` (missing)

## Evidence Map
- Removed legacy compatibility-output fields from active manifest parser output (`templateRole`, `channel`, `publishTier`), while keeping forbidden-key hard-fail enforcement:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugin-manifest-contract.ts:10`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugin-manifest-contract.ts:44`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugin-manifest-contract.ts:99`
- Workspace plugin surfaces now carry `rawr.kind` + `rawr.capability` only; filtering is kind-based, not role/channel-based:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugins.ts:146`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/workspace-plugins.ts:150`
- Install-state lifecycle selection switched from channel semantics to `rawr.kind === "toolkit"` and canonical-root fallback is explicit opt-in:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/install/state.ts:120`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/install/state.ts:166`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/install/state.ts:228`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/install-state.ts:120`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/install-state.ts:166`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/install-state.ts:228`
- Web enable lifecycle semantics now enforce `rawr.kind=web` (no `templateRole` path):
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/web/enable.ts:68`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/web/enable.ts:70`
- Web enable-all selection is kind-based with runtime-export checks (no Channel B metadata semantics):
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/web/enable/all.ts:77`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/web/enable/all.ts:98`
- CLI install-all selection is kind-based (`toolkit`) with oclif wiring checks (no Channel A metadata semantics):
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/cli/install/all.ts:78`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/cli/install/all.ts:98`
- Scaffold output stopped emitting forbidden legacy metadata keys and now emits canonical capability key:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts:109`
- Web list/status runtime scope is kind-based, not legacy role metadata based:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/web/list.ts:25`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/commands/plugins/web/status.ts:26`
- Added/updated seam assertions for instance-local default authority and explicit global fallback:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/test/install-state.test.ts:123`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/test/install-state.test.ts:146`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/test/install-state.test.ts:144`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/test/install-state.test.ts:171`
- Updated parser/workspace tests to assert canonical metadata contract surfaces:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/test/plugin-manifest-contract.test.ts:6`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/test/workspace.test.ts:25`

## Assumptions
- `rawr.kind=toolkit` is the authoritative runtime signal for Channel A install/link lifecycle decisions.
- `rawr.kind=web` is the authoritative runtime signal for web enable/list/status flows.
- Global-owner canonical-root behavior is intentionally retained only as explicit opt-in (`allowGlobalOwnerFallback`) and should not be defaulted in lifecycle paths.

## Risks
- CLI UX compatibility changed for removed legacy flags (`--allow-non-operational`, `--include-non-operational`, `--all` in web list/status); callers relying on those flags may need follow-up migration handling.
- Explicit global-owner fallback is currently API-level (`assessInstallState` input) rather than exposed via dedicated CLI flags; operators expecting legacy implicit global-owner behavior will now observe workspace-local defaults.

## Unresolved Questions
- Should explicit global-owner fallback be surfaced as first-class CLI flag(s) on `plugins status` and `plugins doctor links`, or remain internal/API-only?
- Should web enable-all remain permissive via runtime exports (`./server` or `./web`) for `rawr.kind=web`, or be constrained further by policy in a follow-up slice?

## Test Commands and Results
1. `bunx vitest run --project hq --project plugin-plugins packages/hq/test/plugin-manifest-contract.test.ts packages/hq/test/workspace.test.ts packages/hq/test/install-state.test.ts plugins/cli/plugins/test/workspace-plugins-discovery.test.ts plugins/cli/plugins/test/install-state.test.ts`
   - Result: pass (17/17 tests)
   - Note: first run exposed one expectation mismatch in `plugins/cli/plugins/test/install-state.test.ts` after canonical-root default shift; expectation was updated and rerun passed.
2. `bunx tsc -p packages/hq/tsconfig.json --noEmit`
   - Result: pass
3. `bunx tsc -p plugins/cli/plugins/tsconfig.json --noEmit`
   - Result: pass
4. `bun scripts/phase-a/check-forbidden-legacy-metadata-keys.mjs packages/hq/src/workspace/plugins.ts plugins/cli/plugins/src/lib/workspace-plugins.ts packages/hq/src/install/state.ts plugins/cli/plugins/src/lib/install-state.ts plugins/cli/plugins/src/commands/plugins/web/enable.ts plugins/cli/plugins/src/commands/plugins/web/enable/all.ts plugins/cli/plugins/src/commands/plugins/cli/install/all.ts plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts plugins/*/*/package.json`
   - Result: pass (`No forbidden legacy metadata key references found across 13 files.`)
5. `bunx vitest run --project hq --project plugin-plugins --testNamePattern='forbidden legacy metadata keys'`
   - Result: pass (3 matched tests passed)
