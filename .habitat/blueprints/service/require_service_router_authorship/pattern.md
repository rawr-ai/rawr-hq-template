---
level: error
tags: [orpc, service, router, authorship]
---
# Require Service Router Authorship

Operation leaves author behavior from the matching configured module operation.
Module and root router spines remain composition-only.

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
  const prefix = `module.${expected}.`;
  const hasHandler = source.includes(".effect(") || source.includes(".handler(");
  if (!hasHandler) return "missing-handler";
  if (source.startsWith(prefix)) return "ok";
  return source.startsWith("{") && source.includes(prefix)
    ? "ok"
    : "wrong-root";
}

// Selects operation-authoring router leaves.
predicate require_service_router_authorship_is_leaf() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.ts$",
  not { $filename <: r".*/router/index\.ts$" }
}

// Selects composition-only module and root router spines.
predicate require_service_router_authorship_is_composer() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router\.ts|modules/[^/]+/(?:router\.ts|router/index\.ts))$"
}

// Selects the plain module operation-tree entrypoint.
predicate require_service_router_authorship_is_module_index() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/index\.ts$"
}

// Proves that a module index statically imports and registers one direct leaf.
predicate require_service_router_authorship_has_registered_leaf($body) {
  $body <: some $statement where {
    $statement <: import_statement(source=$source) as $import,
    $source <: r"^[\"']\./[a-z][a-z0-9]*(?:-[a-z0-9]+)*[\"']$",
    $import <: contains import_specifier(name=$name),
    $body <: contains `export const router = $value` where {
      $value <: contains $name
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
      $body <: contains `export const $operation = $value` where {
        $status = require_service_router_authorship_leaf_status(
          filename=$filename,
          operation=$operation,
          value=$value
        ),
        $status <: includes "ok"
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
  or {
    `export { $specifiers }`,
    `export { $specifiers } from $source`,
    `export default $value`
  } where {
    require_service_router_authorship_is_leaf()
  },
  program(statements=$body) where {
    require_service_router_authorship_is_module_index(),
    not {
      require_service_router_authorship_has_registered_leaf(body=$body)
    }
  },
  `$receiver.$operation.$method($handler)` where {
    require_service_router_authorship_is_composer(),
    $method <: r"^(?:effect|handler)$"
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

## Matches operation authorship in a composer

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
export const get = module.get.handler(getJob);
export const router = impl.catalog.router({ get });
```

## Matches an entrypoint without a direct registered leaf

```typescript
// @filename: services/jobs/src/service/modules/catalog/router/index.ts
export const router = {};
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
