---
level: error
tags: [orpc, service, router, authorship]
---
# Require Service Router Authorship

Named router leaves author operations from their matching configured module
descendant. Module-root routers compose those completed values; the service-root
router composes the completed module routers.

The oRPC handler is the operation authoring site. It receives the curated
context and owns the transition directly rather than delegating to a parallel
callable that reconstructs the request and dependencies. Leaf-local pure
builders may prepare values for that inline handler without becoming a second
operation author.

```grit
language js(typescript)

// Selects a named module operation leaf or cohesive subrouter.
predicate require_service_router_authorship_is_named_router() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.router\.ts$"
}

// Selects the service and module router composition faces.
predicate require_service_router_authorship_is_composer() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router\.ts|modules/[^/]+/router\.ts)$"
}

// Selects the module's composition-only router face.
predicate require_service_router_authorship_is_module_composer() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$"
}

// Checks that a named router's public export matches its filename.
function require_service_router_authorship_leaf_name_status($filename, $name) js {
  const match = $filename.text.match(/\/router\/([^/]+)\.router\.ts$/);
  if (!match || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(match[1])) {
    return "noncanonical-filename";
  }
  const expected = match[1].replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  return expected === $name.text ? "ok" : "wrong-export";
}

// Checks that every authored operation descends from the filename-mapped branch.
function require_service_router_authorship_leaf_root_status($filename, $body) js {
  const match = $filename.text.match(/\/router\/([^/]+)\.router\.ts$/);
  if (!match) return "noncanonical-filename";
  const expected = match[1].replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  const source = $body.text.replace(/\s+/g, "");
  const roots = [
    ...source.matchAll(
      /module((?:\.[A-Za-z_$][A-Za-z0-9_$]*)+)\.(?:use|effect|handler)\(/g,
    ),
  ].map((entry) => entry[1].slice(1).split("."));
  if (roots.length === 0) return "missing-handler";

  return roots.every((properties) => properties[0] === expected)
    ? "ok"
    : "wrong-root";
}

// Admits the one local binding required by an ECMAScript-reserved public name.
function require_service_router_authorship_reserved_binding_status($local, $name) js {
  const reserved = new Set([
    "await", "break", "case", "catch", "class", "const", "continue",
    "debugger", "default", "delete", "do", "else", "enum", "export",
    "extends", "false", "finally", "for", "function", "if", "implements",
    "import", "in", "instanceof", "interface", "let", "new", "null",
    "package", "private", "protected", "public", "return", "static", "super",
    "switch", "this", "throw", "true", "try", "typeof", "var", "void",
    "while", "with", "yield",
  ]);
  return reserved.has($name.text) &&
    $local.text === `${$name.text}Operation`
    ? "ok"
    : "wrong-binding";
}

// Recognizes the leaf's sole filename-mapped runtime export.
predicate require_service_router_authorship_is_canonical_export($export) {
  or {
    $export <: or {
      `export const $name = $value`,
      `export const $name: $type = $value`
    },
    and {
      $export <: `export { $local as $name }`,
      $binding_status = require_service_router_authorship_reserved_binding_status(
        local=$local,
        name=$name
      ),
      $binding_status <: includes "ok"
    }
  },
  $status = require_service_router_authorship_leaf_name_status(
    filename=$filename,
    name=$name
  ),
  $status <: includes "ok"
}

// Recognizes runtime declarations crossing a named router boundary.
predicate require_service_router_authorship_is_runtime_export($export) {
  $export <: export_statement(declaration=$declaration) where {
    $declaration <: or {
      lexical_declaration(),
      variable_declaration(),
      function_declaration(),
      class_declaration(),
      enum_declaration()
    }
  }
}

// Recognizes a handler authored directly at the native operation boundary.
predicate require_service_router_authorship_is_inline_handler($handler) {
  or {
    $handler <: arrow_function(),
    $handler <: function(),
    $handler <: generator_function()
  }
}

// Admits type-only imports and values from direct local named router leaves.
predicate require_service_router_authorship_is_module_router_import($import, $source) {
  or {
    $import <: import_statement(type=type()),
    and {
      $import <: `import { $... } from $source`,
      $source <: r"^[\"']\./router/[^/\"']+\.router[\"']$"
    }
  }
}

// Admits the canonical bare object literal shared with native oRPC composition.
predicate require_service_router_authorship_is_plain_router($value) {
  $value <: object(),
  not { $value <: contains call_expression() },
  not { $value <: contains method_definition() },
  not { $value <: contains arrow_function() }
}

// Restricts a module router to local leaf imports and one plain router export.
predicate require_service_router_authorship_is_module_router_statement($statement) {
  or {
    $statement <: import_statement(source=$source) as $import where {
      require_service_router_authorship_is_module_router_import(
        import=$import,
        source=$source
      )
    },
    $statement <: `export const router = $value` where {
      require_service_router_authorship_is_plain_router(value=$value)
    }
  }
}

or {
  program(statements=$statements) as $body where {
    require_service_router_authorship_is_named_router(),
    not {
      $statements <: some $export where {
        require_service_router_authorship_is_canonical_export(export=$export)
      }
    }
  },
  program() as $body where {
    require_service_router_authorship_is_named_router(),
    $status = require_service_router_authorship_leaf_root_status(
      filename=$filename,
      body=$body
    ),
    not { $status <: includes "ok" }
  },
  export_statement() as $export where {
    require_service_router_authorship_is_named_router(),
    require_service_router_authorship_is_runtime_export(export=$export),
    not {
      require_service_router_authorship_is_canonical_export(export=$export)
    }
  },
  `export { $specifiers }` as $export where {
    require_service_router_authorship_is_named_router(),
    not {
      require_service_router_authorship_is_canonical_export(export=$export)
    }
  },
  export_statement(source=$source) where {
    require_service_router_authorship_is_named_router(),
    $source <: string()
  },
  `export default $value` where {
    require_service_router_authorship_is_named_router()
  },
  or {
    `$receiver.effect($handler)`,
    `$receiver.handler($handler)`
  } where {
    require_service_router_authorship_is_named_router(),
    not {
      require_service_router_authorship_is_inline_handler(handler=$handler)
    }
  },
  or {
    `$receiver.effect($handler)`,
    `$receiver.handler($handler)`
  } where {
    require_service_router_authorship_is_composer()
  },
  program(statements=$statements) where {
    require_service_router_authorship_is_module_composer(),
    $statements <: some $statement where {
      not {
        require_service_router_authorship_is_module_router_statement(
          statement=$statement
        )
      }
    }
  }
}
```

