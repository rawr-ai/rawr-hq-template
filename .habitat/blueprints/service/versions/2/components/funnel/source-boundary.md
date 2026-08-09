---
level: error
tags: [service, imports, locality, platform]
---
# Require Service Source Boundary

Service production preserves lexical import direction inside its selected
project. A module does not enter a sibling module, only database leaves and
named root middleware enter the database interior, and production does not
load package proof or concrete platform APIs. Nx owns dependency direction
between projects, including provider-package edges.

This law owns parser-visible static imports, re-exports, literal `import`, and
literal `require` calls. The closed service structure supplies the finite
source roles; TypeScript and Nx own resolution outside those lexical roles.

```grit
language js(typescript)

// Restricts lexical import-direction checks to service production source.
predicate service_v2_source_boundary_is_production_source() {
  $filename <: r"(?:^|.*/)src/(?:client|service/.*)\.ts$"
}

// Recognizes a relative edge that leaves one module and enters a sibling.
predicate service_v2_source_boundary_is_sibling_module_source($source) {
  or {
    and {
      $filename <: r"(?:^|.*/)src/service/modules/[^/]+/(?:module|router)\.ts$",
      $source <: r"^[\"']\.\./[^./][^\"']*[\"']$"
    },
    and {
      $filename <: r"(?:^|.*/)src/service/modules/[^/]+/(?:contract|middleware|router)/[^/]+\.ts$",
      $source <: r"^[\"']\.\./\.\./[^./][^\"']*[\"']$"
    },
    and {
      $filename <: r"(?:^|.*/)src/service/modules/[^/]+/model/(?:dto|entities|errors|policy|ports)/[^/]+\.ts$",
      $source <: r"^[\"']\.\./\.\./\.\./[^./][^\"']*[\"']$"
    }
  }
}

// Recognizes a relative edge whose lexical destination is the database interior.
predicate service_v2_source_boundary_is_database_source($source) {
  or {
    $source <: r"^[\"']\./(?:service/)?db(?:/[^\"']*)?[\"']$",
    $source <: r"^[\"'](?:\.\./)+(?:service/)?db(?:/[^\"']*)?[\"']$"
  }
}

// Admits database edges only from database leaves and named root middleware.
predicate service_v2_source_boundary_is_forbidden_database_source($source) {
  service_v2_source_boundary_is_database_source(source=$source),
  not { $filename <: r"(?:^|.*/)src/service/db/.*\.ts$" },
  not { $filename <: r"(?:^|.*/)src/service/middleware/[^/]+\.ts$" }
}

// Recognizes a relative production edge into package-root proof.
predicate service_v2_source_boundary_is_proof_source($source) {
  $source <: r"^[\"'](?:\.\./)+test(?:/[^\"']*)?[\"']$"
}

// Recognizes concrete Node, Bun, and Effect platform module sources.
predicate service_v2_source_boundary_is_platform_source($source) {
  $source <: r"^[\"'](?:(?:node|bun):[^\"']*|bun|(?:assert|async_hooks|buffer|child_process|crypto|events|fs|http|http2|https|module|net|os|path|perf_hooks|process|stream|timers|tls|url|util|vm|worker_threads|zlib)(?:/[^\"']*)?|@effect/platform-(?:node|bun)(?:(?:-|/)[^\"']*)?)[\"']$"
}

// Relates one parser-visible module source to a forbidden lexical destination.
predicate service_v2_source_boundary_is_forbidden_source($source) {
  or {
    service_v2_source_boundary_is_sibling_module_source(source=$source),
    service_v2_source_boundary_is_forbidden_database_source(source=$source),
    service_v2_source_boundary_is_proof_source(source=$source),
    service_v2_source_boundary_is_platform_source(source=$source)
  }
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`
} where {
  service_v2_source_boundary_is_production_source(),
  service_v2_source_boundary_is_forbidden_source(source=$source)
}
```

## Matches a sibling-module deep import

```typescript
// @filename: src/service/modules/records/router/read.ts
import { preview } from "../../preview/model/policy/index.js";
```

## Matches a module entering the database interior

```typescript
// @filename: src/service/modules/records/router/read.ts
import { records } from "../../../db/stores/records.js";
```

## Matches production loading proof

```typescript
// @filename: src/service/router.ts
import { fixture } from "../../test/support/service/fixture.js";
```

## Matches concrete platform acquisition

```typescript
// @filename: src/service/base.ts
import { readFile } from "node:fs";
```

## Ignores own-module and root-model imports

```typescript
// @filename: src/service/modules/records/router/read.ts
import { readPolicy } from "../model/policy/index.js";
import { sharedPolicy } from "../../../model/policy/index.js";
```

## Ignores database-local and root-middleware imports

```typescript
// @filename: src/service/db/stores/records.ts
import { records } from "../schema/records.js";

// @filename: src/service/middleware/stores.ts
import { records } from "../db/stores/records.js";
```

## Ignores Nx-owned project dependencies

```typescript
// @filename: src/service/base.ts
import { makeRecords } from "@example/resource/providers/node";
```
