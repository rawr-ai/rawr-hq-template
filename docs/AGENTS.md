# Docs Navigation For Agents

## Scope

Applies to `docs/**`.

## Canonical Entry Points

- `docs/DOCS.md`
- `docs/PRODUCT.md`
- `docs/SYSTEM.md`
- `docs/PROCESS.md`
- `docs/ROADMAP.md`

## Core Supporting Docs

- `docs/system/PLUGINS.md`
- `docs/SECURITY_MODEL.md`
- `docs/process/AGENT_LOOPS.md`
- `docs/process/GRAPHITE.md`
- `docs/process/UPSTREAM_SYNC_RUNBOOK.md`
- `docs/process/PLUGIN_E2E_WORKFLOW.md`
- `docs/process/RUNBOOKS.md`
- `docs/process/runbooks/STACK_DRAIN_LOOP.md`
- `docs/process/runbooks/TEMPLATE_TO_PERSONAL_INTEGRATION_LOOP.md`
- `docs/process/MAINTENANCE_CADENCE.md`
- `docs/process/HQ_USAGE.md`
- `docs/process/HQ_OPERATIONS.md`

## Naming Invariant

Use these names consistently:
- Template repo: `RAWR HQ-Template`
- Personal repo: `RAWR HQ`

## Directory Map

- `docs/product/`: product semantics and value framing.
- `docs/system/`: architecture and technical contracts.
- `docs/process/`: operating workflows and playbooks.
- `docs/projects/`: time-bound initiatives.
- `docs/plans/`: retained planning workstream docs (prefer `docs/projects/` for new execution plans).
- `docs/spikes/`: retained spike investigations (promote stable guidance to `docs/system/` or `docs/process/`).
- `docs/_archive/`: historical docs not part of active guidance.

## Conventions

- Keep canonical truth in gateway docs and linked system/process docs.
- Do not route active guidance through archived documents.
- Treat parked concepts as doc-only until explicitly un-parked.
