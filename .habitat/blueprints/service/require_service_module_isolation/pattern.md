---
level: error
tags: [service, module, ownership, imports]
---
# Require Service Module Isolation

A module may collaborate anywhere inside its own sealed interior and use the
service's shared model and declared anchors. It may not escape into a sibling
module. Service roots compose module contracts and operation trees, and may
name a module port as a type in `base.ts` when the host must bind that
dependency. A service-owned database adapter may depend inward on one module's
model while implementing the store capabilities projected through context. The
database blueprint independently owns database placement and the database
import funnel.

This rule owns static import and re-export relationships only. Nx owns package
edges, TypeScript owns type use, and service behavior tests own collaboration.

```grit
language js(typescript)

// Selects non-test source inside one standalone or embedded module.
predicate require_service_module_isolation_is_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$"
}

// Selects every service-root production file outside the private module tree.
predicate require_service_module_isolation_is_root_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  not { require_service_module_isolation_is_module_source() }
}

// Detects a relative source that enters an exact modules path segment.
predicate require_service_module_isolation_is_relative_modules_source($source) {
  $source <: r"^[\"'](?:\.\.?/)+(?:[^/\"']+/)*modules(?:/[^\"']*)?[\"']$"
}

// Detects only the first relative edge that crosses a closed module root.
predicate require_service_module_isolation_is_relative_escape($source) {
  or {
    and {
      $filename <: r".*/src/service/modules/[^/]+/[^/]+\.ts$",
      $source <: r"^[\"']\.\./[^\"']+[\"']$"
    },
    and {
      $filename <: r".*/src/service/modules/[^/]+/[^/]+/[^/]+\.ts$",
      $source <: r"^[\"']\.\./\.\./[^\"']+[\"']$"
    },
    and {
      $filename <: r".*/src/service/modules/[^/]+/[^/]+/[^/]+/[^/]+\.ts$",
      $source <: r"^[\"']\.\./\.\./\.\./[^\"']+[\"']$"
    }
  }
}

// Admits a module's depth-correct ascent into the service-wide shared model.
predicate require_service_module_isolation_is_service_model_import($source) {
  or {
    and {
      $filename <: r".*/src/service/modules/[^/]+/[^/]+\.ts$",
      $source <: r"^[\"']\.\./\.\./model(?:/[^\"']*)?[\"']$"
    },
    and {
      $filename <: r".*/src/service/modules/[^/]+/[^/]+/[^/]+\.ts$",
      $source <: r"^[\"']\.\./\.\./\.\./model(?:/[^\"']*)?[\"']$"
    },
    and {
      $filename <: r".*/src/service/modules/[^/]+/[^/]+/[^/]+/[^/]+\.ts$",
      $source <: r"^[\"']\.\./\.\./\.\./\.\./model(?:/[^\"']*)?[\"']$"
    }
  }
}

// Matches a source alias kind to the importing service lane.
predicate require_service_module_isolation_is_same_kind($lane, $alias_kind) {
  or {
    and {
      $lane <: r"^services$",
      $alias_kind <: r"^service$"
    },
    and {
      $lane <: r"^plugins/server/api$",
      $alias_kind <: r"^api$"
    }
  }
}

// Recognizes the importing service's own raw base alias.
predicate require_service_module_isolation_is_owner_base_alias($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($lane, $owner),
  $source <: r"^[\"']#([^/]+)-(service|api)/base(?:\.[cm]?[jt]s)?[\"']$"($alias_owner, $alias_kind),
  $alias_owner <: $owner,
  require_service_module_isolation_is_same_kind(
    lane=$lane,
    alias_kind=$alias_kind
  )
}

// Recognizes the importing service's own configured implementation alias.
predicate require_service_module_isolation_is_owner_impl_alias($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($lane, $owner),
  $source <: r"^[\"']#([^/]+)-(service|api)/impl(?:\.[cm]?[jt]s)?[\"']$"($alias_owner, $alias_kind),
  $alias_owner <: $owner,
  require_service_module_isolation_is_same_kind(
    lane=$lane,
    alias_kind=$alias_kind
  )
}

// Admits raw base acquisition only at a module-owned middleware boundary.
predicate require_service_module_isolation_is_allowed_base_import($source) {
  $filename <: r".*/src/service/modules/[^/]+/middleware/[^/]+\.ts$",
  not { $filename <: r".*/middleware/index\.ts$" },
  or {
    $source <: r"^[\"']\.\./\.\./\.\./base(?:\.[cm]?[jt]s)?[\"']$",
    require_service_module_isolation_is_owner_base_alias(source=$source)
  }
}

// Admits configured descent at module.ts and unconfigured contract-policy authorship.
predicate require_service_module_isolation_is_allowed_impl_import($source) {
  or {
    and {
      $filename <: r".*/src/service/modules/[^/]+/module\.ts$",
      or {
        $source <: r"^[\"']\.\./\.\./impl(?:\.[cm]?[jt]s)?[\"']$",
        require_service_module_isolation_is_owner_impl_alias(source=$source)
      }
    },
    and {
      $filename <: r".*/src/service/modules/[^/]+/middleware/[^/]+\.ts$",
      not { $filename <: r".*/middleware/index\.ts$" },
      or {
        $source <: r"^[\"']\.\./\.\./\.\./impl(?:\.[cm]?[jt]s)?[\"']$",
        require_service_module_isolation_is_owner_impl_alias(source=$source)
      }
    }
  }
}

// Detects a standalone module alias that enters a sibling of the current module.
predicate require_service_module_isolation_is_sibling_alias($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/([^/]+)/.*\.ts$"($lane, $owner, $module),
  $source <: r"^[\"']#([^/]+)-(service|api)/modules/([^/]+)(?:/[^\"']*)?[\"']$"($alias_owner, $alias_kind, $target),
  $alias_owner <: $owner,
  require_service_module_isolation_is_same_kind(
    lane=$lane,
    alias_kind=$alias_kind
  ),
  not { $target <: $module }
}

// Detects a module that reaches back into a service-root execution face.
predicate require_service_module_isolation_is_root_boundary_alias($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($lane, $owner),
  $source <: r"^[\"']#([^/]+)-(service|api)/(?:contract(?:\.[cm]?[jt]s)?|router(?:\.[cm]?[jt]s)?|middleware(?:/[^\"']*)?)[\"']$"($alias_owner, $alias_kind),
  $alias_owner <: $owner,
  require_service_module_isolation_is_same_kind(
    lane=$lane,
    alias_kind=$alias_kind
  )
}

// Recognizes the importing service root's own private module alias.
predicate require_service_module_isolation_is_owner_module_alias($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/.*\.ts$"($lane, $owner),
  $source <: r"^[\"']#([^/]+)-(service|api)/modules/[^\"']+[\"']$"($alias_owner, $alias_kind),
  $alias_owner <: $owner,
  require_service_module_isolation_is_same_kind(
    lane=$lane,
    alias_kind=$alias_kind
  )
}

// Admits contract ascent, router ascent, and type-only host port declaration.
predicate require_service_module_isolation_is_allowed_root_import($import, $source) {
  or {
    and {
      $filename <: r".*/src/service/contract\.ts$",
      $source <: r"^[\"'](?:#(?:[^/]+)-(?:service|api)/modules/[^/]+|\./modules/[^/]+)/contract(?:/|/index(?:\.[cm]?[jt]s)?)?[\"']$"
    },
    and {
      $filename <: r".*/src/service/router\.ts$",
      $source <: r"^[\"'](?:#(?:[^/]+)-(?:service|api)/modules/[^/]+|\./modules/[^/]+)/router(?:\.[cm]?[jt]s)?[\"']$"
    },
    and {
      $filename <: r".*/src/service/base\.ts$",
      $source <: r"^[\"'](?:#(?:[^/]+)-(?:service|api)/modules/[^/]+|\./modules/[^/]+)/model/ports/[^\"']+[\"']$",
      $import <: contains type()
    },
    and {
      $filename <: r".*/src/service/db/.*\.ts$",
      $source <: r"^[\"'](?:\.\.?/)+(?:[^/\"']+/)*modules/[^/]+/model/[^\"']+[\"']$"
    },
    and {
      $filename <: r".*services/([^/]+)/src/service/db/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/modules/[^/]+/model/[^\"']+[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

or {
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_root_source(),
    require_service_module_isolation_is_owner_module_alias(source=$source),
    not {
      require_service_module_isolation_is_allowed_root_import(
        import=$import,
        source=$source
      )
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_root_source(),
    require_service_module_isolation_is_owner_module_alias(source=$source)
  },
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_root_source(),
    require_service_module_isolation_is_relative_modules_source(source=$source),
    not {
      require_service_module_isolation_is_allowed_root_import(
        import=$import,
        source=$source
      )
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_root_source(),
    require_service_module_isolation_is_relative_modules_source(source=$source)
  },
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_relative_escape(source=$source),
    not {
      require_service_module_isolation_is_service_model_import(source=$source)
    },
    not { require_service_module_isolation_is_allowed_base_import(source=$source) },
    not { require_service_module_isolation_is_allowed_impl_import(source=$source) }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_relative_escape(source=$source)
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_owner_base_alias(source=$source),
    not {
      require_service_module_isolation_is_allowed_base_import(source=$source)
    }
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_owner_impl_alias(source=$source),
    not {
      require_service_module_isolation_is_allowed_impl_import(source=$source)
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_owner_base_alias(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_owner_impl_alias(source=$source)
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_sibling_alias(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_sibling_alias(source=$source)
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_root_boundary_alias(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_root_boundary_alias(source=$source)
  }
}
```

