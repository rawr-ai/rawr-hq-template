---
level: error
tags: [service, contract, dto, entity, typebox, schema]
---
# Require Service Schema Publication

Service contracts, DTOs, error-data leaves, and entities publish one portable
JSON Schema 2020-12 meaning. They use named imports from the root `typebox`
module and direct `Type.<constructor>` access from a closed verified set. Runtime
refinements, codecs, unsafe static overlays, directly visible BigInt values,
and older tuple syntax stay outside the published schema. Model policy and procedure
admission own semantics that JSON Schema cannot express faithfully.

The rule's exact-path acquisition selects direct leaves inside the closed
service topology. This source pattern therefore owns TypeBox construction, not
filesystem ownership or service shape.

```grit
language js(typescript)

// Selects contract, DTO, error-data, and entity leaves acquired by this rule.
predicate require_service_schema_publication_is_owner() {
  or {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract/[^/]+\.ts$",
    $filename <: r".*services/[^/]+/src/service/(?:model|modules/[^/]+/model)/(?:dto|entities|errors)/[^/]+\.ts$",
    $filename <: r".*plugins/server/api/[^/]+/src/service/(?:model|modules/[^/]+/model)/(?:dto|entities|errors)/[^/]+\.ts$"
  }
}

// Defines the intentionally small, adapter-verified constructor set.
predicate require_service_schema_publication_is_projectable_constructor($constructor) {
  $constructor <: r"^[\"']?(?:Array|Boolean|Enum|Evaluate|Integer|Interface|Intersect|Literal|Never|Null|Number|Object|Omit|Optional|Partial|Pick|Record|Required|String|TemplateLiteral|Union|Unknown)[\"']?$"
}

// Defines the canonical direct TypeBox imports used by public schema owners.
predicate require_service_schema_publication_is_canonical_import($name) {
  $name <: or {
    `ReadonlyObject`,
    `Static`,
    `TArrayOptions`,
    `TSchema`,
    `Type`
  }
}

// Recognizes ordinary direct BigInt forms that JSON Schema cannot represent.
predicate require_service_schema_publication_is_bigint_literal($value) {
  $value <: r"^[+-]?(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|[0-9][0-9_]*)n$"
}

// Recognizes direct BigInt-producing forms without evaluating or tracing values.
predicate require_service_schema_publication_is_bigint_value($value) {
  or {
    require_service_schema_publication_is_bigint_literal(value=$value),
    $value <: `BigInt($...)`,
    $value <: `BigInt.asIntN($...)`,
    $value <: `BigInt.asUintN($...)`
  }
}

// Distinguishes the canonical named-only root import from default, namespace,
// mixed, and side-effect import forms without attempting source traversal.
function require_service_schema_publication_import_form_status($statement) js {
  const source = $statement.text.trimStart().slice("import".length).trimStart();
  if (source.startsWith("{")) return "canonical-named";
  if (source.startsWith("type")) {
    return source.slice("type".length).trimStart().startsWith("{")
      ? "canonical-named"
      : "noncanonical";
  }
  return "noncanonical";
}

or {
  import_statement(source=$source) as $import where {
    require_service_schema_publication_is_owner(),
    $source <: r"^[\"']typebox[\"']$",
    $status = require_service_schema_publication_import_form_status(statement=$import),
    $status <: includes "noncanonical"
  },
  import_statement(source=$source) where {
    require_service_schema_publication_is_owner(),
    $source <: r"^[\"']typebox/[^\"']+[\"']$"
  },
  import_statement(source=$source) as $import where {
    require_service_schema_publication_is_owner(),
    $source <: r"^[\"']typebox[\"']$",
    $import <: contains import_specifier(name=$name) where {
      not { require_service_schema_publication_is_canonical_import(name=$name) }
    }
  },
  import_statement(source=$source) as $import where {
    require_service_schema_publication_is_owner(),
    $source <: r"^[\"']typebox[\"']$",
    $import <: contains import_specifier(alias=$alias) where {
      $alias <: identifier()
    }
  },
  variable_declarator(value=$typebox) where {
    require_service_schema_publication_is_owner(),
    $typebox <: `Type`,
    $program <: contains `import { $..., Type, $... } from "typebox"`
  },
  variable_declarator(value=$member) where {
    require_service_schema_publication_is_owner(),
    $member <: `$typebox.$constructor`,
    $typebox <: `Type`,
    $program <: contains `import { $..., Type, $... } from "typebox"`,
    require_service_schema_publication_is_projectable_constructor(
      constructor=$constructor
    )
  },
  `$typebox[$constructor]` where {
    require_service_schema_publication_is_owner(),
    $typebox <: `Type`,
    $program <: contains `import { $..., Type, $... } from "typebox"`
  },
  `$typebox.$constructor` where {
    require_service_schema_publication_is_owner(),
    $typebox <: `Type`,
    $program <: contains `import { $..., Type, $... } from "typebox"`,
    not {
      require_service_schema_publication_is_projectable_constructor(
        constructor=$constructor
      )
    }
  },
  $value where {
    require_service_schema_publication_is_owner(),
    require_service_schema_publication_is_bigint_value(value=$value)
  }
}
```

## Verification boundary

The examples below document intended matches and nonmatches. For check-only
patterns, `grit patterns test` proves that these samples parse and preserve
their no-rewrite output, but it does not assert finding counts. The exact
Habitat rule check covers the acquired repository corpus rather than synthetic
fixtures. Habitat currently has no owner-local seam that evaluates a resolved
Grit program and exposes finding counts without selecting the concrete provider,
so these samples are not claimed as semantic fixture proof.

