---
level: error
tags: [orpc, service, boundary, module-isolation]
---
# Require Service Module Isolation

A service root composes module contracts and routers. It does not reach into a
module's implementation, and it does not re-export module source. Relative
imports inside one module may stay inside that module or address service-root
facts, but may not resolve into a sibling module.

This rule governs direct static relative relationships plus RAWR's internal
`#.../modules/...` aliases. It does not classify external package paths or
attempt TypeScript module resolution.

```grit
language js(typescript)

// Classifies a relative source by resolving only its literal dot segments.
function module_isolation_relative_relation($file, $source) js {
  const file = $file.text;
  const rawSource = $source.text;
  const source = rawSource.slice(1, -1);
  if (!source.startsWith(".")) return "not-relative";

  const target = file.split("/");
  target.pop();
  for (const part of source.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      target.pop();
      continue;
    }
    target.push(part);
  }

  const marker = ["src", "service", "modules"];
  const findMarker = (parts) => {
    for (let index = 0; index <= parts.length - marker.length; index += 1) {
      if (marker.every((part, offset) => parts[index + offset] === part)) return index;
    }
    return -1;
  };

  const current = file.split("/");
  const currentMarker = findMarker(current);
  const targetMarker = findMarker(target);
  if (currentMarker < 0 || targetMarker < 0) return "outside-module-tree";

  const currentService = current.slice(0, currentMarker).join("/");
  const targetService = target.slice(0, targetMarker).join("/");
  const currentModule = current[currentMarker + marker.length];
  const targetModule = target[targetMarker + marker.length];
  return currentService === targetService && currentModule === targetModule
    ? "same-module"
    : "cross-module";
}

// Scopes the rule to production source at a service root.
predicate module_isolation_is_root_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/src/service/modules/.*",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Scopes the rule to production source owned by one service module.
predicate module_isolation_is_module_source() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

// Recognizes a relative or internal-alias dependency on private module source.
predicate module_isolation_addresses_private_source($source) {
  $source <: r"^[\"'](?:\.|#)[^\"']*modules/[^/]+(?:/[^\"']*)?[\"']$"
}

// Admits only local root composition through the two public module faces.
predicate module_isolation_is_root_composition($import, $source) {
  or {
    and {
      $filename <: r".*/src/service/contract\.ts$",
      $source <: r"^[\"']\./modules/[^/]+/contract[\"']$",
      $import <: `import { contract as $branch } from $source`
    },
    and {
      $filename <: r".*/src/service/router\.ts$",
      $source <: r"^[\"']\./modules/[^/]+/router[\"']$",
      $import <: `import { router as $branch } from $source`
    }
  }
}

// Detects a literal relative edge that resolves into another module.
predicate module_isolation_crosses_relative_sibling($source) {
  $relation = module_isolation_relative_relation(file=$filename, source=$source),
  $relation <: r"^cross-module$"
}

or {
  import_statement(source=$source) as $import where {
    module_isolation_is_root_source(),
    module_isolation_addresses_private_source(source=$source),
    not { module_isolation_is_root_composition(import=$import, source=$source) }
  },
  export_statement(source=$source) where {
    module_isolation_is_root_source(),
    $source <: string(),
    module_isolation_addresses_private_source(source=$source)
  },
  import_statement(source=$source) where {
    module_isolation_is_module_source(),
    or {
      module_isolation_crosses_relative_sibling(source=$source),
      $source <: r"^[\"']#[^\"']*modules/[^/]+(?:/[^\"']*)?[\"']$"
    }
  },
  export_statement(source=$source) where {
    module_isolation_is_module_source(),
    $source <: string(),
    or {
      module_isolation_crosses_relative_sibling(source=$source),
      $source <: r"^[\"']#[^\"']*modules/[^/]+(?:/[^\"']*)?[\"']$"
    }
  }
}
```

## Matches root access to module implementation

```typescript
// @filename: services/jobs/src/service/middleware/catalog.ts
import { repository } from "../modules/catalog/repository";
```

## Matches an ordinary cross-module relationship

```typescript
// @filename: services/jobs/src/service/modules/search/router.ts
import { catalog } from "../catalog/router";
```

## Matches an aliased root relationship

```typescript
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "#catalog-service/modules/catalog/contract";
```

## Ignores root composition

```typescript
// @filename: services/jobs/src/service/contract.ts
import { contract as catalog } from "./modules/catalog/contract";
// @filename: services/jobs/src/service/router.ts
import { router as catalog } from "./modules/catalog/router";
```

## Ignores local and service-root relationships

```typescript
// @filename: services/jobs/src/service/modules/catalog/model/policy/access.ts
import { localRule } from "./local-rule";
import type { JobsContext } from "../../../../model/context";
```
