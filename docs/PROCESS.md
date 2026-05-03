# PROCESS

## Contribution Model

- Core-for-everyone changes go to `RAWR HQ-Template`.
- Personal/product-specific behavior stays in `RAWR HQ` unless intentionally promoted.

See:
- `CONTRIBUTING.md`
- `UPDATING.md`

## Operating Playbooks

- `docs/process/HQ_USAGE.md`
- `docs/process/HQ_OPERATIONS.md`
- `docs/process/GRAPHITE.md`
- `docs/process/UPSTREAM_SYNC_RUNBOOK.md`
- `docs/process/RUNBOOKS.md`
- `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md`
- `docs/process/MAINTENANCE_CADENCE.md`

The previous plugin E2E workflow is preserved at `docs/process/quarantine/PLUGIN_E2E_WORKFLOW.md` and is not active process guidance.

## Command Channel Model

- Canonical workspace runtime plugin commands are `rawr plugins web ...`.
- `rawr plugins ...` is reserved for oclif plugin manager commands.
- In this repo's local dev checkout, run the CLI through `bun run rawr ...`.
