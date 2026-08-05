---
level: error
tags: [orpc, service, context, middleware]
---
# Require Service Context Boundaries

One base declaration owns five explicit context and lifetime lanes. When
context-authored middleware exists, one native `base` author derives it. Each
module terminally curates the smaller vocabulary used by its handlers.
Operation leaves never reopen the raw lanes.

Reusable policy that consumes validated input may cross the module middleware
catalog into procedure leaves. Native procedure attachment preserves the
post-schema execution point; router-level attachment does not.

This rule owns only visible source relationships. TypeScript proves context
merging and assignability; behavior proof owns middleware order, isolation,
and lifecycle.

```grit
language js(typescript)

// Selects the one root file that declares a service's complete native context.
predicate require_service_context_boundaries_is_base() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/base\.ts$"
}

// Selects named root middleware authority leaves.
predicate require_service_context_boundaries_is_root_middleware() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/middleware/[^/]+\.ts$"
}

// Selects the service implementation boundary that consumes root middleware.
predicate require_service_context_boundaries_is_impl() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$"
}

// Selects all governed service production source.
predicate require_service_context_boundaries_is_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$"
}

// Recognizes every direct middleware-leaf import route.
predicate require_service_context_boundaries_is_middleware_leaf_source($source) {
  $source <: r"^[\"'](?:(?:\./|\.\./)+[^\"']*middleware/[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[cm]?[jt]sx?)?|#[^/]+-(?:service|api)/middleware/[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[cm]?[jt]sx?)?)[\"']$"
}

// Recognizes the canonical service-root middleware route from its implementation.
predicate require_service_context_boundaries_is_root_middleware_source($source) {
  $source <: r"^[\"'](?:\./middleware/[a-z][a-z0-9]*(?:-[a-z0-9]+)*|#[^/]+-(?:service|api)/middleware/[a-z][a-z0-9]*(?:-[a-z0-9]+)*)[\"']$"
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

// Matches a source alias kind to the importing service lane.
predicate require_service_context_boundaries_is_same_kind($lane, $alias_kind) {
  or {
    and {
      $lane <: r"^services$",
      $alias_kind <: r"^service$"
    },
    and {
      $lane <: r"^plugins/server/api$",
      $alias_kind <: r"^api$"
    }
  }
}

// Recognizes the configured module face that middleware must not reacquire.
predicate require_service_context_boundaries_is_module_implementation_source($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/([^/]+)/middleware/[^/]+\.ts$"($lane, $owner, $module),
  or {
    $source <: r"^[\"']\.\./module(?:\.[cm]?[jt]s)?[\"']$",
    and {
      $source <: r"^[\"']#([^/]+)-(service|api)/modules/([^/]+)/module(?:\.[cm]?[jt]s)?[\"']$"($alias_owner, $alias_kind, $target),
      $alias_owner <: $owner,
      require_service_context_boundaries_is_same_kind(
        lane=$lane,
        alias_kind=$alias_kind
      ),
      $target <: $module
    }
  }
}

// Recognizes middleware cycling through its own directory access point.
predicate require_service_context_boundaries_is_own_middleware_index_source($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/([^/]+)/middleware/[^/]+\.ts$"($lane, $owner, $module),
  or {
    $source <: r"^[\"'](?:\.|\./|\./index(?:\.[cm]?[jt]s)?|\.\./middleware(?:/|/index(?:\.[cm]?[jt]s)?)?)[\"']$",
    and {
      $source <: r"^[\"']#([^/]+)-(service|api)/modules/([^/]+)/middleware(?:/|/index(?:\.[cm]?[jt]s)?)?[\"']$"($alias_owner, $alias_kind, $target),
      $alias_owner <: $owner,
      require_service_context_boundaries_is_same_kind(
        lane=$lane,
        alias_kind=$alias_kind
      ),
      $target <: $module
    }
  }
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
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.ts$"
}

// Selects the module spine that owns terminal handler-context curation.
predicate require_service_context_boundaries_is_module() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Selects the two destinations allowed to consume a module middleware catalog.
predicate require_service_context_boundaries_is_module_middleware_consumer() {
  or {
    require_service_context_boundaries_is_module(),
    require_service_context_boundaries_is_router_leaf()
  }
}

// Recognizes the catalog edge appropriate to each allowed attachment depth.
predicate require_service_context_boundaries_is_canonical_middleware_catalog_source($source) {
  or {
    and {
      require_service_context_boundaries_is_module(),
      $source <: r"^[\"']\./middleware[\"']$"
    },
    and {
      require_service_context_boundaries_is_router_leaf(),
      $source <: r"^[\"']\.\./middleware[\"']$"
    }
  }
}

// Confirms that module middleware descends through the configured native service branch.
function require_service_context_boundaries_module_receiver_status($filename, $receiver) js {
  const match = $filename.text.match(/\/modules\/([^/]+)\/module\.ts$/);
  if (!match) return "wrong-destination";
  const branch = match[1].replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  const receiver = $receiver.text.replace(/\s+/g, "");
  const root = `service.${branch}`;
  if (!receiver.startsWith(root)) return "wrong-root";

  const middlewareChain = receiver.slice(root.length);
  return /^(?:\.use\([A-Za-z_$][A-Za-z0-9_$]*\))*$/.test(middlewareChain)
    ? "ok"
    : "non-native-chain";
}

// Recognizes a native operation chain without duplicating router path ownership.
private pattern require_service_context_boundaries_is_operation_attachment_receiver() {
  or {
    `module.$branch`,
    `$prior.$member` where {
      $prior <: require_service_context_boundaries_is_operation_attachment_receiver()
    },
    `$prior.use($middleware)` where {
      $prior <: require_service_context_boundaries_is_operation_attachment_receiver()
    }
  }
}

// Proves one catalog binding has a visible native destination attachment.
predicate require_service_context_boundaries_is_attached_catalog_binding($name, $body) {
  or {
    and {
      require_service_context_boundaries_is_module(),
      $body <: contains `export const module = $value` where {
        $value <: contains `$receiver.use($name)` where {
          $status = require_service_context_boundaries_module_receiver_status(
            filename=$filename,
            receiver=$receiver
          ),
          $status <: includes "ok"
        }
      }
    },
    and {
      require_service_context_boundaries_is_router_leaf(),
      $body <: contains `export const $operation = $value` where {
        $operation <: r"^[a-z][A-Za-z0-9]*$",
        $value <: contains `$receiver.use($name)` where {
          $receiver <: require_service_context_boundaries_is_operation_attachment_receiver()
        }
      }
    }
  }
}

// Recognizes the complete five-lane context declaration.
predicate require_service_context_boundaries_has_funnel($body) {
  $body <: contains `export type Context = {
    readonly deps: $deps;
    readonly scope: $scope;
    readonly config: $config;
    readonly invocation: $invocation;
    readonly provided: $provided;
  }`
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

// Recognizes runtime declarations that cross a middleware-leaf boundary.
predicate require_service_context_boundaries_is_runtime_export($export) {
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

// Proves one generic root middleware export.
predicate require_service_context_boundaries_is_root_middleware_export($export) {
  $export <: or {
    `export const middleware = $value`,
    `export const middleware: $type = $value`
  }
}

// Proves one semantic import alias attached to the exported service lineage.
predicate require_service_context_boundaries_is_attached_root_middleware_import($import, $source, $body) {
  $import <: `import { middleware as $name } from $source`,
  $name <: r"^[a-z][A-Za-z0-9]*$",
  $body <: contains `export const service = $value` where {
    $value <: contains `$receiver.use($name)`
  }
}

// Checks that unconfigured policy authorship stays rooted at its owning module.
function require_service_context_boundaries_contract_policy_status($filename, $branch) js {
  const match = $filename.text.match(/\/modules\/([^/]+)\/middleware\/[^/]+\.ts$/);
  if (!match) return "not-module-middleware";
  const expected = match[1].replace(/-([a-z0-9])/g, (_all, value) => value.toUpperCase());
  return expected === $branch.text ? "ok" : "wrong-branch";
}

// Recognizes documented contract-aware policy authored from an owning router implementer.
predicate require_service_context_boundaries_has_contract_policy($body) {
  $body <: contains `import { impl } from $source`,
  $body <: contains `export const middleware = $call` as $export,
  $call <: call_expression(
    function=`$receiver.middleware`,
    arguments=[$callback]
  ),
  $receiver <: r"^impl\.([A-Za-z_$][A-Za-z0-9_$]*)(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$"($branch),
  $status = require_service_context_boundaries_contract_policy_status(
    filename=$filename,
    branch=$branch
  ),
  $status <: includes "ok",
  require_service_context_boundaries_has_jsdoc(export=$export)
}

// Recognizes an inferred final curation that selects explicit handler context.
predicate require_service_context_boundaries_has_terminal_curation($body) {
  or {
    $body <: contains `export const module = $receiver.use(
      ({ context, next }) => next({ context: { $properties } })
    )` where {
      $status = require_service_context_boundaries_module_receiver_status(
        filename=$filename,
        receiver=$receiver
      ),
      $status <: includes "ok"
    },
    $body <: contains `export const module = $receiver.use(
      ({ context, next }) => {
        $...
        return next({ context: { $properties } });
      }
    )` where {
      $status = require_service_context_boundaries_module_receiver_status(
        filename=$filename,
        receiver=$receiver
      ),
      $status <: includes "ok"
    }
  }
}

// Rejects block curation unless its terminal projection is the sole next call.
predicate require_service_context_boundaries_has_non_single_block_next($body) {
  $body <: contains `export const module = $receiver.use($callback)`,
  $callback <: `({ context, next }) => { $... }`,
  $next_calls = [],
  $callback <: contains bubble($next_calls) `next($arguments)` as $call where {
    $next_calls += $call
  },
  $next_call_count = length(target=$next_calls),
  ! $next_call_count <: 1
}

// Detects raw ownership lanes destructured from handler context.
predicate require_service_context_boundaries_is_raw_destructure($binding) {
  $binding <: r"^\{(?s:.*)(?:deps|scope|config|invocation|provided)(?s:.*)\}$"
}

// Recognizes client-construction vocabulary that must be realized before operation authorship.
predicate require_service_context_boundaries_is_client_factory_member($member) {
  or {
    $member <: r"^create[A-Za-z0-9_$]*Client$",
    $member <: r"^[\"']create[A-Za-z0-9_$]*Client[\"']$"
  }
}

// Detects client factories reached from an operation leaf instead of its curated context.
private pattern require_service_context_boundaries_forbidden_router_realization_access() {
  or {
    member_expression(property=$member) where {
      require_service_context_boundaries_is_client_factory_member(member=$member)
    },
    subscript_expression(index=$member) where {
      require_service_context_boundaries_is_client_factory_member(member=$member)
    },
    variable_declarator(name=$binding) where {
      $binding <: contains or {
        shorthand_property_identifier_pattern() as $member,
        pair_pattern(key=$member)
      },
      require_service_context_boundaries_is_client_factory_member(member=$member)
    }
  }
}

// Detects a module projection that forwards raw service context authority.
private pattern require_service_context_boundaries_forbidden_module_projection() {
  or {
    `$key: context.$lane` where {
      $lane <: r"^(?:deps|scope|config|invocation|provided)$"
    },
    `$lane: $value` where {
      $lane <: r"^(?:deps|scope|config|invocation|provided)$"
    },
    `$key: context[$lane]` where {
      $lane <: r"^[\"'](?:deps|scope|config|invocation|provided)[\"']$"
    },
    `$key: context`,
    `...context`,
    `...context.$lane` where {
      $lane <: r"^(?:deps|scope|config|invocation|provided)$"
    },
    `...context[$lane]` where {
      $lane <: r"^[\"'](?:deps|scope|config|invocation|provided)[\"']$"
    },
    `next({ context })`
  }
}

// Detects an operation that reopens the raw service context lanes.
private pattern require_service_context_boundaries_forbidden_router_lane() {
  or {
    `context.$lane` where {
      $lane <: r"^(?:deps|scope|config|invocation|provided)$"
    },
    `context[$lane]` where {
      $lane <: r"^[\"'](?:deps|scope|config|invocation|provided)[\"']$"
    },
    or {
      `const $binding = context`,
      `let $binding = context`
    } where {
      require_service_context_boundaries_is_raw_destructure(binding=$binding)
    }
  }
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
  export_statement() as $export where {
    require_service_context_boundaries_is_root_middleware(),
    require_service_context_boundaries_is_runtime_export(export=$export),
    not {
      require_service_context_boundaries_is_root_middleware_export(
        export=$export
      )
    }
  },
  or {
    `export default $value`,
    `export * from $source`,
    `export { $specifiers }`,
    `export { $specifiers } from $source`
  } where {
    require_service_context_boundaries_is_root_middleware()
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_impl(),
    $body <: some import_statement(source=$source) as $import where {
      require_service_context_boundaries_is_middleware_leaf_source(
        source=$source
      ),
      or {
        not {
          require_service_context_boundaries_is_root_middleware_source(
            source=$source
          )
        },
        not {
          require_service_context_boundaries_is_attached_root_middleware_import(
            import=$import,
            source=$source,
            body=$body
          )
        }
      }
    }
  },
  import_statement(source=$source) where {
    require_service_context_boundaries_is_source(),
    not { require_service_context_boundaries_is_impl() },
    require_service_context_boundaries_is_middleware_leaf_source(source=$source)
  },
  export_statement(source=$source) where {
    require_service_context_boundaries_is_source(),
    require_service_context_boundaries_is_middleware_leaf_source(source=$source)
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
    require_service_context_boundaries_is_module_middleware_consumer(),
    $source <: r"^[\"'](?:(?:\./|\.\./)+[^\"']*middleware(?:/[^\"']+)?|#[^/]+-(?:service|api)/modules/[^/]+/middleware(?:/[^\"']+)?)[\"']$",
    not {
      require_service_context_boundaries_is_canonical_middleware_catalog_source(
        source=$source
      )
    }
  },
  import_statement(source=$source) where {
    require_service_context_boundaries_is_module_middleware(),
    require_service_context_boundaries_is_module_implementation_source(
      source=$source
    )
  },
  import_statement(source=$source) where {
    require_service_context_boundaries_is_module_middleware(),
    require_service_context_boundaries_is_own_middleware_index_source(
      source=$source
    )
  },
  export_statement(source=$source) where {
    require_service_context_boundaries_is_module_middleware(),
    require_service_context_boundaries_is_module_implementation_source(
      source=$source
    )
  },
  export_statement(source=$source) where {
    require_service_context_boundaries_is_module_middleware(),
    require_service_context_boundaries_is_own_middleware_index_source(
      source=$source
    )
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_module_middleware_consumer(),
    $body <: some import_statement(source=$source) as $import where {
      require_service_context_boundaries_is_canonical_middleware_catalog_source(
        source=$source
      ),
      $import <: contains import_specifier(name=$name) where {
        not {
          require_service_context_boundaries_is_attached_catalog_binding(
            name=$name,
            body=$body
          )
        }
      }
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_module(),
    not {
      require_service_context_boundaries_has_terminal_curation(body=$body)
    }
  },
  program(statements=$body) where {
    require_service_context_boundaries_is_module(),
    require_service_context_boundaries_has_non_single_block_next(body=$body)
  },
  program() as $program where {
    require_service_context_boundaries_is_module(),
    $program <: contains require_service_context_boundaries_forbidden_module_projection()
  },
  program() as $program where {
    require_service_context_boundaries_is_router_leaf(),
    $program <: contains require_service_context_boundaries_forbidden_router_lane()
  },
  program() as $program where {
    require_service_context_boundaries_is_router_leaf(),
    $program <: contains require_service_context_boundaries_forbidden_router_realization_access()
  },
  `$receiver.use<$types>($middleware, $...)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:impl|modules/[^/]+/(?:module|router/[^/]+))\.ts$"
  }
}
```

## Matches middleware that reacquires its configured module

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.ts
import { module } from "../module";
export const middleware = module.middleware(({ next }) => next());
```

