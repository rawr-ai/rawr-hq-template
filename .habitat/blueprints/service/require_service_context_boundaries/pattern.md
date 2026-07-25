---
level: error
tags: [orpc, service, categorical, context, middleware]
---
# Require Service Context Funnel

Service context narrows in one direction. A standalone `base.ts` owns
`Dependencies`, `InitialContext`, execution `Context`, and the sole direct
Effect-oRPC contract implementer. An embedded API `base.ts` owns its admitted
request `Context`. Standalone `impl.ts` derives `service` from the imported
base; API `impl.ts` begins from its admitted context. Each `module.ts` derives
the matching `service.<module>` branch. A bare branch inherits service context
without restating it. A module that narrows or enriches context declares its
local `Context` there and applies it through named native middleware on the
exported module chain. Router handlers consume only that resulting context.

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
predicate require_service_context_boundaries_is_service_context_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects a standalone service base that owns dependencies and service context.
predicate require_service_context_boundaries_is_standalone_service_base_source() {
  $filename <: r".*services/[^/]+/src/service/base\.ts$"
}

// Selects an embedded API base that owns only its admitted request context.
predicate require_service_context_boundaries_is_api_service_base_source() {
  $filename <: r".*plugins/server/api/[^/]+/src/service/base\.ts$"
}

// Selects each module owner that may narrow or enrich its inherited context.
predicate require_service_context_boundaries_is_module_context_owner_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Reserves context-shape declarations for base.ts and module.ts.
predicate require_service_context_boundaries_is_non_context_owner_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*",
  ! $filename <: r".*/src/service/base\.ts$",
  ! $filename <: r".*/src/service/modules/[^/]+/module\.ts$"
}

// Identifies the exact former context-assembly destinations.
predicate require_service_context_boundaries_is_context_assembly_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/context(?:\.middleware)?\.ts$"
}

// Selects named operation leaves and groups where handlers are authored.
predicate require_service_context_boundaries_is_module_router_authorship_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.router\.ts$"
}

// Identifies middleware files that must expose named native authority.
predicate require_service_context_boundaries_is_middleware_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Restricts attachment policy to production service interiors.
predicate require_service_context_boundaries_is_middleware_attachment_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Prevents deep module source from recovering raw service context through an alias.
predicate require_service_context_boundaries_is_current_root_context_alias($source) {
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
predicate require_service_context_boundaries_imports_runtime_binding($import, $anchor) {
  not { $import <: import_statement(type=type()) },
  $import <: contains import_specifier(name=$anchor) as $specifier where {
    not { $specifier <: r"^type\s+.*$" }
  }
}

// Recognizes the vendor root that may directly author middleware.
predicate require_service_context_boundaries_imports_vendor_os($body) {
  $body <: some import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    require_service_context_boundaries_imports_runtime_binding(import=$import, anchor=`os`)
  }
}

// Recognizes the native decorator that turns a callback into middleware.
predicate require_service_context_boundaries_imports_vendor_decorator($body) {
  $body <: some import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    require_service_context_boundaries_imports_runtime_binding(import=$import, anchor=`decorateMiddleware`)
  }
}

// Recognizes a module-local native authoring anchor.
predicate require_service_context_boundaries_imports_module_anchor($body) {
  $body <: some import_statement(source=$source) as $import where {
    $source <: r"^[\"'](?:\./|\.\./)module[\"']$",
    require_service_context_boundaries_imports_runtime_binding(import=$import, anchor=`module`)
  }
}

// Recognizes the root service authoring anchor at its exact root or module edge.
predicate require_service_context_boundaries_imports_service_anchor($body) {
  $body <: some import_statement(source=$source) as $import where {
    $source <: r"^[\"'](?:\./impl|\.\./\.\./impl|#[^\"']+-(?:service|api)/(?:service/)?impl)[\"']$",
    require_service_context_boundaries_imports_runtime_binding(import=$import, anchor=`service`)
  }
}

