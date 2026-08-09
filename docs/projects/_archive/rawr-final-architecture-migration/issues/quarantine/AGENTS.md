<!-- quarantine-ledger: true -->

# Migration Issue Quarantine Router

## Purpose

- Retain superseded migration issue records for traceability without treating
  their scope or acceptance criteria as unfinished work.

## Scope

- Applies only to `docs/projects/rawr-final-architecture-migration/issues/quarantine/**`.

## Boundaries

- Material here is issue-history provenance only; these are not executable work items.
- Quarantined scope, sequencing, and acceptance criteria cannot direct current implementation.

## Behavior

- Old issue records support historical scope and dependency analysis; only an
  active issue may authorize implementation or closure.

## Concepts

- An **issue snapshot** is the preserved state of former work. An **active
  issue** is the current owner of scope, sequencing, and acceptance.

## Flow

- Read inward only to recover historical intent or evidence.
- Restate any reclaimed requirement in active project authority before scheduling or implementing it.

## Interfaces

- Issue snapshots are read-only evidence inputs; current migration issues and
  canonical docs receive any requirement that is deliberately revived.

## Routing

- Return to the [docs router](../../../../AGENTS.md) for current project authority.

## Validation

- Preserve the quarantine marker, required headings, and resolving router edge.
- Treat commands found below this directory as quoted provenance, not validation instructions.
