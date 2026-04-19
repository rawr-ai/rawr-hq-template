import { randomUUID } from "node:crypto";
import { type RouterClient, createRouterClient } from "@orpc/server";
import { createClient as createCoordinationClient, type Client as CoordinationClient } from "@rawr/coordination";
import { createClient as createExampleTodoClient, type Client as ExampleTodoClient } from "@rawr/example-todo";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedInMemoryDbPoolAdapter } from "@rawr/hq-sdk/host-adapters/sql/embedded-in-memory";
import { createClient as createStateClient, type Client as StateClient } from "@rawr/state";
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
type CoordinationBoundary = Parameters<typeof createCoordinationClient>[0];
type CoordinationWorkflowClient = CoordinationClient["workflows"];
type StateBoundary = Parameters<typeof createStateClient>[0];

export type HostServiceLogger = ExampleTodoBoundary["deps"]["logger"];

export type RawrHostSatisfiers = Readonly<{
  exampleTodo: {
    resolveClient(repoRoot: string): ExampleTodoClient;
  };
  state: {
    resolveClient(repoRoot: string): StateClient;
  };
  coordination: {
    resolveWorkflowClient(repoRoot: string): CoordinationWorkflowClient;
  };
  supportExample: {
    resolveClient(repoRoot: string): SupportExampleClient;
  };
}>;

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical host-owned satisfier home
 *
 * Owns:
 * - capability-specific process-scoped satisfier construction
 * - cache lifetimes for host-owned clients/adapters used during binding
 * - logger/adaptor injection needed before request materialization exists
 *
 * Must not own:
 * - plugin selection
 * - binding of registrations into contributions
 * - route mounting
 * - request context hydration
 *
 * Canonical:
 * - explicit capability-shaped satisfiers consumed by `host-seam.ts`
 *
 * Must stay non-generic:
 * - no DI container
 * - no provider registry
 * - no capability-keyed generic map API
 */
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

export function createRawrHostSatisfiers(input: {
  hostLogger: HostServiceLogger;
}): RawrHostSatisfiers {
  const supportExampleDepsByRepoRoot = new Map<string, SupportExampleServiceDeps>();
  const exampleTodoClientsByRepoRoot = new Map<string, ExampleTodoClient>();
  const coordinationWorkflowClientsByRepoRoot = new Map<string, CoordinationWorkflowClient>();
  const stateClientsByRepoRoot = new Map<string, StateClient>();

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

  function resolveExampleTodoClient(repoRoot: string): ExampleTodoClient {
    const existing = exampleTodoClientsByRepoRoot.get(repoRoot);
    if (existing) {
      return existing;
    }

    const client = createExampleTodoClient(createExampleTodoBoundary(input.hostLogger));
    exampleTodoClientsByRepoRoot.set(repoRoot, client);
    return client;
  }

  function resolveCoordinationWorkflowClient(repoRoot: string): CoordinationWorkflowClient {
    const existing = coordinationWorkflowClientsByRepoRoot.get(repoRoot);
    if (existing) {
      return existing;
    }

    const client = createCoordinationClient(
      createCoordinationBoundary(repoRoot, input.hostLogger),
    ).workflows;
    coordinationWorkflowClientsByRepoRoot.set(repoRoot, client);
    return client;
  }

  function resolveStateClient(repoRoot: string): StateClient {
    const existing = stateClientsByRepoRoot.get(repoRoot);
    if (existing) {
      return existing;
    }

    const client = createStateClient(createStateBoundary(repoRoot, input.hostLogger));
    stateClientsByRepoRoot.set(repoRoot, client);
    return client;
  }

  return {
    exampleTodo: {
      resolveClient: resolveExampleTodoClient,
    },
    state: {
      resolveClient: resolveStateClient,
    },
    coordination: {
      resolveWorkflowClient: resolveCoordinationWorkflowClient,
    },
    supportExample: {
      resolveClient: resolveSupportExampleClient,
    },
  } as const;
}
