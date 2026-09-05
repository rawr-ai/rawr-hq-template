# PROCESS

## Contribution Model

- Habitat SDK/runtime, foundational Oclif/Nx CLI, reusable tooling, and platform
  law changes go to Habitat owners in this repository.
- Rawr domain services, plugins, topics, profiles, and app composition go to
  Rawr product owners in its independent repository.
- Curated agent-plugin content and governed content records go to Marketplace.
- The repositories exchange only versioned data and ordinary published interfaces; there is
  no merge, copy, or upstream-sync workflow.

See:
- [[CONTRIBUTING]]
- [[UPDATING]]

## Operating Playbooks

- `docs/process/GRAPHITE.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`
- `docs/process/RUNBOOKS.md`
- `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md`
- `docs/process/MAINTENANCE_CADENCE.md`

The previous plugin E2E workflow is preserved at `docs/process/quarantine/PLUGIN_E2E_WORKFLOW.md` and is not active process guidance.

## Command Channel Model

- `habitat plugins ...` is reserved for external Oclif extensions.
- `habitat agent plugins check|package|status|sync|test|vendors update` projects
  the managed Habitat lifecycle service through its app-selected private topic.
- No Rawr alias is admitted. Marketplace content and governed release decisions
  remain independent of these generic mechanics.
