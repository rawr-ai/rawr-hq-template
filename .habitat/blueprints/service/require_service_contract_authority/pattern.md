---
level: error
tags: [orpc, service, contract, typebox, error-authority]
---
# Require Service Contract Authority

A module contract directory exposes one generic `contract` anchor from
`index.ts`. Direct semantic leaves export one operation contract or deliberate
native oRPC group for that entrypoint to compose. Private support inside any
one contract source remains bounded to that source.
When an operation name is an ECMAScript reserved word, the leaf may use any
private local binding and alias it to the filename-mapped public export.
Procedure input, output, and public error-data envelopes adapt TypeBox with
`standard(...)` at their native contract positions. A private typed adaptation
binding may preserve portable declaration names without creating another schema
owner.

Contract and reusable DTO schema owners use TypeBox's native JSON Schema
builders. Executable refinements, codecs, native-only builders and literals,
unsafe schemas, and tuple syntax from an older JSON Schema dialect do not enter
a public contract. TypeBox remains responsible for the schemas its JSON
builders produce; this law rejects the known non-projectable capability
families instead of making the adapter traverse and reinterpret arbitrary
schema graphs at runtime.

Public procedure failures are declared with native `.errors(...)` maps in the
owning contract. A map may be inline or a private local object literal, and a
shorthand item in an inline map is likewise private and local. Neither map nor
item may be imported, computed dynamically, or exported. Procedure
implementations receive the corresponding constructors from native handler
context.

