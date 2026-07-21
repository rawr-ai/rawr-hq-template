---
level: error
---
# Preserve Agent Plugin Lifecycle Dependency Direction

The lifecycle service consumes resource contracts, never concrete resource
providers, controller implementation, or its own outward host bindings. Module
ports cannot reintroduce the retired `internal` bucket; their remaining public
surfaces stay protocols and types. The qualified CLI projection admits one
production value consumer for the service client: its exact
`service-runtime/client.ts` composition root.
Other CLI modules may retain type-only client dependencies, but cannot
construct, load, or relay another service client. The CLI selects concrete
resource providers; service middleware derives current-main and provider-domain
repositories and adapters under `provided`. Native resource contracts flow
directly from their resource owner into the CLI-native binding. The CLI-local
provider index can flow only into the provider composition root. Pure release algebra
reaches command parsing through
`release`; all other CLI consumers remain type-only. The CLI selects exactly one
raw artifact repository provider and root at the lifecycle client composition
root. Service middleware derives the lifecycle-owned artifact and evidence
semantics under `provided`, and each consuming module projects only its required
artifact capability from that same service-provided context. No release or
output binding can construct, expose, or relay another artifact projection.
Release and evidence projections remain free of filesystem, process, FFI, and
concrete resource-provider mechanics.
Module router handlers consume only their local `module` context, and the
service root composes module routers through `impl.router`. Type-only protocol
imports remain available through `ports/*`. Root service capabilities and
service-level models cannot depend upward on a sealed capability module. The
sealed set grows monotonically as module context-direction slices land.
Provider convergence consumes current-main only through the neutral root
dependency contract; it cannot import governance module DTOs, repositories, or
routers. The CLI has no governance binding: the service composition root derives
that observation directly from the raw content-workspace capability.

