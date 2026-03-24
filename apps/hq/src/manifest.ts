import { randomUUID } from "node:crypto";
import { implement, type RouterClient, createRouterClient } from "@orpc/server";
import { createClient as createExampleTodoClient, type Client as ExampleTodoClient } from "@rawr/example-todo";
import {
  composeApiPlugins,
  type AnyContractRouterObject,
  type AnyProcedureRouterObject,
} from "@rawr/hq-sdk/apis";
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
type StateBoundary = Parameters<typeof createStateClient>[0];
export type HostServiceLogger = ExampleTodoBoundary["deps"]["logger"];
export type CreateRawrHqManifestOptions = {
  hostLogger: HostServiceLogger;
};

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

function isMergeableSurfaceNode(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !("~orpc" in (value as Record<string, unknown>));
}

function mergeDeclaredSurfaceTrees<TTree extends object>(
  trees: readonly TTree[],
  path: readonly string[] = [],
): TTree {
  const merged: Record<string, unknown> = {};

  for (const tree of trees) {
    for (const [key, value] of Object.entries(tree)) {
      if (!(key in merged)) {
        merged[key] = value;
        continue;
      }

      const existing = merged[key];
      if (isMergeableSurfaceNode(existing) && isMergeableSurfaceNode(value)) {
        merged[key] = mergeDeclaredSurfaceTrees(
          [existing, value] as readonly Record<string, unknown>[],
          [...path, key],
        );
        continue;
      }

      throw new Error(`duplicate declared surface at ${[...path, key].join(".")}`);
    }
  }

  return merged as TTree;
}

export function createRawrHqManifest(options: CreateRawrHqManifestOptions) {
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
  const coordinationApiPlugin = registerCoordinationApiPlugin();
  const stateApiPlugin = registerStateApiPlugin({
    resolveClient: resolveStateClient,
  });
  const exampleTodoApiPlugin = registerExampleTodoApiPlugin({
    resolveClient: resolveExampleTodoClient,
  });
  const composedApiSurface = composeApiPlugins([
    coordinationApiPlugin,
    stateApiPlugin,
    exampleTodoApiPlugin,
  ] as const);
  const coordinationWorkflowPlugin = registerCoordinationWorkflowPlugin();
  const supportExampleWorkflowPlugin = registerSupportExampleWorkflowPlugin({
    resolveSupportExampleClient,
  });
  const composedWorkflowSurface = composeWorkflowPlugins([
    supportExampleWorkflowPlugin,
    coordinationWorkflowPlugin,
  ] as const);
  const composedOrpcContract = mergeDeclaredSurfaceTrees<AnyContractRouterObject>([
    composedApiSurface.internalContract,
    composedWorkflowSurface.internalContract,
  ] as const);
  const requestScopedOrpc = implement(composedOrpcContract).$context<BoundaryRequestSupportContext>();
  const requestScopedPublishedApi = implement(composedApiSurface.publishedContract).$context<BoundaryRequestSupportContext>();
  const requestScopedPublishedWorkflow = implement(composedWorkflowSurface.publishedContract)
    .$context<BoundaryRequestSupportContext>();
  const requestScopedInternalWorkflow = implement(composedWorkflowSurface.internalContract)
    .$context<BoundaryRequestSupportContext>();
  const composedOrpcRouter = requestScopedOrpc.router(mergeDeclaredSurfaceTrees<AnyProcedureRouterObject>([
    composedApiSurface.internalRouter,
    composedWorkflowSurface.internalRouter,
  ] as const));
  const publishedWorkflowRouter = requestScopedPublishedWorkflow.router(composedWorkflowSurface.publishedRouter);
  const internalWorkflowRouter = requestScopedInternalWorkflow.router(composedWorkflowSurface.internalRouter);
  const publishedApiRouter = requestScopedPublishedApi.router(composedApiSurface.publishedRouter);

  return {
    fixtures: {
      exampleTodo: {
        resolveClient: resolveExampleTodoClient,
      },
      supportExample: {
        resolveServiceDeps: resolveSupportExampleDeps,
        resolveClient: resolveSupportExampleClient,
      },
    },
    orpc: {
      contract: composedOrpcContract,
      router: composedOrpcRouter,
      published: {
        contract: composedApiSurface.publishedContract,
        router: publishedApiRouter,
      },
    },
    workflows: {
      surfaces: composedWorkflowSurface.surfaces,
      internal: {
        contract: composedWorkflowSurface.internalContract,
        router: internalWorkflowRouter,
      },
      published: {
        contract: composedWorkflowSurface.publishedContract,
        router: publishedWorkflowRouter,
      },
      createInngestFunctions: composedWorkflowSurface.createInngestFunctions,
    },
  } as const;
}

export type RawrHqManifest = ReturnType<typeof createRawrHqManifest>;
