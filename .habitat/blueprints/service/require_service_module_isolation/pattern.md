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

Inside a module, static imports and re-exports whose normalized targets remain
inside that module use normalized relative paths. Current-owner aliases do not
hide same-module locality and may not reach sibling modules, root runtime, or
the legacy `shared` tree. A module may use its service-private alias only for
`service/model/**`, where the target is service-wide inert meaning rather than
module implementation.

The exact `module.ts` import of the runtime `service` binding from
`../../impl` is the sole service-spine exception. Type-only companions may
share that import. A module's named `middleware/*.middleware.ts` may import
exactly the context-seeded `createMiddleware` factory from `../../../base`;
this is the sole module-middleware-to-base edge and may not carry other root
runtime authority. The closed module topology makes relative containment
decidable: module-root files stay local, router and middleware leaves may hop
once into their module, and direct model leaves may hop twice without escaping
their module. Service root contract and router composition use exact relative
module imports.

In governed non-test service source, every current-owner alias must use a
normalized path: empty, `.` and `..` path segments are rejected anywhere after
the owner prefix. A module does not use its current-owner alias to enter the
module tree, even when that alias names the current module; a relative path
must expose that colocality.
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
    $source <: r"^[\"'](?:\./|(?:\.\./)+)(?:[^/\"']+/)*modules/[^\"']+[\"']$",
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

