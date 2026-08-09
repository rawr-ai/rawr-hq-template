<!-- quarantine-ledger: true -->

# Migration Resource Quarantine Router

## Purpose

- Retain deprecated migration support artifacts while preventing them from
  silently re-entering the active evidence or design set.

## Scope

- Applies only to `docs/projects/rawr-final-architecture-migration/resources/quarantine/**`.

## Boundaries

- Material here is resource-history provenance only; it is not active planning authority.
- Quarantined plans and supporting material cannot direct migration execution.

## Behavior

- A resource may be mined for provenance or candidate facts, each of which
  must be checked against current sources before adoption.

## Concepts

- A **quarantined resource** is a retired supporting artifact. **Active
  evidence** is a reviewed source admitted by the current migration owner.

## Flow

- Read inward only to recover historical decisions or evidence.
- Restate any reclaimed claim in active project authority before relying on it.

## Interfaces

- Retired artifacts enter only as review inputs; accepted evidence leaves
  through an active migration resource or canonical document.

## Routing

- Return to the [docs router](../../../../AGENTS.md) for current project authority.

## Validation

- Preserve the quarantine marker, required headings, and resolving router edge.
- Treat commands found below this directory as quoted provenance, not validation instructions.
