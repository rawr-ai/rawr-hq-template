---
level: error
tags: [orpc, service, contract, typebox]
---
# Require Service Contract Schemas

Every module contract is a directly exported operation object. Each input and
output crosses the canonical `schema` bridge from `@rawr/hq-sdk`. A contract may
adapt a TypeBox value inline or pass a top-level same-file const whose bare
initializer is that bridge call. TypeScript then proves that the bridged value
is a TypeBox schema; this rule does not duplicate TypeBox's type system or
enumerate competing schema libraries.

Domain schema placement and cross-field semantic validation belong to the
service topology and domain policy rather than this source rule.

This is a bounded source relation for the ordinary declarative contract form.
It does not implement lexical scope resolution for nested function expressions;
TypeScript, lint, and review own that language-level binding proof.

```grit
language js(typescript)

// Scopes the rule to exact module contract files.
predicate service_contract_is_module_contract() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract\.ts$"
}

// Binds the directly exported operation object that owns the module contract.
predicate service_contract_has_direct_object($body, $contract) {
  $body <: contains or {
    `export const contract = $contract`,
    `export const contract: $type = $contract`
  },
  or {
    $contract <: `{ $... }`,
    $contract <: `$object as const` where {
      $object <: `{ $... }`
    },
    $contract <: `$object satisfies $shape` where {
      $object <: `{ $... }`
    }
  }
}

// Relates a bridge call to the canonical named or aliased SDK import.
predicate service_contract_is_schema_call($value) {
  $value <: `$adapter($schema)`,
  or {
    and {
      $adapter <: `schema`,
      $program <: contains `import { $..., schema, $... } from "@rawr/hq-sdk"`
    },
    $program <: contains `import { $..., schema as $adapter, $... } from "@rawr/hq-sdk"`
  }
}

// Admits an identifier only when a top-level contract const adapts it before reuse.
predicate service_contract_is_local_adapted_const($value) {
  $value <: identifier(),
  $program <: program(statements=$statements),
  $statements <: some $statement where {
    $statement <: or {
      `const $value = $adapted`,
      `const $value: $type = $adapted`
    } where {
      service_contract_is_schema_call(value=$adapted)
    }
  }
}

// Unifies the two admitted Standard Schema boundary forms.
predicate service_contract_is_canonical_boundary($value) {
  or {
    service_contract_is_schema_call(value=$value),
    service_contract_is_local_adapted_const(value=$value)
  }
}

or {
  program(statements=$body) where {
    service_contract_is_module_contract(),
    not { service_contract_has_direct_object(body=$body, contract=$contract) }
  },
  program(statements=$body) where {
    service_contract_is_module_contract(),
    service_contract_has_direct_object(body=$body, contract=$contract),
    $contract <: contains `$operation.$direction($value)` where {
      $direction <: r"^(?:input|output)$",
      not { service_contract_is_canonical_boundary(value=$value) }
    }
  }
}
```

## Matches an unadapted boundary

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { Type } from "typebox";
export const contract = { find: base.input(Type.Object({ id: Type.String() })) };
```

## Matches an imported pseudo-adapter

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { adapt } from "./adapter";
import { InputSchema } from "./model/schema";
export const contract = { find: base.input(adapt(InputSchema)) };
```

## Ignores canonical inline and reused boundaries

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
const SearchInputSchema = schema(Type.Object({ id: Type.String() }));
export const contract = {
  find: base
    .input(SearchInputSchema)
    .output(schema(Type.Object({ found: Type.Boolean() }))),
};
```

## Matches an indirect projected contract

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/contract.ts
import { search } from "@rawr/catalog-service/contract";
export const contract = search.route({ method: "GET", path: "/search" });
```
