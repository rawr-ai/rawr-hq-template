# Final Disposition (Architecture Stabilization)

## Completed in this slice

1. Template/personal routing docs now explicitly separate operational plugin ownership vs fixture/example ownership.
2. Template plugin manifests now carry role metadata (`rawr.templateRole`, `rawr.channel`, `rawr.publishTier`).
3. Template runtime plugin commands now default to operational visibility and require explicit opt-in for non-operational enablement.
4. Factory plugin scaffold now defaults to local-only (`private: true`) unless `--publish-ready` is passed.
5. Cross-repo workflow runbook added and linked from root routing docs.
6. Global CLI ownership now uses explicit activation (`scripts/dev/activate-global-rawr.sh`) and hook refresh is owner-aware.
7. Pre-push remote safety rails added in both repos.

## Open follow-ups (non-blocking)

1. Decide whether to physically split template fixture plugins into dedicated directories or keep metadata-only role separation.
2. Decide when/if to fully automate cross-repo drift scans in CI.
3. Decide final disposition of historical detached worktree `/private/tmp/rawr-main-verify`.

## Verification expectations

- `gt trunk` must be `main` in both repos.
- Hook safety scripts must pass (`scripts/dev/check-remotes.sh`).
- `rawr doctor global --json` should be healthy in active owner checkout.
- Command-surface invariant remains intact.
