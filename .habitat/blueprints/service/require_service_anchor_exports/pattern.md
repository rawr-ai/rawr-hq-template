---
level: error
tags: [orpc, service, positive, anchor]
---
# Require Generic Service Anchor Exports

Every service spine file directly exports the generic value for its role.
`base.ts` exports the sole native context author `base`.
`impl.ts` exports the unconfigured contract implementer `impl` and its configured
`service` stage. The root contract and router files and the matching module
directory entrypoints export `contract` and `router`; `module.ts` exports
`module`. Product qualification belongs at the import site.

`module.ts` is a wiring boundary, not a type or helper boundary. Its complete
export surface is the single `module` const; supporting types and values remain
private to the file. Other spine files may retain type-only declarations, but
their runtime surface remains closed to their generic anchor. Knip and the
repository intentional-export/JSDoc boundary own exports outside the spine.

```grit
language js(typescript)

// Accepts a role anchor only when its spine file exports it directly.
predicate require_service_anchor_exports_has_direct_const($statements, $anchor) {
  $statements <: some $statement where {
    $statement <: or {
      `export const $anchor = $value`,
      `export const $anchor: $type = $value`
    }
  }
}

// Proves one directly exported, explicitly typed native context author.
predicate require_service_anchor_exports_has_native_base($statements) {
  $statements <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    not { $import <: import_statement(type=type()) },
    $import <: contains import_specifier(name=`os`) as $specifier where {
      $specifier <: not contains type()
    }
  },
  $context_calls = [],
  $statements <: contains bubble($context_calls) `os.$context_method<$context_type>()` as $call where {
    $context_method <: r"^\$context$",
    $context_calls += $call
  },
  $context_call_count = length(target=$context_calls),
  $context_call_count <: 1,
  $statements <: contains or {
    `export const base = os.$context_method<$context_type>()` where {
      $context_method <: r"^\$context$"
    },
    `export const base: $type = os.$context_method<$context_type>()` where {
      $context_method <: r"^\$context$"
    }
  }
}

// Maps every root base file to the generic base anchor.
predicate require_service_anchor_exports_is_base_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/base\.ts$"
}

// Maps the root contract and module contract entrypoints to the generic anchor.
predicate require_service_anchor_exports_is_contract_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:contract\.ts|modules/[^/]+/(?:contract\.ts|contract/index\.ts))$"
}

// Maps root implementations to the generic service anchor.
predicate require_service_anchor_exports_is_impl_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$"
}

// Maps module spines to the generic module anchor.
predicate require_service_anchor_exports_is_module_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Maps the root router and module router entrypoints to the generic anchor.
predicate require_service_anchor_exports_is_router_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router\.ts|modules/[^/]+/(?:router\.ts|router/index\.ts))$"
}

// Recognizes authored runtime declarations and runtime export forwarding.
predicate require_service_anchor_exports_is_runtime_export($export) {
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

// Recognizes the generic runtime anchor owned by the selected spine role.
predicate require_service_anchor_exports_is_role_anchor($export) {
  or {
    and {
      require_service_anchor_exports_is_base_file(),
      $export <: or {
        `export const base = $value`,
        `export const base: $type = $value`
      }
    },
    and {
      require_service_anchor_exports_is_contract_file(),
      $export <: or {
        `export const contract = $value`,
        `export const contract: $type = $value`
      }
    },
    and {
      require_service_anchor_exports_is_impl_file(),
      $export <: or {
        `export const impl = $value`,
        `export const impl: $type = $value`,
        `export const service = $value`,
        `export const service: $type = $value`
      }
    },
    and {
      require_service_anchor_exports_is_module_file(),
      $export <: or {
        `export const module = $value`,
        `export const module: $type = $value`
      }
    },
    and {
      require_service_anchor_exports_is_router_file(),
      $export <: or {
        `export const router = $value`,
        `export const router: $type = $value`
      }
    }
  }
}

// Recognizes the one public declaration admitted at a module wiring boundary.
predicate require_service_anchor_exports_is_module_anchor($export) {
  $export <: or {
    `export const module = $value`,
    `export const module: $type = $value`
  }
}

or {
  program(statements=$statements) where {
    require_service_anchor_exports_is_base_file(),
    not {
      require_service_anchor_exports_has_native_base(statements=$statements)
    }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_contract_file(),
    not {
      require_service_anchor_exports_has_direct_const(
        statements=$statements,
        anchor=`contract`
      )
    }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_impl_file(),
    not {
      require_service_anchor_exports_has_direct_const(
        statements=$statements,
        anchor=`impl`
      ),
      require_service_anchor_exports_has_direct_const(
        statements=$statements,
        anchor=`service`
      )
    }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_module_file(),
    not {
      require_service_anchor_exports_has_direct_const(
        statements=$statements,
        anchor=`module`
      )
    }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_router_file(),
    not {
      require_service_anchor_exports_has_direct_const(
        statements=$statements,
        anchor=`router`
      )
    }
  },
  export_statement() as $export where {
    require_service_anchor_exports_is_module_file(),
    not {
      require_service_anchor_exports_is_module_anchor(export=$export)
    }
  },
  export_statement() as $export where {
    not { require_service_anchor_exports_is_module_file() },
    or {
      require_service_anchor_exports_is_base_file(),
      require_service_anchor_exports_is_contract_file(),
      require_service_anchor_exports_is_impl_file(),
      require_service_anchor_exports_is_router_file()
    },
    require_service_anchor_exports_is_runtime_export(export=$export),
    not {
      require_service_anchor_exports_is_role_anchor(export=$export)
    }
  },
  or {
    `export default $value`,
    `export * from $source`,
    `export { $..., $name, $... }`,
    `export { $..., $name as $alias, $... }`
  } where {
    not { require_service_anchor_exports_is_module_file() },
    or {
      require_service_anchor_exports_is_base_file(),
      require_service_anchor_exports_is_contract_file(),
      require_service_anchor_exports_is_impl_file(),
      require_service_anchor_exports_is_router_file()
    }
  }
}
```

