import { createClient as createExampleTodoClient, type Client as ExampleTodoClient } from "@rawr/example-todo";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedInMemoryDbPoolAdapter } from "@rawr/hq-sdk/host-adapters/sql/embedded-in-memory";
import { createClient as createStateClient, type Client as StateClient } from "@rawr/state";
type ExampleTodoBoundary = Parameters<typeof createExampleTodoClient>[0];
type StateBoundary = Parameters<typeof createStateClient>[0];

export type HostServiceLogger = ExampleTodoBoundary["deps"]["logger"];

export type RawrHostSatisfiers = Readonly<{
  exampleTodo: {
    resolveClient(repoRoot: string): ExampleTodoClient;
  };
  state: {
    resolveClient(repoRoot: string): StateClient;
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

export function createRawrHostSatisfiers(input: {
  hostLogger: HostServiceLogger;
}): RawrHostSatisfiers {
  const exampleTodoClientsByRepoRoot = new Map<string, ExampleTodoClient>();
  const stateClientsByRepoRoot = new Map<string, StateClient>();

  function resolveExampleTodoClient(repoRoot: string): ExampleTodoClient {
    const existing = exampleTodoClientsByRepoRoot.get(repoRoot);
    if (existing) {
      return existing;
    }

    const client = createExampleTodoClient(createExampleTodoBoundary(input.hostLogger));
    exampleTodoClientsByRepoRoot.set(repoRoot, client);
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
  } as const;
}
