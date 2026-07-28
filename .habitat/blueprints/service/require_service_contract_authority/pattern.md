---
level: error
tags: [orpc, service, contract, typebox, error-authority]
---
# Require Service Contract Authority

A module contract directory exposes one generic `contract` anchor from
`index.ts`. Direct semantic leaves export one operation contract or deliberate
native oRPC group for that entrypoint to compose. The entrypoint's top-level
grammar admits imports, private immutable composition, private helpers, and the
single exported anchor. Private support inside any one contract source remains
bounded to that source and reachable from its exported contract value.
Procedure input and output envelopes adapt TypeBox with `standard(...)` at
their contract positions.

Contract and reusable DTO schema owners use TypeBox's native JSON Schema
builders. Executable refinements, codecs, native-only builders and literals,
unsafe schemas, and tuple syntax from an older JSON Schema dialect do not enter
a public contract. TypeBox remains responsible for the schemas its JSON
builders produce; this law rejects the known non-projectable capability
families instead of making the adapter traverse and reinterpret arbitrary
schema graphs at runtime.

Public procedure failures are declared with native `.errors(...)` maps in the
owning contract. A map may be inline or a private local object literal; it may
not be imported, computed dynamically, exported, or backed by custom tagged
error constructors. Procedure implementations receive the corresponding
constructors from native handler context.

Reusable domain DTO schemas may live in the owning module model as
`NameSchema` authorities. When a TypeScript alias is actually needed, it is
`NameType = Static<typeof NameSchema>`. Contract-local request, response,
envelope, error-map, and helper declarations remain private.

