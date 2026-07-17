---
level: error
---
# Preserve Agent Plugin Lifecycle Dependency Direction

The lifecycle service consumes resource contracts, never concrete providers or
controller implementation. Module ports publish protocols and types only. CLI
runtime values enter through the service client or one exact binding facade;
type-only protocol imports remain available through `ports/*`.

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
  `export * from $source` as $export where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/[^/]+/ports\.ts$",
    $source <: r"^[\"']?\./internal(?:/|[\"'])",
    ! $export <: includes "export type *"
  },
  `export { $exports } from $source` as $export where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/[^/]+/ports\.ts$",
    $source <: r"^[\"']?\./internal(?:/|[\"'])",
    ! $export <: includes "export type",
    ! $export <: r"(?s)^export\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*,?\s*\}\s*from"
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*apps/cli/src/.*\.ts$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/|[\"'])",
    ! $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/(?:client|bindings/(?:exports|governance|packaging|providers|releases))[\"']?$",
    ! $import <: includes "import type"
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.ts$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/|[\"'])",
    ! $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/(?:client|bindings/(?:exports|governance|packaging|providers|releases))[\"']?$"
  },
  `export { $exports } from $source` as $export where {
    $filename <: r".*apps/cli/src/.*\.ts$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/|[\"'])",
    ! $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/(?:client|bindings/(?:exports|governance|packaging|providers|releases))[\"']?$",
    ! $export <: includes "export type",
    ! $export <: r"(?s)^export\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*,?\s*\}\s*from"
  },
  `export * from $source` as $export where {
    $filename <: r".*apps/cli/src/.*\.ts$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/|[\"'])",
    ! $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/(?:client|bindings/(?:exports|governance|packaging|providers|releases))[\"']?$",
    ! $export <: includes "export type *"
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

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/ports.ts
export { createResourceCodexProviderAdapter } from "./internal";

// @filename: services/agent-plugin-lifecycle/src/service/modules/releases/ports.ts
export * from "./internal/resource-artifact-repository";

// @filename: services/agent-plugin-lifecycle/src/service/modules/exports/ports.ts
export { type ExportPlan, createExportOwner } from "./internal/owner-protocol";

// @filename: apps/cli/src/lib/agent-plugins/value-port-bypass.ts
import { createResourceCodexProviderAdapter } from "@rawr/agent-plugin-lifecycle/ports/providers";

export const adapter = createResourceCodexProviderAdapter;

// @filename: apps/cli/src/lib/agent-plugins/value-surface-bypass.ts
import { contentDigest } from "@rawr/agent-plugin-lifecycle/release";

export const digest = contentDigest;

// @filename: apps/cli/src/lib/agent-plugins/value-surface-reexport.ts
export {
  createMechanicalEvidenceHandle,
} from "@rawr/agent-plugin-lifecycle/release";

// @filename: apps/cli/src/lib/agent-plugins/mixed-value-surface-reexport.ts
export {
  type MechanicalEvidenceHandleV1,
  createMechanicalEvidenceHandle,
} from "@rawr/agent-plugin-lifecycle/release";

// @filename: apps/cli/src/lib/agent-plugins/value-surface-star.ts
export * from "@rawr/agent-plugin-lifecycle/release";

// @filename: apps/cli/src/lib/agent-plugins/internal-bypass.ts
import { application } from "@rawr/agent-plugin-lifecycle/service/modules/releases/internal/application";

export const release = application;
```

## Ignores Fixture

```typescript
// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/ports.ts
import type { NativeAgentProvider } from "@rawr/resource-native-agent-provider";

export type * from "./internal/domain/projection";
export type { NativeProviderAdapter } from "./internal";
export { type ProviderTarget, type ProviderInventory } from "./internal/domain/state";
export type ProviderPort = NativeAgentProvider;

// @filename: apps/cli/src/lib/agent-plugins/protocol.ts
import type { ProviderLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/ports/providers";

export type Runtime = ProviderLifecycleRuntime;

// @filename: apps/cli/src/lib/agent-plugins/release-protocol.ts
export type {
  ContentAuthority,
  MechanicalEvidenceHandleV1,
} from "@rawr/agent-plugin-lifecycle/release";

// @filename: apps/cli/src/lib/agent-plugins/release-protocol-star.ts
export type * from "@rawr/agent-plugin-lifecycle/release";

// @filename: apps/cli/src/lib/agent-plugins/client.ts
import { createClient } from "@rawr/agent-plugin-lifecycle/client";

export const client = createClient;

// @filename: apps/cli/src/lib/agent-plugins/bindings/providers.ts
import { createResourceCodexProviderAdapter } from "@rawr/agent-plugin-lifecycle/bindings/providers";

export const adapter = createResourceCodexProviderAdapter;

// @filename: apps/cli/src/lib/agent-plugins/bindings/releases.ts
export {
  createMechanicalEvidenceHandle,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
```
