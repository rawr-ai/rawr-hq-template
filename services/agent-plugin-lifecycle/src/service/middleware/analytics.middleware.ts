import { createAnalyticsMiddleware } from "@rawr/hq-sdk";
import type { Context } from "../base";
import { metadataDefaults } from "../model/policy/procedure-metadata";

/** Adds lifecycle invocation fields to the native analytics boundary. */
export const analytics = createAnalyticsMiddleware<Context>(metadataDefaults, {
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
    analytics_command_id: context.invocation.commandId,
  }),
});
