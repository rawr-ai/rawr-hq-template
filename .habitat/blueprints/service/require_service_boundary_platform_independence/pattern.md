---
level: error
tags: [service, api, boundary, platform, resource]
---
# Require Service Platform Independence

Production service source describes and executes domain capabilities over
context-provided ports. It does not acquire concrete Node or Bun platform
modules. Filesystem, process, storage, and runtime capabilities terminate in
explicit resources/providers and enter service construction as ready
capabilities.

```grit
language js(typescript)

// Admits only a top-level standalone service owner, not a nested lookalike.
predicate require_service_boundary_platform_independence_belongs_to_exact_standalone_service() {
  $filename <: r".*services/[^/]+/src/service/.*",
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*services/[^/]+/src/service/.*"
  }
}

// Admits only a top-level API service owner, not a nested lookalike.
predicate require_service_boundary_platform_independence_belongs_to_exact_api_service() {
  $filename <: r".*plugins/server/api/[^/]+/src/service/.*",
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*plugins/server/api/[^/]+/src/service/.*"
  }
}

// Defines the complete production service surface protected by this source law.
predicate require_service_boundary_platform_independence_is_service_source() {
  or {
    require_service_boundary_platform_independence_belongs_to_exact_standalone_service(),
    require_service_boundary_platform_independence_belongs_to_exact_api_service()
  },
  not { $filename <: r".*/(?:test|tests|__tests__)/.*" }
}

// Recognizes concrete Node/Bun standard-library and Effect provider sources.
predicate require_service_boundary_platform_independence_is_concrete_platform_source($source) {
  $source <: r"^[\"'](?:(?:node:|bun:)[^\"']+|@effect/platform-(?:node(?:-shared)?|bun)(?:/[^\"']*)?)[\"']$"
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`,
  `require.resolve($source)`
} where {
  require_service_boundary_platform_independence_is_service_source(),
  require_service_boundary_platform_independence_is_concrete_platform_source(source=$source)
}
```

## Matches a standalone module contract importing Node filesystem APIs

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import "node:fs";
export const contract = {};
```

## Matches an API DTO dynamically loading Bun storage

```typescript
// @filename: plugins/server/api/catalog/src/service/model/dto/item.ts
const sqlite = import("bun:sqlite");
export { sqlite };
```

## Matches executable router acquisition

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/create.router.ts
import { randomUUID } from "node:crypto";
export const create = { randomUUID };
```

## Ignores portable boundary dependencies

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { Type } from "typebox";
import { eoc } from "effect-orpc";
import { ItemSchema } from "./model/schema/item.js";
export const contract = eoc.input(Type.Object({ item: ItemSchema }));
```
