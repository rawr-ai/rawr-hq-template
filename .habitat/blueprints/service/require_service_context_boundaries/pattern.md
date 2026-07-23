---
level: error
tags: [orpc, service, categorical, context]
---
# Require Service Context Boundaries

The root implementer establishes the service's initial oRPC context. A module
inherits and narrows that context through middleware; its exported implementer
branch does not call `$context` again because that would reset the accumulated
context and middleware chain.

Middleware APIs use named exports so imports retain a visible owner. Default
exports are rejected. TypeScript and behavioral tests own context shape,
contribution merging, request isolation, and middleware order.

```grit
language js(typescript)

// Assigns context inheritance to each module's implementation boundary.
predicate service_context_is_module_boundary() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Includes both middleware.ts boundaries and files nested below middleware/.
predicate service_context_is_middleware_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:.*/)?middleware(?:/.*)?\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

or {
  program(statements=$body) where {
    service_context_is_module_boundary(),
    $body <: contains or {
      `export const module = $value`,
      `export const module: $type = $value`
    } where {
      $value <: contains or {
        `$receiver.$method($...)`,
        `$receiver.$method<$types>($...)`
      },
      $method <: r"^\$context$"
    }
  },
  or {
    `export default $value`,
    `export { $..., $value as default, $... }`,
    `export { $..., $value as "default", $... }`,
    `export { $..., $value as default, $... } from $source`,
    `export { $..., $value as "default", $... } from $source`,
    `export { $..., default, $... } from $source`,
    `export { $..., "default", $... } from $source`
  } where {
    service_context_is_middleware_source()
  }
}
```

## Matches a module that resets inherited context

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { impl } from "../../impl";
export const module = impl.catalog.$context<CatalogContext>();
```

## Matches default middleware exports

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware.ts
export const authentication = createAuthentication();
export default authentication;
// @filename: plugins/server/api/catalog/src/service/middleware/authentication.ts
export { authentication as "default" } from "./legacy";
```

## Ignores root context and named middleware exports

```typescript
// @filename: plugins/server/api/catalog/src/service/impl.ts
import { implement } from "@orpc/server";
import { contract } from "./contract";
export const service = implement(contract).$context<Context>();
// @filename: services/jobs/src/service/modules/catalog/middleware.ts
export const authentication = createAuthentication();
export { createAuthorization } from "./authorization";
```
