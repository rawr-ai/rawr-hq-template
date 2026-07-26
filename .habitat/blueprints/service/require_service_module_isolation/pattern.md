---
level: error
tags: [orpc, service, categorical-negative, module-isolation]
---
# Require Service Module Isolation

Root service code imports module code only at its two composition points:
`contract.ts` imports module contracts and `router.ts` imports completed module
routers. Root code never imports module context providers and never re-exports
module code. The oRPC composition law and TypeScript contract compatibility own
module branch naming; this boundary does not duplicate that type relation.

Inside a module, static relative imports and re-exports may not contain a
parent `..` segment, including normalized-looking forms such as
`./../../...` or `./local/../../...`. The exact `module.ts` import of the
runtime `service` binding from root `impl` is the sole service-spine exception,
whether it uses `../../impl` or the normalized current-owner alias. Type-only
companions may share that import. A module's named `middleware/*.middleware.ts`
may import exactly the context-seeded `createMiddleware` factory from
`../../../base`; this is the sole module-middleware-to-base edge and may not
carry other root runtime authority. A named `router/*.router.ts` may use one normalized
`../` hop into its own module because named router leaves are the
Template-admitted authored surfaces. Empty, dot, parent, and trailing segments
make that hop non-normalized. Other root or cross-module facts use the
current-owner alias.

In governed non-test service source, every current-owner alias must use a
normalized path: empty, `.` and `..` path segments are rejected anywhere after
the owner prefix. A current-owner alias that directly enters the module tree
must also name the current module, so it cannot address a sibling.
Foreign-owner aliases remain outside this ownership relation. The
context-boundary packet separately rejects current-owner root base, context,
and middleware aliases. Test source, dynamic imports, and transitive graph
relations are outside this syntax law.

