# RAWR HQ Usage Guide

This guide targets users working inside their personal `RAWR HQ` repo.

## Daily Workflow

1. Pull latest local branch.
2. Run targeted dev tasks.
3. Author plugins/features.
4. Run tests for touched areas.
5. Commit scoped changes.

## Global CLI Setup (Bun)

Use the Bun-global installer from repo root:

```bash
./scripts/dev/install-global-rawr.sh
rawr --version
rawr doctor global --json
```

## Plugin Authoring

- Runtime workspace plugins: use `rawr hq plugins ...` commands.
- External CLI plugins: use `rawr plugins ...` oclif commands.

## Publishing

Before publishing a plugin:
- Run `bun run build`
- Run `bun run test`
- Verify package metadata and docs.

## Upstream Sync

Follow `UPDATING.md` when pulling from `RAWR HQ-Template`.

## Auto-Refresh On Main Updates

Enable shipped hooks once per clone:

```bash
git config core.hooksPath scripts/githooks
```

Then `post-merge` and `post-checkout` refresh dependencies and re-install global `rawr` whenever relevant changes land on `main`.