## Matches middleware cycling through its catalog

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.ts
import { admitCatalog } from "../middleware";
export const middleware = impl.catalog.middleware(({ next }) => next());
```

## Matches an incomplete context declaration

```typescript
// @filename: services/jobs/src/service/base.ts
import { os } from "@orpc/server";
export type Context = { readonly deps: {}; readonly scope: {} };
export const base = os.$context<Context>();
```

## Ignores a context-only base without context-authored middleware

```typescript
// @filename: services/discovery/src/service/base.ts
export type Context = {
  readonly deps: { readonly listingSearch: ListingSearch };
  readonly scope: { readonly actor?: Actor };
  readonly config: {};
  readonly invocation: {};
  readonly provided: {};
};
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

## Matches client construction inside operation authorship

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
export const get = module.get.handler(({ context }) =>
  context.providers.createJobsClient().get()
);
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

## Matches a reusable group policy imported without operation attachment

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/router/jobs.ts
import { admitCollectJobs } from "../middleware";
export const jobs = {
  submit: module.jobs.submit.handler(submit),
};
```

## Matches module middleware attached to the wrong configured branch

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { requireCatalogAuthority } from "./middleware";
export const module = service.queue
  .use(requireCatalogAuthority)
  .use(({ context, next }) => next({ context: { jobs: context.provided.jobs } }));
```

