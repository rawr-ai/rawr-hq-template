---
level: error
tags: [orpc, service, categorical, context, middleware]
---
# Require Service Context Funnel

Capabilities descend through one Effect-oRPC implementer lineage. Standalone
`base.ts` seeds complete initial context on the contract implementer. When host
projection is needed, it separately exposes one context-seeded native
`createMiddleware` authoring factory. Embedded API-plugin `base.ts` may expose
the same native factory without becoming a provider owner; its contract
implementation remains in `impl.ts`. Root and module middleware publish
documented named values; `impl.ts` configures the root and `module.ts` attaches
module capability middleware to its matching `service.<module>` branch.

SDK-owned baseline and required telemetry builders remain a distinct framework
surface. They may author the named observability and analytics extensions used
by `impl.ts`, but they are not alternate context factories.

Native middleware contributions merge with inherited context. An explicit
`.use<Context>(...)` argument does not prove narrowing and is rejected.
Composition stays inferred. No adapter, witness, shadow context, raw vendor
builder, or configured service/module branch creates another middleware root.
Every module closes handler authorship around one terminal curation, and router
handlers consume those curated names rather than reaching back into the raw
service lanes. Owner-local capability and resource cuts still remove broad
capabilities at their source rather than pretending native context is
subtractive.

Every middleware file exports only documented named `const` middleware values.
Every `.use(...)` attachment names a completed external middleware value
imported from the matching middleware boundary, except that every `module.ts`
ends with exactly one inline additive context curation. That curation returns a
nonempty object of explicit non-reserved fields whose values are direct,
noncomputed member paths below `context.deps`, `context.scope`,
`context.config`, `context.invocation`, or `context.provided`. It contains no
guard, control flow, construction, spread, shorthand, computed access, whole
lane copy, foreign root, literal, call, `new`, or `await`. Root SDK baselines
may instead come directly from `base.ts`.

For standalone services, the sole provider author is specialized to
`Service["ExecutionContext"]` once in `base.ts` and exported as
`createServiceProvider`. Only documented named root service middleware may
import it from `../base` and call
`createServiceProvider().middleware<ProvidedCapabilities>(handler)`. Modules
and other service source cannot import or use the provider author, and
middleware cannot specialize it again. Embedded API provider authorship is not
admitted by this law. TypeScript proves inferred composition and assignability.
Behavior tests own ordering, request isolation, and once-only root execution.
The source matcher closes ordinary direct member forms only: qualified or
computed `createServiceProvider` calls and bracket or destructured
`createProvider` access remain red. It does not trace arbitrary assignment or
alias flow.

