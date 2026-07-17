import { createRequiredServiceAnalyticsMiddleware } from "../base";

export const analytics = createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
    analytics_command_id: context.invocation.commandId,
  }),
});
