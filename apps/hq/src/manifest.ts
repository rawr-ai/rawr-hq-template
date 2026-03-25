import { randomUUID } from "node:crypto";
import { implement } from "@orpc/server";
import { type RouterClient, createRouterClient } from "@orpc/server";
import { createClient as createCoordinationClient, type Client as CoordinationClient } from "@rawr/coordination";
import { createClient as createExampleTodoClient, type Client as ExampleTodoClient } from "@rawr/example-todo";
import {
  composeApiPlugins,
  type MaterializedApiPluginRegistration,
} from "@rawr/hq-sdk/apis";
import {
  mergeDeclaredSurfaceTrees,
} from "@rawr/hq-sdk/composition";
import {
  composeWorkflowPlugins,
} from "@rawr/hq-sdk/workflows";
import { createClient as createStateClient, type Client as StateClient } from "@rawr/state";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedInMemoryDbPoolAdapter } from "@rawr/hq-sdk/host-adapters/sql/embedded-in-memory";
import { registerCoordinationApiPlugin } from "@rawr/plugin-api-coordination/server";
import { registerExampleTodoApiPlugin } from "@rawr/plugin-api-example-todo/server";
import { registerStateApiPlugin } from "@rawr/plugin-api-state/server";
import {
  registerCoordinationWorkflowPlugin,
} from "@rawr/plugin-workflows-coordination/server";
import {
  registerSupportExampleWorkflowPlugin,
} from "@rawr/plugin-workflows-support-example/server";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import { supportExampleRouter } from "@rawr/support-example/router";
import type { ApiPluginRegistration } from "@rawr/hq-sdk/apis";
import type { WorkflowPluginRegistration } from "@rawr/hq-sdk/workflows";

type SupportExampleClient = RouterClient<typeof supportExampleRouter>;
type SupportExampleWorkItem = Awaited<ReturnType<SupportExampleClient["triage"]["items"]["request"]>>["workItem"];
type SupportExampleServiceDeps = {
  store: {
    save(workItem: SupportExampleWorkItem): Promise<void>;
    get(workItemId: string): Promise<SupportExampleWorkItem | null>;
    list(): Promise<SupportExampleWorkItem[]>;
  };
  now: () => string;
  generateWorkItemId: () => string;
};
type ExampleTodoBoundary = Parameters<typeof createExampleTodoClient>[0];
type CoordinationBoundary = Parameters<typeof createCoordinationClient>[0];
type CoordinationWorkflowClient = CoordinationClient["workflows"];
type StateBoundary = Parameters<typeof createStateClient>[0];
export type HostServiceLogger = ExampleTodoBoundary["deps"]["logger"];
export type CreateRawrHqManifestOptions = {
  hostLogger: HostServiceLogger;
};

function bindApiPluginRegistration<TPlugin extends ApiPluginRegistration>(
  plugin: TPlugin,
  bound?: unknown,
): MaterializedApiPluginRegistration {
  if (!plugin.contribute || bound === undefined) {
    return plugin as MaterializedApiPluginRegistration;
  }

  return {
    ...plugin,
    ...plugin.contribute(bound as never),
  } satisfies MaterializedApiPluginRegistration;
}

function bindWorkflowPluginRegistration<TPlugin extends WorkflowPluginRegistration>(
  plugin: TPlugin,
  bound?: unknown,
): TPlugin {
  if (!plugin.contribute || bound === undefined) {
    return plugin;
  }

  return {
    ...plugin,
    ...plugin.contribute(bound as never),
  };
}

// Keep capability fixture state stable per repo root across requests in local dev/test runs.
const supportExampleDepsByRepoRoot = new Map<string, SupportExampleServiceDeps>();

