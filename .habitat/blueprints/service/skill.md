---
name: service-capability-funnel
description: Author and review RAWR oRPC services as sealed capability funnels whose modules expose only the vocabulary their handlers need.
---

# Service Capability Funnel

This frame specializes the RAWR service blueprint for the pinned oRPC 2 and
official Effect extension lane. It guides authorship; the sibling Habitat
rules own source enforcement.

## Center

A service is a sealed domain capability suite. Read it as one narrowing flow:

```text
host
  -> client
  -> base
  -> implementation
  -> service
  -> module
  -> router
  -> handler
```

The host binds ready capabilities. `base.ts` declares the service context and
adds one native middleware author only when context-authored middleware needs
it. `impl.ts` implements the aggregate contract once,
then attaches service-wide middleware. A module derives its exact configured
branch, attaches only its owned middleware, and terminally curates the
vocabulary its handlers may author against. Router files compose completed
operations. Handlers own operation behavior.

Each descent reduces authored knowledge. A module does not recover root
assembly, reach into a sibling, or construct another implementer merely because
native oRPC context remains additive at runtime.

## Context

Context is organized by owner and lifetime:

| Lane | Owner | Lifetime | Meaning |
| --- | --- | --- | --- |
| `deps` | host | client | Ready outside capabilities. |
| `scope` | binding | client | Stable business identity and metadata. |
| `config` | host | client | Stable externally selected behavior. |
| `invocation` | caller | call | Request facts and correlation identity. |
| `provided` | middleware | execution | Acquired or derived capabilities that cross a later execution boundary. |

The public client binds `deps`, `scope`, and `config`; each call supplies
`invocation`. An acquired or derived capability that must cross a later
middleware or branch boundary travels under `provided`; otherwise terminal
curation emits only final handler vocabulary. Admission and refinement
middleware may instead narrow the `scope` or `invocation` lane whose facts it
owns.
When a service has no required per-call facts, the public call context is
optional and its client mapper supplies the still-required `invocation: {}`
lane rather than inventing a ceremonial request object. A module's terminal
curation maps explicit direct paths from those lanes to the smallest handler
vocabulary. That projection limits authorship, not runtime possession: oRPC
still merges context additively.

Context-only provider/acquisition middleware derives from the native author in
`base.ts`. Service-root middleware lives in direct simple kebab-case leaves,
exports the generic `middleware` value, and is imported by semantic alias in
`impl.ts`; it has no barrel. Root contract-aware middleware derives from the
unconfigured aggregate implementer and attaches in `impl.ts`.
Input-independent module-wide policy attaches in `module.ts`.
Input-independent reusable group policy may be authored from an unconfigured
router descendant rooted at `impl.<module>`, imported by its deliberate grouped
router leaf from `../middleware`, and attached across the operations that share
it. A policy used by one operation stays inline. A documented named policy
reused by several operations and requiring validated input remains in the
module middleware catalog and is attached by every consuming procedure leaf
through native `.use(...)`; reuse does not promote it to module-wide or group
attachment. Review owns both genuine reuse and descendant scope. Pinned oRPC
2 beta.20 router implementers expose
`.middleware(...)`; procedure implementers expose only `.use(...)` and
`.handler(...)`, with TypeScript owning that relation. No lane
uses `base.<module>`, `decorateMiddleware`, `.use` parameter extraction, or
configured `.middleware(...)` feedback. None needs a context wrapper, prepared
object, cast, custom type witness, or adapter that simulates a missing oRPC
authoring surface. Review owns that semantic simulation check.

This depth distinction follows pinned oRPC 2 beta.20 execution. Router/module
middleware is augmented onto each procedure at `inputSchemasLengthAtUse: 0`.
Procedure `.use(...)` records the current input-schema depth. Every policy that
consumes validated input therefore attaches through procedure `.use(...)`,
whether local or imported as a named reused policy. Because native
`disableInputValidation` can bypass schema execution, behavior proof must
establish that validation is enabled and precedes every such policy.

The independent authorship relation begins after curation: operation leaves
author from the matching `module.<contract path>.<operation>` descendant and
stop there. The separate composition
relation owns plain module operation trees and the sole aggregate router
implementation through the unconfigured root `impl`.

Ready dependencies are selected directly during terminal curation. Direct
selection may use an expression body. Translation or synchronous provider
construction and failure containment may use a block body while remaining the
same inline stage with one terminal `next(...)` return. Standalone named middleware exists only
for a stage that is independently meaningful, reusable, or order-sensitive,
including a real guard, acquisition, or enrichment. A module-local dependency
stays inside its module; service-root middleware owns only a capability that is
true for the whole service.

oRPC merges context at top-level keys. A later writer replaces a nested lane;
it does not recursively merge it. Prefer one writer for a nested lane or a
flatter native key. When one provider legitimately extends an inherited
`provided` bucket, it preserves the visible members explicitly. Never introduce
a merge helper, lineage witness, or cast to make independent nested writers
appear composable.

## Native oRPC 2 Seam

