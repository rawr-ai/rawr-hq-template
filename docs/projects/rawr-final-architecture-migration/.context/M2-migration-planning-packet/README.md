# M2 Migration Planning Packet

Status: ready for migration planning.
Purpose: prepare the authority model and working spine for migration planning after the final architecture and runtime realization specs landed.

This packet is separate from quarantined spec construction and review work under `.context/quarantine/`. It is the first-hop context for migration planning, not the migration plan.

## First-Hop Files

Read in this order:

1. `00-packet-spine.md`
2. `01-primary-authorities.md`
3. `02-secondary-references.md`
4. `03-avoid-ignore.md`

## Current State

- The final canonical architecture spec has landed.
- The final runtime realization spec has landed.
- Current repo reality is migration substrate only.
- Pre-final M2 execution, plan, milestone, issue, guardrail, and finalization packets have been moved into visible `quarantine/` directories.
- Auth and deployment companion specs are look-ahead references only and must not expand the immediate runtime migration scope.

## Operating Stance

Migration planning should be target-authority work:

- target specs define the destination;
- current code defines the starting material and proof burden;
- regenerated M2 docs define the migration container and verification expectations;
- secondary references may inform hooks and future slices, but they do not create scope;
- every bridge, shim, fallback, alias, or compatibility wrapper needs an owner, expiration, and cleanup gate.

## Update Triggers

Update this packet when:

- the current repo audit for runtime realization migration is complete;
- the M2 migration plan, milestone, and issues are regenerated;
- auth or deployment companion specs are explicitly promoted from reference material into planned migration scope.
