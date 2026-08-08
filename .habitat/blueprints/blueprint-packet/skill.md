---
name: habitat-blueprint-packet-frame
description: Mental model for one Habitat rule packet as one reviewable policy claim with one qualified verification mechanism.
---

# Blueprint Packet Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed and does not participate in Habitat discovery.

## Frame

A rule packet is one durable policy claim declared by a blueprint's `[[rules]]`
entry and evaluated through its named runner asset. The packet is smaller than
the architectural kind and smaller than product behavior. Its job is to make
one monotonic constraint inspectable, executable, and reviewable without
acquiring broader ownership.

One root `structure.toml` owns the kind's complete positive filesystem
topology. Focused `pattern.md` assets own source relationships and may be
arranged under `components/<role>/` for authoring clarity. That directory has
no manifest or execution semantics; `blueprint.toml` is the activation surface.

Remaining v2 compatibility packets use a physical `rule.json` and
`baseline.json` envelope until their authority moves into a versioned
blueprint. The baseline records admitted findings during convergence; it is not
a source of truth and does not turn debt into design.

## Gradient

The strongest packet removes a class of invalid possibilities while leaving
valid implementation choice open. It describes a relation shared by every
member of a kind, not today's product inventory, a list of retired filenames,
or one migration's temporary state.

One packet should have one natural evaluator. Mixing topology, source
semantics, behavior, and process orchestration in the same mechanism makes the
claim ambiguous. Native Habitat capabilities remain the ordinary substrate.
An executable escape hatch represents an admitted evaluator gap, not a
preferred policy language or a place for architecture.

The packet closes structure around meaningful work. TypeScript and runtime
tests still verify the behavior inside that structure.

## Relations

- [[../skill|Blueprint direction]]
- [[../../AUTHORITY|Habitat authority]]
- [[../grit-pattern/skill|Grit pattern frame]]
