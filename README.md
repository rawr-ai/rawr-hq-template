# Habitat Platform

This repository owns the Habitat platform: core SDK, runtime realization,
foundational Oclif/Nx CLI, architecture law, and reusable platform capabilities.
`RAWR HQ-Template` is a legacy remote locator, not the platform's semantic name.

Rawr is the first downstream product built on Habitat. Its private app, domain
services, resources, plugins, and CLI topics remain co-located only during
extraction. Marketplace (legacy remote `RAWR HQ`) is a separate curated-content
repository that owns agent-plugin source, provenance, policy/evaluation inputs,
and governed content lifecycle records. Neither downstream owner inherits,
mirrors, or merges Habitat implementation.

## Quickstart

```bash
bun install
bun run test
# Optional project-focused lane
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

If your agent environment installs the official Nx skills, use them as a companion
to the CLI rather than as a repo-local source of truth in this repository.

Use the Nx CLI first for most workspace graph and target questions:

```bash
bunx nx show projects
bunx nx show project @habitat-ai/cli --json
bunx nx graph
```

- Keep Narsil as the primary code-intel MCP for symbol search, references, and call-path work.
- Do not add repo-local `.mcp.json` here.
- Do not treat this Habitat repository as the canonical source for managed global Nx skill installation.
- Nx MCP is intentionally out of scope for the current repo posture. If we bring it back later, it should be as a hosted/managed service rather than per-client local stdio wiring.
- For the integrated agent workflow, see [`docs/process/NX_AGENT_WORKFLOW.md`](docs/process/NX_AGENT_WORKFLOW.md).

## Authority Boundaries

- Habitat owns the foundational Oclif/Nx CLI, core runtime, generic adapters,
  schemas/tooling implementations, validators, reusable platform law, and the
  generic agent-plugin lifecycle.
- Rawr owns its private app, selected product topics, and domain services.
- External Oclif extensions are managed only by `habitat plugins ...`.
- Curated agent-plugin lifecycle is currently managed only by
  `rawr agent plugins ...`. Its accepted Habitat command destination is a
  migration target, not current operator guidance.
- Marketplace curated content enters through explicit versioned data or ordinary
  package/artifact interfaces. A repository path is only a locator.
- App composition consumes declared outputs; it does not own lifecycle state.

## Contribution Boundaries

- Reusable platform machinery and law belong to Habitat.
- Rawr product behavior belongs to Rawr owners, even while co-located here.
- Curated agent content and governed content records belong in Marketplace.
- A concept may be reimplemented intentionally on either side of a published
  interface, but code is never copied or synchronized between repositories.

## Agent Routing

- If you are deciding where to implement a change, use [`AGENTS_SPLIT.md`](AGENTS_SPLIT.md).
- Repository contribution rules are defined in [`CONTRIBUTING.md`](CONTRIBUTING.md).
- CLI and interface update rules are defined in [`UPDATING.md`](UPDATING.md).

## Operational Runbooks

- Repository separation and artifact interfaces: [`docs/process/CROSS_REPO_WORKFLOWS.md`](docs/process/CROSS_REPO_WORKFLOWS.md)
- Active runbook index: [`docs/process/RUNBOOKS.md`](docs/process/RUNBOOKS.md)
- Graphite workflow: [`docs/process/GRAPHITE.md`](docs/process/GRAPHITE.md)

## Canonical Docs

- [`docs/system/HABITAT_ARCHITECTURE.md`](docs/system/HABITAT_ARCHITECTURE.md)
- [`docs/system/HABITAT_RUNTIME_REALIZATION.md`](docs/system/HABITAT_RUNTIME_REALIZATION.md)
- [`docs/PROCESS.md`](docs/PROCESS.md)
- [`docs/PRODUCT.md`](docs/PRODUCT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/DOCS.md`](docs/DOCS.md)
- [`docs/process/CROSS_REPO_WORKFLOWS.md`](docs/process/CROSS_REPO_WORKFLOWS.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`UPDATING.md`](UPDATING.md)
