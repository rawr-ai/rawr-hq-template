# Agent Routing: Habitat, Rawr, And Marketplace

This file is the repository authority boundary. Habitat is the platform, Rawr
is its first downstream product app, and Marketplace is the independent curated
agent-plugin repository. The legacy remote names `RAWR HQ-Template` and
`RAWR HQ` do not transfer authority and do not form an upstream/downstream fork
pair.

## Modify Habitat (legacy remote `rawr-ai/rawr-hq-template`) when:

- You are changing the Habitat SDK, foundational Oclif CLI, runtime, Nx
  integration, generic resource/provider/service/plugin law, or platform tools.
- You are changing reusable platform/package/resource lifecycle mechanics,
  native host adapters, schemas, tooling implementations, or generic
  validators. Destination/export realization remains with its dedicated
  architecture.
- You are changing Habitat-owned packages, services, fixtures, repository
  process, or ordinary CLI package/release/install mechanics.
- You are changing reusable Oclif loading, external-extension mechanics, or the
  foundational `habitat plugins` host interface.

## Modify Rawr product source when:

- You are changing Rawr domain services, resources, providers, plugins, topics,
  profiles, app composition, or product policy.
- You are changing a command that expresses Rawr product behavior rather than
  Habitat platform operation.
- Until extraction completes, predecessor product owners may remain co-located
  in this repository only as migration input. They do not receive new behavior
  and may consume only public Habitat faces and qualified non-core platform
  capabilities.

## Do NOT put in Habitat platform owners:

- Marketplace curated agent-plugin source or release/channel decisions.
- Marketplace vendor provenance, policy, evaluation inputs, or lifecycle records.
- Rawr domain semantics, topic membership, app profiles, or product policy.
- Machine-specific settings and personal workflows.
- A Marketplace checkout locator encoded as CLI installation, package, channel,
  receipt, provider, or release identity.

## Modify Marketplace (legacy remote `rawr-ai/rawr-hq`) when:

- You are authoring curated agent-plugin source/content.
- You are recording content vendor provenance, policy, evaluation, acceptance,
  release, or channel state.
- You are changing Marketplace repository process or configuration.
- You are updating declarative inputs consumed by an exact released version of
  a Habitat-owned tool.

## Quick Decision Rule

- "Is this reusable platform machinery or law?" -> Habitat.
- "Is this Rawr domain behavior or product composition?" -> Rawr.
- "Is this curated agent content or a governed decision about that content?" -> Marketplace.
- If one change appears to require both repositories, split it at a versioned
  data/schema or ordinary package interface; never copy implementation across
  the boundary.

## Plugin Ownership Rule (Hard)

- Oclif owns external CLI extension mechanics; Habitat owns the foundational
  Oclif loader, runtime bridges, SDK contracts, generic provider mechanics, and
  the agent-plugin lifecycle service plus its control-plane and CLI projections.
  Rawr owns only downstream product topics.
- Marketplace owns the closed curated agent-plugin content set and its governance records.
- External Oclif extensions live only under `habitat plugins`.
- Curated agent lifecycle currently lives only under `rawr agent plugins`.
- The curated Habitat command destination becomes operational only when its
  command, manifest, and policy migration lands together.
- App composition is a consumer and never a lifecycle owner.

## Platform Distribution Ownership

- Habitat SDK/CLI contracts, package metadata, Nx Release configuration,
  publication, and installation are Habitat-owned.
- `@habitat-ai/sdk` and `@habitat-ai/cli` are the supported public artifacts.
  Registry publication and package metadata establish current released
  versions; Nx Release configuration defines release membership; release
  records preserve evidence. Marketplace and Rawr may consume exact released
  interfaces but do not vendor their implementation.
- The `rawr` executable remains a private downstream Rawr Oclif application invoked
  through its Nx-owned source/build targets. It is not installed into Marketplace
  or published as a cross-repository interface.
- No checkout, worktree, or private release selector becomes executable or
  lifecycle identity.

## Repository Separation Rule (Hard)

- No Habitat-to-Marketplace merge, cherry-pick, transplant, or ancestry relationship.
- No manual duplicate implementation or Marketplace fork/copy of Habitat runtime code.
- No standing tree-equivalence guard or Habitat-managed executable path manifest
  in Marketplace.
- Each repository owns its own hooks, Graphite state, docs, and process records.
- Cross-repository acceptance binds versioned schema/protocol IDs, exact selected
  Git commit/tree identities, governed record digests, and the ordinary installed
  CLI version where needed. It creates no shared ancestry or local lifecycle
  artifact store.

## Graphite Policy

- Graphite is enabled in this Habitat repository.
- Trunk must remain `main`.
- Use stacked branches for Habitat platform work; keep stacks clean and close superseded PR branches after landing.
