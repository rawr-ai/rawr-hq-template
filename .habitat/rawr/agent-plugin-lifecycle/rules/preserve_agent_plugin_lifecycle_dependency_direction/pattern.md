---
level: error
---
# Preserve Agent Plugin Lifecycle Dependency Direction

The lifecycle service consumes resource contracts, never concrete providers or
controller implementation. Module ports cannot reintroduce the retired
`internal` bucket; their current public surfaces remain protocols and types. The
qualified CLI projection admits one production value consumer for the service
client: its exact `service-runtime/client.ts` composition root. Other CLI
modules may retain type-only client dependencies, but cannot construct, load,
or relay another service client. Concrete provider construction stays outside the semantic service and release/evidence
projections, in declared CLI binding and provider-projection roots. Release and
evidence projections remain free of filesystem, process, FFI, and provider mechanics.
Module router handlers consume only their local `module` context, and the
service root composes module routers through `impl.router`. Type-only protocol
imports remain available through `ports/*`. Root service capabilities and
service-level models cannot depend upward on a sealed capability module. The
sealed set grows monotonically as module context-direction slices land.
Provider convergence consumes current-main only through the neutral root
dependency contract; it cannot import governance module DTOs, repositories, or
routers.

```grit
language js(typescript)

or {
  import_statement(source=$source) where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/(?:base\.ts|model/.*\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+modules/(?:governance|packaging|releases|vendors)(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:src/)?service/modules/(?:governance|packaging|releases|vendors)(?:/|[\"'])).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/(?:base\.ts|model/.*\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+modules/(?:governance|packaging|releases|vendors)(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:src/)?service/modules/(?:governance|packaging|releases|vendors)(?:/|[\"'])).*"
  },
  `export * from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/(?:base\.ts|model/.*\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+modules/(?:governance|packaging|releases|vendors)(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:src/)?service/modules/(?:governance|packaging|releases|vendors)(?:/|[\"'])).*"
  },
  `import($source)` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/(?:base\.ts|model/.*\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+modules/(?:governance|packaging|releases|vendors)(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:src/)?service/modules/(?:governance|packaging|releases|vendors)(?:/|[\"'])).*"
  },
  import_statement(source=$source) where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/providers/.*\.ts$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+.*governance(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:bindings/governance|(?:src/)?service/modules/governance)(?:/|[\"'])).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/providers/.*\.ts$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+.*governance(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:bindings/governance|(?:src/)?service/modules/governance)(?:/|[\"'])).*"
  },
  `export * from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/providers/.*\.ts$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+.*governance(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:bindings/governance|(?:src/)?service/modules/governance)(?:/|[\"'])).*"
  },
  `import($source)` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/providers/.*\.ts$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+.*governance(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:bindings/governance|(?:src/)?service/modules/governance)(?:/|[\"'])).*"
  },
  import_statement(source=$source) where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/[^/]+/router(?:/.*)?\.ts$",
    $source <: r"^[\"']?(?:\.\./)+impl(?:\.[jt]s)?[\"']?$"
  },
  `context.deps` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/[^/]+/router(?:/.*)?\.ts$"
  },
  import_statement(source=$source) where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/router\.ts$",
    not { $source <: r"^[\"']?(?:\./impl|\./modules/[^/]+/router)(?:\.[jt]s)?[\"']?$" }
  },
  `export const router = $value` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/router\.ts$",
    not { $value <: `impl.router($routers)` }
  },
  `$base.handler($args)` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/router\.ts$"
  },
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
  `export * from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/[^/]+/ports\.ts$",
    $source <: r"^[\"']?\./internal(?:/[^\"']+)?[\"']?$"
  },
  `export { $exports } from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/modules/[^/]+/ports\.ts$",
    $source <: r"^[\"']?\./internal(?:/[^\"']+)?[\"']?$"
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/[^\"']+)?[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/(?:client|bindings/(?:exports|governance|providers|releases))[\"']?$" },
    not { $import <: includes "import type" },
    not { $import <: r"(?s)^import\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*,?\s*\}\s*from.*" }
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/[^\"']+)?[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/(?:client|bindings/(?:exports|governance|providers|releases))[\"']?$" }
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$",
    not { $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/client\.ts$" },
    not { $import <: includes "import type" },
    not { $import <: r"(?s)^import\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*,?\s*\}\s*from.*" }
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$"
  },
  `export { $exports } from $source` as $export where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$",
    not { $export <: includes "export type" },
    not { $export <: r"(?s)^export\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*,?\s*\}\s*from.*" }
  },
  `export * from $source` as $export where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$",
    not { $export <: includes "export type *" }
  },
  `export { $exports } from $source` as $export where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/[^\"']+)?[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/(?:client|bindings/(?:exports|governance|providers|releases))[\"']?$" },
    not { $export <: includes "export type" },
    not { $export <: r"(?s)^export\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*,?\s*\}\s*from.*" }
  },
  `export * from $source` as $export where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/[^\"']+)?[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/(?:client|bindings/(?:exports|governance|providers|releases))[\"']?$" },
    not { $export <: includes "export type *" }
  },
  import_statement(source=$source) where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:@rawr/agent-plugin-lifecycle/(?:src|service)(?:/|[\"'])|(?:\.\./)+.*services/agent-plugin-lifecycle/src/).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:@rawr/agent-plugin-lifecycle/(?:src|service)(?:/|[\"'])|(?:\.\./)+.*services/agent-plugin-lifecycle/src/).*"
  },
  `export * from $source` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:@rawr/agent-plugin-lifecycle/(?:src|service)(?:/|[\"'])|(?:\.\./)+.*services/agent-plugin-lifecycle/src/).*"
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:@rawr/agent-plugin-lifecycle/(?:src|service)(?:/|[\"'])|(?:\.\./)+.*services/agent-plugin-lifecycle/src/).*"
  },
  import_statement(source=$source) where {
    $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/(?:releases|evidence)/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:node:(?:fs(?:/promises)?|path|child_process)|bun:ffi|@rawr/resource-[^/]+/providers/).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/(?:releases|evidence)/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:node:(?:fs(?:/promises)?|path|child_process)|bun:ffi|@rawr/resource-[^/]+/providers/).*"
  },
  `export * from $source` where {
    $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/(?:releases|evidence)/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:node:(?:fs(?:/promises)?|path|child_process)|bun:ffi|@rawr/resource-[^/]+/providers/).*"
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/(?:releases|evidence)/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:node:(?:fs(?:/promises)?|path|child_process)|bun:ffi|@rawr/resource-[^/]+/providers/).*"
  },
  import_statement(source=$source) where {
    $filename <: r".*apps/cli/src/lib/agent-plugins/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/[^\"']+/client[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$" }
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/lib/agent-plugins/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/[^\"']+/client[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$" }
  }
}
```

## Matches Fixture

```typescript
// @filename: services/agent-plugin-lifecycle/src/service/base.ts
import type { ReleaseRuntime } from "./modules/releases/ports";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/packaging.ts
import type { PackagingRuntime } from "../../modules/packaging/ports";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/release-export.ts
export { type ReleaseRuntime } from "../../modules/releases/ports";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/release-star.ts
export * from "../../modules/releases/ports";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/release-dynamic.ts
export const release = import("../../modules/releases/ports");

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/model/policy/current-main-bypass.ts
import type { CurrentMainSelectionResult } from "../../../governance/model/dto/current-main";

export type Selection = CurrentMainSelectionResult;

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/model/current-main-bypass-export.ts
export { type CurrentMainSelectionResult } from "../../governance/model/dto/current-main";

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/model/current-main-bypass-star.ts
export * from "../../governance/model/dto/current-main";

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/model/current-main-bypass-dynamic.ts
export const currentMain = import("../../governance/model/dto/current-main");

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/model/current-main-binding-bypass.ts
import { createGovernanceCurrentMainSelectionReader } from "@rawr/agent-plugin-lifecycle/bindings/governance";

export const currentMain = createGovernanceCurrentMainSelectionReader;

// @filename: services/agent-plugin-lifecycle/src/service/modules/releases/router/check.router.ts
import { impl } from "../../../impl";

export const check = impl.releases.check.handler(async ({ context }) =>
  context.deps.releaseSource.inspect());

// @filename: services/agent-plugin-lifecycle/src/service/router.ts
import { check } from "./modules/releases/router/check.router";

export const router = { releases: { check } };

// @filename: services/agent-plugin-lifecycle/src/service/router.ts
import { impl } from "./impl";

export const router = impl.router({
  releases: { check: impl.releases.check.handler(async () => ({ kind: "Eligible" })) },
});

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/internal/provider.ts
import { makeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";

export const provider = makeProvider;

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/model/provider-export.ts
export { makeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/model/provider-star.ts
export * from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/model/provider-dynamic.ts
export const provider = import("@rawr/resource-native-agent-provider/providers/codex-effect-platform-node");

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/ports.ts
export { createResourceCodexProviderAdapter } from "./internal";

// @filename: services/agent-plugin-lifecycle/src/service/modules/exports/ports.ts
export { type ExportPlan, createExportOwner } from "./internal/owner-protocol";

// @filename: apps/cli/src/lib/agent-plugins/value-port-bypass.ts
import { createResourceCodexProviderAdapter } from "@rawr/agent-plugin-lifecycle/ports/providers";

export const adapter = createResourceCodexProviderAdapter;

// @filename: apps/cli/src/lib/agent-plugins/retired-packaging-binding.ts
import { createResourcePackageOutputRuntime } from "@rawr/agent-plugin-lifecycle/bindings/packaging";

export const packaging = createResourcePackageOutputRuntime;

// @filename: apps/cli/src/lib/agent-plugins/value-surface-bypass.ts
import { contentDigest } from "@rawr/agent-plugin-lifecycle/release";

export const digest = contentDigest;

// @filename: apps/cli/src/lib/agent-plugins/value-surface-dynamic.ts
export const release = import("@rawr/agent-plugin-lifecycle/release");

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
import { router } from "@rawr/agent-plugin-lifecycle/service/modules/releases/router";

export const release = router;

// @filename: apps/cli/src/lib/agent-plugins/internal-bypass-reexport.ts
export { router } from "@rawr/agent-plugin-lifecycle/service/modules/releases/router";

// @filename: apps/cli/src/lib/agent-plugins/internal-bypass-star.ts
export * from "@rawr/agent-plugin-lifecycle/service/modules/releases/router";

// @filename: apps/cli/src/lib/agent-plugins/internal-bypass-dynamic.ts
export const release = import("@rawr/agent-plugin-lifecycle/service/modules/releases/router");

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/releases/evidence-filesystem.ts
import { readFile } from "node:fs/promises";

export const readEvidence = readFile;

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/releases/evidence-filesystem-reexport.ts
export { readFile } from "node:fs/promises";

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/releases/evidence-filesystem-star.ts
export * from "node:fs/promises";

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/releases/evidence-filesystem-dynamic.ts
export const filesystem = import("node:fs/promises");

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/evidence/provider-bypass.ts
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

export const repository = makeNodeArtifactRepositoryAsyncPort();

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/shadow-client.ts
import { createClient } from "@rawr/alternate-lifecycle/client";

export const client = createClient;

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/shadow-client-dynamic.ts
export const client = import("@rawr/alternate-lifecycle/client");

// @filename: apps/cli/src/lib/agent-plugins/shadow-lifecycle-client.ts
import { createClient, type Client } from "@rawr/agent-plugin-lifecycle/client";

export const client: typeof createClient | undefined = undefined;
export type LifecycleClient = Client;

// @filename: apps/cli/src/lib/agent-plugins/shadow-lifecycle-client.tsx
import { createClient } from "@rawr/agent-plugin-lifecycle/client";

export const client = createClient;

// @filename: apps/cli/src/lib/agent-plugins/shadow-lifecycle-client-dynamic.ts
export const client = import("@rawr/agent-plugin-lifecycle/client");

// @filename: apps/cli/src/lib/agent-plugins/shadow-lifecycle-client-reexport.ts
export { createClient } from "@rawr/agent-plugin-lifecycle/client";

// @filename: apps/cli/src/lib/agent-plugins/shadow-lifecycle-client-mixed-reexport.ts
export { type Client, createClient } from "@rawr/agent-plugin-lifecycle/client";

// @filename: apps/cli/src/lib/agent-plugins/shadow-lifecycle-client-star.ts
export * from "@rawr/agent-plugin-lifecycle/client";

// @filename: apps/cli/src/lib/agent-plugins/mixed-release-import.ts
import {
  type ContentAuthority,
  contentDigest,
} from "@rawr/agent-plugin-lifecycle/release";

export type Authority = ContentAuthority;
export const digest = contentDigest;
```

## Ignores Fixture

```typescript
// @filename: services/agent-plugin-lifecycle/src/service/modules/releases/router/check.router.ts
import { module } from "../module";

export const check = module.check.handler(async ({ context }) =>
  context.source.inspect());

// @filename: services/agent-plugin-lifecycle/src/service/router.ts
import { router as releases } from "./modules/releases/router";
import { impl } from "./impl";

export const router = impl.router({ releases });

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/ports.ts
import type { NativeAgentProvider } from "@rawr/resource-native-agent-provider";

import type { CurrentMainSelectionReader } from "../../model/dependencies/current-main";

export type * from "./ports/domain-projection";
export type { NativeProviderAdapter } from "./ports/native-provider-adapter";
export { type ProviderTarget, type ProviderInventory } from "./ports/provider-state";
export type ProviderPort = NativeAgentProvider;
export type CurrentMain = CurrentMainSelectionReader;

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

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/client.ts
import { createClient, type Client } from "@rawr/agent-plugin-lifecycle/client";

export const client = createClient;
export type LifecycleClient = Client;

// @filename: apps/cli/src/lib/agent-plugins/commands/binding.ts
import type { Client } from "@rawr/agent-plugin-lifecycle/client";

export type LifecycleClient = Client;

// @filename: apps/cli/src/lib/agent-plugins/commands/inline-client-protocol.ts
import {
  type Client,
  type CreateClientOptions,
} from "@rawr/agent-plugin-lifecycle/client";

export type LifecycleClient = Client;
export type LifecycleClientOptions = CreateClientOptions;

// @filename: apps/cli/src/lib/agent-plugins/commands/client-protocol-export.ts
export type { Client } from "@rawr/agent-plugin-lifecycle/client";

// @filename: apps/cli/src/lib/agent-plugins/commands/client-protocol-inline-export.ts
export {
  type Client,
  type CreateClientOptions,
} from "@rawr/agent-plugin-lifecycle/client";

// @filename: apps/cli/src/lib/agent-plugins/commands/client-protocol-star.ts
export type * from "@rawr/agent-plugin-lifecycle/client";

// @filename: apps/cli/src/lib/agent-plugins/inline-release-protocol.ts
import {
  type ContentAuthority,
  type ReleaseSetDigest,
} from "@rawr/agent-plugin-lifecycle/release";

export type Authority = ContentAuthority;
export type SetDigest = ReleaseSetDigest;

// @filename: apps/cli/src/lib/agent-plugins/bindings/providers.ts
import { createResourceCodexProviderAdapter } from "@rawr/agent-plugin-lifecycle/bindings/providers";

export const adapter = createResourceCodexProviderAdapter;

// @filename: apps/cli/src/lib/agent-plugins/bindings/releases.ts
export {
  createMechanicalEvidenceHandle,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";

// @filename: apps/cli/src/lib/agent-plugins/bindings/output/artifact-repository.ts
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

export const repository = makeNodeArtifactRepositoryAsyncPort();
```
