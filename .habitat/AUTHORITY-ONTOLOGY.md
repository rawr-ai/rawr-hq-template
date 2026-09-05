# Habitat Authority Ontology

**Status:** Normative conceptual reference

## Purpose

This document names Habitat's durable authority concepts. Physical layouts,
catalogs, runners, and release protocols realize this model; they do not
redefine it.

```text
Habitat
Blueprint
Rule packet
Instance
Capability
Niche
Rule application
```

## Habitat

Habitat is the platform for defining, admitting, evaluating, constructing, and
governing software kinds. The CLI, SDK, policy pack, catalog, and runners are
realizations of that platform rather than competing authorities.

## Blueprint

A blueprint defines one constructible architectural kind. It owns the kind's
identity, version, instance grammar, complete positive topology, source
relationships, construction, migration, and governance.

One blueprint has one required structural anchor. Its sorted rule list is the
native composition surface for the rest of its law. Rules may be arranged in
context-bearing authoring directories without creating another kind or runtime
concept. Directory nesting has no execution semantics.

When a selected policy pack admits a blueprint, that package owns the reusable
definition, runner assets, version, and provenance. A repository may retain an
exact authoring-source copy, but drift at the same identity is a resolution
failure rather than a second authority.

A blueprint identity and version are an exact locator for one immutable,
complete definition closure. Every version declares its own runner assets;
resolution does not inherit, merge, or traverse assets from another version.

## Rule Packet

A rule packet states one qualified policy claim inside one blueprint. It is the
smallest reviewable unit of blueprint authoring and owns one natural evaluator
relation. A packet is not a kind, instance, capability, niche, project, or
baseline.

An authoring component is merely a directory that groups ordinary packets
around one stable part of a kind. It has no manifest, schema identity,
application, or target. The blueprint's declared rule list remains the only
activation surface.

## Instance

An instance is concrete repository matter admitted under one primary
blueprint. Its `habitat.toml` declares facts: identity, blueprint version,
roots, and selections. It does not author policy or restate the definition's
rule inventory.

Manifest placement is blueprint-defined. A multi-root instance still has one
anchor, one owner, and one manifest.

## Capability

A capability is an additive reusable facet that an admitted instance may
possess. It names behavior or participation that can cross blueprint kinds. It
is not a constructible kind, provider implementation, or generated shape.

The `capability.toml` definition surface is reserved future work. The current
release does not discover or interpret it.

## Niche

A niche is a governed community of admitted instances selected by accepted
facts. It may govern combinations of kinds, capabilities, ownership, metadata,
or explicit membership. It does not construct a kind or redefine a capability.

The `niche.toml` definition and derived-membership protocol are reserved future
work. Current `.habitat/overlays/**` paths are repository-qualified policy
overlays, not the complete semantic definition of a niche.

## Rule Application

A rule application is bounded execution derived from one declared blueprint
rule and one admitted instance:

```text
blueprint rule + instance facts -> application
```

It carries provenance and exact acquisition facts. It is not a policy owner,
instance, kind, capability, or niche. Nx may schedule it and a runner may
execute it without changing ownership.

A blueprint rule may bind its parser-visible corpus through bounded
literal/star patterns relative to an already declared instance root. That
relation belongs to the rule definition: it neither creates another root or
selection nor asks the instance to enumerate fixed interiors of its kind.
Resolution joins the bound root and definition patterns once; Nx hashes those
exact globs and the runner evaluates the corresponding Git-visible regular
files. An individual pattern may describe an optional interior, but a selected
application must resolve at least one subject before evaluation.

## Blueprint Relations

`include` and `contains` are reserved future relations between independently
constructible kinds. `include` would add same-anchor law; `contains` would bind
a closed child kind below a parent-owned mount. Neither is active in the
current release, and neither is needed to organize one blueprint's own rules.

## Definition And Resolution

```text
Habitat
  -> Blueprint
    -> Rule packet
      -> Instance
        -> Rule application

Capability -> additive facet
Niche      -> governed community
```

The governing distinctions are:

```text
Blueprint defines kind.
Packet states claim.
Instance declares facts.
Capability adds facets.
Niche governs community.
Application bounds execution.
```

## Current Realization

The accepted `@habitat-ai/sdk` protocol-1 policy pack admits the exact sorted
members declared in [its manifest](../packages/core/sdk/habitat-pack.json).
`runtime-process-runtime@1` closes the private process binding and execution
owner; it is neither a new package nor a public lifecycle facade.
`runtime-definition@1` is the immutable original cold private definition
closure. `runtime-definition@2` independently closes the provider-plan
authoring owner and its behavior proofs; neither version inherits, falls back,
or traverses the other version's assets, and neither is a live runtime or an
`app@2` successor. The version-1 resource and service
closures preserve their `habitat-cli-v0.5.13` bytes. Their complete version-2
successors retain the same law and structure while narrowing Grit acquisition
to definition-owned `rootPatterns`.
`runtime-derivation@1` is the immutable topology-only predecessor;
`runtime-derivation@2` is an independent complete definition for the finished
derivation owner, with no inheritance, fallback, or cross-version traversal.
`runtime-bootgraph@1` is the closed private package-less lifecycle-ordering
structure. Policy-pack carriage copies only its definition and runner assets;
it neither bundles bootgraph implementation nor creates a public bootgraph face
or an SDK-to-bootgraph source/build edge.
`runtime-compiler@1` is the closed private package-less compiler structure.
Policy-pack carriage copies only its definition and runner assets; it neither
bundles compiler implementation nor creates a public compiler face or an
SDK-to-compiler source/build edge.
`service@3` is not a new kind or relation. It is the complete consumer-facing
service successor whose official Effect-oRPC bootstrap is projected through
the terminal SDK while SDK-internal services preserve an acyclic earlier
selection.

Protocol 1 already supports nested declared rule assets. It does not realize
blueprint relations, capability activation, niche admission, inheritance,
cross-version asset traversal, or implicit directory discovery. That narrow
protocol is a release boundary, not the whole ontology.

## Relations

- [[AUTHORITY|Habitat authority]]
- [[BLUEPRINT-COMPOSITION|Blueprint composition]]
- [[README|Habitat policy index]]
- [[blueprints/skill|Blueprint direction]]
- [[../docs/system/HABITAT_ARCHITECTURE|Canonical architecture]]
- [[../docs/system/HABITAT_RUNTIME_REALIZATION|Runtime realization]]
