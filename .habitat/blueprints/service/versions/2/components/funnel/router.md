---
level: error
tags: [service, funnel, router, composition]
---
# Require Service Router Composition

Authored operations ascend through the module-root router into the service
root router. Each join is local and preserves the module as the sole router
composition face.

```grit
language js(typescript)

// Admits procedure-local native handlers without accepting detached callables.
predicate service_v2_router_composition_native_handler($statements) {
  or {
    $statements <: contains `export const $operation = module.$operation.handler($handler)`,
    and {
      $statements <: contains `const $local = module.$operation.handler($handler)`,
      $statements <: contains `export { $..., $local as $operation, $... }`
    }
  },
  $handler <: or {
    arrow_function(),
    `function ($args) { $body }`,
    `async function ($args) { $body }`,
    `function $name($args) { $body }`,
    `async function $name($args) { $body }`
  }
}

// Admits an inline Effect generator through the official implementer extension.
// TypeScript module augmentation proves that the extension bootstrap is present;
// the source boundary confines that bootstrap to src/service/impl.ts.
predicate service_v2_router_composition_effect_handler($statements) {
  or {
    $statements <: contains `export const $operation = module.$operation.effect($handler)`,
    and {
      $statements <: contains `const $local = module.$operation.effect($handler)`,
      $statements <: contains `export { $..., $local as $operation, $... }`
    }
  },
  $handler <: `function* ($args) { $body }`
}

or {
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/modules/[^/]+/router\.ts$",
    not {
      or {
        and {
          $statements <: contains `import { $..., $leaf, $... } from $leaf_source` where {
            $leaf_source <: r"^[\"']\./router/[^/]+(?:\.js)?[\"']$"
          },
          $statements <: contains `export const router = { $..., $leaf, $... }`
        },
        and {
          $statements <: contains `import { $..., $imported as $leaf, $... } from $leaf_source` where {
            $leaf_source <: r"^[\"']\./router/[^/]+(?:\.js)?[\"']$"
          },
          $statements <: contains `export const router = { $..., $key: $leaf, $... }`
        }
      }
    }
  },
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/modules/[^/]+/router/[^/]+\.ts$",
    not {
      $statements <: contains `import { $..., module, $... } from $module_source` where {
        $module_source <: r"^[\"']\.\./module(?:\.js)?[\"']$"
      },
      or {
        service_v2_router_composition_native_handler(statements=$statements),
        service_v2_router_composition_effect_handler(statements=$statements)
      }
    }
  },
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/router\.ts$",
    not {
      $statements <: contains `import { $..., impl, $... } from $impl_source` where {
        $impl_source <: r"^[\"']\./impl(?:\.js)?[\"']$"
      },
      $statements <: contains `import { $..., router as $module, $... } from $module_source` where {
        $module_source <: r"^[\"']\./modules/[^/]+/router(?:\.js)?[\"']$"
      },
      $statements <: contains `export const router = impl.router($routes)` where {
        $routes <: contains `$module`
      }
    }
  }
}
```

## Canonical

```typescript
// src/service/impl.ts
import "@orpc/experimental-effect/extensions/effect";

// src/service/modules/inventory/router/read.ts
export const count = module.count.handler(({ input }) => input.values.length);
export const read = module.read.effect(function* ({ context }) {
  return yield* context.inventory;
});
export const router = { read };
```

## Rejected

```typescript
const readHandler = function* () {
  return "ready";
};
export const read = module.read.effect(readHandler);
```
