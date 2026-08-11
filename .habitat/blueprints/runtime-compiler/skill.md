---
name: habitat-runtime-compiler-frame
description: Mental model for Habitat's private synchronous process-plan compiler and its cold handoffs.
---

# Runtime Compiler Frame

Runtime compilation projects one selected process from a complete normalized
authoring graph. It closes only the selected roles' service, semantic,
resource/provider, workflow, Effect-reference, and web-reference relations.

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

The compiler consumes the exact cold `Entrypoint` and normalized graph. It
returns a recursively frozen process plan, a private table retaining exact cold
provider and service references, and inert observation seed data. It does not
consume derivation lookup tables or portable artifacts, and it never reads
config, invokes authored code, acquires a resource, binds a service, mounts a
harness, or publishes an observation.

Habitat owns the exact closed filesystem topology. Nx owns the two real private
dependency edges and task graph. TypeBox and TypeScript own DTO and capability
closure. Owner tests prove planning behavior, derivation handoff, refusal, and
cache restoration and invalidation.

## Vocabulary

compiled process plan, process closure, cold reference table, provider
dependency graph, execution registry input, observation seed
