import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type {
  AgentConfigSyncResources,
  AgentConfigSyncUndoCapture,
} from "../../shared/resources";
import { createRepository } from "./repository";

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_repo_root: context.scope.repoRoot,
  }),
});

export const repository = createServiceProvider<{
  deps: {
    resources: AgentConfigSyncResources;
    undoCapture?: AgentConfigSyncUndoCapture;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository({
      resources: context.deps.resources,
      undoCapture: context.deps.undoCapture,
    }),
  });
});
