import { createRequiredServiceAnalyticsMiddleware } from "../base";

export const analytics = createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
