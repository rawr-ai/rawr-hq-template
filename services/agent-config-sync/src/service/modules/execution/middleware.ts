import { createServiceObservabilityMiddleware, createServiceAnalyticsMiddleware } from "../../base";

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
