# Plan: True Single-Surface Cutover + Template->Personal Integration to "Perfect"

## Summary
1. No functional runtime capability is lost by removing `rawr hq plugins ...` and keeping `rawr plugins web ...` as canonical. The implementations are equivalent for `list|enable|disable|status`, and `plugins web enable all` is already a superset.
2. The only intentional break is command-path compatibility: old `rawr hq plugins ...` calls will fail after cutover.
3. The reason this was not removed earlier was scope/policy, not trepidation: template and personal docs currently encode a dual-surface invariant, and the initial transition slices prioritized architecture relocation + convergence engine first.
4. We will do a hard single-surface cutover now, update all non-archive docs/tests, publish and merge the template transition stack, then do personal sync-first integration and leave Plugin Lifecycle as top draft.

## Public API / Interface Changes
1. Remove legacy command family entirely: `rawr hq plugins list|enable|disable|status`.
2. Canonical runtime surface becomes only: `rawr plugins web list|enable|disable|status|enable all`.
3. Keep oclif external manager verbs unchanged: `rawr plugins install|link|inspect|reset|uninstall|update`.
4. Keep convergence surface unchanged: `rawr plugins sync ...` and `rawr plugins status ...`.
5. Update command-policy docs from "Channel A vs Channel B commands" to "single command surface with runtime subtopic under `plugins web`".

## Decision Locks
1. Cutover strictness: hard remove old `hq plugins` commands now.
2. Docs scope: update all non-archive docs; keep archive historical.
3. Template merge scope: merge our transition stack first; leave unrelated non-load-bearing template stacks for owner agents.
4. Personal integration ordering: sync from template first, then restack/resolve personal branches.
5. Plugin Lifecycle handling: keep as top draft branch after restack/conflict resolution; merge everything below it.

## Phase 0: First Action (Scratch Docs)
1. In template worktree, write full plan immediately before any code change:
   Path: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix/docs/projects/template-core-transition/SINGLE_SURFACE_CUTOVER_AND_INTEGRATION_SCRATCH.md`
2. In the same location, maintain working notes:
   Path: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix/docs/projects/template-core-transition/WORKING_PAD.md`
3. When switching to personal integration, mirror progress updates into:
   Path: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-dev-codex-dev-plugin-lifecycle-quality-phase1-scratch-docs/docs/projects/plugin-lifecycle-quality/TEMPLATE_OWNED_CORE_PERSONAL_INSTALL_TRANSITION_SCRATCH.md`
   Path: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-dev-codex-dev-plugin-lifecycle-quality-phase1-scratch-docs/docs/projects/plugin-lifecycle-quality/IMPLEMENTATION_SCRATCHPAD.md`

## Phase 1: Template Slice -- Single-Surface Hard Cutover
1. Create branch above current template top:
   `codex/template-owned-core-transition-phase4-single-surface-cutover` from `codex/template-owned-core-transition-phase3-template-managed-guard`.
2. Remove runtime legacy command files:
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix/apps/cli/src/commands/hq/plugins/list.ts`
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix/apps/cli/src/commands/hq/plugins/enable.ts`
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix/apps/cli/src/commands/hq/plugins/disable.ts`
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-codex/template-owned-core-transition-phase1-matrix/apps/cli/src/commands/hq/plugins/status.ts`
3. Update all non-archive command references in template repo from `rawr hq plugins ...` to `rawr plugins web ...`.
4. Update tests that currently validate `hq plugins` behavior to validate `plugins web` behavior, and add explicit "legacy command removed" assertions.
5. Update app/user-facing hints still showing old command examples.
6. Keep `_archive` untouched except existing archive-intent notes.

## Phase 2: Template Verification for Cutover
1. Run install: `bun install`.
2. Run targeted typecheck:
   `bunx turbo run typecheck --filter=@rawr/cli --filter=@rawr/plugin-plugins --filter=@rawr/agent-sync --filter=@rawr/control-plane`.
3. Run targeted tests:
   `bunx vitest run --project cli apps/cli/test/stubs.test.ts apps/cli/test/plugins-command-surface-cutover.test.ts apps/cli/test/plugins-status.test.ts apps/cli/test/plugins-sync-drift.test.ts`
   `bunx vitest run --project plugin-plugins --project agent-sync --project control-plane`
4. Run grep gates (non-archive only) to ensure no active `rawr hq plugins` references remain.

## Phase 3: Template Publish + Merge
1. Publish the full transition stack with AI bodies from top branch:
   `gt ss --publish --ai --stack --no-interactive`
2. Merge trunk->current for this stack:
   `gt merge --no-interactive`
