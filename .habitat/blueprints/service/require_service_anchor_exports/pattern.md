---
level: error
tags: [orpc, service, positive, anchor]
---
# Require Generic Service Anchor Exports

Every existing service spine file directly exports the generic value for its
role: `base`, `contract`, `service`, `module`, or `router`. Product
qualification belongs at the import site.

This law proves only anchor presence. Other declarations and exports are
outside its scope; Knip and the future intentional-export/JSDoc boundary own
whether those exports are used or authorized.

```grit
language js(typescript)

predicate exports_direct_const($statements, $anchor) {
  $statements <: some $statement where {
    $statement <: or {
      `export const $anchor = $value`,
      `export const $anchor: $type = $value`
    }
  }
}

predicate is_base_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/base\.ts$"
}

predicate is_contract_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:contract|modules/[^/]+/contract)\.ts$"
}

predicate is_service_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$"
}

predicate is_module_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

predicate is_router_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router|modules/[^/]+/router)\.ts$"
}

or {
  program(statements=$statements) where {
    is_base_anchor_file(),
    not { exports_direct_const(statements=$statements, anchor=`base`) }
  },
  program(statements=$statements) where {
    is_contract_anchor_file(),
    not { exports_direct_const(statements=$statements, anchor=`contract`) }
  },
  program(statements=$statements) where {
    is_service_anchor_file(),
    not { exports_direct_const(statements=$statements, anchor=`service`) }
  },
  program(statements=$statements) where {
    is_module_anchor_file(),
    not { exports_direct_const(statements=$statements, anchor=`module`) }
  },
  program(statements=$statements) where {
    is_router_anchor_file(),
    not { exports_direct_const(statements=$statements, anchor=`router`) }
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
export const catalogRouter = { find: module.find.effect(handler) };
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
export const router: Router = { find: module.find.effect(handler) };
export const PreviewRouter = decorate(preview);
```
