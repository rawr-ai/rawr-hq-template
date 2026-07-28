---
level: error
tags: [orpc, service, positive, anchor]
---
# Require Generic Service Anchor Exports

Every existing service spine file directly exports the generic value for its
role: standalone services export the exact service implementer anchor `base`
and may export a context-seeded `createMiddleware` factory when host projection
is needed; every service interior exports `contract`, `service`, `module`, or
`router`, and product qualification belongs at the import site. Each module
`router.ts` exports the module's completed local `router`; named
`router/*.router.ts` files export their standalone operation leaves or completed
subrouter values under domain names. Embedded API-plugin `base.ts` remains the
required boundary/type anchor and may elect the same private native middleware
author, but it does not export a runtime `base`; its contract implementation
begins at `impl.ts`.

When either service kind elects middleware authorship, `createMiddleware`
returns its one private native `os.$context<CompleteInitialContext>()` author.
It does not return the contract implementer, construct a fresh author per call,
publish the author, or hide another native author behind an aliased `os`
import. A base file cannot author middleware directly. Every context root names
its context type; untyped `$context()` is not admitted. This law otherwise
proves anchor presence only; Knip and the intentional-export/JSDoc boundary own
whether other exports are used or authorized.

```grit
language js(typescript)

// Accepts a role anchor only when its spine file exports it directly.
predicate require_service_anchor_exports_exports_direct_const($statements, $anchor) {
  $statements <: some $statement where {
    $statement <: or {
      `export const $anchor = $value`,
      `export const $anchor: $type = $value`
    }
  }
}

// Detects whether either base kind publishes the optional middleware factory.
predicate require_service_anchor_exports_has_middleware_factory_export($statements) {
  $statements <: contains `export function createMiddleware($parameters) { $body }`
}

// Detects the runtime import that elects native middleware authorship.
predicate require_service_anchor_exports_has_native_os_import($statements) {
  $statements <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    not { $import <: import_statement(type=type()) },
    $import <: contains import_specifier(name=`os`) as $specifier where {
      $specifier <: not contains type()
    }
  }
}

// Proves the exact context-call cardinality for the selected base kind.
predicate require_service_anchor_exports_has_factory_context_cardinality($context_call_count) {
  or {
    and {
      require_service_anchor_exports_is_base_anchor_file(),
      $context_call_count <: 2
    },
    and {
      require_service_anchor_exports_is_embedded_base_file(),
      $context_call_count <: 1
    }
  }
}

// Proves one private native author and one factory that returns that same author.
predicate require_service_anchor_exports_has_middleware_factory($statements) {
  require_service_anchor_exports_has_native_os_import(statements=$statements),
  $context_calls = [],
  $statements <: contains bubble($context_calls) `$receiver.$context_method<$context_type>()` as $call where {
    $context_method <: r"^\$context$",
    $context_calls += $call
  },
  $context_call_count = length(target=$context_calls),
  require_service_anchor_exports_has_factory_context_cardinality(
    context_call_count=$context_call_count
  ),
  $statements <: some $statement where {
    $statement <: `const $author = os.$context_method<$context_type>()`,
    $context_method <: r"^\$context$",
    $context_type <: r"^[A-Za-z_$][A-Za-z0-9_$]*$"
  },
  $statements <: contains `export function createMiddleware() {
    return $author;
  }`
}

// Detects middleware constructed in base.ts instead of through its factory.
predicate require_service_anchor_exports_has_direct_middleware_authorship($statements) {
  $statements <: contains or {
    `$receiver.middleware($handler)`,
    `$receiver.middleware<$types>($handler)`
  }
}

// Detects publication of the private context author through an export list or default.
predicate require_service_anchor_exports_publishes_context_author($statements) {
  $statements <: contains `const $author = os.$context_method<$context_type>()` where {
    $context_method <: r"^\$context$"
  },
  $statements <: contains or {
    `export { $..., $author, $... }`,
    `export { $..., $author as $public_name, $... }`,
    `export const $public_name = $author`,
    `export const $public_name: $public_type = $author`,
    `export default $author`
  }
}

// Detects a second runtime name for the native middleware authoring root.
predicate require_service_anchor_exports_has_aliased_os_import($statements) {
  $statements <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    not { $import <: import_statement(type=type()) },
    $import <: contains import_specifier(name=`os`) as $specifier where {
      $specifier <: r"^os\s+as\s+[$A-Za-z_][$A-Za-z0-9_]*$"
    }
  }
}

// Detects an untyped context root that escapes the explicit service boundary.
predicate require_service_anchor_exports_has_untyped_context_call($statements) {
  $statements <: contains `$receiver.$context_method()` as $call where {
    $context_method <: r"^\$context$",
    $call <: r"(?s)^[^<]*\.\$context\(\)$"
  }
}

// Maps only standalone root base files to the generic base anchor.
predicate require_service_anchor_exports_is_base_anchor_file() {
  $filename <: r".*services/[^/]+/src/service/base\.ts$"
}

// Maps embedded API-plugin base files to their type and middleware-author boundary.
predicate require_service_anchor_exports_is_embedded_base_file() {
  $filename <: r".*plugins/server/api/[^/]+/src/service/base\.ts$"
}

// Maps both service kinds to the one location allowed to elect middleware authorship.
predicate require_service_anchor_exports_is_middleware_factory_base_file() {
  or {
    require_service_anchor_exports_is_base_anchor_file(),
    require_service_anchor_exports_is_embedded_base_file()
  }
}

// Maps root and module contracts to the generic contract anchor.
predicate require_service_anchor_exports_is_contract_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:contract|modules/[^/]+/contract)\.ts$"
}

// Maps root implementations to the generic service anchor.
predicate require_service_anchor_exports_is_service_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$"
}

// Maps module spines to the generic module anchor.
predicate require_service_anchor_exports_is_module_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Maps root and module composition routers to the generic anchor.
predicate require_service_anchor_exports_is_router_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router|modules/[^/]+/router)\.ts$"
}

or {
  program(statements=$statements) where {
    require_service_anchor_exports_is_base_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`base`) }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_middleware_factory_base_file(),
    or {
      require_service_anchor_exports_has_native_os_import(statements=$statements),
      require_service_anchor_exports_has_middleware_factory_export(
        statements=$statements
      )
    },
    not {
      require_service_anchor_exports_has_middleware_factory(
        statements=$statements
      )
    }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_middleware_factory_base_file(),
    require_service_anchor_exports_has_aliased_os_import(statements=$statements)
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_middleware_factory_base_file(),
    require_service_anchor_exports_has_untyped_context_call(statements=$statements)
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_middleware_factory_base_file(),
    require_service_anchor_exports_has_direct_middleware_authorship(
      statements=$statements
    )
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_middleware_factory_base_file(),
    require_service_anchor_exports_publishes_context_author(
      statements=$statements
    )
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_contract_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`contract`) }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_service_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`service`) }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_module_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`module`) }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_router_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`router`) }
  }
}
```