```grit
language js(typescript)

or {
  import_statement(source=$source) where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/(?:base\.ts|model/.*\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+modules/(?:governance|packaging|providers|releases|vendors)(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:src/)?service/modules/(?:governance|packaging|providers|releases|vendors)(?:/|[\"'])).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/(?:base\.ts|model/.*\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+modules/(?:governance|packaging|providers|releases|vendors)(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:src/)?service/modules/(?:governance|packaging|providers|releases|vendors)(?:/|[\"'])).*"
  },
  `export * from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/(?:base\.ts|model/.*\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+modules/(?:governance|packaging|providers|releases|vendors)(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:src/)?service/modules/(?:governance|packaging|providers|releases|vendors)(?:/|[\"'])).*"
  },
  `import($source)` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/service/(?:base\.ts|model/.*\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+modules/(?:governance|packaging|providers|releases|vendors)(?:/|[\"'])|@rawr/agent-plugin-lifecycle/(?:src/)?service/modules/(?:governance|packaging|providers|releases|vendors)(?:/|[\"'])).*"
  },
  import_statement(source=$source) where {
    $filename <: r".*services/agent-plugin-lifecycle/src/(?:service/.*|(?:client|index|router|types)\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+.*bindings(?:/|[\"'])|@rawr/agent-plugin-lifecycle/bindings(?:/|[\"'])).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/(?:service/.*|(?:client|index|router|types)\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+.*bindings(?:/|[\"'])|@rawr/agent-plugin-lifecycle/bindings(?:/|[\"'])).*"
  },
  `export * from $source` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/(?:service/.*|(?:client|index|router|types)\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+.*bindings(?:/|[\"'])|@rawr/agent-plugin-lifecycle/bindings(?:/|[\"'])).*"
  },
  `import($source)` where {
    $filename <: r".*services/agent-plugin-lifecycle/src/(?:service/.*|(?:client|index|router|types)\.ts)$",
    $source <: r"^[\"']?(?:(?:\./|\.\./)+.*bindings(?:/|[\"'])|@rawr/agent-plugin-lifecycle/bindings(?:/|[\"'])).*"
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
  `context.provided` where {
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
  import_statement(source=$source) where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/bindings(?:/|[\"']).*"
  },
  `export { $exports } from $source` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/bindings(?:/|[\"']).*"
  },
  `export * from $source` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/bindings(?:/|[\"']).*"
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/bindings(?:/|[\"']).*"
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/[^\"']+)?[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$" },
    not {
      $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/release[\"']?$",
      $filename <: r".*apps/cli/src/lib/agent-plugins/commands/input\.ts$"
    },
    not { $import <: includes "import type" },
    not { $import <: r"(?s)^import\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*,?\s*\}\s*from.*" }
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/[^\"']+)?[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$" }
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
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$" },
    not { $export <: includes "export type" },
    not { $export <: r"(?s)^export\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*,?\s*\}\s*from.*" }
  },
  `export * from $source` as $export where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/agent-plugin-lifecycle(?:/[^\"']+)?[\"']?$",
    not { $source <: r"^[\"']?@rawr/agent-plugin-lifecycle/client[\"']?$" },
    not { $export <: includes "export type *" }
  },
  import_statement(source=$source) where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:\./|\.\./)+(?:[^\"']+/)*bindings/providers(?:/(?:index|native))?(?:\.[jt]s)?[\"']?$",
    not { $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/providers/node-runtime\.ts$" }
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:\./|\.\./)+(?:[^\"']+/)*bindings/providers(?:/(?:index|native))?(?:\.[jt]s)?[\"']?$"
  },
  `export { $exports } from $source` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:\./|\.\./)+(?:[^\"']+/)*bindings/providers(?:/(?:index|native))?(?:\.[jt]s)?[\"']?$"
  },
  `export * from $source` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?(?:\./|\.\./)+(?:[^\"']+/)*bindings/providers(?:/(?:index|native))?(?:\.[jt]s)?[\"']?$"
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
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/resource-agent-plugin-artifact-repository/providers(?:/|[\"']).*",
    not { $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/client\.ts$" }
  },
  `export { $exports } from $source` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/resource-agent-plugin-artifact-repository/providers(?:/|[\"']).*",
    not { $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/client\.ts$" }
  },
  `export * from $source` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/resource-agent-plugin-artifact-repository/providers(?:/|[\"']).*",
    not { $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/client\.ts$" }
  },
  `import($source)` where {
    $filename <: r".*apps/cli/src/.*\.(?:ts|tsx|mts|cts)$",
    $source <: r"^[\"']?@rawr/resource-agent-plugin-artifact-repository/providers(?:/|[\"']).*",
    not { $filename <: r".*apps/cli/src/lib/agent-plugins/service-runtime/client\.ts$" }
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
import type { ProviderTargetReader } from "./modules/providers/model/repositories/provider";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/packaging.ts
import type { PackagingRuntime } from "../../modules/packaging/ports";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/release-export.ts
export { type ReleaseRuntime } from "../../modules/releases/ports";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/release-star.ts
export * from "../../modules/releases/ports";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/release-dynamic.ts
export const release = import("../../modules/releases/ports");

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-relative-import.ts
import type { NativeProviderResourcePort } from "../../../bindings/providers";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-package-import.ts
import type { NativeProviderResourcePort } from "@rawr/agent-plugin-lifecycle/bindings/providers";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-relative-export.ts
export { type NativeProviderResourcePort } from "../../../bindings/providers";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-package-export.ts
export { type NativeProviderResourcePort } from "@rawr/agent-plugin-lifecycle/bindings/providers";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-relative-star.ts
export * from "../../../bindings/providers";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-package-star.ts
export * from "@rawr/agent-plugin-lifecycle/bindings/providers";

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-relative-dynamic.ts
export const provider = import("../../../bindings/providers");

// @filename: services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-package-dynamic.ts
export const provider = import("@rawr/agent-plugin-lifecycle/bindings/providers");

// @filename: services/agent-plugin-lifecycle/src/service/middleware/release-binding-import.ts
import { createResourceArtifactStore } from "../../bindings/releases";

// @filename: services/agent-plugin-lifecycle/src/service/modules/packaging/release-binding-export.ts
export { createResourceArtifactReader } from "@rawr/agent-plugin-lifecycle/bindings/releases";

// @filename: services/agent-plugin-lifecycle/src/service/modules/releases/release-binding-star.ts
export * from "../../../bindings/releases";

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/release-binding-dynamic.ts
export const releases = import("@rawr/agent-plugin-lifecycle/bindings/releases");

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

// @filename: services/agent-plugin-lifecycle/src/service/modules/packaging/router/context-provided.router.ts
export const bypass = context.provided.artifactStore;

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

// @filename: apps/cli/src/lib/agent-plugins/value-port-bypass.ts
import { createResourceCodexProviderAdapter } from "@rawr/agent-plugin-lifecycle/ports/providers";

export const adapter = createResourceCodexProviderAdapter;

// @filename: apps/cli/src/lib/agent-plugins/retired-packaging-binding.ts
import { createResourcePackageOutputRuntime } from "@rawr/agent-plugin-lifecycle/bindings/packaging";

export const packaging = createResourcePackageOutputRuntime;

// @filename: apps/cli/src/lib/agent-plugins/retired-governance-binding-import.ts
import { createGovernanceCurrentMainSelectionReader } from "@rawr/agent-plugin-lifecycle/bindings/governance";

export const currentMain = createGovernanceCurrentMainSelectionReader;

// @filename: apps/cli/src/lib/agent-plugins/retired-governance-binding-dynamic.ts
export const governance = import("@rawr/agent-plugin-lifecycle/bindings/governance");

// @filename: apps/cli/src/lib/agent-plugins/retired-governance-binding-reexport.ts
export { createGovernanceCurrentMainSelectionReader } from "@rawr/agent-plugin-lifecycle/bindings/governance";

// @filename: apps/cli/src/lib/agent-plugins/retired-governance-binding-star.ts
export * from "@rawr/agent-plugin-lifecycle/bindings/governance";

// @filename: apps/cli/src/lib/agent-plugins/provider-binding-bypass.ts
import { NativeProviderResourceFailure } from "@rawr/agent-plugin-lifecycle/bindings/providers";

export const failure = NativeProviderResourceFailure;

// @filename: apps/cli/src/lib/agent-plugins/bindings/providers/native.ts
import type { CompleteTargetIdentityReader } from "@rawr/agent-plugin-lifecycle/bindings/providers";

export type WrongOwnerBridge = CompleteTargetIdentityReader;

// @filename: apps/cli/src/lib/agent-plugins/provider-local-binding-bypass.ts
import { createNodeNativeProviderResource } from "./bindings/providers";

export const native = createNodeNativeProviderResource;

// @filename: apps/cli/src/lib/agent-plugins/provider-local-native-bypass.ts
import { createNodeNativeProviderResource } from "./bindings/providers/native";

export const native = createNodeNativeProviderResource;

// @filename: apps/cli/src/lib/agent-plugins/provider-local-binding-dynamic-bypass.ts
export const native = import("./bindings/providers");

// @filename: apps/cli/src/lib/agent-plugins/provider-local-binding-export-bypass.ts
export { createNodeNativeProviderResource } from "./bindings/providers";

// @filename: apps/cli/src/lib/agent-plugins/provider-local-binding-star-bypass.ts
export * from "./bindings/providers";

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

// @filename: apps/cli/src/lib/agent-plugins/release-binding-bypass.ts
import { createResourceArtifactStore } from "@rawr/agent-plugin-lifecycle/bindings/releases";

// @filename: apps/cli/src/lib/agent-plugins/bindings/output/artifact-repository.ts
import { createResourceArtifactReader } from "@rawr/agent-plugin-lifecycle/bindings/releases";

// @filename: apps/cli/src/lib/agent-plugins/second-artifact-provider.ts
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

// @filename: apps/cli/src/lib/agent-plugins/second-artifact-provider-dynamic.ts
export const artifactProvider = import("@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node");

// @filename: apps/cli/src/lib/agent-plugins/second-artifact-provider-export.ts
export { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

// @filename: apps/cli/src/lib/agent-plugins/second-artifact-provider-star.ts
export * from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

// @filename: apps/cli/src/commands/agent/plugins/second-artifact-provider.ts
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

// @filename: apps/cli/src/lib/agent-plugins/release-binding-dynamic-bypass.ts
export const releaseBindings = import("@rawr/agent-plugin-lifecycle/bindings/releases");

// @filename: apps/cli/src/lib/agent-plugins/release-binding-export-bypass.ts
export { createResourceArtifactStore } from "@rawr/agent-plugin-lifecycle/bindings/releases";

// @filename: apps/cli/src/lib/agent-plugins/release-binding-star-bypass.ts
export * from "@rawr/agent-plugin-lifecycle/bindings/releases";
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

// @filename: services/agent-plugin-lifecycle/src/service/modules/providers/repository/resource-context.ts
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";
import type { NativeProviderResourcePort } from "../../../model/dependencies/providers";

export type RawProviderInputs = Readonly<{
  artifacts: ArtifactRepositoryAsyncPort;
  native: NativeProviderResourcePort;
}>;

// @filename: services/agent-plugin-lifecycle/src/service/middleware/artifacts.ts
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";
import { createResourceArtifactStore } from "../repository/artifact-repository";
import { createResourceMechanicalEvidenceStore } from "../repository/mechanical-evidence";

export const project = (repository: ArtifactRepositoryAsyncPort, repositoryRoot: string) => ({
  artifacts: createResourceArtifactStore({ repository, repositoryRoot }),
  evidence: createResourceMechanicalEvidenceStore({ repository, repositoryRoot }),
});

// @filename: apps/cli/src/lib/agent-plugins/protocol.ts
import type { Deps } from "@rawr/agent-plugin-lifecycle/client";

export type NativeProvider = Deps["providerNativeResource"];

// @filename: apps/cli/src/lib/agent-plugins/release-protocol.ts
export type {
  ContentAuthority,
  MechanicalEvidenceHandleV1,
} from "@rawr/agent-plugin-lifecycle/release";

// @filename: apps/cli/src/lib/agent-plugins/release-protocol-star.ts
export type * from "@rawr/agent-plugin-lifecycle/release";

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/client.ts
import { createClient, type Client } from "@rawr/agent-plugin-lifecycle/client";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

export const client = createClient;
export const artifactRepository = makeNodeArtifactRepositoryAsyncPort();
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

// @filename: apps/cli/src/lib/agent-plugins/commands/input.ts
import {
  createReleaseArtifactRef,
  parseArtifactDigest,
  type ArtifactRef,
} from "@rawr/agent-plugin-lifecycle/release";

export const createRef = createReleaseArtifactRef;
export const parseDigest = parseArtifactDigest;
export type ParsedArtifact = ArtifactRef;

// @filename: apps/cli/src/lib/agent-plugins/bindings/providers/native.ts
import type { Deps } from "@rawr/agent-plugin-lifecycle/client";

export type NativeProvider = Deps["providerNativeResource"];

// @filename: apps/cli/src/lib/agent-plugins/service-runtime/providers/node-runtime.ts
import { createNodeNativeProviderResource } from "../../bindings/providers";

export const native = createNodeNativeProviderResource;

```
