import { createAnalyticsMiddlewareCallback } from "@habitat-ai/rawr-hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../model/policy/procedure-metadata";

/** Authors workspace analytics through the Dev service context. */
export const middleware = base.middleware(
  createAnalyticsMiddlewareCallback(metadataDefaults, {
    payload: ({ context }) => ({
      analytics_workspace_root: context.scope.workspaceRoot,
      analytics_trace_id: context.invocation.traceId,
    }),
  })
);
