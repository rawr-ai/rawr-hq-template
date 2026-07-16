# RAWR HQ Usage Guide

This guide targets maintainers working inside `RAWR HQ-Template`.

## Daily Workflow

1. Pull latest local branch.
2. Run the local HQ runtime and targeted dev tasks as needed:
   - use `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md` for `rawr hq up|down|status|restart|attach`, browser behavior, and runtime checks
   - use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` before relying on quarantined telemetry proof docs
3. Maintain shared core/template contracts.
4. Run tests for touched areas:
   - `bun run test` for the fast default gate.
   - `bun run test:web` when touching the web-only lane (without the pretest build gate).
5. Commit scoped changes.
6. For stack drains or cross-repository interface acceptance, follow
   `docs/process/HQ_OPERATIONS.md` and `docs/process/CROSS_REPO_WORKFLOWS.md`.

## Installed Controller Setup

Materialize and select an immutable controller release from a clean Template
revision:

```bash
./scripts/dev/install-global-rawr.sh
rawr --version
rawr doctor global --json
```

Mode contract:
- The global shim points to one stable Template-owned launcher under the controller
  data root, never a checkout.
- `install-global-rawr.sh` builds, verifies, installs, and selects a release.
- `activate-global-rawr.sh <digest>` selects an already installed verified release;
  it does not build from source.
- A checkout, hook, alias, or Oclif link cannot become controller identity.

## Plugin Boundaries

- Template fixtures validate controller and generic lifecycle behavior; they are not
  personal curated content.
- External Oclif extension management uses `rawr plugins ...` only.
- Curated agent-plugin source and records live in personal `RAWR HQ`; their
  lifecycle uses `rawr agent plugins ...` only.
- App composition consumes explicit outputs and never repairs or rewrites lifecycle state.

## Publishing

Before publishing a plugin:
- Run `bun run build`
- Run `bun run test`
- Run `bun run test:web` if the change affects the web-only lane
- Verify package metadata and docs.

Personal content publication is independent and consumes only published versioned
interfaces or immutable artifacts. Follow `UPDATING.md` for interface updates.

## Auto-Refresh On Main Updates

Enable shipped hooks once per clone:

```bash
git config core.hooksPath scripts/githooks
```

Then `post-merge` and `post-checkout` may refresh repository dependencies. They do
not build, activate, or relink the installed controller.
