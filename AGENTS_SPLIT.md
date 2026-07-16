# Agent Routing: Template vs Personal Repo

This file is the repository authority boundary. `RAWR HQ-Template` and personal
`RAWR HQ` are independent repositories, not an upstream/downstream fork pair.

## Modify `RAWR HQ-Template` (`rawr-ai/rawr-hq-template`) when:

- You are changing the installed controller or official CLI command set.
- You are changing generic lifecycle behavior, provider/export adapters, schemas,
  tooling implementations, or generic validators.
- You are changing Template-owned packages, services, fixtures, repository process,
  or executable release/activation mechanics.
- You are changing the guarded external Oclif extension surface under `rawr plugins`.

## Do NOT put in Template:

- Personal curated agent-plugin source or release/channel decisions.
- Personal vendor provenance, policy, evaluation inputs, or lifecycle records.
- Machine-specific settings and personal workflows.
- A personal checkout locator encoded as controller, artifact, channel, ledger,
  receipt, provider identity, or release identity.

## Modify personal `RAWR HQ` (`rawr-ai/rawr-hq`) when:

- You are authoring curated agent-plugin source/content.
- You are recording content vendor provenance, policy, evaluation, acceptance,
  release, or channel state.
- You are changing personal repository process or configuration.
- You are updating declarative inputs consumed by an exact released version of a
  Template-owned tool.

## Quick Decision Rule

- "Does this execute or implement generic lifecycle behavior?" -> Template.
- "Is this curated agent content or a governed decision about that content?" -> personal.
- If one change appears to require both repositories, split it at a versioned
  schema/artifact interface; never copy implementation across the boundary.

## Plugin Ownership Rule (Hard)

- Template owns external CLI extension policy and generic agent lifecycle tooling.
- Personal owns the closed curated agent-plugin content set and its governance records.
- External Oclif extensions live only under `rawr plugins`.
- Curated agent lifecycle lives only under `rawr agent plugins`.
- App composition is a consumer and never a lifecycle owner.

## Global CLI Wiring Ownership

- CLI contracts, controller releases, activation, and `rawr doctor global` are
  Template-owned.
- The global launcher selects an installed immutable controller release, never a
  Template or personal checkout.
- Personal checks may invoke an externally installed Template-owned tool at an
  exact interface version. Personal does not vendor that tool.

## Repository Separation Rule (Hard)

- No Template-to-personal merge, cherry-pick, transplant, or ancestry relationship.
- No manual duplicate implementation or personal fork/copy of Template runtime code.
- No standing tree-equivalence guard or Template-managed executable path manifest
  in personal.
- Each repository owns its own hooks, Graphite state, docs, and process records.
- Cross-repository acceptance binds versioned schema/protocol IDs, immutable
  artifact digests, and governed record digests. Git commits are audit provenance only.

## Graphite Policy

- Graphite is enabled in this template repo.
- Trunk must remain `main`.
- Use stacked branches for template/core work; keep stacks clean and close superseded PR branches after landing.
