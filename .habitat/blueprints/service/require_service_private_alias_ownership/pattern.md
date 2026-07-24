---
level: error
tags: [service, api, dependency, private-alias]
---
# Require Service Private Alias Ownership

A private alias is an owner-local path into one service interior. The matching
standalone service or API plugin may use its own alias in static imports,
re-exports, type imports, or runtime loaders. Every foreign, cross-kind, or
outside-owner use is a violation. Public cross-project dependencies use package
exports instead.

```grit
language js(typescript)

// Identifies the private alias namespace shared by service and API owners.
predicate is_private_service_alias($source) {
  $source <: r"^[\"']#[^/]+-(?:service|api)(?:/[^\"']*)?[\"']$"
}

// Admits only the current standalone service owner's qualified alias.
predicate is_matching_service_owner_alias($source) {
  $filename <: r".*services/([^/]+)/.*"($owner),
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*services/[^/]+/.*"
  },
  $source <: r"^[\"']#([^/]+)-service/[^\"']+[\"']$"($alias_owner),
  $alias_owner <: $owner
}

// Admits only the current API plugin owner's qualified alias.
predicate is_matching_api_owner_alias($source) {
  $filename <: r".*plugins/server/api/([^/]+)/.*"($owner),
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*plugins/server/api/[^/]+/.*"
  },
  $source <: r"^[\"']#([^/]+)-api/[^\"']+[\"']$"($alias_owner),
  $alias_owner <: $owner
}

// Defines the complete owner relation for private alias sources.
predicate is_matching_private_alias_owner($source) {
  or {
    is_matching_service_owner_alias(source=$source),
    is_matching_api_owner_alias(source=$source)
  }
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`,
  `require.resolve($source)`
} where {
  is_private_service_alias(source=$source),
  not { is_matching_private_alias_owner(source=$source) }
}
```

## Matches an outside-owner private alias

```typescript
// @filename: packages/core/src/index.ts
import type { Context } from "#jobs-service/context";
```

## Matches a foreign service alias

```typescript
// @filename: services/jobs/src/service/router.ts
export { router } from "#catalog-service/router";
```

## Matches a cross-kind alias

```typescript
// @filename: plugins/server/api/catalog/src/api.ts
void import("#catalog-service/router");
```

## Matches a private root alias

```typescript
// @filename: services/jobs/src/index.ts
type Service = typeof import("#jobs-service");
```

## Matches a nested path that only resembles an owner root

```typescript
// @filename: tools/generator/services/jobs/src/index.ts
import { base } from "#jobs-service/base";
```

## Matches a same-family nested service path

```typescript
// @filename: services/outer/test/services/jobs/src/index.ts
import { base } from "#jobs-service/base";
```

## Ignores matching owner aliases

```typescript
// @filename: services/jobs/src/service/router.ts
import { base } from "#jobs-service/base";
export type { Context } from "#jobs-service/model/context";
type Service = typeof import("#jobs-service/impl");
// @filename: plugins/server/api/catalog/src/api.ts
const service = require("#catalog-api/service/impl");
```