## Matches root execution imports

```typescript
// @filename: services/jobs/src/service/impl.ts
import { createCatalog } from "#jobs-service/modules/catalog/model/helpers/catalog";
```

## Matches root helper acquisition from a module

```typescript
// @filename: services/jobs/src/service/model/helpers/catalog.ts
import { publicJobFacts } from "#jobs-service/modules/catalog/model/dto/job-facts.dto";
```

## Matches a deep relative path entering modules

```typescript
// @filename: services/jobs/src/service/model/helpers/catalog.ts
import { publicJobFacts } from "../../legacy/modules/catalog/model/dto/job-facts.dto";
```

## Matches sibling module entry

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { queuePolicy } from "#jobs-service/modules/queue/model/policy/queue-policy";
```

## Matches embedded API sibling module entry

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/jobs/router/get.ts
import { collectPolicy } from "#pipeline-api/modules/collect/model/policy/collect-policy";
```

## Ignores collaboration inside one sealed module

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { publicJobFacts } from "../model/dto/job-facts.dto";
// @filename: services/jobs/src/service/modules/catalog/model/policy/catalog.ts
import type { CatalogQuery } from "../dto/catalog-query";
```

## Ignores depth-correct module imports from the shared service model

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { SharedJobSchema } from "../../../model/entities/job";
// @filename: services/jobs/src/service/modules/catalog/model/policy/catalog.ts
import type { ServiceClock } from "../../../../model/ports/clock";
```

