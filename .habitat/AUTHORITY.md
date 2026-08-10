# Habitat Authority Boundary

Habitat owns the reusable constitutional law in this directory and the generic
machinery that admits and executes it. Repositories own concrete instances and
qualified overlays. Evaluation does not invent architecture or product
behavior.

[[AUTHORITY-ONTOLOGY|The authority ontology]] defines blueprints, rule packets,
instances, capabilities, niches, and rule applications.
[[BLUEPRINT-COMPOSITION|Blueprint composition]] explains how one blueprint
keeps readable internal layers without multiplying runtime concepts.

## Definition Law

A blueprint defines one constructible kind. One selected instance names one
blueprint and version through one blueprint-owned `habitat.toml`.

The blueprint root owns its identity, instance grammar, one complete positive
`structure.toml`, and a sorted set of ordinary rules. Context-bearing authoring
directories may group focused rule packets, but they add no schema object,
manifest, instance, project, application, target, or merge behavior.

The policy pack preserves every declared definition and runner asset at its
recursive relative path. Catalog resolution rejects missing, escaping,
wrong-kind, or drifted assets before evaluation. Nx projects rule applications
onto the admitted owner; it does not reinterpret policy.

## Evaluator Law

Habitat structure owns positive filesystem topology and closure. Grit owns
small parser-visible source relations over bounded subjects. TypeScript owns
inference, assignability, contract compatibility, and unused source. Nx owns
project identity, cross-project edges, scheduling, and cache. Behavior tests
own runtime outcomes, ordering, lifetime, and failure mapping.

No Habitat rule reparses source through a custom runner, simulates TypeScript,
or expands into a second model of the whole kind. No structural or source law
is recreated in ESLint or a phase script.

## Kind Boundaries

`package` owns a closed product-free support shell. `resource` owns a
provider-neutral runtime capability contract. `provider` owns one concrete
realization. `service` owns a request-bound domain capability and its public
client. `plugin` projects capabilities into a runtime surface. `app` selects
and composes one product. Narrower kinds add only their own role law.

Capabilities are additive facets across admitted kinds. Niches are governed
communities of admitted instances. Reserved blueprint relations may later
compose independently constructible kinds; none is activated in this release.

## Service Kind

A service is a narrowing capability funnel:

```text
application context
  -> service base
    -> service middleware
      -> module context
        -> procedure handler
```

Contracts and routers compose upward. Context and ready capabilities flow
downward. The service root owns its public client, complete base context,
aggregate contract, one implementation lineage, aggregate router, and fixed
spine. Modules own domain branches and curate the context used by their
procedure handlers. Router leaves are procedure-authoring sites. Model law
stays with its nearest semantic owner.

Optional persistence remains service-owned and closed around migrations,
physical schema, stores, and root middleware projection. Modules consume the
resulting capabilities through context; they do not reach into database or
provider implementation.

oRPC owns contracts, implementers, middleware, handlers, clients, and
request-scoped context semantics. TypeBox reaches oRPC through the one Habitat
Standard Schema bridge. The official Effect-oRPC bridge owns Effect procedure
execution and its Promise boundary. Applications select providers and acquire
resources; plugins and apps own transport projection and orchestration.

Service law asserts positive topology and small adjacent relations. It does
not enumerate hostile syntax, acquire providers, author a second Effect
terminal, or promote module matter for access convenience.

## Repository Overlays

Rules under `.habitat/overlays` are qualified repository constraints rather
than reusable blueprint law. They may select exact owner-local inventory, but
cannot duplicate, weaken, or replace generic kind law.

## Current Realization

The accepted protocol-1 SDK pack contains `app@1`, `package@1`, `plugin@1`,
`plugin-nx@1`, `provider@1`, `resource@1`, `resource@2`,
`runtime-definition@1`, `service@1`, and `service@2`. Existing version-1
members remain immutable for exact existing selections. `runtime-definition@1`
closes only the cold private runtime-definition owner introduced by task 4.1;
it does not create `app@2`, a live runtime, or a native host. The version-2
resource and service definitions are complete acquisition successors with the
same semantic law and structure, narrower declared `rootPatterns`, and their
own recursive package closure and installed-consumer proof. Retained Habitat
owners select the successors explicitly; no inheritance, fallback, component
engine, or relation engine is part of this gate.

See [[README|the Habitat policy index]], [[AUTHORITY-ONTOLOGY|the authority
ontology]], [[BLUEPRINT-COMPOSITION|blueprint composition]], and
[[../docs/system/HABITAT_RUNTIME_REALIZATION|the runtime realization
specification]].
