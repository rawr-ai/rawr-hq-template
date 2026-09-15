> **Preserved evidence, not current authority.** Historical proposal, not current authority; native-grammar intent coexists with descriptor-based async prescriptions.
> Imported on 2026-09-15. Narrative retained; local links and hard-break syntax normalized.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#authoring-proposal) and [current assessment](../../assessment.md).

# RAWR Authoring SDK Ergonomics Change Document

Status: proposed change document\
Baseline: `RAWR_Effect_Runtime_Realization_System_Canonical_Spec(2).md`, `RAWR_Service_Package_Effect_Spec.md`, `RAWR_System_Architecture_Canonical_Spec_Final.md`\
Authority posture: Runtime Realization remains canonical for runtime boundaries, lifecycle, execution ownership, process runtime, provider acquisition, descriptor/registry mechanics, adapter lowering, harness mounting, diagnostics, import law, and finalization. The Service Package / Effect × oRPC snapshot remains the strongest current service-package proposal for service topology, module ergonomics, repositories, middleware, context projection, semantic observability, and service authoring DX, but it is subordinate where runtime boundaries conflict.

## 0. Executive decision

The current architecture is coherent. The remaining authoring problem is unnecessary visible ceremony and a few non-homologous SDK shapes.

This document proposes a focused public SDK ergonomics pass that keeps the runtime architecture intact while making ordinary authoring simpler, more homologous, and harder for AI agents to misread.

The core rule is:

```text
RAWR boundaries stay explicit.
Derived runtime machinery stays hidden.
Common declarations use direct maps.
Wrappers exist only when adding semantics.
Every projection package is a plugin factory.
Every executable leaf is a lane-native Effect definition.
Native vendors stay behind harnesses/adapters.
Effect stays as the curated local execution algebra.
```

The biggest changes are:

1. Replace public `.factory()` spelling with direct lane builders that return `PluginFactory`.
2. Make plugin package grammar homologous across server, CLI, agent, desktop, async, and web lanes.
3. Replace redundant `useService(...)` / `useResource(...)` in already-named maps with direct service/resource values.
4. Add advanced wrappers only for optionality, instance keys, role/lifetime, policy, and other modifiers.
5. Replace normal `resources.require(Resource)` usage in executable bodies with projected `resources.<key>` values derived from declared resource maps.
6. Add split service dependency maps for service declarations while normalizing back into the canonical runtime `deps` lane.
7. Demote `@rawr/sdk/execution` from ordinary authoring to advanced/internal-facing public surface.
8. Preserve curated `@rawr/sdk/effect` imports in effectful implementation files; do not inject Effect through runtime context.
9. Reword harness/vendor ownership so OCLIF owns command dispatch/parsing/lifecycle/host behavior, not RAWR execution semantics.
10. Add author-facing diagnostic/law wording above raw `RuntimeDiagnostic` records.

## 1. Baseline reconciliation

### 1.1 Runtime baseline

The Runtime Realization spec locks these laws:

```text
Services govern domains.
Plugins project capabilities.
Apps compose products.
Resources define runtime contracts.
Providers implement runtime contracts.
The SDK derives facts.
The compiler plans processes.
Bootgraph orders lifecycle.
The Effect kernel runs local execution.
The process runtime assembles processes.
The registry matches execution.
The execution runtime runs invocations.
Adapters translate surfaces.
Harnesses mount hosts.
Diagnostics observe.
```

It also locks the RAWR execution spine:

```text
service/plugin executable authoring
  -> EffectExecutionDescriptor
  -> SDK normalized authoring graph
  -> runtime compiler
  -> CompiledExecutionPlan
  -> ExecutionRegistry
  -> ProcessExecutionRuntime
  -> EffectRuntimeAccess
  -> ManagedRuntimeHandle
  -> result / exit / diagnostics / telemetry / finalization
```

No authoring SDK change in this document alters that spine.

### 1.2 Service package baseline

The service-package snapshot remains the best service authoring baseline for:

```text
service package topology
service-private file responsibilities
oRPC-native contract and middleware posture
module-local context projection
provided-context middleware
repository return rules
service semantic errors
service observability / analytics split
Effect facade rationale
agent/LLM authoring constraints
```

However, the runtime spec supersedes the snapshot on execution terminal ownership. The runtime spec now locks Effect-only RAWR-owned local execution. Therefore, any prior `.handler(...)` split in the service snapshot is treated as migration history or legacy compatibility, not final canonical authoring.

### 1.3 Architecture hub baseline

The architecture hub confirms the same durable model:

```text
support matter
  -> service truth
  -> runtime projection
  -> app selection
  -> runtime realization
  -> native host mounting
  -> observation
```

The SDK ergonomics pass must not create a new ontology, a new runtime layer, or a second execution path.

## 2. Public SDK surfaces, introduced first

Ordinary authors should understand the SDK by public surface area, not by runtime artifacts.

### 2.1 Ordinary authoring imports

These are the normal public imports that ordinary authors should use.

```text
@rawr/sdk/app
  defineApp(...)
  startApp(...)

@rawr/sdk/effect
  Effect
  TaggedError
  RawrEffect
  execution policy value types where author-facing

@rawr/sdk/service
  defineService(...)
  ServiceOf<...>
  create implementer helpers exposed by service definition
  service dependency modifier helpers where needed

@rawr/sdk/service/schema
  service-owned callable schema facade

@rawr/sdk/runtime/schema
  RuntimeSchema for runtime-carried config/scope/invocation/resource/provider/profile schemas

@rawr/sdk/runtime/resources
  defineRuntimeResource(...)
  resource modifier helpers where author-facing

@rawr/sdk/runtime/providers
  defineRuntimeProvider(...)

@rawr/sdk/runtime/providers/effect
  providerFx

@rawr/sdk/runtime/profiles
  defineRuntimeProfile(...)
  providerSelection(...)

@rawr/sdk/plugins/server
  defineServerApiPlugin(...)
  defineServerInternalPlugin(...)
  service/resource modifier helpers where needed

@rawr/sdk/plugins/server/effect
  implementServerApiPlugin(...)
  implementServerInternalPlugin(...)

@rawr/sdk/plugins/cli
  defineCliCommandPlugin(...)

@rawr/sdk/plugins/cli/effect
  defineCommand(...)

@rawr/sdk/plugins/cli/schema
  cliSchema

@rawr/sdk/plugins/async
  defineAsyncWorkflowPlugin(...)
  defineAsyncSchedulePlugin(...)
  defineAsyncConsumerPlugin(...)
  defineWorkflow(...)
  defineSchedule(...)
  defineConsumer(...)

@rawr/sdk/plugins/async/effect
  defineAsyncStepEffect(...)
  stepEffect(...)

@rawr/sdk/plugins/agent
  defineAgentChannelPlugin(...)
  defineAgentShellPlugin(...)
  defineAgentToolPlugin(...)

@rawr/sdk/plugins/agent/effect
  defineTool(...)

@rawr/sdk/plugins/agent/schema
  toolSchema

@rawr/sdk/plugins/desktop
  defineDesktopMenubarPlugin(...)
  defineDesktopWindowPlugin(...)
  defineDesktopBackgroundPlugin(...)

@rawr/sdk/plugins/desktop/effect
  defineDesktopBackground(...)
  defineDesktopWindowAction(...)
  defineDesktopMenubarAction(...), if needed

@rawr/sdk/plugins/web
  defineWebAppPlugin(...)

@rawr/sdk/plugins/web/effect
  web-local RAWR execution helpers where sanctioned
```

### 2.2 Advanced/internal-facing public surface

`@rawr/sdk/execution` should remain available only for advanced SDK integration, generated code, diagnostics tooling, or companion specs. It should not be documented as ordinary authoring.

Better classification:

```text
@rawr/sdk/execution
  advanced / integration-facing
  not ordinary service/plugin/app authoring
```

Reason: ordinary authors should write `.effect(function*)` or lane-native `effect: function*` leaves. They should not import or construct `ExecutionDescriptor`, `ExecutionDescriptorRef`, `ExecutionDescriptorTable`, `CompiledExecutionPlan`, `ExecutionRegistry`, `ProcessExecutionRuntime`, or `EffectRuntimeAccess`.

### 2.3 Runtime internals remain invisible

Ordinary authoring must not import from:

```text
packages/core/runtime/**
packages/core/sdk/src/**/internal/**
effect
effect-orpc
@effect/*
```

The curated `Effect` facade is imported from `@rawr/sdk/effect`. Raw Effect runtime authority stays in runtime substrate and SDK internals.

## 3. Non-negotiable authoring laws

These laws anchor the ergonomics changes.

```text
Apps select plugin factories.
Plugin factories collect lane-native definitions.
Lane-native definitions contain Effect executable leaves.
Runtime derives descriptors from leaves.
Harnesses mount lowered payloads.
```

```text
If an enclosing field already tells us the kind, do not require a helper that repeats the kind.
Use helpers only when they add information.
```

```text
Declaration is cold and derivable.
Execution receives projected values from declared facts.
Executable bodies are never inspected or executed to discover dependencies.
```

```text
Effect is an imported authoring algebra.
Effect is not request context.
Effect is not injected through `ctx`.
```

```text
OCLIF, Elysia, Inngest, OpenShell, desktop hosts, and web hosts are native interiors behind RAWR adapter/harness boundaries.
Authors do not import host frameworks for RAWR-owned execution.
```

## 4. Change set A — Public SDK surface tiers and import discipline

### Now