```grit
language js(typescript)

// Selects non-test root sources governed by module composition law.
predicate require_service_module_isolation_is_root_service_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/src/service/modules/.*",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects non-test service module interiors governed by isolation.
predicate require_service_module_isolation_is_service_isolation_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects every non-test root or module source governed by owner-alias normalization.
predicate require_service_module_isolation_is_governed_source() {
  or {
    require_service_module_isolation_is_root_service_source(),
    require_service_module_isolation_is_service_isolation_module_source()
  }
}

// Distinguishes imports into the current owner's module tree.
predicate require_service_module_isolation_is_current_module_source($source) {
  or {
    $source <: r"^[\"']\./(?:[^/\"']+/)*modules/[^\"']+[\"']$",
    and {
      $filename <: r".*services/([^/]+)/src/service/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/(?:[^/\"']+/)*modules/[^\"']+[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:[^/\"']+/)*modules/[^\"']+[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Restricts composition edges to named bindings with optional type companions.
predicate require_service_module_isolation_is_named_only_import($import, $source) {
  $import <: `import { $... } from $source`
}

// Reserves root-to-module edges for contract and router composition.
predicate require_service_module_isolation_is_allowed_root_composition_import($import, $source) {
  or {
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/contract\.ts$",
      $source <: r"^[\"'](?:\./modules|#[^/]+-(?:service|api)/(?:service/)?modules)/[^/\"']+/contract[\"']$",
      require_service_module_isolation_is_named_only_import(import=$import, source=$source),
      $import <: contains import_specifier(name=`contract`) as $contract_specifier where {
        not { $contract_specifier <: r"^type\s+.*$" }
      },
      not {
        $import <: contains import_specifier() as $other_specifier where {
          not { $other_specifier <: r"^type\s+.*$" },
          not { $other_specifier <: `contract` },
          not { $other_specifier <: `contract as $other_branch` }
        }
      }
    },
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
      $source <: r"^[\"'](?:\./modules|#[^/]+-(?:service|api)/(?:service/)?modules)/[^/\"']+/router[\"']$",
      require_service_module_isolation_is_named_only_import(import=$import, source=$source),
      $import <: contains import_specifier(name=`router`) as $router_specifier where {
        not { $router_specifier <: r"^type\s+.*$" }
      },
      not {
        $import <: contains import_specifier(name=$other_name) as $other_specifier where {
          not { $other_specifier <: r"^type\s+.*$" },
          not { $other_name <: `router` }
        }
      }
    }
  }
}

// Detects relative sources that escape through a parent segment.
predicate require_service_module_isolation_has_parent_segment($source) {
  $source <: r"^[\"'](?:[^/\"']+/)*\.\.(?:/[^\"']*)?[\"']$"
}

// Recognizes the root implementation source owned by the current module's service.
predicate require_service_module_isolation_is_current_root_impl_source($source) {
  or {
    $source <: r"^[\"']\.\./\.\./impl[\"']$",
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/[^/]+/module\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/impl[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/[^/]+/module\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?impl[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Preserves the sole module-to-root service-spine import.
predicate require_service_module_isolation_is_exact_module_service_import($import, $source) {
  $filename <: r".*/src/service/modules/[^/]+/module\.ts$",
  require_service_module_isolation_is_current_root_impl_source(source=$source),
  not { $import <: import_statement(type=type()) },
  require_service_module_isolation_is_named_only_import(import=$import, source=$source),
  $import <: contains import_specifier(name=`service`) as $service_specifier where {
    not { $service_specifier <: r"^type\s+.*$" }
  },
  not {
    $import <: contains import_specifier(name=$other_name) as $other_specifier where {
      not { $other_specifier <: r"^type\s+.*$" },
      not { $other_name <: `service` }
    }
  }
}

// Preserves the one base-authoring edge for standalone module middleware.
predicate require_service_module_isolation_is_exact_module_base_import($import, $source) {
  $filename <: r".*/services/[^/]+/src/service/modules/[^/]+/middleware/[^/]+\.middleware\.ts$",
  $source <: r"^[\"']\.\./\.\./\.\./base[\"']$",
  not { $import <: import_statement(type=type()) },
  require_service_module_isolation_is_named_only_import(import=$import, source=$source),
  $import <: contains import_specifier(name=`createMiddleware`) as $runtime_specifier where {
    not { $runtime_specifier <: r"^type\s+.*$" }
  },
  not {
    $import <: contains import_specifier(name=$other_name) as $other_specifier where {
      not { $other_specifier <: r"^type\s+.*$" },
      not { $other_name <: `createMiddleware` }
    }
  }
}

// Rejects executable service-root anchors from every module interior.
predicate require_service_module_isolation_reaches_current_root_runtime($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/(?:impl|contract|router)[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?(?:impl|contract|router)[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Preserves one normalized hop from an authored named router into its own module.
predicate require_service_module_isolation_is_exact_named_router_owner_import($source) {
  $filename <: r".*/src/service/modules/[^/]+/router/[^/]+\.router\.ts$",
  $source <: r"^[\"']\.\./[^\"']*[^/\"'][\"']$",
  ! $source <: r"^[\"'][^\"']*//[^\"']*[\"']$",
  ! $source <: r"^[\"']\.\./(?:[^/\"']+/)*(?:\.|\.\.)(?:/[^\"']*)?[\"']$",
  ! $source <: r"^[\"']\.\./router(?:\.ts)?[\"']$"
}

// Detects non-normalized empty, dot, parent, and trailing alias segments.
predicate require_service_module_isolation_has_non_normalized_alias_segment($source) {
  or {
    $source <: r"^[\"'][^\"']*//[^\"']*[\"']$",
    $source <: r"^[\"'][^\"']*/[\"']$",
    $source <: r"^[\"'](?:[^/\"']+/)*(?:\.|\.\.)(?:/[^\"']*)?[\"']$"
  }
}

// Detects an empty, dot, or parent segment anywhere after the current-owner alias prefix.
predicate require_service_module_isolation_violates_current_owner_alias_normalization($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/\"']+)-service(?:/[^\"']*)?[\"']$"($alias_owner),
      $alias_owner <: $owner,
      require_service_module_isolation_has_non_normalized_alias_segment(source=$source)
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/\"']+)-api(?:/[^\"']*)?[\"']$"($alias_owner),
      $alias_owner <: $owner,
      require_service_module_isolation_has_non_normalized_alias_segment(source=$source)
    }
  }
}

// Enforces the normalized current-module path that keeps current-owner aliases inside their owning module.
predicate require_service_module_isolation_violates_current_owner_module_path($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/([^/]+)/.*\.ts$"($owner, $module_name),
      $source <: r"^[\"']#([^/]+)-service/modules/[^\"']*[\"']$"($alias_owner),
      $alias_owner <: $owner,
      not {
        $source <: r"^[\"']#[^/]+-service/modules/([^/\"']+)(?:/[^/\"']+)*[\"']$"($target_module),
        $target_module <: $module_name
      }
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/([^/]+)/.*\.ts$"($owner, $module_name),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?modules/[^\"']*[\"']$"($alias_owner),
      $alias_owner <: $owner,
      not {
        $source <: r"^[\"']#[^/]+-api/(?:service/)?modules/([^/\"']+)(?:/[^/\"']+)*[\"']$"($target_module),
        $target_module <: $module_name
      }
    }
  }
}

or {
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_root_service_source(),
    require_service_module_isolation_is_current_module_source(source=$source),
    not {
      require_service_module_isolation_is_allowed_root_composition_import(import=$import, source=$source)
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_root_service_source(),
    $source <: string(),
    require_service_module_isolation_is_current_module_source(source=$source)
  },
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_service_isolation_module_source(),
    require_service_module_isolation_has_parent_segment(source=$source),
    not {
      require_service_module_isolation_is_exact_module_service_import(import=$import, source=$source)
    },
    not {
      require_service_module_isolation_is_exact_named_router_owner_import(source=$source)
    },
    not {
      require_service_module_isolation_is_exact_module_base_import(import=$import, source=$source)
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    $source <: string(),
    require_service_module_isolation_has_parent_segment(source=$source),
    not {
      require_service_module_isolation_is_exact_named_router_owner_import(source=$source)
    }
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_governed_source(),
    require_service_module_isolation_violates_current_owner_alias_normalization(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_governed_source(),
    $source <: string(),
    require_service_module_isolation_violates_current_owner_alias_normalization(source=$source)
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    require_service_module_isolation_violates_current_owner_module_path(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    $source <: string(),
    require_service_module_isolation_violates_current_owner_module_path(source=$source)
  },
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_service_isolation_module_source(),
    require_service_module_isolation_reaches_current_root_runtime(source=$source),
    not {
      require_service_module_isolation_is_exact_module_service_import(import=$import, source=$source)
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    $source <: string(),
    require_service_module_isolation_reaches_current_root_runtime(source=$source)
  }
}
```

