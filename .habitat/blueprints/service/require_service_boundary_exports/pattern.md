---
level: error
tags: [orpc, service, positive, boundary]
---
# Require Service Boundary Exports

Every existing service spine file directly exports one standalone const for its
generic boundary role: `contract`, `module`, or `router`. Product qualification
belongs at the import site. Service definition and implementation construction
keep the names required by their native APIs rather than acquiring a second
generic alias or hiding a boundary inside a multi-declarator statement.

This law proves only boundary-export presence. Other declarations and exports
are outside its scope; Knip and the intentional-export and JSDoc laws own
whether those exports are used or authorized.

```grit
language js(typescript)

// Accepts a boundary value only when its spine file exports it directly.
predicate service_boundary_exports_direct_const($statements, $boundary) {
  $statements <: some $statement where {
    $statement <: or {
      `export const $boundary = $value`,
      `export const $boundary: $type = $value`
    }
  }
}

// Maps root and module contract files to the generic contract export.
predicate service_boundary_is_contract_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:contract|modules/[^/]+/contract)\.ts$"
}

// Maps module spine files to the generic module export.
predicate service_boundary_is_module_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$"
}

// Maps root and module router files to the generic router export.
predicate service_boundary_is_router_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router|modules/[^/]+/router)\.ts$"
}

or {
  program(statements=$statements) where {
    service_boundary_is_contract_file(),
    not { service_boundary_exports_direct_const(statements=$statements, boundary=`contract`) }
  },
  program(statements=$statements) where {
    service_boundary_is_module_file(),
    not { service_boundary_exports_direct_const(statements=$statements, boundary=`module`) }
  },
  program(statements=$statements) where {
    service_boundary_is_router_file(),
    not { service_boundary_exports_direct_const(statements=$statements, boundary=`router`) }
  }
}
```

## Matches a missing contract boundary

```typescript
// @filename: services/jobs/src/service/contract.ts
export const jobsContract = eoc.router({});
```

## Matches a missing module boundary

```typescript
// @filename: services/jobs/src/service/modules/catalog/module.ts
export const catalog = service.catalog;
```

## Matches a missing router boundary

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
export const catalogRouter = { find: module.find.effect(handler) };
```

## Matches a boundary hidden in a multi-declarator statement

```typescript
// @filename: services/jobs/src/service/contract.ts
export const before = 1, contract = eoc.router({}), after = 2;
```

## Ignores direct standalone boundaries and unrelated declaration forms

```typescript
// @filename: services/jobs/src/service/contract.ts
export const contract = eoc.router({});
export const parenthesized = (contract);
export const asserted = contract as Contract;
export const checked = contract satisfies Contract;
export type FrozenContract = Readonly<typeof contract>;

// @filename: services/jobs/src/service/modules/catalog/module.ts
export const module = service.catalog;
export class CatalogModule {}

// @filename: services/jobs/src/service/modules/catalog/router.ts
export const router: Router = { find: module.find.effect(handler) };
export const PreviewRouter = decorate(preview);
```
