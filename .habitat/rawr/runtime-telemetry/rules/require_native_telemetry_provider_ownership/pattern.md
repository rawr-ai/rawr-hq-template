---
level: error
tags: [telemetry, provider, ownership, lifecycle]
---
# Require Native Telemetry Provider Ownership

Application and domain source consumes the provider-neutral telemetry resource
or the process-global OpenTelemetry API. The OpenTelemetry Node provider is the
single production owner of SDKs, exporters, processors, propagation, native
instrumentation, and their lifecycle. The retired core telemetry subpath is not
an application boundary.

```grit
language js(typescript)

// Selects authored production source governed by the runtime telemetry niche.
predicate require_native_telemetry_provider_ownership_is_runtime_source() {
  $filename <: r"(?:^|.*/)(?:apps|packages|plugins|resources|services)/.*\.[cm]?[jt]sx?$",
  ! $filename <: r".*/(?:build|dist|fixtures?|generated|proof|test|tests)/.*\.[cm]?[jt]sx?$",
  ! $filename <: r".*\.(?:spec|test)\.[cm]?[jt]sx?$"
}

// Identifies the sole production owner of native telemetry construction.
predicate require_native_telemetry_provider_ownership_is_provider_source() {
  $filename <: r"(?:^|.*/)resources/telemetry/providers/opentelemetry-node/.*\.[cm]?[jt]sx?$"
}

import_statement(source=$source) where {
  require_native_telemetry_provider_ownership_is_runtime_source(),
  or {
    $source <: r"^[\"']@habitat-ai/rawr-core/telemetry[\"']$",
    and {
      $source <: r"^[\"'](?:@effect/opentelemetry|@orpc/opentelemetry|@opentelemetry/(?:api-logs|context-[^\"']+|core|exporter-[^\"']+|instrumentation(?:/[^\"']+)?|resources|sdk-[^\"']+|semantic-conventions(?:/[^\"']+)?))[\"']$",
      ! require_native_telemetry_provider_ownership_is_provider_source()
    },
    and {
      $source <: r"^[\"']inngest/experimental[\"']$",
      $program <: contains `import { $..., InngestSpanProcessor, $... } from $source`,
      ! require_native_telemetry_provider_ownership_is_provider_source()
    }
  }
}
```

## Matches the retired core singleton

```typescript
// @filename: apps/server/src/telemetry.ts
import { installRawrOrpcTelemetry } from "@habitat-ai/rawr-core/telemetry";
```

## Matches app-owned SDK construction

```typescript
// @filename: apps/cli/src/telemetry.ts
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
```

## Matches a second Inngest processor owner

```typescript
// @filename: apps/server/src/telemetry.ts
import { InngestSpanProcessor } from "inngest/experimental";
```

## Ignores provider construction

```typescript
// @filename: resources/telemetry/providers/opentelemetry-node/enabled.ts
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
```

## Ignores neutral resource consumption

```typescript
// @filename: apps/cli/src/telemetry.ts
import type { TelemetryResource } from "@habitat-ai/resource-telemetry";
```

## Ignores active API correlation

```typescript
// @filename: apps/server/src/logging.ts
import { trace } from "@opentelemetry/api";
```
