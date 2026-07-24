---
level: error
tags: [orpc, service, contract, typebox, error-authority]
---
# Require Service Contract Authority

A module contract is one exported boundary. Its top-level grammar admits
imports, private contract-attached `ORPCTaggedError` declarations, private
`const` schema composition, private error maps, bounded shared fragments,
private helpers, and the single exported `contract` anchor. Every private
support declaration must be syntactically reachable from that exported
contract directly or through one private `const` intermediary. Procedure input
and output envelopes adapt TypeBox with `schema(...)` at their contract
positions.

Reusable domain schemas still belong outside `contract.ts` as `NameSchema`
authorities. A colocated `NameType` is required to be
`Static<typeof NameSchema>` when one is actually needed; the rule does not
manufacture unused aliases. Contract-local support remains private and cannot
become a parallel exported schema, type, envelope, error map, or helper API.

The generic service anchor packet owns ordinary anchor export syntax. Reuse
count is owned by the import graph and review; this source rule does not infer
it from identifier spelling. Knip and the boundary-crossing JSDoc relation are
red installation gaps and provide no current evidence.

```grit
language js(typescript)

// Derives the required Type alias name from its Schema authority.
function paired_type_name($value) js {
  return `^${$value.text.replace(/Schema$/, "Type")}$`;
}

// Scopes declarative contract law to exact service module contracts.
predicate is_module_contract() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract\.ts$"
}

// Connects a support name used directly by the generic contract anchor.
predicate exported_contract_uses($name) {
  $program <: contains `export const contract = $value` where {
    $value <: contains $name
  }
}

// Connects private support directly or through one immutable intermediary.
predicate contract_uses_support($name) {
  or {
    exported_contract_uses(name=$name),
    and {
      $program <: contains `const $parent = $value` where {
        $value <: contains $name
      },
      exported_contract_uses(name=$parent)
    }
  }
}

// Recognizes a private error map used directly or through one local map spread.
predicate error_map_reaches_errors($map) {
  or {
    $program <: contains `$builder.errors($map)`,
    and {
      $program <: contains `const $parent = { $..., ...$map, $... }`,
      $program <: contains `$builder.errors($parent)`
    }
  }
}

// Recognizes a local private object-literal error map.
predicate is_local_error_map($map) {
  $map <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
  $program <: contains `const $map = { $properties }`
}

// Recognizes a private Effect-oRPC error constructor declared in this contract.
predicate is_local_effect_error($name) {
  or {
    and {
      $program <: contains `import { $..., ORPCTaggedError, $... } from "effect-orpc"`,
      $program <: contains `class $name extends ORPCTaggedError($args) { $body }`
    },
    and {
      $program <: contains `import { $..., ORPCTaggedError as $tagged, $... } from "effect-orpc"`,
      $program <: contains `class $name extends $tagged($args) { $body }`
    },
    and {
      $program <: contains `import * as $namespace from "effect-orpc"`,
      $program <: contains `class $name extends $namespace.ORPCTaggedError($args) { $body }`
    }
  }
}

// Connects each private Effect error constructor to a reachable errors clause.
predicate contract_attaches_error($name) {
  or {
    $program <: contains `$builder.errors({ $..., $code: $name, $... })`,
    $program <: contains `$builder.errors({ $..., $name, $... })`,
    and {
      $program <: contains `const $map = { $..., $code: $name, $... }`,
      error_map_reaches_errors(map=$map)
    },
    and {
      $program <: contains `const $map = { $..., $name, $... }`,
      error_map_reaches_errors(map=$map)
    }
  }
}

// Keeps contract-local support private and syntactically reachable.
predicate is_allowed_contract_statement($statement) {
  or {
    $statement <: import_statement(),
    $statement <: `export const contract = $value`,
    and {
      $statement <: `const $name = $value`,
      contract_uses_support(name=$name)
    },
    and {
      $statement <: `function $name($args) { $body }`,
      contract_uses_support(name=$name)
    },
    and {
      $statement <: `class $name extends $parent($args) { $body }`,
      is_local_effect_error(name=$name),
      contract_attaches_error(name=$name)
    }
  }
}

or {
  program(statements=$statements) where {
    is_module_contract(),
    not {
      $statements <: some `export const contract = $value`
    }
  },
  program(statements=$statements) where {
    is_module_contract(),
    $statements <: some $statement where {
      not { is_allowed_contract_statement(statement=$statement) }
    }
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $source <: r"^[\"']typebox[\"']$",
    $import <: `import * as $namespace from $source`
  },
  `$builder.errors($argument)` where {
    is_module_contract(),
    not {
      or {
        $argument <: `{ $properties }`,
        is_local_error_map(map=$argument)
      }
    }
  },
  `$builder.errors({ $..., $code: $definition, $... })` where {
    is_module_contract(),
    not { is_local_effect_error(name=$definition) }
  },
  `$builder.errors({ $..., $definition, $... })` where {
    is_module_contract(),
    $definition <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
    not { is_local_effect_error(name=$definition) }
  },
  `const $map = { $..., $code: $definition, $... }` where {
    is_module_contract(),
    contract_uses_support(name=$map),
    error_map_reaches_errors(map=$map),
    not { is_local_effect_error(name=$definition) }
  },
  `const $map = { $..., $definition, $... }` where {
    is_module_contract(),
    $definition <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
    contract_uses_support(name=$map),
    error_map_reaches_errors(map=$map),
    not { is_local_effect_error(name=$definition) }
  },
  `const $map = { $..., ...$spread, $... }` where {
    is_module_contract(),
    contract_uses_support(name=$map),
    error_map_reaches_errors(map=$map),
    not {
      and {
        is_local_error_map(map=$spread),
        contract_uses_support(name=$spread),
        error_map_reaches_errors(map=$spread)
      }
    }
  },
  `$procedure.$direction($schema)` where {
    is_module_contract(),
    $direction <: r"^(?:input|output)$",
    not {
      $schema <: `$adapter($value)` where {
        or {
          and {
            $adapter <: `schema`,
            $program <: contains `import { $..., schema, $... } from "@rawr/hq-sdk"`
          },
          $program <: contains `import { $..., schema as $adapter, $... } from "@rawr/hq-sdk"`
        }
      }
    }
  },
  program(statements=$body) where {
    is_module_contract(),
    not {
      or {
        $body <: contains `import { $..., eoc, $... } from "effect-orpc"`,
        $body <: contains `import { $..., eoc as $builder, $... } from "effect-orpc"`
      }
    }
  },
  `$adapter($schema)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    or {
      and {
        $adapter <: `schema`,
        $program <: contains `import { $..., schema, $... } from "@rawr/hq-sdk"`
      },
      $program <: contains `import { $..., schema as $adapter, $... } from "@rawr/hq-sdk"`
    },
    not {
      or {
        $program <: contains `$procedure.input($adapter($schema))`,
        $program <: contains `$procedure.output($adapter($schema))`
      }
    }
  },
  `const $name = $typebox.$constructor($args)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/modules/[^/]+/contract\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    or {
      and {
        $typebox <: `Type`,
        $program <: contains `import { $..., Type, $... } from "typebox"`
      },
      $program <: contains `import { $..., Type as $typebox, $... } from "typebox"`
    },
    ! $name <: r".*Schema$"
  },
  variable_declarator(value=`$typebox.$constructor($args)`) as $declaration where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/modules/[^/]+/contract\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    or {
      and {
        $typebox <: `Type`,
        $program <: contains `import { $..., Type, $... } from "typebox"`
      },
      $program <: contains `import { $..., Type as $typebox, $... } from "typebox"`
    },
    not { $declaration <: within `const $name = $typebox.$constructor($args)` }
  },
  `type $type_name = $static<$argument>` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/modules/[^/]+/contract\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $program <: contains import_statement(source=$source) as $import where {
      $source <: r"^[\"']typebox[\"']$",
      or {
        and {
          $static <: `Static`,
          $import <: contains `Static`
        },
        $import <: contains `Static as $static`
      }
    },
    not { $argument <: r"^typeof [A-Za-z_$][A-Za-z0-9_$]*$" }
  },
  `type $type_name = $static<$argument>` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/modules/[^/]+/contract\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $program <: contains import_statement(source=$source) as $import where {
      $source <: r"^[\"']typebox[\"']$",
      or {
        and {
          $static <: `Static`,
          $import <: contains `Static`
        },
        $import <: contains `Static as $static`
      }
    },
    $argument <: type_query(),
    $argument <: r"^typeof ([A-Za-z_$][A-Za-z0-9_$]*)$"($schema_name),
    $expected = paired_type_name(value=$schema_name),
    or {
      ! $schema_name <: r".*Schema$",
      ! $type_name <: r`$expected`,
      not {
        $program <: contains `const $schema_name = $typebox.$constructor($args)` where {
          or {
            and {
              $typebox <: `Type`,
              $program <: contains `import { $..., Type, $... } from "typebox"`
            },
            $program <: contains `import { $..., Type as $typebox, $... } from "typebox"`
          }
        }
      }
    }
  }
}
```

