---
level: error
tags: [orpc, service, error-authority]
---
# Require oRPC Error Authority

An exact module `contract.ts` owns its public oRPC error constructors. Outside
that file, the rule rejects direct, aliased, and string-named aliased runtime
`ORPCTaggedError` imports. It also rejects every runtime namespace or default
`effect-orpc` import declaration, including combined and named `default as`
forms. Other vendor runtime exports remain available through named imports,
including beside an inline type-only `ORPCTaggedError` binding. Every governed
import module specifier and imported export name must use its literal spelling.

Router and `impl.ts` files also cannot runtime-import conventional contract or
error modules. The one exception is the exact root `src/service/impl.ts`
using the exact runtime declaration `import { contract } from "./contract"`;
either quote style is admitted through the captured exact source. The
service-relationship packet proves that declaration's native implementer
lineage. A whole `import type` declaration remains available in every supported
form. The inline-type exemption applies only to a named-only import whose every
named specifier is `type`; a runtime default or namespace clause is therefore
still governed.

Every governed import module specifier and imported export name must be written
literally rather than with an ECMAScript escape. In the pinned proven lane,
Grit's import captures retain raw syntax, so the rule closes that evasion path
with one small spelling law instead of installing a custom decoder or claiming
cooked-value comparison. Local import bindings may use any identifier admitted
by the TypeScript parser. This remains a path-convention and import-declaration
shape proof. It deliberately does not resolve bindings or infer runtime access,
callback shape, injected-error provenance, internal failure mapping,
Effect/native control flow, opaque returns, or dataflow semantics.

```grit
language js(typescript)

predicate is_governed_service_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

predicate is_exact_module_contract() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract\.ts$"
}

predicate is_router_or_impl() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:impl|router|modules/[^/]+/(?:impl|router|router/[^/]+))\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

predicate is_canonical_root_impl_contract_import($import, $source) {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$",
  $source <: r"^[\"']\./contract[\"']$",
  $import <: `import { contract } from $source`
}

predicate is_whole_type_only_import($import) {
  $import <: import_statement(type=type())
}

predicate is_named_all_inline_type_import($import) {
  $import <: `import { $... } from $source`,
  $import <: contains import_specifier() as $type_specifier where {
    $type_specifier <: contains type()
  },
  not {
    $import <: contains import_specifier() as $specifier where {
      $specifier <: not contains type()
    }
  }
}

predicate is_permitted_conventional_type_import($import) {
  or {
    is_whole_type_only_import(import=$import),
    is_named_all_inline_type_import(import=$import)
  }
}

predicate imports_runtime_tagged_error_authority($import) {
  $import <: contains import_specifier(name=$name) as $specifier where {
    $name <: or { `ORPCTaggedError`, `"ORPCTaggedError"` },
    $specifier <: not contains type()
  }
}

predicate imports_noncanonical_runtime_vendor_form($import) {
  or {
    $import <: `import * as $namespace from "effect-orpc"`,
    and {
      $import <: contains identifier() as $default,
      $import <: `import $default from "effect-orpc"`
    },
    and {
      $import <: `import $default, { $... } from "effect-orpc"`,
      $default <: identifier()
    },
    and {
      $import <: `import $default, * as $namespace from "effect-orpc"`,
      $default <: identifier()
    },
    $import <: contains import_specifier(name=$name) as $specifier where {
      $name <: or { `default`, `"default"` },
      $specifier <: not contains type()
    }
  }
}

predicate contains_escape_marker($value) {
  $value <: r".*\\.*"
}

predicate imports_escaped_boundary_spelling($import, $source) {
  or {
    contains_escape_marker(value=$source),
    $import <: contains import_specifier(name=$name) where {
      contains_escape_marker(value=$name)
    }
  }
}

predicate is_conventional_contract_or_error_source($source) {
  $source <: r"^[\"'][^\"']*(?:[/\.](?:contract|errors?))(?:[/\.][^\"']*)?[\"']$"
}

or {
  import_statement(source=$source) as $import where {
    is_governed_service_source(),
    imports_escaped_boundary_spelling(import=$import, source=$source)
  },
  import_statement(source=$source) as $import where {
    is_governed_service_source(),
    not { is_exact_module_contract() },
    $source <: r"^[\"']effect-orpc[\"']$",
    not { is_whole_type_only_import(import=$import) },
    or {
      imports_runtime_tagged_error_authority(import=$import),
      imports_noncanonical_runtime_vendor_form(import=$import)
    }
  },
  import_statement(source=$source) as $import where {
    is_router_or_impl(),
    is_conventional_contract_or_error_source(source=$source),
    not {
      is_canonical_root_impl_contract_import(import=$import, source=$source)
    },
    not { is_permitted_conventional_type_import(import=$import) }
  }
}
```

## Matches a noncanonical runtime vendor import

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import EffectORPC, { type ORPCTaggedError } from "effect-orpc";
export type Tagged = ORPCTaggedError;
export const builder = EffectORPC.eoc;
```

## Ignores canonical named vendor imports


```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { eoc, type ORPCTaggedError } from "effect-orpc";
export type Tagged = ORPCTaggedError;
export const builder = eoc;
```
