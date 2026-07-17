import { createServiceAnalyticsMiddleware, createServiceObservabilityMiddleware } from "../../base";

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    invocation_trace_id: context.invocation.traceId,
    invocation_command_id: context.invocation.commandId,
  }),
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
    analytics_command_id: context.invocation.commandId,
  }),
});
