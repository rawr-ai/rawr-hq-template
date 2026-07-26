# Working Frame Ledger

This is a prepend-only mental-model ledger, not architecture authority, a
backlog, or a second specification. Exact topology and source relationships
belong to [[.habitat/AUTHORITY|Habitat authority]] and its blueprint packets.
Durable lifecycle decisions belong to
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active OpenSpec]].

## 2026-07-25 - Selection Follows Consumer

An invocation-local model belongs to the module whose operations consume and
interpret it. Provider selected content exists only so status, test, and sync
can compare reviewed Git bytes with native inventory. Its DTOs, port,
marketplace policy, and resolution helper therefore narrow inside Providers.

Current-main and release derivation remain at the service root only for their
actual cross-module consumers. Passing the raw content-workspace capability
downward does not make provider selection shared, and moving the resolver out
of root middleware does not change Git or native-provider authority.

### Bag Of Keywords

Owner, provider, selection, context, resource, port, policy, helper, schema,
behavior, exact, delete, narrow.

## 2026-07-25 - Observation Follows Transition

An observation belongs to the transition whose policy interprets it, not to the
service root merely because an outside resource supplied the raw facts. Staged
index bindings exist so Releases can compare opening and closing source,
materialize bounded content, and decide release eligibility. Their DTOs, ready
port, resource adapter, and failure vocabulary therefore remain sealed
inside Releases.

The service context still carries the content-workspace resource downward.
That transport does not promote staged transition meaning into root ownership,
create a dependency registry, or authorize a second repository layer. This
checkpoint changes placement only; context, operation authorship, and runtime
behavior remain fixed.

### Bag Of Keywords

Observation, transition, release, module, resource, context, port, policy,
anchor, index, opening, closing, bounds, owner.

## 2026-07-25 - Capability Provision Is Not Context Narrowing

Native oRPC middleware merges contributed capabilities into its inherited
context. A smaller contribution therefore does not remove wider host or service
lanes from the handler type. Name such middleware for the capability it
provides and record it as enrichment until the base and module boundary prove
an exact authoring view.

This distinction keeps progress truthful. Removing a sibling implementation
edge and supplying a ready capability is valuable, but it does not close the
context funnel by itself. Exact narrowing belongs to the coherent root-context
checkpoint where reserved lanes can become unavailable to module handlers.

### Bag Of Keywords

Context, capability, middleware, merge, enrich, narrow, handler, boundary,
truth, exact.

## 2026-07-25 - Capabilities Cross Context

A capability used by several modules belongs at the service boundary only
when its meaning survives every consumer. Its port names what callers may ask;
its policy interprets those facts for the service domain. The host supplies the
outside resource once, and each module projects only the ready capability its
handlers need.

Passing that capability downward is not permission for modules to import one
another. A sibling implementation edge turns one module into an accidental
service root and hides the real handoff. Promote the shared meaning, keep each
operation in its router handler, and leave unrelated context repair for its own
checkpoint.

### Bag Of Keywords

Capability, context, port, policy, resource, service, module, handler,
projection, promote, narrow, sibling.

## 2026-07-25 - Shared Policy Stays Neutral

Service-level policy may be consumed by several modules without owning any
module's public result. It returns inert domain facts or neutral failure detail.
Each operation handler maps those facts into the request, result, issue, and
settlement vocabulary owned by its module.

Moving a module issue or response shape upward would not share policy; it would
spread one module's semantics across the service. Leaving genuinely common
derivation inside one module would create the opposite error: a sideways
implementation dependency. The root model holds only the meaning that survives
both consumers.

### Bag Of Keywords

Policy, fact, detail, module, handler, result, issue, neutral, map, root,
sideways.

## 2026-07-25 - One Router Face, Named Authorship

A service module has one public router face: module `router.ts`. It composes
completed values from named `router/*.router.ts` files and contains no operation
transition itself. The named files are the oRPC authoring sites: each owns one
operation or one meaningful group whose context, guard, or domain role holds it
together.

