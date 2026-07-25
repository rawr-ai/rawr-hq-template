---
level: error
tags: [orpc, service, positive, anchor]
---
# Require Generic Service Anchor Exports

Every existing service spine file directly exports the generic value for its
role: standalone services export the exact service implementer anchor `base`;
every service interior exports `contract`, `service`, `module`, or `router`,
and product qualification belongs at the import site. Each module `router.ts`
exports the module's completed local `router`; named `router/*.router.ts` files
export their standalone operation leaves or completed subrouter values under
domain names. Embedded API-plugin `base.ts` remains the required boundary/type
anchor, but it does not export a runtime `base`; its implementation begins at
`impl.ts`.

This law proves only anchor presence. Other declarations and exports are
outside its scope; Knip and the future intentional-export/JSDoc boundary own
whether those exports are used or authorized.

```grit
language js(typescript)

// Accepts a role anchor only when its spine file exports it directly.
predicate require_service_anchor_exports_exports_direct_const($statements, $anchor) {
  $statements <: some $statement where {
    $statement <: or {
      `export const $anchor = $value`,
      `export const $anchor: $type = $value`
    }
  }
}

// Maps only standalone root base files to the generic base anchor.
predicate require_service_anchor_exports_is_base_anchor_file() {
  $filename <: r".*services/[^/]+/src/service/base\.ts$"
}

// Maps root and module contracts to the generic contract anchor.
predicate require_service_anchor_exports_is_contract_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:contract|modules/[^/]+/contract)\.ts$"
}

// Maps root implementations to the generic service anchor.
predicate require_service_anchor_exports_is_service_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$"
}

// Maps module spines to the generic module anchor.
predicate require_service_anchor_exports_is_module_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Maps root and module composition routers to the generic anchor.
predicate require_service_anchor_exports_is_router_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router|modules/[^/]+/router)\.ts$"
}

or {
  program(statements=$statements) where {
    require_service_anchor_exports_is_base_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`base`) }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_contract_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`contract`) }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_service_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`service`) }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_module_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`module`) }
  },
  program(statements=$statements) where {
    require_service_anchor_exports_is_router_anchor_file(),
    not { require_service_anchor_exports_exports_direct_const(statements=$statements, anchor=`router`) }
  }
}
```

## Matches a missing base anchor

```typescript
// @filename: services/jobs/src/service/base.ts
export const runtime = implementEffect(contract, Layer.empty);
```

## Matches a missing contract anchor

```typescript
// @filename: services/jobs/src/service/contract.ts
export const jobsContract = eoc.router({});
```

## Ignores an embedded API-plugin boundary and type anchor

```typescript
// @filename: plugins/server/api/catalog/src/service/base.ts
/** Initial request context supplied by the API host. */
export type InitialContext = { readonly request: Request };
```

## Matches a missing service anchor

```typescript
// @filename: services/jobs/src/service/impl.ts
export const configured = base.use(provider);
```

## Matches a missing module anchor

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const catalog = service.catalog;
```

## Matches a missing router anchor

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { find } from "./router/find.router";
export const catalogRouter = { find };
```

## Ignores direct anchors and unrelated declaration forms

```typescript
// @filename: services/jobs/src/service/base.ts
export const base = implementEffect(contract, Layer.empty);

// @filename: services/jobs/src/service/contract.ts
export const contract = eoc.router({});
export const parenthesized = (contract);
export const asserted = contract as Contract;
export const checked = contract satisfies Contract;
export type FrozenContract = Readonly<typeof contract>;

// @filename: services/jobs/src/service/impl.ts
export const service = base.use(provider);
export const RuntimeImplementer = createRuntimeImplementer();

// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog;
export class CatalogModule {}

// @filename: services/jobs/src/service/modules/catalog/router.ts
import { find } from "./router/find.router";
export const router: Router = {
  find,
};
export const PreviewRouter = decorate(preview);
// @filename: services/jobs/src/service/modules/catalog/router/find.router.ts
export const find = module.find.effect(({ context }) => context.catalog.find());
```