// Recognizes a direct raw service-base import.
predicate require_service_context_boundaries_imports_base_anchor($body) {
  $body <: some import_statement(source=$source) as $import where {
    $source <: r"^[\"'](?:\./|\.\./)base[\"']$",
    require_service_context_boundaries_imports_runtime_binding(import=$import, anchor=`base`)
  }
}

// Recognizes native API contract implementation authority.
predicate require_service_context_boundaries_imports_implement_anchor($body) {
  $body <: some import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    require_service_context_boundaries_imports_runtime_binding(import=$import, anchor=`implement`)
  }
}

// Keeps middleware construction visibly rooted in its imported native owner.
predicate require_service_context_boundaries_is_direct_middleware($value, $owner) {
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
predicate require_service_context_boundaries_is_decorated_middleware($value) {
  or {
    $value <: `decorateMiddleware($handler)`,
    $value <: `decorateMiddleware<$types>($handler)`
  }
}

// Admits middleware only when its receiver has native imported authority.
predicate require_service_context_boundaries_is_native_middleware($body, $value) {
  or {
    and {
      require_service_context_boundaries_imports_vendor_os(body=$body),
      require_service_context_boundaries_is_direct_middleware(value=$value, owner=`os`)
    },
    and {
      require_service_context_boundaries_imports_vendor_decorator(body=$body),
      require_service_context_boundaries_is_decorated_middleware(value=$value)
    },
    and {
      require_service_context_boundaries_imports_base_anchor(body=$body),
      require_service_context_boundaries_is_direct_middleware(value=$value, owner=`base`)
    },
    and {
      require_service_context_boundaries_imports_service_anchor(body=$body),
      require_service_context_boundaries_is_direct_middleware(value=$value, owner=`service`)
    },
    and {
      require_service_context_boundaries_imports_module_anchor(body=$body),
      require_service_context_boundaries_is_direct_middleware(value=$value, owner=`module`)
    }
  }
}

// Connects a derived middleware receiver to a local native middleware value.
predicate require_service_context_boundaries_has_local_native_middleware($body, $middleware) {
  or {
    $body <: contains `const $middleware = $native` where {
      require_service_context_boundaries_is_native_middleware(body=$body, value=$native)
    },
    $body <: contains `const $middleware: $type = $native` where {
      require_service_context_boundaries_is_native_middleware(body=$body, value=$native)
    }
  }
}

// Recognizes native middleware composition retained by a named derivative.
predicate require_service_context_boundaries_is_native_middleware_derivative($body, $value) {
  or {
    $value <: `$middleware.mapInput($mapper)`,
    $value <: `$middleware.mapInput<$types>($mapper)`,
    $value <: `$middleware.concat($other)`,
    $value <: `$middleware.concat($other, $mapper)`,
    $value <: `$middleware.concat<$types>($other)`,
    $value <: `$middleware.concat<$types>($other, $mapper)`
  },
  require_service_context_boundaries_has_local_native_middleware(
    body=$body,
    middleware=$middleware
  )
}

// Requires every middleware file to publish a named native entry.
predicate require_service_context_boundaries_exports_named_native_middleware($body) {
  or {
    $body <: some `export const $name = $value` where {
      or {
        require_service_context_boundaries_is_native_middleware(body=$body, value=$value),
        require_service_context_boundaries_is_native_middleware_derivative(body=$body, value=$value)
      }
    },
    $body <: some `export const $name: $type = $value` where {
      or {
        require_service_context_boundaries_is_native_middleware(body=$body, value=$value),
        require_service_context_boundaries_is_native_middleware_derivative(body=$body, value=$value)
      }
    }
  }
}

// Marks files whose `.use` vocabulary belongs to native oRPC composition.
predicate require_service_context_boundaries_imports_native_orpc_authority($body) {
  or {
    require_service_context_boundaries_imports_vendor_os(body=$body),
    require_service_context_boundaries_imports_module_anchor(body=$body),
    require_service_context_boundaries_imports_service_anchor(body=$body),
    require_service_context_boundaries_imports_base_anchor(body=$body),
    require_service_context_boundaries_imports_implement_anchor(body=$body)
  }
}

// Recognizes an unwrapped callback before native middleware construction.
predicate require_service_context_boundaries_is_direct_callback_expression($value) {
  or {
    $value <: arrow_function(),
    $value <: r"^\s*(?:async\s+)?function(?:\s*\*)?(?:\s+[A-Za-z_$][A-Za-z0-9_$]*)?\s*\("
  }
}

// Recognizes direct callbacks behind TypeScript annotation wrappers.
predicate require_service_context_boundaries_is_plain_callback_expression($value) {
  or {
    require_service_context_boundaries_is_direct_callback_expression(value=$value),
    $value <: `$callback satisfies $type` where {
      require_service_context_boundaries_is_direct_callback_expression(value=$callback)
    },
    $value <: `($callback) satisfies $type` where {
      require_service_context_boundaries_is_direct_callback_expression(value=$callback)
    },
    $value <: `$callback as $type` where {
      require_service_context_boundaries_is_direct_callback_expression(value=$callback)
    },
    $value <: `($callback) as $type` where {
      require_service_context_boundaries_is_direct_callback_expression(value=$callback)
    }
  }
}

// Finds a named middleware reference attached by the bound file body.
predicate require_service_context_boundaries_body_attaches_middleware($body, $middleware) {
  $body <: contains or {
    `$receiver.use($middleware, $...)`,
    `$receiver.use<$types>($middleware, $...)`
  }
}

// Matches each invalid attachment from the file body once, declaration first.
predicate require_service_context_boundaries_body_contains_invalid_middleware_attachment($body) {
  require_service_context_boundaries_imports_native_orpc_authority(body=$body),
  or {
    $body <: contains or {
      `$receiver.use($middleware, $...)`,
      `$receiver.use<$types>($middleware, $...)`
    } where {
      not { $middleware <: identifier() }
    },
    $body <: contains `const $middleware = $value` where {
      require_service_context_boundaries_is_plain_callback_expression(value=$value),
      require_service_context_boundaries_body_attaches_middleware(body=$body, middleware=$middleware)
    },
    $body <: contains `const $middleware: $type = $value` where {
      require_service_context_boundaries_is_plain_callback_expression(value=$value),
      require_service_context_boundaries_body_attaches_middleware(body=$body, middleware=$middleware)
    },
    $body <: contains `let $middleware = $value` where {
      require_service_context_boundaries_is_plain_callback_expression(value=$value),
      require_service_context_boundaries_body_attaches_middleware(body=$body, middleware=$middleware)
    },
    $body <: contains `let $middleware: $type = $value` where {
      require_service_context_boundaries_is_plain_callback_expression(value=$value),
      require_service_context_boundaries_body_attaches_middleware(body=$body, middleware=$middleware)
    },
    $body <: contains `function $middleware($args) { $callback_body }` where {
      require_service_context_boundaries_body_attaches_middleware(body=$body, middleware=$middleware)
    },
    $body <: contains `async function $middleware($args) { $callback_body }` where {
      require_service_context_boundaries_body_attaches_middleware(body=$body, middleware=$middleware)
    }
  }
}

// Requires the base owner to declare its external dependency shape.
predicate require_service_context_boundaries_declares_dependencies($body) {
  $body <: some or {
    `type Dependencies = $value`,
    `interface Dependencies { $members }`,
    `interface Dependencies extends $bases { $members }`,
    `export type Dependencies = $value`,
    `export interface Dependencies { $members }`,
    `export interface Dependencies extends $bases { $members }`
  }
}

// Requires the host and execution context types to be visible service bounds.
predicate require_service_context_boundaries_exports_initial_context($body) {
  $body <: some or {
    `export type InitialContext = $value`,
    `export interface InitialContext { $members }`,
    `export interface InitialContext extends $bases { $members }`
  }
}

// Requires either service kind to expose its exact authoring context.
predicate require_service_context_boundaries_exports_execution_context($body) {
  $body <: some or {
    `export type Context = $value`,
    `export interface Context { $members }`,
    `export interface Context extends $bases { $members }`
  }
}

// Recognizes a module-owned local context declaration.
predicate require_service_context_boundaries_declares_module_context($body) {
  $body <: some or {
    `type Context = $value`,
    `interface Context { $members }`,
    `interface Context extends $bases { $members }`,
    `export type Context = $value`,
    `export interface Context { $members }`,
    `export interface Context extends $bases { $members }`
  }
}

// Connects a declared local Context to the exported native module chain.
predicate require_service_context_boundaries_applies_module_context($body) {
  $body <: some or {
    `export const module = $value`,
    `export const module: $type = $value`
  } where {
    $value <: contains or {
      `$receiver.use<Context>($middleware, $...)`,
      `$receiver.use<Context, $types>($middleware, $...)`
    }
  }
}

program(statements=$body) where {
  or {
    require_service_context_boundaries_is_context_assembly_source(),
    and {
      require_service_context_boundaries_is_standalone_service_base_source(),
      not { require_service_context_boundaries_declares_dependencies(body=$body) }
    },
    and {
      require_service_context_boundaries_is_standalone_service_base_source(),
      not { require_service_context_boundaries_exports_initial_context(body=$body) }
    },
    and {
      or {
        require_service_context_boundaries_is_standalone_service_base_source(),
        require_service_context_boundaries_is_api_service_base_source()
      },
      not { require_service_context_boundaries_exports_execution_context(body=$body) }
    },
    and {
      require_service_context_boundaries_is_module_context_owner_source(),
      require_service_context_boundaries_declares_module_context(body=$body),
      not { require_service_context_boundaries_applies_module_context(body=$body) }
    },
    and {
      require_service_context_boundaries_is_middleware_source(),
      not { require_service_context_boundaries_exports_named_native_middleware(body=$body) }
    },
    and {
      require_service_context_boundaries_is_middleware_source(),
      $body <: some or {
        `export default $value`,
        `export { $..., $value as default, $... }`,
        `export { $..., default, $... } from $source`
      }
    },
    and {
      require_service_context_boundaries_is_non_context_owner_source(),
      $body <: some or {
        `const provideContext = $value`,
        `export const provideContext = $value`,
        `const provideContext: $type = $value`,
        `export const provideContext: $type = $value`
      }
    },
    and {
      require_service_context_boundaries_is_service_context_module_source(),
      $body <: some import_statement(source=$source),
      require_service_context_boundaries_is_current_root_context_alias(source=$source)
    },
    and {
      require_service_context_boundaries_is_service_context_module_source(),
      $body <: some export_statement(source=$source),
      $source <: string(),
      require_service_context_boundaries_is_current_root_context_alias(source=$source)
    },
    and {
      require_service_context_boundaries_is_non_context_owner_source(),
      $body <: some or {
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
      }
    },
    and {
      require_service_context_boundaries_is_module_router_authorship_source(),
      $body <: contains or {
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
      }
    },
    and {
      require_service_context_boundaries_is_middleware_attachment_source(),
      require_service_context_boundaries_body_contains_invalid_middleware_attachment(body=$body)
    }
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
// @filename: services/jobs/src/service/modules/catalog/router/list.router.ts
import { module } from "../module";
export const router = module.list.use(async ({ next }) => next());
```

## Matches a named plain callback attachment

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/list.router.ts
import { module } from "../module";
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

## Matches an operation router reopening raw dependencies

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
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
// @filename: services/jobs/src/service/modules/catalog/router/list.router.ts
import { module } from "../module";
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

## Matches an unbound module context declaration

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "../../impl";
type Context = { readonly catalog: CatalogReader };
export const module = service.catalog;
```

## Ignores a module inheriting service context

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "../../impl";
export const module = service.catalog;
```

## Ignores module-owned context applied to the exact service branch

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { os } from "@orpc/server";
import { service } from "../../impl";
type ProviderContext = { readonly catalog: CatalogReader };
type Context = { readonly catalog: CatalogReader };
export const provideContext = os
  .$context<ProviderContext>()
  .middleware<Context>(({ context, next }) =>
    next({ context: { catalog: context.catalog } })
  );
export const module = service.catalog.use<Context, ProviderContext>(provideContext);
```

## Ignores a router consuming narrowed context


```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
export const router = {
  find: module.find.effect(({ context }) => context.catalog.find()),
};
```