## Matches module middleware attached through a receiver wrapper

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { requireCatalogAuthority } from "./middleware";
export const module = wrap(service.catalog)
  .use(requireCatalogAuthority)
  .use(({ context, next }) => next({ context: { jobs: context.provided.jobs } }));
```

## Matches an outer wrapper around a native module attachment

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { requireCatalogAuthority } from "./middleware";
export const module = wrap(service.catalog.use(requireCatalogAuthority))
  .use(({ context, next }) => next({ context: { jobs: context.provided.jobs } }));
```

## Matches a non-native fluent hop inside the module chain

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { provideAdmin, requireCatalogAuthority } from "./middleware";
export const module = service.catalog
  .use(requireCatalogAuthority)
  .admin.use(provideAdmin)
  .use(({ context, next }) => next({ context: { jobs: context.provided.jobs } }));
```

## Ignores multiple module middleware attachments on the owning native chain

```typescript
// @filename: services/example-todo/src/service/modules/assignments/module.ts
/**
 * @fileoverview Assignments module runtime composition.
 *
 * @remarks
 * This file owns module composition only:
 * - start from the configured package-level service branch
 * - attach qualified Assignments telemetry once
 * - curate the assignment route context from inherited service capabilities
 * - export configured `module` for handler implementations
 */
