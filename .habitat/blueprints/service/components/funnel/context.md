---
level: error
tags: [service, funnel, context, composition]
---
# Require Service Context Funnel

Base declares the five raw lifetime lanes. Implementation and named service
middleware descend from that base, then each module selects its matching
service branch and terminally curates a nonempty request vocabulary. Operation
handlers cannot reach back into a raw lifetime lane.

```grit
language js(typescript)

function service_v1_context_funnel_branch_status($filename, $branch) js {
  const match = $filename.text.replace(/\\/g, "/").match(/\/modules\/([^/]+)\/module\.ts$/);
  if (!match) return "wrong-file";
  const expected = match[1].replace(/-([a-z0-9])/g, (_all, value) => value.toUpperCase());
  return $branch.text === expected ? "ok" : "wrong-branch";
}

function service_v1_context_funnel_service_status($service) js {
  const service = $service.text.replace(/\s+/g, "");
  return service === "impl" || /^impl(?:\.use\([A-Za-z_$][\w$]*\))+$/.test(service) ? "ok" : "wrong-root";
}

predicate service_v1_context_funnel_raw($name) {
  $name <: r"^(?:deps|scope|config|invocation|provided)$"
}

predicate service_v1_context_funnel_shape($statements) {
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

predicate service_v1_context_funnel_native($statements, $name, $source) {
  or {
    $statements <: contains `import { $..., $name, $... } from $source`,
    $statements <: contains `import { $..., $imported as $name, $... } from $source`
  }
}

or {
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/base\.ts$",
    not {
      service_v1_context_funnel_shape(statements=$statements),
      service_v1_context_funnel_native(statements=$statements, name=$orpc, source=`"@orpc/server"`),
      $statements <: contains `export const base = $orpc.$context<Context>()`
    }
  },
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/impl\.ts$",
    not {
      $statements <: contains `import { $..., contract, $... } from $contract_source` where {
        $contract_source <: r"^[\"']\./contract(?:\.js)?[\"']$"
      },
      service_v1_context_funnel_native(statements=$statements, name=$implement, source=`"@orpc/server"`),
      $statements <: contains `export const impl = $implement(contract).$context<Context>()`,
      $statements <: contains `export const service = $service`,
      $service_status = service_v1_context_funnel_service_status(service=$service),
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
        $status = service_v1_context_funnel_branch_status(filename=$filename, branch=$branch),
        $status <: includes "ok",
        $callback <: contains `next({ $..., context: { $property, $... }, $... })` where {
          $property <: or { pair(), shorthand_property_identifier(), spread_element() }
        }
      }
    }
  },
  `context.$name` where {
    $filename <: r"(?:^|.*/)src/service/modules/[^/]+/router/[^/]+\.ts$",
    service_v1_context_funnel_raw(name=$name)
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
