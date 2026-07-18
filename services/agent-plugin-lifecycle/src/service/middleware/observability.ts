import { createRequiredServiceObservabilityMiddleware } from "../base";

export const observability = createRequiredServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    invocation_trace_id: context.invocation.traceId,
    invocation_command_id: context.invocation.commandId,
  }),
  logFields: ({ context, spanTraceId }) => ({
    spanTraceId,
    invocationTraceId: context.invocation.traceId,
    invocationCommandId: context.invocation.commandId,
  }),
  startEventAttributes: ({ context }) => ({
    traceId: context.invocation.traceId,
    commandId: context.invocation.commandId,
  }),
  successEventAttributes: () => ({}),
});
