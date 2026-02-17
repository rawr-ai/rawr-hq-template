# Agent B Plan: Repo Split Mechanics + Remote Wiring

Status: Drafted (commands designed, not executed)  
Owner: Agent B  
Canonical reference: `docs/projects/repo-split/IMPLEMENTATION_PLAN.md`

## Scope
- Phase 2 (`rawr-ai/rawr-hq` -> `rawr-ai/rawr-hq-template`, keep public, enforce template, tag baseline)
- Phase 3 (create private `rawr-ai/rawr-hq` from template, local clone layout transition, remote wiring)

## Guardrails
- Do not execute rename/create in this planning pass.
- Treat Phase 1 completion (full stack landed to `main`) as a hard prerequisite.
- Run execution from a clean operator shell/worktree, not from active parallel-agent branches.

## Preflight Checks (No Data Loss Gate)

Run from current local clone path: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

```bash
set -euo pipefail

ORG="rawr-ai"
SOURCE_REPO="rawr-hq"
TEMPLATE_REPO="rawr-hq-template"
PERSONAL_REPO="rawr-hq"
DEV_ROOT="/Users/mateicanavra/Documents/.nosync/DEV"
CURRENT_DIR="$DEV_ROOT/rawr-hq"
TEMPLATE_DIR="$DEV_ROOT/rawr-hq-template"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$DEV_ROOT/.repo-split-backups/$TS"

mkdir -p "$BACKUP_DIR"

cd "$CURRENT_DIR"
git fetch origin --prune --tags
git checkout main
git pull --ff-only origin main

# 1) Ensure Phase 1 landed state is what will be tagged/split.
LANDED_SHA="$(git rev-parse HEAD)"
echo "LANDED_SHA=$LANDED_SHA" | tee "$BACKUP_DIR/landed-sha.txt"

# 2) Ensure local main matches remote main exactly.
git rev-list --left-right --count main...origin/main | tee "$BACKUP_DIR/main-divergence.txt"
# Expect: "0<TAB>0"

# 3) Ensure no uncommitted changes in operator clone.
git status --short | tee "$BACKUP_DIR/git-status.txt"
# Expect: empty output

# 4) Ensure target rename destination does not already exist.
if gh repo view "$ORG/$TEMPLATE_REPO" --json nameWithOwner >/dev/null 2>&1; then
  echo "ERROR: $ORG/$TEMPLATE_REPO already exists" >&2
  exit 1
fi

# 5) Capture GitHub repo state snapshots for rollback comparison.
gh repo view "$ORG/$SOURCE_REPO" \
  --json id,nameWithOwner,url,visibility,isTemplate,defaultBranchRef \
  > "$BACKUP_DIR/repo-view-before.json"
gh api "repos/$ORG/$SOURCE_REPO/rulesets" > "$BACKUP_DIR/rulesets-before.json"
gh api "repos/$ORG/$SOURCE_REPO/branches/main/protection" > "$BACKUP_DIR/main-protection-before.json"

# 6) Create full-fidelity git backup artifacts.
git bundle create "$BACKUP_DIR/$SOURCE_REPO-pre-split.bundle" --all --tags
git clone --mirror "https://github.com/$ORG/$SOURCE_REPO.git" "$BACKUP_DIR/$SOURCE_REPO-pre-split.mirror.git"

# 7) Check token scopes for possible rollback delete.
gh auth status > "$BACKUP_DIR/gh-auth-status.txt"
# If delete rollback may be needed later, ensure delete scope first:
# gh auth refresh -s delete_repo
```

## Phase 2 + 3 Exact Command Sequence (Designed, Not Executed)

### Phase 2: Rename + Template Baseline Tag

