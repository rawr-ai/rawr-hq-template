---
level: error
tags: [orpc, service, contract, typebox, documentation]
---
# Require Service Contract Property Descriptions

Every property authored directly inside a module contract's
`Type.Object({...})` declaration carries a nonblank static `description` in
the property's own TypeBox schema options. `Type.Optional(...)` delegates that
responsibility to its wrapped schema. A named `*Schema` property value and a
`...*Schema.properties` spread delegate the property vocabulary to the named
schema authority instead of reauthoring it at the contract.

This rule intentionally proves a narrow source relation. It recognizes the
canonical unaliased `Type` import, ordinary object properties, one
`Type.Optional(...)` wrapper, named schema identifiers ending in `Schema`, and
nonblank single- or double-quoted text assigned to the canonical unquoted
`description` key in the schema constructor's final options object. Aliased
TypeBox authority, shorthand and method properties, quoted description keys,
template literals, and dynamically assembled schema options cannot satisfy the
law because they expand the source shapes that encode property meaning.
TypeScript and review own computed keys, deeper wrapper chains,
schema-reference provenance, indirect or re-exported TypeBox bindings, escaped
whitespace, and whether the description is factually complete. Constraints
such as minimums and maximums are a separate behavioral contract decision and
are not inferred here.

```grit
language js(typescript)

// Confirms a direct contract entrypoint or semantic leaf in the bounded application.
predicate require_service_contract_property_descriptions_is_module_contract() {
  $filename <: r".*modules/[^/]+/(?:contract\.ts|contract/[^/]+\.ts)$"
}

// Confirms that the contract acquires the canonical TypeBox runtime binding.
predicate require_service_contract_property_descriptions_imports_canonical_typebox() {
  $program <: contains `import { $..., Type, $... } from "typebox"`
}

// Recognizes an explicit delegation to a named schema authority.
predicate require_service_contract_property_descriptions_is_named_schema($schema) {
  $schema <: identifier(),
  $schema <: r".*Schema$"
}

// Recognizes a direct TypeBox schema with truthful static description syntax.
predicate require_service_contract_property_descriptions_is_described_typebox_schema($schema) {
  $schema <: `Type.$constructor($...)`,
  ! $schema <: `Type.Optional($_)`,
  $schema <: call_expression(arguments=$arguments),
  $arguments <: [
    ...,
    `{ $..., description: $description, $... }`
  ],
  $description <: string(),
  ! $description <: r"^[\"']\s*[\"']$",
  not {
    $schema <: `Type.Enum($...)`,
    $arguments <: [$enum_values]
  }
}

// Defines the complete canonical grammar for one contract property schema.
predicate require_service_contract_property_descriptions_is_allowed_property_schema($schema) {
  or {
    require_service_contract_property_descriptions_is_named_schema(
      schema=$schema
    ),
    require_service_contract_property_descriptions_is_described_typebox_schema(
      schema=$schema
    ),
    and {
      $schema <: `Type.Optional($inner_schema)`,
      or {
        require_service_contract_property_descriptions_is_named_schema(
          schema=$inner_schema
        ),
        require_service_contract_property_descriptions_is_described_typebox_schema(
          schema=$inner_schema
        )
      }
    }
  }
}

// Finds one contract that falls outside the canonical property grammar.
or {
  import_statement(source=$typebox_source) as $typebox_import where {
    require_service_contract_property_descriptions_is_module_contract(),
    $typebox_source <: r"^[\"']typebox[\"']$",
    $typebox_import <: contains import_specifier(
      name=`Type`,
      alias=$typebox_alias
    ),
    $typebox_alias <: identifier()
  },
  variable_declarator(value=`Type`) where {
    require_service_contract_property_descriptions_is_module_contract(),
    require_service_contract_property_descriptions_imports_canonical_typebox()
  },
  `Type.Object($shape, $...)` where {
    require_service_contract_property_descriptions_is_module_contract(),
    not {
      require_service_contract_property_descriptions_imports_canonical_typebox()
    }
  },
  `$noncanonical_typebox.Object($shape, $...)` where {
    require_service_contract_property_descriptions_is_module_contract(),
    ! $noncanonical_typebox <: `Type`
  },
  `Type.Object($shape, $...)` where {
    require_service_contract_property_descriptions_is_module_contract(),
    require_service_contract_property_descriptions_imports_canonical_typebox(),
    $shape <: `{ $properties }`,
    $properties <: some `$key: $schema` where {
      not {
        require_service_contract_property_descriptions_is_allowed_property_schema(
          schema=$schema
        )
      }
    }
  },
  `Type.Object($shape, $...)` where {
    require_service_contract_property_descriptions_is_module_contract(),
    require_service_contract_property_descriptions_imports_canonical_typebox(),
    $shape <: `{ $properties }`,
    $properties <: some `...$spread` where {
      ! $spread <: r"^[A-Za-z_$][A-Za-z0-9_$]*Schema\.properties$"
    }
  },
  `Type.Object($shape, $...)` where {
    require_service_contract_property_descriptions_is_module_contract(),
    require_service_contract_property_descriptions_imports_canonical_typebox(),
    $shape <: `{ $properties }`,
    $properties <: some shorthand_property_identifier()
  },
  `Type.Object($shape, $...)` where {
    require_service_contract_property_descriptions_is_module_contract(),
    require_service_contract_property_descriptions_imports_canonical_typebox(),
    $shape <: `{ $properties }`,
    $properties <: some method_definition()
  }
}
```

