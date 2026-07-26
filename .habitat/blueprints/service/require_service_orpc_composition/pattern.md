---
level: error
tags: [orpc, service, positive, composition]
---
# Require Native Service oRPC Composition

Standalone `base` is directly initialized by the named runtime
`implementEffect(contract, ...)` import, optionally followed by its native
`.$context<...>()` seed. Exported standalone `service`,
API-plugin `service`, and `module` initializers visibly contain their first
native hop from a named runtime `base` import, named runtime
`implement(contract).$context<...>()`, or the named runtime `service` branch
matching the module directory. Those runtime specifiers may share an import
declaration with other type-only specifiers, but the ownership binding itself
must be a runtime import. A type-only `implementEffect`, `implement`, `base`, or
`service` specifier cannot satisfy a runtime ownership hop. Runtime namespaces
from the oRPC composition vendors are rejected.

Standalone runtime `implementEffect` authority exists only in root `base.ts`;
embedded API `implement(...).$context` authority exists only in root `impl.ts`.
Any number of native `.use(...)` calls may follow that visible first hop. Grit
does not prove that an outer wrapper preserves its owner. TypeScript and review
own that ceiling plus assignability and completeness.

The root router imports qualified completed module routers and composes their
plain object surface. It does not import runtime base/implementation authority,
author handlers, attach middleware, invoke a native router builder, or
reconstruct module initial contexts. Its direct export carries the canonical
`Router<typeof contract, never>` contract check; the public client/server
boundary infers the completed router's host context. The module-isolation
packet separately owns root-to-module source normalization and source-to-branch
qualification. No finite module-key inventory is encoded.

