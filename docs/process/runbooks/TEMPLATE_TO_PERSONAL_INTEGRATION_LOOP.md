# Template to Personal Integration Loop

Use this runbook to land shared changes in `RAWR HQ-Template`, then integrate them into downstream `RAWR HQ` with sync-first sequencing.

## Scope

- Template-owned core and plugin-management surfaces.
- Downstream personal sync branch integration.
- Post-sync stack + runtime convergence checks.

## Ownership invariant

- Template owns shared core behavior.
- Personal owns operational overlays.
- During conflicts on template-managed paths, keep template intent.

See `docs/process/CROSS_REPO_WORKFLOWS.md` for the ownership model.

## Phase 1: Land template stack first (`rawr-hq-template`)

1. Preflight:
```bash
git status --short
gt ls
gt sync --no-restack
```
2. Publish and merge stack:
```bash
gt ss --publish --ai --stack --no-interactive
gt merge --no-interactive
```
3. Drain/prune until stable:
```bash
gt sync --no-restack --force --no-interactive
gt ls
```
4. Validate template `main`:
```bash
git switch main
git pull --ff-only origin main
bun run build
bun run test
```

## Phase 2: Sync template into personal (`rawr-hq`)

1. Preflight:
```bash
git status --short
./scripts/dev/check-remotes.sh
git fetch --all --prune
git switch main
git pull --ff-only origin main
```
2. Create sync branch:
```bash
STAMP="$(date +%Y%m%d-%H%M%S)"
SYNC_BRANCH="chore/upstream-sync-$STAMP"
git switch -c "$SYNC_BRANCH"
```
3. Merge template upstream:
```bash
git fetch upstream --prune
git merge --no-ff upstream/main
```
4. Resolve conflicts with ownership rules, then run:
```bash
gt sync --no-restack
gt restack --upstack
bun run build
bun run test
```
5. Publish/merge sync branch:
```bash
gt ss --publish --ai --stack --no-interactive
gt merge --no-interactive
gt sync --no-restack --force --no-interactive
```

## Phase 3: Restack remaining personal branches

```bash
gt sync --no-restack
gt restack --upstack
gt ls
```

If branches remain open/mergeable, continue with `docs/process/runbooks/STACK_DRAIN_LOOP.md`.

## Phase 4: Runtime convergence gate (`rawr-hq`)

```bash
./scripts/dev/activate-global-rawr.sh
rawr doctor global --json
rawr plugins status --checks install --repair --no-fail --json
rawr plugins converge --json
rawr plugins status --checks all --json
```

## Failure and recovery

1. Sync merge conflict is too large/noisy:
- Abort and restart from a fresh sync branch:
```bash
git merge --abort
git switch main
git branch -D "$SYNC_BRANCH"
```

2. Wrong remote topology during sync:
- Fix remotes first, then restart preflight:
```bash
./scripts/dev/check-remotes.sh
```

3. Post-sync stack drift:
- Restack and drain with canonical loops:
```bash
gt sync --no-restack
gt restack --upstack
gt ls
```

## Exit criteria

- Template stack is merged and pruned.
- Personal sync branch is merged.
- Personal open stacks are restacked on updated `main`.
- Plugin/runtime convergence checks are healthy.
