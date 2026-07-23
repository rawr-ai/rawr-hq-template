---
level: error
tags: [orpc, service, positive, composition]
---
# Require Service oRPC Composition

A standalone service root exports `impl` from either the local
`createServiceImplementer` or native Effect-oRPC `implementEffect`. A direct
Effect-oRPC root establishes context immediately after construction and before
middleware. An embedded API service imports native oRPC `implement`, applies
it directly to the local contract, establishes root context, and exports
`service`.

Each `module.ts` imports that root implementer and directly exports a module
whose initializer begins at one of its branches. A branch may be nested.
Top-level operation bindings whose `.handler()` or `.effect()` terminal is
rooted directly in the imported module, or in one local binding derived from
that module, belong only in the module's single `router.ts`. TypeScript and
review own deeper lexical and dataflow cases.

```grit
language js(typescript)

// Proves a standalone initializer begins at the canonical local constructor.
function service_composition_starts_with_standalone_root($value) js {
  const value = $value.text.replace(/\s+/g, "");
  return value.startsWith("createServiceImplementer(contract,") ||
    value.startsWith("createServiceImplementer(contract)")
    ? "yes"
    : "no";
}

// Proves an embedded API initializer begins at native implement plus root context.
function service_composition_starts_with_api_root($value) js {
  const value = $value.text.replace(/\s+/g, "");
  return value.startsWith("implement(contract).$context<") ? "yes" : "no";
}

// Proves a direct module initializer begins at the imported root implementer.
function service_composition_starts_with_implementer($value, $implementer) js {
  const value = $value.text.replace(/\s+/g, "");
  const implementer = $implementer.text.replace(/\s+/g, "");
  return value.startsWith(`${implementer}.`) ? "yes" : "no";
}

// Proves an executable terminal's receiver is rooted in an imported module.
function service_composition_receiver_is_module_owned($receiver, $module) js {
  const receiver = $receiver.text.replace(/\s+/g, "");
  const module = $module.text.replace(/\s+/g, "");
  return receiver === module || receiver.startsWith(`${module}.`) ? "yes" : "no";
}

// Proves a local binding remains rooted in the imported module implementer.
function service_composition_value_is_module_owned($value, $module) js {
  const value = $value.text.replace(/\s+/g, "");
  const module = $module.text.replace(/\s+/g, "");
  return value === module || value.startsWith(`${module}.`) ? "yes" : "no";
}

// Identifies the canonical standalone root export imported by a module.
function service_composition_import_is_impl($imported) js {
  return $imported.text.trim() === "impl" ? "yes" : "no";
}

// Identifies the canonical embedded-API root export imported by a module.
function service_composition_import_is_service($imported) js {
  return $imported.text.trim() === "service" ? "yes" : "no";
}

// Identifies the canonical module export imported by an operation source.
function service_composition_import_is_module($imported) js {
  return $imported.text.trim() === "module" ? "yes" : "no";
}

// Restricts a visible first-hop claim to a member or call expression.
predicate service_composition_is_chain_expression($value) {
  or {
    $value <: call_expression(),
    $value <: member_expression()
  }
}

// Recognizes context established directly on native Effect-oRPC construction.
predicate service_composition_is_direct_effect_root($value) {
  $value <: contains or {
    `$receiver.$method($...)`,
    `$receiver.$method<$types>($...)`
  } where {
    $method <: r"^\$context$",
    $receiver <: `implementEffect(contract, $runtime)`
  }
}

// Recognizes the standard standalone root implementation relation.
predicate service_composition_has_standalone_root($body) {
  or {
    and {
      $body <: contains `import { createServiceImplementer } from "./base"`,
      $body <: contains `import { contract } from "./contract"`,
      $body <: contains or {
        `export const impl = $value`,
        `export const impl: $type = $value`
      } where {
        service_composition_is_chain_expression(value=$value),
        $status = service_composition_starts_with_standalone_root(value=$value),
        $status <: r"^yes$"
      }
    },
    and {
      $body <: contains `import { implementEffect } from "effect-orpc"`,
      $body <: contains `import { contract } from "./contract"`,
      $body <: contains or {
        `export const impl = $value`,
        `export const impl: $type = $value`
      } where {
        service_composition_is_chain_expression(value=$value),
        service_composition_is_direct_effect_root(value=$value)
      }
    }
  }
}

// Recognizes the native embedded-API root implementation relation.
predicate service_composition_has_api_root($body) {
  $body <: contains `import { implement } from "@orpc/server"`,
  $body <: contains `import { contract } from "./contract"`,
  $body <: contains or {
    `export const service = $value`,
    `export const service: $type = $value`
  } where {
    service_composition_is_chain_expression(value=$value),
    $status = service_composition_starts_with_api_root(value=$value),
    $status <: r"^yes$"
  }
}

// Relates the canonical standalone root implementer to its module branch.
predicate service_composition_exports_standalone_module($body) {
  $body <: contains import_statement(source=$source) where {
    $source <: r"^[\"']\.\./\.\./impl[\"']$",
    or {
      $body <: contains `import { $..., $implementer, $... } from $source` where {
        $importStatus = service_composition_import_is_impl(imported=$implementer),
        $importStatus <: r"^yes$"
      },
      $body <: contains `import { $..., $imported as $implementer, $... } from $source` where {
        $importStatus = service_composition_import_is_impl(imported=$imported),
        $importStatus <: r"^yes$"
      }
    },
    $body <: contains or {
      `export const module = $value`,
      `export const module: $type = $value`
    } where {
      service_composition_is_chain_expression(value=$value),
      $status = service_composition_starts_with_implementer(
        value=$value,
        implementer=$implementer
      ),
      $status <: r"^yes$",
      not {
        $value <: or {
          `$receiver.handler($...)`,
          `$receiver.handler<$types>($...)`,
          `$receiver.effect($...)`,
          `$receiver.effect<$types>($...)`
        }
      }
    }
  }
}

// Relates the canonical embedded-API root implementer to its module branch.
predicate service_composition_exports_api_module($body) {
  $body <: contains import_statement(source=$source) where {
    $source <: r"^[\"']\.\./\.\./impl[\"']$",
    or {
      $body <: contains `import { $..., $implementer, $... } from $source` where {
        $importStatus = service_composition_import_is_service(imported=$implementer),
        $importStatus <: r"^yes$"
      },
      $body <: contains `import { $..., $imported as $implementer, $... } from $source` where {
        $importStatus = service_composition_import_is_service(imported=$imported),
        $importStatus <: r"^yes$"
      }
    },
    $body <: contains or {
      `export const module = $value`,
      `export const module: $type = $value`
    } where {
      service_composition_is_chain_expression(value=$value),
      $status = service_composition_starts_with_implementer(
        value=$value,
        implementer=$implementer
      ),
      $status <: r"^yes$",
      not {
        $value <: or {
          `$receiver.handler($...)`,
          `$receiver.handler<$types>($...)`,
          `$receiver.effect($...)`,
          `$receiver.effect<$types>($...)`
        }
      }
    }
  }
}

// Relates an operation terminal to the module binding imported by its source.
predicate service_composition_terminal_has_module_owner($receiver) {
  $program <: contains import_statement(source=$source) where {
    $source <: r"^[\"'](?:\./|(?:\.\./)+)module[\"']$",
    or {
      $program <: contains `import { $..., $module, $... } from $source` where {
        $importStatus = service_composition_import_is_module(imported=$module),
        $importStatus <: r"^yes$"
      },
      $program <: contains `import { $..., $imported as $module, $... } from $source` where {
        $importStatus = service_composition_import_is_module(imported=$imported),
        $importStatus <: r"^yes$"
      }
    },
    or {
      and {
        $status = service_composition_receiver_is_module_owned(
          receiver=$receiver,
          module=$module
        ),
        $status <: r"^yes$"
      },
      $program <: contains or {
        `const $binding = $value`,
        `const $binding: $type = $value`
      } where {
        $origin = service_composition_value_is_module_owned(
          value=$value,
          module=$module
        ),
        $origin <: r"^yes$",
        $receiverStatus = service_composition_receiver_is_module_owned(
          receiver=$receiver,
          module=$binding
        ),
        $receiverStatus <: r"^yes$"
      }
    }
  }
}

// Detects a top-level operation binding rooted in the module implementer.
predicate service_composition_has_off_router_terminal($statements) {
  $statements <: some $statement where {
    $statement <: or {
      `const $operation = $value`,
      `const $operation: $type = $value`,
      `export const $operation = $value`,
      `export const $operation: $type = $value`
    },
    $value <: contains or {
      `$receiver.handler($...)`,
      `$receiver.handler<$types>($...)`,
      `$receiver.effect($...)`,
      `$receiver.effect<$types>($...)`
    } where {
      service_composition_terminal_has_module_owner(receiver=$receiver)
    }
  }
}

or {
  program(statements=$body) where {
    $filename <: r".*services/[^/]+/src/service/impl\.ts$",
    not { service_composition_has_standalone_root(body=$body) }
  },
  program(statements=$body) where {
    $filename <: r".*plugins/server/api/[^/]+/src/service/impl\.ts$",
    not { service_composition_has_api_root(body=$body) }
  },
  program(statements=$body) where {
    $filename <: r".*services/[^/]+/src/service/modules/[^/]+/module\.ts$",
    not { service_composition_exports_standalone_module(body=$body) }
  },
  program(statements=$body) where {
    $filename <: r".*plugins/server/api/[^/]+/src/service/modules/[^/]+/module\.ts$",
    not { service_composition_exports_api_module(body=$body) }
  },
  program(statements=$statements) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
    ! $filename <: r".*/src/service/modules/[^/]+/router\.ts$",
    service_composition_has_off_router_terminal(statements=$statements)
  }
}
```

