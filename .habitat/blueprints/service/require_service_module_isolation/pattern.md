---
level: error
tags: [service, module, ownership, imports]
---
# Require Service Module Isolation

A module may use its own implementation interior and the service's declared
anchors. It may not enter a sibling module. Service roots compose module
contracts and operation trees, and may name a module port only as a type in
`base.ts` when the host must bind that dependency. The database blueprint
independently owns database placement and the database import funnel.

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

// Selects every governed service source file.
predicate require_service_module_isolation_is_governed_source() {
  or {
    require_service_module_isolation_is_root_source(),
    require_service_module_isolation_is_module_source()
  }
}

// Detects a relative source that enters an exact modules path segment.
predicate require_service_module_isolation_is_relative_modules_source($source) {
  $source <: r"^[\"'](?:\.\.?/)+(?:[^/\"']+/)*modules(?:/|[\"'])"
}

// Admits a router leaf's exact module author and middleware catalog edges.
predicate require_service_module_isolation_is_leaf_module_import($source) {
  $filename <: r".*/src/service/modules/[^/]+/router/[^/]+\.ts$",
  not { $filename <: r".*/router/index\.ts$" },
  $source <: r"^[\"']\.\./(?:module|middleware)[\"']$"
}

// Admits raw base acquisition only at a module-owned middleware boundary.
predicate require_service_module_isolation_is_allowed_base_import($source) {
  $filename <: r".*/src/service/modules/[^/]+/middleware/[^/]+\.ts$",
  not { $filename <: r".*/middleware/index\.ts$" },
  $source <: r"^[\"'](?:#[^/]+-(?:service|api)/base|\.\./\.\./\.\./base)[\"']$"
}

// Admits configured descent at module.ts and unconfigured contract-policy authorship.
predicate require_service_module_isolation_is_allowed_impl_import($source) {
  or {
    and {
      $filename <: r".*/src/service/modules/[^/]+/module\.ts$",
      $source <: r"^[\"'](?:#[^/]+-(?:service|api)/impl|\.\./\.\./impl)[\"']$"
    },
    and {
      $filename <: r".*/src/service/modules/[^/]+/middleware/[^/]+\.ts$",
      not { $filename <: r".*/middleware/index\.ts$" },
      $source <: r"^[\"'](?:#[^/]+-(?:service|api)/impl|\.\./\.\./\.\./impl)[\"']$"
    }
  }
}

// Detects a standalone module alias that enters a sibling of the current module.
predicate require_service_module_isolation_is_sibling_alias($source) {
  $filename <: r".*(?:services/|plugins/server/api/)([^/]+)/src/service/modules/([^/]+)/.*\.ts$"($owner, $module),
  $source <: r"^[\"']#([^/]+)-(?:service|api)/modules/([^/]+)(?:/|[\"'])"($alias_owner, $target),
  $alias_owner <: $owner,
  not { $target <: $module }
}

// Admits contract ascent, router ascent, and type-only host port declaration.
predicate require_service_module_isolation_is_allowed_root_import($import, $source) {
  or {
    and {
      $filename <: r".*/src/service/contract\.ts$",
      $source <: r"^[\"'](?:#(?:[^/]+)-(?:service|api)/modules/[^/]+|\./modules/[^/]+)/contract[\"']$"
    },
    and {
      $filename <: r".*/src/service/router\.ts$",
      $source <: r"^[\"'](?:#(?:[^/]+)-(?:service|api)/modules/[^/]+|\./modules/[^/]+)/router[\"']$"
    },
    and {
      $filename <: r".*/src/service/base\.ts$",
      $source <: r"^[\"'](?:#(?:[^/]+)-(?:service|api)/modules/[^/]+|\./modules/[^/]+)/model/ports/[^\"']+[\"']$",
      $import <: contains type()
    }
  }
}

or {
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_root_source(),
    $source <: r"^[\"']#(?:[^/]+)-(?:service|api)/modules/",
    not {
      require_service_module_isolation_is_allowed_root_import(
        import=$import,
        source=$source
      )
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_root_source(),
    $source <: r"^[\"']#(?:[^/]+)-(?:service|api)/modules/"
  },
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_governed_source(),
    require_service_module_isolation_is_relative_modules_source(source=$source),
    not {
      and {
        require_service_module_isolation_is_root_source(),
        require_service_module_isolation_is_allowed_root_import(
          import=$import,
          source=$source
        )
      }
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_governed_source(),
    require_service_module_isolation_is_relative_modules_source(source=$source)
  },
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_module_source(),
    $source <: r"^[\"']\.\./",
    not {
      require_service_module_isolation_is_leaf_module_import(source=$source)
    },
    not {
      require_service_module_isolation_is_allowed_base_import(source=$source)
    },
    not {
      require_service_module_isolation_is_allowed_impl_import(source=$source)
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    $source <: r"^[\"']\.\./"
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    $source <: r"^[\"']#[^/]+-(?:service|api)/base[\"']$",
    not {
      require_service_module_isolation_is_allowed_base_import(source=$source)
    }
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    $source <: r"^[\"']#[^/]+-(?:service|api)/impl[\"']$",
    not {
      require_service_module_isolation_is_allowed_impl_import(source=$source)
    }
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_sibling_alias(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_module_source(),
    require_service_module_isolation_is_sibling_alias(source=$source)
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

## Matches parent traversal from a module

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/jobs/router/get.ts
import { service } from "../../../impl";
```

## Matches raw base acquisition from a router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
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

## Matches middleware catalog acquisition from a router index

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
import { requireCatalogAuthority } from "../middleware";
export const router = { get };
```

## Matches a direct middleware leaf route from an operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { middleware } from "../middleware/access";
export const get = module.get.use(middleware).handler(handler);
```

## Matches a deep middleware catalog route from an operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { requireCatalogAuthority } from "../../middleware";
export const get = module.get.use(requireCatalogAuthority).handler(handler);
```
