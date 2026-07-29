---
level: error
---
# Require HQ App Server Import Funnel

The HQ application owns declarations and role selection. Only its `server.ts`
entrypoint may import the server package, and that edge must use the public
`@rawr/server/host` export. Relative dependencies on server source are never
part of the application boundary.

```grit
language js(typescript)

import_statement(source=$source) where {
  $filename <: r".*apps/hq/.*\.ts$",
  or {
    $source <: r"^[\"']@rawr/server(?:/[^\"']*)?[\"']$",
    $source <: r"^[\"'](?:\.\.?/)+(?:[^\"']+/)*server/src(?:/|[\"'])"
  },
  not {
    $filename <: r".*apps/hq/server\.ts$",
    $source <: r"^[\"']@rawr/server/host[\"']$"
  }
}
```

## Matches a server dependency in the declarative manifest

```typescript
// @filename: apps/hq/rawr.hq.ts
import { bootstrapServerHost } from "@rawr/server/host";
```

## Matches a server package dependency outside the server entrypoint

```typescript
// @filename: apps/hq/dev.ts
import { startServerHost } from "@rawr/server/host";
```

## Matches a deep server source dependency

```typescript
// @filename: apps/hq/server.ts
import { bootstrapServer } from "../server/src/bootstrap";
```

## Matches a non-host server subpath

```typescript
// @filename: apps/hq/server.ts
import { bootstrapServer } from "@rawr/server/bootstrap";
```

## Ignores the public host dependency in the server entrypoint

```typescript
// @filename: apps/hq/server.ts
import { bootstrapServerHost, startServerHost } from "@rawr/server/host";
```

## Ignores app-local entrypoint composition

```typescript
// @filename: apps/hq/dev.ts
import { startRawrHqServer } from "./server";
```
