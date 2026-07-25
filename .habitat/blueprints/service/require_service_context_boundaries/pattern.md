---
level: error
tags: [orpc, service, categorical, context, middleware]
---
# Require Service Context Funnel

Service context narrows in one direction. A standalone `base.ts` owns
`Dependencies`, `InitialContext`, and execution `Context` plus the host
admission projection. An embedded API `base.ts` owns its admitted request
`Context`. Standalone `impl.ts` separates the exact service-authoring view from
the host-admission boundary; API `impl.ts` begins from its admitted context.
Each `module.ts` owns its smaller context and final module projection. Router
handlers consume only that module context.

There is no second context assembly site. Root or module
`middleware/context.ts` and `context.middleware.ts` files are invalid, as are
context-shape declarations outside `base.ts` or `module.ts`. A module cannot
recover root context through a current-owner `base`, `context`, `middleware`,
or `model/dependencies` alias.

Other middleware remains an owner-qualified native capability. Every
middleware source exports at least one named direct `const` initialized from
exact imported vendor `os`, native `decorateMiddleware`, or an exact imported
`base`, `service`, or `module` anchor. A named native `mapInput` or `concat`
derivative is also valid. Default middleware exports are invalid.

In production service source that imports native oRPC composition authority,
the first argument to every `.use` attachment is a bare named middleware
reference, not an inline expression or a locally declared plain callback.
Later selector arguments remain ordinary callbacks. TypeScript and behavior
tests own imported-reference provenance, context narrowing, ordering, and
request isolation.

Router handlers receive the final module context. They must not reopen the raw
service transport lanes `deps`, `scope`, `config`, `invocation`, or `provided`.
This source law intentionally does not infer the semantic contents of context.
TypeScript proves the declared authoring views. Behavior tests prove
construction, middleware order, and outcomes; native oRPC does not physically
remove accumulated runtime keys.

