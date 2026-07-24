# RAWR HQ-Template

`RAWR HQ-Template` owns the executable `rawr` controller and generic lifecycle
tooling for local-first AI headquarters.

Personal `RAWR HQ` is a separate curated-content repository. It owns agent-plugin
source, provenance, policy/evaluation inputs, and governed content lifecycle
records. It does not inherit, mirror, or merge this repository's runtime code.

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
bunx nx show project @rawr/server --json
bunx nx graph
```

- Keep Narsil as the primary code-intel MCP for symbol search, references, and call-path work.
- Do not add repo-local `.mcp.json` here.
- Do not treat this template repo as the canonical source for managed global Nx skill installation.
- Nx MCP is intentionally out of scope for the current repo posture. If we bring it back later, it should be as a hosted/managed service rather than per-client local stdio wiring.
- For the integrated agent workflow, see [`docs/process/NX_AGENT_WORKFLOW.md`](docs/process/NX_AGENT_WORKFLOW.md).

## Authority Boundaries

- The controller, official commands, provider adapters, generic lifecycle services,
  schemas/tooling implementations, and generic validators live here.
- External Oclif extensions are managed only by `rawr plugins ...`.
- Curated agent-plugin lifecycle is managed only by `rawr agent plugins ...`.
- Personal curated content enters through explicit versioned data or immutable
  artifact interfaces. A repository path is only a locator.
- App composition consumes declared outputs; it does not own lifecycle state.

## Contribution Boundaries

- Executable and generic tooling changes belong in `RAWR HQ-Template`.
- Curated agent content and governed content records belong in personal `RAWR HQ`.
- A concept may be reimplemented intentionally on either side of a published
  interface, but code is never copied or synchronized between repositories.

## Agent Routing

- If you are deciding where to implement a change, use [`AGENTS_SPLIT.md`](AGENTS_SPLIT.md).
- Template-side contribution rules are defined in [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Controller and interface update rules are defined in [`UPDATING.md`](UPDATING.md).

## Operational Runbooks

- Repository separation and artifact interfaces: [`docs/process/CROSS_REPO_WORKFLOWS.md`](docs/process/CROSS_REPO_WORKFLOWS.md)
- Active runbook index: [`docs/process/RUNBOOKS.md`](docs/process/RUNBOOKS.md)
- Graphite workflow: [`docs/process/GRAPHITE.md`](docs/process/GRAPHITE.md)

## Canonical Docs

- [`docs/PROCESS.md`](docs/PROCESS.md)
- [`docs/PRODUCT.md`](docs/PRODUCT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/DOCS.md`](docs/DOCS.md)
- [`docs/process/CROSS_REPO_WORKFLOWS.md`](docs/process/CROSS_REPO_WORKFLOWS.md)
- [`docs/system/SECURITY_MODEL.md`](docs/system/SECURITY_MODEL.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`UPDATING.md`](UPDATING.md)