```bash
set -euo pipefail

ORG="rawr-ai"
SOURCE_REPO="rawr-hq"
TEMPLATE_REPO="rawr-hq-template"
DEV_ROOT="/Users/mateicanavra/Documents/.nosync/DEV"
CURRENT_DIR="$DEV_ROOT/rawr-hq"
cd "$CURRENT_DIR"

# Re-confirm landed SHA from main at execution time.
git fetch origin --prune --tags
git checkout main
git pull --ff-only origin main
LANDED_SHA="$(git rev-parse HEAD)"

## Checkpoint A (pre-rename): backup artifacts exist and LANDED_SHA recorded.

# A1) Rename repository.
gh repo rename "$TEMPLATE_REPO" --repo "$ORG/$SOURCE_REPO" --yes

# A2) Verify renamed repo exists and retains expected public/template posture.
gh repo view "$ORG/$TEMPLATE_REPO" \
  --json id,nameWithOwner,url,visibility,isTemplate,defaultBranchRef

# A3) Explicitly set template=true (idempotent safety).
gh repo edit "$ORG/$TEMPLATE_REPO" --template

# A4) Update local origin to renamed repo URL.
git remote set-url origin "https://github.com/$ORG/$TEMPLATE_REPO.git"
git fetch origin --prune --tags
git pull --ff-only origin main

# A5) Create and push immutable baseline tag on landed SHA.
if git rev-parse -q --verify "refs/tags/template-baseline-v1" >/dev/null; then
  echo "ERROR: local tag template-baseline-v1 already exists" >&2
  exit 1
fi
git tag -a template-baseline-v1 "$LANDED_SHA" -m "Template baseline v1"
git push origin template-baseline-v1

# A6) Verify tag on remote.
git ls-remote --tags origin "template-baseline-v1"
```

Rollback from Checkpoint A (if Phase 2 must be undone immediately):

```bash
set -euo pipefail
ORG="rawr-ai"

# Rename back to original name.
gh repo rename rawr-hq --repo "$ORG/rawr-hq-template" --yes

# If created, remove baseline tag from remote and local.
git push origin :refs/tags/template-baseline-v1 || true
git tag -d template-baseline-v1 || true

# Restore local origin URL to original repo name.
git remote set-url origin "https://github.com/$ORG/rawr-hq.git"
git fetch origin --prune --tags
```

### Phase 3: Create Personal Repo + Local Clone/Remote Wiring

```bash
set -euo pipefail

ORG="rawr-ai"
TEMPLATE_REPO="rawr-hq-template"
PERSONAL_REPO="rawr-hq"
DEV_ROOT="/Users/mateicanavra/Documents/.nosync/DEV"
CURRENT_DIR="$DEV_ROOT/rawr-hq"
TEMPLATE_DIR="$DEV_ROOT/rawr-hq-template"
PERSONAL_DIR="$DEV_ROOT/rawr-hq"

cd "$CURRENT_DIR"

## Checkpoint B (post-phase-2): rename + template-baseline-v1 verified.

# B1) Create private personal repo from template.
gh repo create "$ORG/$PERSONAL_REPO" \
  --private \
  --template "$ORG/$TEMPLATE_REPO"

# B2) Verify personal repo attributes.
gh repo view "$ORG/$PERSONAL_REPO" \
  --json id,nameWithOwner,url,visibility,isTemplate,templateRepository,defaultBranchRef

# B3) Local directory transition (single-host canonical layout).
cd "$DEV_ROOT"
if [ -e "$TEMPLATE_DIR" ]; then
  echo "ERROR: $TEMPLATE_DIR already exists" >&2
  exit 1
fi
mv "$CURRENT_DIR" "$TEMPLATE_DIR"

# B4) Ensure template clone points at template remote.
git -C "$TEMPLATE_DIR" remote set-url origin "https://github.com/$ORG/$TEMPLATE_REPO.git"
git -C "$TEMPLATE_DIR" remote -v

# B5) Clone personal repo into canonical personal path.
git clone "https://github.com/$ORG/$PERSONAL_REPO.git" "$PERSONAL_DIR"

# B6) Wire remotes in personal clone.
git -C "$PERSONAL_DIR" remote set-url origin "https://github.com/$ORG/$PERSONAL_REPO.git"
if git -C "$PERSONAL_DIR" remote get-url upstream >/dev/null 2>&1; then
  git -C "$PERSONAL_DIR" remote set-url upstream "https://github.com/$ORG/$TEMPLATE_REPO.git"
else
  git -C "$PERSONAL_DIR" remote add upstream "https://github.com/$ORG/$TEMPLATE_REPO.git"
fi

# B7) Verify remotes and connectivity.
git -C "$TEMPLATE_DIR" remote -v
git -C "$PERSONAL_DIR" remote -v
git -C "$PERSONAL_DIR" fetch upstream --prune

# Optional GH default target per clone.
(cd "$TEMPLATE_DIR" && gh repo set-default "$ORG/$TEMPLATE_REPO")
(cd "$PERSONAL_DIR" && gh repo set-default "$ORG/$PERSONAL_REPO")
```

