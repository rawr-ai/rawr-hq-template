---
level: error
tags: [orpc, service, contract, typebox, error-authority]
---
# Require Service Contract Authority

A module contract is a declarative boundary, not a schema workshop. Its
top-level grammar admits imports, private contract-attached
`ORPCTaggedError` declarations for Effect services, and the single generic
`contract` anchor. Procedure input and output envelopes adapt TypeBox directly
at their contract positions. Reusable domain schemas remain outside
`contract.ts` as `NameSchema` authorities. A colocated `NameType` is required
to be `Static<typeof NameSchema>` when one is actually needed; the rule does
not manufacture unused aliases.

The service relationship packet owns ordinary anchor export syntax. Reuse
count is owned by the import graph, Knip, JSDoc, and review; this source rule
does not infer it from identifier spelling.

```grit
language js(typescript)

function paired_type_name($value) js {
  return `^${$value.text.replace(/Schema$/, "Type")}$`;
}

predicate is_module_contract() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract\.ts$"
}

predicate is_effect_service_contract() {
  $filename <: r".*services/[^/]+/src/service/modules/[^/]+/contract\.ts$"
}

predicate contract_attaches_error($name) {
  or {
    $program <: contains `$builder.errors({ $..., $code: $name, $... })`,
    $program <: contains `$builder.errors({ $..., $name, $... })`
  }
}

predicate is_allowed_contract_statement($statement) {
  or {
    $statement <: import_statement(),
    $statement <: `const $name = $value`,
    $statement <: `let $name = $value`,
    $statement <: `var $name = $value`,
    $statement <: `function $name($args) { $body }`,
    $statement <: `const contract = $value`,
    $statement <: `export const contract = $value`,
    $statement <: `export { contract }`,
    and {
      is_effect_service_contract(),
      $statement <: `class $name extends ORPCTaggedError($args) { $body }`,
      $program <: contains `import { $..., ORPCTaggedError, $... } from "effect-orpc"`,
      contract_attaches_error(name=$name)
    },
    and {
      is_effect_service_contract(),
      $statement <: `class $name extends $tagged($args) { $body }`,
      $program <: contains `import { $..., ORPCTaggedError as $tagged, $... } from "effect-orpc"`,
      contract_attaches_error(name=$name)
    },
    and {
      is_effect_service_contract(),
      $statement <: `class $name extends $namespace.ORPCTaggedError($args) { $body }`,
      $program <: contains `import * as $namespace from "effect-orpc"`,
      contract_attaches_error(name=$name)
    }
  }
}

or {
  variable_declarator(name=$name) where {
    is_module_contract(),
    ! $name <: `contract`
  },
  `function $name($args) { $body }` where {
    is_module_contract()
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
  `$builder.errors($map)` where {
    is_effect_service_contract(),
    ! $map <: `{ $properties }`
  },
  `$builder.errors({ $..., $code: $definition, $... })` where {
    is_effect_service_contract(),
    not {
      or {
        $program <: contains `class $definition extends ORPCTaggedError($args) { $body }`,
        and {
          $program <: contains `import { $..., ORPCTaggedError as $tagged, $... } from "effect-orpc"`,
          $program <: contains `class $definition extends $tagged($args) { $body }`
        },
        and {
          $program <: contains `import * as $namespace from "effect-orpc"`,
          $program <: contains `class $definition extends $namespace.ORPCTaggedError($args) { $body }`
        }
      }
    }
  },
  `$builder.errors({ $..., $definition, $... })` where {
    is_effect_service_contract(),
    $definition <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
    not {
      or {
        $program <: contains `class $definition extends ORPCTaggedError($args) { $body }`,
        and {
          $program <: contains `import { $..., ORPCTaggedError as $tagged, $... } from "effect-orpc"`,
          $program <: contains `class $definition extends $tagged($args) { $body }`
        },
        and {
          $program <: contains `import * as $namespace from "effect-orpc"`,
          $program <: contains `class $definition extends $namespace.ORPCTaggedError($args) { $body }`
        }
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
            $adapter <: `standard`,
            $program <: contains `import { $..., standard, $... } from "#adapters/typebox"`
          },
          $program <: contains `import { $..., standard as $adapter, $... } from "#adapters/typebox"`
        }
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*services/[^/]+/src/service/modules/[^/]+/contract\.ts$",
    not {
      or {
        $body <: contains `import { $..., eoc, $... } from "effect-orpc"`,
        $body <: contains `import { $..., eoc as $builder, $... } from "effect-orpc"`
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*plugins/server/api/[^/]+/src/service/modules/[^/]+/contract\.ts$",
    not {
      or {
        $body <: contains `import { $..., oc, $... } from "@orpc/contract"`,
        $body <: contains `import { $..., oc as $builder, $... } from "@orpc/contract"`
      }
    }
  },
  `$adapter($schema)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    or {
      and {
        $adapter <: `standard`,
        $program <: contains `import { $..., standard, $... } from "#adapters/typebox"`
      },
      $program <: contains `import { $..., standard as $adapter, $... } from "#adapters/typebox"`
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

## Matches contract-local staging

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
const SearchSchema = build();
export const contract = eoc.input(standard(SearchSchema));
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
const SearchSchema = build();
export const contract = eoc.input(standard(SearchSchema));
```

## Ignores a declarative Effect contract

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { standard } from "#adapters/typebox";
import { eoc, ORPCTaggedError } from "effect-orpc";
import { Type } from "typebox";
class CatalogUnavailable extends ORPCTaggedError("CatalogUnavailable") {}
export const contract = eoc
  .errors({ SERVICE_UNAVAILABLE: CatalogUnavailable })
  .input(standard(Type.Object({ id: Type.String() })))
  .output(standard(Type.Object({ found: Type.Boolean() })));
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract.ts
import { standard } from "#adapters/typebox";
import { eoc, ORPCTaggedError } from "effect-orpc";
import { Type } from "typebox";
class CatalogUnavailable extends ORPCTaggedError("CatalogUnavailable") {}
export const contract = eoc
  .errors({ SERVICE_UNAVAILABLE: CatalogUnavailable })
  .input(standard(Type.Object({ id: Type.String() })))
  .output(standard(Type.Object({ found: Type.Boolean() })));
```
