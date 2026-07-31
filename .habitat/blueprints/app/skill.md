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

The package-backed shell may expose `bin/`, but host-specific details belong to
a narrower app blueprint. Entrypoints stay thin: they select one declared
composition and start it rather than reconstructing providers, services, or
plugin surfaces by hand.

## Vocabulary

app, composition, entrypoint, profile, realization, role, selection
