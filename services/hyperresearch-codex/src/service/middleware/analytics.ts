/**
 * @fileoverview Required service-wide analytics middleware.
 */
import { createAnalyticsMiddlewareCallback } from "@rawr/hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../contract";

/** Authors run analytics through the Hyperresearch service context. */
export const middleware = base.middleware(
  createAnalyticsMiddlewareCallback(metadataDefaults, {
    payload: ({ context }) => ({
      analytics_repo_root: context.scope.repoRoot,
      analytics_trace_id: context.invocation.traceId,
    }),
  })
);
