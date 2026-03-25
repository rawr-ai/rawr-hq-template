import { createRawrHqManifest } from "@rawr/hq-app/manifest";
import type { Client as ExampleTodoClient } from "@rawr/example-todo";
import { createClient as createExampleTodoClient } from "@rawr/example-todo";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedInMemoryDbPoolAdapter } from "@rawr/hq-sdk/host-adapters/sql/embedded-in-memory";
import { createRawrHostBoundRolePlan } from "./host-seam";
import { materializeRawrHostBoundRolePlan } from "./host-realization";

const noopLogger = {
  info() {},
  error() {},
} as const;

export function createTestingRawrHostSeam() {
  const manifest = createRawrHqManifest({
    hostLogger: noopLogger,
  });
  const boundRolePlan = createRawrHostBoundRolePlan({ manifest });
  const realization = materializeRawrHostBoundRolePlan(boundRolePlan);

  return {
    manifest,
    boundRolePlan,
    realization,
  } as const;
}

export function createTestingExampleTodoClient(repoRoot: string): ExampleTodoClient {
  return createExampleTodoClient({
    deps: {
      dbPool: createEmbeddedInMemoryDbPoolAdapter(),
      clock: {
        now: () => new Date(Date.UTC(2026, 1, 25, 0, 0, 0)).toISOString(),
      },
      logger: noopLogger,
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
  });
}