## Matches exported parallel schema and type authority

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { schema } from "@rawr/hq-sdk";
import { eoc } from "effect-orpc";
import { type Static, Type } from "typebox";
export const SearchSchema = Type.Object({ query: Type.String() });
export type SearchType = Static<typeof SearchSchema>;
export const contract = eoc.input(schema(SearchSchema));
```

## Matches a raw procedure schema

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { eoc } from "effect-orpc";
import { Type } from "typebox";
export const contract = eoc.input(Type.Object({ query: Type.String() }));
```

## Matches nonlocal or dynamic error authority

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { schema } from "@rawr/hq-sdk";
import { eoc, ORPCTaggedError } from "effect-orpc";
import { Type } from "typebox";
import { upstreamErrors } from "./errors";
class CatalogUnavailable extends ORPCTaggedError("CatalogUnavailable") {}
const errors = {
  ...upstreamErrors,
  SERVICE_UNAVAILABLE: CatalogUnavailable,
};
export const contract = eoc
  .errors(errors)
  .input(schema(Type.Object({ id: Type.String() })))
  .output(schema(Type.Object({ found: Type.Boolean() })));
```

## Matches a computed errors argument

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { schema } from "@rawr/hq-sdk";
import { eoc } from "effect-orpc";
import { Type } from "typebox";
const buildErrors = () => ({});
export const contract = eoc
  .errors(buildErrors())
  .input(schema(Type.Object({ id: Type.String() })))
  .output(schema(Type.Object({ found: Type.Boolean() })));
```

