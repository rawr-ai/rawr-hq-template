# PRODUCT

Habitat is the platform and substrate. This repository owns its core SDK,
runtime realization, foundational Oclif/Nx CLI, architecture law, and reusable
platform capabilities. `RAWR HQ-Template` is only the current legacy remote
locator.

## Product Roles

- Habitat: public SDK, CLI, blueprints, runtime capabilities, and reusable tooling.
- Rawr: the first downstream product app, containing only product-specific
  composition, domains, providers, plugins, and topics that survive the
  semantic ownership sieve.
- Marketplace (legacy remote `RAWR HQ`): curated agent-plugin content, provenance, policy/evaluation
  inputs, and governed content records.

## Non-Goals

- Embedding personal one-off workflows in Habitat platform owners.
- A Git sync, fork, merge, or standing executable-tree relationship between the repositories.
- Letting app composition, a checkout path, or an aggregate become lifecycle authority.

## User Outcomes

- Install the supported Habitat SDK/CLI through ordinary Nx/npm distribution.
- Invoke Habitat platform operations through the released Habitat CLI.
- Manage genuine external extensions through the `habitat plugins`
  channel.
- Manage curated agent releases through the current `rawr agent plugins`
  channel. Its Habitat command destination activates only after migration.
- Invoke any surviving private `rawr` application through its independent
  repository revision and Nx-owned targets.
- Reconcile Marketplace provider, provenance, and export records through
  Habitat-owned lifecycle interfaces, and repeat converged operations without
  writes.
- Exchange only versioned data and ordinary published interfaces across
  repository boundaries.

Habitat SDK and CLI registry publication plus package metadata establish
released versions, Nx Release configuration defines release membership, and
release records preserve evidence. Private `rawr` development and acceptance
use `bun run rawr -- ...`; this gateway does not duplicate package versions or
release inventory. No compatibility or fallback path preserves the retired
custom distribution or selector.

Platform-native Habitat code remains in this repository. The currently
co-located product source is migration input: surviving Rawr behavior must move
to its independent repository before Habitat runtime implementation opens, and
everything else must resolve to a platform owner or be deleted.
