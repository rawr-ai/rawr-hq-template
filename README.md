# Habitat Platform

This repository owns the Habitat platform: core SDK, runtime realization,
foundational Oclif/Nx CLI, architecture law, and reusable platform capabilities.
`RAWR HQ-Template` is a legacy remote locator, not the platform's semantic name.

Rawr is the first downstream product built on Habitat. Its private app, domain
services, resources, plugins, and CLI topics live in its independent repository.
Marketplace (legacy remote `RAWR HQ`) is a separate curated-content
repository that owns agent-plugin source, provenance, policy/evaluation inputs,
and governed content lifecycle records. Neither downstream owner inherits,
mirrors, or merges Habitat implementation.

## Quickstart

```bash
bun install
bun run test
```

## Code search

- Nx establishes project membership and project-level dependencies; the AGENTS
  lattice supplies routing and ownership.
- Use TypeScript for statically resolved symbols, types and imports. For dynamic
  dispatch, use registration or runtime evidence. Locate text with ripgrep.
- Narsil is an optional locator for anyone who already has it running: reference
  and symbol-usage search with test exclusion, and plain-language hybrid search.
  It is not the authority for symbol, reference, import or call edges. Verify
  candidate edges from its call-graph, import-graph, export-map and dependency
  tools in source; a missing search result does not disprove an edge.
- This repository does not install Narsil as a standing server. Its
  language-server mode and neural search were not evaluated. The trial note is
  in [`docs/process/NX_AGENT_WORKFLOW.md`](docs/process/NX_AGENT_WORKFLOW.md).

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

- Treat Narsil as an optional locator only, and verify its results in source (see Code search above).
- Do not add repo-local `.mcp.json` here.
- Do not treat this Habitat repository as the canonical source for managed global Nx skill installation.
- Nx MCP is intentionally out of scope for the current repo posture. If we bring it back later, it should be as a hosted/managed service rather than per-client local stdio wiring.
- For the integrated agent workflow, see [`docs/process/NX_AGENT_WORKFLOW.md`](docs/process/NX_AGENT_WORKFLOW.md).

## Authority Boundaries

- Habitat owns the foundational Oclif/Nx CLI, core runtime, generic adapters,
  schemas/tooling implementations, validators, reusable platform law, and the
  generic agent-plugin lifecycle.
- Rawr owns its private app, selected product topics, and domain services in
  its independent repository.
- External Oclif extensions are managed only by `habitat plugins ...`.
- Curated agent-plugin lifecycle currently has no Habitat CLI projection. Task
  12.1 must land the command, manifest, profile, and policy together before
  `habitat agent plugins ...` becomes operational; no Rawr alias is admitted.
- Marketplace curated content enters through explicit versioned data or ordinary
  package/artifact interfaces. A repository path is only a locator.
- App composition consumes declared outputs; it does not own lifecycle state.

## Contribution Boundaries

- Reusable platform machinery and law belong to Habitat.
- Rawr product behavior belongs in the independent Rawr repository.
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
