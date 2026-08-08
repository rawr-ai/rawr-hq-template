import { createObservabilityMiddlewareCallback } from "@habitat-ai/sdk/service";
import { base } from "../base";
import { metadataDefaults } from "../model/policy";

/** Authors session lifecycle signals through the service's complete context. */
export const middleware = base.middleware(
  createObservabilityMiddlewareCallback(metadataDefaults, {
    attributeNamespace: "rawr",
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
