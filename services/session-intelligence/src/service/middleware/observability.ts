import { createRequiredServiceObservabilityMiddleware } from "../base";

export const observability = createRequiredServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    invocation_trace_id: context.invocation.traceId,
  }),
  logFields: ({ context, spanTraceId }) => ({
    spanTraceId,
    invocationTraceId: context.invocation.traceId,
  }),
  startEventAttributes: ({ context }) => ({
    traceId: context.invocation.traceId,
  }),
  successEventAttributes: () => ({}),
});
