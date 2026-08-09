---
level: error
---
# Require Exported Value Declarations To Have JSDoc

Authored values exposed through qualified public resource, provider, and
service faces are cross-module contracts. Their defining declarations require
adjacent nonempty JSDoc. This rule rejects only missing, empty, and obvious
placeholder blocks; review owns whether accepted
documentation explains the value's behavior, purpose, ownership, or
invariants. A direct anonymous default value is documented at its export
statement; re-export barrels inherit documentation from the owner.

This source rule deliberately checks the authored value-export superset. Knip
owns whether an export has a real consumer, generated and proof source remains
owner-controlled, and review owns the semantic quality of accepted
documentation. Type-only and ambient declarations remain TypeScript-owned;
this rule describes authored runtime implementations.

```grit
language js(typescript)

// Restricts the relation to the qualified public implementation faces under active ratchet.
predicate require_exported_value_declarations_have_jsdoc_is_authored_source() {
  $filename <: r".*(?:resources/[^/]+/(?:contract|providers/[^/]+/index)\.ts|services/[^/]+/src/client\.ts)$",
  ! $filename <: r".*/(?:build|dist|fixtures?|generated|proof|test|tests)/.*\.[cm]?[jt]sx?$",
  ! $filename <: r".*\.(?:spec|test)\.[cm]?[jt]sx?$",
  ! $filename <: r".*\.d\.[cm]?ts$"
}

// Detects a declaration with missing, empty, or obvious placeholder adjacent JSDoc.
predicate require_exported_value_declarations_have_jsdoc_lacks_declaration_jsdoc($declaration) {
  $previous = before $declaration,
  or {
    ! $previous <: r"(?s)^/\*\*.*\*/$",
    $previous <: r"(?s)^/\*\*[ *\n\r\t]*\*/$",
    $previous <: r"(?is)^/\*\*[ *\n\r\t]*(?:TODO|TBD|FIXME|PLACEHOLDER|DOCUMENTATION[ \t]+PENDING).*\*/$"
  }
}

or {
  export_statement(declaration=$declaration) as $export where {
    require_exported_value_declarations_have_jsdoc_is_authored_source(),
    $declaration <: or {
      lexical_declaration(),
      variable_declaration(),
      class_declaration(),
      enum_declaration()
    },
    ! $declaration <: r"(?s)^declare\b",
    require_exported_value_declarations_have_jsdoc_lacks_declaration_jsdoc($export)
  },
  export_statement(declaration=$declaration) as $export where {
    require_exported_value_declarations_have_jsdoc_is_authored_source(),
    $declaration <: function_declaration(),
    $declaration <: contains statement_block(),
    require_exported_value_declarations_have_jsdoc_lacks_declaration_jsdoc($export)
  },
  `export default $value` as $export where {
    require_exported_value_declarations_have_jsdoc_is_authored_source(),
    ! $value <: identifier(),
    ! $value <: interface_declaration(),
    ! $value <: type_alias_declaration(),
    require_exported_value_declarations_have_jsdoc_lacks_declaration_jsdoc($export)
  },
  `export namespace $name { $body }` as $export where {
    require_exported_value_declarations_have_jsdoc_is_authored_source(),
    require_exported_value_declarations_have_jsdoc_lacks_declaration_jsdoc($export)
  },
  or {
    `export default $name`,
    `export { $..., $name, $... }`,
    `export { $..., $name as $_, $... }`
  } as $export where {
    require_exported_value_declarations_have_jsdoc_is_authored_source(),
    $program <: contains or {
      lexical_declaration() as $declaration where {
        $declaration <: contains variable_declarator(name=$name),
        ! $declaration <: r"(?s)^declare\b",
        require_exported_value_declarations_have_jsdoc_lacks_declaration_jsdoc($declaration)
      },
      function_declaration(name=$name) as $declaration where {
        $declaration <: contains statement_block(),
        require_exported_value_declarations_have_jsdoc_lacks_declaration_jsdoc($declaration)
      },
      or {
        class_declaration(name=$name),
        enum_declaration(name=$name)
      } as $declaration where {
        ! $declaration <: r"(?s)^declare\b",
        require_exported_value_declarations_have_jsdoc_lacks_declaration_jsdoc($declaration)
      }
    }
  }
}
```

## Matches Fixture

```typescript
// @filename: services/example-service/src/client.ts
export function admitCandidate(): boolean {
  return true;
}

// @filename: resources/example-resource/contract.ts
/** TODO */
export const SearchResource = {};

// @filename: resources/example-resource/providers/example-provider/index.ts
const hash = (value: unknown) => String(value);
export default hash;
```

## Ignores Fixture

```typescript
// @filename: services/example-service/src/client.ts
/** Admits a candidate after service-owned policy validates the request. */
export function admitCandidate(): boolean {
  return true;
}

// @filename: resources/example-resource/providers/example-provider/index.ts
export { admitCandidate } from "./model/policy/admission";
export type { Candidate } from "./model/entities/candidate";

// @filename: resources/example-resource/providers/alternate-provider/index.ts
export interface Candidate {}

// @filename: resources/example-resource/contract.ts
export declare const externalPolicy: string;

// @filename: services/example-service/test/fixture.ts
export const fixture = {};
```
