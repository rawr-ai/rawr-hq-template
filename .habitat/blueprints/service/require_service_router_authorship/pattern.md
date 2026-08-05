---
level: error
tags: [orpc, service, router, authorship]
---
# Require Service Router Authorship

Named router leaves acquire the configured `module` value directly from the
canonical `../module` source and author one operation or one cohesive operation
group through that binding. The leaf's exported group name matches its
filename. Module-root routers compose those completed values; the service-root
router composes the completed module routers. TypeScript owns the contract-key
and procedure-type relation across that composition.

The oRPC handler is the operation authoring site. It receives the curated
context and owns the transition directly rather than delegating to a parallel
callable that reconstructs the request and dependencies. Leaf-local pure
builders may prepare values for that inline handler without becoming a second
operation author.

```grit
language js(typescript)

// Selects a named module operation leaf or cohesive subrouter.
predicate require_service_router_authorship_is_named_router() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.ts$"
}

// Selects the service and module router composition faces.
predicate require_service_router_authorship_is_composer() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router\.ts|modules/[^/]+/router\.ts)$"
}

// Selects the module's composition-only router face.
predicate require_service_router_authorship_is_module_composer() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$"
}

// Proves the leaf directly acquires the canonical configured module binding.
predicate require_service_router_authorship_has_canonical_module_import($body) {
  $body <: some `import { $..., module, $... } from $source` where {
    $source <: r"^[\"']\.\./module(?:\.[cm]?[jt]s)?[\"']$"
  }
}

// Checks that a named router's public export matches its filename.
function require_service_router_authorship_leaf_name_status($filename, $name) js {
  const match = $filename.text.match(/\/router\/([^/]+)\.ts$/);
  if (!match || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(match[1])) {
    return "noncanonical-filename";
  }
  const expected = match[1].replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  return expected === $name.text ? "ok" : "wrong-export";
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

// Recognizes a configured module branch through native procedure middleware.
private pattern require_service_router_authorship_module_receiver() {
  or {
    `module.$member`,
    `$prior.$member` where {
      $prior <: require_service_router_authorship_module_receiver()
    },
    `$prior.use($middleware)` where {
      $prior <: require_service_router_authorship_module_receiver()
    }
  }
}

// Admits type-only imports and values from direct local named router leaves.
predicate require_service_router_authorship_is_module_router_import($import, $source) {
  or {
    $import <: import_statement(type=type()),
    and {
      $import <: `import { $... } from $source`,
      $source <: r"^[\"']\./router/[^/\"']+[\"']$"
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
  program(statements=$statements) where {
    require_service_router_authorship_is_named_router(),
    not {
      require_service_router_authorship_has_canonical_module_import(
        body=$statements
      )
    }
  },
  program(statements=$statements) as $body where {
    require_service_router_authorship_is_named_router(),
    not {
      $statements <: some $export where {
        require_service_router_authorship_is_canonical_export(export=$export)
      }
    }
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
      $receiver <: require_service_router_authorship_module_receiver()
    }
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

## Matches a local module binding without canonical acquisition

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
const module = makeModule();
export const find = module.find.effect(({ context }) => context.catalog.find());
```

## Matches a decorated module wrapper acquired through an alias

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { module as configuredModule } from "../module";
const module = configuredModule.use(requireReadAccess);
export const find = module.find.effect(({ context }) => context.catalog.find());
```

## Matches a module binding acquired from the wrong source

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { module } from "../testing/module";
export const find = module.find.effect(({ context }) => context.catalog.find());
```

## Matches a leaf whose export does not match its filename

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { module } from "../module";
export const list = module.list.effect(({ context }) => context.catalog.list());
```

## Ignores a cohesive group whose operation names differ from its group name

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.ts
import { module } from "../module";
const find = module.find.effect(({ context }) => context.catalog.find());
const list = module.list.effect(({ context }) => context.catalog.list());
export const read = { find, list };
```

## Matches a detached operation implementation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/sync.ts
import { module } from "../module";
const runSync = ({ context, input }) => context.catalog.sync(input);
export const sync = module.sync.effect(runSync);
```

## Matches a handler rooted outside the configured module

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { preview } from "../model/policy/preview";
export const find = preview.find.handler(({ context }) => context.catalog.find());
```

## Matches a detached native handler implementation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { module } from "../module";
const runFind = ({ context, input }) => context.catalog.find(input);
export const find = module.find.handler(runFind);
```

## Ignores a leaf-local pure builder used by an inline handler

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
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
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { module } from "../module";
export const find = module.find.effect(({ context }) => context.catalog.find());
```

## Ignores validated-input policy on the configured procedure

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { module } from "../module";
import { admitFind } from "../middleware";
export const find = module.find
  .use(admitFind)
  .effect(({ context }) => context.catalog.find());
```

## Ignores an inline function operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { module } from "../module";
export const find = module.find.handler(function ({ context }) {
  return context.catalog.find();
});
```

## Ignores an inline async function operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { module } from "../module";
export const find = module.find.handler(async function ({ context }) {
  return context.catalog.find();
});
```

## Ignores an inline Effect generator operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { Effect } from "effect";
import { module } from "../module";
export const find = module.find.effect(function* ({ context }) {
  return yield* Effect.succeed(context.catalog.find());
});
```

## Matches a detached Effect generator operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { Effect } from "effect";
import { module } from "../module";
const runFind = function* ({ context }) {
  return yield* Effect.succeed(context.catalog.find());
};
export const find = module.find.effect(runFind);
```

## Matches a detached named Effect generator operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.ts
import { Effect } from "effect";
import { module } from "../module";
function* runFind({ context }) {
  return yield* Effect.succeed(context.catalog.find());
}
export const find = module.find.effect(runFind);
```

## Ignores a cohesive grouped router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/read.ts
import { module } from "../module";
const find = module.read.find.effect(({ context }) => context.catalog.find());
const list = module.read.list.effect(({ context }) => context.catalog.list());
export const read = { find, list };
```

## Ignores the language-required reserved binding

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/package.ts
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
import { read } from "./router/read";
export const router = { read } as Router;
```

## Ignores a bare composition-only module router

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { read } from "./router/read";
import { package as packageOperation } from "./router/package";
export const router = {
  ...read,
  package: packageOperation,
};
```
