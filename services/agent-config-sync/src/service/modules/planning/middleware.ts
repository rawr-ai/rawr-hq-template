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
 * Planning owns a read-only repository provider even though it delegates to the
 * execution engine for drift calculation. Keeping the provider module-local
 * prevents preview/assessment routes from depending on host-global repositories
 * and makes the dry-run boundary explicit at construction time.
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
