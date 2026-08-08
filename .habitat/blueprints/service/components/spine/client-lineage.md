---
level: error
tags: [service, spine, client, composition, orpc]
---
# Require Service Client Lineage

The public client descends from the service root router through native oRPC
in-process client construction and deliberately projects the aggregate
contract beside it.

```grit
language js(typescript)

predicate service_v1_client_lineage_native($statements, $name, $source) {
  or {
    $statements <: contains `import { $..., $name, $... } from $source`,
    $statements <: contains `import { $..., $imported as $name, $... } from $source`
  }
}

program(statements=$statements) where {
  $filename <: r"(?:^|.*/)src/client\.ts$",
  not {
    $statements <: contains `import { $..., router, $... } from $router_source` where {
      $router_source <: r"^[\"']\./service/router(?:\.js)?[\"']$"
    },
    service_v1_client_lineage_native(statements=$statements, name=$create, source=`"@orpc/server"`),
    or {
      $statements <: contains `export function createClient($args) { return $create(router, $options); }`,
      $statements <: contains `export function createClient($args): $return_type { return $create(router, $options); }`
    },
    or {
      and {
        $statements <: contains `import { $..., contract, $... } from $contract_source` where {
          $contract_source <: r"^[\"']\./service/contract(?:\.js)?[\"']$"
        },
        $statements <: contains `export { $..., contract, $... }`
      },
      $statements <: contains `export { $..., contract, $... } from $contract_source` where {
        $contract_source <: r"^[\"']\./service/contract(?:\.js)?[\"']$"
      }
    }
  }
}
```

## Canonical

```typescript
export { contract };
export function createClient(options) {
  return createRouterClient(router, options);
}
```

## Rejected

```typescript
export function createClient(options) {
  return createRouterClient(preview, options);
}
```