```grit
language js(typescript)

// Derives the required Type alias name from a reusable Schema authority.
function require_service_contract_authority_paired_type_name($value) js {
  return `^${$value.text.replace(/Schema$/, "Type")}$`;
}

// Maps a semantic contract leaf filename to its sole lower-camel export.
function require_service_contract_authority_leaf_status($filename, $name) js {
  const match = $filename.text.match(/\/contract\/([^/]+)\.ts$/);
  if (!match || match[1] === "index") return "not-leaf";
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(match[1])) {
    return "noncanonical-filename";
  }
  const expected = match[1].replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  return expected === $name.text ? "ok" : "wrong-export";
}

// Selects the one generic module contract directory entrypoint.
predicate require_service_contract_authority_is_module_contract_entrypoint() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract/index\.ts$"
}

// Keeps the previous single-file contract governed until topology migration closes.
predicate require_service_contract_authority_is_legacy_module_contract() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract\.ts$"
}

// Selects either contract composition boundary during the topology migration.
predicate require_service_contract_authority_is_module_contract_boundary() {
  or {
    require_service_contract_authority_is_module_contract_entrypoint(),
    require_service_contract_authority_is_legacy_module_contract()
  }
}

// Selects every direct source in a closed module contract directory.
predicate require_service_contract_authority_is_module_contract_source() {
  or {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract/[^/]+\.ts$",
    require_service_contract_authority_is_legacy_module_contract()
  }
}

// Selects direct semantic leaves while excluding the directory entrypoint.
predicate require_service_contract_authority_is_module_contract_leaf() {
  require_service_contract_authority_is_module_contract_source(),
  not { require_service_contract_authority_is_module_contract_boundary() }
}

// Checks that a direct leaf import maps its kebab-case source to one binding.
function require_service_contract_authority_entrypoint_import_status($source, $name) js {
  const match = $source.text.match(/^["']\.\/([^/"']+)["']$/);
  if (!match || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(match[1])) {
    return "noncanonical-source";
  }
  const expected = match[1].replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  return expected === $name.text ? "ok" : "wrong-binding";
}

// Proves one filename-mapped direct leaf import at the contract access point.
predicate require_service_contract_authority_is_canonical_leaf_import($statement) {
  $statement <: `import { $name } from $source`,
  $status = require_service_contract_authority_entrypoint_import_status(
    source=$source,
    name=$name
  ),
  $status <: includes "ok"
}

// Proves that an entrypoint statically acquires at least one canonical leaf.
predicate require_service_contract_authority_has_canonical_leaf_import($body) {
  $body <: some $statement where {
    require_service_contract_authority_is_canonical_leaf_import(
      statement=$statement
    )
  }
}

// Recognizes runtime declarations that cross a contract-leaf boundary.
predicate require_service_contract_authority_is_runtime_export($export) {
  $export <: export_statement(declaration=$declaration) where {
    $declaration <: or {
      lexical_declaration(),
      variable_declaration(),
      function_declaration(),
      class_declaration(),
      enum_declaration()
    }
  }
}

// Recognizes the one operation or group export mapped from the leaf filename.
predicate require_service_contract_authority_is_leaf_export($export) {
  $export <: `export const $name = $value`,
  $status = require_service_contract_authority_leaf_status(
    filename=$filename,
    name=$name
  ),
  $status <: includes "ok"
}

// Scopes TypeBox publication law to contracts and reusable DTO schema owners.
predicate require_service_contract_authority_is_schema_owner() {
  or {
    require_service_contract_authority_is_module_contract_source(),
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:model|modules/[^/]+/model)/dto/.*\.dto\.ts$"
  }
}

// Recognizes TypeBox capabilities with runtime or non-2020-12 semantics.
predicate require_service_contract_authority_is_non_projectable_constructor($constructor) {
  $constructor <: r"^[\"']?(?:BigInt|Call|Codec|Constructor|Deferred|Function|Generic|Identifier|Infer|Parameter|Refine|Rest|Symbol|Tuple|Undefined|Unsafe|Void)[\"']?$"
}

// Recognizes a BigInt literal that JSON Schema cannot represent.
predicate require_service_contract_authority_is_bigint_literal($value) {
  $value <: r"^-?(?:0|[1-9][0-9]*)n$"
}

// Connects support used directly by an entrypoint anchor or semantic leaf export.
predicate require_service_contract_authority_exported_contract_uses($name) {
  $program <: contains `export const $exported = $value` where {
    $value <: contains $name
  }
}

// Connects private support directly or through one immutable intermediary.
predicate require_service_contract_authority_contract_uses($name) {
  or {
    require_service_contract_authority_exported_contract_uses(name=$name),
    and {
      $program <: contains `const $parent = $value` where {
        $value <: contains $name
      },
      require_service_contract_authority_exported_contract_uses(name=$parent)
    },
    and {
      $program <: contains `function $parent($args) { $body }` where {
        $body <: contains $name
      },
      require_service_contract_authority_exported_contract_uses(name=$parent)
    }
  }
}

// Recognizes a private local object-literal error map.
predicate require_service_contract_authority_is_local_error_map($map) {
  $map <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
  $program <: contains `const $map = { $properties }`,
  require_service_contract_authority_contract_uses(name=$map)
}

// Keeps contract-local support private and reachable.
predicate require_service_contract_authority_is_allowed_statement($statement) {
  or {
    $statement <: import_statement(),
    $statement <: `export const contract = $value`,
    and {
      $statement <: `const $name = $value`,
      require_service_contract_authority_contract_uses(name=$name)
    },
    and {
      $statement <: `function $name($args) { $body }`,
      require_service_contract_authority_contract_uses(name=$name)
    }
  }
}

or {
  program(statements=$statements) where {
    require_service_contract_authority_is_module_contract_boundary(),
    not { $statements <: some `export const contract = $value` }
  },
  program(statements=$statements) where {
    require_service_contract_authority_is_module_contract_entrypoint(),
    not {
      require_service_contract_authority_has_canonical_leaf_import(
        body=$statements
      )
    }
  },
  program(statements=$statements) where {
    require_service_contract_authority_is_module_contract_boundary(),
    $statements <: some $statement where {
      not {
        require_service_contract_authority_is_allowed_statement(
          statement=$statement
        )
      }
    }
  },
  program(statements=$statements) where {
    require_service_contract_authority_is_module_contract_leaf(),
    not {
      $statements <: contains `export const $name = $value` where {
        $status = require_service_contract_authority_leaf_status(
          filename=$filename,
          name=$name
        ),
        $status <: includes "ok"
      }
    }
  },
  export_statement() as $export where {
    require_service_contract_authority_is_module_contract_leaf(),
    require_service_contract_authority_is_runtime_export(export=$export),
    not {
      require_service_contract_authority_is_leaf_export(export=$export)
    }
  },
  or {
    `export { $specifiers }`,
    `export { $specifiers } from $source`,
    `export default $value`
  } where {
    require_service_contract_authority_is_module_contract_leaf()
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $source <: r"^[\"']typebox[\"']$",
    $import <: `import * as $namespace from $source`
  },
  import_statement(source=$source) as $import where {
    require_service_contract_authority_is_schema_owner(),
    $source <: r"^[\"']typebox[\"']$",
    $import <: contains import_specifier(name=$name) where {
      ! $name <: r"^[\"']?(?:Static|Type)[\"']?$"
    }
  },
  variable_declarator(value=$typebox) where {
    require_service_contract_authority_is_schema_owner(),
    $typebox <: `Type`,
    $program <: contains `import { $..., Type, $... } from "typebox"`
  },
  `$builder.errors($argument)` where {
    require_service_contract_authority_is_module_contract_source(),
    not {
      or {
        $argument <: `{ $properties }`,
        require_service_contract_authority_is_local_error_map(map=$argument)
      }
    }
  },
  `$procedure.$direction($schema)` where {
    require_service_contract_authority_is_module_contract_source(),
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
  `$typebox.$constructor` where {
    require_service_contract_authority_is_schema_owner(),
    or {
      and {
        $typebox <: `Type`,
        $program <: contains `import { $..., Type, $... } from "typebox"`
      },
      $program <: contains `import { $..., Type as $typebox, $... } from "typebox"`,
      $program <: contains `import $typebox from "typebox"`
    },
    require_service_contract_authority_is_non_projectable_constructor(
      constructor=$constructor
    )
  },
  `$typebox.Literal($value, $...)` where {
    require_service_contract_authority_is_schema_owner(),
    or {
      and {
        $typebox <: `Type`,
        $program <: contains `import { $..., Type, $... } from "typebox"`
      },
      $program <: contains `import { $..., Type as $typebox, $... } from "typebox"`,
      $program <: contains `import $typebox from "typebox"`
    },
    require_service_contract_authority_is_bigint_literal(value=$value)
  },
  `const $name = $typebox.$constructor($args)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    not { require_service_contract_authority_is_module_contract_source() },
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
  `type $type_name = $static<$argument>` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    not { require_service_contract_authority_is_module_contract_source() },
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $program <: contains import_statement(source=$source) as $import where {
      $source <: r"^[\"']typebox[\"']$",
      $import <: contains import_specifier(name=`Static`)
    },
    $argument <: r"^typeof ([A-Za-z_$][A-Za-z0-9_$]*)$"($schema_name),
    $expected = require_service_contract_authority_paired_type_name(
      value=$schema_name
    ),
    or {
      ! $schema_name <: r".*Schema$",
      ! $type_name <: r`$expected`
    }
  }
}
```

## Matches exported parallel error authority

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
export const errors = { SERVICE_UNAVAILABLE: {} };
export const contract = oc.errors(errors).router({});
```

