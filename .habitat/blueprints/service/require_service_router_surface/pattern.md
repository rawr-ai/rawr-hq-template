---
level: error
tags: [orpc, service, router, topology]
---
# Require One Service Module Router Surface

A module exposes exactly one router surface: `router.ts`, or `router/index.ts`
with named `*.router.ts` leaves and subrouters. The structure rule requires at
least one exact form and closes a router directory. This focused multifile
relation rejects the ambiguous case where both forms exist for one module.

```grit
language js(typescript)

// Reduces either router surface to its owning module directory.
function module_router_owner($value) js {
  return $value.text.replace(/\/router(?:\/index)?\.ts$/, "");
}

multifile {
  bubble($owner) file($body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$",
    $owner = module_router_owner($filename)
  },
  bubble($owner) file($body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/index\.ts$",
    $candidate = module_router_owner($filename),
    $candidate <: $owner
  }
}
```

## Matches both router surfaces in one module

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
export const router = {
  find: module.find.effect(({ context }) => context.catalog.find()),
};

// @filename: services/jobs/src/service/modules/catalog/router/index.ts
import { find } from "./find.router";
export const router = { find };
```

## Ignores a flat router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
export const router = {
  find: module.find.effect(({ context }) => context.catalog.find()),
};
```

## Ignores a directory router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
export const find = module.find.effect(({ context }) => context.catalog.find());

// @filename: services/jobs/src/service/modules/catalog/router/index.ts
import { find } from "./find.router";
export const router = { find };
```
