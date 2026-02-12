# Working Pad: Single-Surface Cutover + Template->Personal Integration

Status: active

## Execution Log
- [x] Phase 0: wrote full plan scratch doc.
- [x] Phase 0: created working pad.
- [ ] Phase 1: create phase4 branch.
- [ ] Phase 1: remove `apps/cli/src/commands/hq/plugins/*`.
- [ ] Phase 1: update non-archive docs/skills/tests to `rawr plugins web ...`.
- [ ] Phase 2: run install/typecheck/tests/grep gates.
- [ ] Phase 3: publish + merge template stack; sync cleanup loop.
- [ ] Phase 5+: switch to personal integration and mirror notes.

## Key Decisions (Locked)
- Hard-remove `rawr hq plugins ...` command surface (no shim).
- Non-archive docs updated; `_archive` left unchanged.
- Merge transition stack first; unrelated template stacks left open unless load-bearing.
- Personal integration is sync-first from template main.
- Plugin Lifecycle remains top draft after restack.

## Operator Notes
- Template worktree path:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix`
- Personal worktree path for mirrored notes:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-dev-codex-dev-plugin-lifecycle-quality-phase1-scratch-docs`

## Commands to Run (Planned)
- `gt create -am "docs(process): add single-surface cutover scratch docs" codex/template-owned-core-transition-phase4-single-surface-cutover`
- Verification:
  - `bun install`
  - `bunx turbo run typecheck --filter=@rawr/cli --filter=@rawr/plugin-plugins --filter=@rawr/agent-sync --filter=@rawr/control-plane`
  - `bunx vitest run --project cli apps/cli/test/stubs.test.ts apps/cli/test/plugins-command-surface-cutover.test.ts apps/cli/test/plugins-status.test.ts apps/cli/test/plugins-sync-drift.test.ts`
  - `bunx vitest run --project plugin-plugins --project agent-sync --project control-plane`
