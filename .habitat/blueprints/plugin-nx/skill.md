---
name: habitat-nx-plugin-frame
description: Mental model for projecting resolved Habitat applications into the Nx scheduler without acquiring policy authority.
---

# Nx Plugin Projection Frame

An Nx plugin projects already-resolved Habitat applications into scheduler
facts: inferred targets, inputs, dependencies, and owner-local composition. It
does not define blueprints, admit instances, resolve policy, or reinterpret a
diagnostic result.

A resolved application is Habitat evaluator output that bounds one rule
execution. The product `app` is the runtime composition owner. Their shared
word does not make evaluator output a product or give the Nx plugin
runtime-selection authority.

```text
Habitat authority -> resolved application -> Nx target
```

The source face stays direct and visible. `index.ts` is the projection entry,
and direct TypeScript leaves may separate projection mechanics without
creating a second runtime or a manual script graph. Nx schedules; Habitat
asserts.

This plugin remains a projection in the product chain. The Habitat service
owns resolution, while the app selects and realizes the complete executable
composition.

## Vocabulary

application, authority, Nx, plugin, projection, scheduler, target
