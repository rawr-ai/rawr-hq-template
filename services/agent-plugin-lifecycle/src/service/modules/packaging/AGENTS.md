# Agent Plugin Packaging Module Router

## Purpose

- Turn one eligible reviewed content selection into a deterministic Cowork v1
  package and publish it with a verifiable mechanical outcome.

## Scope

- Applies to the packaging capability in this module directory.

## Boundaries

- Packaging consumes release-derivation policy and clean content facts; it
  does not choose channel authority, author source content, or converge native
  providers.
- Packaging curates one ready content-workspace resource and one ready
  package-output resource from inherited service dependencies. It does not
  construct a source reader, resource adapter, or dependency bag.
- Cowork v1 archive projection and digest rules are Packaging-owned protocol
  policy; only byte encoding and output publication cross the package-output
  resource boundary.
- Archive encoding and output replacement remain behind the package-output
  resource contract.

## Behavior

- The module inspects eligible content, derives a targeted release or complete
  set, renders deterministic bytes, revalidates source identity, and publishes
  the output or returns a closed rejection or unsettled result.

## Concepts

- A **packaging mode** selects one release or the complete release set. A
  **package digest** identifies rendered bytes; an **output settlement**
  distinguishes verified convergence from rejection or uncertain mechanics.

## Flow

- A package request enters with a content-workspace locator and output path.
  The operation authors the six bounded source observations, derives and
  renders against that binding, repeats the complete observation, honors any
  concrete refusal, and only then compares bindings and publishes.

## Interfaces

- The `package` operation is the caller boundary. Ready content-workspace and
  package-output resources enter through module context; pure root and module
  policy receive only typed facts.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Release eligibility module](../releases/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/rawr-agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-agent-plugin-lifecycle:test` for package derivation,
  Cowork v1 bytes, source revalidation, and output settlement behavior.
