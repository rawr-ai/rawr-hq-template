---
level: error
tags: [service, database, context, middleware, import]
---
# Require Service Database Import Funnel

A standalone service owns its optional database interior. Database-owned
source and named service-root middleware may import that source. Every module,
handler, model, root anchor, and module middleware consumes projected store
capabilities through inherited oRPC context instead of importing database
internals.

This law recognizes literal module-loading edges that visibly name the current
service's `db` boundary. It does not inspect ordinary path data, resolve
relative paths, or interpret computed imports. The private-alias and public-
consumer laws independently seal foreign consumers; the database topology law
owns the exact admitted source shapes.

```grit
language js

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

// Admits the only two source owners allowed to depend directly on database source.
predicate require_service_database_import_funnel_is_admitted_importer() {
  or {
    $filename <: r".*services/[^/]+/src/service/db/.*\.[cm]?[jt]sx?$",
    $filename <: r".*services/[^/]+/src/service/middleware/[^/]+\.middleware\.[cm]?[jt]sx?$"
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

## Matches module and root reach-ins

```typescript
// @filename: services/orders/src/service/base.ts
import type { OrdersStore } from "#orders-service/db/stores/orders.store";

// @filename: services/orders/src/service/modules/catalog/router/read.router.ts
import { ordersStore } from "../../../db/stores/orders.store";
```

## Ignores admitted database and middleware edges

```typescript
// @filename: services/orders/src/service/db/stores/orders.store.ts
import { orders } from "#orders-service/db/schema/orders.schema";

// @filename: services/orders/src/service/middleware/orders.middleware.ts
import { createOrdersStore } from "../db/stores/orders.store";
```

## Ignores path data and computed imports

```typescript
// @filename: services/orders/src/service/router.ts
const migrationDirectory = "./db/migrations";
const owner = "orders";
const database = import(`#${owner}-service/db/stores/orders.store`);
```
