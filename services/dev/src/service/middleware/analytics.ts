import { createRequiredServiceAnalyticsMiddleware } from "../base";

export const analytics = createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_workspace_root: context.scope.workspaceRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
