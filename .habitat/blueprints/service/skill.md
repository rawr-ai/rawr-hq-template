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
one native middleware author. `impl.ts` implements the aggregate contract once,
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
| `provided` | middleware | execution | Acquired or derived capabilities. |

The public client binds `deps`, `scope`, and `config`; each call supplies
`invocation`. Capability providers extend `provided`; admission and refinement
middleware may narrow the `scope` or `invocation` lane whose facts it owns.
When a service has no required per-call facts, the public call context is
optional and its client mapper supplies the still-required `invocation: {}`
lane rather than inventing a ceremonial request object. A module's terminal
curation maps explicit direct paths from those lanes to the smallest handler
vocabulary. That projection limits authorship, not runtime possession: oRPC
still merges context additively.

Context-only provider/acquisition middleware derives from the native author in
`base.ts`. Root contract-aware middleware derives from the unconfigured aggregate
implementer and attaches in `impl.ts`. Named module policy that needs only
initial context and module errors derives from `impl.<module>.middleware(...)`
and attaches once to `service.<module>`. Policy that also needs root-configured
output is an inline callback directly in `service.<module>.use(...)`. No lane
uses `base.<module>`, `decorateMiddleware`, `.use` parameter extraction, or
configured `.middleware(...)` feedback. None needs a context wrapper, prepared
object, cast, or custom type witness.

The independent authorship relation begins after curation: operation leaves
author from `module.<operation>` and stop there. The separate composition
relation owns plain module operation trees and the sole aggregate router
implementation through the unconfigured root `impl`.

Ready dependencies are selected directly during terminal curation. Middleware
exists only for a real guard, acquisition, or enrichment. A module-local
provider stays inside its module; service-root middleware owns only a capability
that is true for the whole service.

oRPC merges context at top-level keys. A later writer replaces a nested lane;
it does not recursively merge it. Prefer one writer for a nested lane or a
flatter native key. When one provider legitimately extends an inherited
`provided` bucket, it preserves the visible members explicitly. Never introduce
a merge helper, lineage witness, or cast to make independent nested writers
appear composable.

## Native oRPC 2 Seam

`base.ts` exports one `os.$context<Context>()` author and never imports the root
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
the leaf's sole runtime export, authored from the configured
`module.<operation>` branch. Module `router/index.ts` composes leaves only. Root
`router.ts` composes plain module operation trees only.

Required module `contract/` and `router/` directories are their own access
points. Their indexes export the generic `contract` and `router` anchors while
direct semantic leaves hold operation or deliberate native-group variance. An
optional `middleware/` directory follows the same shape: native middleware is
authored in leaves, its index exposes semantic names, and `module.ts` attaches
them. The directory is absent when unused. Leaves never import their own index,
and no runtime loader or generator participates.

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