## Matches a leaf authored from the wrong operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
export const find = module.list.effect(({ context }) => context.catalog.list());
```

## Matches a grouped leaf rooted outside its filename

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.router.ts
import { module } from "../module";
const find = module.catalog.find.effect(({ context }) => context.catalog.find());
const list = module.catalog.list.effect(({ context }) => context.catalog.list());
export const read = { find, list };
```

## Matches a detached operation implementation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/sync.router.ts
import { module } from "../module";
const runSync = ({ context, input }) => context.catalog.sync(input);
export const sync = module.sync.effect(runSync);
```

## Matches a detached native handler implementation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
const runFind = ({ context, input }) => context.catalog.find(input);
export const find = module.find.handler(runFind);
```

## Ignores a leaf-local pure builder used by an inline handler

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
const buildLookup = (input: { id: string }) => ({ id: input.id.trim() });
export const find = module.find.effect(({ context, input }) =>
  context.catalog.find(buildLookup(input)),
);
```

## Matches operation authorship in a module composer

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
export const router = {
  find: module.find.effect(({ context }) => context.catalog.find()),
};
```

## Ignores a standalone inline operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
export const find = module.find.effect(({ context }) => context.catalog.find());
```

## Ignores an inline function operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
export const find = module.find.handler(function ({ context }) {
  return context.catalog.find();
});
```

## Ignores an inline async function operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { module } from "../module";
export const find = module.find.handler(async function ({ context }) {
  return context.catalog.find();
});
```

## Ignores an inline Effect generator operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { Effect } from "effect";
import { module } from "../module";
export const find = module.find.effect(function* ({ context }) {
  return yield* Effect.succeed(context.catalog.find());
});
```

## Matches a detached Effect generator operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { Effect } from "effect";
import { module } from "../module";
const runFind = function* ({ context }) {
  return yield* Effect.succeed(context.catalog.find());
};
export const find = module.find.effect(runFind);
```

## Matches a detached named Effect generator operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import { Effect } from "effect";
import { module } from "../module";
function* runFind({ context }) {
  return yield* Effect.succeed(context.catalog.find());
}
export const find = module.find.effect(runFind);
```

## Ignores a cohesive grouped router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.router.ts
import { module } from "../module";
const find = module.read.find.effect(({ context }) => context.catalog.find());
const list = module.read.list.effect(({ context }) => context.catalog.list());
export const read = { find, list };
```

## Ignores the language-required reserved binding

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/package.router.ts
import { module } from "../module";
const packageOperation = module.package.effect(
  ({ context, input }) => context.catalog.package(input),
);
export { packageOperation as package };
```

## Matches an asserted module router object

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import type { Router } from "./contract";
import { read } from "./router/read.router";
export const router = { read } as Router;
```

## Ignores a bare composition-only module router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { read } from "./router/read.router";
import { package as packageOperation } from "./router/package.router";
export const router = {
  ...read,
  package: packageOperation,
};
```
