---
level: error
tags: [orpc, service, categorical, context, middleware]
---
# Require Service Context Funnel

Capabilities descend through one Effect-oRPC implementer lineage. Standalone
`base.ts` seeds complete initial context on the contract implementer. When host
projection is needed, it separately exposes one context-seeded native
`createMiddleware` authoring factory. Root and module middleware publish
documented named values; `impl.ts` configures the root and `module.ts` attaches
module capability middleware to its matching `service.<module>` branch.

SDK-owned baseline and required telemetry builders remain a distinct framework
surface. They may author the named observability and analytics extensions used
by `impl.ts`, but they are not alternate context factories.

Native middleware contributions merge with inherited context. An explicit
`.use<Context>(...)` argument does not prove narrowing and is rejected.
Composition stays inferred. No adapter, witness, shadow context, raw vendor
builder, or configured service/module branch creates another middleware root.
This law owns middleware provenance and attachment, not semantic handler-context
closure; owner-local capability and resource cuts remove the remaining raw
lanes rather than hiding them behind a spelling blacklist.

Every middleware file exports only documented named `const` middleware values.
Every `.use(...)` attachment names a completed external middleware value
imported from the matching middleware boundary. Root SDK baselines may instead
come directly from `base.ts`. An attachment does not contain an inline
expression, a local callback, an arbitrary helper import, or explicit type
arguments. TypeScript proves inferred composition and assignability. Behavior
tests own ordering, request isolation, and once-only root execution.

```grit
language js(typescript)

// Selects each standalone base that owns native context and middleware provenance.
predicate require_service_context_boundaries_is_standalone_base_source() {
  $filename <: r".*services/[^/]+/src/service/base\.ts$"
}

// Selects governed non-test service source.
predicate require_service_context_boundaries_is_governed_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects non-test module interiors governed by root-context isolation.
predicate require_service_context_boundaries_is_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects root and module middleware authority files.
predicate require_service_context_boundaries_is_middleware_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/[^/]+\.middleware\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Detects current-owner root context and dependency surfaces reached from a module.
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

// Requires a runtime named import from the exact relative base boundary.
predicate require_service_context_boundaries_imports_base_name($body, $name) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"'](?:\.\./|\.\./\.\./\.\./)base[\"']$",
    not { $import <: import_statement(type=type()) },
    $import <: contains import_specifier(name=$name) as $specifier where {
      not { $specifier <: r"^type\s+.*$" }
    }
  }
}

// Recognizes middleware authored from the complete service-context factory.
predicate require_service_context_boundaries_is_context_factory_middleware($body, $value) {
  require_service_context_boundaries_imports_base_name(
    body=$body,
    name=`createMiddleware`
  ),
  $value <: `createMiddleware().middleware($handler)`
}

// Recognizes the two SDK-owned required telemetry extension builders.
predicate require_service_context_boundaries_is_sdk_telemetry_middleware($body, $value) {
  require_service_context_boundaries_imports_base_name(body=$body, name=$factory),
  $factory <: r"^createRequiredService(?:Observability|Analytics)Middleware$",
  $value <: `$factory($input)`
}

// Recognizes the only runtime export admitted at a middleware boundary.
predicate require_service_context_boundaries_is_named_middleware_export($body, $export) {
  or {
    $export <: `export const $name = $value`,
    $export <: `export const $name: $type = $value`
  },
  or {
    require_service_context_boundaries_is_context_factory_middleware(
      body=$body,
      value=$value
    ),
    require_service_context_boundaries_is_sdk_telemetry_middleware(
      body=$body,
      value=$value
    )
  }
}

// Detects missing, empty, or placeholder JSDoc on a middleware export.
predicate require_service_context_boundaries_lacks_jsdoc($export) {
  $previous = before $export,
  or {
    ! $previous <: r"(?s)^/\*\*.*\*/$",
    $previous <: r"(?s)^/\*\*[ *\n\r\t]*\*/$",
    $previous <: r"(?is)^/\*\*[ *\n\r\t]*(?:TODO|TBD|FIXME|PLACEHOLDER|DOCUMENTATION[ \t]+PENDING).*\*/$"
  }
}

// Proves that a middleware file publishes one documented native value.
predicate require_service_context_boundaries_has_documented_middleware($body) {
  $body <: contains export_statement() as $export where {
    require_service_context_boundaries_is_named_middleware_export(
      body=$body,
      export=$export
    ),
    not { require_service_context_boundaries_lacks_jsdoc(export=$export) }
  }
}

// Detects a locally declared attachment that has not crossed a middleware boundary.
predicate require_service_context_boundaries_is_local_attachment($middleware) {
  $program <: contains or {
    `const $middleware = $value`,
    `const $middleware: $type = $value`,
    `let $middleware = $value`,
    `let $middleware: $type = $value`,
    `function $middleware($args) { $body }`,
    `async function $middleware($args) { $body }`
  }
}

// Proves that an attachment crossed the admitted middleware or root-baseline boundary.
predicate require_service_context_boundaries_is_admitted_attachment_import($middleware) {
  $program <: contains import_statement(source=$source) as $import where {
    not { $import <: import_statement(type=type()) },
    $import <: contains import_specifier(name=$middleware) as $specifier where {
      not { $specifier <: r"^type\s+.*$" }
    },
    or {
      and {
        $filename <: r".*/src/service/impl\.ts$",
        or {
          and {
            $source <: r"^[\"']\./base[\"']$",
            $middleware <: r"^baseline(?:Observability|Analytics)$"
          },
          $source <: r"^[\"']\./middleware/[^/]+\.middleware[\"']$"
        }
      },
      and {
        $filename <: r".*/src/service/modules/[^/]+/module\.ts$",
        $source <: r"^[\"']\./middleware/[^/]+\.middleware[\"']$"
      },
      and {
        $filename <: r".*/src/service/modules/[^/]+/router/[^/]+\.router\.ts$",
        $source <: r"^[\"']\.\./middleware/[^/]+\.middleware[\"']$"
      }
    }
  }
}

// Rejects middleware authorship from raw or already-configured branches.
predicate require_service_context_boundaries_contains_alternate_factory($body) {
  $body <: contains or {
    `os.middleware($handler)`,
    `os.middleware<$types>($handler)`,
    `os.$context<$context>().middleware($handler)`,
    `os.$context<$context>().middleware<$types>($handler)`,
    `base.middleware($handler)`,
    `base.middleware<$types>($handler)`,
    `base.$branch.middleware($handler)`,
    `base.$branch.middleware<$types>($handler)`,
    `service.middleware($handler)`,
    `service.middleware<$types>($handler)`,
    `service.$branch.middleware($handler)`,
    `service.$branch.middleware<$types>($handler)`,
    `module.middleware($handler)`,
    `module.middleware<$types>($handler)`,
    `module.$branch.middleware($handler)`,
    `module.$branch.middleware<$types>($handler)`,
    `impl.middleware($handler)`,
    `impl.middleware<$types>($handler)`,
    `impl.$branch.middleware($handler)`,
    `impl.$branch.middleware<$types>($handler)`
  }
}

// Detects context declarations that attempt to prove a second authoring view.
predicate require_service_context_boundaries_declares_shadow_context($body) {
  $body <: contains or {
    `type Context = $value`,
    `type ProviderContext = $value`,
    `type ServiceContext = $value`,
    `type ReadyContext = $value`,
    `interface Context { $members }`,
    `interface ProviderContext { $members }`,
    `interface ServiceContext { $members }`,
    `interface ReadyContext { $members }`,
    `export type Context = $value`,
    `export type ProviderContext = $value`,
    `export type ServiceContext = $value`,
    `export type ReadyContext = $value`,
    `export interface Context { $members }`,
    `export interface ProviderContext { $members }`,
    `export interface ServiceContext { $members }`,
    `export interface ReadyContext { $members }`
  }
}

or {
  import_statement(source=$source) as $import where {
    require_service_context_boundaries_is_governed_source(),
    not { require_service_context_boundaries_is_standalone_base_source() },
    $source <: r"^[\"']@orpc/server[\"']$",
    $import <: contains import_specifier(name=`os`) as $specifier where {
      $specifier <: not contains type()
    }
  },
  import_statement(source=$source) where {
    require_service_context_boundaries_is_module_source(),
    require_service_context_boundaries_is_current_root_context_alias(source=$source)
  },
  export_statement(source=$source) where {
    require_service_context_boundaries_is_module_source(),
    $source <: string(),
    require_service_context_boundaries_is_current_root_context_alias(source=$source)
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_middleware_source(),
    not { require_service_context_boundaries_has_documented_middleware(body=$body) }
  },
  export_statement() as $export where {
    require_service_context_boundaries_is_middleware_source(),
    not {
      require_service_context_boundaries_is_named_middleware_export(
        body=$program,
        export=$export
      )
    }
  },
  export_statement() as $export where {
    require_service_context_boundaries_is_middleware_source(),
    require_service_context_boundaries_is_named_middleware_export(
      body=$program,
      export=$export
    ),
    require_service_context_boundaries_lacks_jsdoc(export=$export)
  },
  `$receiver.use<$types>($middleware, $...)` where {
    require_service_context_boundaries_is_governed_source()
  },
  `$receiver.use($middleware, $...)` where {
    require_service_context_boundaries_is_governed_source(),
    or {
      not { $middleware <: identifier() },
      require_service_context_boundaries_is_local_attachment(
        middleware=$middleware
      ),
      not {
        require_service_context_boundaries_is_admitted_attachment_import(
          middleware=$middleware
        )
      }
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_governed_source(),
    not { require_service_context_boundaries_is_standalone_base_source() },
    require_service_context_boundaries_contains_alternate_factory(body=$body)
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_governed_source(),
    not { require_service_context_boundaries_is_standalone_base_source() },
    require_service_context_boundaries_declares_shadow_context(body=$body)
  }
}
```

