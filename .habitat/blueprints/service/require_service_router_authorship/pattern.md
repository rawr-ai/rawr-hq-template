---
level: error
tags: [orpc, service, router, authorship]
---
# Require Service Router Authorship

Operation leaves author behavior from the matching configured module operation.
Module and root router spines remain composition-only.
When an operation name is an ECMAScript reserved word, the leaf uses the exact
language-required `<name>Operation` local binding and aliases only that binding
to the filename-mapped public export; its index imports the same public name
into the same local binding. This is not a general alias form.

```grit
language js(typescript)

// Checks that a leaf owns one matching operation or native plain-object group.
function require_service_router_authorship_leaf_status($filename, $operation, $value) js {
  const match = $filename.text.match(/\/router\/([^/]+)\.ts$/);
  if (!match) return "wrong-operation";
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(match[1])) {
    return "noncanonical-filename";
  }
  const expected = match[1].replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  if (expected !== $operation.text) return "wrong-operation";
  const source = $value.text.replace(/\s+/g, "");
  const hasHandler = source.includes(".effect(") || source.includes(".handler(");
  if (!hasHandler) return "missing-handler";
  const direct = source.match(
    /^module((?:\.[A-Za-z_$][A-Za-z0-9_$]*)+)\.(?:use|effect|handler)\(/,
  );
  if (direct) {
    const properties = direct[1].split(".");
    const finalProperty = properties[properties.length - 1];
    return finalProperty === expected ? "ok" : "wrong-operation";
  }
  const groupRoots = [
    ...source.matchAll(
      /module((?:\.[A-Za-z_$][A-Za-z0-9_$]*)+)\.(?:use|effect|handler)\(/g,
    ),
  ].map((match) => match[1]);
  const prefix = `.${expected}.`;
  return source.startsWith("{") &&
    groupRoots.length > 0 &&
    groupRoots.every((root) => root.startsWith(prefix))
    ? "ok"
    : "wrong-root";
}

// Admits one exact local binding for an ECMAScript-reserved public operation.
function require_service_router_authorship_reserved_binding_status($local, $operation) js {
  const reserved = new Set([
    "await", "break", "case", "catch", "class", "const", "continue",
    "debugger", "default", "delete", "do", "else", "enum", "export",
    "extends", "false", "finally", "for", "function", "if", "implements",
    "import", "in", "instanceof", "interface", "let", "new", "null",
    "package", "private", "protected", "public", "return", "static", "super",
    "switch", "this", "throw", "true", "try", "typeof", "var", "void",
    "while", "with", "yield",
  ]);
  return reserved.has($operation.text) &&
    $local.text === `${$operation.text}Operation`
    ? "ok"
    : "wrong-operation";
}

// Selects operation-authoring router leaves.
predicate require_service_router_authorship_is_leaf() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.ts$",
  not { $filename <: r".*/router/index\.ts$" }
}

// Selects composition-only module and root router spines.
predicate require_service_router_authorship_is_composer() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router\.ts|modules/[^/]+/router/index\.ts)$"
}

// Selects the module access point that composes local operation leaves.
predicate require_service_router_authorship_is_module_composer() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/index\.ts$"
}

// Recognizes a direct semantic leaf source from its module router access point.
predicate require_service_router_authorship_is_leaf_source($source) {
  $source <: r"^[\"']\./[a-z][a-z0-9]*(?:-[a-z0-9]+)*[\"']$",
  not { $source <: r"^[\"']\./index[\"']$" }
}

// Checks that a direct leaf import maps its kebab-case source to one binding.
function require_service_router_authorship_entrypoint_import_status($source, $operation) js {
  const match = $source.text.match(/^["']\.\/([^/"']+)["']$/);
  if (!match || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(match[1])) {
    return "noncanonical-source";
  }
  const expected = match[1].replace(
    /-([a-z0-9])/g,
    (_all, value) => value.toUpperCase(),
  );
  return expected === $operation.text ? "ok" : "wrong-binding";
}

// Proves one filename-mapped direct leaf import at the router access point.
predicate require_service_router_authorship_is_canonical_leaf_import($statement) {
  or {
    and {
      $statement <: `import { $operation } from $source`,
      $status = require_service_router_authorship_entrypoint_import_status(
        source=$source,
        operation=$operation
      ),
      $status <: includes "ok"
    },
    and {
      $statement <: `import { $operation as $local } from $source`,
      $source_status = require_service_router_authorship_entrypoint_import_status(
        source=$source,
        operation=$operation
      ),
      $source_status <: includes "ok",
      $binding_status = require_service_router_authorship_reserved_binding_status(
        local=$local,
        operation=$operation
      ),
      $binding_status <: includes "ok"
    }
  }
}

// Matches a source alias kind to the importing service lane.
predicate require_service_router_authorship_is_same_kind($lane, $alias_kind) {
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

// Recognizes an operation leaf cycling through its own router access point.
predicate require_service_router_authorship_is_own_index_source($source) {
  $filename <: r".*(services|plugins/server/api)/([^/]+)/src/service/modules/([^/]+)/router/[^/]+\.ts$"($lane, $owner, $module),
  or {
    $source <: r"^[\"'](?:\.|\./|\./index(?:\.[cm]?[jt]s)?|\.\./router(?:/|/index(?:\.[cm]?[jt]s)?)?)[\"']$",
    and {
      $source <: r"^[\"']#([^/]+)-(service|api)/modules/([^/]+)/router(?:/|/index(?:\.[cm]?[jt]s)?)?[\"']$"($alias_owner, $alias_kind, $target),
      $alias_owner <: $owner,
      require_service_router_authorship_is_same_kind(
        lane=$lane,
        alias_kind=$alias_kind
      ),
      $target <: $module
    }
  }
}

// Recognizes runtime declarations crossing a router-leaf export boundary.
predicate require_service_router_authorship_is_runtime_export($export) {
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

// Recognizes the leaf's one operation export mapped from its kebab-case filename.
predicate require_service_router_authorship_is_operation_export($export) {
  $export <: `export const $operation = $value`,
  $status = require_service_router_authorship_leaf_status(
    filename=$filename,
    operation=$operation,
    value=$value
  ),
  $status <: includes "ok"
}

or {
  program(statements=$body) where {
    require_service_router_authorship_is_leaf(),
    not {
      or {
        $body <: contains `export const $operation = $value` where {
          $status = require_service_router_authorship_leaf_status(
            filename=$filename,
            operation=$operation,
            value=$value
          ),
          $status <: includes "ok"
        },
        and {
          $body <: contains `const $local = $value`,
          $body <: contains `export { $local as $operation }`,
          $operation_status = require_service_router_authorship_leaf_status(
            filename=$filename,
            operation=$operation,
            value=$value
          ),
          $operation_status <: includes "ok",
          $binding_status = require_service_router_authorship_reserved_binding_status(
            local=$local,
            operation=$operation
          ),
          $binding_status <: includes "ok"
        }
      }
    }
  },
  export_statement() as $export where {
    require_service_router_authorship_is_leaf(),
    require_service_router_authorship_is_runtime_export(export=$export),
    not {
      require_service_router_authorship_is_operation_export(export=$export)
    }
  },
  `export { $specifiers }` as $export where {
    require_service_router_authorship_is_leaf(),
    not {
      $export <: `export { $local as $operation }`,
      $program <: contains `const $local = $value`,
      $operation_status = require_service_router_authorship_leaf_status(
        filename=$filename,
        operation=$operation,
        value=$value
      ),
      $operation_status <: includes "ok",
      $binding_status = require_service_router_authorship_reserved_binding_status(
        local=$local,
        operation=$operation
      ),
      $binding_status <: includes "ok"
    }
  },
  export_statement(source=$source) where {
    require_service_router_authorship_is_leaf(),
    $source <: string()
  },
  `export default $value` where {
    require_service_router_authorship_is_leaf()
  },
  `$receiver.$operation.$method($handler)` where {
    require_service_router_authorship_is_composer(),
    $method <: r"^(?:effect|handler)$"
  },
  import_statement() as $statement where {
    require_service_router_authorship_is_module_composer(),
    not {
      require_service_router_authorship_is_canonical_leaf_import(
        statement=$statement
      )
    }
  },
  import_statement(source=$source) where {
    require_service_router_authorship_is_leaf(),
    require_service_router_authorship_is_own_index_source(source=$source)
  }
}
```