import { service } from "../../impl";
import { telemetry } from "./middleware";

/**
 * SECTION: Module Composition (Always Present)
 *
 * Keep module-wide composition here so procedure handlers can stay focused on business logic.
 */
export const module = service.assignments.use(telemetry).use(async ({ context, next }) =>
  next({
    context: {
      clock: context.deps.clock,
      identifierGenerator: context.deps.identifierGenerator,
      workspaceId: context.scope.workspaceId,
      maxAssignmentsPerTask: context.config.limits.maxAssignmentsPerTask,
      readOnly: context.config.readOnly,
      assignmentsStore: context.provided.assignmentsStore,
      tasksStore: context.provided.tasksStore,
      tagsStore: context.provided.tagsStore,
    },
  })
);
```

## Matches middleware nested inside another operation attachment

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/update.ts
import { authorizeCatalogUpdate } from "../middleware";
export const update = module.update
  .use(other.use(authorizeCatalogUpdate))
  .handler(handler);
```

## Matches a middleware catalog alias from an operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/update.ts
import { authorizeCatalogUpdate } from "#jobs-service/modules/catalog/middleware";
export const update = module.update.use(authorizeCatalogUpdate).handler(handler);
```

## Matches root contract policy

```typescript
// @filename: services/jobs/src/service/middleware/access.middleware.ts
import { impl } from "../impl";
/** Admits service access. */
export const middleware = impl.catalog.middleware(({ next }) => next());
```

## Matches a root middleware barrel

```typescript
// @filename: services/jobs/src/service/middleware/index.ts
export { middleware as provideJobs } from "./jobs";
```

## Matches a second root middleware export

```typescript
// @filename: services/jobs/src/service/middleware/jobs.ts
import { base } from "#jobs-service/base";
/** Provides the Jobs store. */
export const middleware = base.middleware(({ next }) => next());
export const preview = middleware;
```

## Matches root middleware imported without attachment

```typescript
// @filename: services/jobs/src/service/impl.ts
import { middleware as provideJobs } from "./middleware/jobs";
export const impl = implement(contract).$context<Context>();
export const service = impl.use(admitActor);
```

## Matches a root middleware imported through a noncanonical route

```typescript
// @filename: services/jobs/src/service/impl.ts
import { middleware as provideJobs } from "../service/middleware/jobs.ts";
export const impl = implement(contract).$context<Context>();
export const service = impl.use(provideJobs);
```

## Matches a root middleware imported through a runtime extension

```typescript
// @filename: services/jobs/src/service/impl.ts
import { middleware as provideJobs } from "./middleware/jobs.js";
export const impl = implement(contract).$context<Context>();
export const service = impl.use(provideJobs);
```

## Matches contract policy on the wrong module branch

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware/access.ts
import { impl } from "#jobs-service/impl";
/** Admits Catalog access. */
export const middleware = impl.queue.middleware(({ next }) => next());
```