This is a narrowing hierarchy, not a choice between equivalent layouts. A
`router/index.ts` would create another reachable face; an inline handler in
module `router.ts` would collapse composition and authorship back together.
Habitat asserts the one positive shape. Future generic blueprint variants
belong upstream and are not a reason to recover local ambiguity.

### Bag Of Keywords

Module, router, leaf, group, handler, compose, context, guard, domain, face,
variant, upstream.

## 2026-07-24 - Documentation Explains Relations

JSDoc belongs at a declaration when another source file depends on its meaning.
It explains what the symbol owns or performs, why that boundary exists, and how
the symbol participates in module or system behavior. Wide callable boundaries
also explain the role of each parameter.

An `AGENTS.md` is the product-context and navigation surface at an ownership
boundary. It explains why the component exists, its behavior, concepts,
boundaries, flow, interfaces, routes, and validation without narrating the
implementation or duplicating JSDoc.

### Bag Of Keywords

Purpose, boundary, behavior, concept, flow, interface, route, symbol, import,
relation, parameter, module, context.

## 2026-07-24 - Ownership Follows Meaning

Access does not assign ownership. A fact belongs to the domain whose meaning it
carries, even when another layer consumes it. Hoisting for convenience creates
mirrors; moving shared meaning into one consumer creates sideways reach.
Context carries admitted capabilities downward without relocating their domain
meaning.

### Bag Of Keywords

Access, owner, meaning, domain, consumer, mirror, context, canonical, downward.

## 2026-07-24 - Capability Narrows Downward

A service is a narrowing capability funnel rather than a web of registries and
reconstructed contexts. The host admits external capability, the service owns
the capability suite, each module owns a subdomain, and each operation consumes
only the context admitted to that boundary. Reaching upward, sideways, or
around the operation signals a misplaced owner.

Effect owns execution, failure, interruption, and resources. Effect-oRPC owns
adaptation at the operation boundary. TypeBox owns structural schemas, types,
and validation. Domain policy owns decisions. Resources and providers own
outside-system mechanics.

See [[.habitat/blueprints/service/skill|the service frame]] for the current
direction and the adjacent Habitat packets for exact enforceable relations.

### Bag Of Keywords

Funnel, capability, context, service, module, operation, policy, resource,
provider, schema, downward, narrow, owner.

## 2026-07-24 - Routers Author Behavior

An oRPC operation is an executable leaf, not an assembly placeholder for a
second request-context-result API. Routers are where admitted input and context
become behavior. Pure reusable decisions may move into domain policy, and
outside work may cross a resource boundary, but the operation is not exported
as a detached runner.

Natural operation groups may share a guard or capability and compose as plain
router objects. Grouping signals semantics; it is not a device for hiding
operation logic or rebuilding context.

### Bag Of Keywords

Router, operation, handler, input, context, guard, group, policy, resource,
behavior, compose, native.

## 2026-07-24 - Direction Precedes Enforcement

A blueprint seed names the kind of thing, its ownership, its inward direction,
and the states toward which sound work should move. Habitat then closes invalid
filesystem and source relationships. Tests verify product behavior. None of
these surfaces should impersonate another.

A keyword bag is a selection instrument. Each entry is one weight-bearing word;
a two-word term is admitted only when it names one established concept.

### Bag Of Keywords

Direction, law, kind, owner, boundary, inward, context, behavior, structure,
source, test, choice.

## 2026-07-24 - Prompts Carry The Frame

A fresh challenge receives a fresh owner; continuing work stays with its
current owner. A useful prompt transmits the selected keyword bag, ownership
direction, authoritative grounding, falsifiers, write boundary, and expected
evidence. Habitat remains the correction latch rather than a substitute for
shared understanding.

### Bag Of Keywords

Fresh, owner, frame, bag, direction, ground, falsifier, scope, evidence, latch.
