# PROCESS

## Contribution Model

- Habitat SDK/runtime, foundational Oclif/Nx CLI, reusable tooling, and platform
  law changes go to Habitat owners in this repository.
- Rawr domain services, plugins, topics, profiles, and app composition go to
  Rawr product owners, even while co-located here.
- Curated agent-plugin content and governed content records go to Marketplace.
- The repositories exchange only versioned data and ordinary published interfaces; there is
  no merge, copy, or upstream-sync workflow.

See:
- [[CONTRIBUTING]]
- [[UPDATING]]

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

- `rawr plugins ...` is currently reserved for external Oclif extensions.
- `rawr agent plugins ...` is currently reserved for curated agent-plugin
  lifecycle. Their Habitat command destinations remain migration targets until
  the executable manifest and policy land together.
- Private `rawr` application development uses `bun run rawr -- ...` from the
  exact repository revision. Habitat package metadata, Nx Release
  configuration, and registry publication are the distribution sources;
  release records preserve evidence. This gateway does not duplicate versions
  or release inventory.
