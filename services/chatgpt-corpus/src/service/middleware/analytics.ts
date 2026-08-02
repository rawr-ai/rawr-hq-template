import { createAnalyticsMiddlewareCallback } from "@habitat-ai/rawr-hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../contract";

/** Authors corpus analytics through the service's complete context. */
export const middleware = base.middleware(
  createAnalyticsMiddlewareCallback(metadataDefaults, {
    payload: ({ context }) => ({
      analytics_trace_id: context.invocation.traceId,
    }),
  })
);
