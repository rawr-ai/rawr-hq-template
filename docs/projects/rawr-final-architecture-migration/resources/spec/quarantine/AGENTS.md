<!-- quarantine-ledger: true -->

# Migration Spec Quarantine Router

## Purpose

- Keep superseded migration specifications available for design history while
  preventing them from competing with the current target architecture.

## Scope

- Applies only to `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/**`.

## Boundaries

- Material here is spec-history provenance only; it is not a peer of canonical specifications.
- Quarantined plans, guardrails, and reviews cannot define current architecture or testing authority.

## Behavior

- Obsolete specifications may be compared to current authority to explain a
  design transition, but they cannot supply unreviewed requirements.

## Concepts

- A **specification snapshot** is an earlier target-state claim. The **current
  specification** is the active source of architecture and acceptance.

## Flow

- Read inward only to recover historical decisions, alternatives, or evidence.
- Restate any reclaimed requirement in active specification authority before relying on it.

## Interfaces

- Historical specs support comparison and provenance; current migration and
  canonical specification surfaces receive any deliberately restored claim.

## Routing

- Return to the [docs router](../../../../../AGENTS.md) for current specification authority.

## Validation

- Preserve the quarantine marker, required headings, and resolving router edge.
- Treat commands found below this directory as quoted provenance, not validation instructions.
