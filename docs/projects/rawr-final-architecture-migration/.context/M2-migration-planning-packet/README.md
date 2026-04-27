# M2 Migration Planning Packet

Status: initial preview packet
Purpose: prepare the authority model and working spine for migration planning after the final integrated canonical architecture document is accepted.

This packet is separate from the spec construction and review work under `M2-runtime-realization-lock-spike/`. It can be paused while the final canonical architecture document is reviewed, then resumed as the first-hop context for migration planning.

## First-Hop Files

Read in this order:

1. `00-packet-spine.md`
2. `01-primary-authorities.md`
3. `02-secondary-references.md`
4. `03-avoid-ignore.md`

## Current State

The migration-planning authority model is not final until the returned integrated canonical architecture document has been reviewed and promoted into the canonical spec path.

For now:

- the Runtime Realization System spec is a primary target authority;
- the final integrated canonical architecture spec slot is pending final review/update;
- current repo reality is migration substrate only;
- auth and deployment companion specs are look-ahead references only and must not expand the immediate runtime migration scope.

## Operating Stance

Migration planning should be target-authority work:

- target specs define the destination;
- current code defines the starting material and proof burden;
- M2 docs define the migration container and verification expectations;
- secondary references may inform hooks and future slices, but they do not create scope;
- every bridge, shim, fallback, alias, or compatibility wrapper needs an owner, expiration, and cleanup gate.

## Update Triggers

Update this packet when:

- the final integrated canonical architecture document is accepted;
- the broader documentation cleanup produces a curated authority/disposition result;
- the current repo audit for runtime realization migration is complete;
- auth or deployment companion specs are explicitly promoted from reference material into planned migration scope.
