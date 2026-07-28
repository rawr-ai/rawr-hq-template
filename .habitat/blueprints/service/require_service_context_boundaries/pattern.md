---
level: error
tags: [orpc, service, context, middleware]
---
# Require Service Context Boundaries

One native context author declares five explicit ownership and lifetime lanes.
Named middleware derives from that author, while each module terminally curates
the smaller vocabulary used by its handlers. Operation leaves never reopen the
raw lanes.

This rule owns only visible source relationships. TypeScript proves context
merging and assignability; behavior proof owns middleware order, isolation,
and lifecycle.

```grit
language js(typescript)

// Selects the one root file that declares a service's complete native context.
predicate require_service_context_boundaries_is_base() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/base\.ts$"
}

// Selects named root middleware authority files.
predicate require_service_context_boundaries_is_root_middleware() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/middleware/[^/]+\.ts$"
}

// Selects named module middleware leaves, excluding their explicit catalog.
predicate require_service_context_boundaries_is_module_middleware() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/middleware/[^/]+\.ts$",
  not { $filename <: r".*/middleware/index\.ts$" }
}

// Selects the explicit access point for one module's middleware catalog.
predicate require_service_context_boundaries_is_module_middleware_index() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/middleware/index\.ts$"
}

// Recognizes one documented semantic alias to a simple middleware leaf.
predicate require_service_context_boundaries_is_middleware_catalog_entry($statement) {
  $statement <: `export { middleware as $name } from $source` as $export,
  $name <: r"^[a-z][A-Za-z0-9]*$",
  $source <: r"^[\"']\./[a-z][a-z0-9]*(?:-[a-z0-9]+)*[\"']$",
  require_service_context_boundaries_has_jsdoc(export=$export)
}

// Selects operation leaves, whose vocabulary must already be curated.
predicate require_service_context_boundaries_is_router_leaf() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.ts$",
  not { $filename <: r".*/router/index\.ts$" }
}

// Selects the module spine that owns terminal handler-context curation.
predicate require_service_context_boundaries_is_module() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Recognizes the complete five-lane context declaration and its native author.
predicate require_service_context_boundaries_has_funnel($body) {
  $body <: contains `export type Context = {
    readonly deps: $deps;
    readonly scope: $scope;
    readonly config: $config;
    readonly invocation: $invocation;
    readonly provided: $provided;
  }`,
  $body <: contains `export const base = os.$context<Context>()`
}

// Proves that a middleware export carries adjacent semantic JSDoc.
predicate require_service_context_boundaries_has_jsdoc($export) {
  $previous = before $export,
  $previous <: r"(?s)^/\*\*\s*\S.*\*/$"
}

// Recognizes documented context middleware derived from the native base author.
predicate require_service_context_boundaries_has_context_middleware($body) {
  $body <: contains `import { base } from $source`,
  $body <: contains `export const middleware = base.middleware($callback)` as $export,
  require_service_context_boundaries_has_jsdoc(export=$export)
}

// Checks that unconfigured module policy is authored from its exact lower-camel branch.
function require_service_context_boundaries_contract_policy_status($filename, $branch) js {
  const match = $filename.text.match(/\/modules\/([^/]+)\/middleware\/[^/]+\.ts$/);
  if (!match) return "not-module-middleware";
  const expected = match[1].replace(/-([a-z0-9])/g, (_all, value) => value.toUpperCase());
  return expected === $branch.text ? "ok" : "wrong-branch";
}

// Recognizes documented contract-aware policy authored from the unconfigured module implementer.
predicate require_service_context_boundaries_has_contract_policy($body) {
  $body <: contains `import { impl } from $source`,
  $body <: contains `export const middleware = impl.$branch.middleware($callback)` as $export,
  $status = require_service_context_boundaries_contract_policy_status(
    filename=$filename,
    branch=$branch
  ),
  $status <: includes "ok",
  require_service_context_boundaries_has_jsdoc(export=$export)
}

// Recognizes an inferred final curation that selects explicit handler context.
predicate require_service_context_boundaries_has_terminal_curation($body) {
  $body <: contains `export const module = $receiver.use(
    ({ context, next }) => next({ context: { $properties } })
  )`
}

// Detects raw ownership lanes destructured from handler context.
predicate require_service_context_boundaries_is_raw_destructure($binding) {
  $binding <: r"^\{(?s:.*)(?:deps|scope|config|invocation|provided)(?s:.*)\}$"
}

or {
  program(statements=$body) where {
    require_service_context_boundaries_is_base(),
    not { require_service_context_boundaries_has_funnel(body=$body) }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_root_middleware(),
    not {
      require_service_context_boundaries_has_context_middleware(body=$body)
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_module_middleware(),
    not {
      or {
        require_service_context_boundaries_has_context_middleware(body=$body),
        require_service_context_boundaries_has_contract_policy(body=$body)
      }
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_module_middleware(),
    not { $filename <: r".*/middleware/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.ts$" }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_module_middleware_index(),
    not {
      $body <: some $statement where {
        require_service_context_boundaries_is_middleware_catalog_entry(
          statement=$statement
        )
      }
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_module_middleware_index(),
    $body <: some $statement where {
      not {
        require_service_context_boundaries_is_middleware_catalog_entry(
          statement=$statement
        )
      }
    }
  },
  import_statement(source=$source) where {
    require_service_context_boundaries_is_module(),
    $source <: r"^[\"'](?:\./middleware/|#[^/]+-(?:service|api)/modules/[^/]+/middleware/).+[\"']$"
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_module(),
    not {
      require_service_context_boundaries_has_terminal_curation(body=$body)
    }
  },
  `$key: context.$lane` where {
    require_service_context_boundaries_is_module(),
    $lane <: r"^(?:deps|scope|config|invocation|provided)$"
  },
  `$lane: $value` where {
    require_service_context_boundaries_is_module(),
    $lane <: r"^(?:deps|scope|config|invocation|provided)$"
  },
  `$key: context[$lane]` where {
    require_service_context_boundaries_is_module(),
    $lane <: r"^[\"'](?:deps|scope|config|invocation|provided)[\"']$"
  },
  `$key: context` where {
    require_service_context_boundaries_is_module()
  },
  `...context` where {
    require_service_context_boundaries_is_module()
  },
  `...context.$lane` where {
    require_service_context_boundaries_is_module(),
    $lane <: r"^(?:deps|scope|config|invocation|provided)$"
  },
  `...context[$lane]` where {
    require_service_context_boundaries_is_module(),
    $lane <: r"^[\"'](?:deps|scope|config|invocation|provided)[\"']$"
  },
  `next({ context })` where {
    require_service_context_boundaries_is_module()
  },
  `context.$lane` where {
    require_service_context_boundaries_is_router_leaf(),
    $lane <: r"^(?:deps|scope|config|invocation|provided)$"
  },
  `context[$lane]` where {
    require_service_context_boundaries_is_router_leaf(),
    $lane <: r"^[\"'](?:deps|scope|config|invocation|provided)[\"']$"
  },
  or {
    `const $binding = context`,
    `let $binding = context`
  } where {
    require_service_context_boundaries_is_router_leaf(),
    require_service_context_boundaries_is_raw_destructure(binding=$binding)
  },
  `$receiver.use<$types>($middleware, $...)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:impl|modules/[^/]+/module)\.ts$"
  }
}
```

## Matches an incomplete context declaration

```typescript
// @filename: services/jobs/src/service/base.ts
import { os } from "@orpc/server";
export type Context = { readonly deps: {}; readonly scope: {} };
export const base = os.$context<Context>();
```

## Matches middleware authored outside the native base

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/catalog.ts
import { os } from "@orpc/server";
/** Provides the Catalog reader. */
export const middleware = os.middleware(({ next }) => next());
```

