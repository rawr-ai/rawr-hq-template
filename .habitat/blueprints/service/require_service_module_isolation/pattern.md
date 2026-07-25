---
level: error
tags: [orpc, service, categorical, module]
---
# Require Service Module Isolation

The root crosses into a module only at composition:

- `contract.ts` imports the module contract.
- `router.ts` imports the completed module router and the module-owned
  `provideContext` boundary.

A module never imports the root runtime implementation. `module.ts` may import
the root `Context` as a type because that type is the admitted service-to-module
boundary, not executable authority. Named router files may use one parent hop
to reach their own `module.ts` and same-module model kinds. Two or more parent
hops escape the module and are rejected.

Current-owner aliases may address service-owned model facts or the same module,
but never a sibling module. Capabilities still arrive through context; an alias
does not replace the funnel.

```grit
language js(typescript)

// Selects non-test source owned by the service root.
predicate is_root_service_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/src/service/modules/.*",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects non-test source inside one service module.
predicate is_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects only the contract, module, or compact-router file at a module root.
predicate is_direct_module_root_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/(?:contract|module|router)\.ts$"
}

// Recognizes an import or export into the current owner's module tree.
predicate is_current_module_source($source) {
  or {
    $source <: r"^[\"'](?:\./|(?:\.\./)+)modules/[^/]+(?:/.*)?[\"']$",
    and {
      $filename <: r".*services/([^/]+)/src/service/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/modules/[^/]+(?:/.*)?[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?modules/[^/]+(?:/.*)?[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Admits only the three root-to-module composition relations.
predicate is_allowed_root_composition_import($import, $source) {
  or {
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/contract\.ts$",
      $source <: r"^[\"'](?:\./modules/[^/]+/contract|#[^/]+-(?:service|api)/(?:service/)?modules/[^/]+/contract)[\"']$",
      $import <: `import { contract as $branch } from $source`
    },
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
      $source <: r"^[\"'](?:\./modules/[^/]+/router|#[^/]+-(?:service|api)/(?:service/)?modules/[^/]+/router)[\"']$",
      $import <: `import { router as $branch } from $source`
    },
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
      $source <: r"^[\"'](?:\./modules/[^/]+/module|#[^/]+-(?:service|api)/(?:service/)?modules/[^/]+/module)[\"']$",
      $import <: `import { provideContext as $provider } from $source`
    }
  }
}

// Recognizes any relative source that begins by leaving its current directory.
predicate has_parent_segment($source) {
  $source <: r"^[\"'](?:\./)*\.\.(?:/[^\"']*)?[\"']$"
}

// Recognizes a relative source that leaves a nested module interior.
predicate has_multiple_parent_segments($source) {
  or {
    $source <: r"^[\"'](?:\./)*\.\./(?:[^\"']*/)?\.\.(?:/[^\"']*)?[\"']$",
    $source <: r"^[\"'](?:\./)*\.\./(?:[^\"']*/)*\.\./[^\"']*[\"']$"
  }
}

// Preserves the one type-only service-to-module context declaration edge.
predicate is_type_only_base_context_import($import, $source) {
  $filename <: r".*/src/service/modules/[^/]+/module\.ts$",
  $source <: r"^[\"']\.\./\.\./base[\"']$",
  or {
    $import <: import_statement(type=type()),
    $import <: `import { type Context as $name } from $source`,
    $import <: `import { type Context } from $source`
  }
}

// Rejects an alias that reaches a sibling module in the same service.
predicate crosses_aliased_sibling($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/([^/]+)/.*\.ts$"($owner, $module_name),
      $source <: r"^[\"']#([^/]+)-service/modules/([^/]+)(?:/.*)?[\"']$"($alias_owner, $target_module),
      $alias_owner <: $owner,
      not { $target_module <: $module_name }
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/([^/]+)/.*\.ts$"($owner, $module_name),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?modules/([^/]+)(?:/.*)?[\"']$"($alias_owner, $target_module),
      $alias_owner <: $owner,
      not { $target_module <: $module_name }
    }
  }
}

// Rejects current-owner root execution anchors from every module interior.
predicate reaches_current_root_runtime($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/(?:base|impl|contract|router|context|middleware(?:/.*)?)[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?(?:base|impl|contract|router|context|middleware(?:/.*)?)[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

or {
  import_statement(source=$source) as $import where {
    is_root_service_source(),
    is_current_module_source(source=$source),
    not { is_allowed_root_composition_import(import=$import, source=$source) }
  },
  export_statement(source=$source) where {
    is_root_service_source(),
    $source <: string(),
    is_current_module_source(source=$source)
  },
  import_statement(source=$source) as $import where {
    is_module_source(),
    has_multiple_parent_segments(source=$source),
    not { is_type_only_base_context_import(import=$import, source=$source) }
  },
  export_statement(source=$source) where {
    is_module_source(),
    $source <: string(),
    has_multiple_parent_segments(source=$source)
  },
  import_statement(source=$source) as $import where {
    is_direct_module_root_source(),
    has_parent_segment(source=$source),
    not { is_type_only_base_context_import(import=$import, source=$source) }
  },
  export_statement(source=$source) where {
    is_direct_module_root_source(),
    $source <: string(),
    has_parent_segment(source=$source)
  },
  import_statement(source=$source) where {
    is_module_source(),
    crosses_aliased_sibling(source=$source)
  },
  export_statement(source=$source) where {
    is_module_source(),
    $source <: string(),
    crosses_aliased_sibling(source=$source)
  },
  import_statement(source=$source) where {
    is_module_source(),
    reaches_current_root_runtime(source=$source)
  },
  export_statement(source=$source) where {
    is_module_source(),
    $source <: string(),
    reaches_current_root_runtime(source=$source)
  }
}
```

## Matches a root implementation import

```typescript
// @filename: services/jobs/src/service/impl.ts
import { catalog } from "./modules/catalog/model/policy/catalog";
```

## Matches a module runtime reach into the root

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "../../impl";
```

## Matches a sibling module alias

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { intake } from "#jobs-service/modules/intake/router";
```

## Matches a relative sibling module import

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { intake } from "../intake/router";
```

## Matches an aliased root runtime import

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { service } from "#jobs-service/impl";
```

## Ignores exact root composition

```typescript
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "./modules/catalog/contract";
```

```typescript
// @filename: services/jobs/src/service/router.ts
import { provideContext as provideCatalogContext } from "./modules/catalog/module";
import { router as catalog } from "./modules/catalog/router";
```

## Ignores the type-only service boundary and same-module parent hop

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import type { Context as ServiceContext } from "../../base";
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
import { admitCatalogRead } from "../model/policy";
```
