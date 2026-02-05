# RAWR HQ Usage Guide

This guide targets users working inside their personal `RAWR HQ` repo.

## Daily Workflow

1. Pull latest local branch.
2. Run targeted dev tasks.
3. Author plugins/features.
4. Run tests for touched areas.
5. Commit scoped changes.

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

