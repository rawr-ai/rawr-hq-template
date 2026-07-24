---
level: error
tags: [orpc, service, positive, composition]
---
# Require Native Service oRPC Composition

Standalone `base` is directly initialized by the named runtime
`implementEffect(contract, ...)` import. Exported standalone `service`,
API-plugin `service`, and `module` initializers visibly contain their first
native hop from a named runtime `base` import, named runtime
`implement(contract).$context<...>()`, or the named runtime `service` branch
matching the module directory. Those runtime specifiers may share an import
declaration with other type-only specifiers, but the ownership binding itself
must be a runtime import. A type-only `implementEffect`, `implement`, `base`, or
`service` specifier cannot satisfy a runtime ownership hop. Runtime namespaces
from the oRPC composition vendors are rejected.

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

// Requires an exact named import specifier to survive at runtime.
predicate imports_runtime_binding($import, $anchor) {
  $import <: contains import_specifier(name=$anchor) as $specifier where {
    $specifier <: not contains type(),
    $specifier <: $anchor
  }
}

// Requires standalone base construction to import named Effect-oRPC authority.
predicate imports_exact_implement_effect($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']effect-orpc[\"']$",
    imports_runtime_binding(import=$import, anchor=`implementEffect`)
  }
}

// Requires embedded API services to import named oRPC server authority.
predicate imports_exact_implement($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    imports_runtime_binding(import=$import, anchor=`implement`)
  }
}

// Connects standalone initialization to a named runtime base import.
predicate imports_exact_base($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']\./base[\"']$",
    imports_runtime_binding(import=$import, anchor=`base`)
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
        imports_runtime_binding(import=$import, anchor=`service`)
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

## Matches a type-only standalone base authority

```typescript
// @filename: services/jobs/src/service/base.ts
import { type implementEffect } from "effect-orpc";
import { contract } from "./contract";
export const base = implementEffect(contract, Layer.empty);
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
import { base } from "./base"; export const service = base;
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

## Ignores combined runtime and type-only named imports

```typescript
// @filename: services/jobs/src/service/base.ts
import { implementEffect, type EffectHandler } from "effect-orpc";
import { contract } from "./contract";
export const base = implementEffect(contract, Layer.empty);
// @filename: services/jobs/src/service/impl.ts
import { base, type Context, type InitialContext } from "./base";
export const service = base.use<Context, InitialContext>(provider);
// @filename: services/jobs/src/service/modules/job-search/module.ts
import { service, type ServiceContext } from "#jobs-service/impl";
export const module = service.jobSearch.use<ServiceContext>(provider);
// @filename: plugins/server/api/catalog/src/service/impl.ts
import { implement, type Middleware } from "@orpc/server";
import { contract } from "./contract";
export const service = implement(contract).$context<Context>().use(authentication);
```