## Matches a disconnected standalone root

```typescript
// @filename: services/jobs/src/service/impl.ts
import { createServiceImplementer } from "./base";
import { contract } from "./contract";
const configured = createServiceImplementer(contract, middleware);
export const impl = configured;
```

## Matches a disconnected direct Effect-oRPC root

```typescript
// @filename: services/jobs/src/service/impl.ts
import { Layer } from "effect";
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
const runtime = Layer.empty;
const configured = implementEffect(contract, runtime).$context<Context>();
export const impl = configured;
```

## Matches middleware applied before direct Effect-oRPC context

```typescript
// @filename: services/jobs/src/service/impl.ts
import { Layer } from "effect";
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
const runtime = Layer.empty;
export const impl = implementEffect(contract, runtime).use(middleware).$context<Context>();
```

## Matches an intervening direct Effect-oRPC method before context

```typescript
// @filename: services/jobs/src/service/impl.ts
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
export const impl = implementEffect(contract, runtime).other().$context<Context>();
```

## Matches a disconnected module

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
import { impl } from "../../impl";
const catalog = impl.catalog;
export const module = catalog;
```

## Matches an operation terminal outside the module router

```typescript
// @filename: services/jobs/src/service/modules/catalog/middleware.ts
import { module } from "./module";
export const find = module.find.effect(runFind);
```

## Ignores the standard standalone, direct Effect-oRPC, and API roots

```typescript
// @filename: services/jobs/src/service/impl.ts
import { createServiceImplementer } from "./base";
import { contract } from "./contract";
export const impl = createServiceImplementer(contract, middleware);
// @filename: services/tasks/src/service/impl.ts
import { Layer } from "effect";
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
const runtime = Layer.empty;
export const impl = implementEffect(contract, runtime)
  .$context<Context>()
  .use(middleware);
// @filename: plugins/server/api/catalog/src/service/impl.ts
import { implement } from "@orpc/server";
import { contract } from "./contract";
export const service = implement(contract).$context<Context>();
```

## Ignores nested module branches and router operations

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/module.ts
import { service as root } from "../../impl";
export const module: SearchModule = root.catalog.search.use(authentication);
// @filename: plugins/server/api/catalog/src/service/modules/search/router.ts
import { module } from "./module";
export const router = { find: module.find.handler(runFind) };
```
