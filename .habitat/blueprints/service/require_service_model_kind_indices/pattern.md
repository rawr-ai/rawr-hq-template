---
level: error
tags: [service, model, kind, index]
---
# Require Service Model Kind Indices

Every model-kind `index.ts` is a private, curated index for exactly that kind.
It contains only explicit named re-exports from direct sibling leaves. It does
not import, execute, star-export, reach to another kind, or flatten the service
or module hierarchy.

Files inside the same model owner keep their concrete dependency edges visible
with direct leaf imports. In particular, a leaf never imports its own kind
index. Contracts, modules, and routers may consume the kind index when they
cross into the model.

```grit
language js(typescript)

// Selects each required kind-local index module.
predicate is_model_kind_index() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:model/[^/]+|modules/[^/]+/model/[^/]+)/index\.ts$"
}

// Selects model leaves that must keep direct dependency edges.
predicate is_model_kind_leaf() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:model/[^/]+|modules/[^/]+/model/[^/]+)/[^/]+\.ts$",
  ! $filename <: r".*/index\.ts$"
}

// Restricts an index export to a direct sibling other than itself.
predicate is_direct_sibling_source($source) {
  $source <: r"^[\"']\./[^/\"']+[\"']$",
  not { $source <: r"^[\"']\./index(?:\.ts)?[\"']$" }
}

// Recognizes one explicit named re-export from a direct sibling.
predicate is_explicit_sibling_reexport($statement) {
  or {
    $statement <: `export { $... } from $source`,
    $statement <: `export type { $... } from $source`
  },
  is_direct_sibling_source(source=$source)
}

// Recognizes a relative import of another model kind's index module.
predicate is_relative_model_kind_index($source) {
  $source <: r"^[\"']\.\./[^/]+(?:/index)?[\"']$"
}

// Recognizes a current-owner alias to any model-kind index in the same owner.
predicate is_owner_model_index_alias($source) {
  or {
    and {
      $filename <: r".*services/([^/]+)/src/service/model/[^/]+/[^/]+\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-service/model/[^/]+(?:/index)?[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*services/([^/]+)/src/service/modules/([^/]+)/model/[^/]+/[^/]+\.ts$"($owner, $module_name),
      $source <: r"^[\"']#([^/]+)-service/modules/([^/]+)/model/[^/]+(?:/index)?[\"']$"($alias_owner, $alias_module),
      $alias_owner <: $owner,
      $alias_module <: $module_name
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/model/[^/]+/[^/]+\.ts$"($owner),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?model/[^/]+(?:/index)?[\"']$"($alias_owner),
      $alias_owner <: $owner
    },
    and {
      $filename <: r".*plugins/server/api/([^/]+)/src/service/modules/([^/]+)/model/[^/]+/[^/]+\.ts$"($owner, $module_name),
      $source <: r"^[\"']#([^/]+)-api/(?:service/)?modules/([^/]+)/model/[^/]+(?:/index)?[\"']$"($alias_owner, $alias_module),
      $alias_owner <: $owner,
      $alias_module <: $module_name
    }
  }
}

or {
  program(statements=$statements) where {
    is_model_kind_index(),
    $statements <: some $statement where {
      not { is_explicit_sibling_reexport(statement=$statement) }
    }
  },
  import_statement(source=$source) where {
    is_model_kind_leaf(),
    or {
      $source <: r"^[\"']\./index(?:\.ts)?[\"']$",
      is_relative_model_kind_index(source=$source),
      is_owner_model_index_alias(source=$source)
    }
  },
  export_statement(source=$source) where {
    is_model_kind_leaf(),
    $source <: string(),
    or {
      $source <: r"^[\"']\./index(?:\.ts)?[\"']$",
      is_relative_model_kind_index(source=$source),
      is_owner_model_index_alias(source=$source)
    }
  }
}
```

## Matches a star-export index

```typescript
// @filename: services/jobs/src/service/model/dto/index.ts
export * from "./job.dto";
```

## Matches a cross-kind index

```typescript
// @filename: services/jobs/src/service/model/dto/index.ts
export { admitJob } from "../policy/admission";
```

## Matches a leaf importing its own index

```typescript
// @filename: services/jobs/src/service/model/dto/job.dto.ts
import type { JobId } from "./index";
```

## Matches a leaf importing its own aliased index

```typescript
// @filename: services/jobs/src/service/model/dto/job.dto.ts
import type { JobId } from "#jobs-service/model/dto/index";
```

## Matches a leaf importing another kind index

```typescript
// @filename: services/jobs/src/service/model/dto/job.dto.ts
import { admitJob } from "../policy";
```

## Matches an aliased kind index without an explicit index segment

```typescript
// @filename: services/jobs/src/service/model/dto/job.dto.ts
import { admitJob } from "#jobs-service/model/policy";
```

## Ignores explicit direct sibling re-exports

```typescript
// @filename: services/jobs/src/service/model/dto/index.ts
export { JobSchema, type Job } from "./job.dto";
export type { JobId } from "./job-id.dto";
```
