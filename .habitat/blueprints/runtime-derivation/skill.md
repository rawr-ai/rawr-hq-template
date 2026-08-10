---
name: habitat-runtime-derivation-frame
description: Mental model for Habitat's private topology-only runtime-derivation owner and its bounded handoff.
---

# Runtime Derivation Frame

Runtime derivation turns one selected cold entrypoint and profile into a closed,
deterministic `NormalizedRuntimeTopology`. It copies and freezes launch identity,
normalizes process roles and app-plugin facts, and exposes only typed topology
edges needed by the next private phase.

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

This version owns only the derivation node's normalized topology handoff. It
does not own complete derivation, the public SDK, portable artifacts, provider
selection or acquisition, executable plans or tables, runtime execution, or
process and resource lifecycle.

Runtime schema supplies structural decoding. Runtime definition supplies the
cold declarations and launch identity. Both are real private source and build
dependencies; neither relationship is simulated with Nx metadata.

Habitat owns the positive closed filesystem topology. Nx owns the exact private
dependency edges and task graph. TypeScript owns private capability visibility.
Owner tests prove normalization, refusal, recursive immutability, cold behavior,
and cache restoration and invalidation.

## Vocabulary

normalized topology, plugin identity, resource requirement identity, selected
entrypoint, typed topology edge