`base.ts` always exports `Context`, exports one `os.$context<Context>()` author
only when context-authored middleware consumes it, and never imports the root
contract, `implement`, or the Effect extension. `impl.ts` admits the official
Effect extension, calls `implement(contract).$context<Context>()` once, and
exports two stages of that lineage:

- `impl`: the unconfigured contract implementer;
- `service`: the root-configured stage used for handler authorship.

Configured modules author procedures so their middleware applies. Module
router indexes compose implemented procedures as plain operation trees, and
the root router implements the aggregate contract once through the
unconfigured `impl.router(...)` stage. Implementing it through the configured
stage replays inherited middleware. `impl` is not a second implementer and
must not become a router SDK or lineage abstraction.

## Authorship

Each operation lives in `modules/<module>/router/<operation>.ts`; its
kebab-case filename maps to the lower-camel contract key. That operation is
the leaf's sole runtime export, authored from the matching configured
`module.<contract path>.<operation>` descendant. Module `router/index.ts`
composes leaves only. Root
`router.ts` composes plain module operation trees only.

Required module `contract/` and `router/` directories are their own access
points. Their indexes export the generic `contract` and `router` anchors while
direct semantic leaves hold operation or deliberate native-group variance.
Each leaf maps its kebab-case filename to one lower-camel export. Contract law
owns canonical direct import of contract leaves. Router indexes are
composition-only; TypeScript owns router completeness, Knip owns unreachable
leaves and import hygiene, and generated-client/API behavior proof owns the
complete public operation set. An optional `middleware/` directory follows the
same shape: native decorated middleware values are authored in leaves and its
index exposes semantic names. `module.ts` imports input-independent module-wide
middleware through `./middleware`; an operation leaf imports input-independent
group policy or named reused validated-input policy through `../middleware`.
Each imported name is attached at that destination. The directory is absent
when unused. Leaves never import their own index, router indexes do not consume
middleware, and no runtime loader or generator participates. Ordinary
collaboration may range anywhere inside one sealed module; the module root is
the containment boundary. Contract, context, and router laws own executable
direction inside that boundary.

Effect procedures use the official oRPC extension. Contracts own native error
maps, and handlers fail with their injected constructors in the Effect failure
channel. Effect owns execution, interruption, and resource safety;
Effect-oRPC owns only the bridge; oRPC owns contracts, middleware, routers,
clients, errors, and transports.

## Ownership Test

Before placing a capability, ask which boundary owns its meaning and lifetime.
Cross-module use is strong evidence for service ownership, but access alone does
not promote module meaning. A module owns its policies, genuine host-supplied
ports, and model when those concepts remain specific to that subdomain. A
standalone service owns its physical persistence regardless of how many modules
currently consume it; the database blueprint owns that placement and import
funnel. The service otherwise owns facts and capabilities that contextualize or
serve the suite as a whole.

Awkward service composition is a boundary falsifier. When extending or reading
a service feels clunky, inspect whether the service is concealing one of four
different owners: a repository-wide resource with its own neutral lifecycle, a
sibling service with independent domain truth and write authority, a plugin
that should only expose or orchestrate capabilities, or an application concern
that selects runtime providers and configuration. Size alone proves none of
these. If the concern has no independent lifecycle, truth owner, exposure
boundary, or runtime-selection role, keep the domain decision and transition in
the service rather than fragmenting it to make the tree look smaller.

An entity has stable domain identity that survives attribute changes and
participates in domain transitions. Persistence may evidence that meaning but
does not establish it by itself. TypeBox owns the canonical entity schema and
generated type. Put an entity at service root only when its identity or
invariants genuinely span modules; access alone never promotes module meaning.
Otherwise keep it in the owning module. A DTO is an operation or boundary
projection. It may pick, omit, refine, or compose entity schemas without
becoming entity authority. Database schema files describe physical mappings,
and stores are private persistence implementations whose types are inferred
from those mappings. Stores may map records into entities when the domain
models continuing identity; they may also return value or snapshot
projections. Entities never import database, transport, provider, or store
concerns. There is no database DTO category. The entity destination remains
structural-only until the shared TypeBox and platform-neutral source laws cover
it; do not move production domain schemas there under an incomplete law.

No custom implementer helper, provider algebra, context merger, prepared
context, cast-bearing client framework, or compatibility path belongs in this
kind. If the native vendor surface cannot express a required guarantee, prove
that exact gap before introducing the smallest adapter.

## Proof Ownership

Habitat owns topology and source relationships. Nx owns project and dependency
direction. TypeScript owns context inference and router completeness. Behavior
tests own middleware ordering, once-only execution, product outcomes, and
resource lifecycle. Structural tests do not duplicate Habitat law.

During the service migration, the closed spine topology, anchor, context,
composition, module-isolation, public-consumer, and router-authorship rules
remain advisory with empty baselines. They become enforceable only after the
complete selected service corpus satisfies the declared destination and its
focused proofs pass.

## Vocabulary

authority, base, capability, client, configuration, context, contract,
dependency, effect, failure, handler, host, implementation, invocation,
middleware, module, operation, policy, port, provision, router, scope, service
