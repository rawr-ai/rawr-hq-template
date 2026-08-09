---
name: habitat-app-frame
description: Mental model for an application as the concrete selection and realization boundary of the product chain.
---

# Application Realization Frame

An app turns declared capability into one concrete product assembly. It owns
plugin membership, provider and profile selection, stable configuration
binding, role choice, and the executable entrypoint.

```text
resource -> provider -> service -> plugin -> app
                                      |
                                      v
                              runtime realization
```

The app selects; it does not redefine. Resource contracts remain neutral,
providers retain implementation ownership, services retain domain truth, and
plugins retain projection ownership. App-owned context flows downward through
those public faces so each lower boundary receives only what it needs.

Complete `app@2` is the sole admitted application packet. It closes one app/Nx
project over `<app-id>.app.ts`, `runtime/profiles/*`, one cold
`runtime/processes.ts` catalog, thin root entrypoints, and owner-local proof.
The already-published `app@1` locator remains immutable historical identity
outside current pack membership and acceptance; no compatibility path resolves
it. Entrypoints select one declared composition and process record through one
`startApp(...)` call rather than reconstructing providers, services, plugin
surfaces, or native harnesses by hand.

## Vocabulary

app, composition, entrypoint, profile, realization, role, selection
