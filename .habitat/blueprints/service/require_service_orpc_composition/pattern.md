---
level: error
tags: [orpc, effect, service, composition]
---
# Require Native Service oRPC Composition

Every service has one visible native implementation lineage. `base.ts`
declares context and adds a native middleware author only when needed;
`impl.ts` implements the aggregate contract once and exposes
the unconfigured and configured stages, modules descend from the matching configured
branch, module router indexes compose plain operation trees, and the root
router implements the aggregate contract once through the unconfigured stage.

Aggregate router implementation through the unconfigured root `impl` is the
pinned oRPC 2 once-only seam. This packet does not
model oRPC types or runtime behavior; TypeScript and behavior proof own those
facts.

```grit
language js(typescript)

// Checks that a module initializer descends from its matching configured branch.
function require_service_orpc_composition_module_status($filename, $value) js {
  const match = $filename.text.match(/\/modules\/([^/]+)\/module\.ts$/);
  if (!match) return "not-module-spine";
  const expected = match[1].replace(/-([a-z0-9])/g, (_all, value) => value.toUpperCase());
  const descent = $value.text.match(/\bservice\.([A-Za-z_$][\w$]*)/);
  if (!descent) return "missing-descent";
  return expected === descent[1] ? "ok" : "wrong-branch";
}

// Recognizes a configured service whose arbitrary native use chain starts at impl.
function require_service_orpc_composition_service_chain_status($value) js {
  const source = $value.text.replace(/\s+/g, "");
  return source === "impl" || source.startsWith("impl.use(") ? "ok" : "wrong-root";
}

// Identifies calls whose receiver remains rooted in the local impl lineage.
function require_service_orpc_composition_impl_receiver_status($receiver) js {
  const source = $receiver.text.replace(/\s+/g, "");
  return /^(?:impl)(?:\.|$)/.test(source) ? "ok" : "other-root";
}

// Identifies router-capable configured stages without confusing contract routers.
function require_service_orpc_composition_router_owner_status($receiver) js {
  const source = $receiver.text.replace(/\s+/g, "");
  return /^(?:impl|service|module)(?:\.|$)/.test(source)
    ? "ok"
    : "other-root";
}

// Selects every governed production service source file.
predicate require_service_orpc_composition_is_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$"
}

// Selects the declaration-only root base.
predicate require_service_orpc_composition_is_base() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/base\.ts$"
}

// Selects the sole contract implementation spine.
predicate require_service_orpc_composition_is_impl() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$"
}

// Selects module wiring spines.
predicate require_service_orpc_composition_is_module() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Selects module router composition spines.
predicate require_service_orpc_composition_is_module_router() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/index\.ts$"
}

// Selects the root router composition spine.
predicate require_service_orpc_composition_is_root_router() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$"
}

// Proves that the implementation spine contains exactly one contract implementation.
predicate require_service_orpc_composition_has_single_implement($body) {
  $calls = [],
  $body <: contains bubble($calls) `implement($contract)` as $call where {
    $calls += $call
  },
  $count = length(target=$calls),
  $count <: 1
}

// Proves that the root router contains exactly one aggregate impl.router call.
predicate require_service_orpc_composition_has_single_root_router($body) {
  $calls = [],
  $body <: contains bubble($calls) `impl.router($surface)` as $call where {
    $calls += $call
  },
  $count = length(target=$calls),
  $count <: 1
}

// Recognizes one unconfigured implementer and an arbitrary native use chain.
predicate require_service_orpc_composition_has_implementation($body) {
  require_service_orpc_composition_has_single_implement(body=$body),
  $body <: contains `export const impl = implement(contract).$context<Context>()`,
  $body <: contains `export const service = $value` where {
    $status = require_service_orpc_composition_service_chain_status(value=$value),
    $status <: includes "ok"
  }
}

or {
  `implement($contract)` where {
    require_service_orpc_composition_is_source(),
    not { require_service_orpc_composition_is_impl() }
  },
  import_statement(source=$source) where {
    require_service_orpc_composition_is_base(),
    $source <: r"^[\"']@orpc/experimental-effect/extensions/effect[\"']$"
  },
  import_statement(source=$source) where {
    require_service_orpc_composition_is_base(),
    $source <: r"^[\"'](?:\./contract|#[^/]+-(?:service|api)/contract)[\"']$"
  },
  program(statements=$body) where {
    require_service_orpc_composition_is_impl(),
    not { require_service_orpc_composition_has_implementation(body=$body) }
  },
  `$receiver.$method($arguments)` where {
    require_service_orpc_composition_is_impl(),
    $status = require_service_orpc_composition_impl_receiver_status(
      receiver=$receiver
    ),
    $status <: includes "ok",
    not { $method <: `use` }
  },
  program(statements=$body) where {
    require_service_orpc_composition_is_module(),
    not {
      $body <: contains `export const module = $value` where {
        $status = require_service_orpc_composition_module_status(
          filename=$filename,
          value=$value
        ),
        $status <: includes "ok"
      }
    }
  },
  program(statements=$body) where {
    require_service_orpc_composition_is_module_router(),
    not { $body <: contains `export const router = { $properties }` }
  },
  `$receiver.router($surface)` where {
    require_service_orpc_composition_is_module_router()
  },
  `$receiver.router($surface)` where {
    require_service_orpc_composition_is_source(),
    not { require_service_orpc_composition_is_root_router() },
    $status = require_service_orpc_composition_router_owner_status(
      receiver=$receiver
    ),
    $status <: includes "ok"
  },
  program(statements=$body) where {
    require_service_orpc_composition_is_root_router(),
    not {
      and {
        $body <: contains `export const router = impl.router($surface)`,
        require_service_orpc_composition_has_single_root_router(body=$body)
      }
    }
  },
  `$receiver.router($surface)` where {
    require_service_orpc_composition_is_root_router(),
    not { $receiver <: `impl` }
  }
}
```

