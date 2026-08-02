import { createObservabilityMiddlewareCallback } from "@habitat-ai/rawr-hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../contract";

/** Authors session lifecycle signals through the service's complete context. */
export const middleware = base.middleware(
  createObservabilityMiddlewareCallback(metadataDefaults, {
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
  })
);
