# Working Pad: Single-Surface Cutover + Template->Personal Integration

Status: active

## Location Registry
- Template plan: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix/docs/projects/template-core-transition/SINGLE_SURFACE_CUTOVER_AND_INTEGRATION_SCRATCH.md`
- Template working pad (this file): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix/docs/projects/template-core-transition/WORKING_PAD.md`
- Personal mirrored plan: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-dev-codex-dev-plugin-lifecycle-quality-phase1-scratch-docs/docs/projects/plugin-lifecycle-quality/TEMPLATE_OWNED_CORE_PERSONAL_INSTALL_TRANSITION_SCRATCH.md`
- Personal scratchpad: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-dev-codex-dev-plugin-lifecycle-quality-phase1-scratch-docs/docs/projects/plugin-lifecycle-quality/IMPLEMENTATION_SCRATCHPAD.md`

## Execution Log
- [x] Phase 0: wrote full plan scratch doc.
- [x] Phase 0: created working pad.
- [x] Phase 1: create phase4 branch.
- [x] Phase 1: remove `apps/cli/src/commands/hq/plugins/*`.
- [x] Phase 1: update non-archive docs/skills/tests to `rawr plugins web ...`.
- [x] Phase 2: run install/typecheck/tests/grep gates.
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
  - [x] `bun install`
  - [x] `bunx turbo run typecheck --filter=@rawr/cli --filter=@rawr/plugin-plugins --filter=@rawr/agent-sync --filter=@rawr/control-plane`
  - [x] `bunx vitest run --project cli apps/cli/test/stubs.test.ts apps/cli/test/plugins-command-surface-cutover.test.ts apps/cli/test/plugins-status.test.ts apps/cli/test/plugins-sync-drift.test.ts`
  - [x] `bunx vitest run --project plugin-plugins --project agent-sync --project control-plane`