## Matches a leaf authored from the wrong operation

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
export const get = module.list.handler(listJobs);
```

## Matches a noncanonical leaf filename

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/find_by_id.ts
import { module } from "../module";
export const find_by_id = module.find_by_id.handler(findJob);
```

## Matches a nested atomic leaf authored from the wrong terminal operation

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/router/submit.ts
import { module } from "../module";
export const submit = module.jobs.status.handler(submitJob);
```

## Matches operation authorship in a composer

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
export const get = module.get.handler(getJob);
export const router = impl.catalog.router({ get });
```

## Matches implementation acquisition from a module router access point

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
import { module } from "../module";
import { get } from "./get";
export const router = { get };
```

## Matches an operation leaf cycling through its router access point

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { router } from ".";
import { module } from "../module";
export const get = module.get.handler(getJob);
```

## Matches an extra runtime export from a leaf

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
export const get = module.get.handler(getJob);
export const preview = module.get.handler(previewJob);
```

## Matches a runtime export clause from a leaf

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
const preview = module.get.handler(previewJob);
export const get = module.get.handler(getJob);
export { preview };
```

## Matches a deliberate native group rooted outside its filename-mapped group

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/search.ts
import { module } from "../module";
export const search = {
  available: module.search.available.effect(searchAvailable),
  archived: module.catalog.archived.effect(searchArchived),
};
```

## Ignores configured leaf authorship and composition-only routers

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/get.ts
import { module } from "../module";
export const get = module.get
  .use(requireReadAccess)
  .use(loadJob)
  .effect(getJob);
// @filename: services/jobs/src/service/modules/catalog/router/find-by-id.ts
import { module } from "../module";
export const findById = module.findById.effect(findJobById);
// @filename: services/jobs/src/service/modules/catalog/router/search.ts
import { module } from "../module";
export const search = {
  available: module.search.available.effect(searchAvailable),
  archived: module.search.archived.effect(searchArchived),
};
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
import { get } from "./get";
import { search } from "./search";
export const router = { get, search };
// @filename: services/jobs/src/service/router.ts
import { router as catalog } from "#jobs-service/modules/catalog/router";
import { impl } from "./impl";
export const router = impl.router({ catalog });
```

## Ignores a nested module router access point

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/router/index.ts
import { status } from "./status";
import { submit } from "./submit";
import { submitBatch } from "./submit-batch";
export const router = {
  jobs: {
    submit,
    submitBatch,
    status,
  },
};
```

An unimported sibling leaf is intentionally outside this source relation.
Knip owns whether such a file is unreachable.

## Ignores a nested one-operation leaf

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/collect/router/submit.ts
import { module } from "../module";
export const submit = module.jobs.submit.handler(submitJob);
```