// Reserves root-to-module edges for exact relative contract and router composition.
predicate require_service_module_isolation_is_allowed_root_composition_import($import, $source) {
  or {
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/contract\.ts$",
      $source <: r"^[\"']\./modules/[^/\"']+/contract[\"']$",
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
      $source <: r"^[\"']\./modules/[^/\"']+/router[\"']$",
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

// Rejects relative spelling that obscures the normalized owner target.
predicate require_service_module_isolation_violates_relative_normalization($source) {
  or {
    $source <: r"^[\"'](?:\.|\.\.|\./|\.\./)[\"']$",
    $source <: r"^[\"'][^\"']*//[^\"']*[\"']$",
    $source <: r"^[\"'][^\"']*/[\"']$",
    $source <: r"^[\"'][^\"']*/\.(?:/[^\"']*)?[\"']$"
  }
}

// Detects any source containing a parent segment.
predicate require_service_module_isolation_has_parent_segment($source) {
  $source <: r"^[\"'](?:[^/\"']+/)*\.\.(?:/[^\"']*)?[\"']$"
}

// Recognizes one normalized leading parent hop with no later traversal.
predicate require_service_module_isolation_is_one_parent_source($source) {
  $source <: r"^[\"']\.\./[^\"']*[^/\"'][\"']$",
  ! $source <: r"^[\"']\.\./\.\./",
  ! $source <: r"^[\"']\.\./(?:[^/\"']+/)*(?:\.|\.\.)(?:/[^\"']*)?[\"']$"
}

// Recognizes two normalized leading parent hops with no later traversal.
predicate require_service_module_isolation_is_two_parent_source($source) {
  $source <: r"^[\"']\.\./\.\./[^\"']*[^/\"'][\"']$",
  ! $source <: r"^[\"']\.\./\.\./\.\./",
  ! $source <: r"^[\"']\.\./\.\./(?:[^/\"']+/)*(?:\.|\.\.)(?:/[^\"']*)?[\"']$"
}

// Uses the closed module shell to prove that parent hops remain inside their owner.
predicate require_service_module_isolation_is_contained_parent_source($source) {
  or {
    and {
      $filename <: r".*/src/service/modules/[^/]+/(?:middleware|router)/[^/]+\.ts$",
      require_service_module_isolation_is_one_parent_source(source=$source)
    },
    and {
      $filename <: r".*/src/service/modules/[^/]+/model/[^/]+/[^/]+\.ts$",
      or {
        require_service_module_isolation_is_one_parent_source(source=$source),
        require_service_module_isolation_is_two_parent_source(source=$source)
      }
    }
  }
}

// Recognizes the root implementation source owned by the current module's service.
predicate require_service_module_isolation_is_current_root_impl_source($source) {
  $source <: r"^[\"']\.\./\.\./impl[\"']$"
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

// Preserves the one base-authoring edge for standalone and API-plugin module middleware.
predicate require_service_module_isolation_is_exact_module_base_import($import, $source) {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/middleware/[^/]+\.middleware\.ts$",
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

// Recognizes every private alias owned by the current service or API package.
predicate require_service_module_isolation_is_current_owner_alias($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service(?:/[^\"']*)?[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api(?:/[^\"']*)?[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Reserves the owner alias for service-wide inert model meaning.
predicate require_service_module_isolation_is_current_owner_service_model_alias($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/model/[^\"']+[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/model/[^\"']+[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Rejects every current-owner alias from a module unless it names service/model.
predicate require_service_module_isolation_violates_module_owner_alias($source) {
  require_service_module_isolation_is_current_owner_alias(source=$source),
  not {
    require_service_module_isolation_is_current_owner_service_model_alias(source=$source)
  }
}

// Keeps named operation leaves below, rather than importing, their module composition face.
predicate require_service_module_isolation_reaches_module_router_composition($source) {
  $filename <: r".*/src/service/modules/[^/]+/router/[^/]+\.router\.ts$",
  $source <: r"^[\"']\.\./router(?:\.ts)?[\"']$"
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
  import_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    require_service_module_isolation_violates_relative_normalization(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    $source <: string(),
    require_service_module_isolation_violates_relative_normalization(source=$source)
  },
  import_statement(source=$source) as $import where {
    require_service_module_isolation_is_service_isolation_module_source(),
    require_service_module_isolation_has_parent_segment(source=$source),
    not {
      require_service_module_isolation_is_exact_module_service_import(import=$import, source=$source)
    },
    not {
      require_service_module_isolation_is_exact_module_base_import(import=$import, source=$source)
    },
    not {
      require_service_module_isolation_is_contained_parent_source(source=$source)
    }
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    $source <: string(),
    require_service_module_isolation_has_parent_segment(source=$source),
    not {
      require_service_module_isolation_is_contained_parent_source(source=$source)
    }
  },
  import_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    require_service_module_isolation_reaches_module_router_composition(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    $source <: string(),
    require_service_module_isolation_reaches_module_router_composition(source=$source)
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
    require_service_module_isolation_violates_module_owner_alias(source=$source)
  },
  export_statement(source=$source) where {
    require_service_module_isolation_is_service_isolation_module_source(),
    $source <: string(),
    require_service_module_isolation_violates_module_owner_alias(source=$source)
  }
}
```

## Matches a root import of module implementation

```typescript
// @filename: services/jobs/src/service/model/helpers/catalog.ts
import { repository } from "../../modules/catalog/model/ports/catalog-repository";
```

## Matches a root re-export of module implementation

```typescript
// @filename: plugins/server/api/catalog/src/service/impl.ts
export type { SearchContext } from "#catalog-api/service/modules/search/module";
```

## Matches a relative path that leaves its module

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { dependency } from "../../../model/ports/dependency";
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

## Matches a same-module alias that hides colocality

```typescript
// @filename: services/collect/src/service/modules/jobs/model/policy/job.ts
import { status } from "#collect-service/modules/jobs/model/dto/job";
```

## Matches a legacy shared alias from a module

```typescript
// @filename: services/collect/src/service/modules/jobs/model/policy/job.ts
import { status } from "#collect-service/shared/status";
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

## Ignores exact relative root composition and service-spine edges

```typescript
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "./modules/catalog/contract";
// @filename: services/jobs/src/service/router.ts
import { router as catalog, type CatalogRouter } from "./modules/catalog/router";
// @filename: plugins/server/api/catalog/src/service/modules/search/module.ts
import { service, type ServiceContext } from "../../impl";
// @filename: services/jobs/src/service/modules/catalog/middleware/capabilities.middleware.ts
import { createMiddleware } from "../../../base";
```

## Ignores normalized relative module imports and service-model aliases

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { localRule } from "./local-rule";
import { CatalogPolicy } from "../dto/catalog";
import { Clock } from "#jobs-service/model/ports/clock";
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
import { admitCatalogRead } from "../model/policy/catalog-read";
// @filename: plugins/server/api/catalog/src/service/modules/search/model/policy/access.ts
import { SearchPolicy } from "../dto/search";
import { Clock } from "#catalog-api/model/ports/clock";
```