## Matches a handler that reopens raw context

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
export const get = module.get.handler(({ context }) => context.deps.jobs.get());
```

## Matches raw lane destructuring and bracket access

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
export const get = module.get.handler(({ context }) => {
  const { scope } = context;
  return context["deps"].jobs.get(scope.actor);
});
```

## Matches undocumented middleware

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.ts
import { base } from "#jobs-service/base";
export const middleware = base.middleware(({ next }) => next());
```

## Matches a suffixed middleware leaf

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.middleware.ts
/** Admits Catalog access. */
export const middleware = base.middleware(({ next }) => next());
```

## Matches middleware logic or undocumented aliases in the catalog

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/index.ts
export { middleware as requireCatalogAccess } from "./access";
export const preview = base.middleware(({ next }) => next());
```

## Matches a module bypassing its middleware access point

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { middleware } from "./middleware/access";
export const module = service.catalog.use(middleware);
```

## Matches root contract policy

```typescript
// @filename: services/jobs/src/service/middleware/access.middleware.ts
import { impl } from "../impl";
/** Admits service access. */
export const middleware = impl.catalog.middleware(({ next }) => next());
```

## Matches contract policy on the wrong module branch

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.ts
import { impl } from "#jobs-service/impl";
/** Admits Catalog access. */
export const middleware = impl.queue.middleware(({ next }) => next());
```

## Matches explicit middleware composition types

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog.use<CatalogContext>(provideCatalog);
```

