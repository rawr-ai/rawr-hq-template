# PRODUCT

`RAWR HQ-Template` is the executable Oclif CLI and generic lifecycle/tooling
product for a local-first AI headquarters.

## Product Roles

- `RAWR HQ-Template`: official Oclif CLI, provider adapters, generic lifecycle
  services, schemas/tooling implementations, and validators.
- Personal `RAWR HQ`: curated agent-plugin content, provenance, policy/evaluation
  inputs, and governed content records.

## Non-Goals

- Embedding personal one-off workflows in the template baseline.
- A Git sync, fork, merge, or standing executable-tree relationship between the repositories.
- Letting app composition, a checkout path, or an aggregate become lifecycle authority.

## User Outcomes

- Install one ordinary versioned Oclif CLI with an explicitly composed core
  command set.
- Manage genuine external extensions through `rawr plugins`.
- Manage curated agent releases through `rawr agent plugins`.
- Reconcile provider/export state through explicit owners and repeat converged
  operations without writes.
- Exchange only versioned data and ordinary published interfaces across
  repository boundaries.

The fixed Nx Release package group is pending. Current development uses
`bun run rawr -- ...`; the predecessor custom distribution may remain
executable on a workstation, but it is obsolete and is not a product authority.
