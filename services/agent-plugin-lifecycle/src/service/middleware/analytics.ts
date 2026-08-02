import { createAnalyticsMiddlewareCallback } from "@habitat-ai/rawr-hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../model/policy/procedure-metadata";

/** Adds lifecycle invocation fields to the native analytics boundary. */
export const middleware = base.middleware(
  createAnalyticsMiddlewareCallback(metadataDefaults, {
    payload: ({ context }) => ({
      analytics_trace_id: context.invocation.traceId,
      analytics_command_id: context.invocation.commandId,
    }),
  })
);
