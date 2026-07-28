---
level: error
tags: [service, database, context, middleware, import]
---
# Require Service Database Import Funnel

A standalone service owns its optional database interior. Database-owned
production source and direct named service-root middleware leaves may import
that source. Production modules, handlers, models, root anchors, and module
middleware consume projected store capabilities through inherited oRPC
context instead of importing database internals. A service-root middleware
barrel is not admitted. Root middleware leaves export generic `middleware` values for
`impl.ts` to import by semantic alias; the service blueprint owns that
attachment relation. Owner-local package proof remains outside this production-source
relation and may inspect the private store without publishing it.

This law recognizes literal module-loading edges that visibly name the current
service's `db` boundary. It does not inspect ordinary path data, resolve
relative paths, or interpret computed imports. The private-alias and public-
consumer laws independently seal foreign consumers; the database topology law
owns the exact admitted source shapes.

```grit
language js(typescript)

// Selects source owned by one exact top-level standalone service interior.
predicate require_service_database_import_funnel_is_standalone_service_source() {
  $filename <: r".*services/[^/]+/src/service/.*\.[cm]?[jt]sx?$",
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*services/[^/]+/src/service/.*"
  }
}

// Recognizes a literal source that visibly enters the current service database.
predicate require_service_database_import_funnel_is_database_source($source) {
  or {
    $source <: r"^[\"'](?:\./|\.\./)+(?:[^/\"']+/)*db(?:/[^\"']*)?[\"']$",
    and {
      $filename <: r".*services/([^/]+)/src/service/.*\.[cm]?[jt]sx?$"($owner),
      $source <: r"^[\"']#([^/]+)-service/db(?:/[^\"']*)?[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $source <: template_string(),
      $source <: not contains template_substitution(),
      $source <: r"^`(?:\./|\.\./)+(?:[^/`]+/)*db(?:/[^`]*)?`$"
    },
    and {
      $filename <: r".*services/([^/]+)/src/service/.*\.[cm]?[jt]sx?$"($owner),
      $source <: template_string(),
      $source <: not contains template_substitution(),
      $source <: r"^`#([^/]+)-service/db(?:/[^`]*)?`$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Admits database-owned source and direct named service-root middleware leaves, but never middleware/index.ts.
predicate require_service_database_import_funnel_is_admitted_importer() {
  or {
    $filename <: r".*services/[^/]+/src/service/db/.*\.[cm]?[jt]sx?$",
    and {
      $filename <: r".*services/[^/]+/src/service/middleware/[^/]+\.ts$",
      not { $filename <: r".*/middleware/index\.ts$" }
    }
  }
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`,
  `require.resolve($source)`
} where {
  require_service_database_import_funnel_is_standalone_service_source(),
  require_service_database_import_funnel_is_database_source(source=$source),
  not { require_service_database_import_funnel_is_admitted_importer() }
}
```

## Matches module, root, and root-middleware-barrel reach-ins

```typescript
// @filename: services/orders/src/service/base.ts
import type { OrdersStore } from "#orders-service/db/stores/orders";

// @filename: services/orders/src/service/modules/catalog/router/read.ts
import { ordersStore } from "../../../db/stores/orders";

// @filename: services/orders/src/service/middleware/index.ts
export { createOrdersStore } from "../db/stores/orders";
```

## Ignores admitted database and named middleware-leaf edges

```typescript
// @filename: services/orders/src/service/db/stores/orders.ts
import { orders } from "#orders-service/db/schema/orders";

// @filename: services/orders/src/service/middleware/orders.ts
import { createOrdersStore } from "../db/stores/orders";
```

## Ignores path data and computed imports

```typescript
// @filename: services/orders/src/service/router.ts
const migrationDirectory = "./db/migrations";
const owner = "orders";
const database = import(`#${owner}-service/db/stores/orders`);
```