```grit
language js(typescript)

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

// Admits export-list aliasing only for an ECMAScript-reserved public operation.
function require_service_contract_authority_reserved_name_status($name) js {
  const reserved = new Set([
    "await", "break", "case", "catch", "class", "const", "continue",
    "debugger", "default", "delete", "do", "else", "enum", "export",
    "extends", "false", "finally", "for", "function", "if", "implements",
    "import", "in", "instanceof", "interface", "let", "new", "null",
    "package", "private", "protected", "public", "return", "static", "super",
    "switch", "this", "throw", "true", "try", "typeof", "var", "void",
    "while", "with", "yield",
  ]);
  return reserved.has($name.text) ? "ok" : "wrong-export";
}

// Selects the one generic module contract directory entrypoint.
predicate require_service_contract_authority_is_module_contract_entrypoint() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract/index\.ts$"
}

// Selects the one contract composition boundary.
predicate require_service_contract_authority_is_module_contract_boundary() {
  require_service_contract_authority_is_module_contract_entrypoint()
}

// Selects every direct source in a closed module contract directory.
predicate require_service_contract_authority_is_module_contract_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract/[^/]+\.ts$"
}

// Selects direct semantic leaves while excluding the directory entrypoint.
predicate require_service_contract_authority_is_module_contract_leaf() {
  require_service_contract_authority_is_module_contract_source(),
  not { require_service_contract_authority_is_module_contract_boundary() }
}

// Matches a source alias kind to the importing service lane.
predicate require_service_contract_authority_is_same_kind($lane, $alias_kind) {
  or {
    and {
      $lane <: r"^services$",
      $alias_kind <: r"^service$"
    },
    and {
      $lane <: r"^plugins/server/api$",
      $alias_kind <: r"^api$"
    }
  }
}

// Recognizes implementation faces that contract source cannot acquire.
predicate require_service_contract_authority_is_implementation_source($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/([^/]+)/contract/[^/]+\.ts$"($lane, $owner, $module),
  or {
    $source <: r"^[\"']\.\./(?:module(?:\.[cm]?[jt]s)?|router(?:/[^\"']*)?|middleware(?:/[^\"']*)?)[\"']$",
    and {
      $source <: r"^[\"']#([^/]+)-(service|api)/modules/([^/]+)/(?:module(?:\.[cm]?[jt]s)?|router(?:/[^\"']*)?|middleware(?:/[^\"']*)?)[\"']$"($alias_owner, $alias_kind, $target),
      $alias_owner <: $owner,
      require_service_contract_authority_is_same_kind(
        lane=$lane,
        alias_kind=$alias_kind
      ),
      $target <: $module
    }
  }
}

// Recognizes a contract leaf cycling through its own directory access point.
predicate require_service_contract_authority_is_own_index_source($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/([^/]+)/contract/[^/]+\.ts$"($lane, $owner, $module),
  or {
    $source <: r"^[\"'](?:\.|\./|\./index(?:\.[cm]?[jt]s)?|\.\./contract(?:/|/index(?:\.[cm]?[jt]s)?)?)[\"']$",
    and {
      $source <: r"^[\"']#([^/]+)-(service|api)/modules/([^/]+)/contract(?:/|/index(?:\.[cm]?[jt]s)?)?[\"']$"($alias_owner, $alias_kind, $target),
      $alias_owner <: $owner,
      require_service_contract_authority_is_same_kind(
        lane=$lane,
        alias_kind=$alias_kind
      ),
      $target <: $module
    }
  }
}

// Checks that a direct leaf import maps its kebab-case source to one binding.
function require_service_contract_authority_entrypoint_import_status($source, $name) js {
  const relative = $source.text.slice(1, -1);
  const match = relative.match(/^\.\/([^/]+)$/);
  const leaf = match?.[1].replace(/\.[cm]?[jt]s$/, "");
  if (!leaf || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(leaf)) {
    return "noncanonical-source";
  }
  const expected = leaf.replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  return expected === $name.text ? "ok" : "wrong-binding";
}

// Proves one filename-mapped direct leaf import at the contract access point.
predicate require_service_contract_authority_is_canonical_leaf_import($statement) {
  or {
    and {
      $statement <: `import { $name } from $source`,
      $status = require_service_contract_authority_entrypoint_import_status(
        source=$source,
        name=$name
      ),
      $status <: includes "ok"
    },
    and {
      $statement <: `import { $name as $local } from $source`,
      $source_status = require_service_contract_authority_entrypoint_import_status(
        source=$source,
        name=$name
      ),
      $source_status <: includes "ok",
      $binding_status = require_service_contract_authority_reserved_name_status(
        name=$name
      ),
      $binding_status <: includes "ok"
    }
  }
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

// Recognizes the repository's one TypeBox-to-Standard-Schema adapter.
predicate require_service_contract_authority_is_standard_schema($value) {
  $value <: `$adapter($schema)` where {
    or {
      and {
        $adapter <: `standard`,
        $program <: contains `import { $..., standard, $... } from "@habitat-ai/typebox-adapter"`
      },
      $program <: contains `import { $..., standard as $adapter, $... } from "@habitat-ai/typebox-adapter"`
    }
  }
}

// Recognizes direct adaptation or one private typed adaptation binding.
predicate require_service_contract_authority_is_standard_schema_value($value) {
  or {
    require_service_contract_authority_is_standard_schema(value=$value),
    and {
      $value <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
      $program <: contains variable_declarator(
        name=$value,
        value=$adapted
      ),
      require_service_contract_authority_is_standard_schema(value=$adapted)
    }
  }
}

// Recognizes a private local object-literal error map.
predicate require_service_contract_authority_is_local_error_map($map) {
  $map <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
  $program <: contains `const $map = { $properties }`
}

// Recognizes one private object-literal item with adapted public data.
predicate require_service_contract_authority_is_local_error_item($item) {
  $item <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
  $program <: contains variable_declarator(
    name=$item,
    value=$definition
  ),
  or {
    $definition <: `{ $properties }`,
    $definition <: `$object as const` where {
      $object <: `{ $properties }`
    }
  },
  not {
    or {
      $definition <: `{ $..., data: $data, $... }`,
      $definition <: `$object as const` where {
        $object <: `{ $..., data: $data, $... }`
      }
    },
    not {
      require_service_contract_authority_is_standard_schema_value(value=$data)
    }
  }
}

or {
  program(statements=$statements) where {
    require_service_contract_authority_is_module_contract_boundary(),
    not {
      or {
        $statements <: some `export const contract = $value`,
        $statements <: some `export const contract: $type = $value`
      }
    }
  },
  program(statements=$statements) where {
    require_service_contract_authority_is_module_contract_entrypoint(),
    not {
      require_service_contract_authority_has_canonical_leaf_import(
        body=$statements
      )
    }
  },
  export_statement() as $export where {
    require_service_contract_authority_is_module_contract_boundary(),
    not {
      or {
        $export <: `export const contract = $value`,
        $export <: `export const contract: $type = $value`
      }
    }
  },
  program(statements=$statements) where {
    require_service_contract_authority_is_module_contract_leaf(),
    not {
      or {
        $statements <: contains `export const $name = $value` where {
          $status = require_service_contract_authority_leaf_status(
            filename=$filename,
            name=$name
          ),
          $status <: includes "ok"
        },
        and {
          $statements <: contains `export { $local as $name }`,
          $statements <: contains `const $local = $value`,
          $filename_status = require_service_contract_authority_leaf_status(
            filename=$filename,
            name=$name
          ),
          $filename_status <: includes "ok",
          $binding_status = require_service_contract_authority_reserved_name_status(
            name=$name
          ),
          $binding_status <: includes "ok"
        }
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
  `export { $specifiers }` as $export where {
    require_service_contract_authority_is_module_contract_leaf(),
    not {
      $export <: `export { $local as $name }`,
      $program <: contains `const $local = $value`,
      $filename_status = require_service_contract_authority_leaf_status(
        filename=$filename,
        name=$name
      ),
      $filename_status <: includes "ok",
      $binding_status = require_service_contract_authority_reserved_name_status(
        name=$name
      ),
      $binding_status <: includes "ok"
    }
  },
  export_statement(source=$source) where {
    require_service_contract_authority_is_module_contract_leaf(),
    $source <: string()
  },
  `export default $value` where {
    require_service_contract_authority_is_module_contract_leaf()
  },
  import_statement(source=$source) where {
    require_service_contract_authority_is_module_contract_source(),
    require_service_contract_authority_is_implementation_source(source=$source)
  },
  import_statement(source=$source) where {
    require_service_contract_authority_is_module_contract_leaf(),
    require_service_contract_authority_is_own_index_source(source=$source)
  },
  import_statement(source=$source) as $import where {
    require_service_contract_authority_is_schema_owner(),
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
  `$builder.errors({ $..., $item, $... })` where {
    require_service_contract_authority_is_module_contract_source(),
    $item <: shorthand_property_identifier(),
    not {
      require_service_contract_authority_is_local_error_item(item=$item)
    }
  },
  `$builder.errors($map)` where {
    require_service_contract_authority_is_module_contract_source(),
    require_service_contract_authority_is_local_error_map(map=$map),
    $program <: contains `const $map = { $..., $item, $... }`,
    $item <: shorthand_property_identifier(),
    not {
      require_service_contract_authority_is_local_error_item(item=$item)
    }
  },
  `$builder.errors({ $..., $code: { $..., data: $data, $... }, $... })` where {
    require_service_contract_authority_is_module_contract_source(),
    not {
      require_service_contract_authority_is_standard_schema_value(value=$data)
    }
  },
  `$builder.errors($map)` where {
    require_service_contract_authority_is_module_contract_source(),
    require_service_contract_authority_is_local_error_map(map=$map),
    $program <: contains `const $map = { $..., $code: { $..., data: $data, $... }, $... }`,
    not {
      require_service_contract_authority_is_standard_schema_value(value=$data)
    }
  },
  `$procedure.$direction($schema)` where {
    require_service_contract_authority_is_module_contract_source(),
    $direction <: r"^(?:input|output)$",
    not {
      require_service_contract_authority_is_standard_schema_value(value=$schema)
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
  }
}
```

