---
level: error
tags: [service, boundary, consumer, import]
---
# Require Service Public Consumer Sealing

A standalone service exposes deliberate public capability surfaces from its
package client. Its private `#<owner>-service/*` alias belongs only to source
and proof inside the matching `services/<owner>` package. Apps, packages,
plugins, resources, tools, and sibling services must not import, re-export, or
dynamically load that alias or a direct `services/<owner>/src/service` path.

This law owns literal module-loading edges. It does not inspect ordinary path
data or computed module names. Nx independently owns project-kind dependency
direction, while the service topology packet owns the package's public
`client.ts` and private `service/` faces.

```grit
language js(typescript)

// Detects a service-shaped source nested beneath an already selected architecture root.
predicate require_service_public_consumer_sealing_is_nested_service_package_path() {
  $filename <: r"(?:^|.*/)(?:apps|packages|plugins|resources|services|tools)/.*services/[^/]+/(?:src|test)/.*\.[cm]?[jt]sx?$"
}

// Selects source and proof that belong to one exact top-level standalone service package.
predicate require_service_public_consumer_sealing_is_matching_owner_package($alias_owner) {
  $filename <: r".*services/([^/]+)/(?:src|test)/.*\.[cm]?[jt]sx?$"($source_owner),
  not {
    require_service_public_consumer_sealing_is_nested_service_package_path()
  },
  $source_owner <: $alias_owner
}

// Selects source and proof inside any exact top-level standalone service package.
predicate require_service_public_consumer_sealing_is_standalone_service_package() {
  $filename <: r".*services/[^/]+/(?:src|test)/.*\.[cm]?[jt]sx?$",
  not {
    require_service_public_consumer_sealing_is_nested_service_package_path()
  }
}

// Detects a private service alias used outside the matching standalone service package.
predicate require_service_public_consumer_sealing_is_foreign_private_alias($source) {
  or {
    and {
      $source <: r"^[\"']#([^/\"']+)-service(?:/[^\"']*)?[\"']$"($alias_owner),
      not {
        require_service_public_consumer_sealing_is_matching_owner_package(
          alias_owner=$alias_owner
        )
      }
    },
    and {
      $source <: template_string(),
      $source <: not contains template_substitution(),
      $source <: r"^`#([^/`]+)-service(?:/[^`]*)?`$"($alias_owner),
      not {
        require_service_public_consumer_sealing_is_matching_owner_package(
          alias_owner=$alias_owner
        )
      }
    }
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

// Detects a service-owned relative source with the exact sibling-service implementation shape.
predicate require_service_public_consumer_sealing_is_relative_sibling_service_tree_source($source) {
  require_service_public_consumer_sealing_is_standalone_service_package(),
  or {
    $source <: r"^[\"'](?:\.\./)+[^/\"']+/src/service(?:/[^\"']*)?[\"']$",
    and {
      $source <: template_string(),
      $source <: not contains template_substitution(),
      $source <: r"^`(?:\.\./)+[^/`]+/src/service(?:/[^`]*)?`$"
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
    require_service_public_consumer_sealing_is_foreign_private_alias(source=$source),
    require_service_public_consumer_sealing_is_direct_service_tree_source(source=$source),
    require_service_public_consumer_sealing_is_relative_sibling_service_tree_source(
      source=$source
    )
  }
}
```

## Matches foreign private aliases

```typescript
// @filename: plugins/server/api/catalog/src/service/modules/jobs/router/index.ts
import { router } from "#jobs-service/router";

// @filename: services/discovery/src/service/model/ports/jobs.ts
export type { JobRecord } from "#jobs-service/modules/jobs/model/dto/job";

// @filename: apps/server/src/runtime/jobs.ts
const jobs = await import(`#jobs-service/modules/jobs/router`);

// @filename: plugins/catalog/test/fixtures/services/jobs/src/router.ts
import { router as privateRouter } from "#jobs-service/router";

// @filename: services/discovery/src/service/db/fixtures/services/jobs/src/client.ts
import { router as nestedPrivateRouter } from "#jobs-service/router";
```

## Matches direct implementation paths

```typescript
// @filename: tools/ops/src/jobs.ts
const jobs = require("../../../services/jobs/src/service/router");

// @filename: packages/inspection/src/jobs.ts
const jobsPath = require.resolve(`../../services/jobs/src/service/contract`);

// @filename: services/discovery/src/service/jobs.ts
import { router } from "../../../jobs/src/service/router";
```

## Ignores owner-local private aliases and public consumers

```typescript
// @filename: services/jobs/src/client.ts
import { router } from "#jobs-service/router";

// @filename: services/jobs/test/mechanics/client/client.test.ts
import { createJobsStore } from "#jobs-service/db/stores/jobs";

// @filename: plugins/server/api/catalog/src/service/modules/jobs/router/index.ts
import type { Client as JobsClient } from "#jobs/client";

// @filename: tools/db/src/catalog.ts
const migrationDirectory = "services/jobs/src/service/db/migrations";
```
