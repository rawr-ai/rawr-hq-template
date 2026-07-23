---
level: error
tags: [orpc, service, categorical-negative, module-isolation]
---
# Require Service Module Isolation

Root service code imports module code only at its two composition points:
`contract.ts` imports module contracts and `router.ts` imports module routers.
Root code never re-exports module code.

Inside a module, static relative imports and re-exports may not contain a
parent `..` segment, including normalized-looking forms such as `./../../...`
or `./local/../../...`. The sole exception is the exact `module.ts` import
`import { service } from "../../impl"`, retained for service interiors that do
not expose a private root alias. Other root or shared facts use the
current-owner alias.

A current-owner alias may address the same module, but it may not address a
sibling module, including the sibling's module-root barrel. Foreign-owner
aliases remain outside this ownership relation. The context-boundary packet
separately rejects current-owner root base, context, and middleware aliases.
Dynamic imports and transitive graph relations are outside this syntax law.

```grit
language js(typescript)

// Scopes module-boundary enforcement to production sources at the service root.
predicate is_root_service_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/src/service/modules/.*",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Scopes module-boundary enforcement to production sources owned by one module.
predicate is_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Recognizes dependencies that address a module owned by the current service.
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

// Admits only module contracts and routers at their corresponding root composition points.
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
    }
  }
}

// Detects a relative edge that escapes a module's local ownership boundary.
predicate has_parent_segment($source) {
  or {
    $source <: r"^[\"']\.\.(?:/[^\"']*)?[\"']$",
    $source <: r"^[\"']\.[^\"']*/\.\.(?:/[^\"']*)?[\"']$"
  }
}

// Preserves the sole parent edge from a module anchor to its root service branch.
predicate is_exact_module_service_import($import, $source) {
  $filename <: r".*/src/service/modules/[^/]+/module\.ts$",
  $source <: r"^[\"']\.\./\.\./impl[\"']$",
  $import <: `import { service } from $source`
}

// Detects a current-owner alias crossing from one module into a sibling module.
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

or {
  import_statement(source=$source) as $import where {
    is_root_service_source(),
    is_current_module_source(source=$source),
    not {
      is_allowed_root_composition_import(import=$import, source=$source)
    }
  },
  export_statement(source=$source) where {
    is_root_service_source(),
    $source <: string(),
    is_current_module_source(source=$source)
  },
  import_statement(source=$source) as $import where {
    is_module_source(),
    has_parent_segment(source=$source),
    not {
      is_exact_module_service_import(import=$import, source=$source)
    }
  },
  export_statement(source=$source) where {
    is_module_source(),
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
  }
}
```

## Matches a root import of module implementation

```typescript
// @filename: services/jobs/src/service/model/helper.ts
import { repository } from "../modules/catalog/model/repository";
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

## Matches a prefixed parent segment

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import type { Context } from "./../../../../context";
```

## Matches a normalized-looking parent segment

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import type { Context } from "./local/../../../../../context";
```

## Matches a parent-segment re-export

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/index.ts
export type { Context } from "../../../../context";
```

## Matches a sibling module-root alias

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { intake } from "#jobs-service/modules/intake";
```

## Matches a sibling alias re-export

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/model/index.ts
export { policy } from "#catalog-api/service/modules/browse/model/policy";
```

## Ignores root composition and the exact service spine exception

```typescript
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "./modules/catalog/contract";
// @filename: services/jobs/src/service/router.ts
import { router as catalog } from "#jobs-service/modules/catalog/router";
// @filename: plugins/server/api/catalog/src/service/modules/search/module.ts
import { service } from "../../impl";
```

## Ignores local, same-module, and foreign-owner aliases

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { localRule } from "./local-rule";
import { CatalogPolicy } from "#jobs-service/modules/catalog/model/policy/catalog";
import { IntakePolicy } from "#foreign-service/modules/intake";
```
