---
name: habitat-service-capability-funnel
description: Mental model for a sealed service whose context and authorship narrow toward operation handlers.
---

# Service Capability Funnel

A service owns domain truth and callable capability. Its structure is a
narrowing funnel:

```text
host
  -> client
  -> base
  -> implementation
  -> service
  -> module
  -> router leaf
  -> handler
```

The host binds ready capabilities. `client.ts` binds stable construction
context. `base.ts` declares the context vocabulary. `impl.ts` creates one
native contract implementation lineage and attaches service-wide middleware.
Each `module.ts` descends from its configured branch and curates the smallest
vocabulary its handlers need. Router leaves author operations; module-root and
service-root routers only compose completed values. The handler owns the
operation transition directly.

Context flows downward by owner and lifetime:

| Lane | Owner | Meaning |
| --- | --- | --- |
| `deps` | host | Ready outside capabilities |
| `scope` | binding | Stable business identity |
| `config` | host | Selected stable behavior |
| `invocation` | caller | Per-call facts |
| `provided` | middleware | Acquired or derived execution capabilities |

Each descent removes knowledge. A module does not recover root assembly, enter
a sibling, construct a provider, or pass whole context lanes to a handler.
Terminal curation projects explicit values. Native oRPC may retain additive
runtime context; that possession does not grant authorship.

Contracts own public schemas and error vocabulary. Resource contracts own
provider-neutral external capabilities. Service model kinds own only named
domain roles: DTOs, entities, errors, policy, and ports. Vague `shared`,
`internal`, `dependencies`, and `helpers` folders erase authorship and are not
neutral destinations.

Every present model kind exposes one `index.ts` import face over direct
semantic leaves. The barrel adds no policy or behavior, and `model/index.ts`
does not exist because the service model is not one undifferentiated catalog.

One module contract index exposes its generic contract anchor over direct
semantic leaves. Named `*.router.ts` leaves author matching operations without
a router barrel. Optional module middleware has an indexed catalog; optional
service-root middleware has direct semantic leaves and no index. Production
source remains sealed from package-root proof.

Habitat proves topology and source direction. TypeScript proves inference and
router completeness. Behavior proof owns middleware order, once-only
execution, outcomes, and resource lifecycle.

## Vocabulary

authorship, capability, context, contract, handler, module, router, service
