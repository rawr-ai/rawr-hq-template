---
level: error
tags: [server, host, context, telemetry, correlation]
---
# Require Server Host Telemetry Context Authority

The server host owns one request-scoped logging context store. Its sole
construction is the canonical `hostLoggingContext` declaration in `logging.ts`;
all other server source consumes that host-owned context API. OpenTelemetry's
active span remains an independent correlation input and does not construct a
second host context authority.

The pattern follows direct named imports, named import aliases, namespace
imports, and one local constructor alias. It intentionally does not perform
generalized dataflow or interpret computed and obfuscated constructor access.

```grit
language js(typescript)

or {
  `new AsyncLocalStorage($arguments)` as $construction where {
    $program <: contains `import { $..., AsyncLocalStorage, $... } from $source`,
    $source <: r"^[\"'](?:node:)?async_hooks[\"']$",
    not {
      $filename <: r".*apps/server/src/logging\.[cm]?[jt]sx?$",
      $construction <: within `const hostLoggingContext = new AsyncLocalStorage<HostLoggingContext>();`
    }
  },
  `new $binding($arguments)` where {
    $program <: contains `import { $..., AsyncLocalStorage as $binding, $... } from $source`,
    $source <: r"^[\"'](?:node:)?async_hooks[\"']$"
  },
  `new $namespace.AsyncLocalStorage($arguments)` where {
    $program <: contains `import * as $namespace from $source`,
    $source <: r"^[\"'](?:node:)?async_hooks[\"']$"
  },
  `new $alias($arguments)` where {
    $program <: contains `const $alias = $binding`,
    or {
      and {
        $binding <: `AsyncLocalStorage`,
        $program <: contains `import { $..., AsyncLocalStorage, $... } from $source`,
        $source <: r"^[\"'](?:node:)?async_hooks[\"']$"
      },
      and {
        $program <: contains `import { $..., AsyncLocalStorage as $binding, $... } from $source`,
        $source <: r"^[\"'](?:node:)?async_hooks[\"']$"
      },
      and {
        $binding <: `$namespace.AsyncLocalStorage`,
        $program <: contains `import * as $namespace from $source`,
        $source <: r"^[\"'](?:node:)?async_hooks[\"']$"
      }
    }
  }
}
```

## Matches a direct second store

```typescript
// @filename: apps/server/src/secondary-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
const secondaryContext = new AsyncLocalStorage<{ requestId: string }>();
```

## Matches a named import alias

```typescript
// @filename: apps/server/src/secondary-context.ts
import { AsyncLocalStorage as ContextStore } from "node:async_hooks";
const secondaryContext = new ContextStore<{ requestId: string }>();
```

## Matches a namespace import member

```typescript
// @filename: apps/server/src/secondary-context.ts
import * as asyncHooks from "node:async_hooks";
const secondaryContext = new asyncHooks.AsyncLocalStorage<{ requestId: string }>();
```

## Matches a one-hop constructor alias

```typescript
// @filename: apps/server/src/secondary-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
const ContextStore = AsyncLocalStorage;
const secondaryContext = new ContextStore<{ requestId: string }>();
```

## Ignores the canonical host logging context

```typescript
// @filename: apps/server/src/logging.ts
import { AsyncLocalStorage } from "node:async_hooks";
type HostLoggingContext = { requestId: string };
const hostLoggingContext = new AsyncLocalStorage<HostLoggingContext>();
```

## Ignores active-span correlation

```typescript
// @filename: apps/server/src/secondary-context.ts
import { trace } from "@opentelemetry/api";
const activeSpan = trace.getActiveSpan()?.spanContext();
```
