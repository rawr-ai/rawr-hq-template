---
level: error
tags: [service, contract, orpc, typebox, meaning]
---
# Require Service Contract Authority

Native oRPC owns operation shape. When a contract declares input, output, or
inline public-error data, that schema crosses through the canonical Habitat
`standard` bridge from TypeBox or an owner-local named model schema. Directly
authored TypeBox object properties carry a static nonblank description; named
schemas delegate that meaning to their owner. Input and output are each
optional because oRPC owns procedure arity.

```grit
language js(typescript)

predicate service_v2_contract_authority_leaf() {
  $filename <: r"(?:^|.*/)src/service/modules/[^/]+/contract/[^/]+\.ts$",
  ! $filename <: r"/contract/index\.ts$"
}

function service_v2_contract_authority_root_status($operation, $binding) js {
  const operation = $operation.text.replace(/\s+/g, "");
  return operation === $binding.text || operation.startsWith($binding.text + ".") ? "ok" : "wrong-root";
}

predicate service_v2_contract_authority_native($operation) {
  or {
    and {
      $program <: contains `import { $..., oc, $... } from "@orpc/contract"`,
      $status = service_v2_contract_authority_root_status(operation=$operation, binding=`oc`),
      $status <: includes "ok"
    },
    and {
      $program <: contains `import { $..., oc as $binding, $... } from "@orpc/contract"`,
      $status = service_v2_contract_authority_root_status(operation=$operation, binding=$binding),
      $status <: includes "ok"
    }
  }
}

predicate service_v2_contract_authority_bridge($binding) {
  or {
    and {
      $binding <: `standard`,
      $program <: contains `import { $..., standard, $... } from "@habitat-ai/sdk/service/schema"`
    },
    $program <: contains `import { $..., standard as $binding, $... } from "@habitat-ai/sdk/service/schema"`
  }
}

predicate service_v2_contract_authority_typebox($binding) {
  or {
    and {
      $binding <: `Type`,
      $program <: contains `import { $..., Type, $... } from "typebox"`
    },
    $program <: contains `import { $..., Type as $binding, $... } from "typebox"`
  }
}

predicate service_v2_contract_authority_named($schema) {
  $schema <: identifier()
}

predicate service_v2_contract_authority_raw_schema($schema) {
  or {
    $schema <: `$typebox.$constructor($...)` where {
      service_v2_contract_authority_typebox(binding=$typebox)
    },
    service_v2_contract_authority_named(schema=$schema)
  }
}

predicate service_v2_contract_authority_direct_schema($value) {
  $value <: `$bridge($schema)` where {
    service_v2_contract_authority_bridge(binding=$bridge),
    service_v2_contract_authority_raw_schema(schema=$schema)
  }
}

predicate service_v2_contract_authority_schema($value) {
  or {
    service_v2_contract_authority_direct_schema(value=$value),
    and {
      $value <: identifier(),
      $program <: program(statements=$statements),
      or {
        $statements <: contains `const $value = $adapted`,
        $statements <: contains `const $value: $type = $adapted`
      },
      service_v2_contract_authority_direct_schema(value=$adapted)
    }
  }
}

predicate service_v2_contract_authority_static_text($text) {
  or {
    and { $text <: string(), ! $text <: r"^[\"']\s*[\"']$" },
    and {
      $text <: template_string(),
      ! $text <: r"^`\s*`$",
      $text <: not contains template_substitution()
    }
  }
}

predicate service_v2_contract_authority_described($schema) {
  $schema <: `$typebox.$constructor($...)`,
  service_v2_contract_authority_typebox(binding=$typebox),
  $schema <: call_expression(arguments=$arguments),
  $arguments <: [..., $options],
  $options <: contains `description: $description`,
  service_v2_contract_authority_static_text(text=$description),
  not { $schema <: `$typebox.Optional($_)` }
}

predicate service_v2_contract_authority_property($schema) {
  or {
    service_v2_contract_authority_named(schema=$schema),
    service_v2_contract_authority_described(schema=$schema),
    $schema <: `$typebox.Optional($inner)` where {
      service_v2_contract_authority_typebox(binding=$typebox),
      or {
        service_v2_contract_authority_named(schema=$inner),
        service_v2_contract_authority_described(schema=$inner)
      }
    }
  }
}

predicate service_v2_contract_authority_operation($operation) {
  $operation <: contains or {
    `$builder.input($schema)`,
    `$builder.output($schema)`,
    `$builder.errors($map)`
  }
}

or {
  `export const $name = $operation` where {
    service_v2_contract_authority_leaf(),
    not { $operation <: object() },
    service_v2_contract_authority_operation(operation=$operation),
    not { service_v2_contract_authority_native(operation=$operation) }
  },
  `$name: $operation` where {
    service_v2_contract_authority_leaf(),
    service_v2_contract_authority_operation(operation=$operation),
    not { service_v2_contract_authority_native(operation=$operation) }
  },
  `$builder.$direction($schema)` where {
    service_v2_contract_authority_leaf(),
    $direction <: r"^(?:input|output)$",
    not { service_v2_contract_authority_schema(value=$schema) }
  },
  `$builder.errors({ $properties })` where {
    service_v2_contract_authority_leaf(),
    $properties <: some `$code: { $..., data: $data, $... }`,
    not { service_v2_contract_authority_schema(value=$data) }
  },
  `$typebox.Object({ $properties })` where {
    service_v2_contract_authority_leaf(),
    service_v2_contract_authority_typebox(binding=$typebox),
    $properties <: some `$key: $schema` where {
      not { service_v2_contract_authority_property(schema=$schema) }
    }
  }
}
```

## Canonical

```typescript
import { standard as adapt } from "@habitat-ai/sdk/service/schema";
import { oc as contract } from "@orpc/contract";
import { Type as T } from "typebox";
import { Record } from "../model/dto/record.js";
export const read = contract
  .input(adapt(T.Object({ id: T.String({ description: "Record id." }) })))
  .output(adapt(Record));
```

## Rejected

```typescript
export const read = detached.input(Type.Object({ id: Type.String() }));
```
