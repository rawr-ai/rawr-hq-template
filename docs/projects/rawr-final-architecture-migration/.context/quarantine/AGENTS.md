<!-- quarantine-ledger: true -->

# Migration Context Quarantine Router

## Purpose

- Keep obsolete migration planning packets and review context available for
  reconstructing how the architecture migration evolved.

## Scope

- Applies only to `docs/projects/rawr-final-architecture-migration/.context/quarantine/**`.

## Boundaries

- Material here is execution and review provenance only; it is not current project context.
- Quarantined packets, candidate reviews, and finalization records cannot direct current execution.

## Behavior

- Historical context can explain a prior recommendation or review outcome,
  but current execution consumes only context revalidated in the active
  migration packet.

## Concepts

- A **context packet** captures the inputs visible at one migration stage. A
  **review record** preserves an evaluation, not continuing approval.

## Flow

- Read inward only to recover historical decisions, reviews, or evidence.
- Restate any reclaimed context in active project authority before relying on it.

## Interfaces

- This surface exposes historical planning inputs to readers and hands any
  recovered conclusion back to active migration context through the docs
  router.

## Routing

- Return to the [docs router](../../../../AGENTS.md) for current project context.

## Validation

- Preserve the quarantine marker, required headings, and resolving router edge.
- Treat commands found below this directory as quoted provenance, not validation instructions.
