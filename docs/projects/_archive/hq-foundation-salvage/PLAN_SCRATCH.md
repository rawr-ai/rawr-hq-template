# Plan: Full Template-Managed Plugin/HQ Promotion Stack (On Top of #61) + Personal Sync

## Summary
1. Build a new promotion stack on top of `codex/hq-foundation-salvage-template` (PR #61) in template repo.
2. Promote all plugin/HQ content that is now locked as template-managed, with full `plugins/agents/hq/**` ownership in template.
3. Keep this run scoped to plugin/HQ domain (not full repo parity sweep), but include all template-managed plugin/HQ deltas from personal.
4. Narrow template-managed manifest to explicit fully-owned paths (remove broad `packages/**` catch-all behavior for personal guard correctness).
5. Merge the template stack via Graphite-only workflow, then sync template main downstream into personal and run convergence checks.

## Decision Locks
1. `plugins/agents/hq/**` is now fully template-managed.
2. Promotion scope for this run is plugin/HQ domain only:
   - `plugins/agents/hq/**`
   - `plugins/cli/plugins/**`
   - plugin/HQ-relevant docs and guard policy files.
3. `packages/dev/**` remains personal-owned.
4. Template-managed manifest must be explicit/narrow to fully-owned package/plugin paths, not broad wildcard ownership.
5. Merge and cleanup must use Graphite workflows only (`gt`), no manual git branch deletion flow.

## Worker-Orchestrated Execution Plan

## Phase 0: Preflight and Branching
1. Use template worktree `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-hq-foundation-salvage-template` as base context.
2. Create child branch on top of `codex/hq-foundation-salvage-template`, e.g.:
   - `codex/hq-template-promotion-phase2-full-hq-port`
3. Confirm clean state:
   - `git status --short`
   - `gt ls`
   - `git worktree list`

## Phase 1: Scratch Docs First (Required)
1. Add/update:
   - `docs/projects/hq-foundation-salvage/PLAN_SCRATCH.md`
   - `docs/projects/hq-foundation-salvage/WORKING_PAD.md`
2. Record:
   - source-of-truth paths from personal repo
   - ownership locks
   - keep/drop rationale per file group
   - conflict decisions as they happen.

## Phase 2: Promotion Matrix (Mechanical, File-Level)
1. Worker generates file matrix between:
   - personal: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`
   - template branch worktree.
2. Matrix scope is only:
   - `plugins/agents/hq/**`
   - `plugins/cli/plugins/**`
   - plugin/HQ-related docs and ownership-policy files:
     - `AGENTS_SPLIT.md`
     - `docs/process/**` (only plugin/HQ ownership and runbook sections touched by this promotion)
     - `docs/system/**` (plugin/HQ ownership sections)
     - `scripts/githooks/template-managed-paths.txt` and guard docs that reference it.
3. Classification values:
   - `PROMOTE` for template-owned plugin/HQ content from personal.
   - `KEEP_TEMPLATE` when template already has newer canonical behavior.
   - `KEEP_PERSONAL` for personal-owned content (`packages/dev/**`, `plugins/cli/devops/**`, local ops overlays).
   - `MERGE_REQUIRED` if both sides have meaningful edits.

## Phase 3: Content Port (Worker Applies Changes)
1. Port full personal `plugins/agents/hq/**` into template branch, preserving already-added salvage skills from #61.
2. Port template-owned deltas in `plugins/cli/plugins/**` from personal only where they are additive/non-regressive against current template baseline.
3. Update HQ package metadata to reflect template ownership posture (not operational-only semantics).
4. Keep command-surface policy normalized:
   - sync/orchestration: `rawr plugins ...`
   - runtime web enablement: `rawr plugins web ...`
5. Do not introduce legacy `rawr hq plugins ...` text.

## Phase 4: Ownership Guard Narrowing (Template Baseline)
1. Update `scripts/githooks/template-managed-paths.txt` in template to explicit, narrow ownership list.
2. Replace broad `packages/**` with explicit package ownership entries for template-owned packages.
3. Include full `plugins/agents/hq/**` as template-managed.
4. Ensure guard docs/routing docs reflect this narrowed contract.

## Phase 5: Slicing and Commits (Graphite)
1. Slice A:
   - ownership/manifest narrowing + docs contract updates.
2. Slice B:
   - full `plugins/agents/hq/**` promotion and reconciliation.
3. Slice C:
   - `plugins/cli/plugins/**` promoted deltas + related tests/docs alignment.
4. Use Graphite commit flow per slice:
   - `gt add -A && gt modify --commit -am "type(scope): summary"`

## Phase 6: Verification in Template
1. Run:
   - `bun install`
   - `bunx turbo run typecheck --filter=@rawr/cli --filter=@rawr/plugin-plugins --filter=@rawr/agent-sync --filter=@rawr/hq`
2. Run targeted tests:
   - `bunx vitest run --project plugin-plugins --project agent-sync --project hq`
   - `bunx vitest run --project cli apps/cli/test/plugins-command-surface-cutover.test.ts apps/cli/test/plugins-status.test.ts apps/cli/test/plugins-sync-drift.test.ts apps/cli/test/plugins-converge-and-doctor.test.ts apps/cli/test/template-managed-guard.test.ts`
3. Run grep gates:
   - no `rawr hq plugins` in changed files
   - no stale dual-surface wording in non-archive docs changed by this stack.

## Phase 7: Submit + Merge Template Stack (Graphite-Only)
1. From top promotion branch:
   - `gt ss --publish --ai --stack --no-interactive`
2. Merge:
   - `gt merge --no-interactive`
3. Drain/cleanup loop:
   - `gt sync --no-restack --force --no-interactive`
   - repeat until merged branches are pruned and stack stabilizes.
4. No manual git branch deletion commands.

## Phase 8: Downstream Sync into Personal (Same Run)
1. In personal repo `main`, create sync branch:
   - `codex/upstream-sync-after-hq-template-promotion`
2. Merge upstream:
   - merge `upstream/main` into that branch
   - resolve with template-wins for template-managed paths.
3. Publish + merge sync branch with Graphite:
   - `gt ss --publish --ai --stack --no-interactive`
   - `gt merge --no-interactive`
   - `gt sync --no-restack --force --no-interactive`
4. Verify personal convergence:
   - `./scripts/dev/activate-global-rawr.sh`
   - `bun run rawr plugins status --checks install --repair --no-fail --json`
   - `bun run rawr plugins sync all --json`
   - `bun run rawr plugins status --checks all --json`
5. Exit criterion:
   - overall status `HEALTHY`.

## Phase 9: Final Hygiene
1. Remove only worktrees created for this promotion run.
2. Confirm clean status in both repos:
   - `git status --short`
   - `gt ls`
   - `git worktree list`
3. Ensure coordination canvas stack remains intact and unaffected.

## Public Interfaces / Contracts Affected
1. Ownership contract:
   - `plugins/agents/hq/**` becomes explicitly template-managed.
2. Guard contract:
   - `scripts/githooks/template-managed-paths.txt` moves to narrow explicit ownership patterns.
3. Documentation contract:
   - plugin/HQ ownership wording in `AGENTS_SPLIT.md`, `docs/process/**`, `docs/system/**` aligns with full HQ template ownership.
4. Command interfaces:
   - no new command API required; command-surface language consistency enforced.

## Test Cases and Scenarios
1. Promotion correctness:
   - all intended `plugins/agents/hq/**` files present in template after merge.
2. Regression guard:
   - template keeps `plugins` convergence/status behavior from current baseline.
3. Legacy surface gate:
   - changed files contain no `rawr hq plugins` references.
4. Guard manifest behavior:
   - template-managed guard classifies full HQ plugin as template-owned.
   - `packages/dev/**` is not falsely treated as template-owned in personal guard policy.
5. Downstream health:
   - personal `plugins status --checks all --json` reports `HEALTHY` after sync.

## Assumptions and Defaults
1. PR #61 (`codex/hq-foundation-salvage-template`) is the parent branch for this promotion stack.
2. Coordination canvas stack remains in flight and must not be restacked/altered by this promotion work.
3. This run is mechanical promotion and ownership normalization, not new architectural redesign.
4. Merge automation uses Graphite non-interactive workflow throughout.
5. If worker encounters ambiguous file-level conflict where “newer canonical” is unclear, it records decision in scratch docs and escalates before applying potentially regressive changes.
