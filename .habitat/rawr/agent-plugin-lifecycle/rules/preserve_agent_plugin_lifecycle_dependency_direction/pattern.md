---
level: error
---
# Preserve Agent Plugin Lifecycle Dependency Direction

The lifecycle service consumes resource contracts, never concrete provider or
controller implementation. CLI code consumes the lifecycle package only
through declared public subpaths, never through its source or service tree.

```grit
language js(typescript)

or {
  import_statement(source=$source) where {
    $filename <: r".*services/agent-plugin-lifecycle/src/.*\.ts$",
    $source <: r"^[\"']?(?:@rawr/resource-[^/]+/providers/|@rawr/cli(?:/|[\"'])|(?:\.\./)+.*(?:resources/[^/]+/providers/|apps/cli/)).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/.*\.ts$",
    $source <: r"^[\"']?(?:@rawr/resource-[^/]+/providers/|@rawr/cli(?:/|[\"'])|(?:\.\./)+.*(?:resources/[^/]+/providers/|apps/cli/)).*"
  },
  `export * from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/.*\.ts$",
    $source <: r"^[\"']?(?:@rawr/resource-[^/]+/providers/|@rawr/cli(?:/|[\"'])|(?:\.\./)+.*(?:resources/[^/]+/providers/|apps/cli/)).*"
  },
  `import($source)` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/.*\.ts$",
    $source <: r"^[\"']?(?:@rawr/resource-[^/]+/providers/|@rawr/cli(?:/|[\"'])|(?:\.\./)+.*(?:resources/[^/]+/providers/|apps/cli/)).*"
  },
  import_statement(source=$source) where {
    $filename <: r".*apps/cli/src/.*\.ts$",
    $source <: r"^[\"']?(?:@rawr/agent-plugin-lifecycle/(?:src|service)(?:/|[\"'])|(?:\.\./)+.*services/agent-plugin-lifecycle/src/).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*apps/cli/src/.*\.ts$",
    $source <: r"^[\"']?(?:@rawr/agent-plugin-lifecycle/(?:src|service)(?:/|[\"'])|(?:\.\./)+.*services/agent-plugin-lifecycle/src/).*"
  },
  `export * from $source` where {
    $filename <: r".*apps/cli/src/.*\.ts$",
    $source <: r"^[\"']?(?:@rawr/agent-plugin-lifecycle/(?:src|service)(?:/|[\"'])|(?:\.\./)+.*services/agent-plugin-lifecycle/src/).*"
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.ts$",
    $source <: r"^[\"']?(?:@rawr/agent-plugin-lifecycle/(?:src|service)(?:/|[\"'])|(?:\.\./)+.*services/agent-plugin-lifecycle/src/).*"
  }
}
```

## Matches Fixture

```typescript
// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/internal/provider.ts
import { makeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";

export const provider = makeProvider;

// @filename: apps/cli/src/lib/agent-plugins/bypass.ts
import { application } from "@rawr/agent-plugin-lifecycle/service/modules/releases/internal/application";

export const release = application;
```

## Ignores Fixture

```typescript
// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/ports.ts
import type { NativeAgentProvider } from "@rawr/resource-native-agent-provider";

export type ProviderPort = NativeAgentProvider;

// @filename: apps/cli/src/lib/agent-plugins/bindings/providers/native.ts
import type { ProviderLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/ports/providers";

export type Runtime = ProviderLifecycleRuntime;
```