## Matches a missing base anchor

```typescript
// @filename: services/jobs/src/service/base.ts
export const runtime = implementEffect(contract, Layer.empty);
```

## Matches a missing contract anchor

```typescript
// @filename: services/jobs/src/service/contract.ts
export const jobsContract = eoc.router({});
```

## Matches a factory disconnected from its native context author

```typescript
// @filename: services/jobs/src/service/base.ts
import { implement, os } from "@orpc/server";
import { contract } from "./contract";
export const base = implement(contract).$context<InitialContext>();
const middleware = os.$context<InitialContext>();
export function createMiddleware() {
  return base;
}
```

## Ignores an embedded API-plugin type-only boundary

```typescript
// @filename: plugins/server/api/catalog/src/service/base.ts
/** Initial request context supplied by the API host. */
export type InitialContext = { readonly request: Request };
```

## Ignores one embedded API-plugin native middleware author

```typescript
// @filename: plugins/server/api/catalog/src/service/base.ts
import { os } from "@orpc/server";
export type InitialContext = { readonly request: Request };
const middleware = os.$context<InitialContext>();
export function createMiddleware() {
  return middleware;
}
```

## Matches a missing service anchor

```typescript
// @filename: services/jobs/src/service/impl.ts
export const configured = base.use(provider);
```

## Matches a missing module anchor

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const catalog = service.catalog;
```

## Matches a missing router anchor

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { find } from "./router/find.router";
export const catalogRouter = { find };
```

## Ignores direct anchors and unrelated declaration forms

```typescript
// @filename: services/jobs/src/service/base.ts
export const base = implementEffect(contract, Layer.empty);

// @filename: services/catalog/src/service/base.ts
import { implement, os } from "@orpc/server";
import { contract } from "./contract";
export const base = implement(contract).$context<InitialContext>();
const middleware = os.$context<InitialContext>();
export function createMiddleware() {
  return middleware;
}

// @filename: services/jobs/src/service/contract.ts
export const contract = eoc.router({});
export const parenthesized = (contract);
export const asserted = contract as Contract;
export const checked = contract satisfies Contract;
export type FrozenContract = Readonly<typeof contract>;

// @filename: services/jobs/src/service/impl.ts
export const service = base.use(provider);
export const RuntimeImplementer = createRuntimeImplementer();

// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog;
export class CatalogModule {}

// @filename: services/jobs/src/service/modules/catalog/router.ts
import { find } from "./router/find.router";
export const router: Router = {
  find,
};
export const PreviewRouter = decorate(preview);
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
export const find = module.find.effect(({ context }) => context.catalog.find());
```
