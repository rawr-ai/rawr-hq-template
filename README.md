# RAWR HQ-Template

`RAWR HQ-Template` is the canonical upstream template for building local-first AI headquarters with a single CLI entrypoint (`rawr`).

This template is designed to be used in two roles:
- `RAWR HQ-Template`: shared baseline and upstream for core CLI + architecture.
- `RAWR HQ`: your personal repo created from this template, where you customize and diverge.

## Quickstart

```bash
bun install
bun run test
# Optional deeper coverage (CLI-heavy + Playwright visual)
bun run test:heavy
```

## Core vs Extensions

- Core lives in this template (`apps/cli`, `packages/core`, `packages/control-plane`, `packages/state`, `packages/security`, `packages/journal`).
- Template plugins are fixture/example baseline artifacts.
- Operational plugin authoring should usually happen in personal `RAWR HQ`.

Two plugin channels are intentionally separate:
- Channel A: external oclif plugins (`rawr plugins install|link|update|...`).
- Channel B: RAWR HQ workspace runtime plugins (`rawr plugins web list|enable|disable|status`).

## Local-Only vs Connected

- Local-only (default): build and run everything from your repo without a registry dependency.
- Connected (opt-in): install external CLI plugins from npm/GitHub and sync from upstream template.

## Contribution Boundaries

- Core changes intended for all users should go upstream to `RAWR HQ-Template`.
- Personal/project-specific behavior should stay in `RAWR HQ` plugins unless intentionally promoted.
- CLI publishing ownership remains template-only.

## Agent Routing

- If you are deciding where to implement a change, use [`AGENTS_SPLIT.md`](AGENTS_SPLIT.md).
- Template-side contribution rules are defined in [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Personal-repo sync expectations are defined in [`UPDATING.md`](UPDATING.md).

## Operational Runbooks

- Upstream sync workflow: [`docs/process/UPSTREAM_SYNC_RUNBOOK.md`](docs/process/UPSTREAM_SYNC_RUNBOOK.md)
- Cross-repo workflows: [`docs/process/CROSS_REPO_WORKFLOWS.md`](docs/process/CROSS_REPO_WORKFLOWS.md)
- Plugin E2E workflow: [`docs/process/PLUGIN_E2E_WORKFLOW.md`](docs/process/PLUGIN_E2E_WORKFLOW.md)
- Graphite workflow: [`docs/process/GRAPHITE.md`](docs/process/GRAPHITE.md)

## Canonical Docs

- [`docs/SYSTEM.md`](docs/SYSTEM.md)
- [`docs/PROCESS.md`](docs/PROCESS.md)
- [`docs/PRODUCT.md`](docs/PRODUCT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/DOCS.md`](docs/DOCS.md)
- [`docs/system/PLUGINS.md`](docs/system/PLUGINS.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`UPDATING.md`](UPDATING.md)
