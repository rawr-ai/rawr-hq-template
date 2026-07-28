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

// Selects operation-authoring router leaves.
predicate require_service_router_authorship_is_leaf() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/[^/]+\.ts$",
  not { $filename <: r".*/router/index\.ts$" }
}

// Selects composition-only module and root router spines.
predicate require_service_router_authorship_is_composer() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router\.ts|modules/[^/]+/(?:router\.ts|router/index\.ts))$"
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
