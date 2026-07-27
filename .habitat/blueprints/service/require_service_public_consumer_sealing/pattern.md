---
level: error
tags: [service, boundary, consumer, import]
---
# Require Service Public Consumer Sealing

A standalone service exposes deliberate public capabilities from its package
client. Root source, scripts, apps, packages, plugins, resources, tools, and
sibling services must not import, re-export, or dynamically load a literal
path that visibly enters `services/<owner>/src/service`. A standalone service's
production source also cannot use a relative sibling shortcut into another
`<owner>/src/service` tree.

This law owns literal implementation-tree module sources. The independent
private-alias law owns every `#<owner>-service/*` edge. This law does not inspect
ordinary path data or computed module names. Nx independently owns project-kind
dependency direction, while the service topology packet owns the package's
public `client.ts` and private `service/` faces.

```grit
language js

// Detects a service-shaped source nested beneath an already selected architecture root.
predicate require_service_public_consumer_sealing_is_nested_service_package_path() {
  $filename <: r"(?:^|.*/)(?:apps|packages|plugins|resources|scripts|services|tools)/.*services/[^/]+/src/.*\.[cm]?[jt]sx?$"
}

// Selects production source that belongs to one exact top-level standalone service package.
predicate require_service_public_consumer_sealing_is_standalone_service_production_source() {
  $filename <: r".*services/[^/]+/src/.*\.[cm]?[jt]sx?$",
  not {
    require_service_public_consumer_sealing_is_nested_service_package_path()
  }
}

// Detects a literal module source that visibly names a standalone service implementation tree.
predicate require_service_public_consumer_sealing_is_direct_service_tree_source($source) {
  or {
    $source <: r"^[\"'](?:services/|(?:\./|\.\./)+(?:[^/\"']+/)*services/)[^/\"']+/src/service(?:/[^\"']*)?[\"']$",
    and {
      $source <: template_string(),
      $source <: not contains template_substitution(),
      $source <: r"^`(?:services/|(?:\./|\.\./)+(?:[^/`]+/)*services/)[^/`]+/src/service(?:/[^`]*)?`$"
    }
  }
}

// Detects a production service source that names a lowercase-kebab sibling implementation tree.
predicate require_service_public_consumer_sealing_is_relative_sibling_service_tree_source($source) {
  require_service_public_consumer_sealing_is_standalone_service_production_source(),
  or {
    $source <: r"^[\"'](?:\.\./)+[a-z][a-z0-9]*(?:-[a-z0-9]+)*/src/service(?:/[^\"']*)?[\"']$",
    and {
      $source <: template_string(),
      $source <: not contains template_substitution(),
      $source <: r"^`(?:\.\./)+[a-z][a-z0-9]*(?:-[a-z0-9]+)*/src/service(?:/[^`]*)?`$"
    }
  }
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`,
  `require.resolve($source)`
} where {
  or {
    require_service_public_consumer_sealing_is_direct_service_tree_source(source=$source),
    require_service_public_consumer_sealing_is_relative_sibling_service_tree_source(
      source=$source
    )
  }
}
```

## Matches a root consumer

```typescript
// @filename: service-consumer.ts
import { router } from "./services/jobs/src/service/router";
```

## Matches a direct TSX consumer

```tsx
// @filename: apps/web/src/features/jobs.tsx
import { router } from "../../../../services/jobs/src/service/router";
export const Jobs = () => <output>{String(router)}</output>;
```

## Matches direct implementation paths

```typescript
// @filename: scripts/ops/jobs.ts
const jobs = require("../../services/jobs/src/service/router");

// @filename: packages/inspection/src/jobs.ts
const jobsPath = require.resolve(`../../../services/jobs/src/service/contract`);

// @filename: services/discovery/src/service/jobs.ts
import { router } from "../../../job-search/src/service/router";
```

## Ignores owner-local proof and private aliases

```typescript
// @filename: services/jobs/test/mechanics/client/client.test.ts
import { router } from "../../../src/service/router";

// @filename: apps/web/src/features/jobs-alias.ts
import { router } from "#jobs-service/router";

// @filename: tools/db/src/catalog.ts
const migrationDirectory = "services/jobs/src/service/db/migrations";
```

## Ignores nested test fixtures

```typescript
// @filename: services/discovery/test/fixtures/services/jobs/src/client.test.ts
import { router } from "../../../../job-search/src/service/router";
```
