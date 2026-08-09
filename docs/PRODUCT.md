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
- Curated agent lifecycle has no current Habitat CLI projection. Task 12.1
  activates it only by landing command, manifest, profile, and policy together.
- Invoke Rawr product behavior only through its independent repository and
  released Habitat interfaces.
- Reconcile Marketplace provider, provenance, and export records through
  Habitat-owned lifecycle interfaces, and repeat converged operations without
  writes.
- Exchange only versioned data and ordinary published interfaces across
  repository boundaries.

Habitat SDK and CLI registry publication plus package metadata establish
released versions, Nx Release configuration defines release membership, and
release records preserve evidence. This gateway does not duplicate package
versions or release inventory. No compatibility or fallback path preserves a
retired distribution or selector.

Only platform-native Habitat code remains in this repository. Rawr and
Marketplace consume it through versioned data and ordinary package artifacts.
