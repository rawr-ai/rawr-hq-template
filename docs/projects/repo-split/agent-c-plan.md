# Agent C Plan: Verification Matrix Runbook

Status: Drafted for execution
Owner: Agent C (verification matrix)
Aligned Plan: `docs/projects/repo-split/IMPLEMENTATION_PLAN.md` (Phase 5 + Phase 6)

## Scope
This runbook covers the verification gates owned by Agent C:
- Workspace plugin flow passes.
- oclif plugin link flow passes.
- Publish dry-run checks pass where applicable.
- Template -> personal upstream sync smoke test passes (personal repo only).
- Template tests green.
- Personal tests green.

Constraints applied:
- Non-destructive validation only.
- No repo rename/create operations.
- Upstream sync smoke runs in a throwaway worktree branch.

## Repo Paths
Use the canonical paths from the implementation plan:

```bash
export TEMPLATE_REPO="/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template"
export PERSONAL_REPO="/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq"
```

## Preflight

Run once before matrix execution:

```bash
set -euo pipefail

for repo in "$TEMPLATE_REPO" "$PERSONAL_REPO"; do
  test -d "$repo"
  test -f "$repo/package.json"
  test -f "$repo/vitest.config.ts"
  test -d "$repo/apps/cli"
  test -d "$repo/plugins"
  echo "[preflight-ok] $repo"
done
```

Pass criteria:
- Both repo directories exist and have monorepo layout.

Fail criteria:
- Missing directory/file in either repo.

## Verification Matrix

### 1) Full Test Gate (Template + Personal)

```bash
set -euo pipefail
for repo in "$TEMPLATE_REPO" "$PERSONAL_REPO"; do
  echo "[tests] $repo"
  (
    cd "$repo"
    bun install
    bun run build
    bun run test
  )
  echo "[tests-ok] $repo"
done
```

Pass criteria:
- `bun run build` exits `0` in both repos.
- `bun run test` exits `0` in both repos.

Fail criteria:
- Any non-zero exit code.

### 2) Workspace Runtime Plugin Flow (Channel B) (Template + Personal)

```bash
set -euo pipefail
for repo in "$TEMPLATE_REPO" "$PERSONAL_REPO"; do
  echo "[workspace-plugin-flow] $repo"
  (
    cd "$repo"

    bun run rawr -- plugins web list --json | node -e '
      const fs=require("node:fs");
      const j=JSON.parse(fs.readFileSync(0,"utf8"));
      if(!j.ok) process.exit(1);
      const ids=(j.data?.plugins||[]).map(p=>p.id);
      if(!ids.includes("@rawr/plugin-hello")) process.exit(2);
    '

    bun run rawr -- plugins web enable hello --json --risk off | node -e '
      const fs=require("node:fs");
      const j=JSON.parse(fs.readFileSync(0,"utf8"));
      if(!j.ok) process.exit(1);
      const enabled=j.data?.state?.plugins?.enabled||[];
      if(!enabled.includes("@rawr/plugin-hello")) process.exit(2);
    '

    bun run rawr -- plugins web status --json | node -e '
      const fs=require("node:fs");
      const j=JSON.parse(fs.readFileSync(0,"utf8"));
      if(!j.ok) process.exit(1);
      const row=(j.data?.plugins||[]).find(p=>p.id==="@rawr/plugin-hello");
      if(!row || row.enabled!==true) process.exit(2);
    '

    bun run rawr -- plugins web disable hello --json | node -e '
      const fs=require("node:fs");
      const j=JSON.parse(fs.readFileSync(0,"utf8"));
      if(!j.ok) process.exit(1);
    '

    bun run rawr -- plugins web status --json | node -e '
      const fs=require("node:fs");
      const j=JSON.parse(fs.readFileSync(0,"utf8"));
      if(!j.ok) process.exit(1);
      const row=(j.data?.plugins||[]).find(p=>p.id==="@rawr/plugin-hello");
      if(!row || row.enabled!==false) process.exit(2);
    '
  )
  echo "[workspace-plugin-flow-ok] $repo"
done
```

Pass criteria:
- JSON response has `ok: true` for each command.
- `@rawr/plugin-hello` toggles enabled -> disabled correctly.

Fail criteria:
- Any non-zero exit code.
- Plugin not listed or state mismatch.

Notes:
- `@rawr/plugin-session-tools is a linked ESM module...` warning may appear on stderr; treat as non-fatal if command exits `0` and JSON assertions pass.

### 3) oclif Plugin Link Flow (Channel A) (Template + Personal)

Use absolute plugin paths because `bun run rawr` executes from `apps/cli`.

