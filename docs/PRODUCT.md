# PRODUCT

`RAWR HQ-Template` owns the Habitat platform source and a private `rawr` Oclif
application for repository-specific lifecycle operations.

## Product Roles

- Habitat: public SDK, CLI, blueprints, runtime capabilities, and reusable
  tooling distributed from `RAWR HQ-Template`.
- Private `rawr` application: Template-local Oclif command composition,
  provider adapters, and agent-plugin lifecycle operations.
- Personal `RAWR HQ`: curated agent-plugin content, provenance, policy/evaluation
  inputs, and governed content records.

## Non-Goals

- Embedding personal one-off workflows in the template baseline.
- A Git sync, fork, merge, or standing executable-tree relationship between the repositories.
- Letting app composition, a checkout path, or an aggregate become lifecycle authority.

## User Outcomes

- Install the supported Habitat SDK/CLI through ordinary Nx/npm distribution.
- Invoke the private `rawr` application through the exact Template revision and
  its Nx-owned targets.
- Manage genuine external extensions through `rawr plugins`.
- Manage curated agent releases through `rawr agent plugins`.
- Reconcile provider/export state through explicit owners and repeat converged
  operations without writes.
- Exchange only versioned data and ordinary published interfaces across
  repository boundaries.

Habitat SDK and CLI `0.4.1` publication and registry-installed acceptance are
complete. Private `rawr` development and acceptance use
`bun run rawr -- ...`; no RAWR release is pending. The predecessor custom
distribution, selector, retained releases, and global alias have been removed.
No compatibility or fallback path preserves them.

Platform-native Habitat code remains in this repository. Domain products built
on Habitat, including the current private `rawr` composition, are candidates for
later extraction into an independent product repository rather than promotion
from this workspace.