## Matches imported error authority

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { errors } from "./errors";
export const contract = oc.errors(errors).router({});
```

## Matches a raw procedure schema

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
export const contract = oc.input(Type.Object({ query: Type.String() }));
```

## Matches a contract leaf whose export does not match its filename

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/find-by-id.ts
export const find = oc.input(standard(Type.Object({})));
```

## Matches an entrypoint without a canonical direct leaf import

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
export const contract = {};
```

## Matches an entrypoint whose direct leaf binding does not match its source

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
import { find } from "./find-by-id";
export const contract = { lookup: find };
```

## Ignores nested contract composition after canonical direct acquisition

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
import { findById } from "./find-by-id";
export const contract = { candidateJobs: { findById } };
```

## Matches a second runtime export from a contract leaf

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
export const get = oc.output(standard(Type.Object({})));
export const preview = oc.output(standard(Type.Object({})));
```

## Ignores private native contract composition

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "#adapters/typebox";
const errors = { SERVICE_UNAVAILABLE: {} };
export const get = oc
  .errors(errors)
  .input(standard(Type.Object({ query: Type.String() })))
  .output(standard(Type.Object({ found: Type.Boolean() })));
```

## Ignores a canonical contract directory entrypoint

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
import { get } from "./get";
export const contract = oc.router({ get });
```

## Ignores a nested Pipeline contract access point

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/contract/index.ts
import { status } from "./status";
import { submit } from "./submit";
import { submitBatch } from "./submit-batch";
export const contract = {
  jobs: {
    submit,
    submitBatch,
    status,
  },
};
```

An unimported sibling leaf is intentionally outside this source relation.
Knip owns whether such a file is unreachable.

## Matches executable TypeBox semantics that cannot be published faithfully

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "#adapters/typebox";
export const contract = oc.input(
  standard(Type.Refine(Type.String(), (value) => value === "accepted")),
);
```

## Matches native TypeBox syntax outside JSON Schema 2020-12

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "#adapters/typebox";
export const contract = oc.input(
  standard(Type.Tuple([Type.String(), Type.Number()])),
);
```

## Ignores native JSON Schema composition

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "#adapters/typebox";
export const contract = oc
  .input(standard(Type.Object({
    name: Type.String({ minLength: 1 }),
    count: Type.Optional(Type.Integer({ minimum: 0 })),
  }, { additionalProperties: false })))
  .output(standard(Type.Object({
    accepted: Type.Boolean(),
  }, { additionalProperties: false })));
```
