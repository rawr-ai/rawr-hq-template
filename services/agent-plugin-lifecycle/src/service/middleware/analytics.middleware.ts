import { createRequiredServiceAnalyticsMiddleware } from "../base";

/** Adds lifecycle invocation fields to the SDK-owned analytics baseline. */
export const analytics = createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
    analytics_command_id: context.invocation.commandId,
  }),
});
