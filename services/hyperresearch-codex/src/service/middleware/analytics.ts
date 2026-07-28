/**
 * @fileoverview Required service-wide analytics middleware.
 */
import { createAnalyticsMiddleware } from "@rawr/hq-sdk";
import type { Context } from "../base";
import { metadataDefaults } from "../contract";

export const analytics = createAnalyticsMiddleware<Context>(metadataDefaults, {
  payload: ({ context }) => ({
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