## Matches nested contract policy rooted at a sibling module

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/middleware/jobs-access.ts
import { impl } from "#pipeline-api/impl";
/** Admits Collect Jobs access. */
export const middleware = impl.discovery.jobs.middleware(({ next }) => next());
```

## Matches explicit middleware composition types

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog.use<CatalogContext>(provideCatalog);
```

## Matches explicit middleware composition types on an operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/update.ts
export const update = module.update
  .use<ValidatedCatalogInput>(authorizeCatalogUpdate)
  .handler(handler);
```

## Ignores reusable group policy authored at its nearest router descendant

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/middleware/jobs-access.ts
import { impl } from "#pipeline-api/impl";
/** Admits access to the reusable Collect Jobs group. */
export const middleware = impl.collect.jobs.middleware(({ errors, next }) => {
  if (!mayCollect()) throw errors.FORBIDDEN();
  return next();
});
// @filename: plugins/server/api/pipeline/src/service/modules/collect/router/jobs.ts
import { admitCollectJobs } from "../middleware";
export const jobs = {
  submit: module.jobs.submit.use(admitCollectJobs).handler(submit),
  status: module.jobs.status.use(admitCollectJobs).handler(status),
};
```

## Ignores combined group policies attached below the filename-owned router

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/router/jobs.ts
import { auditCollectJobs, authorizeCollectJobs } from "../middleware";
export const jobs = {
  submit: module.jobs.submit
    .use(authorizeCollectJobs)
    .use(auditCollectJobs)
    .handler(submit),
  status: module.jobs.status
    .use(authorizeCollectJobs)
    .use(auditCollectJobs)
    .handler(status),
};
```

## Matches a combined group import with one unattached binding

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/router/jobs.ts
import { auditCollectJobs, authorizeCollectJobs } from "../middleware";
export const jobs = {
  submit: module.jobs.submit.use(authorizeCollectJobs).handler(submit),
  status: module.jobs.status.use(authorizeCollectJobs).handler(status),
};
```

