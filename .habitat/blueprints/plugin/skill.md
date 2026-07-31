---
name: habitat-plugin-frame
description: Mental model for plugins as narrow projections of existing capability into one runtime role and surface.
---

# Plugin Projection Frame

A plugin projects existing capability into one role and surface. It owns the
caller-facing projection shape and the adapter from service capability to that
surface. It does not become service truth, acquire providers, select runtime
profiles, or redefine application membership.

```text
resource -> provider -> service -> plugin -> app
```

The service remains authoritative behind the projection. The app decides
whether the plugin participates in a concrete product and supplies the runtime
context from above. A server route, CLI command, async function, desktop
bridge, or Nx projection is therefore a surface fact, not a new semantic
owner.

The generic plugin shell is intentionally small. A narrower plugin blueprint
may add one positive source shape for its projection lane, but it only narrows
the kind; it does not weaken the generic boundary or invent a parallel
framework.

## Vocabulary

adapter, boundary, plugin, projection, role, service, surface
