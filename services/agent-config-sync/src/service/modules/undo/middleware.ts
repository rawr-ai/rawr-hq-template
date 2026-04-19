import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { AgentConfigSyncResources } from "../../shared/resources";
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
 * Undo is intentionally repository-backed inside the undo module instead of
 * calling shared filesystem helpers from the host. The module is the only place
 * that knows how to interpret plugins.sync capsules and their reverse-order
 * application semantics.
 */
export const repository = createServiceProvider<{
  deps: {
    resources: AgentConfigSyncResources;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository(context.deps.resources),
  });
});
