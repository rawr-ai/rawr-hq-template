---
level: error
tags: [service, contract, composition, orpc]
---
# Require Service Contract Composition

Operation contracts compose through the module contract index into the
service aggregate contract. The aggregate retains native oRPC contract
identity. This law asserts adjacent composition only; TypeScript owns contract
inference and assignability.

```grit
language js(typescript)

function service_v1_contract_composition_status($operation, $binding) js {
  const operation = $operation.text.replace(/\s+/g, "");
  return operation.startsWith($binding.text + ".") ? "ok" : "wrong-root";
}

predicate service_v1_contract_composition_native($statements, $operation) {
  or {
    and {
      $statements <: contains `import { $..., oc, $... } from "@orpc/contract"`,
      $status = service_v1_contract_composition_status(operation=$operation, binding=`oc`),
      $status <: includes "ok"
    },
    and {
      $statements <: contains `import { $..., oc as $binding, $... } from "@orpc/contract"`,
      $status = service_v1_contract_composition_status(operation=$operation, binding=$binding),
      $status <: includes "ok"
    }
  }
}

predicate service_v1_contract_composition_projects($surface, $binding) {
  $surface <: object(),
  $surface <: contains or {
    shorthand_property_identifier() as $binding,
    `$key: $binding`,
    `...$binding`
  }
}

predicate service_v1_contract_composition_routes($statements, $routes, $module) {
  or {
    service_v1_contract_composition_projects(surface=$routes, binding=$module),
    and {
      $routes <: identifier(),
      or {
        $statements <: contains `const $routes = $surface`,
        $statements <: contains `const $routes: $type = $surface`
      },
      service_v1_contract_composition_projects(surface=$surface, binding=$module)
    }
  }
}

or {
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/contract\.ts$",
    not {
      $statements <: contains `import { $..., contract as $module, $... } from $module_source` where {
        $module_source <: r"^[\"']\./modules/[^/]+/contract(?:/index)?(?:\.js)?[\"']$"
      },
      or {
        $statements <: contains `export const contract = $operation`,
        $statements <: contains `export const contract: $type = $operation`
      },
      service_v1_contract_composition_native(statements=$statements, operation=$operation),
      $operation <: contains `$builder.router($routes)` where {
        service_v1_contract_composition_routes(statements=$statements, routes=$routes, module=$module)
      }
    }
  },
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/service/modules/[^/]+/contract/index\.ts$",
    not {
      or {
        and {
          $statements <: contains `import { $..., $leaf, $... } from $leaf_source` where {
            $leaf_source <: r"^[\"']\./[^/]+(?:\.js)?[\"']$"
          },
          or {
            $statements <: contains `export const contract = $surface`,
            $statements <: contains `export const contract: $type = $surface`
          },
          service_v1_contract_composition_projects(surface=$surface, binding=$leaf)
        },
        and {
          $statements <: contains `import { $..., $imported as $leaf, $... } from $leaf_source` where {
            $leaf_source <: r"^[\"']\./[^/]+(?:\.js)?[\"']$"
          },
          or {
            $statements <: contains `export const contract = $surface`,
            $statements <: contains `export const contract: $type = $surface`
          },
          service_v1_contract_composition_projects(surface=$surface, binding=$leaf)
        }
      }
    }
  }
}
```

## Canonical

```typescript
import { contract as records } from "./modules/records/contract";
export const contract = oc.router({ records });
```

## Rejected

```typescript
export const contract = oc.router({ preview });
```
