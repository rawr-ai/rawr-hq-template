---
level: error
tags: [orpc, service, positive, composition]
---
# Require Native Service oRPC Composition

A service has three native views of one contract and one final runtime:

- `base.ts` creates the exact service-context authoring view.
- `impl.ts` derives the service middleware view and the host-admission
  `boundary`.
- each `module.ts` creates an exact, module-local authoring view from its own
  contract.

The root router applies each module-owned context projection to the matching
service branch, attaches the completed local module router, and finally
attaches the branch object to `boundary`. Module source never imports the root
runtime implementer. Root composition replaces the module-local Effect-oRPC
implementer with the service implementer; only that final router is a package
surface.

This rule keeps those first ownership hops visible. TypeScript proves exact
service, module, and final host context. Behavior tests prove middleware order,
outcomes, and one final runtime. Native oRPC context remains additive at
runtime; this law does not claim physical key removal.

```grit
language js(typescript)

// Derives one escaped, anchored lower-camel service branch from a module directory.
function exact_module_branch($value) js {
  const lowerCamel = $value.text.replace(
    /-([a-z0-9])/g,
    (_match, segment) => segment.toUpperCase(),
  );
  const regexSyntax = "\\^$.|?*+()[]{}";
  let escaped = "";
  for (const character of lowerCamel) {
    escaped += regexSyntax.includes(character) ? "\\" + character : character;
  }
  return `^${escaped}$`;
}

// Requires one exact named import to remain available at runtime.
predicate imports_runtime_binding($body, $source_pattern, $anchor) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r`$source_pattern`,
    $import <: contains import_specifier(name=$anchor) as $specifier where {
      $specifier <: not contains type(),
      $specifier <: $anchor
    }
  }
}

// Selects a standalone service base.
predicate is_standalone_base() {
  $filename <: r".*services/[^/]+/src/service/base\.ts$"
}

// Selects a standalone service implementation.
predicate is_standalone_impl() {
  $filename <: r".*services/[^/]+/src/service/impl\.ts$"
}

// Selects a standalone service module declaration.
predicate is_standalone_module() {
  $filename <: r".*services/[^/]+/src/service/modules/[^/]+/module\.ts$"
}

// Selects a standalone root router.
predicate is_standalone_root_router() {
  $filename <: r".*services/[^/]+/src/service/router\.ts$"
}

// Selects an embedded API implementation.
predicate is_api_impl() {
  $filename <: r".*plugins/server/api/[^/]+/src/service/impl\.ts$"
}

// Selects an embedded API module declaration.
predicate is_api_module() {
  $filename <: r".*plugins/server/api/[^/]+/src/service/modules/[^/]+/module\.ts$"
}

// Selects an embedded API root router.
predicate is_api_root_router() {
  $filename <: r".*plugins/server/api/[^/]+/src/service/router\.ts$"
}

// Recognizes a direct Effect-oRPC implementer with the exact local context.
predicate is_native_effect_context_view($value) {
  $value <: `implementEffect(contract, $source).$context_method<Context>()` where {
    $context_method <: r"^\$context$"
  }
}

// Recognizes a direct native oRPC implementer with the exact local context.
predicate is_native_orpc_context_view($value) {
  $value <: `implement(contract).$context_method<Context>()` where {
    $context_method <: r"^\$context$"
  }
}

// Recognizes the base-owned host-to-service context projection.
predicate is_service_context_provider($value) {
  or {
    $value <: `os.$context_method<InitialContext>().middleware($handler)` where {
      $context_method <: r"^\$context$"
    },
    $value <: `os.$context_method<InitialContext>().middleware<$types>($handler)` where {
      $context_method <: r"^\$context$"
    }
  }
}

// Recognizes the module-owned service-to-module context projection.
predicate is_module_context_provider($value) {
  or {
    $value <: `os.$context_method<ServiceContext>().middleware($handler)` where {
      $context_method <: r"^\$context$"
    },
    $value <: `os.$context_method<ServiceContext>().middleware<$types>($handler)` where {
      $context_method <: r"^\$context$"
    }
  }
}

// Rejects a base-rooted call that is not native middleware composition.
predicate has_non_use_service_call($value) {
  $value <: contains or {
    `$receiver.$method($args)`,
    `$receiver.$method<$types>($args)`
  } where {
    $receiver <: contains `base`,
    not { $method <: `use` }
  }
}

// Keeps service composition rooted directly on base and native `.use`.
predicate is_service_view($value) {
  or {
    $value <: `base`,
    and {
      or {
        $value <: `$callee($args)`,
        $value <: `$callee<$types>($args)`
      },
      $callee <: contains `base`,
      $value <: contains or {
        `base.use($middleware)`,
        `base.use<$types>($middleware)`
      },
      not { has_non_use_service_call(value=$value) }
    }
  }
}

// Keeps host admission on the exact provider exported by base.ts.
predicate is_boundary_view($value) {
  or {
    $value <: `base.$context_method<InitialContext>().use(provideContext)` where {
      $context_method <: r"^\$context$"
    },
    $value <: `base.$context_method<InitialContext>().use<$types>(provideContext)` where {
      $context_method <: r"^\$context$"
    }
  }
}

// Connects one root branch to the matching module provider and router imports.
predicate is_projected_service_branch($body, $key, $value) {
  or {
    $value <: `service.$branch.use($provider).router($router)`,
    $value <: `service.$branch.use<$types>($provider).router($router)`
  },
  $body <: contains `import { provideContext as $provider } from $provider_source`,
  $provider_source <: r"^[\"'](?:\./modules/|#[^/]+-(?:service|api)/(?:service/)?modules/)([^/]+)/module[\"']$"($provider_module),
  $body <: contains `import { router as $router } from $router_source`,
  $router_source <: r"^[\"'](?:\./modules/|#[^/]+-(?:service|api)/(?:service/)?modules/)([^/]+)/router[\"']$"($router_module),
  $provider_branch = exact_module_branch(value=$provider_module),
  $router_branch = exact_module_branch(value=$router_module),
  $key <: r`$provider_branch`,
  $branch <: r`$provider_branch`,
  $key <: r`$router_branch`,
  $branch <: r`$router_branch`
}

// Requires a standalone root router to enter through boundary.
predicate exports_standalone_root_router($body) {
  $body <: contains or {
    `export const router = boundary.router($branches)`,
    `export const router: $type = boundary.router($branches)`
  } where {
    $branches <: object()
  }
}

// Requires an embedded API root router to enter through its service.
predicate exports_api_root_router($body) {
  $body <: contains or {
    `export const router = service.router($branches)`,
    `export const router: $type = service.router($branches)`
  } where {
    $branches <: object()
  }
}

or {
  program(statements=$body) where {
    is_standalone_base(),
    not {
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']effect-orpc[\"']$",
        anchor=`implementEffect`
      ),
      $body <: contains `export const base = $value` where {
        is_native_effect_context_view(value=$value)
      },
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']@orpc/server[\"']$",
        anchor=`os`
      ),
      $body <: contains `export const provideContext = $provider` where {
        is_service_context_provider(value=$provider)
      }
    }
  },
  program(statements=$body) where {
    is_standalone_impl(),
    not {
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']\./base[\"']$",
        anchor=`base`
      ),
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']\./base[\"']$",
        anchor=`provideContext`
      ),
      $body <: contains `export const service = $service_value` where {
        is_service_view(value=$service_value)
      },
      $body <: contains `export const boundary = $boundary_value` where {
        is_boundary_view(value=$boundary_value)
      }
    }
  },
  program(statements=$body) where {
    is_standalone_module(),
    not {
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']effect-orpc[\"']$",
        anchor=`implementEffect`
      ),
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']@orpc/server[\"']$",
        anchor=`os`
      ),
      $body <: contains `export const module = $value` where {
        is_native_effect_context_view(value=$value)
      },
      $body <: contains `export const provideContext = $provider` where {
        is_module_context_provider(value=$provider)
      }
    }
  },
  program(statements=$body) where {
    is_api_impl(),
    not {
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']@orpc/server[\"']$",
        anchor=`implement`
      ),
      $body <: contains `export const service = $value` where {
        is_native_orpc_context_view(value=$value)
      }
    }
  },
  program(statements=$body) where {
    is_api_module(),
    not {
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']@orpc/server[\"']$",
        anchor=`implement`
      ),
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']@orpc/server[\"']$",
        anchor=`os`
      ),
      $body <: contains `export const module = $value` where {
        is_native_orpc_context_view(value=$value)
      },
      $body <: contains `export const provideContext = $provider` where {
        is_module_context_provider(value=$provider)
      }
    }
  },
  program(statements=$body) where {
    is_standalone_root_router(),
    not {
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']\./impl[\"']$",
        anchor=`boundary`
      ),
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']\./impl[\"']$",
        anchor=`service`
      ),
      exports_standalone_root_router(body=$body)
    }
  },
  `boundary.router({ $..., $key: $value, $... })` where {
    is_standalone_root_router(),
    not { is_projected_service_branch(body=$program, key=$key, value=$value) }
  },
  program(statements=$body) where {
    is_api_root_router(),
    not {
      imports_runtime_binding(
        body=$body,
        source_pattern="^[\"']\./impl[\"']$",
        anchor=`service`
      ),
      exports_api_root_router(body=$body)
    }
  },
  `service.router({ $..., $key: $value, $... })` where {
    is_api_root_router(),
    not { is_projected_service_branch(body=$program, key=$key, value=$value) }
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    $source <: r"^[\"'](?:effect-orpc|@orpc/contract|@orpc/server)[\"']$",
    $import <: `import * as $namespace from $source`,
    not { $import <: import_statement(type=type()) }
  }
}
```