3. Run cleanup/sync loop as requested:
   `gt sync --restack --force --no-interactive`
   Repeat until merged branches are deleted/clean and stack view stabilizes.
4. Validate on template `main` after merge:
   `git switch main && git pull --ff-only origin main`
   Then rerun target checks from Phase 2.

## Phase 4: Template "Other Stacks" Classification Rule
1. Treat PRs `#43-#48` as non-load-bearing for this pass unless they modify plugin-management core behavior.
2. Current evidence classifies them as non-load-bearing (coordination canvas + agent skill foundation), so they remain open for owner-agent adaptation after this merge.
3. If new conflicts prove they are load-bearing to plugin-core during merge attempt, reclassify and integrate before declaring template side done.

## Phase 5: Personal Repo Preflight + Cleanup
1. Remove untracked leftovers in personal main as requested:
   `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/.claude/`
   `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/docs/plans/PLUGINS_PLUGIN_STRUCTURE.md`
   `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/plugin-frontmatter-audit.md`
2. Confirm remotes and trunk:
   `origin=rawr-hq`, `upstream=rawr-hq-template`, `gt trunk -> main`.
3. Ensure clean working tree before upstream sync.

## Phase 6: Personal Integration Strategy (Sync First)
1. Create personal upstream sync branch from `main` per runbook.
2. Merge `upstream/main` into personal sync branch first.
3. Resolve conflicts with ownership policy:
   template-owned core paths take upstream;
   personal operational overlays keep downstream intent.
4. Run:
   `gt sync --no-restack`
   `gt restack --upstack`
5. This is the locked strategy because it avoids replaying already-promoted core changes and minimizes duplicated conflict churn.

## Phase 7: Personal Stack Normalization + Plugin Lifecycle Placement
1. Wait until the other responsible agent finishes producing one linear personal stack.
2. Move Plugin Lifecycle branch to top of that stack:
   `gt move --source codex/dev-plugin-lifecycle-quality-system --onto <current-top-branch> --no-interactive`
3. Restack and resolve conflicts there.
4. Keep Plugin Lifecycle PR as draft:
   `gh pr ready 96 --repo rawr-ai/rawr-hq --undo`
5. Publish/merge everything below it (as appropriate) with Graphite from the highest mergeable branch below that top draft.

## Phase 8: Personal Merge and Branch Cleanup
1. Publish stack PR metadata with AI where needed:
   `gt ss --publish --ai --stack --no-interactive`
2. Merge below-top branches:
   `gt merge --no-interactive`
3. Cleanup loop:
   `gt sync --restack --force --no-interactive`
   Repeat until merged branches are pruned and only intended draft branch remains.

## Phase 9: "Perfect" Convergence Flow (Personal Runtime)
1. Activate personal owner:
   `./scripts/dev/activate-global-rawr.sh`
2. Run global check:
   `rawr doctor global --json`
3. Repair install drift:
   `rawr plugins status --checks install --repair --no-fail --json`
4. Full sync/install converge:
   `rawr plugins sync all --json`
5. Final health gate:
   `rawr plugins status --checks all --json`
6. Exit criterion: overall status is `HEALTHY`.

## Phase 10: Guard Defaults for You
1. Set your personal repo to block template-managed edits by default:
   `git config rawr.templateGuardMode block`
2. Optional owner-scoped default:
   `git config rawr.templateGuardOwnerEmail tools@matei.work`
   `git config rawr.templateGuardOwnerMode block`

## Test Cases and Scenarios
1. Legacy removal:
   `rawr hq plugins list` fails non-zero with unknown/removed command.
2. Runtime parity:
   `rawr plugins web list|enable|disable|status --json` behaves as previous runtime flow.
3. Runtime bulk enable:
   `rawr plugins web enable all --json --dry-run` returns planned operations.
4. Convergence:
   `rawr plugins sync all` followed by `rawr plugins status --checks all` returns `HEALTHY`.
5. Guard modes:
   `off` no output/block; `warn` output + exit 0; `block` output + exit 1.
6. Sync-first integration:
   personal upstream merge + restack completes; below-top branches merge cleanly; top Plugin Lifecycle remains draft.

## Assumptions and Defaults
1. Single-surface means command path unification under `rawr plugins ...`; runtime semantics remain.
2. All non-archive docs are updated; `_archive` remains historical.
3. Template unrelated stacks are left open unless proven load-bearing to plugin-core.
4. Personal final state for this pass is: `main` clean plus one top draft (Plugin Lifecycle) by design.
5. Full "perfect" state includes both content sync and install/link convergence, not just passing tests.
