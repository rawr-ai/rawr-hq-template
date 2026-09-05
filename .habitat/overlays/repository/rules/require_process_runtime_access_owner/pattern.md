---
level: error
tags: [runtime, ownership, imports]
---
# Require Process Runtime Access Ownership

Ordinary app, service and plugin production source consumes public authoring
faces and ready capabilities, not private process assembly or concrete provider
implementations. The SDK, runtime and resource/provider owners remain outside
this source subject; Nx acceptance checks their exact current incoming edges.
Public provider declarations and provider-neutral resource contracts remain legal.

This parser-visible rule covers literal static imports, reexports, dynamic
imports and require calls. It does not resolve computed specifiers, arbitrary
aliases, filesystem symlinks or transitive exports; Nx owns resolved graph edges.
Native behavior tests own whether a ready capability exposes raw handles.

```grit
language js(typescript)

// Ordinary production consumers must not acquire private runtime ownership.
predicate require_process_runtime_access_owner_is_consumer() {
  $filename <: r"^(?:.*/)?(?:apps|services|plugins)/.*\.[cm]?[jt]sx?$",
  ! $filename <: r".*/(?:test|tests|__tests__|fixtures|__fixtures__|generated|dist|node_modules)/.*",
  ! $filename <: r".*\.(?:test|spec)\.[cm]?[jt]sx?$"
}

// Match literal private owner paths without banning public declarations.
predicate require_process_runtime_access_owner_is_private_source($source) {
  or {
    $source <: r"^[\"'](?:\./|\.\./)+(?:[^\"']*/)?packages/core/runtime/(?:process-runtime|substrate/effect|definition)(?:/[^\"']*|\.[cm]?[jt]s)?[\"']$",
    $source <: r"^[\"'](?:@habitat-ai/)?runtime-(?:process-runtime|substrate-effect|definition)(?:/[^\"']*)?[\"']$",
    $source <: r"^[\"'](?:\./|\.\./)+(?:[^\"']*/)?resources/[^/\"']+/providers/[^\"']+[\"']$",
    $source <: r"^[\"']@habitat-ai/resource-[^/\"']+/providers/[^\"']+[\"']$",
    $source <: r"^[\"'](?:@habitat-ai/)?provider-[^/\"']+(?:/[^\"']*)?[\"']$"
  }
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `$callee($source, $...)` where {
    $callee <: r"^(?:import|require)$",
    $source <: string()
  }
} where {
  require_process_runtime_access_owner_is_consumer(),
  require_process_runtime_access_owner_is_private_source(source=$source)
}
```

## Matches Private Assembly

```typescript
// @filename: services/orders/src/runtime.ts
export { createProcessRuntime } from "../../../packages/core/runtime/process-runtime/src/index";
```

## Matches Concrete Provider Subpaths

```typescript
// @filename: plugins/agent/tools/orders/src/provider.ts
const provider = import("@habitat-ai/resource-telemetry/providers/opentelemetry-node");
```

## Ignores Declarative Authoring And Native Effect

```typescript
// @filename: apps/example/src/profile.ts
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import type { TelemetryResource } from "@habitat-ai/resource-telemetry";
import { Effect } from "effect";
```

## Ignores Authorized Assembly And Proofs

```typescript
// @filename: packages/core/sdk/src/assembly.ts
import { createProcessRuntime } from "../../runtime/process-runtime/src/index";
```

```typescript
// @filename: services/orders/test/native.test.ts
import { provisionProcess } from "../../../packages/core/runtime/substrate/effect/src/index";
```
