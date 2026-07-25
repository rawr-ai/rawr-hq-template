---
name: habitat-blueprint-packet-frame
description: Mental model for one Habitat rule packet as one reviewable policy claim with one qualified verification mechanism.
---

# Blueprint Packet Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed and does not participate in Habitat discovery.

## Frame

A blueprint packet is one durable policy claim packaged with the evidence
needed to evaluate it. The packet is smaller than the architectural kind and
smaller than the product behavior. Its job is to make one monotonic constraint
inspectable, executable, and reviewable without acquiring broader ownership.

`rule.json` names the claim, its owner, scope, reason, and remediation.
`structure.toml` owns positive filesystem topology. `pattern.md` owns source
relationships. `baseline.json` records admitted findings during convergence;
it is not a source of truth and does not turn debt into design.

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