The specs list `@rawr/sdk/execution` among public surfaces. That is technically true, but it risks training authors and agents to import execution nouns directly.

Problematic ordinary authoring:

```ts
import type { ExecutionDescriptorRef } from "@rawr/sdk/execution";
import type { ExecutionBoundaryKind } from "@rawr/sdk/execution";
```

### Simple better

Document `@rawr/sdk/execution` as advanced/integration-facing only.

Ordinary service procedure:

File: `services/work-items/src/service/modules/items/router.ts`

```ts
import { Effect } from "@rawr/sdk/effect";
import { module } from "./module";

export const router = module.router({
  create: module.create.effect(function* ({ input, context, errors }) {
    if (input.title.trim().length === 0) {
      return yield* Effect.fail(
        errors.INVALID_WORK_ITEM_TITLE({
          data: { title: input.title },
        }),
      );
    }

    return yield* context.repo.insert({
      workspaceId: context.workspaceId,
      title: input.title.trim(),
      description: input.description,
      createdAt: context.clock.nowIso(),
    });
  }),
});
```

The author never names a descriptor.

### Advanced better

Generated code or diagnostic tooling may import execution types:

File: `packages/core/sdk/src/generated/diagnostics/execution-inspection.ts`

```ts
import type { ExecutionDescriptorRef } from "@rawr/sdk/execution";

export function explainExecutionRef(ref: ExecutionDescriptorRef): string {
  switch (ref.boundary) {
    case "plugin.cli-command":
      return `CLI command ${ref.commandId}`;
    case "service.procedure":
      return `Service procedure ${ref.procedurePath}`;
    default:
      return ref.executionId;
  }
}
```

This is integration tooling, not ordinary authoring.

### Backend changes

No runtime artifact changes.

SDK documentation and export classification change:

```text
packages/core/sdk/src/execution/**
  remains public for generated/advanced integrations
  removed from ordinary authoring examples
```

Add static diagnostic:

```text
code: sdk.execution-import.ordinary-authoring-discouraged
severity: warning initially, error only if a stricter profile wants it
repair: remove execution import; use lane-native `.effect(...)` helpers
```

### Typing impact

None on runtime types. This is a documentation and linting boundary change.

## 5. Change set B — Drop `.factory()` from ordinary plugin authoring

### Now

Current examples use:

File: `plugins/server/api/work-items/src/plugin.ts`

```ts
export const createPlugin = defineServerApiPlugin.factory()({
  capability: "work-items",
  services: {
    workItems: useService(WorkItemsService),
  },
  api() {
    return createWorkItemsPublicRouter();
  },
});
```

The `.factory()` layer is not architecturally necessary. The runtime needs a `PluginFactory`; it does not need the public spelling to expose an extra factory builder method.

### Simple better

Make lane plugin builders return `PluginFactory` directly.

File: `plugins/server/api/work-items/src/plugin.ts`

```ts
import { defineServerApiPlugin } from "@rawr/sdk/plugins/server";
import { service as WorkItemsService } from "@rawr/services/work-items";
import { createWorkItemsPublicRouter } from "./router";

export const createPlugin = defineServerApiPlugin({
  capability: "work-items",
  routeBase: "/work-items",

  services: {
    workItems: WorkItemsService,
  },

  api() {
    return createWorkItemsPublicRouter();
  },
});
```

App composition remains unchanged.

File: `apps/hq/rawr.hq.ts`

```ts
import { defineApp } from "@rawr/sdk/app";
import { createPlugin as workItemsPublicApi } from "@rawr/plugins/server/api/work-items";

export const hqApp = defineApp({
  id: "hq",
  plugins: [
    workItemsPublicApi(),
  ],
});
```

### Advanced better: optioned plugin factory

File: `plugins/server/api/work-items/src/plugin.ts`

```ts
import { defineServerApiPlugin } from "@rawr/sdk/plugins/server";
import { service as WorkItemsService } from "@rawr/services/work-items";
import { createWorkItemsPublicRouter } from "./router";

export interface WorkItemsApiPluginOptions {
  readonly routeBase?: string;
  readonly includeDeprecatedRoutes?: boolean;
}

export const createPlugin = defineServerApiPlugin.withOptions(
  (options: WorkItemsApiPluginOptions) => ({
    capability: "work-items",
    routeBase: options.routeBase ?? "/work-items",

    services: {
      workItems: WorkItemsService,
    },

    api() {
      return createWorkItemsPublicRouter({
        includeDeprecatedRoutes: options.includeDeprecatedRoutes ?? false,
      });
    },
  }),
);
```

App composition:

File: `apps/hq/rawr.hq.ts`

```ts
plugins: [
  workItemsPublicApi({
    routeBase: "/api/work-items",
    includeDeprecatedRoutes: false,
  }),
]
```

### Advanced better: generated/plugin-family helper

Grouped plugin helpers may still exist, but they are not runtime identity.

File: `plugins/work-items/all/src/index.ts`

```ts
import { createPlugin as api } from "@rawr/plugins/server/api/work-items";
import { createPlugin as cli } from "@rawr/plugins/cli/commands/work-items";
import { createPlugin as tools } from "@rawr/plugins/agent/tools/work-items";

export function createWorkItemsProjectionSet() {
  return [
    api(),
    cli(),
    tools(),
  ];
}
```

This returns plugin factories or plugin definitions for app ergonomics only. It is not a new plugin species.

### Backend changes

Update lane builder signatures.

File: `packages/core/sdk/src/plugins/plugin-definition.ts`

```ts
export type PluginFactoryArgs<TOptions> =
  [TOptions] extends [void] ? [] : [options: TOptions];

export interface PluginFactory<
  TOptions = void,
  TDefinition extends PluginDefinition = PluginDefinition,
> {
  (...args: PluginFactoryArgs<TOptions>): TDefinition;
}
```

File: `packages/core/sdk/src/plugins/server/index.ts`

```ts
export function defineServerApiPlugin<
  const TInput extends ServerApiPluginInput,
>(input: TInput): PluginFactory<void, ServerApiPluginDefinition<TInput>>;

export namespace defineServerApiPlugin {
  export function withOptions<
    TOptions,
    const TInput extends ServerApiPluginInput,
  >(
    build: (options: TOptions) => TInput,
  ): PluginFactory<TOptions, ServerApiPluginDefinition<TInput>>;
}
```

Repeat pattern for:

```text
packages/core/sdk/src/plugins/server/index.ts
  defineServerApiPlugin
  defineServerInternalPlugin

packages/core/sdk/src/plugins/async/index.ts
  defineAsyncWorkflowPlugin
  defineAsyncSchedulePlugin
  defineAsyncConsumerPlugin

packages/core/sdk/src/plugins/cli/index.ts
  defineCliCommandPlugin

packages/core/sdk/src/plugins/agent/index.ts
  defineAgentChannelPlugin
  defineAgentShellPlugin
  defineAgentToolPlugin

packages/core/sdk/src/plugins/desktop/index.ts
  defineDesktopMenubarPlugin
  defineDesktopWindowPlugin
  defineDesktopBackgroundPlugin

packages/core/sdk/src/plugins/web/index.ts
  defineWebAppPlugin
```

### Typing impact

The public builder returns the same `PluginFactory` type. No runtime graph type changes. The SDK derivation still sees exactly one `PluginDefinition` when app selection calls `createPlugin()`.

### Migration

Compatibility path:

```text
Phase 1: support both defineXPlugin.factory()({...}) and defineXPlugin({...}).
Phase 2: codemod `.factory()({` to `({`.
Phase 3: remove `.factory()` from docs and generated examples.
Phase 4: optional lint warning for `.factory()` in ordinary authoring.
```

## 6. Change set C — Make plugin package grammar homologous across lanes

### Now

Examples mix plugin package builders and executable leaf helpers in one list, which makes the grammar look non-homologous:

```text
defineServerApiPlugin.factory()
defineCommand(...)
defineTool(...)
defineDesktopBackground(...)
defineAsyncWorkflowPlugin.factory()
```

That conflates two layers.

### Simple better

Every plugin package exports one `createPlugin` factory. Every executable thing inside the plugin package is a lane-native definition.

```text
Level 1 — projection package
  defineServerApiPlugin(...)
  defineCliCommandPlugin(...)
  defineAgentToolPlugin(...)
  defineDesktopBackgroundPlugin(...)
  defineAsyncWorkflowPlugin(...)

Level 2 — executable / native leaf
  route.effect(function*)
  defineCommand({ effect })
  defineTool({ effect })
  defineDesktopBackground({ effect })
  defineAsyncStepEffect({ effect })
```

### Server API example

File tree:

```text
plugins/server/api/work-items/
  src/
    index.ts
    plugin.ts
    contract.ts
    router.ts
```

File: `plugins/server/api/work-items/src/plugin.ts`

```ts
import { defineServerApiPlugin } from "@rawr/sdk/plugins/server";
import { service as WorkItemsService } from "@rawr/services/work-items";
import { createWorkItemsPublicRouter } from "./router";

export const createPlugin = defineServerApiPlugin({
  capability: "work-items",
  routeBase: "/work-items",

  services: {
    workItems: WorkItemsService,
  },

  api() {
    return createWorkItemsPublicRouter();
  },
});
```

File: `plugins/server/api/work-items/src/router.ts`

```ts
import { Effect } from "@rawr/sdk/effect";
import { implementServerApiPlugin } from "@rawr/sdk/plugins/server/effect";
import { workItemsPublicApiContract } from "./contract";

const os = implementServerApiPlugin(workItemsPublicApiContract, {
  pluginId: "server.api.work-items",
});

export function createWorkItemsPublicRouter() {
  return os.router({
    create: os.create.effect(function* ({ input, context, execution, errors }) {
      const actor = yield* context.request.requireActor();

      if (!actor.canCreateWorkItems) {
        return yield* Effect.fail(
          errors.FORBIDDEN({
            data: { reason: "actor_cannot_create_work_items" },
          }),
        );
      }

      const workItems = context.clients.workItems.withInvocation({
        invocation: {
          traceId: execution.traceId,
          actorId: actor.id,
        },
      });

      return yield* workItems.items.create({
        title: input.title,
        description: input.description,
      });
    }),
  });
}
```

### CLI example

File tree:

```text
plugins/cli/commands/work-items/
  src/
    index.ts
    plugin.ts
    commands/
      create.ts
      get.ts
```

File: `plugins/cli/commands/work-items/src/plugin.ts`

```ts
import { defineCliCommandPlugin } from "@rawr/sdk/plugins/cli";
import { service as WorkItemsService } from "@rawr/services/work-items";
import { CreateWorkItemCommand } from "./commands/create";
import { GetWorkItemCommand } from "./commands/get";

export const createPlugin = defineCliCommandPlugin({
  capability: "work-items",

  services: {
    workItems: WorkItemsService,
  },

  commands: [
    CreateWorkItemCommand,
    GetWorkItemCommand,
  ],
});
```

File: `plugins/cli/commands/work-items/src/commands/create.ts`

```ts
import { defineCommand } from "@rawr/sdk/plugins/cli/effect";
import { cliSchema } from "@rawr/sdk/plugins/cli/schema";

export const CreateWorkItemCommand = defineCommand({
  id: "work-items.create",

  args: cliSchema.object({
    title: cliSchema.string({ minLength: 1 }),
    description: cliSchema.optional(cliSchema.string()),
  }),

  effect: function* ({ args, clients, invocation }) {
    const actor = yield* invocation.requireOperator();

    const workItems = clients.workItems.withInvocation({
      invocation: {
        traceId: invocation.traceId,
        actorId: actor.id,
      },
    });

    return yield* workItems.items.create({
      title: args.title,
      description: args.description,
    });
  },
});
```

### Agent tool example

File tree:

```text
plugins/agent/tools/work-items/
  src/
    index.ts
    plugin.ts
    tools/
      create.ts
```

File: `plugins/agent/tools/work-items/src/plugin.ts`

```ts
import { defineAgentToolPlugin } from "@rawr/sdk/plugins/agent";
import { service as WorkItemsService } from "@rawr/services/work-items";
import { CreateWorkItemTool } from "./tools/create";

export const createPlugin = defineAgentToolPlugin({
  capability: "work-items",

  services: {
    workItems: WorkItemsService,
  },

  tools: [
    CreateWorkItemTool,
  ],
});
```

File: `plugins/agent/tools/work-items/src/tools/create.ts`

```ts
import { defineTool } from "@rawr/sdk/plugins/agent/effect";
import { toolSchema } from "@rawr/sdk/plugins/agent/schema";

export const CreateWorkItemTool = defineTool({
  id: "work-items.create",
  description: "Create a work item through the work-items service.",

  input: toolSchema.object({
    title: toolSchema.string({ minLength: 1 }),
    description: toolSchema.optional(toolSchema.string()),
  }),

  effect: function* ({ input, clients, shell }) {
    const actor = yield* shell.requireTrustedOperator();

    const workItems = clients.workItems.withInvocation({
      invocation: {
        traceId: shell.traceId,
        actorId: actor.id,
      },
    });

    return yield* workItems.items.create({
      title: input.title,
      description: input.description,
    });
  },
});
```

### Desktop background example

File tree:

```text
plugins/desktop/background/disk-status/
  src/
    index.ts
    plugin.ts
    background.ts
```

File: `plugins/desktop/background/disk-status/src/plugin.ts`

```ts
import { defineDesktopBackgroundPlugin } from "@rawr/sdk/plugins/desktop";
import { FileSystemResource } from "@rawr/resources/filesystem";
import { ProcessPubSubHubResource } from "@rawr/resources/process-pubsub-hub";
import { DiskStatusBackground } from "./background";

export const createPlugin = defineDesktopBackgroundPlugin({
  capability: "disk-status",

  resources: {
    filesystem: FileSystemResource,
    pubsubHub: ProcessPubSubHubResource,
  },

  backgrounds: [
    DiskStatusBackground,
  ],
});
```

File: `plugins/desktop/background/disk-status/src/background.ts`

```ts
import { defineDesktopBackground } from "@rawr/sdk/plugins/desktop/effect";

export const DiskStatusBackground = defineDesktopBackground({
  id: "disk-status.refresh",
  cadence: "60 seconds",

  effect: function* ({ resources, host }) {
    const usage = yield* resources.filesystem.diskUsageSummary();

    const diskStatusTopic = yield* resources.pubsubHub.topic<typeof usage>({
      id: "desktop.disk-status",
      replay: "latest",
    });

    yield* diskStatusTopic.publish(usage);

    yield* host.setMenubarBadge({
      text: usage.percentUsed > 90 ? "!" : "",
    });
  },
});
```

### Async workflow example

File tree:

```text
plugins/async/workflows/work-items-sync/
  src/
    index.ts
    plugin.ts
    workflows/
      sync-work-item.ts
```

File: `plugins/async/workflows/work-items-sync/src/plugin.ts`

```ts
import { defineAsyncWorkflowPlugin } from "@rawr/sdk/plugins/async";
import { service as WorkItemsService } from "@rawr/services/work-items";
import { WorkItemsSyncWorkflow } from "./workflows/sync-work-item";

export const createPlugin = defineAsyncWorkflowPlugin({
  capability: "work-items-sync",

  services: {
    workItems: WorkItemsService,
  },

  workflows: [
    WorkItemsSyncWorkflow,
  ],
});
```

File: `plugins/async/workflows/work-items-sync/src/workflows/sync-work-item.ts`

```ts
import { defineWorkflow } from "@rawr/sdk/plugins/async";
import {
  defineAsyncStepEffect,
  stepEffect,
} from "@rawr/sdk/plugins/async/effect";

export const SyncWorkItemStep = defineAsyncStepEffect({
  id: "sync-work-item",

  effect: function* ({ event, clients }) {
    const item = yield* clients.workItems.items.get({
      id: event.data.itemId,
    });

    if (item.status === "done") {
      return { skipped: true as const };
    }

    return yield* clients.workItems.items.sync({
      id: event.data.itemId,
      requestedBy: event.data.requestedBy,
    });
  },
});

export const WorkItemsSyncWorkflow = defineWorkflow({
  id: "work-items.sync",

  async run(ctx) {
    return await stepEffect(ctx).run(SyncWorkItemStep);
  },
});
```

### Backend changes

Add or rename lane plugin builders to make the plugin layer explicit:

```text
packages/core/sdk/src/plugins/cli/index.ts
  defineCliCommandPlugin(...)

packages/core/sdk/src/plugins/agent/index.ts
  defineAgentToolPlugin(...)
  defineAgentChannelPlugin(...)
  defineAgentShellPlugin(...)

packages/core/sdk/src/plugins/desktop/index.ts
  defineDesktopBackgroundPlugin(...)
  defineDesktopWindowPlugin(...)
  defineDesktopMenubarPlugin(...)
```

Keep executable definition helpers in `/effect` submodules:

```text
packages/core/sdk/src/plugins/cli/effect/index.ts
  defineCommand(...)

packages/core/sdk/src/plugins/agent/effect/index.ts
  defineTool(...)

packages/core/sdk/src/plugins/desktop/effect/index.ts
  defineDesktopBackground(...)

packages/core/sdk/src/plugins/async/effect/index.ts
  defineAsyncStepEffect(...)
```

`defineCommand`, `defineTool`, `defineDesktopBackground`, and `defineAsyncStepEffect` should be documented as lane-native definition helpers, not plugin builders.

### Typing impact

Each plugin builder input map must flow into leaf context typing:

```ts
defineCliCommandPlugin({
  services: { workItems: WorkItemsService },
  resources: { logger: LoggerResource },
  commands: [CreateWorkItemCommand],
});
```

The command execution context receives:

```ts
clients.workItems
resources.logger
```

No runtime lookup is inferred from body code.

## 7. Change set D — Replace redundant `useService(...)` and `useResource(...)` with direct maps

### Now

Current plugin examples require `useService(...)` inside a `services` map:

```ts
services: {
  workItems: useService(WorkItemsService),
}
```

That repeats the kind. The enclosing field already says these are services.

Equivalent resource examples would repeat the same problem:

```ts
resources: {
  filesystem: useResource(FileSystemResource),
}
```

### Simple better

Direct service values in `services` maps.

File: `plugins/cli/commands/work-items/src/plugin.ts`

```ts
import { defineCliCommandPlugin } from "@rawr/sdk/plugins/cli";
import { service as WorkItemsService } from "@rawr/services/work-items";
import { CreateWorkItemCommand } from "./commands/create";

export const createPlugin = defineCliCommandPlugin({
  capability: "work-items",

  services: {
    workItems: WorkItemsService,
  },

  commands: [
    CreateWorkItemCommand,
  ],
});
```

Direct resource values in `resources` maps.

File: `plugins/desktop/background/disk-status/src/plugin.ts`

```ts
import { defineDesktopBackgroundPlugin } from "@rawr/sdk/plugins/desktop";
import { FileSystemResource } from "@rawr/resources/filesystem";
import { ProcessPubSubHubResource } from "@rawr/resources/process-pubsub-hub";
import { DiskStatusBackground } from "./background";

export const createPlugin = defineDesktopBackgroundPlugin({
  capability: "disk-status",

  resources: {
    filesystem: FileSystemResource,
    pubsubHub: ProcessPubSubHubResource,
  },

  backgrounds: [
    DiskStatusBackground,
  ],
});
```

### Advanced better: service modifiers

Wrappers remain, but only when they add semantics.

File: `plugins/server/internal/billing-ops/src/plugin.ts`

```ts
import {
  defineServerInternalPlugin,
  optionalService,
  serviceRef,
} from "@rawr/sdk/plugins/server";
import { service as BillingService } from "@rawr/services/billing";
import { service as EntitlementsService } from "@rawr/services/entitlements";

export const createPlugin = defineServerInternalPlugin({
  capability: "billing-ops",

  services: {
    billing: BillingService,

    enterpriseEntitlements: serviceRef(EntitlementsService, {
      instance: "enterprise",
    }),

    legacyBilling: optionalService(BillingService, {
      instance: "legacy",
      reason: "Only mounted in migration profiles.",
    }),
  },

  internal() {
    return createBillingOpsRouter();
  },
});
```

### Advanced better: resource modifiers

File: `plugins/desktop/background/import-runner/src/plugin.ts`

```ts
import {
  defineDesktopBackgroundPlugin,
  optionalResource,
  resourceRef,
} from "@rawr/sdk/plugins/desktop";
import { BrowserPoolResource } from "@rawr/resources/browser-pool";
import { ProcessCacheHubResource } from "@rawr/resources/process-cache-hub";
import { ImportRunnerBackground } from "./background";

export const createPlugin = defineDesktopBackgroundPlugin({
  capability: "import-runner",

  resources: {
    browserPool: resourceRef(BrowserPoolResource, {
      lifetime: "role",
      instance: "import-runner",
      reason: "Browser automation is role-local for import isolation.",
    }),

    cache: optionalResource(ProcessCacheHubResource, {
      reason: "Cache improves repeated imports but is not required.",
    }),
  },

  backgrounds: [
    ImportRunnerBackground,
  ],
});
```

### Unique variant: multiple resource instances

File: `plugins/server/internal/audit-ops/src/plugin.ts`

```ts
import {
  defineServerInternalPlugin,
  resourceRef,
} from "@rawr/sdk/plugins/server";
import { SqlPoolResource } from "@rawr/resources/sql";

export const createPlugin = defineServerInternalPlugin({
  capability: "audit-ops",

  resources: {
    primarySql: resourceRef(SqlPoolResource, {
      instance: "primary",
      reason: "Reads canonical business state.",
    }),

    auditSql: resourceRef(SqlPoolResource, {
      instance: "audit",
      reason: "Writes audit records to isolated store.",
    }),
  },

  internal() {
    return createAuditOpsRouter();
  },
});
```

### Backend changes

Current internal `ServiceUse` and `ResourceRequirement` artifacts remain. Only public input changes.

Add normalizers:

File: `packages/core/sdk/src/plugins/dependencies.ts`

```ts
export type ServiceUseInput<TService = unknown> =
  | ServiceDefinition<TService>
  | ServiceUseModifier<TService>;

export type ServiceUseInputMap = Record<string, ServiceUseInput>;

export type ResourceUseInput<TResource = unknown> =
  | RuntimeResource<any, any, any>
  | ResourceUseModifier<TResource>;

export type ResourceUseInputMap = Record<string, ResourceUseInput>;

export function normalizeServiceUseMap(
  input: ServiceUseInputMap | undefined,
): readonly NormalizedServiceUse[];

export function normalizeResourceUseMap(
  input: ResourceUseInputMap | undefined,
): readonly ResourceRequirement[];
```

Modifier helpers:

File: `packages/core/sdk/src/plugins/dependency-modifiers.ts`

```ts
export function serviceRef<TService>(
  service: ServiceDefinition<TService>,
  options: {
    readonly instance?: string;
    readonly optional?: boolean;
    readonly reason?: string;
  },
): ServiceUseModifier<TService>;

export function optionalService<TService>(
  service: ServiceDefinition<TService>,
  options?: {
    readonly instance?: string;
    readonly reason?: string;
  },
): ServiceUseModifier<TService>;

export function resourceRef<TResource extends RuntimeResource>(
  resource: TResource,
  options: {
    readonly instance?: string;
    readonly lifetime?: ResourceLifetime;
    readonly role?: AppRole;
    readonly optional?: boolean;
    readonly reason?: string;
  },
): ResourceUseModifier<TResource>;

export function optionalResource<TResource extends RuntimeResource>(
  resource: TResource,
  options?: {
    readonly instance?: string;
    readonly lifetime?: ResourceLifetime;
    readonly role?: AppRole;
    readonly reason?: string;
  },
): ResourceUseModifier<TResource>;
```

### Typing impact

Plugin builder context types derive from the public maps:

```ts
type PluginClients<TServices extends ServiceUseInputMap> = {
  readonly [K in keyof TServices]: ConstructionBoundServiceClient<
    ServiceContractFromUseInput<TServices[K]>
  >;
};

type PluginResources<TResources extends ResourceUseInputMap> = {
  readonly [K in keyof TResources]: ResourceContextValueFromUseInput<TResources[K]>;
};
```

For optional resources:

```ts
resources.cache // RuntimeResourceValue<typeof ProcessCacheHubResource> | undefined
```

For required resources:

```ts
resources.browserPool // RuntimeResourceValue<typeof BrowserPoolResource>
```

### Diagnostics

Add targeted diagnostics:

```text
plugin.dependency.use-wrapper.redundant
  message: `services.workItems` is already a service-use map. Use `workItems: WorkItemsService`.
  repair: remove `useService(...)`.

plugin.resource.use-wrapper.redundant
  message: `resources.filesystem` is already a resource requirement map. Use `filesystem: FileSystemResource`.
  repair: remove `useResource(...)`.
```

Keep wrappers valid when they add options.

## 8. Change set E — Project declared resources into executable contexts

### Now

Some examples use dynamic resource access inside executable bodies:

```ts
const filesystem = yield* resources.require(FileSystemResource);
const pubsubHub = yield* resources.require(ProcessPubSubHubResource);
```

This weakens derivation if it becomes the normal declaration path. The SDK must not inspect or execute bodies to discover dependencies.

### Simple better

Declare resources at the plugin boundary. Use projected values in executable bodies.

File: `plugins/desktop/background/disk-status/src/plugin.ts`

```ts
export const createPlugin = defineDesktopBackgroundPlugin({
  capability: "disk-status",

  resources: {
    filesystem: FileSystemResource,
    pubsubHub: ProcessPubSubHubResource,
  },

  backgrounds: [DiskStatusBackground],
});
```

File: `plugins/desktop/background/disk-status/src/background.ts`

```ts
export const DiskStatusBackground = defineDesktopBackground({
  id: "disk-status.refresh",
  cadence: "60 seconds",

  effect: function* ({ resources, host }) {
    const usage = yield* resources.filesystem.diskUsageSummary();

    const topic = yield* resources.pubsubHub.topic<typeof usage>({
      id: "desktop.disk-status",
      replay: "latest",
    });

    yield* topic.publish(usage);

    yield* host.setMenubarBadge({
      text: usage.percentUsed > 90 ? "!" : "",
    });
  },
});
```

### Advanced better: optional resource

File: `plugins/desktop/background/import-runner/src/plugin.ts`

```ts
export const createPlugin = defineDesktopBackgroundPlugin({
  capability: "import-runner",

  resources: {
    cache: optionalResource(ProcessCacheHubResource, {
      reason: "Improves repeated imports but is not required.",
    }),
  },

  backgrounds: [ImportRunnerBackground],
});
```

File: `plugins/desktop/background/import-runner/src/background.ts`

```ts
export const ImportRunnerBackground = defineDesktopBackground({
  id: "import-runner.refresh",
  cadence: "5 minutes",

  effect: function* ({ resources }) {
    if (!resources.cache) {
      return yield* runImportWithoutCache();
    }

    const importCache = yield* resources.cache.cache({
      id: "import-runner.results",
      capacity: 500,
      ttl: "10 minutes",
      lookup: (key) => runImportLookup(key),
    });

    return yield* importCache.refresh("latest");
  },
});
```

### Advanced better: generic helper still uses `resources.require(...)`

`resources.require(...)` remains useful for generic helper functions that receive a runtime resource descriptor. It must not become the normal declaration mechanism.

File: `plugins/desktop/background/shared/resource-helper.ts`

```ts
import type { RuntimeResource } from "@rawr/sdk/runtime/resources";

export function useDeclaredResource<TResource extends RuntimeResource>(
  resources: DeclaredRuntimeResourceAccess,
  resource: TResource,
) {
  return resources.require(resource);
}
```

Rule:

```text
resources.require(Resource) is valid only when Resource is declared in the enclosing service/plugin/resource requirement set or is included through an explicitly declared dynamic resource allowance.
```

### Backend changes

Update context generation:

File: `packages/core/sdk/src/plugins/resource-context.ts`

```ts
export type ProjectedRuntimeResources<TResources extends ResourceUseInputMap> = {
  readonly [K in keyof TResources]: ProjectedResourceValue<TResources[K]>;
} & DeclaredRuntimeResourceAccess;

export interface DeclaredRuntimeResourceAccess {
  require<TResource extends RuntimeResource>(
    resource: TResource,
    input?: { readonly instance?: string },
  ): RawrEffect<RuntimeResourceValue<TResource>, ResourceNotDeclaredError>;

  optional<TResource extends RuntimeResource>(
    resource: TResource,
    input?: { readonly instance?: string },
  ): RawrEffect<RuntimeResourceValue<TResource> | undefined>;
}
```

The runtime access object can still resolve resources by descriptor, but the SDK type checker and compiler must verify declaration coverage.

### Diagnostics

```text
resource.access.undeclared
  message: Executable body asks for FileSystemResource, but the plugin does not declare it under `resources`.
  repair: add `resources: { filesystem: FileSystemResource }` to plugin declaration.

resource.access.dynamic-undeclared
  message: Dynamic resource access requires explicit dynamic allowance.
  repair: declare the resource or add a sanctioned dynamic resource policy.
```

### No magic rule

The projected `resources.filesystem` property exists only because `plugin.ts` declared `resources.filesystem`. No body scan. No runtime guess. No hidden global container.

## 9. Change set F — Split service dependency declaration maps while preserving canonical `deps` lane

### Now

Service declarations use a mixed `deps` map with helper wrappers:

File: `services/work-items/src/service/base.ts`

```ts
export const service = defineService({
  id: "work-items",

  deps: {
    dbPool: resourceDep(SqlPoolResource),
    clock: resourceDep(ClockResource),
    logger: resourceDep(LoggerResource),
    billing: serviceDep(BillingService),
    search: semanticDep(SearchAdapter),
  },

  scope: WorkItemsScopeSchema,
  config: WorkItemsConfigSchema,
  invocation: WorkItemsInvocationSchema,
});
```

The helpers are defensible because `deps` mixes dependency species. But the helpers become redundant if the authoring shape splits dependency species.

### Simple better

Use split authoring maps:

File: `services/work-items/src/service/base.ts`

```ts
import { defineService, type ServiceOf } from "@rawr/sdk/service";
import { RuntimeSchema } from "@rawr/sdk/runtime/schema";
import { ClockResource } from "@rawr/resources/clock";
import { LoggerResource } from "@rawr/resources/logger";
import { SqlPoolResource } from "@rawr/resources/sql";
import { service as BillingService } from "@rawr/services/billing";
import { SearchAdapter } from "./shared/search-adapter";

export const service = defineService({
  id: "work-items",

  resources: {
    dbPool: SqlPoolResource,
    clock: ClockResource,
    logger: LoggerResource,
  },

  services: {
    billing: BillingService,
  },

  semantic: {
    search: SearchAdapter,
  },

  scope: WorkItemsScopeSchema,
  config: WorkItemsConfigSchema,
  invocation: WorkItemsInvocationSchema,

  metadataDefaults: {
    idempotent: true,
    domain: "work-items",
    audience: "internal",
    audit: "basic",
  },
});

export type WorkItemsService = ServiceOf<typeof service>;
export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createProvidedContextMiddleware = service.createProvidedContextMiddleware;
export const createServiceImplementer = service.createImplementer;
```

The runtime boundary still receives a canonical `deps` lane after SDK normalization. The authoring shape is simpler; the runtime shape remains coherent.

### Advanced better: service/resource modifiers

File: `services/user-accounts/src/service/base.ts`

```ts
import {
  defineService,
  resourceRef,
  serviceRef,
  optionalService,
} from "@rawr/sdk/service";

export const service = defineService({
  id: "user-accounts",

  resources: {
    primaryDb: resourceRef(SqlPoolResource, {
      instance: "primary",
      reason: "Canonical user account store.",
    }),

    auditDb: resourceRef(SqlPoolResource, {
      instance: "audit",
      reason: "Append-only account audit store.",
    }),
  },

  services: {
    billing: serviceRef(BillingService, {
      instance: "primary",
    }),

    entitlements: EntitlementsService,

    legacyAccounts: optionalService(LegacyAccountsService, {
      reason: "Migration bridge; only present in legacy profiles.",
    }),
  },

  scope: UserAccountsScopeSchema,
  config: UserAccountsConfigSchema,
  invocation: UserAccountsInvocationSchema,
});
```

### Unique variant: keep `deps` for compatibility

Legacy compatibility can stay as a migration-only input:

```ts
export const service = defineService({
  id: "work-items",

  deps: {
    dbPool: resourceDep(SqlPoolResource),
    billing: serviceDep(BillingService),
  },

  scope,
  config,
  invocation,
});
```

But canonical generated services should use split maps.

### Backend changes

Add service dependency input normalization.

File: `packages/core/sdk/src/service/dependencies.ts`

```ts
export interface ServiceDependencyInputShape {
  readonly resources?: ResourceDependencyInputMap;
  readonly services?: ServiceDependencyInputMap;
  readonly semantic?: SemanticDependencyInputMap;

  /** Migration-only compatibility. */
  readonly deps?: MixedServiceDepsInputMap;
}

export function normalizeServiceDependencyInputs(
  input: ServiceDependencyInputShape,
): NormalizedServiceDeps {
  return {
    resourceDeps: normalizeResourceDependencyMap(input.resources, input.deps),
    serviceDeps: normalizeServiceDependencyMap(input.services, input.deps),
    semanticDeps: normalizeSemanticDependencyMap(input.semantic, input.deps),
  };
}
```

The SDK then constructs the canonical runtime-facing `deps` lane type from the split maps:

```ts
export type ServiceDepsFromInputs<TInput extends ServiceDependencyInputShape> =
  ResourceDepsFromMap<TInput["resources"]> &
  ServiceDepsFromMap<TInput["services"]> &
  SemanticDepsFromMap<TInput["semantic"]> &
  LegacyDepsFromMap<TInput["deps"]>;
```

### Runtime impact

No runtime artifact changes are required.

The runtime compiler still consumes:

```text
NormalizedServiceDependency[]
NormalizedSemanticDependency[]
ResourceRequirement[]
ServiceBindingPlan
```

The `ServiceBoundaryContext` still has:

```ts
context.deps
context.scope
context.config
context.invocation
context.provided
```

The split maps are authoring sugar with explicit normalized output.

### Diagnostics

```text
service.deps.mixed-map.compat
  message: Mixed `deps` map is supported for migration but split `resources`, `services`, and `semantic` maps are canonical.
  repair: move resourceDep entries to `resources`, serviceDep entries to `services`, semanticDep entries to `semantic`.
```

## 10. Change set G — Keep curated Effect imports, but only where effects are authored

### Now

There is a risk of over-applying `Effect` imports to cold files, or trying to hide Effect behind RAWR helpers/context injection.

Bad cold import:

File: `services/work-items/src/service/base.ts`

```ts
import { Effect } from "@rawr/sdk/effect"; // unnecessary in cold service declaration
```

Bad context injection:

```ts
module.create.effect(function* ({ input, context, errors, Effect }) {
  return yield* Effect.fail(errors.INVALID_WORK_ITEM_TITLE());
});
```

### Simple better

Import curated `Effect` only in files that construct or compose `RawrEffect`.

Files that should not import Effect in the common case:

```text
services/<service>/src/service/base.ts
services/<service>/src/service/contract.ts
services/<service>/src/service/impl.ts
services/<service>/src/service/modules/<module>/schemas.ts
services/<service>/src/service/modules/<module>/contract.ts
plugins/<lane>/<surface>/<capability>/src/plugin.ts
apps/<app>/rawr.<app>.ts
apps/<app>/runtime/profiles/*.ts
apps/<app>/<entrypoint>.ts
```

Files that may import `Effect`:

```text
services/<service>/src/service/modules/<module>/router.ts
services/<service>/src/service/modules/<module>/repository.ts
services/<service>/src/service/modules/<module>/middleware.ts if middleware composes RawrEffect
plugins/server/api/<capability>/src/router.ts
plugins/server/internal/<capability>/src/router.ts
plugins/cli/commands/<capability>/src/commands/*.ts when needed
plugins/agent/tools/<capability>/src/tools/*.ts when needed
plugins/desktop/background/<capability>/src/background.ts when needed
resources/<capability>/resource.ts when value operations return RawrEffect
resources/<capability>/providers/*.ts when returned values use Effect.tryPromise
```

### Simple example: command body without `Effect` import

File: `plugins/cli/commands/work-items/src/commands/get.ts`

```ts
import { defineCommand } from "@rawr/sdk/plugins/cli/effect";
import { cliSchema } from "@rawr/sdk/plugins/cli/schema";

export const GetWorkItemCommand = defineCommand({
  id: "work-items.get",

  args: cliSchema.object({
    id: cliSchema.string(),
  }),

  effect: function* ({ args, clients, invocation }) {
    const workItems = clients.workItems.withInvocation({
      invocation: {
        traceId: invocation.traceId,
      },
    });

    return yield* workItems.items.get({
      id: args.id,
    });
  },
});
```

No `Effect` import is needed because the body only yields an existing `RawrEffect`.

### Simple example: command body with `Effect` import

File: `plugins/cli/commands/work-items/src/commands/create.ts`

```ts
import { Effect } from "@rawr/sdk/effect";
import { defineCommand } from "@rawr/sdk/plugins/cli/effect";
import { cliSchema } from "@rawr/sdk/plugins/cli/schema";

export const CreateWorkItemCommand = defineCommand({
  id: "work-items.create",

  args: cliSchema.object({
    title: cliSchema.string(),
  }),

  effect: function* ({ args, clients, invocation, errors }) {
    const title = args.title.trim();

    if (title.length === 0) {
      return yield* Effect.fail(
        errors.INVALID_ARGUMENT({
          data: { field: "title" },
        }),
      );
    }

    const workItems = clients.workItems.withInvocation({
      invocation: {
        traceId: invocation.traceId,
      },
    });

    return yield* workItems.items.create({ title });
  },
});
```

### Advanced better: helper function uses `Effect.gen(...)`

File: `services/work-items/src/service/modules/items/create-work-item.ts`

```ts
import { Effect, type RawrEffect } from "@rawr/sdk/effect";
import type { WorkItem } from "./schemas";

export function normalizeAndCreate(input: {
  readonly title: string;
  readonly create: (title: string) => RawrEffect<WorkItem, unknown>;
}): RawrEffect<WorkItem, unknown> {
  return Effect.gen(function* () {
    const title = input.title.trim();

    if (title.length === 0) {
      return yield* Effect.fail(new EmptyTitleError({}));
    }

    return yield* input.create(title);
  });
}
```

### Backend changes

No runtime changes.

Update import-law diagnostics:

```text
effect.import.unnecessary-in-cold-file
  message: This file declares cold facts and does not construct RawrEffect values.
  repair: remove `@rawr/sdk/effect` import.

effect.context-injection.forbidden
  message: `Effect` is an imported authoring facade, not invocation context.
  repair: import `Effect` from `@rawr/sdk/effect` in this file.
```

### Nativity rationale

Effect is the local execution algebra. Hiding it behind `rawr.fail`, `ctx.effect.fail`, or `module.fail` would create a RAWR mini-language. The curated import keeps native Effect grammar familiar while preserving RAWR runtime ownership.

## 11. Change set H — Clarify service client and invocation ergonomics

### Baseline tension

The service snapshot proposed explicit `.promise` and `.effect` facades to avoid ambiguous execution timing. The canonical runtime spec now says internal RAWR-owned execution receives Effect-facing clients; Promise-facing clients are for external/generated clients, adapter internals, tests, or deliberately boundary-crossing contexts.

This document resolves that as:

```text
Inside RAWR-owned Effect execution:
  clients are Effect-facing.
  direct procedure calls return RawrEffect.

Outside RAWR-owned execution:
  generated clients are Promise-facing or explicitly marked external.

Construction-bound plugin clients:
  require `.withInvocation(...)` before direct Effect calls.

Invocation-bound clients:
  direct calls are Effect-facing.
```

### Now

Plugin contexts often receive construction-bound clients and call:

```ts
const workItems = context.clients.workItems.withInvocation({
  invocation: {
    traceId: execution.traceId,
    actorId: actor.id,
  },
});

return yield* workItems.items.create({
  title: payload.title,
});
```

This is correct but verbose.

### Simple better

Keep `withInvocation(...)` where invocation must be constructed from lane context. Do not add `.effect` facade inside RAWR-owned Effect bodies.

File: `plugins/server/api/work-items/src/router.ts`

```ts
const workItems = context.clients.workItems.withInvocation({
  invocation: {
    traceId: execution.traceId,
    actorId: actor.id,
  },
});

return yield* workItems.items.create({
  title: payload.title,
});
```

### Advanced better: lane helper for common invocation forwarding

Provide lane-local helpers that still produce explicit invocation-bound clients. These helpers are SDK sugar, not runtime lookup.

File: `plugins/cli/commands/work-items/src/commands/create.ts`

```ts
export const CreateWorkItemCommand = defineCommand({
  id: "work-items.create",

  effect: function* ({ args, clients, invocation }) {
    const actor = yield* invocation.requireOperator();

    const workItems = clients.workItems.forInvocation(invocation, {
      actorId: actor.id,
    });

    return yield* workItems.items.create({
      title: args.title,
    });
  },
});
```

`forInvocation(...)` is just a typed alias over `withInvocation(...)` that reads canonical lane trace/correlation fields.

Possible SDK type:

File: `packages/core/sdk/src/service/service-client.ts`

```ts
export interface ConstructionBoundServiceClient<TContract> {
  readonly kind: "service.client.construction-bound";
  readonly serviceId: string;

  withInvocation(input: {
    readonly invocation: unknown;
  }): InvocationBoundEffectServiceClient<TContract>;

  forInvocation?<TInvocationSource extends RuntimeInvocationSource>(
    source: TInvocationSource,
    extend?: Record<string, unknown>,
  ): InvocationBoundEffectServiceClient<TContract>;
}
```

This helper is optional. It should not obscure that invocation data is required.

### Unique variant: async step clients already invocation-bound

File: `plugins/async/workflows/work-items-sync/src/workflows/sync-work-item.ts`

```ts
export const SyncWorkItemStep = defineAsyncStepEffect({
  id: "sync-work-item",

  effect: function* ({ event, clients }) {
    return yield* clients.workItems.items.sync({
      id: event.data.itemId,
      requestedBy: event.data.requestedBy,
    });
  },
});
```

No `withInvocation(...)` is needed because `stepEffect(ctx)` already applies async invocation identity.

### Unique variant: external client

File: `apps/hq/scripts/external-client-example.ts`

```ts
const item = await externalWorkItemsClient.procedures.items.get(
  { id: input.itemId },
  { invocation: { traceId } },
);
```

External/generated clients remain Promise-facing. They are not injected into RAWR-owned execution bodies as a peer choice.

### Backend changes

No runtime artifact changes.

SDK type refinements:

```text
InvocationBoundEffectServiceClient<TContract>
  direct procedure calls return RawrEffect

ConstructionBoundServiceClient<TContract>
  exposes withInvocation(...)
  optionally exposes forInvocation(...) sugar

ExternalPromiseServiceClient<TContract>
  explicit external interop only
```

Diagnostics:

```text
service.client.promise-in-effect-body.forbidden
  message: Promise-facing service client used inside RAWR-owned Effect body.
  repair: use the invocation-bound Effect client.

service.client.ambiguous-call.forbidden
  message: Direct service call is allowed only on invocation-bound Effect clients.
  repair: call `.withInvocation(...)` first or use an external Promise client outside RAWR execution.
```

## 12. Change set I — Preserve service package topology, but simplify declarations

### Now

The service snapshot uses a scalable service topology and mixed dependency helpers. The topology is good. The mixed helper declaration can be simplified by Change set F.

### Simple better service topology

Keep the service package tree.

```text
services/work-items/
  src/
    index.ts
    client.ts
    router.ts
    service/
      base.ts
      impl.ts
      contract.ts
      router.ts
      middleware/
        observability.ts
        read-only-mode.ts
      shared/
        errors.ts
      modules/
        items/
          schemas.ts
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
        labels/
          schemas.ts
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
        allocations/
          schemas.ts
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
```

### Simple better base file

File: `services/work-items/src/service/base.ts`

```ts
import { defineService, type ServiceOf } from "@rawr/sdk/service";
import { RuntimeSchema } from "@rawr/sdk/runtime/schema";
import { ClockResource } from "@rawr/resources/clock";
import { LoggerResource } from "@rawr/resources/logger";
import { SqlPoolResource } from "@rawr/resources/sql";

export const WorkItemsScopeSchema = RuntimeSchema.struct({
  workspaceId: RuntimeSchema.string({ minLength: 1 }),
});

export const WorkItemsConfigSchema = RuntimeSchema.struct({
  readOnly: RuntimeSchema.boolean(),
  limits: RuntimeSchema.struct({
    maxAllocationsPerItem: RuntimeSchema.number({ min: 1 }),
  }),
});

export const WorkItemsInvocationSchema = RuntimeSchema.struct({
  traceId: RuntimeSchema.string(),
  actorId: RuntimeSchema.optional(RuntimeSchema.string()),
});

export const service = defineService({
  id: "work-items",

  resources: {
    dbPool: SqlPoolResource,
    clock: ClockResource,
    logger: LoggerResource,
  },

  scope: WorkItemsScopeSchema,
  config: WorkItemsConfigSchema,
  invocation: WorkItemsInvocationSchema,

  metadataDefaults: {
    idempotent: true,
    domain: "work-items",
    audience: "internal",
    audit: "basic",
  },

  baseline: {
    policy: {
      events: {
        readOnlyRejected: "work-items.policy.read_only_rejected",
        allocationLimitReached: "work-items.policy.allocation_limit_reached",
      },
    },
  },
});

export type WorkItemsService = ServiceOf<typeof service>;

export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createProvidedContextMiddleware = service.createProvidedContextMiddleware;
export const createServiceImplementer = service.createImplementer;
```

### Advanced better: service with sibling service dependencies

File: `services/user-accounts/src/service/base.ts`

```ts
export const service = defineService({
  id: "user-accounts",

  resources: {
    dbPool: SqlPoolResource,
  },

  services: {
    billing: BillingService,
    entitlements: EntitlementsService,
  },

  scope: UserAccountsScopeSchema,
  config: UserAccountsConfigSchema,
  invocation: UserAccountsInvocationSchema,
});
```

Inside service `.effect(...)` body:

File: `services/user-accounts/src/service/modules/users/router.ts`

```ts
export const router = module.router({
  activate: module.activate.effect(function* ({ input, context }) {
    const entitlement = yield* context.deps.entitlements.users.check({
      userId: input.userId,
    });

    if (!entitlement.canActivate) {
      return yield* Effect.fail(new UserActivationDenied({
        userId: input.userId,
      }));
    }

    return yield* context.repo.activate({
      userId: input.userId,
    });
  }),
});
```

### Backend changes

Same as Change set F. The normalized runtime boundary still uses `deps`, `scope`, `config`, `invocation`, `provided`.

### Service snapshot coherence

This preserves:

```text
canonical generated topology
contract/router separation
module-local middleware
provided-context middleware
RawrEffect repositories
read-only policy as middleware
semantic observability split
```

It removes only redundant declaration wrappers in the common case.

## 13. Change set J — Product-facing diagnostic/law language above raw diagnostics

### Now

Raw diagnostics are precise but can read like internal runtime records:

```text
execution.registry.identity_mismatch
phase: mounting
boundary: execution-registry
```

This is correct for runtime internals, but poor as the primary author/agent repair language.

### Simple better

Add author-facing diagnostic explanations that map raw codes to named law violations and repairs.

Example output:

```text
Law violation: registry matches execution

The CLI command `work-items.create` compiled to execution id
`plugin.cli-command:work-items.create`, but the descriptor table contains
`plugin.cli-command:work-items.create.v2`.

Likely cause:
  The command id changed after a derived plan artifact was generated.

Repair:
  Regenerate the derived plan or restore the command id.

Raw diagnostic:
  execution.registry.identity_mismatch
```

### Advanced better: author diagnostics surface

File: `packages/core/sdk/src/diagnostics/author-diagnostic.ts`

```ts
export interface AuthorDiagnostic {
  readonly law: string;
  readonly audience: "author" | "runtime" | "operator" | "agent";
  readonly summary: string;
  readonly likelyCause?: string;
  readonly repair: readonly string[];
  readonly raw: RuntimeDiagnostic;
}
```

File: `packages/core/sdk/src/diagnostics/explain-runtime-diagnostic.ts`

```ts
export function explainRuntimeDiagnostic(
  diagnostic: RuntimeDiagnostic,
): AuthorDiagnostic;
```

This surface does not mutate diagnostics. It renders them.

### Common variants

Topology mismatch:

```text
Law violation: plugin projection identity is topology plus builder

This package lives under `plugins/cli/commands/work-items` but uses
`defineAgentToolPlugin(...)`.

Repair:
  Use `defineCliCommandPlugin(...)` or move the package to `plugins/agent/tools/...`.
```

Provider coverage:

```text
Law violation: profiles select supply

`WorkItemsService` requires `SqlPoolResource`, but profile `hq.production`
does not select a provider for that resource.

Repair:
  Add `sql.postgres({ configKey: "sql.primary" })` or another SQL provider to the profile.
```

Resource access:

```text
Law violation: dependencies are declared cold, then projected into execution

`DiskStatusBackground` accesses `FileSystemResource`, but the plugin does not
declare it under `resources`.

Repair:
  Add `resources: { filesystem: FileSystemResource }` to `plugin.ts`.
```

### Backend changes

No runtime behavior change.

Add renderer layer:

```text
packages/core/sdk/src/diagnostics/
  author-diagnostic.ts
  explain-runtime-diagnostic.ts
  laws.ts
```

Potential public surface:

```text
@rawr/sdk/diagnostics
  explainRuntimeDiagnostic(...)
```

This is optional but high leverage for AI agents.

## 14. Change set K — Reword native host ownership, especially OCLIF

### Now

The runtime spec says OCLIF owns command execution semantics. That phrase is easy to misread because RAWR owns Effect execution.

### Simple better

Replace:

```text
OCLIF owns command execution semantics.
```

With:

```text
OCLIF owns command dispatch, parsing, lifecycle, help/autocomplete, and host semantics after RAWR adapter lowering.
RAWR owns command executable bodies and invocation-time Effect execution through ProcessExecutionRuntime.
```

### Before / after

Before, an agent may infer:

```ts
import { Command } from "@oclif/core";

export default class CreateCommand extends Command {
  async run() {
    // business logic here
  }
}
```

After, canonical CLI authoring remains:

File: `plugins/cli/commands/work-items/src/commands/create.ts`

```ts
import { defineCommand } from "@rawr/sdk/plugins/cli/effect";

export const CreateWorkItemCommand = defineCommand({
  id: "work-items.create",
  effect: function* ({ clients, args, invocation }) {
    const workItems = clients.workItems.withInvocation({
      invocation: { traceId: invocation.traceId },
    });

    return yield* workItems.items.create({
      title: args.title,
    });
  },
});
```

OCLIF appears only behind the harness/adapter:

File: `packages/core/runtime/harnesses/oclif/src/generated-command.ts`

```ts
export class GeneratedRawrOclifCommand extends Command {
  async run() {
    const parsed = await this.parse(GeneratedRawrOclifCommand);
    const boundary = executionRegistry.get(commandPlan.executionRef);

    return processExecutionRuntime.execute({
      boundary,
      invocation: buildCliProcedureExecutionContext(parsed),
    });
  }
}
```

The Promise callback is host interop. The business body remains RAWR Effect.

### Backend changes

No code change required if implementation already delegates to `ProcessExecutionRuntime`.

Spec/doc change:

```text
packages/core/runtime/harnesses/oclif
  update harness law wording

RAWR_System_Architecture_Canonical_Spec_Final.md
  update CLI harness posture wording

RAWR_Effect_Runtime_Realization_System_Canonical_Spec(2).md
  update OCLIF harness boundary wording
```

Equivalent wording pass should apply to Elysia, Inngest, OpenShell, desktop, and web hosts where “execution semantics” could be confused with RAWR-owned local execution.

## 15. Change set L — Make plugin resource/service declaration and executable access mechanically connected

This change pulls together D and E into one hard rule.

### Rule

```text
A key declared under `services` or `resources` in `plugin.ts` becomes a key in the executable context.
No declaration, no context key.
No body scanning.
No runtime container lookup in ordinary authoring.
```

### Example: CLI with service and logger resource

File: `plugins/cli/commands/work-items/src/plugin.ts`

```ts
import { defineCliCommandPlugin } from "@rawr/sdk/plugins/cli";
import { LoggerResource } from "@rawr/resources/logger";
import { service as WorkItemsService } from "@rawr/services/work-items";
import { CreateWorkItemCommand } from "./commands/create";

export const createPlugin = defineCliCommandPlugin({
  capability: "work-items",

  services: {
    workItems: WorkItemsService,
  },

  resources: {
    logger: LoggerResource,
  },

  commands: [CreateWorkItemCommand],
});
```

File: `plugins/cli/commands/work-items/src/commands/create.ts`

```ts
export const CreateWorkItemCommand = defineCommand({
  id: "work-items.create",

  effect: function* ({ args, clients, resources, invocation }) {
    yield* resources.logger.info({
      message: "Creating work item",
      traceId: invocation.traceId,
    });

    const workItems = clients.workItems.withInvocation({
      invocation: { traceId: invocation.traceId },
    });

    return yield* workItems.items.create({
      title: args.title,
    });
  },
});
```

### Backend changes

The SDK must thread plugin declaration input type into leaf definition context type.

File: `packages/core/sdk/src/plugins/cli/define-command-plugin.ts`

```ts
export interface CliCommandPluginInput<
  TServices extends ServiceUseInputMap = {},
  TResources extends ResourceUseInputMap = {},
> {
  readonly capability: string;
  readonly services?: TServices;
  readonly resources?: TResources;
  readonly commands: readonly CliCommandDefinition<
    CliCommandExecutionContext<TServices, TResources>,
    any,
    any
  >[];
}
```

This may require either:

1. command definitions are generic over an ambient plugin context, or
2. plugin builder checks command compatibility and rebinds context types at collection time, or
3. command definitions declare their required service/resource keys explicitly and plugin builder verifies coverage.

Preferred path for type clarity:

```text
Command definitions declare only command-local args/flags/output/errors/effect.
Plugin builder supplies the service/resource context by collecting command leaves.
Type-level compatibility checks ensure every command's required context is covered.
```

If TypeScript cannot infer this cleanly, use an explicit helper:

File: `plugins/cli/commands/work-items/src/plugin.ts`

```ts
const commands = defineCliCommandSet({
  services: {
    workItems: WorkItemsService,
  },
  resources: {
    logger: LoggerResource,
  },
});

export const CreateWorkItemCommand = commands.defineCommand({
  id: "work-items.create",
  effect: function* ({ clients, resources }) {
    // fully typed here
  },
});

export const createPlugin = defineCliCommandPlugin({
  capability: "work-items",
  ...commands.project(),
});
```

This is more ceremony, so it should be advanced fallback only if TypeScript inference demands it.

## 16. Type correctness pass

The proposed changes must preserve these type rules.

### 16.1 Direct maps infer context keys

```ts
services: {
  workItems: WorkItemsService,
}
```

must infer:

```ts
clients.workItems: ConstructionBoundServiceClient<WorkItemsContract>
```

or, when invocation is already applied:

```ts
clients.workItems: InvocationBoundEffectServiceClient<WorkItemsContract>
```

### 16.2 Resource maps infer resource value keys

```ts
resources: {
  pubsubHub: ProcessPubSubHubResource,
}
```

must infer:

```ts
resources.pubsubHub: ProcessPubSubHub
```

If optional:

```ts
resources: {
  cache: optionalResource(ProcessCacheHubResource),
}
```

must infer:

```ts
resources.cache: ProcessCacheHub | undefined
```

### 16.3 Modifiers preserve underlying type

```ts
resourceRef(SqlPoolResource, { instance: "audit" })
```

must still infer:

```ts
SqlPool
```

The modifier changes requirement metadata, not the consumed value shape.

### 16.4 Split service maps still produce canonical `deps`

```ts
resources: { dbPool: SqlPoolResource }
services: { billing: BillingService }
semantic: { search: SearchAdapter }
```

must infer service boundary `deps` equivalent to:

```ts
context.deps.dbPool
context.deps.billing
context.deps.search
```

### 16.5 No public runtime descriptors in ordinary authoring

An ordinary author can build a service, plugin, app, profile, provider, resource, command, tool, workflow step, and desktop background without importing:

```text
@rawr/sdk/execution
packages/core/runtime/**
packages/core/sdk/src/**/internal/**
```

## 17. Nativity pass: RAWR × Effect × vendor integration

### 17.1 Effect nativity

Keep:

```ts
import { Effect, TaggedError, type RawrEffect } from "@rawr/sdk/effect";
```

Do not replace with:

```ts
rawr.fail(...)
ctx.effect.fail(...)
module.fail(...)
```

Effect is the execution algebra. RAWR curates the import and owns runtime lowering.

### 17.2 oRPC nativity

Server and service callable contracts keep oRPC-shaped composition:

```text
contract
implementer
.use(...)
.router(...)
procedure.effect(function*)
errors from contract
```

Do not expose raw effect-oRPC authoring.

### 17.3 OCLIF nativity

OCLIF remains native inside `packages/core/runtime/harnesses/oclif`. Authors do not import OCLIF. OCLIF command classes are adapter/harness products that delegate to `ProcessExecutionRuntime`.

### 17.4 Inngest nativity

Inngest remains native durable async owner. RAWR async workflow definitions and `defineAsyncStepEffect(...)` produce cold step-local descriptors. Native workflow `run(ctx)` calls `stepEffect(ctx).run(StepDescriptor)`.

### 17.5 Desktop/web/agent nativity

Desktop, web, and agent hosts own host interiors after RAWR lowering. Plugin authors write lane-native definitions and RAWR Effect bodies. They do not receive broad host internals unless a lane-specific companion spec explicitly grants a curated facade.

## 18. Cohesion pass: what changes and what does not

### Changes

```text
`.factory()` removed from ordinary plugin authoring.
Plugin package grammar made two-level and homologous.
Direct service/resource maps replace redundant use wrappers.
Split service declaration maps replace mixed deps wrappers in canonical examples.
Projected resources replace ordinary resources.require(...) body usage.
@rawr/sdk/execution demoted from ordinary authoring.
Author-facing diagnostic explanations added above raw RuntimeDiagnostic.
OCLIF wording clarified.
```

### Does not change

```text
Runtime lifecycle.
Execution descriptor spine.
RawrEffect semantics.
EffectRuntimeAccess ownership.
ManagedRuntime ownership.
ExecutionRegistry matching.
ProcessExecutionRuntime invocation path.
Bootgraph/provider lowering.
ProviderEffectPlan separation.
RuntimeCatalog minimum sections.
Harness/adapters consuming compiled/lowered payloads only.
Service ownership.
Plugin projection ownership.
App selection ownership.
Resource/provider/profile separation.
```

## 19. Consolidated before / after

### Before: CLI plugin package

```ts
import {
  defineCliCommandPlugin,
  useService,
} from "@rawr/sdk/plugins/cli";

export const createPlugin = defineCliCommandPlugin.factory()({
  capability: "work-items",
  services: {
    workItems: useService(WorkItemsService),
  },
  commands: [CreateWorkItemCommand],
});
```

### After: CLI plugin package

```ts
import { defineCliCommandPlugin } from "@rawr/sdk/plugins/cli";

export const createPlugin = defineCliCommandPlugin({
  capability: "work-items",
  services: {
    workItems: WorkItemsService,
  },
  commands: [CreateWorkItemCommand],
});
```

### Before: desktop resource access

```ts
effect: function* ({ resources }) {
  const filesystem = yield* resources.require(FileSystemResource);
  const pubsubHub = yield* resources.require(ProcessPubSubHubResource);
}
```

### After: desktop resource access

```ts
// plugin.ts
resources: {
  filesystem: FileSystemResource,
  pubsubHub: ProcessPubSubHubResource,
}
```

```ts
// background.ts
effect: function* ({ resources }) {
  const usage = yield* resources.filesystem.diskUsageSummary();
  const topic = yield* resources.pubsubHub.topic({ id: "desktop.disk-status" });
}
```

### Before: service dependency declaration

```ts
deps: {
  dbPool: resourceDep(SqlPoolResource),
  billing: serviceDep(BillingService),
  search: semanticDep(SearchAdapter),
}
```

### After: service dependency declaration

```ts
resources: {
  dbPool: SqlPoolResource,
},
services: {
  billing: BillingService,
},
semantic: {
  search: SearchAdapter,
}
```

### Before: execution internals visible in docs

```ts
import type { ExecutionDescriptorRef } from "@rawr/sdk/execution";
```

### After: ordinary authoring hides descriptors

```ts
create: module.create.effect(function* ({ input, context }) {
  return yield* context.repo.insert(input);
})
```

## 20. Acceptance gates for this ergonomics pass

### Static/import gates

```text
ordinary authoring imports no packages/core/runtime/**
ordinary authoring imports no SDK internals
ordinary authoring imports no raw effect/effect-orpc
ordinary authoring imports no @rawr/sdk/execution unless advanced/generated/diagnostic module
plugin packages export one createPlugin factory
plugin package path matches lane builder
```

### Type gates

```text
defineXPlugin(...) returns PluginFactory
withOptions(...) returns PluginFactory<TOptions>
direct services map infers clients keys
direct resources map infers resource keys
resource modifiers preserve resource value type
service modifiers preserve service contract type
split service maps infer canonical deps type
optional resources become optional context fields
resources.require(...) rejects undeclared resources
Effect bodies preserve success/error/requirement inference
```

### Runtime/derivation gates

```text
direct service maps normalize to ServiceUse artifacts
direct resource maps normalize to ResourceRequirement artifacts
split service maps normalize to resource/service/semantic dependency artifacts
execution descriptor refs still derive only from executable leaves
no body scan is used for dependency discovery
CompiledExecutionPlan shape unchanged
ExecutionRegistry assembly unchanged
ProcessExecutionRuntime path unchanged
```

### Diagnostic gates

```text
redundant useService wrapper diagnostic
redundant useResource wrapper diagnostic
.factory compatibility diagnostic
undeclared resource access diagnostic
ordinary @rawr/sdk/execution import diagnostic
author-facing law explanation generated for raw runtime diagnostic
```

## 21. Migration strategy

```text
1. Add new direct builder signatures while keeping existing .factory() compatibility.
2. Add direct service/resource map normalization while keeping useService/resourceDep compatibility.
3. Add split service maps while keeping mixed deps compatibility.
4. Update generated examples first.
5. Add codemods:
   - defineXPlugin.factory()({ ... }) -> defineXPlugin({ ... })
   - services: { x: useService(X) } -> services: { x: X }
   - resources.require(Resource) common cases -> declared resource map + resources.<key>
   - deps wrappers -> split maps where unambiguous
6. Add warnings, not errors, for compatibility forms.
7. Ratchet generated code to new canonical forms.
8. Make old forms noncanonical in docs.
9. Optionally elevate warnings to errors in strict authoring profiles.
```

## 22. Stale-document containment

Any older document or indexed example that shows these as canonical must be updated, subordinated, or moved to archive/quarantine:

```text
public `.handler(...)` terminal as canonical service/plugin authoring
Promise business execution branches
raw Effect imports in ordinary authoring
global `fx` as canonical spelling
`defineXPlugin.factory()({...})` as canonical spelling
`useService(...)` inside already-named `services` maps as canonical spelling
ordinary `resources.require(Resource)` without declaration map
OCLIF Command.run containing business logic
plugins importing service repositories or providers
apps/entrypoints manually mounting surfaces or running RawrEffect
```

This is migration-readiness work, not a new architecture decision.

## 23. Final proposed authoring picture

```text
Service authoring
  defineService({ resources, services, semantic, scope, config, invocation })
  oRPC-shaped contracts
  module-local middleware and projection
  repository IO returns RawrEffect
  procedure.effect(function*)

Plugin authoring
  defineXPlugin({ capability, services, resources, lane-native leaves })
  direct maps for common dependencies
  modifiers only for optional/instance/lifetime/role/policy
  lane-native executable leaves use effect: function* or .effect(function*)

App authoring
  defineApp({ plugins: [pluginFactory()] })
  defineRuntimeProfile({ providers, configSources })
  startApp(app, { entrypointId, profile, roles })

Execution
  authors see Effect facade and lane-native effect terminals
  SDK derives descriptors
  runtime compiles plans
  registry matches execution
  process execution runtime invokes
  host callbacks delegate

Diagnostics
  raw runtime diagnostics remain precise
  author-facing explanations name violated laws and repairs
```

The result is simpler without being magical:

```text
The author declares facts directly.
The SDK normalizes them explicitly.
The runtime realizes the same architecture.
The host frameworks stay native but hidden.
Effect stays native-shaped but curated.
Agents get fewer fake layers to copy.
```
