---
level: error
tags: [orpc, service, router, authorship]
---
# Require Service Router Authorship

Router handlers are the operation authoring sites. A directory
`router/index.ts` only imports completed standalone operation leaves or
subrouters and composes the one module `router`; business transitions stay in
the named router files.

A router file does not declare a detached function beside the handler. A
`runOperation(request, dependencies)` or similar declaration reconstructs the
operation environment and turns the native handler into ceremony. Reusable
decisions move to model policy, subordinate stateless mechanics move to model
helpers, and outside calls remain context-provided ports. The transition stays
inside the handler. Native `.effect(...)` receives that handler inline rather
than an imported or locally named operation function.

A named `*.router.ts` may own one standalone operation leaf and needs no group
documentation. When a file introduces a multi-operation subrouter, it
documents why those operations belong together:

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

// Selects a directory router's composition-only index.
predicate is_module_router_index() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/index\.ts$"
}

// Selects a named authored operation leaf or subrouter.
predicate is_module_named_router() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.router\.ts$"
}

// Selects the files where complete native handlers are authored.
predicate is_module_authored_router() {
  or {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$",
    is_module_named_router()
  }
}

// Unwraps the finite TypeScript-only forms admitted around a composition object.
predicate is_plain_router_composition($value) {
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
  not { $value <: contains call_expression() }
}

// Restricts an index to imports and its one composed router export.
predicate is_allowed_router_index_statement($statement) {
  or {
    $statement <: import_statement(),
    $statement <: `export const router = $value` where {
      is_plain_router_composition(value=$value)
    },
    $statement <: `export const router: $type = $value` where {
      is_plain_router_composition(value=$value)
    }
  }
}

// Recognizes a direct subrouter object with at least two authored operations.
predicate is_multi_operation_group($value) {
  $value <: `{ $..., $first: $first_value, $..., $second: $second_value, $... }`
}

// Recognizes an adjacent group comment with all four semantic annotations.
predicate has_group_router_jsdoc($declaration) {
  $previous = before $declaration,
  $previous <: r"(?s)^/\*\*.*\*/$",
  $previous <: r"(?s).*@purpose\s+\S.*",
  $previous <: r"(?s).*@capability\s+\S.*",
  $previous <: r"(?s).*@behavior\s+\S.*",
  $previous <: r"(?s).*@relation\s+\S.*"
}

// Recognizes a handler authored directly at the native operation boundary.
predicate is_inline_operation_handler($handler) {
  or {
    $handler <: arrow_function(),
    $handler <: r"^\s*(?:async\s+)?function(?:\s*\*)?(?:\s+[A-Za-z_$][A-Za-z0-9_$]*)?\s*\("
  }
}

// Recognizes a top-level function that displaces operation authorship.
predicate is_detached_router_function($statement) {
  $statement <: r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function(?:\s*\*)?\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\("
}

or {
  program(statements=$statements) where {
    is_module_authored_router(),
    $statements <: some $statement where {
      is_detached_router_function(statement=$statement)
    }
  },
  or {
    `$receiver.effect($handler)`,
    `$receiver.handler($handler)`
  } where {
    is_module_authored_router(),
    not { is_inline_operation_handler(handler=$handler) }
  },
  program(statements=$statements) where {
    is_module_router_index(),
    $statements <: some $statement where {
      not { is_allowed_router_index_statement(statement=$statement) }
    }
  },
  or {
    `export const $name = $value`,
    `export const $name: $type = $value`
  } as $declaration where {
    is_module_named_router(),
    is_multi_operation_group(value=$value),
    not { has_group_router_jsdoc(declaration=$declaration) }
  }
}
```

## Matches handler logic displaced into the index

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
import { module } from "../module";
export const router = {
  find: module.find.effect(({ context }) => context.catalog.find()),
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

## Matches an undocumented semantic group

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.router.ts
import { module } from "../module";
export const catalogReads = {
  find: module.find.effect(({ context }) => context.catalog.find()),
  list: module.list.effect(({ context }) => context.catalog.list()),
};
```

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

## Ignores a composed documented subrouter

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.router.ts
import { module } from "../module";
/**
 * @purpose Own catalog lookup operations.
 * @capability Share the narrowed catalog reader and read policy.
 * @behavior Return matching catalog entries without mutation.
 * @relation Keep lookup separate from catalog mutation operations.
 */
export const catalogReads = {
  find: module.find.effect(({ context }) => context.catalog.find()),
  list: module.list.effect(({ context }) => context.catalog.list()),
};
```
