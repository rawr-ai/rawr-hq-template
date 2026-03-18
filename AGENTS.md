# RAWR HQ-Template Router

## Scope

- Applies repo-wide when a deeper `AGENTS.md` is not present.

## Nx First Hop

- Nx is first-class in this repo. Use the official Nx skills and the Nx CLI before ad hoc file exploration.
- Start workspace/navigation questions with:
  - `bunx nx show projects`
  - `bunx nx show project <project-name> --json`
  - `bunx nx graph`
- Official Nx skills are vendored in this repo under:
  - `plugins/agents/nx/skills/`
- Install or refresh them via the managed sync path:
  - `bun run rawr -- plugins sync nx --dry-run --json`
  - `bun run rawr -- plugins sync nx`
- Use Nx for workspace/project truth, this AGENTS lattice for routing/ownership truth, and Narsil for source/symbol/reference truth.
- Do not add or rely on repo-local `.mcp.json` or repo `CLAUDE.md` here.

## Repo Role Boundary

- `RAWR HQ-Template` is the upstream baseline for shared core behavior and docs.
- Personal/local customization belongs in downstream `RAWR HQ` unless intentionally promoted upstream.
- Use `AGENTS_SPLIT.md` first for template-vs-personal destination decisions.
- Template plugins are fixture/example-only by default; operational plugin authoring belongs downstream.

## Command Surface Policy

- External CLI plugin channel: `rawr plugins ...`
- Workspace runtime plugin channel: `rawr plugins web ...`
- Do not mix the two command surfaces in guidance or examples.

## Graphite Requirement

- Graphite is required in this repo.
- Trunk must remain `main` (`gt trunk`).
- Branch/stack workflow contract: `docs/process/GRAPHITE.md`.

## Routing

- `AGENTS_SPLIT.md` for "where should this change land?" (template vs personal).
- `apps/AGENTS.md` for runtime surfaces (`cli`, `server`, `web`).
- `packages/AGENTS.md` for shared libraries and dependency direction.
- `plugins/AGENTS.md` for plugin package contracts and enablement.
- `scripts/AGENTS.md` for hook/script conventions.
- `docs/AGENTS.md` for canonical documentation entrypoints.
- `docs/process/NX_AGENT_WORKFLOW.md` for the integrated Nx CLI / Nx skills / managed sync / Narsil posture, plus the deferred note on a future hosted Nx integration.

## Process Runbooks

- CLI/plugin path index (start here): `docs/process/RUNBOOKS.md`.
- Nx-first agent workflow: `docs/process/NX_AGENT_WORKFLOW.md`.
- Graphite stack drain loop: `docs/process/runbooks/STACK_DRAIN_LOOP.md`.
- Template->personal integration loop: `docs/process/runbooks/TEMPLATE_TO_PERSONAL_INTEGRATION_LOOP.md`.
- Upstream sync workflow: `docs/process/UPSTREAM_SYNC_RUNBOOK.md`.
- Cross-repo workflow model: `docs/process/CROSS_REPO_WORKFLOWS.md`.
- Plugin end-to-end workflow: `docs/process/PLUGIN_E2E_WORKFLOW.md`.
- Graphite-first branch/stack operations: `docs/process/GRAPHITE.md`.
- Ongoing doc/process health cadence: `docs/process/MAINTENANCE_CADENCE.md`.
- Operational usage conventions: `docs/process/HQ_USAGE.md`, `docs/process/HQ_OPERATIONS.md`.
- Documentation architecture contract: `docs/DOCS.md`.
