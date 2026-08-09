# Habitat Blueprint Composition

**Status:** Normative authority

## Purpose

Habitat definitions stay layered without making repository authors restate
that layering for every instance. This document separates authoring
organization from the admitted blueprint, instance, and execution model.

## Native Model

A blueprint defines one constructible kind. Its `blueprint.toml` declares the
kind, version, instance grammar, and sorted rule set. One required root
`structure.toml` states the kind's complete positive filesystem spine. Focused
source rules may live in context-bearing component directories when that makes
the authority easier to understand.

```text
blueprint
  -> structure anchor
  -> ordinary rules

instance + rule
  -> application
```

The existing rule list is the composition surface. A component directory is
only an authoring aid that groups ordinary rules around one stable part of the
kind. It has no schema record, runtime identity, selection, merge behavior, or
execution semantics. Directory placement activates nothing; `blueprint.toml`
must reference every executable rule asset.

## Rule Packets

A rule packet is one reviewable policy claim inside one blueprint. Structure
owns positive topology. Grit owns small parser-visible source relations.
TypeScript owns inference and assignability. Nx owns project relations,
scheduling, and caching. Behavior proof owns runtime outcomes and lifetime.

Packet granularity follows one qualified reviewer action, not one matcher
branch. A short adjacent chain or bounded alternative set stays in one packet
when its subject, owner, evaluator, diagnostic, and remediation are the same.
Split a packet only when one part can be admitted, owned, or remediated
independently; matcher atomization alone is not architectural composition.

Every declared rule resolves as an ordinary instance/rule application. Nx may
expose a focused target for that application while the owner-level policy check
remains the normal aggregate. Authoring directories do not create additional
applications or targets; their declared rules do.

Rule order is deterministic serialization and report order, not precedence.
One rule cannot override, suppress, or weaken another.

A Grit packet's acquisition is part of its claim. Definition-authored,
bounded literal/star `rootPatterns` let a packet name fixed interiors relative
to an existing instance root; variable instance matter continues to use whole
root roles or explicit selections. Declaring the relation is explicit packet
authoring and does not reinterpret an existing whole-root rule. Patterns
introduce no child kinds, generated root bindings, or manifest membership.
Catalog resolution, Nx inputs, and native evaluation consume the same resolved
relation so corpus precision is both correctness and performance authority.

## Instance Cost

One repository component selects one blueprint and version through one
blueprint-owned `habitat.toml`. The manifest declares instance facts; it does
not restate the blueprint's authoring tree or rule inventory. Every resolved
rule retains the same instance and Nx owner.

No module, operation, model, database, proof category, or authoring component
requires another manifest merely because its law is separately readable.

## Packaging

The policy pack ships the complete recursive asset closure of every selected
definition at the same relative paths used by `blueprint.toml`. Catalog
resolution rejects a missing, escaping, wrong-kind, or drifted declared asset.
Packaging preserves authority bytes; it does not flatten or reinterpret them.

Undeclared files remain inert. Obsolete or superseded files do not belong in a
selected blueprint's recursive package closure.

## Blueprint Relations

`include` and `contains` remain reserved future vocabulary for independently
constructible reusable kinds. They are not required for internal authoring
layers and are not activated in this release.

- `include` would add another blueprint's law at the same anchor.
- `contains` would bind an independently closed child kind below a parent
  anchor with explicit membership and cardinality.

Neither relation is inheritance, directory discovery, or an excuse for extra
instance authoring. A future relation capability must be specified and proven
separately.

## Classification

Use the root `structure.toml` for the kind's one complete structural spine.
Use an authoring component directory when several focused source rules explain
one stable part of that kind. Use a rule packet for one inseparable claim.
Promote a child blueprint only when it has independent identity, a complete
constructible law, and demonstrated reuse outside its current parent.

The model is violated when a component gains its own DTO, manifest, project,
target, merge engine, or implicit activation; when a rule grows into a second
model of the whole kind; or when packaging changes the declared authority tree.

## Relations

- [[AUTHORITY-ONTOLOGY|Habitat authority ontology]]
- [[AUTHORITY|Habitat authority]]
- [[README|Habitat policy index]]
- [[blueprints/blueprint-packet/skill|Blueprint packet frame]]