```grit
language js(typescript)

// Selects each standalone base that owns contract implementation and provider provenance.
predicate require_service_context_boundaries_is_standalone_base_source() {
  $filename <: r".*services/[^/]+/src/service/base\.ts$"
}

// Selects either base kind, the only location allowed to import the native author.
predicate require_service_context_boundaries_is_base_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/base\.ts$"
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

// Selects the one composition face that curates context for a module's routers.
predicate require_service_context_boundaries_is_module_composition_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Selects current and destination router faces, where raw service lanes are no longer public vocabulary.
predicate require_service_context_boundaries_is_router_leaf_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/(?:router\.ts|router/[^/]+\.router\.ts)$"
}

// Names the raw service lanes that terminal module curation makes private.
predicate require_service_context_boundaries_is_raw_context_lane($lane) {
  $lane <: r"^(?:deps|scope|config|invocation|provided)$"
}

// Detects a raw lane selected from a direct context destructure.
predicate require_service_context_boundaries_has_raw_context_destructure($properties) {
  $properties <: some $property where {
    or {
      $property <: $lane,
      $property <: `$lane: $local`
    },
    require_service_context_boundaries_is_raw_context_lane(lane=$lane)
  }
}

// Selects root and module middleware authority files.
predicate require_service_context_boundaries_is_middleware_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/[^/]+\.middleware\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects standalone service-root middleware, the only provider consumer.
predicate require_service_context_boundaries_is_root_middleware_source() {
  $filename <: r".*services/[^/]+/src/service/middleware/[^/]+\.middleware\.ts$",
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
    or {
      and {
        $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/middleware/[^/]+\.middleware\.ts$",
        $source <: r"^[\"']\.\./base[\"']$"
      },
      and {
        $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/middleware/[^/]+\.middleware\.ts$",
        $source <: r"^[\"']\.\./\.\./\.\./base[\"']$"
      }
    },
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

// Recognizes a named provider contribution from the base-specialized root author.
predicate require_service_context_boundaries_is_root_provider_middleware($body, $value) {
  require_service_context_boundaries_is_root_middleware_source(),
  require_service_context_boundaries_imports_base_name(
    body=$body,
    name=`createServiceProvider`
  ),
  $value <: `createServiceProvider().middleware<$provided>($handler)`,
  $provided <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
  not { $value <: contains `createServiceProvider<$types>()` }
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
    require_service_context_boundaries_is_root_provider_middleware(
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

// Admits only explicit, non-reserved handler-facing names.
predicate require_service_context_boundaries_is_curation_key($key) {
  $key <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
  ! $key <: r"^(?:deps|scope|config|invocation|provided)$"
}

// Admits only direct noncomputed member paths rooted below one semantic lane.
predicate require_service_context_boundaries_is_curation_value($value) {
  $value <: r"^context\.(?:deps|scope|config|invocation|provided)\.[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$"
}

// Proves one explicit context selection and rejects every other property form.
predicate require_service_context_boundaries_is_curation_property($property) {
  $property <: `$key: $value`,
  require_service_context_boundaries_is_curation_key(key=$key),
  require_service_context_boundaries_is_curation_value(value=$value)
}

// Requires at least one selection and requires every selection to be canonical.
predicate require_service_context_boundaries_is_curation_properties($properties) {
  $properties <: some $property where {
    require_service_context_boundaries_is_curation_property(property=$property)
  },
  not {
    $properties <: some $property where {
      not {
        require_service_context_boundaries_is_curation_property(property=$property)
      }
    }
  }
}

// Recognizes the exact inline callback shape; the property predicate closes its body.
predicate require_service_context_boundaries_is_curation_callback($callback) {
  $callback <: `async ({ context, next }) => next({ context: { $properties } })`,
  require_service_context_boundaries_is_curation_properties(properties=$properties)
}

// Curation is required, singular by terminality, and owned only by module.ts.
predicate require_service_context_boundaries_is_terminal_module_curation($attachment) {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$",
  $attachment <: `$receiver.use($callback)`,
  require_service_context_boundaries_is_curation_callback(callback=$callback),
  $program <: contains or {
    `export const module = $attachment`,
    `export const module: $type = $attachment`
  }
}

// Proves that the module's exported branch ends in the one canonical curation.
predicate require_service_context_boundaries_has_terminal_module_curation($body) {
  $body <: contains `$receiver.use($callback)` as $attachment where {
    require_service_context_boundaries_is_terminal_module_curation(
      attachment=$attachment
    )
  }
}

// Proves the sole standalone provider author and its exact public local name.
predicate require_service_context_boundaries_has_canonical_provider_author($body) {
  $provider_authors = [],
  $body <: contains bubble($provider_authors) `service.createProvider` as $author where {
    $provider_authors += $author
  },
  $provider_author_count = length(target=$provider_authors),
  $provider_author_count <: 1,
  $body <: contains
    `export const createServiceProvider = service.createProvider<Service["ExecutionContext"]>`
}

// Detects any attempt to publish the canonical provider-author name from base.ts.
predicate require_service_context_boundaries_exports_provider_author_name($body) {
  $body <: contains or {
    `export const createServiceProvider = $value`,
    `export const createServiceProvider: $type = $value`,
    `export { $..., createServiceProvider, $... }`,
    `export { $..., createServiceProvider, $... } from $source`,
    `export { $..., $local as createServiceProvider, $... }`,
    `export { $..., $local as createServiceProvider, $... } from $source`
  }
}

// Requires one provider import to retain its canonical name and exact owner edge.
predicate require_service_context_boundaries_is_canonical_provider_import($import, $source) {
  require_service_context_boundaries_is_root_middleware_source(),
  $source <: r"^[\"']\.\./base[\"']$",
  not { $import <: import_statement(type=type()) },
  $import <: contains import_specifier(name=`createServiceProvider`) as $specifier where {
    not { $specifier <: r"\s+as\s+" }
  }
}

// Proves a documented named root provider middleware export.
predicate require_service_context_boundaries_has_canonical_provider_export($body) {
  require_service_context_boundaries_is_root_middleware_source(),
  $body <: contains export_statement() as $export where {
    or {
      $export <: `export const $name = $value`,
      $export <: `export const $name: $type = $value`
    },
    require_service_context_boundaries_is_root_provider_middleware(
      body=$body,
      value=$value
    ),
    not { require_service_context_boundaries_lacks_jsdoc(export=$export) }
  }
}

// Relates a provider call to the documented named provider export that owns it.
predicate require_service_context_boundaries_is_exported_provider_call($body, $call) {
  require_service_context_boundaries_is_root_middleware_source(),
  $body <: contains export_statement() as $export where {
    or {
      $export <: `export const $name = $value`,
      $export <: `export const $name: $type = $value`
    },
    require_service_context_boundaries_is_root_provider_middleware(
      body=$body,
      value=$value
    ),
    not { require_service_context_boundaries_lacks_jsdoc(export=$export) },
    $call <: within $export
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
    not { require_service_context_boundaries_is_base_source() },
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
  program(statements=$body) where {
    require_service_context_boundaries_is_module_composition_source(),
    not {
      require_service_context_boundaries_has_terminal_module_curation(body=$body)
    }
  },
  `context.$lane` where {
    require_service_context_boundaries_is_router_leaf_source(),
    require_service_context_boundaries_is_raw_context_lane(lane=$lane)
  },
  `context[$lane]` where {
    require_service_context_boundaries_is_router_leaf_source(),
    $lane <: string(),
    $lane <: r"^[\"'](?:deps|scope|config|invocation|provided)[\"']$"
  },
  or {
    `const { $properties } = context`,
    `let { $properties } = context`,
    `var { $properties } = context`
  } where {
    require_service_context_boundaries_is_router_leaf_source(),
    require_service_context_boundaries_has_raw_context_destructure(
      properties=$properties
    )
  },
  or {
    `({ context: $raw }) => $body`,
    `async ({ context: $raw }) => $body`,
    `({ $..., context: $raw, $... }) => $body`,
    `async ({ $..., context: $raw, $... }) => $body`
  } where {
    require_service_context_boundaries_is_router_leaf_source(),
    $raw <: identifier(),
    $body <: contains `$raw.$lane`,
    require_service_context_boundaries_is_raw_context_lane(lane=$lane)
  },
  or {
    `({ context: $raw }) => $body`,
    `async ({ context: $raw }) => $body`,
    `({ $..., context: $raw, $... }) => $body`,
    `async ({ $..., context: $raw, $... }) => $body`
  } where {
    require_service_context_boundaries_is_router_leaf_source(),
    $raw <: identifier(),
    $body <: contains `$raw[$lane]`,
    $lane <: string(),
    $lane <: r"^[\"'](?:deps|scope|config|invocation|provided)[\"']$"
  },
  or {
    `({ context: { $properties } }) => $body`,
    `async ({ context: { $properties } }) => $body`,
    `({ $..., context: { $properties }, $... }) => $body`,
    `async ({ $..., context: { $properties }, $... }) => $body`
  } where {
    require_service_context_boundaries_is_router_leaf_source(),
    require_service_context_boundaries_has_raw_context_destructure(
      properties=$properties
    )
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
  `createServiceProvider<$types>()` where {
    require_service_context_boundaries_is_governed_source()
  },
  `$receiver.createServiceProvider()` where {
    require_service_context_boundaries_is_governed_source()
  },
  `$receiver.createServiceProvider<$types>()` where {
    require_service_context_boundaries_is_governed_source()
  },
  `$receiver["createServiceProvider"]()` where {
    require_service_context_boundaries_is_governed_source()
  },
  `$receiver["createServiceProvider"]<$types>()` where {
    require_service_context_boundaries_is_governed_source()
  },
  `service["createProvider"]` where {
    require_service_context_boundaries_is_governed_source()
  },
  `const { createProvider: $name } = service` where {
    require_service_context_boundaries_is_governed_source()
  },
  `const { createProvider } = service` where {
    require_service_context_boundaries_is_governed_source()
  },
  import_statement(source=$source) as $import where {
    require_service_context_boundaries_is_governed_source(),
    $import <: r"(?s).*\bcreateServiceProvider\b.*",
    or {
      not { require_service_context_boundaries_is_root_middleware_source() },
      ! $source <: r"^[\"']\.\./base[\"']$",
      $import <: r"(?s).*\bcreateServiceProvider\s+as\s+.*"
    }
  },
  `$receiver.use($middleware, $...)` as $attachment where {
    require_service_context_boundaries_is_governed_source(),
    not {
      require_service_context_boundaries_is_terminal_module_curation(
        attachment=$attachment
      )
    },
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
    $body <: contains import_statement(source=$source) as $import where {
      $import <: r"(?s).*\bcreateServiceProvider\b.*"
    },
    not {
      require_service_context_boundaries_is_canonical_provider_import(
        import=$import,
        source=$source
      ),
      require_service_context_boundaries_has_canonical_provider_export(body=$body)
    }
  },
  `createServiceProvider()` as $call where {
    require_service_context_boundaries_is_governed_source(),
    not {
      require_service_context_boundaries_is_exported_provider_call(
        body=$program,
        call=$call
      )
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_governed_source(),
    $body <: contains `service.createProvider`,
    not {
      require_service_context_boundaries_is_standalone_base_source(),
      require_service_context_boundaries_has_canonical_provider_author(body=$body)
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_governed_source(),
    require_service_context_boundaries_exports_provider_author_name(body=$body),
    not {
      require_service_context_boundaries_is_standalone_base_source(),
      require_service_context_boundaries_has_canonical_provider_author(body=$body)
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_governed_source(),
    not { require_service_context_boundaries_is_base_source() },
    require_service_context_boundaries_contains_alternate_factory(body=$body)
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_governed_source(),
    not { require_service_context_boundaries_is_base_source() },
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

## Ignores one context-seeded factory and terminal module curation

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
export const module = service.catalog
  .use(capabilities)
  .use(async ({ context, next }) =>
    next({ context: { reader: context.deps.reader } })
  );
```

## Ignores SDK-owned required telemetry extensions

```typescript
// @filename: services/jobs/src/service/middleware/observability.middleware.ts
import { createRequiredServiceObservabilityMiddleware } from "../base";
/** Adds Jobs fields to the SDK-owned observability baseline. */
export const observability = createRequiredServiceObservabilityMiddleware(options);
```
