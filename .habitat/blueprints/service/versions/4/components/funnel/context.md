---
level: error
tags: [service, funnel, context, composition]
---
# Require Service Context Funnel

Base always declares the five raw lifetime lanes. A service that authors root
middleware may also export the native `os.$context<Context>()` base; a service
without that author needs no value or native import in this file. Implementation
retains its direct native contract lineage, named root middleware descends from
the optional base, and each module terminally curates its matching service
branch. Operation handlers cannot reach back into a raw lifetime lane.

```grit
language js(typescript)

function service_v4_context_funnel_branch_status($filename, $branch) js {
  const match = $filename.text.replace(/\\/g, "/").match(/\/modules\/([^/]+)\/module\.ts$/);
  if (!match) return "wrong-file";
  const expected = match[1].replace(/-([a-z0-9])/g, (_all, value) => value.toUpperCase());
  return $branch.text === expected ? "ok" : "wrong-branch";
}

function service_v4_context_funnel_service_status($service) js {
  const service = $service.text.replace(/\s+/g, "");
  return service === "impl" || /^impl(?:\.use\([A-Za-z_$][\w$]*\))+$/.test(service) ? "ok" : "wrong-root";
}

predicate service_v4_context_funnel_raw($name) {
  $name <: r"^(?:deps|scope|config|invocation|provided)$"
}

predicate service_v4_context_funnel_shape($statements) {
  $statements <: contains or {
    `export type Context = {
      readonly deps: $deps;
      readonly scope: $scope;
      readonly config: $config;
      readonly invocation: $invocation;
      readonly provided: $provided;
    }`,
    `export type Context = {
      deps: $deps;
      scope: $scope;
      config: $config;
      invocation: $invocation;
      provided: $provided;
    }`
  }
}

predicate service_v4_context_funnel_native($statements, $name, $source) {
  or {
    $statements <: contains `import { $..., $name, $... } from $source`,
    $statements <: contains `import { $..., $imported as $name, $... } from $source`
  }
}

predicate service_v4_context_funnel_has_base($statements) {
  $statements <: contains or {
    `export const base = $value`,
    `export let base = $value`,
    `export var base = $value`,
    `export function base($...) { $... }`,
    `export class base { $... }`,
    `export { $..., base, $... }`,
    `export { $..., $local as base, $... }`,
    `export { $..., base, $... } from $source`,
    `export { $..., $local as base, $... } from $source`,
    `export * as base from $source`
  }
}

predicate service_v4_context_funnel_base($statements) {
  or {
    $statements <: contains `export const base = os.$context<Context>()` where {
      $statements <: contains `import { $..., os, $... } from "@orpc/server"`
    },
    $statements <: contains `export const base = $orpc.$context<Context>()` where {
      $statements <: contains `import { $..., os as $orpc, $... } from "@orpc/server"`
    }
  }
}

or {
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/base\.ts$",
    not {
      service_v4_context_funnel_shape(statements=$statements),
      or {
        not { service_v4_context_funnel_has_base(statements=$statements) },
        service_v4_context_funnel_base(statements=$statements)
      }
    }
  },
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/impl\.ts$",
    not {
      $statements <: contains `import { $..., contract, $... } from $contract_source` where {
        $contract_source <: r"^[\"']\./contract(?:\.js)?[\"']$"
      },
      service_v4_context_funnel_native(statements=$statements, name=$implement, source=`"@orpc/server"`),
      $statements <: contains `export const impl = $implement(contract).$context<Context>()`,
      $statements <: contains `export const service = $service`,
      $service_status = service_v4_context_funnel_service_status(service=$service),
      $service_status <: includes "ok"
    }
  },
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/middleware/[^/]+\.ts$",
    not {
      $statements <: contains `import { $..., base, $... } from $base_source` where {
        $base_source <: r"^[\"']\.\./base(?:\.js)?[\"']$"
      },
      $statements <: contains `export const middleware = base.middleware($callback)`
    }
  },
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/modules/[^/]+/module\.ts$",
    not {
      $statements <: contains `import { $..., service, $... } from $service_source` where {
        $service_source <: r"^[\"']\.\./\.\./impl(?:\.js)?[\"']$"
      },
      $statements <: contains or {
        `export const module = service.$branch.use($callback)`,
        `export const module = service.$branch.use($policy).use($callback)`
      } where {
        $status = service_v4_context_funnel_branch_status(filename=$filename, branch=$branch),
        $status <: includes "ok",
        $callback <: contains `next({ $..., context: { $property, $... }, $... })` where {
          $property <: or { pair(), shorthand_property_identifier(), spread_element() }
        }
      }
    }
  },
  `context.$name` where {
    $filename <: r"(?:^|.*/)src/service/modules/[^/]+/router/[^/]+\.ts$",
    service_v4_context_funnel_raw(name=$name)
  }
}
```

## Canonical

```typescript
export const module = service.records.use(async ({ context, next }) =>
  next({ context: { records: context.deps.records } })
);
```

## Rejected

```typescript
export const read = module.read.handler(({ context }) => context.deps.records.read());
```
