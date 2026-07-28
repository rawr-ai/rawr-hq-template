import { createAnalyticsMiddleware } from "@rawr/hq-sdk";
import type { Context } from "../base";
import { metadataDefaults } from "../contract";

export const analytics = createAnalyticsMiddleware<Context>(metadataDefaults, {
  payload: ({ context }) => ({
    analytics_workspace_root: context.scope.workspaceRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