```grit
language js(typescript)

// Derives the native service branch identifier from its module directory.
function require_service_orpc_composition_service_branch_name($value) js {
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

// Requires an exact named import specifier to survive at runtime.
predicate require_service_orpc_composition_imports_runtime_binding($import, $anchor) {
  not { $import <: import_statement(type=type()) },
  $import <: contains import_specifier(name=$anchor) as $specifier where {
    not { $specifier <: r"^type\s+.*$" }
  }
}

// Restricts composition edges to named bindings with optional type companions.
predicate require_service_orpc_composition_is_named_only_import($import, $source) {
  or {
    $import <: `import { $... } from $source`,
    $import <: `import type { $... } from $source`
  }
}

// Selects governed non-test service source.
predicate require_service_orpc_composition_is_governed_service_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Selects the root router, whose only runtime inputs are completed module routers.
predicate require_service_orpc_composition_is_root_service_router_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$"
}

// Requires standalone base construction to import named Effect-oRPC authority.
predicate require_service_orpc_composition_imports_exact_implement_effect($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']effect-orpc[\"']$",
    require_service_orpc_composition_imports_runtime_binding(import=$import, anchor=`implementEffect`)
  }
}

// Requires embedded API services to import named oRPC server authority.
predicate require_service_orpc_composition_imports_exact_implement($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']@orpc/server[\"']$",
    require_service_orpc_composition_imports_runtime_binding(import=$import, anchor=`implement`)
  }
}

// Connects standalone initialization to a named runtime base import.
predicate require_service_orpc_composition_imports_exact_base($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']\./base[\"']$",
    require_service_orpc_composition_imports_runtime_binding(import=$import, anchor=`base`)
  }
}

// Keeps standalone base construction on the direct Effect-oRPC context root.
predicate require_service_orpc_composition_is_standalone_base_initializer($value) {
  or {
    $value <: `implementEffect(contract, $runtime)`,
    $value <: `implementEffect(contract, $runtime).$context_method<$context>()` where {
      $context_method <: r"^\$context$"
    }
  }
}

// Keeps a standalone service's first hop on its native base chain.
predicate require_service_orpc_composition_is_standalone_service_initializer($value) {
  or {
    $value <: `base`,
    $value <: contains or {
      `base.use($middleware)`,
      `base.use<$types>($middleware)`
    }
  }
}

// Keeps an API service's first hop on contract implementation and context.
predicate require_service_orpc_composition_is_api_service_initializer($value) {
  $value <: contains `implement(contract).$context_method<$context_type>()` where {
    $context_method <: r"^\$context$"
  }
}

// Accepts only same-owner root service sources for module derivation.
predicate require_service_orpc_composition_is_current_root_service_source($source) {
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

// Recognizes an exact completed module-router source owned by the current service.
predicate require_service_orpc_composition_is_current_completed_module_router_source($source) {
  or {
    $source <: r"^[\"']\./modules/[^/\"']+/router[\"']$",
    and {
      $filename <: r".*services/([^/]+)/src/service/router\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/modules/[^/\"']+/router[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/router\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?modules/[^/\"']+/router[\"']$"($alias_owner),
      $alias_owner <: $owner
    }
  }
}

// Detects a runtime binding while preserving whole and mixed type-only imports.
predicate require_service_orpc_composition_has_runtime_import_binding($import) {
  not { $import <: import_statement(type=type()) },
  or {
    $import <: contains import_specifier() as $specifier where {
      not { $specifier <: r"^type\s+.*$" }
    },
    $import <: `import $default from $source`,
    $import <: `import * as $namespace from $source`,
    $import <: `import $source`
  }
}

// Admits one qualified completed-router import at the root composition boundary.
predicate require_service_orpc_composition_is_completed_module_router_import($import, $source) {
  require_service_orpc_composition_is_current_completed_module_router_source(source=$source),
  require_service_orpc_composition_is_named_only_import(import=$import, source=$source),
  $import <: contains import_specifier(name=`router`) as $router_specifier where {
    $router_specifier <: `router as $branch`
  },
  not {
    $import <: contains import_specifier() as $other_specifier where {
      not { $other_specifier <: r"^type\s+.*$" },
      not { $other_specifier <: `router as $other_branch` }
    }
  }
}

// Requires the root contract's generic local anchor from its owning file.
predicate require_service_orpc_composition_imports_local_contract($body) {
  $body <: contains import_statement(source=$source) as $import where {
    $source <: r"^[\"']\./contract[\"']$",
    require_service_orpc_composition_is_named_only_import(import=$import, source=$source),
    $import <: contains import_specifier(name=`contract`) as $contract_specifier where {
      $contract_specifier <: r"^(?:type\s+)?contract$"
    },
    or {
      $import <: `import type { $... } from $source`,
      not {
        $import <: contains import_specifier() as $other_specifier where {
          not { $other_specifier <: r"^type\s+.*$" }
        }
      }
    }
  }
}

// Admits only shorthand or spread composition with the canonical contract check.
predicate require_service_orpc_composition_is_plain_root_router_value($value) {
  $value <: `$object satisfies $router_type<typeof contract, never>` where {
    $object <: object()
  },
  not { $value <: contains call_expression() },
  not { $value <: contains `$key: $property` },
  not { $value <: contains method_definition() },
  not { $value <: contains arrow_function() }
}

// Restricts the root router to imports and its one completed composition export.
predicate require_service_orpc_composition_is_allowed_root_router_statement($statement) {
  or {
    $statement <: import_statement(),
    $statement <: `export const router = $value` where {
      require_service_orpc_composition_is_plain_root_router_value(value=$value)
    },
    $statement <: `export const router: $type = $value` where {
      require_service_orpc_composition_is_plain_root_router_value(value=$value)
    }
  }
}

// Requires one direct root export to preserve the canonical contract check.
predicate require_service_orpc_composition_has_root_contract_check($body) {
  require_service_orpc_composition_imports_local_contract(body=$body),
  or {
    and {
      $body <: contains import_statement(source=$source) as $import where {
        $source <: r"^[\"']@orpc/server[\"']$",
        $import <: contains import_specifier(name=`Router`) as $router_specifier where {
          $router_specifier <: r"^(?:type\s+)?Router$"
        }
      },
      $body <: contains
        `export const router = { $properties } satisfies Router<typeof contract, never>`
    },
    and {
      $body <: contains import_statement(source=$source) as $import where {
        $source <: r"^[\"']@orpc/server[\"']$",
        $import <: contains import_specifier(name=`Router`) as $router_specifier where {
          $router_specifier <: `Router as $router_type`
        }
      },
      $body <: contains
        `export const router = { $properties } satisfies $router_type<typeof contract, never>`
    }
  }
}

// Connects a module initializer to its directory's service branch.
predicate require_service_orpc_composition_is_matching_module_initializer($value, $branch_pattern) {
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

program(statements=$body) where {
  or {
    and {
      $filename <: r".*services/[^/]+/src/service/base\.ts$",
      not {
        require_service_orpc_composition_imports_exact_implement_effect(body=$body),
        $body <: contains or {
          `export const base = $value`,
          `export const base: $type = $value`
        } where {
          require_service_orpc_composition_is_standalone_base_initializer(value=$value)
        }
      }
    },
    and {
      $filename <: r".*services/[^/]+/src/service/impl\.ts$",
      not {
        require_service_orpc_composition_imports_exact_base(body=$body),
        $body <: contains or {
          `export const service = $value`,
          `export const service: $type = $value`
        } where {
          require_service_orpc_composition_is_standalone_service_initializer(value=$value)
        }
      }
    },
    and {
      $filename <: r".*plugins/server/api/[^/]+/src/service/impl\.ts$",
      not {
        require_service_orpc_composition_imports_exact_implement(body=$body),
        $body <: contains or {
          `export const service = $value`,
          `export const service: $type = $value`
        } where {
          require_service_orpc_composition_is_api_service_initializer(value=$value)
        }
      }
    },
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/([^/]+)/module\.ts$"($module_name),
      $branch_pattern = require_service_orpc_composition_service_branch_name(value=$module_name),
      not {
        $body <: contains import_statement(source=$source) as $import where {
          require_service_orpc_composition_is_current_root_service_source(source=$source),
          require_service_orpc_composition_imports_runtime_binding(import=$import, anchor=`service`)
        },
        $body <: contains or {
          `export const module = $value`,
          `export const module: $type = $value`
        } where {
          require_service_orpc_composition_is_matching_module_initializer(value=$value, branch_pattern=$branch_pattern)
        }
      }
    },
    and {
      require_service_orpc_composition_is_governed_service_source(),
      ! $filename <: r".*services/[^/]+/src/service/base\.ts$",
      $body <: contains import_statement(source=$source) as $import where {
        $source <: r"^[\"']effect-orpc[\"']$",
        require_service_orpc_composition_imports_runtime_binding(import=$import, anchor=`implementEffect`)
      }
    },
    and {
      require_service_orpc_composition_is_governed_service_source(),
      ! $filename <: r".*plugins/server/api/[^/]+/src/service/impl\.ts$",
      $body <: contains import_statement(source=$source) as $import where {
        $source <: r"^[\"']@orpc/server[\"']$",
        require_service_orpc_composition_imports_runtime_binding(import=$import, anchor=`implement`)
      }
    },
    and {
      $filename <: r".*services/[^/]+/src/service/base\.ts$",
      $body <: contains or {
        `const $name = implementEffect($args)`,
        `const $name: $type = implementEffect($args)`
      } where {
        not { $name <: `base` }
      }
    },
    and {
      $filename <: r".*plugins/server/api/[^/]+/src/service/impl\.ts$",
      $body <: contains or {
        `const $name = implement(contract).$context_method<$context_type>()`,
        `const $name: $type = implement(contract).$context_method<$context_type>()`
      } where {
        $context_method <: r"^\$context$",
        not { $name <: `service` }
      }
    },
    and {
      require_service_orpc_composition_is_root_service_router_source(),
      or {
        $body <: contains import_statement(source=$source) as $import where {
          require_service_orpc_composition_has_runtime_import_binding(import=$import),
          not {
            require_service_orpc_composition_is_completed_module_router_import(import=$import, source=$source)
          }
        },
        $body <: contains or {
          `$receiver.effect($handler)`,
          `$receiver.handler($handler)`,
          `$receiver.use($middleware, $...)`,
          `$receiver.use<$types>($middleware, $...)`,
          `$receiver.router($branches)`
        }
      }
    },
    and {
      require_service_orpc_composition_is_root_service_router_source(),
      not {
        require_service_orpc_composition_has_root_contract_check(body=$body)
      }
    },
    and {
      require_service_orpc_composition_is_root_service_router_source(),
      $body <: some $statement where {
        not {
          require_service_orpc_composition_is_allowed_root_router_statement(
            statement=$statement
          )
        }
      }
    },
    and {
      require_service_orpc_composition_is_governed_service_source(),
      $body <: contains import_statement(source=$source) as $import where {
        $source <: r"^[\"'](?:effect-orpc|@orpc/contract|@orpc/server)[\"']$",
        $import <: `import * as $namespace from $source`,
        not { $import <: import_statement(type=type()) }
      }
    }
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

## Matches a prefix-colliding module branch

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { service } from "../../impl";
export const module = service.catalogAdmin.use(provider);
```

