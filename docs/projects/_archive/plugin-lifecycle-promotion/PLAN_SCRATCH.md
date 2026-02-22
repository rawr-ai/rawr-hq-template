# Plugin Lifecycle Promotion Plan (Template-Owned Core, Personal-Owned Runtime)

## Summary
- Promote plugin lifecycle core work from personal HQ into template HQ as the source of truth.
- Execute on an isolated Graphite stack/worktree so the active coordination/canvas stack is not disrupted.
- Split the work into small slices (core code, docs, guard coverage) and merge template first.
- Sync template main into personal main next, then converge install/sync state in personal runtime.
- Close the ownership gap by making template-managed path classification explicit and enforceable via guard modes.

## Guardrails
1. Treat the other agent’s active coordination/canvas stack as read-only until they finish.
2. Use only a new `codex/...` stack created from template `main`; avoid touching foreign branches.
3. During this work, avoid cross-stack restacks; use `gt sync --no-restack` whenever sync is needed.
4. Merge our stack first; only then restack/resolve any remaining foreign stack conflicts if needed.

## Phase 0: Scratch Docs First
1. In template worktree, create and maintain:
- `docs/projects/plugin-lifecycle-promotion/PLAN_SCRATCH.md`
- `docs/projects/plugin-lifecycle-promotion/WORKING_PAD.md`
2. In personal repo (for downstream phase), create and maintain:
- `docs/projects/plugin-lifecycle-promotion/PERSONAL_SYNC_SCRATCH.md`
- `docs/projects/plugin-lifecycle-promotion/PERSONAL_WORKING_PAD.md`
3. `PLAN_SCRATCH.md` includes the full execution plan plus `## Implementation Decisions`.
4. `WORKING_PAD.md` holds ongoing notes, command outputs, and conflict-resolution breadcrumbs.

## Phase 1: Promotion Matrix (File-Level Ownership)
1. Build a matrix from personal lifecycle commits (starting with `0d5f81d` and related lifecycle commits).
2. Classify every touched file as one of:
- `PROMOTE_TO_TEMPLATE`
- `KEEP_PERSONAL`
- `SPLIT_REQUIRED`
3. Locked ownership mapping for this plan:
- Promote: `apps/cli/**`, `plugins/cli/plugins/**`, lifecycle-relevant `docs/process/**`, and any shared package/runtime support paths.
- Keep personal: personal-only scratch/project notes and local operational overlays.
- Split explicitly: `plugins/agents/hq/**` so lifecycle/system-management content is template-managed while personal operator content remains personal.

## Phase 2: Template Stack Slices (Small, Mergeable)
1. Slice A: Promote lifecycle command/runtime code and tests into template.
2. Slice B: Promote lifecycle docs/runbooks and update command policy references.
3. Slice C: Harden template-managed guard coverage and ownership manifest semantics for lifecycle areas.
4. Slice D: Add/adjust tests for guard modes and ownership classification behavior.
5. Each slice is committed independently in Graphite to keep PRs small and reviewable.

## Phase 3: Template Verification
1. Run install and required checks in template worktree (`bun install`, targeted typecheck/tests, then required broader checks).
2. Verify lifecycle commands load and behave correctly on template branch.
3. Verify guard mode behavior is deterministic for `off`, `warn`, and `block`.
4. Confirm no unintended path drift beyond the slice scope.

## Phase 4: Template Publish + Merge
1. Submit stack with AI bodies from top slice: `gt ss --publish --ai --stack --no-interactive`.
2. Merge stack: `gt merge --no-interactive`.
3. Cleanup/sync loop: `gt sync --restack --force --no-interactive` until merged branches are pruned and stack is stable.
4. Validate template `main` post-merge with the same required checks.

## Phase 5: Personal Sync-First Integration
1. Create upstream-sync branch in personal repo from `main`.
2. Merge template `main` into personal first (template-wins for template-managed paths).
3. Resolve conflicts using ownership contract from Phase 1.
4. Restack personal branches only after this sync baseline is clean.

## Phase 6: Personal Runtime Convergence
1. Verify active owner is personal HQ.
2. Run convergence flow:
- `rawr plugins status --checks install --repair --no-fail --json`
- `rawr plugins sync all --json`
- `rawr plugins status --checks all --json`
3. Exit criterion: overall health reports synchronized/converged state.

## Phase 7: Foreign Stack Follow-Through (After They Finish)
1. Re-open stack graph once the other agent is done.
2. Restack/resolve foreign stack only if required by newly merged template baseline.
3. Merge remaining branches in order with minimal churn.

## Public Interfaces / Types
1. Lifecycle command surface becomes template-baseline, not personal-only drift.
2. Template-managed guard remains mode-based with `off|warn|block`.
3. Ownership manifest becomes authoritative for template-managed vs personal-managed paths.
4. Cross-repo process docs are updated to reflect “template owns core, personal owns runtime installation.”

## Test Cases and Scenarios
1. Lifecycle commands pass in template branch and template `main` after merge.
2. Guard mode behavior in personal repo:
- `off`: no warning/block
- `warn`: warning only, commit allowed
- `block`: commit fails with remediation guidance
3. Lifecycle-relevant `plugins/agents/hq/**` coverage is no longer a blind spot.
4. Template-to-personal sync merges cleanly with ownership-consistent conflict resolution.
5. Final personal convergence check returns healthy state after repair + sync.

## Assumptions and Defaults
1. The coordination/canvas stack remains active during this work and must not be disturbed.
2. We keep this work isolated on our own stack/worktree until our stack is merged.
3. Lifecycle core is template-owned; personal is the canonical runtime install/sync surface.
4. Default guard policy remains `warn` for general users; your local default can remain `block`.
5. Any `SPLIT_REQUIRED` file is resolved in this same stack before merge (no silent deferral).

## Implementation Decisions
- Decision: keep guard matcher simple (exact paths + `/**` prefixes) and encode lifecycle split with explicit manifest paths.
  - Rationale: avoids broad over-blocking while removing known blind spots for lifecycle policy/workflow content.
- Decision: do not copy personal `docs/projects/plugin-lifecycle-quality/scratch/**` into template.
  - Rationale: these are process artifacts, not template baseline behavior.
- Decision: extract guard mode/path matching into a pure helper module and test it directly.
  - Rationale: preserves existing hook behavior while making `off|warn|block` and path-split coverage deterministic under tests.
- Decision: keep template fixture expectations in CLI tests (no default operational plugins, `plugins` sync ref).
  - Rationale: personal-HQ defaults (`@rawr/plugin-dev`, `tools` alias) are instance-specific and would regress template baseline tests.
