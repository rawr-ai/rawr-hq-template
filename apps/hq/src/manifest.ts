import { randomUUID } from "node:crypto";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createInngestServeHandler } from "@rawr/coordination-inngest";
import { createClient as createExampleTodoClient, type Client as ExampleTodoClient } from "@rawr/example-todo";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedInMemoryDbPoolAdapter } from "@rawr/hq-sdk/host-adapters/sql/embedded-in-memory";
import { supportExampleRouter } from "@rawr/support-example/router";
import { Inngest } from "inngest";
import { registerExampleTodoApiPlugin } from "../../../plugins/api/example-todo";
import { createSupportExampleInngestFunctions, registerSupportExampleWorkflowPlugin } from "../../../plugins/workflows/support-example";
import { createHqRuntimeRouter } from "./orpc";

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
export type ExampleTodoHostLogger = ExampleTodoBoundary["deps"]["logger"];
export type CreateRawrHqManifestOptions = {
  exampleTodoLogger: ExampleTodoHostLogger;
};

// Keep capability fixture state stable per repo root across requests in local dev/test runs.
const supportExampleDepsByRepoRoot = new Map<string, SupportExampleServiceDeps>();
export const rawrHqWorkflowCapabilities = {
  "support-example": {
    pathPrefix: "/support-example/triage",
  },
} as const;

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

function createExampleTodoBoundary(exampleTodoLogger: ExampleTodoHostLogger): ExampleTodoBoundary {
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
      logger: exampleTodoLogger,
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

function passthroughOrpcContext<T>(context: T) {
  return context;
}

function enrichSupportExampleWorkflowContext<T extends { repoRoot: string }>(context: T) {
  return {
    ...context,
    supportExample: resolveSupportExampleClient(context.repoRoot),
  };
}

export function createRawrHqManifest(options: CreateRawrHqManifestOptions) {
  const exampleTodoClientsByRepoRoot = new Map<string, ExampleTodoClient>();

  function resolveExampleTodoClient(repoRoot: string): ExampleTodoClient {
    const existing = exampleTodoClientsByRepoRoot.get(repoRoot);
    if (existing) {
      return existing;
    }

    const client = createExampleTodoClient(createExampleTodoBoundary(options.exampleTodoLogger));
    exampleTodoClientsByRepoRoot.set(repoRoot, client);
    return client;
  }

  // Host owns the runtime wiring; app authority owns only the composition contract.
  const supportExampleInngestClient = new Inngest({ id: "rawr-support-example" });
  const hqOrpcRouter = createHqRuntimeRouter();
  const exampleTodoApiPlugin = registerExampleTodoApiPlugin({
    resolveClient: resolveExampleTodoClient,
  });
  const supportExampleWorkflowPlugin = registerSupportExampleWorkflowPlugin();
  const composedOrpcRouter = {
    ...hqOrpcRouter,
    ...exampleTodoApiPlugin.router,
  };
  const composedWorkflowTriggerRouter = supportExampleWorkflowPlugin.router;
  const supportExampleInngestFunctions = createSupportExampleInngestFunctions({
    client: supportExampleInngestClient,
    resolveSupportExampleClient,
  });

  return {
    fixtures: {
      exampleTodo: {
        resolveClient: resolveExampleTodoClient,
      },
      supportExample: {
        resolveServiceDeps: resolveSupportExampleDeps,
      },
    },
    orpc: {
      router: composedOrpcRouter,
      enrichContext: passthroughOrpcContext,
    },
    workflows: {
      capabilities: rawrHqWorkflowCapabilities,
      triggerRouter: composedWorkflowTriggerRouter,
      enrichContext: enrichSupportExampleWorkflowContext,
    },
    inngest: {
      client: supportExampleInngestClient,
      functions: supportExampleInngestFunctions,
      handler: createInngestServeHandler({
        client: supportExampleInngestClient,
        functions: supportExampleInngestFunctions,
      }),
    },
  } as const;
}

export type RawrHqManifest = ReturnType<typeof createRawrHqManifest>;
