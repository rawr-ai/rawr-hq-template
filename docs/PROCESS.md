# PROCESS

## Contribution Model

- Executable controller and generic lifecycle/tooling changes go to `RAWR HQ-Template`.
- Curated agent-plugin content and governed content records go to personal `RAWR HQ`.
- The repositories exchange only versioned data and immutable artifacts; there is
  no merge, copy, or upstream-sync workflow.

See:
- `CONTRIBUTING.md`
- `UPDATING.md`

## Operating Playbooks

- `docs/process/HQ_USAGE.md`
- `docs/process/HQ_OPERATIONS.md`
- `docs/process/GRAPHITE.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`
- `docs/process/RUNBOOKS.md`
- `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md`
- `docs/process/MAINTENANCE_CADENCE.md`

The previous plugin E2E workflow is preserved at `docs/process/quarantine/PLUGIN_E2E_WORKFLOW.md` and is not active process guidance.

## Command Channel Model

- `rawr plugins ...` is reserved for external Oclif extensions.
- `rawr agent plugins ...` is reserved for curated agent-plugin lifecycle.
- Production/operational checks invoke an installed immutable controller release.