## Ignores reachable private contract composition

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { schema } from "@rawr/hq-sdk";
import { eoc, ORPCTaggedError } from "effect-orpc";
import { Type } from "typebox";
class CatalogUnavailable extends ORPCTaggedError("CatalogUnavailable") {}
class CatalogBadRequest extends ORPCTaggedError("CatalogBadRequest") {}
const accessErrors = { BAD_REQUEST: CatalogBadRequest };
const errors = {
  ...accessErrors,
  SERVICE_UNAVAILABLE: CatalogUnavailable,
};
const batchCardinality = { minItems: 1, maxItems: 50 };
const search = () => eoc
  .input(schema(Type.Object({
    queries: Type.Array(Type.String(), batchCardinality),
  })))
  .output(schema(Type.Object({ found: Type.Boolean() })));
export const contract = {
  search: search(),
  mutate: eoc
    .errors(errors)
    .input(schema(Type.Object({ id: Type.String() })))
    .output(schema(Type.Object({ updated: Type.Boolean() }))),
};
```

## Ignores a declarative standalone-service contract

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { schema } from "@rawr/hq-sdk";
import { eoc, ORPCTaggedError } from "effect-orpc";
import { Type } from "typebox";
class CatalogUnavailable extends ORPCTaggedError("CatalogUnavailable") {}
export const contract = eoc
  .errors({ SERVICE_UNAVAILABLE: CatalogUnavailable })
  .input(schema(Type.Object({ id: Type.String() })))
  .output(schema(Type.Object({ found: Type.Boolean() })));
```

## Ignores a declarative API-plugin embedded-service contract

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/search/contract.ts
import { schema } from "@rawr/hq-sdk";
import { eoc, ORPCTaggedError } from "effect-orpc";
import { Type } from "typebox";
class SearchUnavailable extends ORPCTaggedError("SearchUnavailable", {
  code: "SERVICE_UNAVAILABLE",
  status: 503,
}) {}
export const contract = eoc
  .errors({ SERVICE_UNAVAILABLE: SearchUnavailable })
  .input(schema(Type.Object({ query: Type.String() })))
  .output(schema(Type.Object({ found: Type.Boolean() })));
```
