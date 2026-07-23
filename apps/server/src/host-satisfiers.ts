import {
  createClient as createExampleTodoClient,
  type Client as ExampleTodoClient,
} from "@rawr/example-todo";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedInMemoryDbPoolAdapter } from "@rawr/hq-sdk/host-adapters/sql/embedded-in-memory";
import {
  bindService,
  type ProcessView,
  type RoleView,
  type ServiceBinding,
  type ServiceBindingContext,
} from "@rawr/hq-sdk/plugins";

type ExampleTodoBoundary = Parameters<typeof createExampleTodoClient>[0];
type HostProcess = ProcessView & {
  processId: "server";
  repoRoot: string;
};
type ExampleTodoRole = RoleView & {
  roleId: "example-todo";
  capability: "example-todo";
};
type ExampleTodoBindingContext = ServiceBindingContext<HostProcess, ExampleTodoRole>;

export type HostServiceLogger = ExampleTodoBoundary["deps"]["logger"];

export type RawrHostSatisfiers = Readonly<{
  exampleTodo: {
    resolveClient(repoRoot: string): ExampleTodoClient;
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
function createExampleTodoDeps(hostLogger: HostServiceLogger): ExampleTodoBoundary["deps"] {
  let tick = 0;

  return {
    dbPool: createEmbeddedInMemoryDbPoolAdapter(),
    clock: {
      now: () => {
        tick += 1;
        return new Date(Date.UTC(2026, 1, 25, 0, 0, tick)).toISOString();
      },
    },
    logger: hostLogger,
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
  };
}

function createExampleTodoBinding(hostLogger: HostServiceLogger) {
  return bindService(createExampleTodoClient, {
    bindingId: "server/example-todo",
    deps: () => createExampleTodoDeps(hostLogger),
    scope: () => ({
      workspaceId: "workspace-default",
    }),
    config: {
      readOnly: false,
      limits: {
        maxAssignmentsPerTask: 2,
      },
    },
    cacheKey: (context: ExampleTodoBindingContext) =>
      `${context.process.processId}:${context.process.repoRoot}:${context.role.roleId}`,
  } satisfies ServiceBinding<ExampleTodoBoundary, HostProcess, ExampleTodoRole>);
}

export function createRawrHostSatisfiers(input: {
  hostLogger: HostServiceLogger;
}): RawrHostSatisfiers {
  const exampleTodo = createExampleTodoBinding(input.hostLogger);

  function resolveExampleTodoClient(repoRoot: string): ExampleTodoClient {
    return exampleTodo.resolve({
      process: {
        processId: "server",
        repoRoot,
      },
      role: {
        roleId: "example-todo",
        capability: "example-todo",
      },
    });
  }

  return {
    exampleTodo: {
      resolveClient: resolveExampleTodoClient,
    },
  } as const;
}
