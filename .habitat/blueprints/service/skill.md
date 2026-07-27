---
name: service-capability-funnel
description: Think, author, and review RAWR oRPC services as sealed capability funnels whose handlers own operations and whose models own reusable meaning.
---

# Service Capability Funnel

Use this frame when designing, authoring, reviewing, or simplifying a RAWR
service. It is a judgment aid, not an activation surface and not a substitute
for the blueprint rules. Habitat catches drift after authorship; this frame
should make the right destination feel natural before code exists.

Ground the service inside the
[[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec|canonical system architecture]],
the
[[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec|runtime realization architecture]],
and the [[../skill|blueprint direction]]. Those system specifications establish
the architectural kinds and their relations. This frame owns the narrower
service-authoring direction when an older shell example or directory name
conflicts with the closed service blueprint.

## Center

A service is a sealed domain capability suite. It is not a web of mutually
reachable helpers and it is not a folder around unrelated operations. Read it
as a narrowing funnel:

```text
host
  -> base
  -> service
  -> module
  -> router
  -> handler
```

The host begins with everything needed to run the application. Standalone
`base.ts` declares initial context, constructs the sole configured oRPC base,
and may expose one separate context-seeded native middleware author.
`impl.ts` derives the one service from the
imported base plus genuine cross-cutting middleware. A module derives its exact
`service.<module>` branch and attaches completed capability middleware authored
from that author. TypeScript infers additive composition. The root router
composes completed module routers; the handler acts on the resulting capability
surface.

Each descent reduces what source is allowed to know and author. Native oRPC
runtime context remains additive; an upward import that recovers raw context, a
sibling reach, or a second middleware factory still widens the authored
capability surface and therefore changes the architecture.

Import spelling should reveal that descent. Inside one module, relative paths
make colocality visible. The service-private alias names only genuinely
service-wide `service/model/**` meaning; it does not disguise a same-module,
sibling, runtime, or unowned shared edge. Cross-package capabilities arrive
through public package exports. These spellings do not optimize the Nx graph;
they make ownership legible inside the project Nx already recognizes.

## Layers

The root owns what is true for the whole service. A module owns what is true
for its subdomain. A handler owns one operation. The model owns meaning that
remains meaningful without the handler.

Service-level model matter earns its placement when it expresses meaning for
the capability suite as a whole or declares a capability admitted at the
service boundary. Cross-module use is strong evidence, but not the only
criterion: a boundary port can remain service-owned even when one module is
its current consumer. Mere access does not promote module domain matter. A
module does not import a service dependency registry; it receives the
capability through context. A port may be declared as inert model meaning, but
its ready implementation still enters through the service boundary.

Module-level model matter belongs to that module's domain. Policies decide.
DTOs and schemas describe. Errors name admitted failures. Helpers perform
small subordinate mechanics. Ports describe outside capabilities. Prompts and
actors retain their domain meanings. Persistent stores require a separately
owned, positively closed database boundary at the service root; they do not
enter a module or an unbounded `db` directory merely because a service needs
persistence. Named root middleware may turn a ready context dependency into
store capabilities. Modules consume those capabilities through inherited oRPC
context rather than importing database source.

Every model fact is a direct semantic leaf. Contracts, modules, routers, and
other model leaves import the concrete leaf they use. A model `index.ts`
conceals that ownership edge and creates a second aggregation surface, so the
service structure does not admit it. A module router has one explicit
aggregation surface instead: module `router.ts` composes named operation values
from `router/*.router.ts`.

Names such as `shared`, `internal`, and `dependencies` evade ownership rather
than express it. They widen possibility precisely where the structure should
narrow it.

## Authorship

The native oRPC handler is the operation authoring site. It receives
TypeBox-admitted input and the module-admitted capability surface, applies operation guards
and sequencing, calls policies or ports where their independent meanings
warrant extraction, and returns the declared result through Effect.

A detached `runOperation(request, dependencies)` function is not a harmless
organization choice. It recreates input, context, execution, and result
authority outside oRPC, leaving the handler as ceremony. Extract only a pure
decision that can be understood and tested without the operation, a small
stateless mechanic, or an outside-system capability call. Keep the transition
itself in the handler.

