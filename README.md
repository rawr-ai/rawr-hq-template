# RAWR HQ-Template

`RAWR HQ-Template` is the canonical upstream template for building local-first AI headquarters with a single CLI entrypoint (`rawr`).

This template is designed to be used in two roles:
- `RAWR HQ-Template`: shared baseline and upstream for core CLI + architecture.
- `RAWR HQ`: your personal repo created from this template, where you customize and diverge.

## Quickstart

```bash
bun install
bun run test
# Optional quick lanes (skip pretest build)
bun run test:quick
bun run test:web
```

## Narsil Code Intel

This repo should use a dedicated `narsil-mcp` instance as its primary code-intel MCP server.

- Give `rawr-hq-template` its own Narsil instance instead of folding it into an unrelated shared domain index.
- Keep the Narsil index outside the repo; do not commit generated cache or index state.
- Prefer the persistent daemon model with `--persist --git --call-graph --watch --neural`.
- Verify the repo is present in `list_repos`, then use Narsil tools such as `hybrid_search`, `find_symbols`, `find_references`, and `find_call_path`.

Recommended local flow:

```bash
# start a dedicated instance for this repo
narsil-mcp --repos . --git --call-graph --persist --watch --neural
```

Then verify from your MCP client or HTTP transport by confirming the repo appears in `list_repos`, then running a search such as `hybrid_search` or `find_symbols`.

## Nx Graph and Skills

Use the Nx CLI first for workspace graph, routing, generator, and target questions.

If your downstream agent environment installs the official Nx skills, use them as a companion to the CLI rather than as a repo-local source of truth in this template.

Use the Nx CLI first for most workspace graph and target questions:

```bash
bunx nx show projects
bunx nx show project @rawr/server --json
bunx nx graph
```

- Keep Narsil as the primary code-intel MCP for symbol search, references, and call-path work.
- Do not add repo-local `.mcp.json` here.
- Do not treat this template repo as the canonical source for managed global Nx skill installation.
- Nx MCP is intentionally out of scope for the current repo posture. If we bring it back later, it should be as a hosted/managed service rather than per-client local stdio wiring.
- For the integrated agent workflow, see [`docs/process/NX_AGENT_WORKFLOW.md`](docs/process/NX_AGENT_WORKFLOW.md).

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
- [`docs/system/TELEMETRY.md`](docs/system/TELEMETRY.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`UPDATING.md`](UPDATING.md)
