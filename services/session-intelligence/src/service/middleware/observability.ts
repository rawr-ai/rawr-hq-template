import { createObservabilityMiddleware } from "@rawr/hq-sdk";
import type { Context } from "../base";
import { metadataDefaults } from "../contract";

export const observability = createObservabilityMiddleware<Context>(metadataDefaults, {
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
