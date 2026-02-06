# R2 Audit: Repo Hygiene + Operational Correctness

Date: 2026-02-06
Audited repos:
- Template: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
- Personal: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

## Checklist

| Item | Status | Notes |
|---|---|---|
| Branch cleanup completeness | PASS (with doc drift) | No `origin/*` branch (excluding `main`) is merged into `origin/main`; deleted-branch set remains absent. Cleanup ledger is stale vs current branch inventory. |
| Graphite cleanliness | FAIL | Graphite stack metadata is clean (`gt ls` => `main` only), but template worktree is not clean due to untracked artifact. |
| Sync health (template <-> personal) | PASS | Personal `upstream/main` matches template `origin/main` (`87fc60c...`), and personal is not behind upstream (`upstream/main...main = 0 8`). |
| Command-surface consistency (`rawr plugins` vs `rawr hq plugins`) | PASS | Runtime and docs consistently separate Channel A (oclif) and Channel B (workspace runtime). No active legacy `rawr plugins enable|disable|status|list` usage found. |
| Publish posture docs alignment | PASS | Docs state local-only default + `private: true` sample plugins; package manifests match current blocked-publish posture. |

## Findings

1. Cleanup ledger drift in remaining-branch section and counts.
- Evidence: `docs/projects/repo-split/CLEANUP_BRANCHES.md:37` lists remaining non-merged branches but omits `02-05-fix_server_load_dist_src_server_entrypoints`.
- Evidence: `docs/projects/repo-split/CLEANUP_BRANCHES.md:56` still reports historical counts (`before 33 / after 17 / deleted 16`) that no longer describe current remote state.
- Impact: Audit artifact can mislead future cleanup checks even though operational branch cleanup is currently healthy.

2. Template worktree is not clean on `main`.
- Evidence: untracked local file `docs/projects/repo-split/CLEANUP_LEGACY_SCAN.md` in template clone.
- Impact: violates repo hygiene for operational commands that assume a clean tree (including Graphite flows during sync/restack/submit).

## Evidence Snapshot

- Branch cleanup operational check:
  - Verified all branches listed under deleted set in `docs/projects/repo-split/CLEANUP_BRANCHES.md:15` are absent on `origin`.
  - Verified no non-`main` `origin/*` branch is ancestor-merged into `origin/main`.
- Graphite state:
  - `gt ls` in template and personal both return only `main`.
- Sync state:
  - Template: `HEAD == origin/main == 87fc60cc3c79512bfef317597782853b590ac75b`.
  - Personal: `HEAD == origin/main == 7ec4d70a684a50e754389a357c8ea2cade78b7a1`.
  - Personal upstream pointer: `upstream/main == 87fc60cc3c79512bfef317597782853b590ac75b`.
- Command surface:
  - Runtime command files exist at `apps/cli/src/commands/hq/plugins/{list,enable,disable,status}.ts`.
  - No legacy runtime files under `apps/cli/src/commands/plugins/{enable,disable,list,status}.ts`.
  - Channel separation documented in `docs/system/PLUGINS.md:7`, `docs/system/PLUGINS.md:17`, `docs/process/AGENT_LOOPS.md:52`, `README.md:21`.
- Publish posture:
  - Local-only + blocked publish posture documented in `docs/system/PLUGINS.md:53`.
  - Plugin packages currently marked private in `plugins/hello/package.json:4`, `plugins/mfe-demo/package.json:4`, `plugins/session-tools/package.json:3`.

## Required Cleanup Actions

1. Resolve template worktree dirtiness for `docs/projects/repo-split/CLEANUP_LEGACY_SCAN.md`:
- Either track and commit it intentionally, or remove it from the local clone.

2. Refresh `docs/projects/repo-split/CLEANUP_BRANCHES.md` to current remote inventory:
- Add missing remaining non-merged branch(es) and regenerate counts.
- Add a timestamped “as-of” note to prevent stale interpretation.

