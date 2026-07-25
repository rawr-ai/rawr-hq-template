---
level: error
tags: [orpc, service, router, authorship]
---
# Require Service Router Authorship

Router handlers are the operation authoring sites. Module `router.ts` only
imports completed standalone operation leaves or subrouters from `router/` and
composes the one module `router`; business transitions stay in the named router
files.

A router file does not declare a detached function beside the handler. A
`runOperation(request, dependencies)` or similar declaration reconstructs the
operation environment and turns the native handler into ceremony. Reusable
decisions move to model policy, subordinate stateless mechanics move to model
helpers, and outside calls remain context-provided ports. The transition stays
inside the handler. Native `.effect(...)` receives that handler inline rather
than an imported or locally named operation function.

A named `*.router.ts` may own one standalone operation leaf or one flat router
object and needs no group documentation. When a file extracts a
multi-operation subset and composes it into that router, it documents why those
operations belong together:

```typescript
/**
 * @purpose What cohesive operation subset this router owns.
 * @capability Which narrowed context, guard, or policy the subset shares.
 * @behavior What transition or observation the subset performs.
 * @relation How the subset differs from neighboring operation groups.
 */
```

```grit
language js(typescript)

// Selects the module's composition-only public router.
predicate require_service_router_authorship_is_module_router_composition() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$"
}

// Selects a named authored operation leaf or subrouter.
predicate require_service_router_authorship_is_module_named_router() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.router\.ts$"
}

// Selects the files where complete native handlers are authored.
predicate require_service_router_authorship_is_module_authored_router() {
  require_service_router_authorship_is_module_named_router()
}

// Admits whole type-only imports and named values from local router leaves.
predicate require_service_router_authorship_is_allowed_module_router_import($import, $source) {
  or {
    $import <: import_statement(type=type()),
    and {
      $import <: `import { $... } from $source`,
      $source <: r"^[\"']\./router/[^/\"']+\.router[\"']$"
    }
  }
}

// Unwraps the finite TypeScript-only forms admitted around a composition object.
predicate require_service_router_authorship_is_plain_router_composition($value) {
  or {
    $value <: object(),
    $value <: `$object satisfies $type` where {
      $object <: object()
    },
    $value <: `$object as const` where {
      $object <: object()
    },
    $value <: `$object as $type` where {
      $object <: object()
    }
  },
  not { $value <: contains call_expression() },
  not { $value <: contains `$key: $property` },
  not { $value <: contains method_definition() },
  not { $value <: contains arrow_function() }
}

// Restricts a module router to imports and its one composed router export.
predicate require_service_router_authorship_is_allowed_module_router_statement($statement) {
  or {
    $statement <: import_statement(source=$source) as $import where {
      require_service_router_authorship_is_allowed_module_router_import(import=$import, source=$source)
    },
    $statement <: `export const router = $value` where {
      require_service_router_authorship_is_plain_router_composition(value=$value)
    },
    $statement <: `export const router: $type = $value` where {
      require_service_router_authorship_is_plain_router_composition(value=$value)
    }
  }
}

// Recognizes an object-shaped value that may become an explicit operation group.
predicate require_service_router_authorship_is_operation_group_value($value) {
  or {
    $value <: object(),
    $value <: `$object satisfies $type` where {
      $object <: object()
    },
    $value <: `$object as const` where {
      $object <: object()
    },
    $value <: `$object as $type` where {
      $object <: object()
    }
  }
}

// Recognizes the finite plain-object forms that attach a group to the final router.
predicate require_service_router_authorship_is_composed_operation_group($router_value, $group) {
  or {
    $router_value <: contains `{ $..., ...$group, $... }`,
    $router_value <: contains `{ $..., $group, $... }`,
    $router_value <: contains `{ $..., $branch: $group, $... }`
  }
}

// Identifies an extracted object that is composed into the file's final router.
predicate require_service_router_authorship_is_explicit_operation_group($statements, $declaration) {
  or {
    $declaration <: `const $group = $value`,
    $declaration <: `const $group: $type = $value`,
    $declaration <: `export const $group = $value`,
    $declaration <: `export const $group: $type = $value`
  },
  require_service_router_authorship_is_operation_group_value(value=$value),
  $statements <: some $router_declaration where {
    or {
      $router_declaration <: `export const router = $router_value`,
      $router_declaration <: `export const router: $router_type = $router_value`
    },
    require_service_router_authorship_is_composed_operation_group(
      router_value=$router_value,
      group=$group
    )
  }
}

// Recognizes an adjacent group comment with all four semantic annotations.
predicate require_service_router_authorship_has_group_router_jsdoc($declaration) {
  $previous = before $declaration,
  $previous <: r"(?s)^/\*\*.*\*/$",
  $previous <: r"(?s).*@purpose\s+\S.*",
  $previous <: r"(?s).*@capability\s+\S.*",
  $previous <: r"(?s).*@behavior\s+\S.*",
  $previous <: r"(?s).*@relation\s+\S.*"
}

// Recognizes a handler authored directly at the native operation boundary.
predicate require_service_router_authorship_is_inline_operation_handler($handler) {
  or {
    $handler <: arrow_function(),
    $handler <: r"^\s*(?:async\s+)?function(?:\s*\*)?(?:\s+[A-Za-z_$][A-Za-z0-9_$]*)?\s*\("
  }
}

// Unwraps type-only expressions around one named callable declaration.
predicate require_service_router_authorship_is_detached_callable($value) {
  or {
    require_service_router_authorship_is_inline_operation_handler(handler=$value),
    $value <: `$callable satisfies $type` where {
      require_service_router_authorship_is_inline_operation_handler(handler=$callable)
    },
    $value <: `($callable) satisfies $type` where {
      require_service_router_authorship_is_inline_operation_handler(handler=$callable)
    },
    $value <: `$callable as $type` where {
      require_service_router_authorship_is_inline_operation_handler(handler=$callable)
    },
    $value <: `($callable) as $type` where {
      require_service_router_authorship_is_inline_operation_handler(handler=$callable)
    }
  }
}

// Recognizes top-level callable declarations that displace operation authorship.
predicate require_service_router_authorship_is_detached_router_function($statement) {
  or {
    $statement <: function_declaration(),
    $statement <: `export function $name($args) { $body }`,
    $statement <: `export async function $name($args) { $body }`,
    $statement <: `const $name = function ($args) { $body }`,
    $statement <: `const $name = async function ($args) { $body }`,
    $statement <: `const $name: $type = function ($args) { $body }`,
    $statement <: `const $name: $type = async function ($args) { $body }`,
    $statement <: `const $name = $value` where {
      require_service_router_authorship_is_detached_callable(value=$value)
    },
    $statement <: `const $name: $type = $value` where {
      require_service_router_authorship_is_detached_callable(value=$value)
    },
    $statement <: `let $name = $value` where {
      require_service_router_authorship_is_detached_callable(value=$value)
    },
    $statement <: `let $name: $type = $value` where {
      require_service_router_authorship_is_detached_callable(value=$value)
    },
    $statement <: `export const $name = $value` where {
      require_service_router_authorship_is_detached_callable(value=$value)
    },
    $statement <: `export const $name: $type = $value` where {
      require_service_router_authorship_is_detached_callable(value=$value)
    }
  }
}

or {
  program(statements=$statements) where {
    require_service_router_authorship_is_module_authored_router(),
    $statements <: some $statement where {
      require_service_router_authorship_is_detached_router_function(statement=$statement)
    }
  },
  or {
    `$receiver.effect($handler)`,
    `$receiver.handler($handler)`
  } where {
    require_service_router_authorship_is_module_authored_router(),
    not { require_service_router_authorship_is_inline_operation_handler(handler=$handler) }
  },
  program(statements=$statements) where {
    require_service_router_authorship_is_module_router_composition(),
    $statements <: some $statement where {
      not { require_service_router_authorship_is_allowed_module_router_statement(statement=$statement) }
    }
  },
  program(statements=$statements) where {
    require_service_router_authorship_is_module_named_router(),
    $statements <: some $declaration where {
      require_service_router_authorship_is_explicit_operation_group(
        statements=$statements,
        declaration=$declaration
      ),
      not { require_service_router_authorship_has_group_router_jsdoc(declaration=$declaration) }
    }
  }
}
```

