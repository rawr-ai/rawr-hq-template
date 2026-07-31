---
name: habitat-package-frame
description: Mental model for inert reusable support that carries no product, runtime, or projection authority.
---

# Package Support Frame

A package is reusable support. It may own types, algorithms, adapters, or
mechanics whose meaning remains stable across product boundaries. It does not
declare a provisionable resource, realize a provider, own service truth,
project a surface, or select an application runtime.

```text
package = reusable support

resource -> provider -> service -> plugin -> app
```

The separation keeps reuse honest. Code belongs here when consumers can use it
without inheriting a product lifecycle or authority relation. When a helper
starts naming provider selection, domain decisions, caller surfaces, or app
composition, its meaning has moved into the corresponding kind.

The closed project shell keeps the package local and predictable. Contract
proof establishes public type compatibility; semantics proof establishes
reusable behavior. Those finite proof members support the package without
turning `test/` into an open cabinet.

## Vocabulary

boundary, contract, locality, package, proof, reuse, semantics, support
