import { createAnalyticsMiddlewareCallback } from "@habitat-ai/sdk/service";
import { base } from "../base";
import { metadataDefaults } from "../model/policy";

/** Authors corpus analytics through the service's complete context. */
export const middleware = base.middleware(
  createAnalyticsMiddlewareCallback(metadataDefaults, {
    payload: ({ context }) => ({
      analytics_trace_id: context.invocation.traceId,
    }),
  })
);