## Matches contract acquisition of a configured module

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { module } from "#jobs-service/modules/catalog/module";
export const get = oc.input(standard(JobRequestSchema));
```

## Matches a contract leaf cycling through its access point

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { contract } from ".";
export const get = oc.input(standard(JobRequestSchema));
```

## Matches imported error authority

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { errors } from "./errors";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
export const get = oc
  .errors(errors)
  .input(standard(Type.Object({ query: Type.String() })));
```

## Matches a raw procedure schema

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
export const get = oc.input(Type.Object({ query: Type.String() }));
```

## Matches raw native error data

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
export const get = oc
  .errors({
    BAD_REQUEST: {
      message: "Bad request",
      data: Type.Object({ reason: Type.String() }),
    },
  })
  .input(standard(Type.Object({ query: Type.String() })));
```

## Matches raw private named native error data

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
const BAD_REQUEST = {
  message: "Bad request",
  data: Type.Object({ reason: Type.String() }),
};
export const get = oc
  .errors({ BAD_REQUEST })
  .input(standard(Type.Object({ query: Type.String() })));
```

## Matches an imported shorthand native error item

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { BAD_REQUEST } from "./errors";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
export const get = oc
  .errors({ BAD_REQUEST })
  .input(standard(Type.Object({ query: Type.String() })));