Rollback from Checkpoint B/C:

```bash
set -euo pipefail

ORG="rawr-ai"
DEV_ROOT="/Users/mateicanavra/Documents/.nosync/DEV"
TEMPLATE_DIR="$DEV_ROOT/rawr-hq-template"
PERSONAL_DIR="$DEV_ROOT/rawr-hq"

# C1) If personal repo creation must be undone (requires delete_repo scope).
gh repo delete "$ORG/rawr-hq" --yes

# C2) Rename template repo back to original if full abort is required.
gh repo rename rawr-hq --repo "$ORG/rawr-hq-template" --yes

# C3) Local directory rollback.
rm -rf "$PERSONAL_DIR"
mv "$TEMPLATE_DIR" "$PERSONAL_DIR"
git -C "$PERSONAL_DIR" remote set-url origin "https://github.com/$ORG/rawr-hq.git"
git -C "$PERSONAL_DIR" remote remove upstream || true
```

## Expected Local Directory Transition

Before Phase 3 local move:

```text
/Users/mateicanavra/Documents/.nosync/DEV/
└── rawr-hq/                # existing clone, will become template clone after move
```

After Phase 3 local move + clone:

```text
/Users/mateicanavra/Documents/.nosync/DEV/
├── rawr-hq-template/       # template repo clone
└── rawr-hq/                # personal repo clone
```

Expected remotes after transition:

- Template clone (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`)
  - `origin = https://github.com/rawr-ai/rawr-hq-template.git`
- Personal clone (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`)
  - `origin = https://github.com/rawr-ai/rawr-hq.git`
  - `upstream = https://github.com/rawr-ai/rawr-hq-template.git`

## Risk List + Mitigations

1. Name collision on rename/create (`rawr-hq-template` or new `rawr-hq` already exists).
Mitigation: explicit existence preflight checks with `gh repo view`, hard stop on collision.

2. Tag applied to wrong SHA (not landed `main`).
Mitigation: force `checkout main` + `pull --ff-only`, record `LANDED_SHA`, tag exact SHA, verify with `ls-remote`.

3. Data loss from accidental local deletion or wrong remote rewiring.
Mitigation: create git `bundle` + `--mirror` backup before rename; do not remove original until personal clone succeeds.

4. Rollback blocked by token scope (`delete_repo` missing).
Mitigation: preflight `gh auth status`; if full rollback is required, run `gh auth refresh -s delete_repo` before execution window.

5. Automation/integration breakage due to repo URL/name changes.
Mitigation: capture and diff repo settings/rulesets/protection JSON snapshots; run post-rename connectivity checks before Phase 3.

6. Concurrent agent activity in working clone causes dirty-state failures.
Mitigation: execute cutover from dedicated clean operator clone/worktree only.

7. Personal clone accidentally pushes to template.
Mitigation: enforce remote wiring (`origin` personal, `upstream` template), verify with `git remote -v`, and validate fetch from `upstream`.