```grit
language js(typescript)

// Selects non-test module interiors governed by the context funnel.
predicate is_service_context_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects a standalone service base that owns host admission.
predicate is_standalone_service_base_source() {
  $filename <: r".*services/[^/]+/src/service/base\.ts$"
}

// Selects an embedded API base that owns only its admitted request context.
predicate is_api_service_base_source() {
  $filename <: r".*plugins/server/api/[^/]+/src/service/base\.ts$"
}

// Selects each module owner that must declare its final authoring context.
predicate is_module_context_owner_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Reserves context-shape declarations for base.ts and module.ts.
predicate is_non_context_owner_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*",
  ! $filename <: r".*/src/service/base\.ts$",
  ! $filename <: r".*/src/service/modules/[^/]+/module\.ts$"
}

// Identifies the exact former context-assembly destinations.
predicate is_context_assembly_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/context(?:\.middleware)?\.ts$"
}

// Selects both compact routers and named operation-group routers.
predicate is_module_router_authorship_source() {
  or {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$",
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.router\.ts$"
  }
}

// Identifies middleware files that must expose named native authority.
predicate is_middleware_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Restricts attachment policy to production service interiors.
predicate is_middleware_attachment_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Prevents deep module source from recovering raw service context through an alias.
predicate is_current_root_context_alias($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/(?:base|context|middleware(?:/.*)?|model/dependencies(?:/.*)?)[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/[^/]+/.*\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?(?:base|context|middleware(?:/.*)?|model/dependencies(?:/.*)?)[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Requires native middleware owners to enter through runtime named imports.
predicate imports_runtime_binding($import, $anchor) {
  $import <: contains import_specifier(name=$anchor) as $specifier where {
    $specifier <: not contains type(),
    $specifier <: $anchor
  }
}

// Recognizes the vendor root that may directly author middleware.
predicate imports_vendor_os($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    imports_runtime_binding(import=$import, anchor=`os`)
  }
}

// Recognizes the native decorator that turns a callback into middleware.
predicate imports_vendor_decorator($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    imports_runtime_binding(import=$import, anchor=`decorateMiddleware`)
  }
}

// Recognizes a module-local native authoring anchor.
predicate imports_module_anchor() {
  $program <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"'](?:\./|\.\./)module[\"']$",
    imports_runtime_binding(import=$import, anchor=`module`)
  }
}

// Recognizes the root service authoring anchor without admitting an upward module edge.
predicate imports_service_anchor() {
  $program <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']\./impl[\"']$",
    imports_runtime_binding(import=$import, anchor=`service`)
  }
}

// Recognizes a direct raw service-base import.
predicate imports_base_anchor() {
  $program <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"'](?:\./|\.\./)base[\"']$",
    imports_runtime_binding(import=$import, anchor=`base`)
  }
}

// Recognizes native API contract implementation authority.
predicate imports_implement_anchor() {
  $program <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    imports_runtime_binding(import=$import, anchor=`implement`)
  }
}

// Recognizes a named native anchor in the current middleware source.
predicate imports_exact_anchor($body, $anchor) {
  $body <: contains import_statement() as $import where {
    imports_runtime_binding(import=$import, anchor=$anchor)
  }
}

// Keeps middleware construction visibly rooted in its imported native owner.
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

// Recognizes a callback explicitly decorated as native oRPC middleware.
predicate is_decorated_middleware($value) {
  or {
    $value <: `decorateMiddleware($handler)`,
    $value <: `decorateMiddleware<$types>($handler)`
  }
}

// Recognizes native middleware composition retained by a named derivative.
predicate is_native_middleware_derivative($value) {
  or {
    $value <: `$middleware.mapInput($mapper)`,
    $value <: `$middleware.mapInput<$types>($mapper)`,
    $value <: `$middleware.concat($other)`,
    $value <: `$middleware.concat($other, $mapper)`,
    $value <: `$middleware.concat<$types>($other)`,
    $value <: `$middleware.concat<$types>($other, $mapper)`
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
      imports_vendor_decorator(body=$body),
      is_decorated_middleware(value=$value)
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

// Requires every middleware file to publish a named native entry.
predicate exports_named_native_middleware($body) {
  or {
    $body <: contains `export const $name = $value` where {
      or {
        is_native_middleware(body=$body, value=$value),
        is_native_middleware_derivative(value=$value)
      }
    },
    $body <: contains `export const $name: $type = $value` where {
      or {
        is_native_middleware(body=$body, value=$value),
        is_native_middleware_derivative(value=$value)
      }
    }
  }
}

// Marks files whose `.use` vocabulary belongs to native oRPC composition.
predicate imports_native_orpc_authority() {
  or {
    imports_vendor_os(body=$program),
    imports_module_anchor(),
    imports_service_anchor(),
    imports_base_anchor(),
    imports_implement_anchor()
  }
}

// Recognizes an unwrapped callback before native middleware construction.
predicate is_direct_callback_expression($value) {
  or {
    $value <: arrow_function(),
    $value <: r"^\s*(?:async\s+)?function(?:\s*\*)?(?:\s+[A-Za-z_$][A-Za-z0-9_$]*)?\s*\("
  }
}

// Recognizes direct callbacks behind TypeScript annotation wrappers.
predicate is_plain_callback_expression($value) {
  or {
    is_direct_callback_expression(value=$value),
    $value <: `$callback satisfies $type` where {
      is_direct_callback_expression(value=$callback)
    },
    $value <: `($callback) satisfies $type` where {
      is_direct_callback_expression(value=$callback)
    },
    $value <: `$callback as $type` where {
      is_direct_callback_expression(value=$callback)
    },
    $value <: `($callback) as $type` where {
      is_direct_callback_expression(value=$callback)
    }
  }
}

// Recognizes a local callback that has not entered native middleware authority.
predicate is_local_plain_callback($middleware) {
  or {
    $program <: contains `const $middleware = $value` where {
      is_plain_callback_expression(value=$value)
    },
    $program <: contains `const $middleware: $type = $value` where {
      is_plain_callback_expression(value=$value)
    },
    $program <: contains `let $middleware = $value` where {
      is_plain_callback_expression(value=$value)
    },
    $program <: contains `let $middleware: $type = $value` where {
      is_plain_callback_expression(value=$value)
    },
    $program <: contains `function $middleware($args) { $body }`,
    $program <: contains `async function $middleware($args) { $body }`
  }
}

// Rejects attachments that do not name middleware with native authority.
predicate is_invalid_middleware_attachment($middleware) {
  is_middleware_attachment_source(),
  imports_native_orpc_authority(),
  or {
    not { $middleware <: identifier() },
    is_local_plain_callback(middleware=$middleware)
  }
}

// Requires the base owner to declare its external dependency shape.
predicate declares_dependencies($body) {
  $body <: contains or {
    `type Dependencies = $value`,
    `interface Dependencies { $members }`,
    `export type Dependencies = $value`,
    `export interface Dependencies { $members }`
  }
}

// Requires the host and execution context types to be visible service bounds.
predicate exports_initial_context($body) {
  $body <: contains or {
    `export type InitialContext = $value`,
    `export interface InitialContext { $members }`
  }
}

// Requires either service kind to expose its exact authoring context.
predicate exports_execution_context($body) {
  $body <: contains or {
    `export type Context = $value`,
    `export interface Context { $members }`
  }
}

// Requires a module owner to declare its exact local context.
predicate declares_module_context($body) {
  $body <: contains or {
    `type Context = $value`,
    `interface Context { $members }`,
    `export type Context = $value`,
    `export interface Context { $members }`
  }
}

or {
  program(statements=$body) where {
    is_context_assembly_source()
  },
  program(statements=$body) where {
    is_standalone_service_base_source(),
    not { declares_dependencies(body=$body) }
  },
  program(statements=$body) where {
    is_standalone_service_base_source(),
    not { exports_initial_context(body=$body) }
  },
  program(statements=$body) where {
    or {
      is_standalone_service_base_source(),
      is_api_service_base_source()
    },
    not { exports_execution_context(body=$body) }
  },
  program(statements=$body) where {
    is_module_context_owner_source(),
    not { declares_module_context(body=$body) }
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
  },
  or {
    `const provideContext = $value`,
    `export const provideContext = $value`,
    `const provideContext: $type = $value`,
    `export const provideContext: $type = $value`
  } where {
    is_non_context_owner_source()
  },
  import_statement(source=$source) where {
    is_service_context_module_source(),
    is_current_root_context_alias(source=$source)
  },
  export_statement(source=$source) where {
    is_service_context_module_source(),
    $source <: string(),
    is_current_root_context_alias(source=$source)
  },
  or {
    `type Context = $value`,
    `type InitialContext = $value`,
    `type Dependencies = $value`,
    `interface Context { $members }`,
    `interface InitialContext { $members }`,
    `interface Dependencies { $members }`,
    `export type Context = $value`,
    `export type InitialContext = $value`,
    `export type Dependencies = $value`,
    `export interface Context { $members }`,
    `export interface InitialContext { $members }`,
    `export interface Dependencies { $members }`
  } where {
    is_non_context_owner_source()
  },
  or {
    `context.deps`,
    `context.scope`,
    `context.config`,
    `context.invocation`,
    `context.provided`,
    `context?.deps`,
    `context?.scope`,
    `context?.config`,
    `context?.invocation`,
    `context?.provided`
  } where {
    is_module_router_authorship_source()
  },
  or {
    `$receiver.use($middleware, $...)`,
    `$receiver.use<$types>($middleware, $...)`
  } where {
    is_invalid_middleware_attachment(middleware=$middleware)
  }
}
```