## Ignores catalog policy attached at the post-schema procedure point

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/router/submit.ts
import { admitCollectJobs } from "../middleware";
export const submit = module.jobs.submit
  .use(admitCollectJobs)
  .handler(submitJob);
```

## Ignores catalog policy attached to a deliberate native operation group

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/search.ts
import { authorizeCatalogSearch } from "../middleware";
export const search = {
  available: module.search.available.use(authorizeCatalogSearch).handler(searchAvailable),
  archived: module.search.archived.handler(searchArchived),
};
```

## Ignores inline validated-input policy that uses curated context

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/update.ts
export const update = module.update
  .use(({ context, errors, next }, input) => {
    if (!mayUpdate(context.actor, input.id)) throw errors.FORBIDDEN();
    return next();
  }).handler(handler);
```

## Ignores exact-leaf policy kept inline on the native procedure

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/update.ts
export const update = module.catalog.update
  .use(({ context, errors, next }, input) => {
    if (!mayUpdate(context.actor, input.id)) throw errors.FORBIDDEN();
    return next();
  })
  .handler(handler);
```

## Matches a module without terminal curation

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "#jobs-service/impl";
import { middleware } from "./middleware/catalog.middleware";
export const module = service.catalog.use(middleware);
```

## Ignores block-bodied terminal curation with private acquisition failure

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/module.ts
export const module = service.collect
  .use(mapValidationErrors)
  .use(({ context, next }) => {
    let collectServiceClient;
    try {
      collectServiceClient = context.deps.collect.createServiceClient(actor);
    } catch (cause) {
      throw new Error("Collect service client provider failed", { cause });
    }
    return next({ context: { collectServiceClient } });
  });
```

## Matches block-bodied curation with an earlier next call

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/module.ts
export const module = service.collect.use(({ context, next }) => {
  next({ context: { audit: context.scope.actor } });
  return next({ context: { collectServiceClient } });
});
```

## Matches block-bodied curation that projects a raw lane

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog.use(({ context, next }) => {
  audit(context.scope.actor);
  return next({ context: { deps: context.deps } });
});
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