## Matches a module without terminal curation

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "#jobs-service/impl";
import { middleware } from "./middleware/catalog.middleware";
export const module = service.catalog.use(middleware);
```

## Matches whole-lane projection

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog.use(
  ({ context, next }) => next({ context: { deps: context.deps } }),
);
```

## Matches renamed, direct, spread, bracket, and raw-key curation

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog.use(
  ({ context: source, next }) => next({
    context: {
      ...source,
      deps: source["deps"],
    },
  }),
);
```

## Matches renamed whole-lane values and whole-lane spreads

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog.use(
  ({ context, next }) => next({
    context: {
      root: context,
      dependencies: context.deps,
      ...context.provided,
      ...context["invocation"],
    },
  }),
);
```

## Ignores the native funnel and curated handler vocabulary

```typescript
// @filename: services/jobs/src/service/base.ts
import { os } from "@orpc/server";
export type Context = {
  readonly deps: { readonly database: Database };
  readonly scope: { readonly actor?: Actor };
  readonly config: Record<never, never>;
  readonly invocation: Record<never, never>;
  readonly provided: Record<never, never>;
};
export const base = os.$context<Context>();
// @filename: services/jobs/src/service/middleware/database.ts
import { base } from "#jobs-service/base";
import { createJobsStore } from "#jobs-service/db/stores/jobs";
/** Derives the service-owned Jobs store from the ready database resource. */
export const middleware = base.middleware(({ context, next }) =>
  next({ context: { provided: { jobs: createJobsStore(context.deps.database) } } })
);
// @filename: services/jobs/src/service/impl.ts
import { middleware as provideDatabase } from "./middleware/database";
export const service = impl.use(provideDatabase);
// @filename: services/jobs/src/service/modules/catalog/middleware/access.ts
import { impl } from "#jobs-service/impl";
/** Admits Catalog access with its configured error constructors. */
export const middleware = impl.catalog.middleware(({ errors, next }) => {
  if (!mayRead()) throw errors.FORBIDDEN();
  return next();
});
// @filename: services/jobs/src/service/modules/catalog/middleware/index.ts
/** Catalog access policy exposed to the module wiring boundary. */
export { middleware as admitCatalog } from "./access";
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "#jobs-service/impl";
import { admitCatalog } from "./middleware";
export const module = service.catalog
  .use(admitCatalog)
  .use(({ context, next }) => next({
    context: {
      actor: context.scope.actor,
      jobs: context.provided.jobs,
    },
  }));
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
export const get = module.get.handler(({ context }) => context.jobs.get());
```