```

## Matches a contract leaf whose export does not match its filename

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/find-by-id.ts
export const find = oc.input(standard(Type.Object({})));
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

## Ignores additional relative entrypoint support after canonical acquisition

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
import { get } from "./get";
import { sharedMetadata } from "./metadata";
export const contract = { get, metadata: sharedMetadata };
```

## Ignores an arbitrary private binding for a reserved public operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/delete.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
const removeOperation = oc.input(standard(Type.Object({ id: Type.String() })));
export { removeOperation as delete };
```

## Matches imported authority aliased as a reserved public operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/delete.ts
import { removeOperation } from "./support";
export { removeOperation as delete };
```

## Ignores an arbitrary import binding for a reserved public operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/index.ts
import { delete as removeOperation } from "./delete";
export const contract = { delete: removeOperation };
```

## Ignores private native contract composition

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
const errors = { SERVICE_UNAVAILABLE: {} };
export const get = oc
  .errors(errors)
  .input(standard(Type.Object({ query: Type.String() })))
  .output(standard(Type.Object({ found: Type.Boolean() })));
```

## Ignores inline native error data

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
export const get = oc
  .errors({
    BAD_REQUEST: {
      message: "Bad request",
      data: standard(Type.Object({ reason: Type.String() })),
    },
  })
  .input(standard(Type.Object({ query: Type.String() })));
```

## Ignores private named native error data

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import type { ErrorMapItem } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
const BadRequestData = standard(Type.Object({ reason: Type.String() }));
const BAD_REQUEST: ErrorMapItem<typeof BadRequestData> = {
  message: "Bad request",
  data: BadRequestData,
} as const;
export const get = oc
  .errors({ BAD_REQUEST })
  .input(standard(Type.Object({ query: Type.String() })));
```

## Ignores a named input schema with a data property

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
const CatalogRequestSchema = Type.Object({ data: Type.String() });
export const get = oc.input(standard(CatalogRequestSchema));
```

## Matches executable TypeBox semantics that cannot be published faithfully

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
export const get = oc.input(
  standard(Type.Refine(Type.String(), (value) => value === "accepted")),
);
```

## Ignores native JSON Schema composition

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/typebox-adapter";
export const get = oc
  .input(standard(Type.Object({
    name: Type.String({ minLength: 1 }),
    count: Type.Optional(Type.Integer({ minimum: 0 })),
  }, { additionalProperties: false })))
  .output(standard(Type.Object({
    accepted: Type.Boolean(),
  }, { additionalProperties: false })));
```