## Ignores a service database adapter depending inward on module model

```typescript
// @filename: services/jobs/src/service/db/stores/catalog.ts
import { CatalogRecordSchema } from "../../modules/catalog/model/entities/catalog-record";
import type { CatalogStore } from "../../modules/catalog/model/ports/catalog-store";
```

## Matches traversal that escapes a module

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { queue } from "../queue/module";
// @filename: plugins/server/api/pipeline/src/service/modules/jobs/router/get.ts
import { service } from "../../../impl";
// @filename: services/jobs/src/service/modules/catalog/model/policy/catalog.ts
import { queuePolicy } from "../../../queue/model/policy/queue-policy";
```

## Matches raw base acquisition from a router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { base } from "#jobs-service/base";
```

## Ignores declaration, composition, and current-module imports

```typescript
// @filename: services/discovery/src/service/base.ts
import type { ListingSearchPort } from "#discovery-service/modules/source-acquisition/model/ports/listing-search";
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "#jobs-service/modules/catalog/contract";
// @filename: services/jobs/src/service/router.ts
import { router as catalog } from "#jobs-service/modules/catalog/router";
// @filename: services/jobs/src/service/modules/catalog/middleware/provider.ts
import { base } from "#jobs-service/base";
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "#jobs-service/impl";
// @filename: services/jobs/src/service/modules/catalog/middleware/access.ts
import { impl } from "#jobs-service/impl";
/** Admits Catalog access with the module contract errors. */
export const middleware = impl.catalog.middleware(({ errors, next }) => {
  if (!mayRead()) throw errors.FORBIDDEN();
  return next();
});
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
import { requireCatalogAuthority } from "../middleware";
// @filename: plugins/server/api/pipeline/src/service/modules/jobs/middleware/provider.ts
import { base } from "#pipeline-api/base";
// @filename: plugins/server/api/pipeline/src/service/modules/jobs/module.ts
import { service } from "#pipeline-api/impl";
```

## Matches a deep middleware catalog route from an operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { requireCatalogAuthority } from "../../middleware";
export const get = module.get.use(requireCatalogAuthority).handler(handler);
```
