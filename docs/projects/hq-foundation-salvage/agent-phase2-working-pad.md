# Agent Phase 2 Working Pad

## Live Decisions / Notes
- Initialized scratch docs before any code/content porting (required gate).
- Existing unrelated dirty files detected and intentionally left untouched:
  - `docs/projects/hq-foundation-salvage/PLAN_SCRATCH.md`
  - `docs/projects/hq-foundation-salvage/WORKING_PAD.md`
- Slice A decision: template guard manifest now uses explicit shared package paths to keep `packages/dev/**` personal-owned.
- Slice A decision: ownership docs now treat `plugins/agents/hq/**` as full template-managed HQ domain.
- Slice B decision: full `plugins/agents/hq/**` domain copied from personal -> template with exact parity (`diff -rq` clean).
- Slice C decision: promote personal lib-level deltas in `plugins/cli/plugins/src/lib/**` while preserving template-only/regr-sensitive command files (`converge`, `doctor links`, `improve`, `sweep`) to avoid capability loss.

## Checkpoints
- [x] Created required scratch docs
- [x] Baseline inventory complete
- [x] Slice A committed
- [x] Slice B committed
- [ ] Slice C committed
- [ ] Verification commands complete
- [ ] Final report prepared

## Slice Logs
### Slice A
- Updated `scripts/githooks/template-managed-paths.txt`.
- Updated `AGENTS_SPLIT.md`.
- Updated `docs/process/CROSS_REPO_WORKFLOWS.md`.
- Updated `docs/system/PLUGINS.md`.
- Committed with Graphite.

### Slice B
- Synced `plugins/agents/hq/**` from personal repo using `rsync -a --delete`.
- Verified target/source parity with `diff -rq`.
- Committed with Graphite.

### Slice C
- Copied these personal lib deltas into template plugin toolkit:
  - `plugins/cli/plugins/src/lib/factory.ts`
  - `plugins/cli/plugins/src/lib/install-reconcile.ts`
  - `plugins/cli/plugins/src/lib/install-state.ts`
  - `plugins/cli/plugins/src/lib/journal-context.ts`
  - `plugins/cli/plugins/src/lib/plugins-lifecycle/*`
  - `plugins/cli/plugins/src/lib/security.ts`
  - `plugins/cli/plugins/src/lib/workspace-plugins.ts`
- Kept template-only command surfaces and scratch-policy checks intact.
- Pending: Graphite commit.
