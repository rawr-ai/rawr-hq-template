---
name: habitat-runtime-bootgraph-frame
description: Mental model for Habitat's private synchronous lifecycle-ordering owner and its cold compiler handoff.
---

# Runtime Bootgraph Frame

Runtime bootgraph turns compiler-owned resource/provider dependency data into
one deterministic acquisition order and its exact reverse rollback and release
orders.

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

The bootgraph consumes only the compiler-owned closed `BootgraphInput`. It
returns recursively frozen ordinary order data with one selection-backed
resource key per compiler node and one corresponding provider module. It does
not consume a compiled plan, reference table, or observation seed, and it never
reads or decodes config, builds a provider, invokes Effect, acquires or releases
a resource, registers a finalizer, or publishes an observation.

Habitat owns the exact closed filesystem topology. Nx owns the one real private
compiler edge and task graph. TypeBox and TypeScript own DTO and capability
closure. Owner tests prove ordering, refusal, reference reuse, cold behavior,
and cache restoration and invalidation.

## Vocabulary

bootgraph, lifecycle order, boot resource key, boot resource module,
acquisition order, rollback order, release order