When a Promise-returning port crosses into an Effect handler, use the native
Effect operation whose failure, interruption, and settlement semantics match
that operation. A generic dependency adapter invents a second execution policy
between Effect-oRPC and Effect. Effect owns Promise adaptation and interruption;
Effect-oRPC owns boundary execution; the operation owns its qualified domain
failure and mutation-settlement decisions.

The fastest test is conceptual: if the extracted function's name is the
operation and its parameters reconstruct the handler environment, the
operation has been moved to the wrong authoring site.

## Router Scale

Every module uses the same router shape. Module `router.ts` imports completed
operation leaves or groups from `router/*.router.ts` and composes one plain
router object. It does not contain business transitions. Each named router file
is an authored boundary with enough room for the operation behavior it owns.

A named router file may own one standalone leaf. That is not a semantic group
and needs no group explanation. When several operations share context, a guard,
or one domain role, the named router file may export their completed plain
subrouter. That real grouping judgment should be explicit:

```typescript
/**
 * @purpose What cohesive operation subset this router owns.
 * @capability Which capability, guard, or policy the subset shares.
 * @behavior What transition or observation the subset performs.
 * @relation How the subset differs from neighboring operation groups.
 */
```

The comment explains why the group exists. It should not narrate syntax or
repeat operation names.

## Context

Context is capability, not a transport bag. `deps`, `scope`, `config`,
`invocation`, and `provided` are host or service transition lanes. A router
that reads them has reopened a wider layer and made the module boundary false.

Middleware is valid when it guards or enriches a real capability.
It is not a second place to assemble service or module context. Root context
seeding belongs to `base.ts`; a module middleware owns one capability
contribution and `module.ts` owns its attachment. Middleware names should reveal
the capability or guard they add, not claim generic context ownership.

Middleware authorship stays visibly base-derived and named. A module
middleware source exports a named `const` created from the native author bound
in `base.ts`; service-wide SDK telemetry extensions remain separately named
framework values.
A middleware never originates from the already-derived `service` or `module`
implementer and then feeds back into that branch. Native `.use` attachments
name the completed middleware in their first argument instead of hiding a
guard or projection in an inline or local plain callback. A later input
selector remains an ordinary callback.

Native oRPC middleware contributions merge with the current context. Returning
a smaller object or passing an explicit `.use<Context>(...)` argument does not
remove inherited lanes and is not a narrowing proof. The standalone base
establishes initial context and implementation once; each `module.ts` derives
the matching service branch and attaches named middleware without explicit type
arguments. TypeScript infers the contribution. Owner-local resource and handler
cuts remove broad lanes at their source; no wrapper, witness, source-spelling
blacklist, or shadow context pretends the runtime object became subtractive.

## Native Authorities

The service owns callable contracts, operation meaning, handler behavior, and
domain policy. TypeBox owns structural schemas, validation, and generated
TypeScript types. Model policy owns canonicalization and cross-field decisions
that structure cannot express.

oRPC owns operation, router, middleware, context, and transport mechanics.
Effect owns execution, typed failure, interruption, and resource safety.
Effect-oRPC owns the adaptation between those two systems. Resources declare
outside capability contracts; providers implement their mechanics; the
app and runtime profile select providers; runtime realization acquires, binds,
and releases the selected ready values. A wrapper is useful only when its
domain meaning is narrower than the native authority it wraps.

## Review Lens

Look downward, not sideways:

- Which layer owns this meaning?
- Which capabilities may the next layer author against?
- Is the handler still visibly the operation?
- Does an extraction retain independent meaning without the operation?
- Does a model placement express shared domain meaning rather than access?
- Does a router group represent a real semantic subset?
- Can an author work inside this layer without learning hidden sibling or host
  machinery?

When an answer depends on tracing a web of imports, the funnel has already
widened.

## Vocabulary

authority, boundary, capability, context, contract, decision, dependency,
effect, failure, handler, host, model, module, operation, policy, port,
projection, resource, router, schema, service, store
