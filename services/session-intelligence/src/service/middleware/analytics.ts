import { createRequiredServiceAnalyticsMiddleware } from "../base";

export const analytics = createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
  }),
});