## Matches a runtime composition namespace

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
import * as orpc from "@orpc/server";
export const router = orpc.router({});
```

## Matches a root router without the direct contract check

```typescript
// @filename: services/jobs/src/service/router.ts
import { router as catalog } from "./modules/catalog/router";
export const router = { catalog };
```

## Matches a root router with host context in the topology check

```typescript
// @filename: services/jobs/src/service/router.ts
import type { Router } from "@orpc/server";
import type { contract } from "./contract";
import { router as catalog } from "./modules/catalog/router";
export const router = { catalog } satisfies Router<typeof contract, Context>;
```

## Ignores an exact kebab-to-camel module branch

```typescript
// @filename: services/jobs/src/service/modules/corpus-artifacts/module.ts
import { service } from "../../impl";
export const module = service.corpusArtifacts.use(provider);
```

## Ignores completed root router composition and native middleware depths

```typescript
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "./modules/catalog/contract";
export const contract: Contract = { catalog } satisfies Contract;
// @filename: services/jobs/src/service/router.ts
import type { Router } from "@orpc/server";
import type { contract } from "./contract";
import { router as catalog } from "./modules/catalog/router";
export const router = { catalog } satisfies Router<typeof contract, never>;
// @filename: services/jobs/src/service/impl.ts
import { base } from "./base";
export const service = base.use(one).use(two).use(three);
// @filename: plugins/server/api/pipeline/src/service/impl.ts
import { implement } from "@orpc/server";
import { contract } from "./contract";
export const service = implement(contract)
  .$context<Context>()
  .use(one)
  .use(two);
// @filename: services/jobs/src/service/modules/job-search/module.ts
import { service } from "#jobs-service/impl";
export const module = service.jobSearch.use(one).use(two).use(three);
// @filename: services/jobs/src/service/modules/job-search/router/find.router.ts
import { module } from "../module";
export const find = module.find.use(one).use(two).effect(handler);
```

## Ignores context-seeded standalone base and combined named imports

```typescript
// @filename: services/jobs/src/service/base.ts
import { implementEffect, type EffectHandler } from "effect-orpc";
import { contract } from "./contract";
export const base = implementEffect(contract, Layer.empty).$context<InitialContext>();
// @filename: services/jobs/src/service/impl.ts
import { base, type InitialContext } from "./base";
export const service = base.use(provideContext);
// @filename: services/jobs/src/service/modules/job-search/module.ts
import { service } from "#jobs-service/impl";
export const module = service.jobSearch.use(provideContext);
// @filename: plugins/server/api/catalog/src/service/impl.ts
import { implement, type Middleware } from "@orpc/server";
import { contract } from "./contract";
export const service = implement(contract).$context<Context>().use(authentication);
```
