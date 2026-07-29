---
level: error
tags: [orpc, effect, service, error-authority]
---
# Require Native oRPC Error Authority

Public error vocabulary belongs to the owning oRPC contract. Runtime procedure
code raises the constructors supplied by native handler context. Middleware
does not invent a second `.errors(...)` map, executable interiors do not import
parallel runtime error modules, and local dispatch portals or status tables do
not translate around the native contract. Executable service interiors never
construct `ORPCError` directly: declared outcomes use `errors.*`, while an
undeclared provider or implementation defect remains an ordinary private
`Error`.

The community `effect-orpc` package and `ORPCTaggedError` have no authority in
this lane. The composition packet separately owns executable own-contract
imports and inferred contract-type reconstruction. TypeScript and behavior
tests own constructor inference, Effect failure channels, payloads, and
transport projection.

```grit
language js(typescript)

// Selects non-test service interiors governed by error authority.
predicate require_orpc_error_authority_is_governed_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects executable interiors that must not acquire parallel error values.
predicate require_orpc_error_authority_is_executable_interior() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:impl\.ts|router\.ts|middleware/[^/]+\.ts|modules/[^/]+/(?:module\.ts|router/[^/]+\.ts|middleware/[^/]+\.ts))$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects middleware boundaries where a second error vocabulary is forbidden.
predicate require_orpc_error_authority_is_middleware_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Admits declarations whose complete import is erased at runtime.
predicate require_orpc_error_authority_is_whole_type_import($import) {
  $import <: import_statement(type=type())
}

// Admits named imports only when every binding is erased at runtime.
predicate require_orpc_error_authority_is_named_type_import($import) {
  $import <: `import { $... } from $source`,
  $import <: contains import_specifier() as $type_specifier where {
    $type_specifier <: contains type()
  },
  not {
    $import <: contains import_specifier() as $specifier where {
      $specifier <: not contains type()
    }
  }
}

// Recognizes a module path that claims parallel error vocabulary.
predicate require_orpc_error_authority_is_error_source($source) {
  $source <: r"^[\"'][^\"']*(?:[/\.]errors?)(?:[/\.][^\"']*)?[\"']$"
}

or {
  import_statement(source=$source) where {
    require_orpc_error_authority_is_governed_source(),
    $source <: r"^[\"']effect-orpc[\"']$"
  },
  import_statement(source=$source) as $import where {
    require_orpc_error_authority_is_governed_source(),
    $source <: r"^[\"'](?:@orpc/contract|@orpc/server|@orpc/experimental-effect)[\"']$",
    $import <: contains import_specifier(name=$name) as $specifier where {
      $name <: or { `ORPCTaggedError`, `"ORPCTaggedError"` },
      $specifier <: not contains type()
    }
  },
  import_statement(source=$source) as $import where {
    require_orpc_error_authority_is_executable_interior(),
    require_orpc_error_authority_is_error_source(source=$source),
    not {
      require_orpc_error_authority_is_whole_type_import(import=$import)
    },
    not {
      require_orpc_error_authority_is_named_type_import(import=$import)
    }
  },
  `$receiver.errors($argument)` where {
    require_orpc_error_authority_is_middleware_source()
  },
  `new ORPCError($arguments)` where {
    require_orpc_error_authority_is_executable_interior()
  },
  or {
    `const dispatchError = $value`,
    `function dispatchError($args) { $body }`,
    `const errorStatusMap = $value`,
    `const $name = errorStatusMap`,
    `errorStatusMap[$key]`,
    `errorStatusMap.$key`
  } where {
    require_orpc_error_authority_is_governed_source()
  }
}
```

## Matches a community tagged-error bridge

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/list.ts
import { ORPCTaggedError } from "effect-orpc";
class CatalogUnavailable extends ORPCTaggedError("CatalogUnavailable") {}
```

## Matches parallel runtime error vocabulary

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/list.ts
import { CatalogUnavailable } from "./model/errors/catalog.errors";
export const router = base.catalog.router({
  list: module.list.effect(() => Effect.fail(new CatalogUnavailable())),
});
```

## Matches a custom dispatch portal

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/list.ts
const dispatchError = (error: unknown) => mapError(error);
```

## Matches a direct public-error construction

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/list.ts
import { ORPCError } from "@orpc/server";
export const router = base.catalog.router({
  list: module.list.effect(function* () {
    return yield* Effect.fail(
      new ORPCError("SERVICE_UNAVAILABLE", {
        message: "Catalog is unavailable",
      }),
    );
  }),
});
```

## Matches parallel middleware error authority

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.ts
import { os } from "@orpc/server";
/** Admits catalog reads. */
export const middleware = os
  .$context<Context>()
  .errors({ FORBIDDEN: {} })
  .middleware(admitCatalog);
```

## Ignores native handler constructors and type-only error facts

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/list.ts
import type { CatalogFailure } from "./model/errors/catalog.errors";
export const router = base.catalog.router({
  list: module.list.effect(function* ({ errors }) {
    return yield* Effect.fail(errors.SERVICE_UNAVAILABLE());
  }),
});
```
