---
level: error
tags: [service, api, boundary, platform, resource]
---
# Require Service Boundary Platform Independence

Service contracts, schemas, and DTOs describe portable domain boundaries.
They do not acquire concrete Node or Bun platform modules. Filesystem,
process, storage, and runtime capabilities enter through service context and
explicit resource providers instead.

This rule intentionally does not classify router, module, or repository
implementation files. TypeScript and behavior tests own those executable
boundaries, while this packet guards the declarations shared across them.

```grit
language js(typescript)

// Admits only a top-level standalone service owner, not a nested lookalike.
predicate belongs_to_exact_standalone_service() {
  $filename <: r".*services/[^/]+/src/service/.*",
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*services/[^/]+/src/service/.*"
  }
}

// Admits only a top-level API service owner, not a nested lookalike.
predicate belongs_to_exact_api_service() {
  $filename <: r".*plugins/server/api/[^/]+/src/service/.*",
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*plugins/server/api/[^/]+/src/service/.*"
  }
}

// Identifies exact standalone-service contract and legacy schema declarations.
predicate is_standalone_service_root_declaration() {
  belongs_to_exact_standalone_service(),
  $filename <: r".*services/[^/]+/src/service/(?:contract|schemas|model|types)\.ts$"
}

// Identifies exact API-service contract and legacy schema declarations.
predicate is_api_service_root_declaration() {
  belongs_to_exact_api_service(),
  $filename <: r".*plugins/server/api/[^/]+/src/service/(?:contract|schemas|model|types)\.ts$"
}

// Identifies module contracts in standalone and embedded API services.
predicate is_service_module_contract() {
  or {
    and {
      belongs_to_exact_standalone_service(),
      $filename <: r".*services/[^/]+/src/service/modules/[^/]+/(?:contract|schemas|model|types)\.ts$"
    },
    and {
      belongs_to_exact_api_service(),
      $filename <: r".*plugins/server/api/[^/]+/src/service/modules/[^/]+/(?:contract|schemas|model|types)\.ts$"
    }
  }
}

// Identifies DTO and schema declarations owned by a service root or module.
predicate is_service_model_declaration() {
  or {
    and {
      belongs_to_exact_standalone_service(),
      $filename <: r".*services/[^/]+/src/service/(?:modules/[^/]+/)?model/(?:dto|schema)/.*\.ts$"
    },
    and {
      belongs_to_exact_api_service(),
      $filename <: r".*plugins/server/api/[^/]+/src/service/(?:modules/[^/]+/)?model/(?:dto|schema)/.*\.ts$"
    }
  }
}

// Defines the complete declaration surface protected by this source law.
predicate is_service_boundary_declaration() {
  or {
    is_standalone_service_root_declaration(),
    is_api_service_root_declaration(),
    is_service_module_contract(),
    is_service_model_declaration()
  },
  not { $filename <: r".*/(?:test|tests|__tests__)/.*" }
}

// Recognizes concrete platform module sources without enumerating capabilities.
predicate is_concrete_platform_source($source) {
  $source <: r"^[\"'](?:node:|bun:)[^\"']+[\"']$"
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`,
  `require.resolve($source)`
} where {
  is_service_boundary_declaration(),
  is_concrete_platform_source(source=$source)
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

## Ignores executable router implementation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { randomUUID } from "node:crypto";
export const router = { randomUUID };
```

## Ignores portable boundary dependencies

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { Type } from "typebox";
import { eoc } from "effect-orpc";
import { ItemSchema } from "./model/schema/item.js";
export const contract = eoc.input(Type.Object({ item: ItemSchema }));
```