## Matches implementation from the declaration base

```typescript
// @filename: services/jobs/src/service/base.ts
import { implement } from "@orpc/server";
import { contract } from "./contract";
export const base = implement(contract);
```

## Matches a disconnected implementation stage

```typescript
// @filename: services/jobs/src/service/impl.ts
import { implement } from "@orpc/server";
import { contract } from "./contract";
export const service = implement(contract);
```

## Matches configured router implementation hidden in the service stage

```typescript
// @filename: services/jobs/src/service/impl.ts
export const impl = implement(contract).$context<Context>();
export const service = impl.use(admitActor).router({ catalog });
```

## Matches a second implementation call

```typescript
// @filename: services/jobs/src/service/impl.ts
import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
export const impl = implement(contract).$context<Context>();
const preview = implement(contract).$context<Context>();
export const service = impl.use(admitActor);
```

## Matches the Effect extension in base

```typescript
// @filename: services/jobs/src/service/base.ts
import "@orpc/experimental-effect/extensions/effect";
import { os } from "@orpc/server";
export const base = os.$context<Context>();
```

## Matches a module descending through the wrong branch

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.queue.use(provideCatalog);
```

## Matches module-level router implementation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
export const router = impl.catalog.router({ get });
```

## Matches a second private root router implementation

```typescript
// @filename: services/jobs/src/service/router.ts
export const router = impl.router({ catalog });
const preview = impl.router({ catalog });
```

## Ignores one complete native lineage

```typescript
// @filename: services/jobs/src/service/base.ts
import { os } from "@orpc/server";
export type Context = ServiceContext;
export const base = os.$context<Context>();
// @filename: services/jobs/src/service/impl.ts
import "@orpc/experimental-effect/extensions/effect";
import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
export const impl = implement(contract).$context<Context>();
export const service = impl
  .use(admitActor)
  .use(provideClock)
  .use(provideDatabase);
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog.use(provideCatalog).use(curateCatalog);
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
export const router = { get };
// @filename: services/jobs/src/service/router.ts
export const router = impl.router({ catalog });
```

## Ignores a context-only base without middleware authorship

```typescript
// @filename: services/discovery/src/service/base.ts
export type Context = DiscoveryContext;
```
