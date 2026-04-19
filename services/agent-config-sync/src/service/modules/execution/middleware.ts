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

/**
 * Binds the execution repository inside the execution module so write-capable
 * sync behavior cannot be reached through host-level globals. The optional undo
 * capture is part of this module's apply boundary: planning callers never
 * receive it, and execution repositories drop it again for dry-run requests.
 */
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