```bash
set -euo pipefail
for repo in "$TEMPLATE_REPO" "$PERSONAL_REPO"; do
  echo "[oclif-link-flow] $repo"
  (
    cd "$repo"
    bun run rawr -- plugins link "$repo/plugins/session-tools" --install
    bun run rawr -- plugins inspect @rawr/plugin-session-tools --json | node -e '
      const fs=require("node:fs");
      const j=JSON.parse(fs.readFileSync(0,"utf8"));
      if(!Array.isArray(j) || j.length===0) process.exit(1);
      const commandIDs=j[0].commandIDs||[];
      if(!commandIDs.includes("sessions:list")) process.exit(2);
    '
  )
  echo "[oclif-link-flow-ok] $repo"
done
```

Pass criteria:
- `plugins link` exits `0`.
- `plugins inspect` JSON contains `sessions:list` command id.

Fail criteria:
- Any non-zero exit code.
- Inspect JSON missing expected command id.

### 4) Plugin Publish Dry-Run Checks (Template + Personal)

```bash
set -euo pipefail
for repo in "$TEMPLATE_REPO" "$PERSONAL_REPO"; do
  echo "[publish-dry-run] $repo"
  (
    cd "$repo"
    for pkg in plugins/*; do
      test -f "$pkg/package.json" || continue
      echo "  [pkg] $pkg"

      # Packaging check should always work.
      (cd "$pkg" && npm pack --dry-run >/tmp/agent-c-pack.log)

      # Publish dry-run behavior differs by private/public package state.
      (cd "$pkg" && npm publish --dry-run >/tmp/agent-c-publish.log)

      node -e '
        const fs=require("node:fs");
        const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
        const out=fs.readFileSync("/tmp/agent-c-publish.log","utf8");
        if (p.private===true) {
          if (!out.includes("Skipping workspace")) process.exit(11);
          process.exit(0);
        }
        if (!p.version) process.exit(12);
        if (!p.publishConfig) process.exit(13);
      ' "$pkg/package.json"
    done
  )
  echo "[publish-dry-run-ok] $repo"
done
```

Pass criteria:
- `npm pack --dry-run` exits `0` for each plugin package.
- `npm publish --dry-run` exits `0` for each plugin package.
- For `private: true` plugins: output includes `Skipping workspace ... marked as private`.
- For non-private plugins (if present): `version` and `publishConfig` are present.

Fail criteria:
- Any dry-run command exits non-zero.
- Private plugin does not emit skip signal.
- Non-private plugin missing publish metadata.

### 5) Upstream Sync Smoke (Personal Repo Only)

This validates the Phase 5 gate without mutating `main`.

```bash
set -euo pipefail

cd "$PERSONAL_REPO"
git remote get-url upstream >/dev/null
git fetch upstream

SYNC_BRANCH="repo-split-sync-smoke-$(date +%Y%m%d%H%M%S)"
SYNC_WORKTREE="/tmp/${SYNC_BRANCH}"

# Create throwaway worktree from current personal main.
git worktree add -b "$SYNC_BRANCH" "$SYNC_WORKTREE" origin/main

(
  cd "$SYNC_WORKTREE"

  # Smoke merge only; no commit created.
  git merge --no-ff --no-commit upstream/main

  bun install
  bun run build
  bun run test

  # Always leave throwaway worktree clean.
  git merge --abort || true
)

git worktree remove "$SYNC_WORKTREE" --force
git branch -D "$SYNC_BRANCH"
```

Pass criteria:
- `upstream` remote exists and fetch succeeds.
- `git merge --no-commit upstream/main` exits `0` (no conflict stop).
- Build + test in sync worktree exit `0`.
- Temporary worktree/branch cleanup succeeds.

Fail criteria:
- Missing upstream remote.
- Merge conflict or non-zero merge exit.
- Build/test failure in smoke branch.

## Gate Mapping Back To Implementation Plan
- Phase 5:
  - Workspace plugin flow passes -> Matrix step 2.
  - oclif plugin link flow passes -> Matrix step 3.
  - Publish dry-run checks pass where applicable -> Matrix step 4.
  - Template -> personal upstream sync smoke test passes -> Matrix step 5.
- Phase 6:
  - Template tests green -> Matrix step 1 (template).
  - Personal tests green -> Matrix step 1 (personal).

## Evidence Capture (recommended)
Store command output snapshots under:
- `docs/projects/repo-split/evidence/template/*`
- `docs/projects/repo-split/evidence/personal/*`

At minimum, capture:
- Build/test terminal logs.
- JSON outputs from plugin flow assertions.
- Dry-run outputs per plugin package.
- Upstream sync smoke merge/test log.
