---
level: error
tags: [runtime, adapter, effect]
---
# Adapter Import Boundary

Surface adapters translate compiled surfaces into deferred payloads. Their
contract and lowering helpers do not import raw Effect, including type-only
imports. Native context types and process execution contracts remain available
from their owning modules. Execution calls inside deferred payload callbacks
are legal; behavior tests prove lowering itself does not execute or mount.

The blueprint acquires only `src/surface-adapter.ts` and `src/adapters/**/*.ts`.
This parser-visible rule checks literal import sources and first call arguments;
it does not treat comments, strings or secondary option values as imports.

```grit
language js(typescript)

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `$callee($source, $...)` where {
    $callee <: r"^(?:import|require)$",
    $source <: string()
  }
} where {
  $source <: r"^[\"']effect(?:/[^\"']*)?[\"']$"
}
```

## Matches Raw Effect Types

```typescript
import type { Effect } from "effect";
```

## Matches Dynamic Runtime Access

```typescript
const runtime = import("effect/ManagedRuntime");
```

## Ignores Deferred Delegation

```typescript
import type { WithEffectContext } from "@orpc/experimental-effect";
export const lower = (runtime, boundary) => ({ invoke: invocation => runtime.execute({ boundary, invocation }) });
```

## Ignores Non-Source Strings

```typescript
const documentation = "effect/Effect";
void import("other-package", { with: { note: "effect" } });
```