## Matches a service base without an exact service context

```typescript
// @filename: services/jobs/src/service/base.ts
import { implementEffect } from "effect-orpc";
export const base = implementEffect(contract, Layer.empty);
```

## Matches a service implementation without host admission

```typescript
// @filename: services/jobs/src/service/impl.ts
import { base } from "./base";
export const service = base.use(observability);
```

## Matches a wrapped service view

```typescript
// @filename: services/jobs/src/service/impl.ts
import { base, provideContext } from "./base";
export const service = decorate(base.use(observability));
export const boundary = base
  .$context<InitialContext>()
  .use<Context, InitialContext>(provideContext);
```

## Matches a module that reaches upward for its implementer

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "../../impl";
export const module = service.catalog.use(provideContext);
```

## Matches a root branch wired to another module's provider

```typescript
// @filename: services/jobs/src/service/router.ts
import { boundary, service } from "./impl";
import { provideContext as provideIntakeContext } from "./modules/intake/module";
import { router as catalog } from "./modules/catalog/router";
export const router = boundary.router({
  catalog: service.catalog.use(provideIntakeContext).router(catalog),
});
```

## Matches a root branch wired to another module's router

```typescript
// @filename: services/jobs/src/service/router.ts
import { boundary, service } from "./impl";
import { provideContext as provideCatalogContext } from "./modules/catalog/module";
import { router as intake } from "./modules/intake/router";
export const router = boundary.router({
  catalog: service.catalog.use(provideCatalogContext).router(intake),
});
```

## Matches a prefix-colliding service branch

```typescript
// @filename: services/jobs/src/service/router.ts
import { boundary, service } from "./impl";
import { provideContext as provideCatalogContext } from "./modules/catalog/module";
import { router as catalog } from "./modules/catalog/router";
export const router = boundary.router({
  catalog: service.catalogAdmin.use(provideCatalogContext).router(catalog),
});
```

## Ignores the exact standalone funnel

```typescript
// @filename: services/jobs/src/service/base.ts
import { os } from "@orpc/server";
import { implementEffect } from "effect-orpc";
export const base = implementEffect(contract, Layer.empty).$context<Context>();
export const provideContext = os
  .$context<InitialContext>()
  .middleware<Context>(({ context, next }) =>
    next({ context: admitServiceContext(context) })
  );
