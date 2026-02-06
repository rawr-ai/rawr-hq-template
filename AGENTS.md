# RAWR HQ-Template Router

## Scope

- Applies repo-wide when a deeper `AGENTS.md` is not present.

## Repo Role Boundary

- `RAWR HQ-Template` is the upstream baseline for shared core behavior and docs.
- Personal/local customization belongs in downstream `RAWR HQ` unless intentionally promoted upstream.
- Use `AGENTS_SPLIT.md` first for template-vs-personal destination decisions.

## Command Surface Policy

- External CLI plugin channel: `rawr plugins ...`
- Workspace runtime plugin channel: `rawr hq plugins ...`
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

## Process Runbooks

- Upstream sync workflow: `docs/process/UPSTREAM_SYNC_RUNBOOK.md`.
- Plugin end-to-end workflow: `docs/process/PLUGIN_E2E_WORKFLOW.md`.
- Graphite-first branch/stack operations: `docs/process/GRAPHITE.md`.
- Operational usage conventions: `docs/process/HQ_USAGE.md`, `docs/process/HQ_OPERATIONS.md`.
- Documentation architecture contract: `docs/DOCS.md`.
