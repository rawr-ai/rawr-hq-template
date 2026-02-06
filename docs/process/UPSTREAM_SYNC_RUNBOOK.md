# Upstream Sync Runbook

Use this playbook to sync `RAWR HQ` with `RAWR HQ-Template` safely.

## Repo Topologies

- Personal repo (`RAWR HQ`):
  - `origin=https://github.com/rawr-ai/rawr-hq.git`
  - `upstream=https://github.com/rawr-ai/rawr-hq-template.git`
- Template repo (`RAWR HQ-Template`):
  - `origin=https://github.com/rawr-ai/rawr-hq-template.git`

## 1) Remote Setup (Exact)

### Personal `RAWR HQ` (one-time hardening)

```bash
git remote set-url origin https://github.com/rawr-ai/rawr-hq.git
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream https://github.com/rawr-ai/rawr-hq-template.git
git remote set-url upstream https://github.com/rawr-ai/rawr-hq-template.git
git fetch origin --prune
git fetch upstream --prune
git remote -v
```

### `RAWR HQ-Template` (one-time hardening)

```bash
git remote set-url origin https://github.com/rawr-ai/rawr-hq-template.git
git fetch origin --prune
git remote -v
```

## 2) Preflight Gates (Run Every Sync)

```bash
git status --short
git remote -v
git fetch --all --prune
git switch main
git pull --ff-only origin main
git branch --show-current
gt trunk
```

Expected:
- clean working tree,
- `main` checked out,
- Graphite trunk is `main`.

## 3) Default Path: Merge-Based Sync (`RAWR HQ`)

```bash
STAMP="$(date +%Y%m%d-%H%M%S)"
SYNC_BRANCH="chore/upstream-sync-$STAMP"
BACKUP_BRANCH="backup/pre-sync-$STAMP"

git switch main
git pull --ff-only origin main
git branch "$BACKUP_BRANCH"
git switch -c "$SYNC_BRANCH"
git fetch upstream --prune
git merge --no-ff upstream/main
```

If conflicts occur, use [Conflict Handling](#5-conflict-handling).

After merge resolves:

```bash
gt sync --no-restack
gt restack --upstack
bun run build
bun run test
git push -u origin "$SYNC_BRANCH"
```

Then integrate via PR into `main` (preferred for protected branches).

## 4) Variant: Rebase Sync (`RAWR HQ`, Low Divergence Only)

```bash
STAMP="$(date +%Y%m%d-%H%M%S)"
SYNC_BRANCH="chore/upstream-sync-rebase-$STAMP"
BACKUP_BRANCH="backup/pre-sync-$STAMP"

git switch main
git pull --ff-only origin main
git branch "$BACKUP_BRANCH"
git switch -c "$SYNC_BRANCH"
git fetch upstream --prune
git rebase upstream/main
```

If conflicts occur, use [Conflict Handling](#5-conflict-handling).

After rebase resolves:

```bash
gt sync --no-restack
gt restack --upstack
bun run build
bun run test
git push --force-with-lease -u origin "$SYNC_BRANCH"
```

Use merge path by default; use rebase only when divergence is small and branch protections allow the resulting workflow.

## 5) Conflict Handling

### Merge conflicts

```bash
git status
git diff --name-only --diff-filter=U
# resolve files
git add <resolved-files>
git commit
```

Abort merge if needed:

```bash
git merge --abort
```

### Rebase conflicts

```bash
git status
git rebase --show-current-patch
git diff --name-only --diff-filter=U
# resolve files
git add <resolved-files>
git rebase --continue
```

Abort rebase if needed:

```bash
git rebase --abort
```

Conflict policy:
- Accept upstream defaults in shared core (`apps/cli`, shared `packages/*`) unless intentionally forked.
- Preserve personal intent in local/plugin customizations.
- Keep command-channel policy intact:
  - Channel A (external CLI plugins): `rawr plugins ...`
  - Channel B (workspace runtime plugins): `rawr hq plugins ...`

## 6) Rollback And Recovery

### Local rollback

If sync is not pushed:

```bash
git switch main
git reset --hard "$BACKUP_BRANCH"
```

If you need to locate a safe point:

```bash
git reflog --date=iso
```

### Remote recovery

If a bad sync branch was pushed, recover with a new branch and PR:

```bash
GOOD_COMMIT="<known-good-commit>"
RECOVERY_BRANCH="recovery/main-$STAMP"
git switch -c "$RECOVERY_BRANCH" "$GOOD_COMMIT"
git push -u origin "$RECOVERY_BRANCH"
```

Avoid direct force-push to protected `main`.

## 7) Verification Gates (Required)

Run before requesting review or merge:

```bash
git remote -v
git branch --show-current
gt trunk
gt ls
bun run build
bun run test
```

All gates must pass.

## 8) Graphite Expectations

- Trunk is `main`.
- Use Graphite-first stack safety commands:
  - `gt sync --no-restack`
  - `gt restack --upstack`
- Avoid ad-hoc history rewrites on Graphite-managed branches.

## 9) Gotchas

- Personal vs template divergence: keep personal-only behavior isolated so upstream merges stay mechanical.
- Protected branches: `main` may block force-push; use sync/recovery branches + PR instead.
- Command-channel drift: never swap `rawr plugins ...` and `rawr hq plugins ...` in docs or scripts.
