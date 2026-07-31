# Habitat Authority Ontology

**Status:** Normative conceptual reference

## Purpose

This document names the durable Habitat authority concepts and their
relationships. Physical layouts, parsers, catalogs, and release protocols
realize this model; they do not redefine it.

The core nouns are:

```text
Habitat
Blueprint
Instance
Capability
Niche
Application
```

## Habitat

A Habitat is a repository's authority plane. It is the place where the
repository defines, admits, evaluates, repairs, constructs, and governs its
own matter.

Habitat is not the CLI, one policy tree, a generated index, or a runner. Those
are realizations that serve the authority plane.

## Blueprint

A blueprint defines one constructible architectural kind. It owns that kind's
identity, version, anchor grammar, positive topology, source relationships,
construction, migration, and governance.

Blueprint nesting is monotonic kind narrowing. A child is a more specific kind,
not a support folder, execution mode, current defect, or product instance.
Blueprint authority is a lower bound: later authority may add constraints but
may not silently weaken the kind.

One blueprint has one singular structural spine. That anchor lives directly at
the blueprint root as `structure.toml`. A directory is earned only by a
genuinely plural, context-bearing rule family; nesting is not a convention for
singular relations.

## Instance

An instance is concrete repository matter admitted under one primary
blueprint. Its `habitat.toml` declares facts: identity, blueprint version,
roots, selections, and later capability requests. It does not author policy.

Manifest placement is blueprint-defined. A multi-root instance still has one
blueprint-owned anchor and one manifest; its other roots are declared or
derived facts.

## Capability

A capability is an additive reusable facet that an admitted instance may
possess. It names behavior or participation that can cross blueprint kinds.
It is not a constructible kind, provider implementation, or generated shape.

Capabilities add facts, requirements, checks, and relationships. They cannot
erase blueprint authority or another capability's accepted facts. Capability
nesting is explicit namespacing and relation, not implicit inheritance.

When realized, one capability definition has one singular root anchor,
`capability.toml`. That file and its schema are reserved future authority; the
current release slice does not discover or interpret them.

## Niche

A niche is a governed community of admitted instances selected by accepted
facts. It may govern any combination of kinds, capabilities, ownership,
metadata, or explicit membership.

A niche is not a blueprint. It does not construct a kind, redefine a
capability, or admit raw folders without instance identity. Niche nesting is
community containment, not type inheritance. Overlap is valid only when
governance is additive or the conflict is explicit.

When realized, one niche definition has one singular root anchor,
`niche.toml`. That file, admission grammar, and derived-membership protocol are
reserved future authority. Current `.habitat/rawr/**` paths are physical
repository-policy overlays; they are not the complete definition of a niche.

## Application

A resolved application is evaluator output:

```text
blueprint rule + admitted instance facts -> bounded execution
```

It carries provenance and exact scope. It is not a new policy owner, instance,
kind, capability, or niche. Nx may schedule it and a runner may execute it
without acquiring its authority.

## Authority Order

Authority narrows additively:

```text
Habitat
  -> Blueprint
    -> Instance
      -> Capability
        -> Niche
          -> Application
```

The final arrow is execution resolution, not another governance layer.

The governing distinctions are:

```text
Blueprint defines kind.
Instance declares facts.
Capability adds facets.
Niche governs community.
Application bounds execution.
```

## Current Realization

The current definition checkpoint contains seven root v3 blueprint records:
`package`, `resource`, `provider`, `service`, `plugin`, `plugin-nx`, and `app`.
They describe `blueprint.toml`, instance-manifest roots and selections, and one
root `structure.toml` per kind. The source catalog schema-admits these
definitions, but they have no instances or resolved applications and are not
accepted into a released policy pack.

The released v2 registry and its 33 rules remain the sole execution authority.
Only the `package@1` proof-axis grammar is frozen: `contract` and `semantics`
member ids map to exact files. `package@1` remains outside release-pack
acceptance until resolution proves exact equality between selected ids and
present proof members. Every other kind's proof axes remain candidates.

Blueprint-declared root relations are also unresolved. Current manifests can
name `project` and `source` independently even where the service, app, and
plugin structures mean exactly `source = project/src`. First release-pack
acceptance and instance activation must derive or positively bound that
relation so an instance cannot redirect `source` elsewhere.

This checkpoint also does not realize `capability.toml`, `niche.toml`,
capability activation, niche admission, or cross-authority conflict resolution.

That narrow protocol is a release boundary, not the whole Habitat ontology.
Later realization must extend this model without turning transitional packet
paths, catalogs, runners, or product inventories into peer concepts.

## Relations

- [[AUTHORITY|RAWR Habitat authority]]
- [[README|Habitat policy index]]
- [[blueprints/skill|Blueprint direction]]
- [[../docs/projects/shared-habitat-substrate/CORPUS|Shared Habitat substrate corpus]]
- [[../openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Habitat Blueprint Definition Checkpoint|Definition checkpoint record]]
- [[../docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec|Canonical architecture]]
- [[../docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec|Runtime realization]]