## Matches a missing base anchor

```typescript
// @filename: services/jobs/src/service/base.ts
export const runtime = os.$context<Context>();
```

## Matches an implementation hidden in the context declaration

```typescript
// @filename: services/jobs/src/service/base.ts
import { implement, os } from "@orpc/server";
import { contract } from "./contract";
export const base = implement(contract).$context<Context>();
```

## Matches a missing contract anchor

```typescript
// @filename: services/jobs/src/service/contract.ts
export const jobsContract = oc.router({});
```

## Matches a missing module contract entrypoint anchor

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
export const catalogContract = oc.router({});
```

## Matches a second context-authoring surface

```typescript
// @filename: services/jobs/src/service/base.ts
import { os } from "@orpc/server";
export const base = os.$context<Context>();
export function createMiddleware() {
  return os.$context<Context>();
}
```

## Matches a missing service anchor

```typescript
// @filename: services/jobs/src/service/impl.ts
export const service = impl.use(provider);
```

## Matches a missing module anchor

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const catalog = service.catalog;
```

## Matches a second module wiring export

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog;
export type Context = { readonly actor: Actor };
```

## Matches a module helper re-export

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/module.ts
export const module = service.search;
export { provideSearch } from "./middleware/search.middleware";
```

## Matches a second runtime export from another spine

```typescript
// @filename: services/jobs/src/service/router.ts
export const router = impl.router({ catalog });
export function createPreviewRouter() {
  return router;
}
```

## Matches a missing router anchor

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
export const catalogRouter = { find: module.find.effect(handler) };
```

## Ignores the closed declaration and implementation anchors

```typescript
// @filename: services/jobs/src/service/base.ts
import { os } from "@orpc/server";
export type Context = {
  readonly deps: { readonly jobs: JobsPort };
  readonly scope: { readonly actor: Actor };
  readonly config: {};
  readonly invocation: {};
  readonly provided: {};
};
export const base = os.$context<Context>();
// @filename: plugins/server/api/catalog/src/service/base.ts
import { os } from "@orpc/server";
export type Context = { readonly request: Request };
export const base = os.$context<Context>();

// @filename: services/jobs/src/service/contract.ts
export const contract = oc.router({});
export type FrozenContract = Readonly<typeof contract>;

// @filename: services/jobs/src/service/impl.ts
export const impl = implement(contract).$context<Context>();
export const service = impl.use(provider);

// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog;
type Context = { readonly actor: Actor };

// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
export const contract = oc.router({});
type CatalogContract = typeof contract;

// @filename: services/jobs/src/service/modules/catalog/router/index.ts
export const router: Router = { find: module.find.effect(handler) };
```
