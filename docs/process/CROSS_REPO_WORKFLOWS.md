# Repository Separation And Interface Workflows

This document is canonical and normative for interactions among the Habitat
platform, Rawr product, and Marketplace content repositories.

## Repository Authorities

The Habitat repository owns the core SDK, foundational Oclif CLI, private
runtime implementation, architecture law, generic tools, blueprints,
validators, and reusable platform services/resources/providers.

The Rawr repository owns the first downstream product built on Habitat: its app
composition, profiles, entrypoints, domain services/resources/providers,
plugins, topics, policy, tests, product records, and private Oclif application.

Marketplace owns curated agent-plugin content, vendor provenance, declarative
policy/evaluation inputs, and its governed acceptance, release, and channel
records.

Each repository owns its own Git history, canonical `main`, Graphite state,
worktrees, hooks, configuration, OpenSpec records, and process records.

## Forbidden Relationships

- Do not merge, rebase, cherry-pick, transplant, mirror, or establish required
  ancestry between the repositories.
- Do not copy, fork, vendor, or manually duplicate Habitat implementation in
  Rawr or Marketplace.
- Do not preserve Habitat-managed source paths through a guard, manifest,
  tree-equivalence check, compatibility layer, or Git synchronization process.
- Do not use a checkout path as package, executable, channel, ledger, receipt,
  release, provider, or export identity.
- Do not make upstream synchronization a product or repository-process
  dependency.

## Released Habitat Interface

Rawr and Marketplace may consume Habitat only through ordinary released package
interfaces. A complete binding names:

- package identity and exact version;
- package provenance and integrity supplied by the release system;
- schema or protocol identity and version when data crosses the boundary;
- the consuming repository revision and owner-local acceptance result.

Registry publication and package metadata establish released Habitat versions,
Nx Release configuration defines membership, and release records preserve
evidence. Routers and runbooks must point to those sources rather than repeat
versions or release inventory.

## Marketplace Content Interface

Rawr may operate on Marketplace content only through an explicit versioned data
interface. A complete content binding names:

- schema or protocol identity and version;
- exact Marketplace repository identity, source commit and tree;
- release-input and governed-record identities;
- provider or export destination when mutation is requested;
- the exact Rawr revision and Habitat interfaces used for acceptance.

The Marketplace repository path is only a content-workspace locator. Git commit
and tree identities are audit provenance; neither the path nor Git ancestry
becomes executable or lifecycle authority.

## Habitat Release

1. Implement and verify reusable platform behavior in Habitat.
2. Land through Habitat's Graphite stack and canonical `main`; the required
   repository gate must pass on the exact release source.
3. Publish supported packages through Habitat's Nx Release configuration.
4. Registry-install-smoke the exact release artifacts and retain normal release
   provenance and integrity.
5. Record the exact package interfaces for downstream acceptance.

No Rawr or Marketplace checkout participates in a Habitat build or release.

## Rawr Integration

1. Start from clean Rawr canonical `main` and an owner-local OpenSpec.
2. Install exact released Habitat interfaces through package metadata.
3. Select Rawr app profiles, domain services/resources/providers, plugins, and
   topics without importing Habitat implementation paths.
4. Run Rawr's Nx graph plus native Oclif and product acceptance.
5. Land through Rawr's Graphite stack and canonical `main`.

Rawr may depend on Habitat package contracts. It must not depend on Habitat
workspace layout, worktrees, source commits as executable inputs, or release
internals.

## Marketplace Acceptance

1. Start from clean Marketplace canonical `main` and its own repository record.
2. Author or update only curated content and governed content records.
3. Run repository-owned content validation through exact installed Habitat
   interfaces; do not install or vendor the Rawr application.
4. Bind the accepted content identity and governed record identities.
5. Land through Marketplace's own Graphite stack and canonical `main`.

## Operational Acceptance

Cross-repository acceptance is protocol compatibility, not Git integration:

1. verify each repository is clean on canonical `main`;
2. verify exact Habitat package interfaces and the Rawr product revision;
3. verify Marketplace content and governed records against those interfaces;
4. reconcile only the explicitly named provider home or export destination;
5. repeat the operation and prove inspection may occur but no state changes;
6. verify no executable mirror, workspace link, compatibility alias, or
   synchronization relationship connects the repositories.

## Command Boundaries

- `habitat plugins ...` owns external Oclif extension operations.
- Curated agent-plugin lifecycle has no current Habitat CLI projection. Task
  12.1 must land its command, manifest, profile, and policy together before
  `habitat agent plugins ...` becomes operational; no Rawr alias is admitted.
- Provider and export commands mutate only the named destination through its
  declared owner.
- Habitat supplies reusable mechanics; Rawr selects product behavior;
  Marketplace supplies versioned content. App composition owns no lifecycle
  state.

## Repository Promotion

Promote repositories independently. A released Habitat interface may become a
prerequisite for Rawr or Marketplace checks. A Marketplace content release may
become input data to Rawr. Neither relationship transfers source ownership,
Git ancestry, executable identity, or repository lifecycle authority.