function createInMemoryTriageWorkItemStore(): SupportExampleServiceDeps["store"] {
  const workItems = new Map<string, SupportExampleWorkItem>();

  return {
    async save(workItem: SupportExampleWorkItem): Promise<void> {
      workItems.set(workItem.workItemId, { ...workItem });
    },

    async get(workItemId: string): Promise<SupportExampleWorkItem | null> {
      const workItem = workItems.get(workItemId);
      return workItem ? { ...workItem } : null;
    },

    async list(): Promise<SupportExampleWorkItem[]> {
      return [...workItems.values()].map((workItem) => ({ ...workItem }));
    },
  };
}

function createSupportExampleWorkItemId(): string {
  return `support-example-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function resolveSupportExampleDeps(repoRoot: string): SupportExampleServiceDeps {
  const existing = supportExampleDepsByRepoRoot.get(repoRoot);
  if (existing) {
    return existing;
  }

  const deps: SupportExampleServiceDeps = {
    store: createInMemoryTriageWorkItemStore(),
    now: () => new Date().toISOString(),
    generateWorkItemId: createSupportExampleWorkItemId,
  };
  supportExampleDepsByRepoRoot.set(repoRoot, deps);
  return deps;
}

function resolveSupportExampleClient(repoRoot: string): SupportExampleClient {
  return createRouterClient(supportExampleRouter, {
    context: {
      deps: resolveSupportExampleDeps(repoRoot),
    },
  });
}

function createExampleTodoBoundary(hostLogger: HostServiceLogger): ExampleTodoBoundary {
  let tick = 0;

  return {
    deps: {
      dbPool: createEmbeddedInMemoryDbPoolAdapter(),
      clock: {
        now: () => {
          tick += 1;
          return new Date(Date.UTC(2026, 1, 25, 0, 0, tick)).toISOString();
        },
      },
      logger: hostLogger,
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: {
      workspaceId: "workspace-default",
    },
    config: {
      readOnly: false,
      limits: {
        maxAssignmentsPerTask: 2,
      },
    },
  } satisfies ExampleTodoBoundary;
}

function createStateBoundary(repoRoot: string, hostLogger: HostServiceLogger): StateBoundary {
  return {
    deps: {
      logger: hostLogger,
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: {
      repoRoot,
    },
    config: {},
  } satisfies StateBoundary;
}

function createCoordinationBoundary(
  repoRoot: string,
  hostLogger: HostServiceLogger,
): CoordinationBoundary {
  return {
    deps: {
      logger: hostLogger,
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: {
      repoRoot,
    },
    config: {},
  } satisfies CoordinationBoundary;
}

function materializeManifestBridgeSurfaces(input: {
  api: ReturnType<typeof composeApiPlugins>;
  workflows: ReturnType<typeof composeWorkflowPlugins>;
}) {
  const contract = mergeDeclaredSurfaceTrees([
    input.api.internalContract,
    input.workflows.internalContract,
  ]);
  const router = mergeDeclaredSurfaceTrees([
    input.api.internalRouter,
    input.workflows.internalRouter,
  ]);
  const requestScopedOrpc = implement(contract).$context<BoundaryRequestSupportContext>();
  const requestScopedPublishedApi = implement(input.api.publishedContract).$context<BoundaryRequestSupportContext>();
  const requestScopedPublishedWorkflow = implement(input.workflows.publishedContract).$context<BoundaryRequestSupportContext>();
  const requestScopedInternalWorkflow = implement(input.workflows.internalContract).$context<BoundaryRequestSupportContext>();

  return {
    orpc: {
      contract,
      router: requestScopedOrpc.router(router),
      published: {
        contract: input.api.publishedContract,
        router: requestScopedPublishedApi.router(input.api.publishedRouter),
      },
    },
    workflows: {
      surfaces: input.workflows.surfaces,
      internal: {
        contract: input.workflows.internalContract,
        router: requestScopedInternalWorkflow.router(input.workflows.internalRouter),
      },
      published: {
        contract: input.workflows.publishedContract,
        router: requestScopedPublishedWorkflow.router(input.workflows.publishedRouter),
      },
      createInngestFunctions: input.workflows.createInngestFunctions,
    },
  } as const;
}

export function createRawrHqManifest(options: CreateRawrHqManifestOptions) {
  const coordinationWorkflowClientsByRepoRoot = new Map<string, CoordinationWorkflowClient>();
  const exampleTodoClientsByRepoRoot = new Map<string, ExampleTodoClient>();
  const stateClientsByRepoRoot = new Map<string, StateClient>();

  function resolveExampleTodoClient(repoRoot: string): ExampleTodoClient {
    const existing = exampleTodoClientsByRepoRoot.get(repoRoot);
    if (existing) {
      return existing;
    }

    const client = createExampleTodoClient(createExampleTodoBoundary(options.hostLogger));
    exampleTodoClientsByRepoRoot.set(repoRoot, client);
    return client;
  }

  function resolveCoordinationWorkflowClient(repoRoot: string): CoordinationWorkflowClient {
    const existing = coordinationWorkflowClientsByRepoRoot.get(repoRoot);
    if (existing) {
      return existing;
    }

    const client = createCoordinationClient(
      createCoordinationBoundary(repoRoot, options.hostLogger),
    ).workflows;
    coordinationWorkflowClientsByRepoRoot.set(repoRoot, client);
    return client;
  }

  function resolveStateClient(repoRoot: string): StateClient {
    const existing = stateClientsByRepoRoot.get(repoRoot);
    if (existing) {
      return existing;
    }

    const client = createStateClient(createStateBoundary(repoRoot, options.hostLogger));
    stateClientsByRepoRoot.set(repoRoot, client);
    return client;
  }

  // Host owns runtime realization. The app manifest only composes plugin registrations
  // and exposes the capability fixture/client resolvers the host can mount later.
  const coordinationApiPlugin = registerCoordinationApiPlugin({
    resolveClient: resolveCoordinationWorkflowClient,
  });
  const stateApiPlugin = registerStateApiPlugin({
    resolveClient: resolveStateClient,
  });
  const exampleTodoApiPlugin = registerExampleTodoApiPlugin();
  const apiPlugins = {
    coordination: coordinationApiPlugin,
    state: stateApiPlugin,
    exampleTodo: exampleTodoApiPlugin,
  } as const;
  const composedApiSurface = composeApiPlugins([
    apiPlugins.coordination as MaterializedApiPluginRegistration,
    apiPlugins.state as MaterializedApiPluginRegistration,
    bindApiPluginRegistration(
      apiPlugins.exampleTodo,
      {
        resolveClient: resolveExampleTodoClient,
      },
    ),
  ] as const);
  const coordinationWorkflowPlugin = registerCoordinationWorkflowPlugin({
    resolveAuthoringClient: resolveCoordinationWorkflowClient,
  });
  const supportExampleWorkflowPlugin = registerSupportExampleWorkflowPlugin();
  const workflowPlugins = {
    supportExample: supportExampleWorkflowPlugin,
    coordination: coordinationWorkflowPlugin,
  } as const;
  const composedWorkflowSurface = composeWorkflowPlugins([
    bindWorkflowPluginRegistration(
      workflowPlugins.supportExample,
      {
        resolveSupportExampleClient,
      },
    ),
    workflowPlugins.coordination,
  ] as const);
  const materializedSurfaces = materializeManifestBridgeSurfaces({
    api: composedApiSurface,
    workflows: composedWorkflowSurface,
  });

  return {
    // Transitional mixed-world bridge: keep legacy materialized surfaces available
    // while the host begins consuming registration declarations directly.
    plugins: {
      api: apiPlugins,
      workflows: workflowPlugins,
    },
    fixtures: {
      exampleTodo: {
        resolveClient: resolveExampleTodoClient,
      },
      supportExample: {
        resolveServiceDeps: resolveSupportExampleDeps,
        resolveClient: resolveSupportExampleClient,
      },
    },
    orpc: materializedSurfaces.orpc,
    workflows: materializedSurfaces.workflows,
  } as const;
}

export type RawrHqManifest = ReturnType<typeof createRawrHqManifest>;