```

```typescript
// @filename: services/jobs/src/service/impl.ts
import { base, provideContext } from "./base";
export const service = base.use(observability).use(analytics);
export const boundary = base
  .$context<InitialContext>()
  .use<Context, InitialContext>(provideContext);
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { os } from "@orpc/server";
import { implementEffect } from "effect-orpc";
export const provideContext = os
  .$context<ServiceContext>()
  .middleware<Context>(({ context, next }) =>
    next({ context: { catalog: context.catalog } })
  );
export const module = implementEffect(contract, Layer.empty).$context<Context>();
```

```typescript
// @filename: services/jobs/src/service/router.ts
import { boundary, service } from "./impl";
import { provideContext as provideCatalogContext } from "./modules/catalog/module";
import { router as catalog } from "./modules/catalog/router";
export const router = boundary.router({
  catalog: service.catalog.use(provideCatalogContext).router(catalog),
});
```

## Ignores an exact kebab-to-camel module branch

```typescript
// @filename: services/jobs/src/service/router.ts
import { boundary, service } from "./impl";
import { provideContext as provideCorpusArtifactsContext } from "./modules/corpus-artifacts/module";
import { router as corpusArtifacts } from "./modules/corpus-artifacts/router";
export const router = boundary.router({
  corpusArtifacts: service.corpusArtifacts
    .use(provideCorpusArtifactsContext)
    .router(corpusArtifacts),
});
```

## Ignores native embedded API views

```typescript
// @filename: plugins/server/api/catalog/src/service/impl.ts
import { implement } from "@orpc/server";
export const service = implement(contract).$context<Context>();
```

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/module.ts
import { implement, os } from "@orpc/server";
export const provideContext = os
  .$context<ServiceContext>()
  .middleware<Context>(({ context, next }) =>
    next({ context: { search: context.search } })
  );
export const module = implement(contract).$context<Context>();
```

```typescript
// @filename: plugins/server/api/catalog/src/service/router.ts
import { service } from "./impl";
import { provideContext as provideSearchContext } from "./modules/search/module";
import { router as search } from "./modules/search/router";
export const router = service.router({
  search: service.search.use(provideSearchContext).router(search),
});
```