## Matches a second middleware root

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/catalog.middleware.ts
import { base } from "../../../base";
/** Contributes Catalog's reader. */
export const capabilities = base.catalog.middleware(projectCatalog);
```

## Matches explicit context claims at module attachment

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "../../impl";
import { capabilities } from "./middleware/catalog.middleware";
type Context = { readonly catalog: CatalogReader };
export const module = service.catalog.use<Context>(capabilities);
```

## Ignores one context-seeded factory and inferred module composition

```typescript
// @filename: services/jobs/src/service/base.ts
import { os } from "@orpc/server";
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
export const base = implementEffect(contract, Layer.empty).$context<InitialContext>();
const middleware = os.$context<InitialContext>();
export function createMiddleware() {
  return middleware;
}
// @filename: services/jobs/src/service/modules/catalog/middleware/catalog.middleware.ts
import { createMiddleware } from "../../../base";
/** Contributes Catalog's reader capability. */
export const capabilities = createMiddleware().middleware(projectCatalog);
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "../../impl";
import { capabilities } from "./middleware/catalog.middleware";
export const module = service.catalog.use(capabilities);
```

## Ignores SDK-owned required telemetry extensions

```typescript
// @filename: services/jobs/src/service/middleware/observability.middleware.ts
import { createRequiredServiceObservabilityMiddleware } from "../base";
/** Adds Jobs fields to the SDK-owned observability baseline. */
export const observability = createRequiredServiceObservabilityMiddleware(options);
```
