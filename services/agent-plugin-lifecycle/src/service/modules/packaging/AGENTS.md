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

- A package request enters with a content-workspace locator and output path;
  derivation and rendering occur against one source binding; revalidation
  precedes bounded publication.

## Interfaces

- The `package` operation is the caller boundary. Clean-content observation
  and Cowork encoding/publication enter through module context ports.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Release eligibility module](../releases/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` for package derivation,
  Cowork v1 bytes, source revalidation, and output settlement behavior.
