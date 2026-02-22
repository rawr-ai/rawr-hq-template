# Full Stack Drain + Cross-Repo Green Execution Plan (Graphite-First)

## Summary
This plan drains the template stack from the current top branch lineage, merges it safely, validates template `main`, then integrates into personal `rawr-hq`, validates again, and finally runs plugin sync from personal only.

This is explicitly a **normal Graphite flow** plan (no unusual handling unless a real blocker appears).

## Locked Decisions
1. Use canonical Graphite drain loop from runbooks.
2. Do not reparent or do topology tricks.
3. Include the current top branch chain (including `codex/session-search-index-stabilization-v1`) in the same drain.
4. Run full validation in both repos.
5. Run `rawr plugins sync all` only from personal repo, at the end.
6. No manual `git branch -d/-D` deletes.

## Important Changes or Additions to Public APIs/Interfaces/Types
1. No new public API shape is introduced by this drain process itself.
2. Merging includes already-authored stack changes; notably the session-search branch changes runtime performance behavior for `rawr sessions search` without changing CLI interface shape.

## Phase 0 — Bootstrap (First Action, on Top Branch Worktree)
1. Move to the top-branch worktree:
   - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl`
2. Confirm top branch:
   - `git branch --show-current` (expected `codex/session-search-index-stabilization-v1`)
   - `gt ls`
3. Write canonical execution plan doc **before any merge/sync action**:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/agent-coordination-canvas-v1/STACK_DRAIN_AND_INTEGRATION_EXECUTION_PLAN.md`

## Phase 1 — Template Repo Preflight
Repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template` (run from top-branch worktree)

1. Run:
   - `git status --short`
   - `git branch --show-current`
   - `gt ls`
   - `git worktree list`
2. Confirm target branch exists in this stack:
   - `codex/runbooks-stack-drain-and-template-personal-integration`
3. Baseline safe sync:
   - `gt sync --no-restack`

## Phase 2 — Template Publish + Drain Loop
1. Publish/update PR metadata:
   - `gt ss --publish --ai --stack --no-interactive`
2. Canonical loop (repeat until stable):
   - `gt merge --no-interactive`
   - `gt sync --no-restack --force --no-interactive`
   - `gt ls`
3. Stop condition:
   - Target branch is merged/pruned and no further actionable merge items remain in the chain.

## Phase 3 — Prune/Worktree Handling (Only If Needed)
1. If merged branches are not pruned:
   - `git worktree list`
2. Remove only safe disposable worktrees pinning merged branches.
3. Re-run:
   - `gt sync --no-restack --force --no-interactive`
   - `gt ls`

## Phase 4 — Template Final Verification
1. Verify clean state:
   - `git status --short`
   - `gt ls`
2. Validate template `main`:
   - `git switch main`
   - `git pull --ff-only origin main`
3. Full gates:
   - `bun run build`
   - `bun run test`
4. Post-check:
   - `gt ls`

## Phase 5 — Personal Repo Integration (Template → Personal)
Repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

1. Preflight:
   - `git status --short`
   - `./scripts/dev/check-remotes.sh`
   - `git fetch --all --prune`
   - `git switch main`
   - `git pull --ff-only origin main`
2. Create sync branch:
   - `STAMP="$(date +%Y%m%d-%H%M%S)"`
   - `SYNC_BRANCH="chore/upstream-sync-$STAMP"`
   - `git switch -c "$SYNC_BRANCH"`
3. Merge template upstream:
   - `git fetch upstream --prune`
   - `git merge --no-ff upstream/main`
4. Resolve conflicts by ownership:
   - Template-managed paths keep template intent.
   - Personal overlays keep personal intent where applicable.
5. Restack and validate:
   - `gt sync --no-restack`
   - `gt restack --upstack`
   - `bun run build`
   - `bun run test`
6. Publish/merge sync branch:
   - `gt ss --publish --ai --stack --no-interactive`
   - `gt merge --no-interactive`
   - `gt sync --no-restack --force --no-interactive`
   - `gt ls`

## Phase 6 — Personal Runtime Convergence + Final Plugin Sync
Repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

1. Runtime convergence:
   - `./scripts/dev/activate-global-rawr.sh`
   - `rawr doctor global --json`
   - `rawr plugins status --checks install --repair --no-fail --json`
   - `rawr plugins converge --json`
   - `rawr plugins status --checks all --json`
2. Required final sync from personal:
   - `rawr plugins sync all --dry-run`
   - `rawr plugins sync all`
3. Final health check:
   - `rawr plugins status --checks all --json`

## Conflict and Failure Policy
1. Keep to Graphite commands for stack mutation.
2. No global restack in template unless an actual drift/blocker is proven.
3. If a command blocks, capture exact command + output summary, remediate, and resume loop.
4. If unresolved conflict risk appears high, stop and report blocker immediately rather than forcing history surgery.

## Test Cases and Scenarios
1. Template stack drains with canonical loop and merged branches prune successfully.
2. Template `main` is up to date and passes `build/test`.
3. Personal upstream sync branch merges template changes and passes `build/test`.
4. Personal runtime convergence commands succeed.
5. Personal `rawr plugins sync all` completes and post-sync status is healthy.

## Final Report Requirements
1. What merged (branches and PRs).
2. What remains open and why.
3. PR links.
4. Any blocker/error with exact command and short output summary.
5. Explicit confirmation that no manual git branch deletes were used.

## Explicit Assumptions and Defaults
1. Stack is healthy and does not require topology rewrites.
2. Merge scope is the full mergeable chain from current stack state.
3. Any worktree cleanup is minimal, safe, and only when pruning is blocked.
4. The process is Graphite-first end-to-end in both repos.