## Matches a root context assembly file

```typescript
// @filename: services/jobs/src/service/middleware/context.middleware.ts
import { os } from "@orpc/server";
export const provideContext = os.$context<InitialContext>().middleware(handler);
```

## Matches a base without declared funnel context

```typescript
// @filename: services/jobs/src/service/base.ts
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
export const base = implementEffect(contract, Layer.empty);
```

## Matches a module context assembly file

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/middleware/context.ts
import { module } from "../module";
export const provideSearch = module.middleware(handler);
```

## Matches middleware without a named native export

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.middleware.ts
export function requireRead() {
  return ({ next }) => next();
}
```

## Matches a default middleware export

```typescript
// @filename: services/jobs/src/service/middleware/access.middleware.ts
import { os } from "@orpc/server";
export const requireAccess = os.middleware(handler);
export default requireAccess;
```

## Matches inline middleware attachment

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
export const router = module.list.use(async ({ next }) => next());
```

## Matches a named plain callback attachment

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
const requireRead = async ({ next }) => next();
export const router = module.list.use(requireRead);
```

## Matches a deep root dependency alias

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import type { CatalogReader } from "#jobs-service/model/dependencies/catalog";
export const canRead = (reader: CatalogReader) => reader.available;
```

## Matches a context declaration outside its owner

```typescript
// @filename: services/jobs/src/service/impl.ts
export type Context = { readonly catalog: CatalogReader };
export const service = base;
```

## Matches a compact router reopening raw dependencies

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
export const router = {
  find: module.find.effect(({ context }) => context.deps.catalog.find()),
};
```

## Matches an operation-group router reopening provided state

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
export const router = {
  find: module.find.effect(({ context }) => context.provided.catalog.find()),
};
```

## Ignores named native middleware

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.middleware.ts
import { os } from "@orpc/server";
export const requireRead = os.middleware(({ next }) => next());
```

## Ignores a named native derivative

```typescript
// @filename: services/jobs/src/service/middleware/access.middleware.ts
import { os } from "@orpc/server";
const read = os.middleware(({ next }) => next());
export const requireAccess = read.concat(authorize);
```

## Ignores a named middleware attachment and later selector callback

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
export const router = module.list.use(requireRead, ({ jobId }) => jobId);
```

## Ignores base-owned service context

```typescript
// @filename: services/jobs/src/service/base.ts
export type Dependencies = { readonly catalog: CatalogReader };
export type InitialContext = { readonly deps: Dependencies };
export type Context = { readonly catalog: CatalogReader };
export const base = implementEffect(contract, Layer.empty);
```

## Ignores module-owned final context and native authoring view

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { implementEffect } from "effect-orpc";
import type { Context as ServiceContext } from "../../base";
type Context = { readonly catalog: CatalogReader };
export const provideContext = os
  .$context<ServiceContext>()
  .middleware<Context>(({ context, next }) =>
    next({ context: { catalog: context.provided.catalog } })
  );
export const module = implementEffect(contract, Layer.empty).$context<Context>();
```

## Ignores a router consuming narrowed context


```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
export const router = {
  find: module.find.effect(({ context }) => context.catalog.find()),
};
```
