<!-- quarantine-ledger: true -->

# System Quarantine Router

## Purpose

- Retain retired architecture, security, and system-contract material for
  provenance without exposing it as the live system model.

## Scope

- Applies only to `docs/system/quarantine/**`.

## Boundaries

- Material here is system-history provenance only; it is not current system authority.
- Quarantined topology, security, telemetry, plugin, and enforcement claims cannot direct implementation.

## Behavior

- Historical system claims may explain past constraints, but any claim reused
  in design or implementation must be reconciled with current system
  authority.

## Concepts

- A **system snapshot** captures an obsolete architecture view. A **canonical
  system contract** is the current reviewed owner of architecture or security
  behavior.

## Flow

- Read inward only to recover historical behavior or evidence.
- Verify any reusable claim against active system documentation and restate it there before relying on it.

## Interfaces

- System history is an input to review; active system documents are the only
  interface allowed to hand architecture or security constraints to code.

## Routing

- Return to the [docs router](../../AGENTS.md) for current system authority.

## Validation

- Preserve the quarantine marker, required headings, and resolving router edge.
- Treat commands found below this directory as quoted provenance, not validation instructions.
