---
level: error
tags: [orpc, service, positive, composition]
---
# Require Native Service oRPC Composition

Standalone `base` is directly initialized by exact named
`implementEffect(contract, ...)`. Exported standalone `service`, API-plugin
`service`, and `module` initializers visibly contain their first native hop
from imported `base`, exact named `implement(contract).$context<...>()`, or the
imported service branch matching the module directory. Runtime namespaces from
the oRPC composition vendors are rejected.

Any number of native `.use(...)` calls may follow the visible first hop. Grit
does not prove that an outer wrapper preserves that owner. TypeScript and
review own that ceiling plus router composition, assignability, and
completeness. No root contract/router object-placement claim is made.

```grit
language js(typescript)

// Derives the native service branch identifier from its module directory.
function service_branch_name($value) js {
  return `^${$value.text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}$`;
}

// Requires standalone base construction to use exact Effect-oRPC authority.
predicate imports_exact_implement_effect($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']effect-orpc[\"']$",
    $import <: `import { implementEffect } from $source`
  }
}

// Requires embedded API services to use exact oRPC server authority.
predicate imports_exact_implement($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    $import <: `import { implement } from $source`
  }
}

// Connects standalone service initialization to its exact local base binding
// without constraining unrelated named imports from the same module.
predicate imports_value_binding($import, $binding) {
  $import <: contains import_specifier(name=$binding) as $specifier where {
    $specifier <: not contains type(),
    $specifier <: $binding
  }
}

predicate imports_exact_base($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']\./base[\"']$",
    imports_value_binding(import=$import, binding=`base`)
  }
}

// Keeps a standalone service's first hop on its native base chain.
predicate is_standalone_service_initializer($value) {
  or {
    $value <: `base`,
    $value <: contains or {
      `base.use($middleware)`,
      `base.use<$types>($middleware)`
    }
  }
}

// Keeps an API service's first hop on contract implementation and context.
predicate is_api_service_initializer($value) {
  $value <: contains `implement(contract).$context_method<$context_type>()` where {
    $context_method <: r"^\$context$"
  }
}

// Accepts only same-owner root service sources for module derivation.
predicate is_current_root_service_source($source) {
  or {
    $source <: r"^[\"']\.\./\.\./impl[\"']$",
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/[^/]+/module\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/impl[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/[^/]+/module\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?impl[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Connects a module initializer to its directory's service branch.
predicate is_matching_module_initializer($value, $branch_pattern) {
  or {
    $value <: `service.$branch` where {
      $branch <: r`$branch_pattern`
    },
    $value <: contains or {
      `service.$branch.use($middleware)`,
      `service.$branch.use<$types>($middleware)`
    } where {
      $branch <: r`$branch_pattern`
    }
  }
}

or {
  program(statements=$body) where {
    $filename <: r".*services/[^/]+/src/service/base\.ts$",
    not {
      imports_exact_implement_effect(body=$body),
      $body <: contains or {
        `export const base = implementEffect(contract, $...)`,
        `export const base: $type = implementEffect(contract, $...)`
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*services/[^/]+/src/service/impl\.ts$",
    not {
      imports_exact_base(body=$body),
      $body <: contains or {
        `export const service = $value`,
        `export const service: $type = $value`
      } where {
        is_standalone_service_initializer(value=$value)
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*plugins/server/api/[^/]+/src/service/impl\.ts$",
    not {
      imports_exact_implement(body=$body),
      $body <: contains or {
        `export const service = $value`,
        `export const service: $type = $value`
      } where {
        is_api_service_initializer(value=$value)
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/([^/]+)/module\.ts$"($module_name),
    $branch_pattern = service_branch_name(value=$module_name),
    not {
      $body <: contains import_statement(source=$source) as $import where {
        is_current_root_service_source(source=$source),
        $import <: `import { service } from $source`
      },
      $body <: contains or {
        `export const module = $value`,
        `export const module: $type = $value`
      } where {
        is_matching_module_initializer(value=$value, branch_pattern=$branch_pattern)
      }
    }
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $source <: r"^[\"'](?:effect-orpc|@orpc/contract|@orpc/server)[\"']$",
    $import <: `import * as $namespace from $source`,
    not { $import <: import_statement(type=type()) }
  }
}
```

## Matches a noncanonical standalone base vendor import

```typescript
// @filename: services/jobs/src/service/base.ts
import { implementEffect as makeBase } from "effect-orpc";
import { contract } from "./contract";
export const base = makeBase(contract, Layer.empty);
```

## Matches a disconnected standalone base initializer

```typescript
// @filename: services/jobs/src/service/base.ts
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
const configured = implementEffect(contract, Layer.empty);
export const base = configured;
```

## Matches a disconnected standalone service

```typescript
// @filename: services/jobs/src/service/impl.ts
import { base } from "./base";
const configured = base.use(provider);
export const service = configured;
```

## Matches a base binding imported from the wrong source

```typescript
// @filename: services/jobs/src/service/impl.ts
import type { Context } from "./base";
import { base } from "./other";
export const service = base.use<Context, Context>(middleware);
```

## Matches a disconnected API service

```typescript
// @filename: plugins/server/api/catalog/src/service/impl.ts
import { implement } from "@orpc/server";
import { contract } from "./contract";
const base = implement(contract).$context<Context>();
export const service = base.use(authentication);
```

## Matches a disconnected module branch

```typescript
// @filename: services/jobs/src/service/modules/job-search/module.ts
import { service } from "#jobs-service/impl";
const branch = service.jobSearch;
export const module = branch.use(provider);
```

## Matches a runtime composition namespace

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import * as orpc from "@orpc/server";
export const router = orpc.router({});
```

## Ignores root composers, native middleware depths, and long chains

```typescript
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "./modules/catalog/contract";
export const contract: Contract = { capabilities: { catalog } } satisfies Contract;
// @filename: plugins/server/api/catalog/src/service/router.ts
import { router as catalog } from "./modules/catalog/router";
export const router: Router<typeof contract, Context> =
  service.router({ capabilities: { catalog } });
// @filename: services/jobs/src/service/impl.ts
import { base, createTelemetry, type Context } from "./base";
const telemetry = createTelemetry();
export const service = base.use(telemetry);
// @filename: services/catalog/src/service/impl.ts
import { base } from "./base"; export const service = base.use(one);
// @filename: services/search/src/service/impl.ts
import { base } from "./base"; export const service = base.use(one).use(two);
// @filename: services/applications/src/service/impl.ts
import { base } from "./base";
export const service = base.use(one).use(two).use(three).use(four);
// @filename: plugins/server/api/pipeline/src/service/impl.ts
import { implement } from "@orpc/server"; import { contract } from "./contract";
export const service = implement(contract).$context<Context>()
  .use(one).use(two).use(three);
// @filename: services/jobs/src/service/modules/job-search/module.ts
import { service } from "#jobs-service/impl";
export const module = service.jobSearch.use(one).use(two).use(three);
// @filename: services/jobs/src/service/modules/job-search/router.ts
import { module } from "./module";
export const router: Router = {
  find: module.find.use(one).use(two).use(three).effect(handler),
} satisfies Router;
```
