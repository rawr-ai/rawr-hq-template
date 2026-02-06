# RAWR HQ Usage Guide

This guide targets maintainers working inside `RAWR HQ-Template`.

## Daily Workflow

1. Pull latest local branch.
2. Run targeted dev tasks.
3. Maintain shared core/template contracts.
4. Run tests for touched areas.
5. Commit scoped changes.

## Global CLI Setup (Bun)

Activate this checkout as the explicit global `rawr` owner:

```bash
./scripts/dev/activate-global-rawr.sh
rawr --version
rawr doctor global --json
```

Mode contract:
- Canonical local-global mode is Bun-bin symlink install via `scripts/dev/install-global-rawr.sh`.
- Do not depend on `bun link --global @rawr/cli` for this monorepo shape; workspace dependencies are not a reliable Bun-global package install target.
- Re-run the activation script in the checkout you want global `rawr` to target.

## Plugin Authoring

- Template `plugins/*` are fixture/example packages for baseline validation and demos.
- Operational plugin authoring belongs in downstream personal `RAWR HQ` repos.
- Runtime workspace commands: `rawr hq plugins ...`
- External oclif plugin manager: `rawr plugins ...`

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

Then `post-merge` and `post-checkout` refresh dependencies and global wiring only when this checkout is the active owner.
