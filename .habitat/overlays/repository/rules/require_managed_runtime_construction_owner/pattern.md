---
level: error
tags: [runtime, effect, ownership]
---
# Require ManagedRuntime Construction Ownership

Native ManagedRuntime construction belongs to the process Effect substrate.
This source rule relates direct native imports to constructor references;
it does not inspect arbitrary object properties named make. Native lifecycle
tests remain free to probe vendor mechanics. Behavioral proof owns the count
and lifetime of runtimes created by the admitted substrate.

```grit
language js(typescript)

predicate require_managed_runtime_construction_owner_is_other_production() {
  $filename <: r"^(?:.*/)?(?:packages|apps|services|plugins|resources|tools|scripts)/.*\.ts$",
  ! $filename <: r"^(?:.*/)?packages/core/runtime/substrate/effect/src/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__|dist|node_modules)/.*",
  ! $filename <: r".*\.(?:test|spec)\.ts$"
}

program(statements=$statements) where {
  require_managed_runtime_construction_owner_is_other_production(),
  or {
    and {
      $statements <: contains `import { $..., ManagedRuntime, $... } from $source`,
      $source <: r"^[\"']effect[\"']$",
      $statements <: contains `ManagedRuntime.make`
    },
    and {
      $statements <: contains `import { $..., ManagedRuntime as $runtime, $... } from $source`,
      $source <: r"^[\"']effect[\"']$",
      $statements <: contains `$runtime.make`
    },
    and {
      $statements <: contains `import * as $runtime from $source`,
      $source <: r"^[\"']effect/ManagedRuntime[\"']$",
      $statements <: contains `$runtime.make`
    },
    and {
      $statements <: contains `import * as $effect from $source`,
      $source <: r"^[\"']effect[\"']$",
      $statements <: contains `$effect.ManagedRuntime.make`
    },
    and {
      $statements <: contains `import { $..., make, $... } from $source`,
      $source <: r"^[\"']effect/ManagedRuntime[\"']$"
    },
    and {
      $statements <: contains `import { $..., make as $make, $... } from $source`,
      $source <: r"^[\"']effect/ManagedRuntime[\"']$"
    }
  }
}
```

## Matches Another Production Owner

```typescript
// @filename: packages/core/runtime/process-runtime/src/runtime.ts
import { ManagedRuntime as NativeRuntime } from "effect";
const runtime = NativeRuntime.make(layer);
```

## Ignores The Substrate Owner

```typescript
// @filename: packages/core/runtime/substrate/effect/src/native-runtime.ts
import { ManagedRuntime } from "effect";
const runtime = ManagedRuntime.make(layer);
```

## Ignores Native Mechanics Tests

```typescript
// @filename: packages/core/sdk/test/native-runtime.test.ts
import { ManagedRuntime } from "effect";
const runtime = ManagedRuntime.make(layer);
```
