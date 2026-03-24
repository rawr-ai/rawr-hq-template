import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import { createRepository } from "./repository";
import type { CoordinationRunsRuntime } from "./runtime";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

export const observability = createServiceObservabilityMiddleware({});
export const analytics = createServiceAnalyticsMiddleware({});

export const runExecution = createServiceProvider<{
  deps: {
    runsRuntime?: CoordinationRunsRuntime;
  };
}>().middleware<{
  runExecution: CoordinationRunsRuntime;
}>(async ({ context, next }) => {
  const runExecution = context.deps.runsRuntime;
  if (!runExecution) {
    throw new Error("coordination runs runtime is not configured");
  }

  return next({
    runExecution,
  });
});

export const repository = createServiceProvider<{
  scope: {
    repoRoot: string;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository(context.scope.repoRoot),
  });
});