## Matches a root import of module implementation

```typescript
// @filename: services/jobs/src/service/model/helpers/catalog.ts
import { repository } from "../modules/catalog/model/ports/catalog-repository";
```

## Matches a root re-export of module implementation

```typescript
// @filename: plugins/server/api/catalog/src/service/impl.ts
export type { SearchContext } from "#catalog-api/service/modules/search/module";
```

## Matches a direct parent segment

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { catalog } from "../modules/catalog";
```

## Matches a normalized-looking parent segment

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import type { Context } from "./local/../../../../../context";
```

## Matches a sibling module-root alias

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { intake } from "#jobs-service/modules/intake";
```

## Matches a current-module alias that traverses into a sibling

```typescript
// @filename: services/collect/src/service/modules/jobs/model/dto/job.dto.ts
import { status } from "#collect-service/modules/jobs/model/dto/../../../runs/model/dto/run.dto";
```

## Matches a current-owner service alias that traverses into the module tree

```typescript
// @filename: services/collect/src/service/model/policy/access.ts
import { router } from "#collect-service/model/../modules/runs/router";
```

## Matches a current-owner API alias with a dot segment

```typescript
// @filename: plugins/server/api/catalog/src/service/model/policy/access.ts
import { router } from "#catalog-api/./service/modules/browse/router";
```

## Matches a current-owner alias with an empty segment

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/model/policy/access.ts
export { policy } from "#catalog-api/service/modules/search//model/policy/access";
```

## Matches a named router that traverses out of its module

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { intake } from "../model/../../intake/router";
```

## Matches a deep module reach into root runtime authority

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { service } from "#jobs-service/impl";
```

## Matches a module re-export of a root composition surface

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/model/dto/search.ts
export { router } from "#catalog-api/service/router";
```

## Ignores root composition and the exact service-spine exception

```typescript
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "./modules/catalog/contract";
// @filename: services/jobs/src/service/router.ts
import {
  router as catalog,
  type CatalogRouter,
} from "#jobs-service/modules/catalog/router";
// @filename: plugins/server/api/catalog/src/service/modules/search/module.ts
import { service, type ServiceContext } from "../../impl";
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service, type ServiceContext } from "#jobs-service/impl";
// @filename: services/jobs/src/service/modules/catalog/middleware/capabilities.middleware.ts
import { createMiddleware } from "../../../base";
```

## Ignores local, same-module, and normalized owner imports

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { localRule } from "./local-rule";
import { CatalogPolicy } from "#jobs-service/modules/catalog/model/policy/catalog";
import { Clock } from "#jobs-service/model/ports/clock";
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
import { admitCatalogRead } from "../model/policy/catalog-read";
// @filename: plugins/server/api/catalog/src/service/modules/search/model/policy/access.ts
import { SearchPolicy } from "#catalog-api/service/modules/search/model/policy/search";
```
