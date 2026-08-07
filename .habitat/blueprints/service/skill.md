---
name: habitat-service-capability-funnel
description: Mental model for a sealed service whose context and authorship narrow toward operation handlers.
---

# Service Capability Funnel

A service owns domain truth and callable capability. Authorship narrows while
completed values compose:

```text
authorship: contract -> implementation -> configured service -> module -> operation
composition: operation -> module router -> root router -> client
invocation: application -> client -> operation -> handler
```

The application binds ready resources and public service clients. `client.ts`
is the sole public package face: transport owners receive the aggregate
contract, while service consumers receive the in-process client. Client
construction privately binds the root router. Another service consumes that
client rather than entering the contract or private service tree. `base.ts`
declares the context vocabulary. `impl.ts` creates one
native contract implementation lineage and attaches service-wide middleware.
Each `module.ts` descends from its configured branch and curates the smallest
vocabulary its handlers need. Router leaves author operations; module-root and
service-root routers only compose completed values. The handler owns the
operation transition directly.

Context flows downward by owner and lifetime:

| Lane | Owner | Meaning |
| --- | --- | --- |
| `deps` | application | Ready outside capabilities and service clients |
| `scope` | binding | Stable business identity |
| `config` | application | Selected stable behavior |
| `invocation` | caller | Per-call facts |
| `provided` | middleware | Acquired or derived execution capabilities |

Each descent removes knowledge. A module does not recover root assembly, enter
a sibling, construct a provider, or pass whole context lanes to a handler.
Terminal curation projects explicit values. Native oRPC may retain additive
runtime context; that possession does not grant authorship.

Context merging is shallow. Middleware that replaces a nested lane preserves
the members required below it rather than assuming a recursive merge. A
request-derived capability descends from the single service base exported by
`base.ts`; a module may then curate that context for its own branch. Operations
receive the ready result rather than a provider or factory.

Contracts own public schemas and error vocabulary. Resource contracts own
provider-neutral external capabilities. Service model kinds own only named
domain roles: DTOs, entities, errors, policy, and ports. Vague `shared`,
`internal`, `dependencies`, and `helpers` folders erase authorship and are not
neutral destinations.

Transport, host startup, and orchestration live above the service in plugins
and applications. The service remains request-bound and cohesive; it does not
grow a hidden control plane between sibling modules.

Every present model kind exposes one `index.ts` import face over direct
semantic leaves. The barrel adds no policy or behavior, and `model/index.ts`
does not exist because the service model is not one undifferentiated catalog.

One module contract index exposes its generic contract anchor over direct
semantic leaves. Named `router/<name>.ts` leaves author matching operations without
a router barrel. Optional module middleware has an indexed catalog; optional
service-root middleware has direct semantic leaves and no index. Production
source remains sealed from package-root proof.

Habitat structure proves the closed topology. TypeScript proves source
assignability, inference, and router completeness. Behavior proof owns
middleware order, once-only execution, outcomes, and resource lifecycle.

The service kind does not prescribe a per-service Effect prototype extension.
The selected runtime adapter owns how Effect execution enters the oRPC handler
boundary.

## Vocabulary

**What:** capability, client, context, contract, handler, module, router, service

**Why:** clarity, closure, locality, ownership, reuse

**How:** Effect, Habitat, oRPC, structure, TypeBox
