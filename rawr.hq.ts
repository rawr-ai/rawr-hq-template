import { randomUUID } from "node:crypto";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createInngestServeHandler } from "@rawr/coordination-inngest";
import { createHqRuntimeRouter } from "@rawr/core/orpc";
import { createClient as createExampleTodoClient, type Client as ExampleTodoClient } from "@rawr/example-todo";
import { supportExampleRouter } from "@rawr/support-example/router";
import { Inngest } from "inngest";
import { createHostLoggerAdapter } from "./apps/server/src/logging";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedInMemoryDbPoolAdapter } from "@rawr/hq-sdk/host-adapters/sql/embedded-in-memory";
import { registerExampleTodoApiPlugin } from "./plugins/api/example-todo";
import { createSupportExampleInngestFunctions, registerSupportExampleWorkflowPlugin } from "./plugins/workflows/support-example";

// Keep capability fixture state stable per repo root across requests in local dev/test runs.
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
const supportExampleDepsByRepoRoot = new Map<string, SupportExampleServiceDeps>();
const exampleTodoClientsByRepoRoot = new Map<string, ExampleTodoClient>();
const exampleTodoHostLogger = createHostLoggerAdapter();

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

function createExampleTodoBoundary() {
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
      logger: exampleTodoHostLogger,
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
  } satisfies Parameters<typeof createExampleTodoClient>[0];
}

function resolveExampleTodoClient(repoRoot: string): ExampleTodoClient {
  const existing = exampleTodoClientsByRepoRoot.get(repoRoot);
  if (existing) {
    return existing;
  }

  const client = createExampleTodoClient(createExampleTodoBoundary());
  exampleTodoClientsByRepoRoot.set(repoRoot, client);
  return client;
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

// Host owns one runtime client instance and injects it into the workflow bundle.
const supportExampleInngestClient = new Inngest({ id: "rawr-support-example" });

const coreOrpcRouter = createHqRuntimeRouter();
const exampleTodoApiPlugin = registerExampleTodoApiPlugin({
  resolveClient: resolveExampleTodoClient,
});
// `support-example` survives only as an explicit legacy workflow/demo surface.
const supportExampleWorkflowPlugin = registerSupportExampleWorkflowPlugin();
const composedOrpcRouter = {
  ...coreOrpcRouter,
  ...exampleTodoApiPlugin.router,
};
const composedWorkflowTriggerRouter = supportExampleWorkflowPlugin.router;
const supportExampleInngestFunctions = createSupportExampleInngestFunctions({
  client: supportExampleInngestClient,
  resolveSupportExampleClient,
});

export const rawrHqManifest = {
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
    // Keep the legacy workflow/demo lane explicit so canonical API proof stays on example-todo.
    capabilities: {
      "support-example": {
        pathPrefix: "/support-example/triage",
      },
    },
    triggerRouter: composedWorkflowTriggerRouter,
    enrichContext: enrichSupportExampleWorkflowContext,
  },
  inngest: {
    client: supportExampleInngestClient,
    functions: supportExampleInngestFunctions,
    handler: createInngestServeHandler({ client: supportExampleInngestClient, functions: supportExampleInngestFunctions }),
  },
} as const;

export type RawrHqManifest = typeof rawrHqManifest;