## Matches a semantic DTO leaf without a filename suffix

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { Type } from "typebox";
export const CoverageSchema = Type.Tuple([Type.String()]);
```

## Matches a semantic DTO below a checkout parent named services

```typescript
// @filename: /tmp/services/rawr-hq-template/services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { Type } from "typebox";
export const CoverageSchema = Type.Tuple([Type.String()]);
```

## Ignores a nested DTO leaf outside the closed model face

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/legacy/catalog.ts
import { Type } from "typebox";
export const CoverageSchema = Type.Tuple([Type.String()]);
```

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/legacy/catalog.ts
import { Type } from "typebox";
export const CoverageSchema = Type.Tuple([Type.String()]);
```

## Ignores projectable TypeBox helper imports

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { ReadonlyObject, Type } from "typebox";
export const CatalogSchema = ReadonlyObject(Type.Object({ id: Type.String() }));
```

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { ReadonlyObject, Type } from "typebox";
export const CatalogSchema = ReadonlyObject(Type.Object({ id: Type.String() }));
```

## Ignores a canonical TypeBox-derived entity

```typescript
// @filename: services/jobs/src/service/model/entities/job.ts
import { type Static, Type } from "typebox";
export const JobSchema = Type.Object({ id: Type.String({ minLength: 1 }) });
export type Job = Static<typeof JobSchema>;
```

```typescript
// @filename: services/jobs/src/service/model/entities/job.ts
import { type Static, Type } from "typebox";
export const JobSchema = Type.Object({ id: Type.String({ minLength: 1 }) });
export type Job = Static<typeof JobSchema>;
```

## Matches non-projectable script construction

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { Type } from "typebox";
export const CoverageSchema = Type.Script("[string, number]");
```

## Matches named executable refinement construction

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { RefineAdd, Type } from "typebox";
export const CoverageSchema = RefineAdd(Type.String(), () => true);
```

## Matches named literal construction outside the canonical Type face

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { Literal } from "typebox";
export const CoverageSchema = Literal(1n);
```

## Matches a mixed default and named TypeBox import

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import TypeBox, { type Static } from "typebox";
export const CoverageSchema = TypeBox.Object({ id: TypeBox.String() });
export type Coverage = Static<typeof CoverageSchema>;
```

## Matches a TypeBox constructor subpath import

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { Refine, String } from "typebox/type";
export const CoverageSchema = Refine(String(), () => true);
```

## Matches a nondecimal BigInt literal

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { Type } from "typebox";
export const CoverageSchema = Type.Literal(0x1_000n);
```

## Matches an indirectly consumed BigInt literal in a schema owner

```typescript
// @filename: services/habitat/src/service/modules/catalog/model/dto/catalog.ts
import { Type } from "typebox";
const ONE = 1n;
export const CoverageSchema = Type.Literal(ONE);
```

## Matches executable TypeBox semantics that cannot be published faithfully

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/sdk";
export const get = oc.input(
  standard(Type.Refine(Type.String(), (value) => value === "accepted")),
);
```

## Matches computed TypeBox construction even for an admitted member name

```typescript
// @filename: services/jobs/src/service/model/dto/catalog.ts
import { Type } from "typebox";
export const CatalogSchema = Type["String"]();
```

## Matches an indirect alias of an admitted TypeBox constructor

```typescript
// @filename: services/jobs/src/service/model/dto/catalog.ts
import { Type } from "typebox";
const makeString = Type.String;
export const CatalogSchema = makeString();
```

## Matches a BigInt-producing call passed to Literal

```typescript
// @filename: services/jobs/src/service/model/dto/catalog.ts
import { Type } from "typebox";
export const CatalogSchema = Type.Literal(BigInt(1));
```

## Ignores direct JSON-projectable Literal values

```typescript
// @filename: services/jobs/src/service/model/dto/catalog.ts
import { Type } from "typebox";
export const CatalogSchema = Type.Union([
  Type.Literal("ready"),
  Type.Literal(false),
  Type.Literal(-1),
]);
```

## Ignores native JSON Schema composition

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/sdk";
export const get = oc
  .input(standard(Type.Object({
    name: Type.String({ minLength: 1 }),
    count: Type.Optional(Type.Integer({ minimum: 0 })),
  }, { additionalProperties: false })))
  .output(standard(Type.Object({
    accepted: Type.Boolean(),
  }, { additionalProperties: false })));
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { standard } from "@habitat-ai/sdk";
export const get = oc
  .input(standard(Type.Object({
    name: Type.String({ minLength: 1 }),
    count: Type.Optional(Type.Integer({ minimum: 0 })),
  }, { additionalProperties: false })))
  .output(standard(Type.Object({
    accepted: Type.Boolean(),
  }, { additionalProperties: false })));
```

## Ignores adapter-verified TypeBox composition helpers

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { standard } from "@habitat-ai/sdk";
import { Type } from "typebox";
const Base = Type.Intersect([
  Type.Object({ id: Type.String() }),
  Type.Partial(Type.Object({ note: Type.String() })),
]);
export const get = oc.output(
  standard(Type.Required(Type.Pick(Type.Evaluate(Base), ["id"]))),
);
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/contract/get.ts
import { oc } from "@orpc/contract";
import { standard } from "@habitat-ai/sdk";
import { Type } from "typebox";
const Base = Type.Intersect([
  Type.Object({ id: Type.String() }),
  Type.Partial(Type.Object({ note: Type.String() })),
]);
export const get = oc.output(
  standard(Type.Required(Type.Pick(Type.Evaluate(Base), ["id"]))),
);
```
