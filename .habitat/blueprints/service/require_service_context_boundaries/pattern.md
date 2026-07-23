---
level: error
tags: [orpc, service, categorical, context]
---
# Require Service Context Boundaries

Modules receive root context through the root `service` anchor. At any module
depth, a current-owner alias must not expose root `base`, `context`, or root
middleware. The module-isolation packet owns all parent-segment sources and the
one exact `module.ts` `{ service }` exception, so this packet does not duplicate
that path matching.

Every middleware source contains at least one named direct `const` export
initialized from exact imported vendor `os` or an exact imported `base`,
`service`, or `module` anchor. Default exports are rejected. Source legality
for those anchors belongs to the module-boundary law; other declarations are
outside this relation. TypeScript and behavior tests own callback context
narrowing and request isolation.

```grit
language js(typescript)

// Applies root-context isolation to non-test module interiors.
predicate is_service_context_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Identifies middleware files that must expose a named native entry.
predicate is_middleware_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Prevents a module from recovering its owner's root context through aliases.
predicate is_current_root_context_alias($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/(?:base|context|middleware(?:/.*)?)[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?(?:base|context|middleware(?:/.*)?)[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Recognizes the vendor root that may directly author middleware.
predicate imports_vendor_os($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    $import <: `import { os } from $source`
  }
}

// Requires middleware owners to enter through runtime named anchors.
predicate imports_exact_anchor($body, $anchor) {
  $body <: contains import_specifier(name=$anchor) as $specifier where {
    $specifier <: not contains type(),
    $specifier <: $anchor
  }
}

// Keeps middleware creation visibly rooted in its imported native owner.
predicate is_direct_middleware($value, $owner) {
  or {
    $value <: `$receiver.middleware($handler)`,
    $value <: `$receiver.middleware<$types>($handler)`
  },
  or {
    $receiver <: $owner,
    $receiver <: contains `$owner.$member`
  }
}

// Admits middleware only when its receiver has native imported authority.
predicate is_native_middleware($body, $value) {
  or {
    and {
      imports_vendor_os(body=$body),
      is_direct_middleware(value=$value, owner=`os`)
    },
    and {
      imports_exact_anchor(body=$body, anchor=`base`),
      is_direct_middleware(value=$value, owner=`base`)
    },
    and {
      imports_exact_anchor(body=$body, anchor=`service`),
      is_direct_middleware(value=$value, owner=`service`)
    },
    and {
      imports_exact_anchor(body=$body, anchor=`module`),
      is_direct_middleware(value=$value, owner=`module`)
    }
  }
}

// Requires each middleware file to publish a named native entry.
predicate exports_named_native_middleware($body) {
  or {
    $body <: contains `export const $name = $value` where {
      is_native_middleware(body=$body, value=$value)
    },
    $body <: contains `export const $name: $type = $value` where {
      is_native_middleware(body=$body, value=$value)
    }
  }
}

or {
  import_statement(source=$source) where {
    is_service_context_module_source(),
    is_current_root_context_alias(source=$source)
  },
  export_statement(source=$source) where {
    is_service_context_module_source(),
    $source <: string(),
    is_current_root_context_alias(source=$source)
  },
  program(statements=$body) where {
    is_middleware_source(),
    not { exports_named_native_middleware(body=$body) }
  },
  or {
    `export default $value`,
    `export { $..., $value as default, $... }`,
    `export { $..., default, $... } from $source`
  } where {
    is_middleware_source()
  }
}
```

## Matches a deep standalone root-context alias

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import type { Dependencies } from "#jobs-service/context";
export const policy = buildPolicy<Dependencies>();
```

## Matches a deep API root-context re-export

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/model/policy/access.ts
export type { Context } from "#catalog-api/service/middleware/context.middleware";
```

## Matches a middleware source without a named native const

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/factory.ts
export function provideCatalog() { return ({ next }) => next(); }
```

## Matches a direct default middleware export

```typescript
// @filename: plugins/server/api/catalog/src/service/middleware/authentication.ts
import { os } from "@orpc/server";
export const authentication = os.middleware(handler); export default authentication;
```

## Matches a default middleware export specifier

```typescript
// @filename: services/jobs/src/service/middleware/context.ts
import { base } from "../base";
export const middleware = base.middleware(handler); export { middleware as default };
```

## Matches a default middleware re-export

```typescript
// @filename: services/jobs/src/service/middleware/context.ts
import { base } from "../base";
export const middleware = base.middleware(handler); export { default } from "./legacy";
```

## Ignores named direct native middleware

```typescript
// @filename: services/jobs/src/service/middleware/context.middleware.ts
import { os } from "@orpc/server";
export const provideContext = os.$context<InitialContext>().middleware(handler);
// @filename: services/jobs/src/service/modules/catalog/middleware/access.middleware.ts
import { module } from "#jobs-service/modules/catalog/module";
export const requireRead = module.middleware(readAccess);
```

## Ignores relative root context for the module-boundary rule

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import type { Context } from "../../../../context";
export const access = readAccess<Context>();
```
