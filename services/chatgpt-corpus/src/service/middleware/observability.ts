import { createObservabilityMiddlewareCallback } from "@habitat-ai/rawr-hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../model/policy";

/** Authors corpus lifecycle signals through the service's complete context. */
export const middleware = base.middleware(
  createObservabilityMiddlewareCallback(metadataDefaults, {
    spanAttributes: ({ context }) => ({
      invocation_trace_id: context.invocation.traceId,
    }),
    logFields: ({ context, spanTraceId }) => ({
      invocationTraceId: context.invocation.traceId,
      spanTraceId,
    }),
    startEventAttributes: ({ context }) => ({
      traceId: context.invocation.traceId,
    }),
    successEventAttributes: ({ context }) => ({
      traceId: context.invocation.traceId,
    }),
  })
);
