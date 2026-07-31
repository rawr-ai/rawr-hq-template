---
name: habitat-provider-frame
description: Mental model for one concrete realization of a provider-neutral resource contract.
---

# Provider Realization Frame

A provider makes one resource contract real on one vendor or substrate. It
owns concrete clients, configuration decoding, acquisition, release, vendor
failure translation, and the mechanics needed to return the neutral resource
value. Its `index.ts` is the single realization face.

```text
resource -> provider -> service -> plugin -> app
```

The provider implements; it does not select itself. App-owned composition
chooses a provider and lifetime, then runtime acquisition passes the ready
provider-neutral value downward. Services therefore depend on the resource
contract rather than concrete vendor code.

Vendor facts may originate here, but service policy does not. If a concern is
stable across providers, it may belong in the resource contract or an inert
package. If it changes product meaning, it belongs with the service. The
closed nested shell prevents those owners from collapsing into one convenient
implementation folder.

## Vocabulary

acquisition, implementation, lifecycle, provider, resource, translation, vendor