## Matches undocumented and nonstatic descriptions

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "typebox";
export const contract = Type.Object({
  missing: Type.String(),
  optional: Type.Optional(Type.String({ minLength: 1 })),
  blank: Type.Integer({ description: "   " }),
  dynamic: Type.String({ description: queryDescription }),
});
```

## Matches aliased and noncanonical TypeBox authority

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type as T } from "typebox";
export const contract = T.Object({
  query: T.String({ description: "Search text." }),
});
```

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "./reexported-typebox";
export const contract = Type.Object({
  query: Type.String({ description: "Search text." }),
});
```

## Matches local TypeBox aliases

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "typebox";
const T = Type;
export const contract = T.Object({
  query: T.String({ description: "Search text." }),
});
```

## Matches one-argument enum data that resembles schema options

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "typebox";
export const contract = Type.Object({
  state: Type.Enum({ description: "draft" }),
  optionalState: Type.Optional(Type.Enum({ description: "draft" })),
});
```

## Matches unsupported property schema authorities

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "typebox";
const LocalValue = Type.String({ description: "Local value." });
const localSchemas = { value: LocalValue };
const buildValue = () => LocalValue;
export const contract = Type.Object({
  identifier: LocalValue,
  call: buildValue(),
  member: localSchemas.value,
  optionalCall: Type.Optional(buildValue()),
});
```

## Matches shorthand, method, and noncanonical spread authority

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "typebox";
const JobSchema = Type.String({ description: "Job identifier." });
export const contract = Type.Object({
  JobSchema,
  query() {
    return Type.String({ description: "Search text." });
  },
  ...jobProperties,
});
```

## Ignores canonical direct and delegated schemas

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "typebox";
import { JobSchema } from "./model/dto/job.dto";
export const contract = Type.Object({
  query: Type.String({ description: "Search text used to find jobs." }),
  location: Type.Optional(Type.String({
    description: "Optional search location.",
  })),
  job: JobSchema,
  selectedJob: Type.Optional(JobSchema),
  ...JobSchema.properties,
});
```

## Ignores schema-valued options and nested expression spreads

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "typebox";
const AlternativeSchemas = [
  Type.String({ description: "Text alternative." }),
] as const;
export const contract = Type.Object({
  value: Type.Object({}, {
    description: "Value with schema-valued additional-property policy.",
    additionalProperties: Type.Never(),
  }),
  alternative: Type.Union([...AlternativeSchemas], {
    description: "Value selected from the declared alternatives.",
  }),
  state: Type.Enum({ description: "draft" }, {
    description: "Documented workflow state.",
  }),
});
```

## Ignores empty object declarations

```typescript
// @filename: services/jobs/src/service/modules/search/contract/search.ts
import { Type } from "typebox";
export const contract = Type.Object({});
```
