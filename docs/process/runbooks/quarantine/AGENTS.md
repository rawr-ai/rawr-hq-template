<!-- quarantine-ledger: true -->

# Runbook Quarantine Router

## Purpose

- Retain superseded operational sequences for incident and design archaeology
  while keeping their commands outside the executable runbook path.

## Scope

- Applies only to `docs/process/runbooks/quarantine/**`.

## Boundaries

- Material here is runbook provenance only; its commands and topology are not active instructions.
- Never execute an operation because a quarantined runbook describes it.

## Behavior

- A reader may recover old preconditions, hazards, or failure handling, then
  must rewrite and review the operating sequence as an active runbook before
  use.

## Concepts

- A **runbook snapshot** captures an obsolete operating sequence. An **active
  runbook** is the reviewed current sequence allowed to guide action.

## Flow

- Read inward only to recover historical operational intent or evidence.
- Rewrite any reclaimed operating sequence under active runbook authority
  before executing it.

## Interfaces

- Historical runbooks are read-only inputs to review; the active runbook tree
  is the sole outward interface for executable operational guidance.

## Routing

- Return to the [docs router](../../../AGENTS.md) for current runbook authority.

## Validation

- Preserve the quarantine marker, required headings, and resolving router edge.
- Treat commands found below this directory as quoted provenance, not validation instructions.