## Matches handler logic displaced into the module router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
export const router = {
  find: authoredFind,
};
```

## Matches a non-router runtime import in the module router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { policy } from "./model/policy/catalog";
import { find } from "./router/find.router";
export const router = {
  find,
  policy,
};
```

## Matches a detached operation implementation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/sync.router.ts
export const sync = module.sync.effect(({ context, input }) =>
  runCatalogSync(input, context)
);
export async function runCatalogSync(request, dependencies) {
  return dependencies.catalog.sync(request);
}
```

## Matches an undocumented extracted semantic group

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.router.ts
import { module } from "../module";
const catalogReads = {
  find: module.find.effect(({ context }) => context.catalog.find()),
  list: module.list.effect(({ context }) => context.catalog.list()),
};
export const router = { ...catalogReads };
```

The same group is recognized when the final router uses shorthand
`{ catalogReads }` or an explicit branch `{ reads: catalogReads }`.

## Ignores a standalone operation leaf

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
export const find = module.find.effect(({ context }) => context.catalog.find());
```

## Ignores an inline complete handler

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/sync.router.ts
export const sync = module.sync.effect(function* ({ context, input }) {
  const admitted = yield* context.catalog.admit(input);
  return yield* context.catalog.sync(admitted);
});
```

## Ignores a documented extracted group

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.router.ts
import { module } from "../module";
/**
 * @purpose Own catalog lookup operations.
 * @capability Share the narrowed catalog reader and read policy.
 * @behavior Return matching catalog entries without mutation.
 * @relation Keep lookup separate from catalog mutation operations.
 */
const catalogReads = {
  find: module.find.effect(({ context }) => context.catalog.find()),
  list: module.list.effect(({ context }) => context.catalog.list()),
};
export const router = { ...catalogReads };
```

## Ignores a flat ungrouped router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.router.ts
import { module } from "../module";
const find = module.find.effect(({ context }) => context.catalog.find());
const list = module.list.effect(({ context }) => context.catalog.list());
export const router = { find, list };
```

## Ignores a composition-only module router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { catalogReads } from "./router/read.router";
import { sync } from "./router/sync.router";
import type { Router } from "./contract";
export const router = {
  ...catalogReads,
  sync,
} satisfies Router;
```
